import { TreeNode, createBehavior, createDesigner, createResource } from '@designable/core';
import { transformToSchema, transformToTreeNode } from '@designable/formily-transformer';

test('Designable 依赖链在 designer 包内可运行', () => {
  const schema = { type: 'object', properties: { username: { type: 'string', title: '用户名', 'x-decorator': 'FormItem', 'x-component': 'Input' } } };
  const tree = transformToTreeNode({ schema });
  expect(tree.componentName).toBe('Form');
  expect(tree.children).toHaveLength(1);
  const back = transformToSchema(tree);
  expect((back.schema as any).properties.username['x-component']).toBe('Input');

  const behavior = createBehavior({ name: 'X', extends: ['Field'], selector: (n: TreeNode) => n.props?.['x-component'] === 'X' });
  expect(behavior[0].selector(new TreeNode({ componentName: 'Field', props: { 'x-component': 'X' } }))).toBe(true);
  const resource = createResource({ title: 'X', elements: [{ componentName: 'Field', props: { 'x-component': 'X' } }] });
  expect(resource[0].node!.isSourceNode).toBe(true);

  const engine = createDesigner({ rootComponentName: 'Form' });
  engine.workbench.ensureWorkspace({ id: 'smoke' });
  engine.setCurrentTree(tree);
  expect(engine.getCurrentTree()?.children).toHaveLength(1);
});
