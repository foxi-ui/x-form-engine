import type { ReactComponentBinding } from '@x-form-engine/components';
import { deriveDesignerMaterials } from './derive-materials';

const Dummy = () => null;

function base(name: string) {
  return {
    protocol: {
      name,
      version: '1.0.0',
      meta: { title: name, category: 'basic' },
      capabilities: { editable: true, readonly: true, mobile: false },
      schema: { type: 'object' },
    },
  };
}

function binding(name: string): ReactComponentBinding {
  return { ...base(name), implementations: { pc: Dummy as ReactComponentBinding['implementations']['pc'] } };
}

function bindingWithoutPc(name: string): ReactComponentBinding {
  return { ...base(name), implementations: {} };
}

describe('deriveDesignerMaterials（Task 5.6）', () => {
  test('正常派生：生成含 runtimeTarget / designerComponent / createSchema 的物料', () => {
    const { materials, diagnostics } = deriveDesignerMaterials([binding('Input')]);

    expect(diagnostics).toEqual([]);
    expect(materials).toHaveLength(1);
    const m = materials[0];
    expect(m.name).toBe('Input');
    expect(m.componentName).toBe('Input');
    expect(m.runtimeTarget).toEqual({ kind: 'component', componentName: 'Input' });
    expect(m.designerComponent).toBe(Dummy);

    const schema = m.createSchema({});
    expect(schema['x-component']).toBe('Input');
    expect(schema['x-decorator']).toBe('FormItem');
    expect(schema.type).toBe('string');
  });

  test('缺 implementations.pc 的 binding 产生诊断而非静默跳过', () => {
    const { materials, diagnostics } = deriveDesignerMaterials([
      binding('Input'),
      bindingWithoutPc('MobileOnly'),
    ]);

    expect(materials).toHaveLength(1);
    expect(materials[0].name).toBe('Input');
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'MATERIAL_PC_IMPLEMENTATION_MISSING',
        severity: 'warning',
        materialName: 'MobileOnly',
      }),
    ]);
  });

  test('相同 componentName 冲突产生诊断且不重复注册', () => {
    const { materials, diagnostics } = deriveDesignerMaterials([
      binding('Input'),
      binding('Input'),
    ]);

    expect(materials).toHaveLength(1);
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'MATERIAL_COMPONENT_NAME_CONFLICT',
        severity: 'error',
        materialName: 'Input',
      }),
    ]);
  });
});
