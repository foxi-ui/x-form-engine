import { createFormEngine } from '@x-form-engine/core';
import { basicComponents, basicDecorators } from '@x-form-engine/components';
import { createForm } from '@formily/core';
import { FormProvider } from '@formily/react';
import { render } from '@testing-library/react';
import { createEngineSchemaField } from '../index';

test('x-decorator: FormItem 在 SchemaField 内渲染出标签', () => {
  const engine = createFormEngine({
    components: basicComponents,
    decorators: basicDecorators,
  });
  const { SchemaField } = createEngineSchemaField(engine, 'pc');
  const form = createForm();
  const { container } = render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            a: {
              type: 'string',
              title: '姓名',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
            },
          },
        }}
      />
    </FormProvider>
  );
  expect(container.querySelector('.ant-formily-item-label')).toBeTruthy();
});
