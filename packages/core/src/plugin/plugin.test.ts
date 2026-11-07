import { createFormEngine } from '../engine';

test('插件按依赖拓扑排序安装（B 依赖 A 时 A 先装）', () => {
  const order: string[] = [];
  const engine = createFormEngine({
    plugins: [
      { name: 'b', version: '1.0.0', dependencies: ['a'], install: () => order.push('b') },
      { name: 'a', version: '1.0.0', install: () => order.push('a') },
    ],
  });
  expect(order).toEqual(['a', 'b']);
});

test('依赖缺失抛 PLUGIN_DEPENDENCY_MISSING', () => {
  expect(() => createFormEngine({
    plugins: [{ name: 'x', version: '1.0.0', dependencies: ['missing'], install: () => {} }],
  })).toThrowError(expect.objectContaining({ code: 'PLUGIN_DEPENDENCY_MISSING' }));
});

test('install 中途抛错回滚已注册资源，不留半安装态', () => {
  const engine = createFormEngine();
  expect(() => engine.installPlugin({
    name: 'boom', version: '1.0.0',
    install: ({ registry }) => {
      registry.components.register('Temp', { protocol: { name: 'Temp', version: '1', meta: { title: 'T' }, capabilities: { editable: true, readonly: false, mobile: false }, schema: { type: 'object' } }, implementations: {} }, 'boom');
      throw new Error('install fail');
    },
  })).toThrowError(/install fail/);
  expect(engine.registry.components.has('Temp')).toBe(false);
});

test('卸载不删除其它插件的资源', () => {
  const engine = createFormEngine({
    plugins: [
      { name: 'a', version: '1.0.0', install: ({ registry }) => registry.components.register('Input', /* binding */{} as any, 'a') },
    ],
  });
  // disposeAll 逆序，且不触碰 source 非 'a' 的资源
  engine.registry.components.register('Other', {} as any, 'b');
  engine.dispose();
  expect(engine.registry.components.has('Other')).toBe(true);
});
