import { TreeNode } from '@designable/core';
import { basicComponents } from '@x-form-engine/components';
import { createDesignerMaterials } from '../materials';

const material = createDesignerMaterials(basicComponents);

test('host map 含基础宿主与 7 个组件宿主', () => {
  expect(Object.keys(material)).toEqual(
    expect.arrayContaining([
      'Field',
      'Form',
      'FormItem',
      'Input',
      'Textarea',
      'Number',
      'Select',
      'Radio',
      'Checkbox',
      'DatePicker',
    ])
  );
});

test('Input 宿主 Behavior 可按 x-component 匹配且 extends Field', () => {
  const behavior = (material.Input.Behavior as any[]).find((b) => b.name === 'Input');
  expect(behavior.extends).toContain('Field');
  expect(
    behavior.selector(new TreeNode({ componentName: 'Field', props: { 'x-component': 'Input' } }))
  ).toBe(true);
  expect(
    behavior.selector(new TreeNode({ componentName: 'Field', props: { 'x-component': 'Select' } }))
  ).toBe(false);
});

test('Input 宿主 Resource 初始节点为 Field 且带 FormItem 装饰器', () => {
  const resource = (material.Input.Resource as any[])[0];
  expect(resource.node.isSourceNode).toBe(true);
  const el = resource.node.children[0];
  expect(el.componentName).toBe('Field');
  expect(el.props['x-component']).toBe('Input');
  expect(el.props['x-decorator']).toBe('FormItem');
});

test('propsSchema 字段级属性在顶层、组件属性在 x-component-props', () => {
  const behavior = (material.Select.Behavior as any[]).find((b) => b.name === 'Select');
  const props = behavior.designerProps.propsSchema.properties;
  expect(props.title).toBeTruthy();
  expect(props.required).toBeTruthy();
  expect(props.name).toBeTruthy();
  expect(props['x-component-props'].properties.options).toBeTruthy(); // options 在 x-component-props 内
  expect(props.options).toBeUndefined(); // 不得泄漏到顶层
});
