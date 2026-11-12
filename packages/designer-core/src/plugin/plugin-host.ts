import { createGenericPluginHost } from '@x-form-engine/core';
import type {
  CommandDefinition,
  DesignerEnginePublicAPI,
  DesignerEventBus,
  DesignerMaterialDefinition,
  DesignerPlugin,
  DesignerPluginContext,
  DesignerPluginHost,
  PanelDefinition,
  PluginInstallOptions,
  SchemaEditor,
  SetterDefinition,
  ToolbarDefinition,
} from '@x-form-engine/types';
import type { MaterialRegistryImpl } from '../registry/material-registry';
import type { NamedRegistry } from '../registry/named-registry';
import type { SetterRegistryImpl } from '../registry/setter-registry';

/** Designer Plugin Host 依赖注入项。 */
export interface DesignerPluginHostDeps {
  materials: MaterialRegistryImpl;
  setters: SetterRegistryImpl;
  panels: NamedRegistry<PanelDefinition>;
  commands: NamedRegistry<CommandDefinition>;
  toolbars: NamedRegistry<ToolbarDefinition>;
  events: DesignerEventBus;
  schema: SchemaEditor;
  /** 惰性获取引擎（解 Plugin Host 与引擎实例之间的循环引用）。 */
  getEngine(): DesignerEnginePublicAPI;
}

/**
 * Designer Plugin Host（Task 4.4）。
 *
 * 基于 Phase 2 的 Generic Plugin Core（`createGenericPluginHost`），不复制
 * Runtime Plugin Manager 实现。把五类 Designer 注册表作为 `resources` 交给泛型
 * 宿主做资源归属追踪，安装/回滚/卸载/依赖保护/逆序 dispose 全部复用泛型能力。
 *
 * 说明：`install` 的 `options` 仅为对齐 `DesignerPluginHost` 接口保留；
 * `force` 覆盖暂未实现（AGENTS #3 要求覆盖需显式可信声明与来源记录），
 * 重复安装始终抛 `PLUGIN_CONFLICT`。
 */
export function createDesignerPluginHost(
  deps: DesignerPluginHostDeps
): DesignerPluginHost {
  const host = createGenericPluginHost<DesignerPlugin, DesignerPluginContext>({
    createContext: () => ({
      materials: deps.materials,
      setters: deps.setters,
      panels: deps.panels,
      commands: deps.commands,
      toolbars: deps.toolbars,
      events: deps.events,
      schema: deps.schema,
      engine: deps.getEngine(),
    }),
    resources: [
      deps.materials,
      deps.setters,
      deps.panels,
      deps.commands,
      deps.toolbars,
    ],
  });

  return {
    install(plugin: DesignerPlugin, _options?: PluginInstallOptions): void {
      host.install(plugin);
    },
    uninstall(name: string): void {
      host.uninstall(name);
    },
    list(): Array<{ plugin: DesignerPlugin; active: boolean }> {
      return host.list();
    },
    disposeAll(): void {
      host.disposeAll();
    },
  };
}
