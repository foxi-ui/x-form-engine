import { GlobalRegistry, TreeNode } from '@designable/core';
import { basicComponents, basicDecorators } from '@x-form-engine/components';
import { createDesignerMaterials } from '../materials';
import { createEngineDesigner } from '../designer';

test('启动顺序正确：当前树非空且物料可被匹配', () => {
  const material = createDesignerMaterials(basicComponents);
  const engine = createEngineDesigner(material);
  expect(engine.getCurrentTree()?.componentName).toBe('Form');
  const behaviors = GlobalRegistry.getDesignerBehaviors(new TreeNode({ componentName: 'Field', props: { 'x-component': 'Input' } }));
  expect(behaviors.map((b: any) => b.name)).toEqual(expect.arrayContaining(['Field', 'Input']));
});
