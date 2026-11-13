import { TreeNode } from '@designable/core';
import type { DesignerMaterialDefinition } from '@x-form-engine/types';
import { createDesignableMaterialAdapter } from './material-adapter';

const Dummy = () => null;

function material(overrides: Partial<DesignerMaterialDefinition> = {}): DesignerMaterialDefinition {
  return {
    name: 'Input',
    version: '1.0.0',
    title: '输入框',
    componentName: 'Input',
    designerComponent: Dummy,
    runtimeTarget: { kind: 'component', componentName: 'Input' },
    createSchema: () => ({ type: 'string', 'x-decorator': 'FormItem', 'x-component': 'Input' }),
    ...overrides,
  };
}

describe('createDesignableMaterialAdapter（Task 5.2）', () => {
  test('普通物料转 host：Behavior selector 按 x-component 匹配且 extends Field', () => {
    const map = createDesignableMaterialAdapter([material()]);

    expect(map.Input).toBe(Dummy);
    const behavior = (map.Input.Behavior as any[]).find((b) => b.name === 'Input');
    expect(behavior.extends).toContain('Field');
    expect(
      behavior.selector(new TreeNode({ componentName: 'Field', props: { 'x-component': 'Input' } }))
    ).toBe(true);
    expect(
      behavior.selector(new TreeNode({ componentName: 'Field', props: { 'x-component': 'Select' } }))
    ).toBe(false);
  });

  test('Resource 由 createSchema 生成，保留 Formily 原生 + x-engine 扩展字段', () => {
    const map = createDesignableMaterialAdapter([
      material({
        createSchema: () => ({
          type: 'string',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-engine': { snapshot: { enabled: true } },
        }),
      }),
    ]);

    const resource = (map.Input.Resource as any[])[0];
    const el = resource.node.children[0];
    expect(el.componentName).toBe('Field');
    expect(el.props['x-component']).toBe('Input');
    expect(el.props['x-decorator']).toBe('FormItem');
    expect(el.props['x-engine']).toEqual({ snapshot: { enabled: true } });
  });

  test('容器物料（capabilities.container）宿主 droppable', () => {
    const map = createDesignableMaterialAdapter([
      material({ name: 'Container', componentName: 'Container', capabilities: { container: true } }),
    ]);

    const behavior = (map.Container.Behavior as any[]).find((b) => b.name === 'Container');
    expect(behavior.designerProps.droppable).toBe(true);
  });

  test('纯设计器物料（designer-only）仍可生成 host 进入画布', () => {
    const map = createDesignableMaterialAdapter([
      material({ name: 'Deco', componentName: 'Deco', runtimeTarget: { kind: 'designer-only' } }),
    ]);

    expect(map.Deco).toBe(Dummy);
    const behavior = (map.Deco.Behavior as any[]).find((b) => b.name === 'Deco');
    expect(
      behavior.selector(new TreeNode({ componentName: 'Field', props: { 'x-component': 'Deco' } }))
    ).toBe(true);
  });

  test('host map 含 Field / Form / FormItem 基础宿主', () => {
    const map = createDesignableMaterialAdapter([material()]);
    expect(Object.keys(map)).toEqual(expect.arrayContaining(['Field', 'Form', 'FormItem', 'Input']));
  });
});
