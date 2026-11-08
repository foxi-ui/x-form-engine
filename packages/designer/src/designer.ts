import { GlobalRegistry, TreeNode, createDesigner } from '@designable/core';
import type { IDesignerBehaviors } from '@designable/core';
import type { DesignerMaterialMap } from './materials';

/**
 * 启动引擎设计器，并完成 Designable 规定的引导顺序：
 *
 * 1. `createDesigner` 创建引擎；
 * 2. `ensureWorkspace` 先建立工作区——`setCurrentTree` 只写入当前工作区，
 *    缺少工作区时它是静默空操作（空画布）；
 * 3. 注册物料 Behavior（按 `extends` 依赖拓扑排序）；
 * 4. 最后设置根节点树。
 */
export function createEngineDesigner(
  materials: DesignerMaterialMap
): ReturnType<typeof createDesigner> {
  const engine = createDesigner({ rootComponentName: 'Form' });
  engine.workbench.ensureWorkspace({ id: 'default' });
  // 运行时按宿主数组遍历（`for...in` 取索引），但类型签名声明为 map，故做一次收窄。
  GlobalRegistry.registerDesignerBehaviors(
    Object.values(materials) as unknown as IDesignerBehaviors
  );
  engine.setCurrentTree(new TreeNode({ componentName: 'Form' }));
  return engine;
}
