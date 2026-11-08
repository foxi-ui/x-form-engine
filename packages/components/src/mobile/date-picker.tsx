import { connect, mapProps } from '@formily/react';
import { DatePicker as AntdMobileDatePicker, List } from 'antd-mobile';

/**
 * Formily 侧 DatePicker 字段的值类型为 `'YYYY-MM-DD'` 字符串，而
 * antd-mobile `DatePicker` 使用 `Date` 对象。这里在 `connect` 的
 * `mapProps` 中做双向映射，并渲染 `List.Item` 作为触发区。
 */
type DatePickerFieldProps = {
  value?: unknown;
  onChange?: (value: string) => void;
  placeholder?: string;
};

/** 按本地年月日输出 `YYYY-MM-DD`；禁止用 `toISOString()`，避免时区偏移。 */
export function formatDateValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** `Date` 原样返回；严格 `YYYY-MM-DD` 字符串转本地日期；其余返回 null。 */
export function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value !== 'string' || !DATE_STRING_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 移动端日期选择：`DatePicker` 是弹出层组件，`List.Item` 作为触发区，
 * 点击后调用 `actions.open()` 打开选择器，确认后把 `Date` 写回为
 * `'YYYY-MM-DD'` 字符串。
 */
export const DatePicker = connect(
  AntdMobileDatePicker,
  mapProps((props) => {
    const { value, onChange, placeholder } = props as typeof props & DatePickerFieldProps;
    return {
      ...props,
      value: parseDateValue(value),
      onConfirm: (date: Date) => onChange?.(formatDateValue(date)),
      children: (date: Date | null, actions: { open: () => void }) => (
        <List.Item clickable onClick={() => actions.open()}>
          {date ? formatDateValue(date) : placeholder ?? '请选择日期'}
        </List.Item>
      ),
    };
  })
);
