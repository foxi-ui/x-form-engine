import { FormEngineError } from '@x-form-engine/types';
import type { SetterDefinition } from '@x-form-engine/types';
import { createSetterRegistry } from './setter-registry';

function setter(overrides: Partial<SetterDefinition> = {}): SetterDefinition {
  return {
    name: 'StringSetter',
    version: '1.0.0',
    component: {},
    valueType: 'string',
    defaultProps: { placeholder: '请输入' },
    validate: (value) => ({ valid: typeof value === 'string' }),
    ...overrides,
  };
}

describe('createSetterRegistry', () => {
  test('1. 注册基础 Setter 后可查询', () => {
    const registry = createSetterRegistry();
    registry.register(setter());
    expect(registry.get('StringSetter')).toMatchObject({ name: 'StringSetter', valueType: 'string' });
  });

  test('2. 重复注册同名抛 PLUGIN_CONFLICT', () => {
    const registry = createSetterRegistry();
    registry.register(setter());
    expect(() => registry.register(setter())).toThrowError(FormEngineError);
  });

  test('3. 批量注册', () => {
    const registry = createSetterRegistry();
    registry.registerMany([
      setter(),
      setter({ name: 'NumberSetter', valueType: 'number' }),
    ]);
    expect(registry.getAll()).toHaveLength(2);
  });

  test('4. 查询不存在的 Setter 与卸载', () => {
    const registry = createSetterRegistry();
    expect(registry.get('nope')).toBeUndefined();

    registry.register(setter());
    registry.unregister('StringSetter');
    expect(registry.has('StringSetter')).toBe(false);
  });

  test('5. 插件卸载时清理 Setter（list 归属 + unregister 来源校验）', () => {
    const registry = createSetterRegistry();
    registry.register(setter());

    const owned = registry.list();
    expect(owned).toEqual([{ name: 'StringSetter', source: undefined }]);
    registry.unregister(owned[0].name, owned[0].source);
    expect(registry.has('StringSetter')).toBe(false);
  });

  test('6. 不存在 Setter 的解析返回 found:false 且可诊断', () => {
    const registry = createSetterRegistry();
    const result = registry.resolve({ name: 'MissingSetter', props: { x: 1 } });

    expect(result.found).toBe(false);
    expect(result.binding).toEqual({ name: 'MissingSetter', props: { x: 1 } });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'SETTER_NOT_FOUND',
        severity: 'warning',
        setterName: 'MissingSetter',
      }),
    ]);
  });

  test('7. Setter 默认属性保留在定义中', () => {
    const registry = createSetterRegistry();
    registry.register(setter());
    expect(registry.get('StringSetter')?.defaultProps).toEqual({ placeholder: '请输入' });
  });

  test('8. Setter 校验函数可调用', () => {
    const registry = createSetterRegistry();
    registry.register(setter());
    const def = registry.get('StringSetter')!;
    expect(def.validate?.('hello')).toEqual({ valid: true });
    expect(def.validate?.(123)).toEqual({ valid: false });
  });

  test('resolve 命中已注册 Setter 返回 found:true', () => {
    const registry = createSetterRegistry();
    registry.register(setter());
    const result = registry.resolve({ name: 'StringSetter' });

    expect(result.found).toBe(true);
    expect(result.setter?.name).toBe('StringSetter');
    expect(result.diagnostics).toEqual([]);
  });
});
