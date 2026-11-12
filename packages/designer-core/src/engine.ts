import { createEventBus } from '@x-form-engine/core';
import { FormEngineError } from '@x-form-engine/types';
import type {
  CreateDesignerOptions,
  DesignerAdapter,
  DesignerEnginePublicAPI,
} from '@x-form-engine/types';
import { createDesignerPluginHost } from './plugin/plugin-host';
import { createMaterialRegistry } from './registry/material-registry';
import { createCommandRegistry, createPanelRegistry, createToolbarRegistry } from './registry/panels';
import { createSetterRegistry } from './registry/setter-registry';
import { createSchemaEditor } from './schema/schema-editor';

/**
 * 创建 Designer 引擎（Task 4.6）。
 *
 * - Designer Core 不安装 Adapter 时也能实例化，注册 Material / Setter / Plugin。
 * - `destroy()` 幂等：释放插件（逆序 dispose + 资源清理），并派发 `designer:destroy`。
 * - 不暴露任何 Registry 内部 Map。
 *
 * Adapter 的 workspace 挂载/卸载生命周期在 Phase 5 接入；本阶段 `use` 仅存储
 * Adapter，`destroy` 不涉及尚未挂载的 workspace 资源。
 */
export function createDesigner(
  options: CreateDesignerOptions = {}
): DesignerEnginePublicAPI {
  const materials = createMaterialRegistry();
  const setters = createSetterRegistry();
  const panels = createPanelRegistry();
  const commands = createCommandRegistry();
  const toolbars = createToolbarRegistry();
  const events = createEventBus();
  const schema = createSchemaEditor();

  let adapter: DesignerAdapter | undefined = options.adapter;
  let destroyed = false;

  // api 在插件安装前完成赋值，Plugin Host 的 `getEngine` 惰性读取（解循环引用）。
  let api!: DesignerEnginePublicAPI;

  const plugins = createDesignerPluginHost({
    materials,
    setters,
    panels,
    commands,
    toolbars,
    events,
    schema,
    getEngine: () => api,
  });

  api = {
    materials,
    setters,
    panels,
    commands,
    toolbars,
    plugins,
    events,
    schema,
    use(nextAdapter: DesignerAdapter): void {
      if (destroyed) {
        throw new FormEngineError(
          'ENGINE_DISPOSED',
          'Cannot use adapter after designer is destroyed'
        );
      }
      adapter = nextAdapter;
    },
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      plugins.disposeAll();
      events.emit('designer:destroy', undefined);
    },
  };

  // 初始物料与 Setter。
  materials.registerMany(options.materials ?? []);
  setters.registerMany(options.setters ?? []);

  // 安装插件（在 api 赋值之后，保证插件能拿到 engine）。
  for (const plugin of options.plugins ?? []) {
    plugins.install(plugin);
  }

  return api;
}
