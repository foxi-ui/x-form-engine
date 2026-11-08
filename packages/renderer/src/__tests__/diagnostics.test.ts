import { collectSchemaComponentRefs, filterDiagnosticsBySchema } from '../diagnostics';

test('递归收集 properties / items 中的组件与装饰器引用', () => {
  const refs = collectSchemaComponentRefs({
    type: 'object',
    properties: {
      a: { 'x-component': 'Input', 'x-decorator': 'FormItem' },
      list: {
        type: 'array',
        items: {
          type: 'object',
          properties: { b: { 'x-component': 'Select' } },
        },
      },
    },
  });

  expect([...refs.components].sort()).toEqual(['Input', 'Select']);
  expect([...refs.decorators]).toEqual(['FormItem']);
});

test('只保留当前 Schema 引用的诊断', () => {
  const diagnostics = [
    {
      kind: 'component' as const,
      name: 'Used',
      requestedPlatform: 'mobile' as const,
      fallbackPlatform: 'pc' as const,
    },
    {
      kind: 'component' as const,
      name: 'Unused',
      requestedPlatform: 'mobile' as const,
      fallbackPlatform: 'pc' as const,
    },
  ];
  const filtered = filterDiagnosticsBySchema(diagnostics, {
    type: 'object',
    properties: { a: { 'x-component': 'Used' } },
  });
  expect(filtered.map((d) => d.name)).toEqual(['Used']);
});
