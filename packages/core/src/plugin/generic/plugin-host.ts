import { FormEngineError } from '@x-form-engine/types';
import type { PluginLifecycleEvent } from '@x-form-engine/types';
import { resolvePluginOrder } from './dependency-resolver';

/**
 * 插件可注册资源的最小视图。
 *
 * 与 Runtime Registry 解耦：宿主只依赖 `list` / `unregister` 两个操作，
 * 具体注册表由 Runtime / Designer 各自的 Host 适配。
 */
export interface PluginResourceRegistry {
  list(): Array<{ name: string; source?: string }>;
  unregister(name: string, source?: string): void;
}

/** 可被通用宿主安装的插件最小契约。 */
export interface InstallablePlugin<C> {
  name: string;
  version: string;
  dependencies?: string[];
  install(context: C): void | (() => void); // 返回可选清理函数
  dispose?(context: C): void; // 可选显式 dispose
}

/** 通用插件宿主选项。 */
export interface GenericPluginHostOptions<P extends InstallablePlugin<C>, C> {
  createContext(): C;
  resources: PluginResourceRegistry[];
  /** 生命周期事件回调；复用 `@x-form-engine/types` 的 `PluginLifecycleEvent`（`{ plugin; status; error? }`），不在 core 重声明。 */
  onEvent?(event: PluginLifecycleEvent): void;
}

/** 通用插件宿主：install / uninstall / disposeAll。 */
export interface GenericPluginHost<P extends InstallablePlugin<C>, C> {
  install(plugin: P): void;
  uninstall(name: string): void;
  disposeAll(): void;
  list(): Array<{ plugin: P; active: boolean }>;
  isInstalled(name: string): boolean;
}

/** 单个资源注册表在安装前的快照：name -> source。 */
type ResourceSnapshot = Map<string, string | undefined>;

/** 本次安装新增（或来源变化）的资源归属记录。 */
interface OwnedRegistration {
  resourceIndex: number;
  name: string;
  source?: string;
}

interface ManagedPlugin<P extends InstallablePlugin<C>, C> {
  plugin: P;
  context: C;
  active: boolean;
  owned: OwnedRegistration[];
  /** `install` 返回的清理函数（若有）。 */
  teardown?: () => void;
}

function snapshotResources(
  resources: readonly PluginResourceRegistry[]
): ResourceSnapshot[] {
  return resources.map((registry) => {
    const snapshot: ResourceSnapshot = new Map();
    for (const entry of registry.list()) {
      snapshot.set(entry.name, entry.source);
    }
    return snapshot;
  });
}

/**
 * 对比安装前后快照，收集本次安装新增的资源。
 *
 * 安装期间新增（或同名但来源变化）的条目才归本次安装所有；
 * 插件名与内置 `builtin` 来源重名时也不会误记归属。
 */
function collectNewRegistrations(
  resources: readonly PluginResourceRegistry[],
  snapshots: readonly ResourceSnapshot[]
): OwnedRegistration[] {
  const owned: OwnedRegistration[] = [];

  resources.forEach((registry, resourceIndex) => {
    const before = snapshots[resourceIndex];
    for (const entry of registry.list()) {
      if (!before.has(entry.name) || before.get(entry.name) !== entry.source) {
        owned.push({ resourceIndex, name: entry.name, source: entry.source });
      }
    }
  });

  return owned;
}

/**
 * 按归属记录逆序释放资源。
 *
 * 释放前校验当前条目仍存在且来源一致，避免资源已被插件自行清理
 * 或名称被其它来源重新注册时误删。
 */
function releaseOwned(
  resources: readonly PluginResourceRegistry[],
  owned: readonly OwnedRegistration[]
): void {
  for (const registration of [...owned].reverse()) {
    const registry = resources[registration.resourceIndex];
    const current = registry
      .list()
      .find((entry) => entry.name === registration.name);
    if (!current || current.source !== registration.source) {
      continue;
    }
    registry.unregister(registration.name, registration.source);
  }
}

/**
 * 创建通用插件宿主。
 *
 * - `install` 是事务性的：同名插件抛 `PLUGIN_CONFLICT`；依赖经由
 *   `resolvePluginOrder` 校验（缺失 `PLUGIN_DEPENDENCY_MISSING`、环/重名
 *   `PLUGIN_CONFLICT`）；安装抛错时仅按本次新增资源回滚（增量归属），
 *   并派发 `failed` 事件后向上抛。
 * - `uninstall` 幂等：未安装 / 已 inactive 时 no-op；存在 active 插件依赖
 *   目标时抛 `PLUGIN_DEPENDENCY_ACTIVE`；卸载时先 `dispose` 再执行
 *   `install` 返回的 teardown（各自异常隔离），`finally` 逆序释放归属资源
 *   并派发 `disposed` 事件。
 * - `disposeAll` 按安装顺序逆序卸载，幂等、单插件异常隔离，`finally`
 *   保证资源释放；**不**执行依赖保护。
 *
 * 不变式：`options.resources` 是快照 / 回滚 / 归属追踪的对象集，
 * `options.createContext()` 必须把同一批注册表暴露给插件，否则归属追踪
 * 会漏记（宿主职责，通用核心不校验）。
 */
export function createGenericPluginHost<P extends InstallablePlugin<C>, C>(
  options: GenericPluginHostOptions<P, C>
): GenericPluginHost<P, C> {
  const managed: ManagedPlugin<P, C>[] = [];
  // 插件名在宿主生命周期内保留：卸载后同名插件不可重复安装（与 Runtime
  // PluginManager 一致），避免同一宿主出现两条同名 managed 记录。
  const installedNames = new Set<string>();
  const { resources } = options;

  const emit = (event: PluginLifecycleEvent): void => {
    options.onEvent?.(event);
  };

  /**
   * 停用一个插件：置 inactive -> dispose -> teardown -> finally 释放资源。
   *
   * dispose 与 teardown 各自 try/catch 隔离，一个失败不影响另一个。
   * 置 inactive 在此处完成，重复调用由 `active` 标记保证幂等
   * （`disposeAll` / `uninstall` 调用前已做 active 检查）。
   */
  const deactivate = (record: ManagedPlugin<P, C>): void => {
    record.active = false;

    try {
      try {
        record.plugin.dispose?.(record.context);
      } catch (error) {
        emit({ plugin: record.plugin.name, status: 'failed', error });
      }

      try {
        record.teardown?.();
      } catch (error) {
        emit({ plugin: record.plugin.name, status: 'failed', error });
      }
    } finally {
      releaseOwned(resources, record.owned);
      emit({ plugin: record.plugin.name, status: 'disposed' });
    }
  };

  return {
    install(plugin: P): void {
      if (installedNames.has(plugin.name)) {
        throw new FormEngineError(
          'PLUGIN_CONFLICT',
          `Plugin "${plugin.name}" is already installed`,
          { plugin: plugin.name }
        );
      }

      // 以已 active 插件 + 新插件做一致性校验：依赖必须在已安装集合内，
      // 同时拦截自依赖/循环依赖与重复插件名。
      const installed = managed
        .filter((record) => record.active)
        .map((record) => record.plugin);

      const snapshots = snapshotResources(resources);
      let context: C;
      let teardown: (() => void) | undefined;

      try {
        context = options.createContext();
        resolvePluginOrder([...installed, plugin]);
        const result = plugin.install(context);
        teardown = typeof result === 'function' ? result : undefined;
      } catch (error) {
        // 只回滚本次安装新增的资源，不触碰该 source 之前已存在的资源。
        releaseOwned(
          resources,
          collectNewRegistrations(resources, snapshots)
        );
        emit({ plugin: plugin.name, status: 'failed', error });
        throw error;
      }

      managed.push({
        plugin,
        context,
        active: true,
        owned: collectNewRegistrations(resources, snapshots),
        teardown,
      });
      installedNames.add(plugin.name);
      emit({ plugin: plugin.name, status: 'active' });
    },

    uninstall(name: string): void {
      const record = managed.find((entry) => entry.plugin.name === name);
      // 未安装或已卸载：幂等 no-op。
      if (!record || !record.active) {
        return;
      }

      // 依赖保护：仍被其它 active 插件依赖时拒绝卸载。
      const dependents = managed
        .filter(
          (other) =>
            other !== record &&
            other.active &&
            other.plugin.dependencies?.includes(name) === true
        )
        .map((other) => other.plugin.name);

      if (dependents.length > 0) {
        throw new FormEngineError(
          'PLUGIN_DEPENDENCY_ACTIVE',
          `Plugin "${name}" is still required by active plugin(s): ${dependents.join(', ')}`,
          { plugin: name, dependents }
        );
      }

      deactivate(record);
    },

    disposeAll(): void {
      // 逆序卸载；不执行依赖保护（整体拆除时依赖方会先于被依赖方卸载）。
      for (const record of [...managed].reverse()) {
        if (!record.active) {
          continue;
        }
        deactivate(record);
      }
    },

    list(): Array<{ plugin: P; active: boolean }> {
      return managed.map((record) => ({
        plugin: record.plugin,
        active: record.active,
      }));
    },

    isInstalled(name: string): boolean {
      return managed.some(
        (record) => record.active && record.plugin.name === name
      );
    },
  };
}
