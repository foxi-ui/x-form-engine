import type { DesignerMaterialDefinition } from '@x-form-engine/types';
import { checkMaterialRuntimeTarget, checkSchemaComponentRegistrations } from './consistency';

function material(runtimeTarget: DesignerMaterialDefinition['runtimeTarget']): DesignerMaterialDefinition {
  return {
    name: 'input',
    version: '1.0.0',
    title: 'Input',
    componentName: 'Input',
    runtimeTarget,
    createSchema: () => ({ type: 'string', 'x-component': 'Input' }),
  };
}

describe('checkSchemaComponentRegistrations（Task 7.3）', () => {
  test('已注册的组件与装饰器不产生诊断', () => {
    const diagnostics = checkSchemaComponentRegistrations(
      {
        type: 'object',
        properties: { a: { 'x-component': 'Input', 'x-decorator': 'FormItem' } },
      },
      new Set(['Input']),
      new Set(['FormItem'])
    );
    expect(diagnostics).toEqual([]);
  });

  test('未注册的组件产生 COMPONENT_NOT_REGISTERED（error）', () => {
    const diagnostics = checkSchemaComponentRegistrations(
      { type: 'object', properties: { a: { 'x-component': 'Missing' } } },
      new Set(['Input']),
      new Set()
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'COMPONENT_NOT_REGISTERED',
        severity: 'error',
        componentName: 'Missing',
      }),
    ]);
  });

  test('未注册的装饰器产生 DECORATOR_NOT_REGISTERED（error）', () => {
    const diagnostics = checkSchemaComponentRegistrations(
      { type: 'object', properties: { a: { 'x-decorator': 'MissingDeco' } } },
      new Set(),
      new Set(['FormItem'])
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'DECORATOR_NOT_REGISTERED',
        severity: 'error',
      }),
    ]);
  });

  test('递归收集嵌套 properties / items 中的引用', () => {
    const diagnostics = checkSchemaComponentRegistrations(
      {
        type: 'object',
        properties: {
          list: {
            type: 'array',
            items: {
              type: 'object',
              properties: { b: { 'x-component': 'MissingNested' } },
            },
          },
        },
      },
      new Set(['Input']),
      new Set()
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].componentName).toBe('MissingNested');
  });
});

describe('checkMaterialRuntimeTarget（Task 7.1）', () => {
  test('component target 已注册不产生诊断', () => {
    const diagnostics = checkMaterialRuntimeTarget(
      material({ kind: 'component', componentName: 'Input' }),
      new Set(['Input'])
    );
    expect(diagnostics).toEqual([]);
  });

  test('component target 未注册产生 MATERIAL_COMPONENT_NOT_REGISTERED（error）', () => {
    const diagnostics = checkMaterialRuntimeTarget(
      material({ kind: 'component', componentName: 'Missing' }),
      new Set(['Input'])
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'MATERIAL_COMPONENT_NOT_REGISTERED',
        severity: 'error',
        materialName: 'input',
        componentName: 'Missing',
      }),
    ]);
  });

  test('designer-only 与 schema-container 不参与组件注册校验', () => {
    expect(
      checkMaterialRuntimeTarget(material({ kind: 'designer-only' }), new Set(['Input']))
    ).toEqual([]);
    expect(
      checkMaterialRuntimeTarget(material({ kind: 'schema-container', schemaType: 'object' }), new Set(['Input']))
    ).toEqual([]);
  });
});
