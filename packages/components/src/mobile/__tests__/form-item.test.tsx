import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { render, screen, waitFor } from '@testing-library/react';
import { FormItem } from '../form-item';

function renderForm() {
  const form = createForm();
  const SchemaField = createSchemaField({ components: { FormItem, Input: () => <input aria-label="input" /> } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            name: {
              type: 'string',
              title: '姓名',
              description: '请填写真实姓名',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-validator': [{ required: true, message: '请输入姓名' }],
            },
          },
        }}
      />
    </FormProvider>
  );
  return form;
}

test('FormItem 渲染标题与描述', () => {
  renderForm();
  expect(screen.getByText('姓名')).toBeInTheDocument();
  expect(screen.getByText('请填写真实姓名')).toBeInTheDocument();
});

test('校验失败时 FormItem 展示错误文案', async () => {
  const form = renderForm();
  await expect(form.validate()).rejects.toBeTruthy();
  await waitFor(() => expect(screen.getByText('请输入姓名')).toBeInTheDocument());
});
