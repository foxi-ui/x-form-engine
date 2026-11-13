import { describe, expect, it } from 'vitest';
import { createDesigner } from '@x-form-engine/designer-core';
import { createDesignableAdapter } from '@x-form-engine/designer-designable';
import {
  basicMaterials,
  basicMaterialsDiagnostics,
} from '@x-form-engine/materials-basic';
import { basicSetters } from '@x-form-engine/setters-basic';
import { basicPlugins } from '@x-form-engine/plugins-basic';
import { advancedSetters } from '@x-form-engine/setters-advanced';
import { advancedPlugins } from '@x-form-engine/plugins-advanced';
import type {
  DesignerMaterialDefinition,
  DesignerPlugin,
  SetterDefinition,
} from '@x-form-engine/types';

// ---------------------------------------------------------------------------
// 第三方扩展示例（Task 9.4）：一个自定义 Material、一个自定义 Setter、一个自定义 Plugin。
// ---------------------------------------------------------------------------

/** 自定义 Setter：不依赖 antd，`component` 为纯函数占位组件。 */
const customSetter: SetterDefinition = {
  name: 'business-user-select-setter',
  version: '1.0.0',
  component: () => null,
  valueType: 'string',
  validate: (value) =>
    typeof value === 'string' && value.length > 0
      ? { valid: true }
      : { valid: false, message: '人员标识不能为空' },
};

/** 自定义 Material：声明 `component` runtimeTarget 与 `createSchema`。 */
const customMaterial: DesignerMaterialDefinition = {
  name: 'business-user-select',
  version: '1.0.0',
  title: '人员选择',
  category: 'business',
  componentName: 'BusinessUserSelect',
  runtimeTarget: { kind: 'component', componentName: 'BusinessUserSelect' },
  createSchema: () => ({
    type: 'string',
    'x-component': 'BusinessUserSelect',
  }),
  setters: { options: { name: 'business-user-select-setter' } },
};

/** 自定义 Plugin：经公开 `DesignerPluginContext` 注册资源并返回清理函数。 */
const customPlugin: DesignerPlugin = {
  name: 'business-extension',
  version: '1.0.0',
  dependencies: [],
  install(ctx) {
    ctx.materials.register(customMaterial);
    ctx.setters.register(customSetter);
    ctx.commands.register({ name: 'business-hello', execute: () => {} });
    return () => {
      ctx.materials.unregister(customMaterial.name);
      ctx.setters.unregister(customSetter.name);
    };
  },
  dispose() {},
};

describe('外部项目消费验证（packed tarballs）', () => {
  it('createDesigner 可独立实例化，并注册基础物料 / Setter / 插件', () => {
    const designer = createDesigner({
      adapter: createDesignableAdapter(),
      materials: basicMaterials,
      setters: basicSetters,
      plugins: basicPlugins,
    });

    expect(designer.materials.getAll().length).toBeGreaterThan(0);
    expect(designer.setters.getAll().length).toBeGreaterThan(0);
    expect(designer.plugins.list().length).toBe(basicPlugins.length);
    // 基础组件均有 pc 实现，不应有 error 级诊断。
    expect(basicMaterialsDiagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    designer.destroy();
  });

  it('第三方 Material / Setter / Plugin 可经公开 API 手动注册', () => {
    const designer = createDesigner();
    designer.materials.register(customMaterial);
    designer.setters.register(customSetter);

    expect(designer.materials.get('business-user-select')?.componentName).toBe(
      'BusinessUserSelect'
    );
    const resolved = designer.setters.resolve({ name: 'business-user-select-setter' });
    expect(resolved.found).toBe(true);

    designer.destroy();
  });

  it('第三方 Plugin 安装注册资源，卸载清理资源（资源归属）', () => {
    const designer = createDesigner();
    designer.plugins.install(customPlugin);

    expect(designer.materials.get('business-user-select')).toBeDefined();
    expect(designer.setters.get('business-user-select-setter')).toBeDefined();
    expect(designer.commands.get('business-hello')).toBeDefined();

    designer.plugins.uninstall('business-extension');
    expect(designer.materials.get('business-user-select')).toBeUndefined();
    expect(designer.setters.get('business-user-select-setter')).toBeUndefined();

    designer.destroy();
  });

  it('高级扩展包可独立安装（插件自注册高级 Setter）', () => {
    // advancedPlugins 依赖 setters-advanced 并在 install 时注册 ExpressionSetter，
    // 无需（也不应）同时把 advancedSetters 作为 setter 再注册一次。
    const designer = createDesigner({ plugins: advancedPlugins });
    expect(designer.plugins.list().length).toBeGreaterThan(0);
    expect(designer.setters.get('ExpressionSetter')).toBeDefined();
    designer.destroy();
  });

  it('高级 Setter 也可独立手动注册', () => {
    const designer = createDesigner({ setters: advancedSetters });
    expect(designer.setters.get('ExpressionSetter')).toBeDefined();
    designer.destroy();
  });

  it('Designable Adapter 可创建 workspace 并返回生命周期协议', () => {
    const designer = createDesigner({ materials: basicMaterials });
    const adapter = createDesignableAdapter();

    const workspace = adapter.createWorkspace({
      materials: designer.materials,
      setters: designer.setters,
      events: designer.events,
      schema: designer.schema,
    });

    expect(typeof workspace.mount).toBe('function');
    expect(typeof workspace.unmount).toBe('function');
    expect(typeof workspace.setSchema).toBe('function');
    expect(typeof workspace.getSchema).toBe('function');
    expect(typeof workspace.subscribe).toBe('function');

    const off = workspace.subscribe(() => {});
    off();
    workspace.unmount();
    designer.destroy();
  });
});
