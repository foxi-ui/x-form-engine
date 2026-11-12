import { FormEngineError } from '@x-form-engine/types';
import { createNamedRegistry } from './named-registry';

interface Item {
  name: string;
  title: string;
}

describe('createNamedRegistry', () => {
  test('注册后可通过 get / has / getAll 查询', () => {
    const registry = createNamedRegistry<Item>();
    registry.register({ name: 'a', title: 'A' });
    registry.register({ name: 'b', title: 'B' });

    expect(registry.get('a')).toEqual({ name: 'a', title: 'A' });
    expect(registry.has('a')).toBe(true);
    expect(registry.has('missing')).toBe(false);
    expect(registry.getAll()).toEqual([
      { name: 'a', title: 'A' },
      { name: 'b', title: 'B' },
    ]);
  });

  test('查询不存在的名称返回 undefined', () => {
    const registry = createNamedRegistry<Item>();
    expect(registry.get('nope')).toBeUndefined();
  });

  test('重复注册同名抛 PLUGIN_CONFLICT', () => {
    const registry = createNamedRegistry<Item>();
    registry.register({ name: 'a', title: 'A' });

    expect(() => registry.register({ name: 'a', title: 'A2' })).toThrowError(
      FormEngineError
    );
    try {
      registry.register({ name: 'a', title: 'A2' });
    } catch (error) {
      expect((error as FormEngineError).code).toBe('PLUGIN_CONFLICT');
    }
  });

  test('registerMany 批量注册', () => {
    const registry = createNamedRegistry<Item>();
    registry.registerMany([
      { name: 'a', title: 'A' },
      { name: 'b', title: 'B' },
    ]);

    expect(registry.getAll()).toHaveLength(2);
    expect(registry.get('a')?.title).toBe('A');
  });

  test('list 返回 name 与 source（未指定来源为 undefined）', () => {
    const registry = createNamedRegistry<Item>();
    registry.register({ name: 'a', title: 'A' });

    expect(registry.list()).toEqual([{ name: 'a', source: undefined }]);
  });

  test('unregister 移除已注册项，幂等（不存在时为 no-op）', () => {
    const registry = createNamedRegistry<Item>();
    registry.register({ name: 'a', title: 'A' });

    registry.unregister('a');
    expect(registry.has('a')).toBe(false);

    expect(() => registry.unregister('missing')).not.toThrow();
  });

  test('unregister 带 source 时校验归属，来源不匹配抛 PLUGIN_CONFLICT', () => {
    const registry = createNamedRegistry<Item>();
    registry.register({ name: 'a', title: 'A' });

    // 注册时 source 为 undefined，带其它 source 卸载应视为归属不匹配。
    expect(() => registry.unregister('a', 'other-plugin')).toThrowError(
      FormEngineError
    );
    try {
      registry.unregister('a', 'other-plugin');
    } catch (error) {
      expect((error as FormEngineError).code).toBe('PLUGIN_CONFLICT');
    }
    // 归属不匹配不应删除。
    expect(registry.has('a')).toBe(true);
  });
});
