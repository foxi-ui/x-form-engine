import { createSetterRegistry } from '@x-form-engine/designer-core';
import type { SetterDefinition } from '@x-form-engine/types';
import { createDesignableSetterAdapter } from './setter-adapter';

const StringSetter = () => null;

function setter(name: string): SetterDefinition {
  return { name, version: '1.0.0', component: StringSetter };
}

describe('createDesignableSetterAdapter（Task 5.3）', () => {
  test('components map：setter name 对应注册的 React 组件', () => {
    const registry = createSetterRegistry();
    registry.register(setter('StringSetter'));
    registry.register(setter('NumberSetter'));

    const adapter = createDesignableSetterAdapter(registry);
    expect(adapter.components['StringSetter']).toBe(StringSetter);
    expect(adapter.components['NumberSetter']).toBe(StringSetter);
  });

  test('resolve 命中已注册 Setter 返回 React 组件', () => {
    const registry = createSetterRegistry();
    registry.register(setter('StringSetter'));

    const result = createDesignableSetterAdapter(registry).resolve({ name: 'StringSetter', props: { x: 1 } });
    expect(result.found).toBe(true);
    expect(result.component).toBe(StringSetter);
    expect(result.diagnostics).toEqual([]);
  });

  test('resolve 不存在 Setter 产生诊断（C5，不静默丢弃）', () => {
    const registry = createSetterRegistry();
    const result = createDesignableSetterAdapter(registry).resolve({ name: 'MissingSetter' });

    expect(result.found).toBe(false);
    expect(result.component).toBeUndefined();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'SETTER_NOT_FOUND', severity: 'warning' }),
    ]);
  });
});
