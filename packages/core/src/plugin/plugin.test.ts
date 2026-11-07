import type { ComponentBinding } from '@x-form-engine/types';
import { createFormEngine } from '../engine';
import { resolvePluginOrder } from './dependency-resolver';

const BINDING: ComponentBinding = {
  protocol: {
    name: 'Temp',
    version: '1',
    meta: { title: 'T' },
    capabilities: { editable: true, readonly: false, mobile: false },
    schema: { type: 'object' },
  },
  implementations: {},
};

test('插件按依赖拓扑排序安装（B 依赖 A 时 A 先装）', () => {
  const order: string[] = [];
  createFormEngine({
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

test('循环依赖抛 PLUGIN_CONFLICT', () => {
  expect(() => resolvePluginOrder([
    { name: 'a', version: '1.0.0', dependencies: ['b'], install: () => {} },
    { name: 'b', version: '1.0.0', dependencies: ['a'], install: () => {} },
  ])).toThrowError(expect.objectContaining({ code: 'PLUGIN_CONFLICT' }));
});

test('install 中途抛错回滚已注册资源，不留半安装态', () => {
  const engine = createFormEngine();
  expect(() => engine.installPlugin({
    name: 'boom', version: '1.0.0',
    install: ({ registry }) => {
      registry.components.register('Temp', BINDING, 'boom');
      throw new Error('install fail');
    },
  })).toThrowError(/install fail/);
  expect(engine.registry.components.has('Temp')).toBe(false);
});

test('卸载删除自身资源，不删除其它插件的资源', () => {
  const engine = createFormEngine({
    plugins: [
      { name: 'a', version: '1.0.0', install: ({ registry }) => registry.components.register('Input', /* binding */{} as any, 'a') },
    ],
  });
  // disposeAll 逆序，且不触碰 source 非 'a' 的资源
  engine.registry.components.register('Other', {} as any, 'b');
  engine.dispose();
  expect(engine.registry.components.has('Input')).toBe(false);
  expect(engine.registry.components.has('Other')).toBe(true);
});

test('disposeAll 按安装逆序调用插件 dispose（B 依赖 A 时为 B、A）', () => {
  const disposed: string[] = [];
  const engine = createFormEngine({
    plugins: [
      { name: 'a', version: '1.0.0', install: () => {}, dispose: () => disposed.push('a') },
      { name: 'b', version: '1.0.0', dependencies: ['a'], install: () => {}, dispose: () => disposed.push('b') },
    ],
  });
  engine.dispose();
  expect(disposed).toEqual(['b', 'a']);
});

test('插件 dispose 抛错时资源仍释放、后续插件继续卸载、engine 正常丢弃', () => {
  const failed: string[] = [];
  const disposed: string[] = [];
  const engine = createFormEngine({
    plugins: [
      {
        name: 'bad', version: '1.0.0',
        install: ({ registry }) => registry.components.register('Bad', BINDING, 'bad'),
        dispose: () => { throw new Error('dispose fail'); },
      },
      {
        name: 'good', version: '1.0.0',
        install: ({ registry }) => registry.components.register('Good', BINDING, 'good'),
        dispose: () => disposed.push('good'),
      },
    ],
  });
  engine.events.on('plugin:failed', (payload: { plugin: string }) => failed.push(payload.plugin));

  expect(() => engine.dispose()).not.toThrow();
  expect(failed).toEqual(['bad']);
  expect(disposed).toEqual(['good']);
  expect(engine.registry.components.has('Bad')).toBe(false);
  expect(engine.registry.components.has('Good')).toBe(false);
  expect(engine.status).toBe('disposed');
});
