import { FormEngineError } from '@x-form-engine/types';
import type {
  DesignerAdapter,
  DesignerMaterialDefinition,
  DesignerPlugin,
  DesignerWorkspace,
  SetterDefinition,
} from '@x-form-engine/types';
import { createDesigner } from './engine';

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

function makeSetter(): SetterDefinition {
  return { name: 'StringSetter', version: '1.0.0', component: {} };
}

function makePlugin(name: string): DesignerPlugin {
  return {
    name,
    version: '1.0.0',
    install(ctx) {
      ctx.materials.register(makeMaterial(name));
    },
  };
}

function makeAdapter(): DesignerAdapter {
  return {
    name: 'designable',
    version: '1.0.0',
    createWorkspace: () => ({}) as DesignerWorkspace,
  };
}

describe('createDesigner（Task 4.6）', () => {
  test('不装 Adapter 可实例化，并注册 Material / Setter', () => {
    const designer = createDesigner();
    designer.materials.register(makeMaterial('input'));
    designer.setters.register(makeSetter());

    expect(designer.materials.has('input')).toBe(true);
    expect(designer.setters.has('StringSetter')).toBe(true);
  });

  test('注入初始 materials/setters 与 plugins，并安装插件', () => {
    const designer = createDesigner({
      materials: [makeMaterial('input')],
      setters: [makeSetter()],
      plugins: [makePlugin('B')],
    });

    expect(designer.materials.has('input')).toBe(true);
    expect(designer.setters.has('StringSetter')).toBe(true);
    expect(designer.materials.has('B')).toBe(true);
    expect(designer.plugins.list()).toHaveLength(1);
    expect(designer.plugins.list()[0].active).toBe(true);
  });

  test('use(adapter) 存储 adapter 且不抛错', () => {
    const designer = createDesigner();
    expect(() => designer.use(makeAdapter())).not.toThrow();
  });

  test('destroy 幂等并释放插件资源', () => {
    const designer = createDesigner({ plugins: [makePlugin('A')] });
    expect(designer.materials.has('A')).toBe(true);

    designer.destroy();
    expect(designer.plugins.list().every((p) => !p.active)).toBe(true);
    expect(designer.materials.has('A')).toBe(false);

    expect(() => designer.destroy()).not.toThrow();
  });

  test('destroy 后 use 抛 ENGINE_DISPOSED', () => {
    const designer = createDesigner();
    designer.destroy();
    expect(() => designer.use(makeAdapter())).toThrowError(FormEngineError);
  });

  test('不暴露内部 Map：getAll() 返回副本，外部修改不影响注册表', () => {
    const designer = createDesigner();
    designer.materials.register(makeMaterial('input'));

    const all = designer.materials.getAll();
    all.pop();
    expect(designer.materials.getAll()).toHaveLength(1);
    expect(designer.materials.has('input')).toBe(true);
  });
});
