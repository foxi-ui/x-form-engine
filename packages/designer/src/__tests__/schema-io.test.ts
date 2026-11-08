import { TreeNode } from '@designable/core';
import { validateEngineSchema } from '@x-form-engine/core';
import { ENGINE_SCHEMA_VERSION } from '@x-form-engine/types';
import { exportSchemaDocument, importSchemaDocument } from '../schema-io';

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
        },
      },
    ],
  });
}

test('导出：信封字段齐全且 schema 校验通过、版本自增', () => {
  const doc = exportSchemaDocument(inputTree(), { schemaId: 's1', previousVersion: 3 });
  expect(doc.schemaId).toBe('s1');
  expect(doc.version).toBe(4);
  expect(doc.engineSchemaVersion).toBe(ENGINE_SCHEMA_VERSION);
  expect(validateEngineSchema(doc.schema).valid).toBe(true);
  expect((doc.schema as any).properties.username['x-component']).toBe('Input');
  expect((doc.schema as any).properties.username['x-component-props'].placeholder).toBe('请输入');
});

test('往返：导出再导入复用 x-designable-id 且结构一致', () => {
  const doc = exportSchemaDocument(inputTree(), { schemaId: 's1' });
  const { tree, doc: parsed } = importSchemaDocument(doc);
  expect(tree instanceof TreeNode).toBe(true);
  expect(parsed.schemaId).toBe('s1');
  expect(tree.children).toHaveLength(1);
  expect(tree.children![0].props!['x-component']).toBe('Input');
});

test('重复字段 name 导出被拒绝', () => {
  const tree = new TreeNode({
    componentName: 'Form',
    children: [
      { componentName: 'Field', props: { name: 'dup', 'x-component': 'Input' } },
      { componentName: 'Field', props: { name: 'dup', 'x-component': 'Select' } },
    ],
  });
  expect(() => exportSchemaDocument(tree, { schemaId: 's1' })).toThrow(/duplicate/);
});

test('engineSchemaVersion 不一致导入被拒绝', () => {
  const doc = exportSchemaDocument(inputTree(), { schemaId: 's1' });
  (doc as any).engineSchemaVersion = '0.0.0';
  expect(() => importSchemaDocument(doc)).toThrow(/engineSchemaVersion/);
});
