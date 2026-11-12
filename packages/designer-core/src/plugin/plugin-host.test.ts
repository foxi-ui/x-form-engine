import { createEventBus } from '@x-form-engine/core';
import { FormEngineError } from '@x-form-engine/types';
import type {
  DesignerEnginePublicAPI,
  DesignerMaterialDefinition,
  DesignerPlugin,
  DesignerPluginContext,
} from '@x-form-engine/types';
import { createCommandRegistry, createPanelRegistry, createToolbarRegistry } from '../registry/panels';
import { createMaterialRegistry } from '../registry/material-registry';
import { createSetterRegistry } from '../registry/setter-registry';
import { createSchemaEditor } from '../schema/schema-editor';
import { createDesignerPluginHost } from './plugin-host';

function makeMaterial(name: string): DesignerMaterialDefinition {
  return {
    name,
    version: '1.0.0',
    title: name,
    componentName: name,
    runtimeTarget: { kind: 'component', componentName: name },
    createSchema: () => ({ type: 'string', 'x-component': name }),
  };
}

function makePlugin(
  name: string,
  dependencies: string[] = [],
  install?: (ctx: DesignerPluginContext) => void | (() => void)
): DesignerPlugin {
  return {
    name,
    version: '1.0.0',
    dependencies,
    install(ctx) {
      ctx.materials.register(makeMaterial(name));
      return install?.(ctx);
    },
  };
}

function createHost() {
  const materials = createMaterialRegistry();
  const setters = createSetterRegistry();
  const panels = createPanelRegistry();
  const commands = createCommandRegistry();
  const toolbars = createToolbarRegistry();
  const events = createEventBus();
  const schema = createSchemaEditor();
  const engine = { materials, setters, panels, commands, toolbars, events, schema } as unknown as DesignerEnginePublicAPI;

  const host = createDesignerPluginHost({
    materials,
    setters,
    panels,
    commands,
    toolbars,
    events,
    schema,
    getEngine: () => engine,
  });

  return { host, materials, setters, events };
}

describe('createDesignerPluginHost（Task 4.4）', () => {
  test('依赖拓扑顺序：A 依赖 B，先装 B 再装 A 均成功', () => {
    const { host, materials } = createHost();
    host.install(makePlugin('B'));
    host.install(makePlugin('A', ['B']));

    expect(materials.has('A')).toBe(true);
    expect(materials.has('B')).toBe(true);
    expect(host.list().map((p) => p.plugin.name)).toEqual(['B', 'A']);
  });

  test('依赖缺失：A 依赖不存在的 B 安装失败', () => {
    const { host, materials } = createHost();
    expect(() => host.install(makePlugin('A', ['Missing']))).toThrowError(FormEngineError);
    expect(materials.has('A')).toBe(false);
  });

  test('安装抛异常：清理 A 已注册的资源（回滚）', () => {
    const { host, materials } = createHost();
    host.install(makePlugin('B'));

    expect(() =>
      host.install(
        makePlugin('A', [], () => {
          throw new Error('boom');
        })
      )
    ).toThrowError('boom');

    expect(materials.has('A')).toBe(false);
    expect(materials.has('B')).toBe(true);
  });

  test('重复安装检测：同名插件抛 PLUGIN_CONFLICT', () => {
    const { host } = createHost();
    host.install(makePlugin('A'));
    expect(() => host.install(makePlugin('A'))).toThrowError(FormEngineError);
  });

  test('卸载 A 不影响 B 的资源', () => {
    const { host, materials } = createHost();
    host.install(makePlugin('B'));
    host.install(makePlugin('A', ['B']));

    host.uninstall('A');
    expect(materials.has('A')).toBe(false);
    expect(materials.has('B')).toBe(true);
  });

  test('多次卸载不会重复释放（幂等）', () => {
    const { host } = createHost();
    host.install(makePlugin('A'));

    host.uninstall('A');
    expect(() => host.uninstall('A')).not.toThrow();
    expect(host.list().find((p) => p.plugin.name === 'A')?.active).toBe(false);
  });

  test('依赖保护：A 仍依赖 B 时不允许卸载 B', () => {
    const { host, materials } = createHost();
    host.install(makePlugin('B'));
    host.install(makePlugin('A', ['B']));

    expect(() => host.uninstall('B')).toThrowError(FormEngineError);
    expect(materials.has('B')).toBe(true);
  });

  test('disposeAll 逆序卸载、幂等，dispose 生命周期（无参 dispose）被调用', () => {
    const { host } = createHost();
    const disposed: string[] = [];

    host.install({
      name: 'A',
      version: '1.0.0',
      install: () => undefined,
      dispose() {
        disposed.push('A');
      },
    });
    host.install({
      name: 'B',
      version: '1.0.0',
      install: () => undefined,
      dispose() {
        disposed.push('B');
      },
    });

    host.disposeAll();
    expect(disposed).toEqual(['B', 'A']); // 逆序
    expect(host.list().every((p) => !p.active)).toBe(true);

    // 幂等
    expect(() => host.disposeAll()).not.toThrow();
    expect(disposed).toEqual(['B', 'A']); // 不重复 dispose
  });

  test('install 返回 cleanup 函数在卸载时执行', () => {
    const { host } = createHost();
    const cleaned: string[] = [];

    host.install(
      makePlugin('A', [], () => {
        return () => cleaned.push('cleanup-A');
      })
    );

    expect(cleaned).toEqual([]);
    host.uninstall('A');
    expect(cleaned).toEqual(['cleanup-A']);
  });
});
