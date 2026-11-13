import { basicMaterials, basicMaterialsDiagnostics } from './index';

test('basicMaterials 含 7 个基础物料', () => {
  expect(basicMaterials).toHaveLength(7);
  expect(basicMaterials.map((m) => m.name)).toEqual(
    expect.arrayContaining([
      'Input',
      'Textarea',
      'Number',
      'Select',
      'Radio',
      'Checkbox',
      'DatePicker',
    ])
  );
});

test('每个物料声明 runtimeTarget.component 且与 componentName 一致（C10）', () => {
  for (const m of basicMaterials) {
    expect(m.runtimeTarget).toEqual({ kind: 'component', componentName: m.componentName });
  }
});

test('createSchema 生成可渲染的 Formily 字段（x-decorator + x-component）', () => {
  for (const m of basicMaterials) {
    const schema = m.createSchema({});
    expect(schema['x-component']).toBe(m.componentName);
    expect(schema['x-decorator']).toBe('FormItem');
    expect(schema.type).toBe('string');
  }
});

test('基础物料派生的诊断为空（均有 pc 实现）', () => {
  expect(basicMaterialsDiagnostics).toEqual([]);
});
