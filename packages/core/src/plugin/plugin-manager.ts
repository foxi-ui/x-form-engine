import type {
  FormEngine,
  FormEnginePlugin,
  PluginContext,
  PluginLifecycleEvent,
} from '@x-form-engine/types';
import { createGenericPluginHost } from './generic/plugin-host';
import type { GenericPluginHost } from './generic/plugin-host';

export interface PluginManager {
  install(plugin: FormEnginePlugin): void;
  disposeAll(): void;
  list(): Array<{ plugin: FormEnginePlugin; active: boolean }>;
}

/**
 * 创建 Runtime 插件管理器。
 *
 * 本文件只做 Runtime 语义的适配，安装事务性、依赖校验、增量资源归属与
 * 回滚/卸载编排全部委托给 `createGenericPluginHost`（Generic Plugin Core）。
 * 对外行为保持不变：
 *
 * - 同一插件名只允许安装一次，重复安装抛 `PLUGIN_CONFLICT`。
 * - `install` 是事务性的：安装抛错时按本次新增资源回滚，并派发 `plugin:failed`。
 * - `disposeAll` 按安装顺序逆序卸载，幂等（重复调用不会重复 dispose 插件）。
 * - 资源归属由「安装前快照 -> 安装后新增条目」的增量确定，
 *   不按 source 全量清理，因此插件名与内置 `builtin` 来源重名也不会误删内置资源。
 */
export function createPluginManager(engine: FormEngine): PluginManager {
  let host: GenericPluginHost<FormEnginePlugin, PluginContext> | undefined;

  /**
   * 惰性创建宿主。
   *
   * `Engine` 以字段初始化器构造 pluginManager（早于构造函数内 `this.registry`
   * 赋值），因此这里沿用原实现「到安装时才读取 engine 状态」的时机，
   * 避免读取未初始化的 `engine.registry`。
   */
  const getHost = (): GenericPluginHost<FormEnginePlugin, PluginContext> => {
    if (host) {
      return host;
    }

    host = createGenericPluginHost<FormEnginePlugin, PluginContext>({
      createContext: () => ({
        registry: engine.registry,
        services: engine.services,
        events: engine.events,
        config: engine.options,
      }),
      // `Registry<T>` 结构上满足 `PluginResourceRegistry`，直接作为宿主追踪对象。
      resources: [
        engine.registry.components,
        engine.registry.decorators,
        engine.registry.services,
        engine.registry.formatters,
        engine.registry.designer,
      ],
      onEvent(event: PluginLifecycleEvent): void {
        switch (event.status) {
          case 'active':
            engine.events.emit('plugin:install', { plugin: event.plugin });
            break;
          case 'disposed':
            engine.events.emit('plugin:dispose', { plugin: event.plugin });
            break;
          case 'failed':
            engine.events.emit('plugin:failed', {
              plugin: event.plugin,
              error: event.error,
            });
            break;
          default:
            break;
        }
      },
    });

    return host;
  };

  return {
    install(plugin: FormEnginePlugin): void {
      getHost().install(plugin);
    },
    disposeAll(): void {
      getHost().disposeAll();
    },
    list(): Array<{ plugin: FormEnginePlugin; active: boolean }> {
      return getHost().list();
    },
  };
}
