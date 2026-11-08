import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  Select,
  fromSelectorValue,
  normalizeSelectOptions,
  optionValueFromPicker,
  toPickerValue,
} from '../select';

const options = [
  { label: '研发部', value: 'rd' },
  { label: '产品部', value: 'pm' },
];

test('normalizeSelectOptions 支持 dataSource / options 与原始值数组', () => {
  expect(normalizeSelectOptions({ dataSource: options })).toEqual(options);
  expect(normalizeSelectOptions({ options: ['A', 'B'] })).toEqual([
    { label: 'A', value: 'A' },
    { label: 'B', value: 'B' },
  ]);
});

test('单选值与 Picker 数组互转', () => {
  expect(toPickerValue('rd')).toEqual(['rd']);
  expect(toPickerValue(null)).toEqual([]);
  expect(optionValueFromPicker(['rd'], options)).toBe('rd');
  expect(fromSelectorValue(['rd'], false)).toBe('rd');
});

test('多选值保持数组', () => {
  expect(fromSelectorValue(['rd', 'pm'], true)).toEqual(['rd', 'pm']);
});

test('单选 Select 用已有值展示 label', () => {
  const form = createForm({ initialValues: { dept: 'rd' } });
  const SchemaField = createSchemaField({ components: { Select } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            dept: { type: 'string', 'x-component': 'Select', enum: options },
          },
        }}
      />
    </FormProvider>
  );
  expect(screen.getByText('研发部')).toBeInTheDocument();
});

test('多选 Select 点击选项写回数组', () => {
  const form = createForm();
  const SchemaField = createSchemaField({ components: { Select } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            depts: {
              type: 'array',
              'x-component': 'Select',
              'x-component-props': { multiple: true },
              enum: options,
            },
          },
        }}
      />
    </FormProvider>
  );
  fireEvent.click(screen.getByText('研发部'));
  expect(form.values.depts).toEqual(['rd']);
});
