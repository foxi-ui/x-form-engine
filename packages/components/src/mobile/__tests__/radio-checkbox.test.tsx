import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Checkbox } from '../checkbox';
import { Radio } from '../radio';

const options = [
  { label: '是', value: 'yes' },
  { label: '否', value: 'no' },
];

test('Radio 点击后写回标量', () => {
  const form = createForm();
  const SchemaField = createSchemaField({ components: { Radio } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            urgent: { type: 'string', 'x-component': 'Radio', enum: options },
          },
        }}
      />
    </FormProvider>
  );
  fireEvent.click(screen.getByText('是'));
  expect(form.values.urgent).toBe('yes');
});

test('Checkbox 点击多个后写回数组', () => {
  const form = createForm();
  const SchemaField = createSchemaField({ components: { Checkbox } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            tags: { type: 'array', 'x-component': 'Checkbox', enum: options },
          },
        }}
      />
    </FormProvider>
  );
  fireEvent.click(screen.getByText('是'));
  fireEvent.click(screen.getByText('否'));
  expect(form.values.tags).toEqual(['yes', 'no']);
});
