import { resolvePluginOrder } from './dependency-resolver';
import type { PluginDefinition } from '@x-form-engine/types';

// 纯 PluginDefinition 对象（无 install），证明泛型化
test('resolvePluginOrder 接受纯 PluginDefinition 并按依赖拓扑排序', () => {
  const ordered = resolvePluginOrder<PluginDefinition>([
    { name: 'b', version: '1.0.0', dependencies: ['a'] },
    { name: 'a', version: '1.0.0' },
  ]);
  expect(ordered.map((p) => p.name)).toEqual(['a', 'b']);
});

test('依赖缺失抛 PLUGIN_DEPENDENCY_MISSING', () => {
  expect(() =>
    resolvePluginOrder([{ name: 'x', version: '1.0.0', dependencies: ['missing'] }])
  ).toThrowError(expect.objectContaining({ code: 'PLUGIN_DEPENDENCY_MISSING' }));
});

test('循环依赖抛 PLUGIN_CONFLICT', () => {
  expect(() =>
    resolvePluginOrder([
      { name: 'a', version: '1.0.0', dependencies: ['b'] },
      { name: 'b', version: '1.0.0', dependencies: ['a'] },
    ])
  ).toThrowError(expect.objectContaining({ code: 'PLUGIN_CONFLICT' }));
});

test('同名插件抛 PLUGIN_CONFLICT 而非误报循环依赖', () => {
  expect(() =>
    resolvePluginOrder([
      { name: 'dup', version: '1.0.0' },
      { name: 'dup', version: '2.0.0' },
    ])
  ).toThrowError(expect.objectContaining({ code: 'PLUGIN_CONFLICT' }));
});
