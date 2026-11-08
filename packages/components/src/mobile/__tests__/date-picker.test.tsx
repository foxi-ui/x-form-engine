import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { fireEvent, render, screen } from '@testing-library/react';
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

test('parseDateValue 对 Date 原样返回', () => {
  const date = new Date(2026, 10, 8);
  expect(parseDateValue(date)).toBe(date);
});

test('Date 与 YYYY-MM-DD 往返无损', () => {
  const parsed = parseDateValue('2026-11-08');
  expect(parsed).not.toBeNull();
  expect(formatDateValue(parsed as Date)).toBe('2026-11-08');
});

function renderDatePicker(schemaProps: Record<string, unknown>) {
  const form = createForm();
  const SchemaField = createSchemaField({ components: { DatePicker } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            when: { type: 'string', 'x-component': 'DatePicker', ...schemaProps },
          },
        }}
      />
    </FormProvider>
  );
  return form;
}

test('DatePicker 用已有字符串值渲染触发区', () => {
  const form = renderDatePicker({ default: '2026-11-08' });
  expect(screen.getByText('2026-11-08')).toBeInTheDocument();
  expect(form.values.when).toBe('2026-11-08');
});

test('DatePicker 无值时渲染默认或自定义 placeholder', () => {
  renderDatePicker({});
  expect(screen.getByText('请选择日期')).toBeInTheDocument();
});

test('DatePicker 无值时渲染 x-component-props 的 placeholder', () => {
  renderDatePicker({ 'x-component-props': { placeholder: '选择日期' } });
  expect(screen.getByText('选择日期')).toBeInTheDocument();
});

test('DatePicker 禁用时触发区不可点击且不打开选择器', () => {
  const form = renderDatePicker({
    'x-disabled': true,
    'x-component-props': { placeholder: '选择日期' },
  });
  const trigger = screen.getByText('选择日期').closest('.adm-list-item');
  expect(trigger).not.toBeNull();
  expect(trigger).toHaveClass('adm-list-item-disabled');
  fireEvent.click(trigger as Element);
  expect(document.querySelector('.adm-picker')).toBeNull();
  expect(form.values.when).toBeUndefined();
});
