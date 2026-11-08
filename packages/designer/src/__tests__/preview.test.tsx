import { createFormEngine } from '@x-form-engine/core';
import { basicComponents, basicDecorators } from '@x-form-engine/components';
import { render } from '@testing-library/react';
import { DesignerPreview } from '../preview';

test('DesignerPreview 走 formily 编译路径渲染出真实组件与标签', () => {
  const engine = createFormEngine({ components: basicComponents, decorators: basicDecorators });
  const { container } = render(
    <DesignerPreview
      engine={engine}
      schema={{
        type: 'object',
        properties: {
          a: {
            type: 'string',
            title: '姓名',
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            'x-component-props': { placeholder: '请输入' },
          },
        },
      }}
    />
  );
  expect(container.querySelector('.ant-formily-item-label')).toBeTruthy();
  expect(container.querySelector('input[placeholder="请输入"]')).toBeTruthy();
});
