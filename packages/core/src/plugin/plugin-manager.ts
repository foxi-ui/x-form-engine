import type {
  FormEngine,
  FormEnginePlugin,
  PluginContext,
  Registry,
} from '@x-form-engine/types';
import { FormEngineError } from '@x-form-engine/types';
import { resolvePluginOrder } from './generic/dependency-resolver';

export interface PluginManager {
  install(plugin: FormEnginePlugin): void;
  disposeAll(): void;
  list(): Array<{ plugin: FormEnginePlugin; active: boolean }>;
}

type RegistryKind =
  | 'components'
  | 'decorators'
  | 'services'
  | 'formatters'
  | 'designer';

const REGISTRY_KINDS: readonly RegistryKind[] = [
  'components',
  'decorators',
  'services',
  'formatters',
  'designer',
];

/**
 * 安装前各 Registry 的快照：name -> source。
 *
 * 安装后与当前列表求差，即可得到本次安装新增的资源，
 * 作为该插件精确的归属记录（增量快照归属）。
 */
type RegistrySnapshot = Map<string, string | undefined>;
type RegistrySnapshots = Record<RegistryKind, RegistrySnapshot>;

interface OwnedRegistration {
  registryKind: RegistryKind;
  name: string;
  source?: string;
}

interface ManagedPlugin {
  plugin: FormEnginePlugin;
  context: PluginContext;
  active: boolean;
  owned: OwnedRegistration[];
}

function registryFor(engine: FormEngine, kind: RegistryKind): Registry<unknown> {
  switch (kind) {
    case 'components':
      return engine.registry.components;
    case 'decorators':
      return engine.registry.decorators;
    case 'services':
      return engine.registry.services;
    case 'formatters':
      return engine.registry.formatters;
    case 'designer':
      return engine.registry.designer;
  }
}

function snapshotRegistry<T>(registry: Registry<T>): RegistrySnapshot {
  const snapshot: RegistrySnapshot = new Map();
  for (const entry of registry.list()) {
    snapshot.set(entry.name, entry.source);
  }
  return snapshot;
}

function snapshotAll(engine: FormEngine): RegistrySnapshots {
  return {
    components: snapshotRegistry(engine.registry.components),
    decorators: snapshotRegistry(engine.registry.decorators),
    services: snapshotRegistry(engine.registry.services),
    formatters: snapshotRegistry(engine.registry.formatters),
    designer: snapshotRegistry(engine.registry.designer),
  };
}

function collectNewRegistrations(
  engine: FormEngine,
  snapshots: RegistrySnapshots
): OwnedRegistration[] {
  const owned: OwnedRegistration[] = [];

  for (const registryKind of REGISTRY_KINDS) {
    const before = snapshots[registryKind];
    for (const entry of registryFor(engine, registryKind).list()) {
      // 安装期间新增（或同名但来源变化）的条目才归本次安装所有。
      if (!before.has(entry.name) || before.get(entry.name) !== entry.source) {
        owned.push({ registryKind, name: entry.name, source: entry.source });
      }
    }
  }

  return owned;
}

/**
 * 按归属记录逆序卸载资源。
 *
 * 卸载前校验当前条目仍存在且来源一致，避免资源已被插件自行清理
 * 或名称被其它来源重新注册时误删。
 */
function releaseOwned(
  engine: FormEngine,
  owned: readonly OwnedRegistration[]
): void {
  for (const registration of [...owned].reverse()) {
    const registry = registryFor(engine, registration.registryKind);
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
 * 创建同步插件管理器。
 *
 * - 同一插件名只允许安装一次，重复安装抛 `PLUGIN_CONFLICT`。
 * - `install` 是事务性的：安装抛错时按本次新增资源回滚，并派发 `plugin:failed`。
 * - `disposeAll` 按安装顺序逆序卸载，幂等（重复调用不会重复 dispose 插件）。
 * - 资源归属由「安装前快照 -> 安装后新增条目」的增量确定，
 *   不按 source 全量清理，因此插件名与内置 `builtin` 来源重名也不会误删内置资源。
 */
export function createPluginManager(engine: FormEngine): PluginManager {
  const managed: ManagedPlugin[] = [];
  const installedNames = new Set<string>();

  const createContext = (): PluginContext => ({
    registry: engine.registry,
    services: engine.services,
    events: engine.events,
    config: engine.options,
  });

  return {
    install(plugin: FormEnginePlugin): void {
      if (installedNames.has(plugin.name)) {
        throw new FormEngineError(
          'PLUGIN_CONFLICT',
          `Plugin "${plugin.name}" is already installed`,
          { plugin: plugin.name }
        );
      }

      // 以已安装插件 + 新插件做一致性校验：依赖必须在已安装集合内，
      // 同时拦截自依赖/循环依赖与重复插件名。
      const installed = managed
        .filter((record) => record.active)
        .map((record) => record.plugin);

      const context = createContext();
      const snapshots = snapshotAll(engine);

      try {
        // 依赖校验也纳入事务：失败时同样回滚（此时无新增资源）并派发 plugin:failed。
        resolvePluginOrder([...installed, plugin]);
        plugin.install(context);
      } catch (error) {
        // 只回滚本次安装新增的资源，不触碰该 source 之前已存在的资源。
        releaseOwned(engine, collectNewRegistrations(engine, snapshots));
        engine.events.emit('plugin:failed', {
          plugin: plugin.name,
          error,
        });
        throw error;
      }

      managed.push({
        plugin,
        context,
        active: true,
        owned: collectNewRegistrations(engine, snapshots),
      });
      installedNames.add(plugin.name);
      engine.events.emit('plugin:install', { plugin: plugin.name });
    },

    disposeAll(): void {
      for (const record of [...managed].reverse()) {
        if (!record.active) {
          continue;
        }

        // 先置为非活跃，保证重复 disposeAll 幂等；即使 dispose 抛错，
        // finally 仍会释放该插件资源，后续插件也会继续卸载。
        record.active = false;

        try {
          record.plugin.dispose?.(record.context);
        } catch (error) {
          engine.events.emit('plugin:failed', {
            plugin: record.plugin.name,
            error,
          });
        } finally {
          releaseOwned(engine, record.owned);
          engine.events.emit('plugin:dispose', { plugin: record.plugin.name });
        }
      }
    },

    list(): Array<{ plugin: FormEnginePlugin; active: boolean }> {
      return managed.map((record) => ({
        plugin: record.plugin,
        active: record.active,
      }));
    },
  };
}
