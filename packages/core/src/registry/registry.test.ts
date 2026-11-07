import { createRegistry } from './registry';
import { FormEngineError } from '@x-form-engine/types';

test('重复注册同名抛 PLUGIN_CONFLICT', () => {
  const r = createRegistry<unknown>();
  r.register('Input', {}, 'plugin-a');
  expect(() => r.register('Input', {}, 'plugin-b'))
    .toThrowError(expect.objectContaining({ code: 'PLUGIN_CONFLICT' }));
});

test('list 记录 source 与 registeredAt', () => {
  const r = createRegistry<unknown>();
  r.register('Input', { a: 1 }, 'plugin-a');
  const [e] = r.list();
  expect(e.name).toBe('Input');
  expect(e.source).toBe('plugin-a');
  expect(typeof e.registeredAt).toBe('number');
});

test('跨 source 的 unregister 抛错，同 source 可卸载', () => {
  const r = createRegistry<unknown>();
  r.register('Input', {}, 'plugin-a');
  expect(() => r.unregister('Input', 'plugin-b')).toThrowError(FormEngineError);
  r.unregister('Input', 'plugin-a');
  expect(r.has('Input')).toBe(false);
});

test('get/has 命中已注册项，list 返回条目副本', () => {
  const r = createRegistry<{ a: number }>();
  const value = { a: 1 };
  r.register('Input', value);
  expect(r.get('Input')).toBe(value);
  expect(r.get('Missing')).toBeUndefined();

  const listed = r.list();
  listed[0].source = 'hacked';
  expect(r.list()[0].source).toBeUndefined();
});

test('unregister 不存在或已卸载的名称是幂等 no-op', () => {
  const r = createRegistry<unknown>();
  expect(() => r.unregister('Missing', 'plugin-a')).not.toThrow();
  r.register('Input', {}, 'plugin-a');
  r.unregister('Input', 'plugin-a');
  expect(() => r.unregister('Input', 'plugin-a')).not.toThrow();
});
