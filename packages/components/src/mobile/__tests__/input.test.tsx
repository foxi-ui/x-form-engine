import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Input } from '../input';
import { Textarea } from '../textarea';

const SchemaField = createSchemaField({ components: { Input, Textarea } });

function renderSchema(form = createForm()) {
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            name: { type: 'string', 'x-component': 'Input', 'x-component-props': { placeholder: '姓名' } },
            note: { type: 'string', 'x-component': 'Textarea', 'x-component-props': { placeholder: '备注' } },
          },
        }}
      />
    </FormProvider>
  );
  return form;
}

test('Input 把输入写回 string 值', () => {
  const form = renderSchema();
  fireEvent.change(screen.getByPlaceholderText('姓名'), { target: { value: 'hello' } });
  expect(form.values.name).toBe('hello');
});

test('Textarea 把输入写回 string 值', () => {
  const form = renderSchema();
  fireEvent.change(screen.getByPlaceholderText('备注'), { target: { value: '多行' } });
  expect(form.values.note).toBe('多行');
});

test('Input / Textarea 透传 disabled 与 style', () => {
  render(
    <FormProvider form={createForm()}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            name: {
              type: 'string',
              'x-component': 'Input',
              'x-component-props': {
                placeholder: '姓名',
                disabled: true,
                style: { color: 'red' },
              },
            },
            note: {
              type: 'string',
              'x-component': 'Textarea',
              'x-component-props': {
                placeholder: '备注',
                disabled: true,
                style: { color: 'blue' },
              },
            },
          },
        }}
      />
    </FormProvider>
  );

  const input = screen.getByPlaceholderText('姓名');
  expect(input).toBeDisabled();
  expect(input.closest('.adm-input')).toHaveStyle({ color: 'rgb(255, 0, 0)' });

  const textarea = screen.getByPlaceholderText('备注');
  expect(textarea).toBeDisabled();
  expect(textarea.closest('.adm-text-area')).toHaveStyle({ color: 'rgb(0, 0, 255)' });
});
