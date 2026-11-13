import { TreeNode } from '@designable/core';
import { validateEngineSchema } from '@x-form-engine/core';
import { ENGINE_SCHEMA_VERSION } from '@x-form-engine/types';
import { schemaDocumentToTree, treeToSchemaDocument } from './schema-adapter';

function inputTree() {
  return new TreeNode({
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
}

describe('schema-adapter（Task 5.4）', () => {
  test('treeToSchemaDocument 生成信封 + designerMetadata', () => {
    const doc = treeToSchemaDocument(inputTree(), {
      schemaId: 's1',
      previousVersion: 3,
      designerMetadata: { version: '1.0.0', layout: { x: 1 } },
    });

    expect(doc.schemaId).toBe('s1');
    expect(doc.version).toBe(4);
    expect(doc.engineSchemaVersion).toBe(ENGINE_SCHEMA_VERSION);
    expect(doc.designerMetadata).toEqual({ version: '1.0.0', layout: { x: 1 } });
    expect(validateEngineSchema(doc.schema).valid).toBe(true);
  });

  test('schemaDocumentToTree 还原 TreeNode 且保留 designerMetadata', () => {
    const doc = treeToSchemaDocument(inputTree(), {
      schemaId: 's1',
      designerMetadata: { version: '1.0.0' },
    });
    const { tree, doc: parsed } = schemaDocumentToTree(doc);

    expect(tree instanceof TreeNode).toBe(true);
    expect(tree.children).toHaveLength(1);
    expect(tree.children![0].props!['x-component']).toBe('Input');
    expect(parsed.designerMetadata).toEqual({ version: '1.0.0' });
  });

  test('往返保留 Formily 原生字段 / x-component-props / 默认值 / x-engine 扩展', () => {
    const tree = inputTree();
    tree.children![0].props!['x-engine'] = { snapshot: { enabled: true } };

    const doc = treeToSchemaDocument(tree, { schemaId: 's1' });
    const { tree: back } = schemaDocumentToTree(doc);
    const doc2 = treeToSchemaDocument(back, { schemaId: 's1' });

    const props = (doc2.schema as any).properties.username;
    expect(props['x-component']).toBe('Input');
    expect(props['x-decorator']).toBe('FormItem');
    expect(props['x-component-props']).toEqual({ placeholder: '请输入' });
    expect(props.default).toBe('张三');
    expect(props['x-engine']).toEqual({ snapshot: { enabled: true } });
  });

  test('缺 name 字段导出补齐 field_ 默认命名', () => {
    const tree = new TreeNode({
      componentName: 'Form',
      children: [
        { componentName: 'Field', props: { 'x-component': 'Input' } },
        { componentName: 'Field', props: { 'x-component': 'Select' } },
      ],
    });

    const doc = treeToSchemaDocument(tree, { schemaId: 's1' });
    expect(Object.keys((doc.schema as any).properties)).toEqual(['field_1', 'field_2']);
  });

  test('engineSchemaVersion 不一致导入被拒绝', () => {
    const doc = treeToSchemaDocument(inputTree(), { schemaId: 's1' });
    (doc as any).engineSchemaVersion = '0.0.0';
    expect(() => schemaDocumentToTree(doc)).toThrow(/engineSchemaVersion/);
  });

  test('S1：提供组件/装饰器注册表时，引用已注册组件可正常导出', () => {
    const doc = treeToSchemaDocument(inputTree(), {
      schemaId: 's1',
      components: new Set(['Input']),
      decorators: new Set(['FormItem']),
    });
    expect(doc.schemaId).toBe('s1');
  });

  test('S1：引用未注册组件时导出被拒绝（不静默失配）', () => {
    expect(() =>
      treeToSchemaDocument(inputTree(), {
        schemaId: 's1',
        components: new Set(['Select']),
        decorators: new Set(['FormItem']),
      })
    ).toThrow(/未注册的组件/);
  });
});
