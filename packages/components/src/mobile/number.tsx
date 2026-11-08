import { connect, mapProps } from '@formily/react';
import { Input as AntdMobileInput } from 'antd-mobile';

/**
 * Formily 侧 Number 字段的值类型为 `number | null`，而 antd-mobile `Input`
 * 只接受字符串，因此这里在 `connect` 的 `mapProps` 中做双向映射：
 * 渲染前把 number 格式化为字符串，输入后再解析回 number。
 */
type NumberFieldProps = {
  value?: unknown;
  onChange?: (value: number | null) => void;
};

/** 把输入框原始字符串解析为 number，空串或非有限数值返回 null。 */
export function parseNumberInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** 把 Formily 的 number 值格式化为输入框字符串，非有限数值显示为空。 */
export function formatNumberInput(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

/**
 * 移动端数字输入：显式使用 `type="number"`，其余 `x-component-props`
 * 原样透传，移动端不认识的 PC 专属 props 由 antd-mobile 静默忽略。
 */
export const NumberInput = connect(
  AntdMobileInput,
  mapProps((props) => {
    const { value, onChange } = props as typeof props & NumberFieldProps;
    return {
      ...props,
      type: 'number',
      value: formatNumberInput(value),
      onChange: (raw: string) => onChange?.(parseNumberInput(raw)),
    };
  })
);
