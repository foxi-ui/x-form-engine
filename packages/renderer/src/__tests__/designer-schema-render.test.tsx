import { fireEvent, render, screen } from '@testing-library/react';
import { basicComponents, basicDecorators } from '@x-form-engine/components';
import { createFormEngine } from '@x-form-engine/core';
import { FormEngineProvider, FormRenderer } from '../index';

/** 设计器（Designable）产物的典型形态：x-decorator + x-component-props。 */
const designerShapedSchema = {
  type: 'object',
  properties: {
    部门: {
      type: 'string',
      title: '部门',
      'x-decorator': 'FormItem',
      'x-component': 'Select',
      'x-component-props': {
        options: [{ label: '研发部', value: 'rd' }],
        placeholder: '请选择',
      },
    },
  },
};

test('独立 Runtime 渲染设计器形态 schema（含 FormItem 装饰器与 x-component-props）', async () => {
  const engine = createFormEngine({
    components: basicComponents,
    decorators: basicDecorators,
  });

  const { container } = render(
    <FormEngineProvider engine={engine}>
      <FormRenderer schema={designerShapedSchema} />
    </FormEngineProvider>
  );

  // @formily/antd 的 FormItem 使用 formily-item 前缀，而非 ant-form-item。
  const label = container.querySelector('.ant-formily-item-label');
  expect(label).toBeTruthy();
  expect(label?.textContent).toContain('部门');

  const select = container.querySelector('.ant-select');
  expect(select).toBeTruthy();

  // x-component-props.options 真实到达 Select：展开下拉能看到设计器配置的选项。
  fireEvent.mouseDown(container.querySelector('.ant-select-selector')!);
  expect(await screen.findByText('研发部')).toBeTruthy();
});
