import type { DesignerPlugin, FormSchemaDocument } from '@x-form-engine/types';

/**
 * 面板 / 工具栏占位组件：Phase 6 只注册定义，具体 UI 由 Phase 9 / demo 提供，
 * 不在此处重新实现一套平行 UI。
 */
const PanelPlaceholder = () => null;

/** 基础属性面板插件。 */
export const basicPropertyPanelPlugin: DesignerPlugin = {
  name: 'basic-property-panel',
  version: '1.0.0',
  install(ctx) {
    ctx.panels.register({
      name: 'basic-property',
      title: '属性',
      component: PanelPlaceholder,
      position: 'right',
      order: 0,
    });
  },
};

/** 基础组件面板插件。 */
export const basicComponentPanelPlugin: DesignerPlugin = {
  name: 'basic-component-panel',
  version: '1.0.0',
  install(ctx) {
    ctx.panels.register({
      name: 'basic-component',
      title: '组件',
      component: PanelPlaceholder,
      position: 'left',
      order: 0,
    });
  },
};

/** 基础工具栏插件。 */
export const basicToolbarPlugin: DesignerPlugin = {
  name: 'basic-toolbar',
  version: '1.0.0',
  install(ctx) {
    ctx.toolbars.register({ name: 'basic-save', component: PanelPlaceholder, order: 0 });
    ctx.toolbars.register({ name: 'basic-preview', component: PanelPlaceholder, order: 1 });
  },
};

/** Schema 导入导出命令插件。 */
export const basicSchemaCommandsPlugin: DesignerPlugin = {
  name: 'basic-schema-commands',
  version: '1.0.0',
  install(ctx) {
    ctx.commands.register({
      name: 'export-schema',
      execute: (context) => {
        context.document = ctx.schema.getDocument();
      },
    });
    ctx.commands.register({
      name: 'import-schema',
      execute: (context) => {
        const doc = context.document as FormSchemaDocument | undefined;
        if (doc) {
          ctx.schema.update(() => doc);
        }
      },
    });
  },
};

/** 基础插件集合（Task 6.3）。 */
export const basicPlugins: DesignerPlugin[] = [
  basicPropertyPanelPlugin,
  basicComponentPanelPlugin,
  basicToolbarPlugin,
  basicSchemaCommandsPlugin,
];
