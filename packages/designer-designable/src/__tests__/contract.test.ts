import { TreeNode } from '@designable/core';
import { basicComponents, basicDecorators } from '@x-form-engine/components';
import {
  checkMaterialRuntimeTarget,
  checkSchemaComponentRegistrations,
  createFormEngine,
  parseSchemaDocument,
  validateEngineSchema,
} from '@x-form-engine/core';
import { basicMaterials } from '@x-form-engine/materials-basic';
import type { DesignerMaterialDefinition } from '@x-form-engine/types';
import { schemaDocumentToTree, treeToSchemaDocument } from '../schema-adapter';

function runtimeRegistry() {
  const engine = createFormEngine({ components: basicComponents, decorators: basicDecorators });
  return {
    components: new Set(engine.registry.components.list().map((e) => e.name)),
    decorators: new Set(engine.registry.decorators.list().map((e) => e.name)),
  };
}

describe('Material → Schema → Runtime 一致性 Contract Tests（Task 7.4）', () => {
  test('1. 基础 Material 均能生成合法 Schema', () => {
    for (const material of basicMaterials) {
      expect(validateEngineSchema(material.createSchema({})).valid).toBe(true);
    }
  });

  test('2. component target 能找到 Runtime Binding', () => {
    const { components } = runtimeRegistry();
    for (const material of basicMaterials) {
      expect(checkMaterialRuntimeTarget(material, components)).toEqual([]);
    }
  });

  test('3. 导出的基础物料 Schema 引用的组件均已注册', () => {
    const { components, decorators } = runtimeRegistry();
    for (const material of basicMaterials) {
      const diagnostics = checkSchemaComponentRegistrations(
        material.createSchema({}),
        components,
        decorators
      );
      expect(diagnostics).toEqual([]);
    }
  });

  test('4. schema-container 物料生成合法容器 Schema 且不参与组件注册校验', () => {
    const container: DesignerMaterialDefinition = {
      name: 'object-container',
      version: '1.0.0',
      title: '对象容器',
      componentName: 'ObjectContainer',
      runtimeTarget: { kind: 'schema-container', schemaType: 'object' },
      createSchema: () => ({ type: 'object', properties: {} }),
    };
    const { components } = runtimeRegistry();
    expect(checkMaterialRuntimeTarget(container, components)).toEqual([]);
    expect(validateEngineSchema(container.createSchema({})).valid).toBe(true);
  });

  test('5. designer-only 物料不产生 Runtime 组件注册诊断', () => {
    const deco: DesignerMaterialDefinition = {
      name: 'deco',
      version: '1.0.0',
      title: '装饰',
      componentName: 'Deco',
      runtimeTarget: { kind: 'designer-only' },
      createSchema: () => ({ type: 'void', 'x-component': 'Deco' }),
    };
    const { components } = runtimeRegistry();
    expect(checkMaterialRuntimeTarget(deco, components)).toEqual([]);
  });

  test('6. 缺少 Runtime 组件时产生 COMPONENT_NOT_REGISTERED', () => {
    const { components, decorators } = runtimeRegistry();
    const diagnostics = checkSchemaComponentRegistrations(
      { type: 'object', properties: { a: { 'x-component': 'NotExist' } } },
      components,
      decorators
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'COMPONENT_NOT_REGISTERED', severity: 'error' }),
    ]);
  });

  test('7. 导出 Schema 被 Parser / Validator 接受，导入恢复设计器状态', () => {
    const tree = new TreeNode({
      componentName: 'Form',
      children: [
        {
          componentName: 'Field',
          props: {
            name: 'username',
            title: '用户名',
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            'x-component-props': { placeholder: '请输入' },
            default: '张三',
          },
        },
      ],
    });

    const doc = treeToSchemaDocument(tree, { schemaId: 's1' });
    const parsed = parseSchemaDocument(doc);
    expect(parsed.schemaId).toBe('s1');
    expect(validateEngineSchema(parsed.schema).valid).toBe(true);

    const { tree: back } = schemaDocumentToTree(doc);
    expect(back.children).toHaveLength(1);
    expect(back.children![0].props!['x-component']).toBe('Input');
  });

  test('8. Material 属性映射到 Schema 后不丢失（x-component-props / 默认值）', () => {
    const tree = new TreeNode({
      componentName: 'Form',
      children: [
        {
          componentName: 'Field',
          props: {
            name: 'username',
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            'x-component-props': { placeholder: '请输入' },
            default: '张三',
          },
        },
      ],
    });

    const doc = treeToSchemaDocument(tree, { schemaId: 's1' });
    const { tree: back } = schemaDocumentToTree(doc);
    const doc2 = treeToSchemaDocument(back, { schemaId: 's1' });

    const props = (doc2.schema as any).properties.username;
    expect(props['x-component']).toBe('Input');
    expect(props['x-component-props']).toEqual({ placeholder: '请输入' });
    expect(props.default).toBe('张三');
  });
});
