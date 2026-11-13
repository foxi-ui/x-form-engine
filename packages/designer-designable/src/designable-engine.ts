import { GlobalRegistry, TreeNode, createDesigner } from '@designable/core';
import type { IDesignerBehaviors } from '@designable/core';
import type { DesignableMaterialMap } from './material-adapter';

/**
 * 启动 Designable 引擎并完成规定的引导顺序（旧 `packages/designer` 的
 * `createEngineDesigner` 迁移至此，Task 9.5）：
 *
 * 1. `createDesigner` 创建引擎；
 * 2. `ensureWorkspace` 先建立工作区；
 * 3. 注册物料 Behavior（按 `extends` 依赖拓扑排序）；
 * 4. 设置根节点树。
 */
export function createDesignableEngine(
  materials: DesignableMaterialMap
): ReturnType<typeof createDesigner> {
  const engine = createDesigner({ rootComponentName: 'Form' });
  engine.workbench.ensureWorkspace({ id: 'default' });
  GlobalRegistry.registerDesignerBehaviors(
    Object.values(materials) as unknown as IDesignerBehaviors
  );
  engine.setCurrentTree(new TreeNode({ componentName: 'Form' }));
  return engine;
}
