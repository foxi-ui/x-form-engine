import type {
  FormEngine,
  FormEnginePlugin,
  PluginContext,
  Registry,
} from '@x-form-engine/types';
import { resolvePluginOrder } from './dependency-resolver';

export interface PluginManager {
  install(plugin: FormEnginePlugin): void;
  disposeAll(): void;
  list(): Array<{ plugin: FormEnginePlugin; active: boolean }>;
}

interface ManagedPlugin {
  plugin: FormEnginePlugin;
  context: PluginContext;
  active: boolean;
}

/**
 * 卸载注册表中归属于指定来源的资源。
 *
 * 插件注册资源时约定以自身 `plugin.name` 作为 `source`，
 * 因此这里只处理 `entry.source === source` 的条目，不触碰其它插件的资源。
 */
function releaseOwned<T>(registry: Registry<T>, source: string): void {
  for (const entry of registry.list()) {
    if (entry.source === source) {
      registry.unregister(entry.name, entry.source);
    }
  }
}

function releaseAll(engine: FormEngine, source: string): void {
  releaseOwned(engine.registry.components, source);
  releaseOwned(engine.registry.decorators, source);
  releaseOwned(engine.registry.services, source);
  releaseOwned(engine.registry.formatters, source);
  releaseOwned(engine.registry.designer, source);
}

/**
 * 创建同步插件管理器。
 *
 * - `install` 是事务性的：安装抛错时回滚该插件已注册的资源并派发 `plugin:failed`。
 * - `disposeAll` 按安装顺序逆序卸载，幂等（重复调用不会重复 dispose 插件）。
 * - 资源归属以 `plugin.name` 作为注册来源判定。
 */
export function createPluginManager(engine: FormEngine): PluginManager {
  const managed: ManagedPlugin[] = [];

  const createContext = (): PluginContext => ({
    registry: engine.registry,
    services: engine.services,
    events: engine.events,
    config: engine.options,
  });

  return {
    install(plugin: FormEnginePlugin): void {
      // 以已安装插件 + 新插件做一致性校验：依赖必须在已安装集合内，
      // 同时拦截自依赖/循环依赖。
      const installed = managed
        .filter((record) => record.active)
        .map((record) => record.plugin);
      resolvePluginOrder([...installed, plugin]);

      const context = createContext();

      try {
        plugin.install(context);
      } catch (error) {
        releaseAll(engine, plugin.name);
        engine.events.emit('plugin:failed', {
          plugin: plugin.name,
          error,
        });
        throw error;
      }

      managed.push({ plugin, context, active: true });
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
          releaseAll(engine, record.plugin.name);
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
