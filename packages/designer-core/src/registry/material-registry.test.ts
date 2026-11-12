import { FormEngineError } from '@x-form-engine/types';
import type { DesignerMaterialDefinition } from '@x-form-engine/types';
import { createMaterialRegistry } from './material-registry';

function material(overrides: Partial<DesignerMaterialDefinition> = {}): DesignerMaterialDefinition {
  return {
    name: 'input',
    version: '1.0.0',
    title: 'Input',
    category: 'basic',
    componentName: 'Input',
    runtimeTarget: { kind: 'component', componentName: 'Input' },
    createSchema: () => ({ type: 'string', 'x-component': 'Input' }),
    ...overrides,
  };
}

describe('createMaterialRegistry', () => {
  test('1. 注册一个 Material 后可查询', () => {
    const registry = createMaterialRegistry();
    registry.register(material());
    expect(registry.get('input')).toMatchObject({ name: 'input', title: 'Input' });
  });

  test('2. 重复注册同名抛 PLUGIN_CONFLICT', () => {
    const registry = createMaterialRegistry();
    registry.register(material());
    expect(() => registry.register(material({ title: 'Input2' }))).toThrowError(
      FormEngineError
    );
  });

  test('3. 批量注册', () => {
    const registry = createMaterialRegistry();
    registry.registerMany([
      material(),
      material({ name: 'textarea', componentName: 'TextArea', runtimeTarget: { kind: 'component', componentName: 'TextArea' } }),
    ]);
    expect(registry.getAll()).toHaveLength(2);
  });

  test('4. 查询不存在的 Material 返回 undefined', () => {
    const registry = createMaterialRegistry();
    expect(registry.get('missing')).toBeUndefined();
  });

  test('5. 按分类查询', () => {
    const registry = createMaterialRegistry();
    registry.register(material());
    registry.register(material({ name: 'textarea', componentName: 'TextArea', runtimeTarget: { kind: 'component', componentName: 'TextArea' } }));
    registry.register(
      material({
        name: 'divider',
        componentName: 'Divider',
        category: 'layout',
        runtimeTarget: { kind: 'component', componentName: 'Divider' },
      })
    );

    expect(registry.getByCategory('basic')).toHaveLength(2);
    expect(registry.getByCategory('layout')).toHaveLength(1);
    expect(registry.getByCategory('nope')).toHaveLength(0);
  });

  test('6. 卸载 Material', () => {
    const registry = createMaterialRegistry();
    registry.register(material());
    registry.unregister('input');
    expect(registry.has('input')).toBe(false);
  });

  test('7. 插件卸载时清理 Material（list 归属 + unregister 来源校验）', () => {
    const registry = createMaterialRegistry();
    registry.register(material());

    const owned = registry.list();
    expect(owned).toEqual([{ name: 'input', source: undefined }]);
    registry.unregister(owned[0].name, owned[0].source);
    expect(registry.has('input')).toBe(false);
  });

  test('8. 注册纯设计器物料（designer-only）不产生诊断', () => {
    const registry = createMaterialRegistry();
    registry.register(
      material({ name: 'deco', componentName: 'Deco', runtimeTarget: { kind: 'designer-only' } })
    );
    expect(registry.has('deco')).toBe(true);
    expect(registry.getDiagnostics()).toEqual([]);
  });

  test('9. 注册无 runtimeTarget 的物料不静默跳过，产生诊断', () => {
    const registry = createMaterialRegistry();
    registry.register(material({ runtimeTarget: undefined }));

    expect(registry.has('input')).toBe(true);
    const diagnostics = registry.getDiagnostics();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: 'MATERIAL_RUNTIME_TARGET_MISSING',
      severity: 'warning',
      materialName: 'input',
    });
  });

  test('component target 的 componentName 与物料 componentName 不一致产生 error 诊断', () => {
    const registry = createMaterialRegistry();
    registry.register(
      material({ runtimeTarget: { kind: 'component', componentName: 'OtherComponent' } })
    );

    const diagnostics = registry.getDiagnostics();
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'MATERIAL_RUNTIME_TARGET_MISMATCH',
        severity: 'error',
        materialName: 'input',
      }),
    ]);
  });

  test('clear 清空全部注册项', () => {
    const registry = createMaterialRegistry();
    registry.register(material());
    registry.clear();
    expect(registry.getAll()).toHaveLength(0);
  });
});
