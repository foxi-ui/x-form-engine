import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NumberInput, parseNumberInput } from '../number';

test('parseNumberInput 解析数字与空值', () => {
  expect(parseNumberInput('42')).toBe(42);
  expect(parseNumberInput(' 3.5 ')).toBe(3.5);
  expect(parseNumberInput('')).toBeNull();
  expect(parseNumberInput('abc')).toBeNull();
});

test('NumberInput 写回 number', () => {
  const form = createForm();
  const SchemaField = createSchemaField({ components: { Number: NumberInput } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            days: { type: 'number', 'x-component': 'Number', 'x-component-props': { placeholder: '天数' } },
          },
        }}
      />
    </FormProvider>
  );
  fireEvent.change(screen.getByPlaceholderText('天数'), { target: { value: '42' } });
  expect(form.values.days).toBe(42);
});
