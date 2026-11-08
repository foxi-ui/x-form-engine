import { Engine, GlobalRegistry, TreeNode } from '@designable/core';
import { basicComponents, basicDecorators } from '@x-form-engine/components';
import { createDesignerMaterials } from '../materials';
import { createEngineDesigner } from '../designer';

test('启动顺序正确：当前树非空且物料可被匹配', () => {
  // Operation 构造时已用 rootComponentName 预初始化树，只断言 componentName
  // 无法区分「setCurrentTree 被删除/提前」与「顺序正确」。这里记录每次
  // setCurrentTree 调用时 workspace 是否已存在，锁定 ensureWorkspace 先于它。
  const originalSetCurrentTree = Engine.prototype.setCurrentTree;
  const workspaceExistsAtSetTree: boolean[] = [];
  Engine.prototype.setCurrentTree = function (
    this: Engine,
    tree?: Parameters<Engine['setCurrentTree']>[0]
  ) {
    workspaceExistsAtSetTree.push(Boolean(this.workbench.currentWorkspace));
    return originalSetCurrentTree.call(this, tree);
  };

  try {
    const material = createDesignerMaterials(basicComponents);
    const engine = createEngineDesigner(material);
    expect(engine.getCurrentTree()?.componentName).toBe('Form');
    expect(workspaceExistsAtSetTree).toEqual([true]);
    const behaviors = GlobalRegistry.getDesignerBehaviors(new TreeNode({ componentName: 'Field', props: { 'x-component': 'Input' } }));
    expect(behaviors.map((b: any) => b.name)).toEqual(expect.arrayContaining(['Field', 'Input']));
  } finally {
    Engine.prototype.setCurrentTree = originalSetCurrentTree;
  }
});
