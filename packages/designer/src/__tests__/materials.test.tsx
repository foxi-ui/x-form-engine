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

test('仅协议声明 options 的组件挂载选项编辑器', () => {
  const input = (material.Input.Behavior as any[]).find((b) => b.name === 'Input');
  const inputProps = input.designerProps.propsSchema.properties['x-component-props'].properties;
  expect(inputProps.options).toBeUndefined();

  const select = (material.Select.Behavior as any[]).find((b) => b.name === 'Select');
  const selectProps = select.designerProps.propsSchema.properties['x-component-props'].properties;
  expect(selectProps.options).toBeTruthy();
  expect(selectProps.options['x-component']).toBe('OptionsSetter');
});

test('propsSchema 按 JSON 类型为声明属性补出可渲染的设置组件', () => {
  const behavior = (material.Input.Behavior as any[]).find((b) => b.name === 'Input');
  const props = behavior.designerProps.propsSchema.properties['x-component-props'].properties;
  expect(props.placeholder['x-component']).toBe('Input');
});

test('Form 根节点保留可放置能力但不暴露表单级 propsSchema', () => {
  const behavior = (material.Form.Behavior as any[]).find((b) => b.name === 'Form');
  const designerProps = behavior.designerProps(new TreeNode({ componentName: 'Form' }));
  expect(designerProps.droppable).toBe(true);
  expect(designerProps.propsSchema).toBeUndefined();
});
