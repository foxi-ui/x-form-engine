import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { render, screen } from '@testing-library/react';
import { DatePicker, formatDateValue, parseDateValue } from '../date-picker';

test('formatDateValue 按本地年月日输出，跨时区不偏移', () => {
  expect(formatDateValue(new Date(2026, 10, 8))).toBe('2026-11-08');
});

test('parseDateValue 只接受 Date 与 YYYY-MM-DD', () => {
  expect(parseDateValue('2026-11-08')?.getFullYear()).toBe(2026);
  expect(parseDateValue('2026-11-08')?.getMonth()).toBe(10);
  expect(parseDateValue('2026-11-08')?.getDate()).toBe(8);
  expect(parseDateValue('not-a-date')).toBeNull();
});

test('DatePicker 用已有字符串值渲染触发区', () => {
  const form = createForm();
  const SchemaField = createSchemaField({ components: { DatePicker } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            when: { type: 'string', 'x-component': 'DatePicker', default: '2026-11-08' },
          },
        }}
      />
    </FormProvider>
  );
  expect(screen.getByText('2026-11-08')).toBeInTheDocument();
});
