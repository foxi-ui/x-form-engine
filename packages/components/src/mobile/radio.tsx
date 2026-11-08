import { connect, mapProps } from '@formily/react';
import { Radio as AntdMobileRadio } from 'antd-mobile';
import { normalizeSelectOptions } from './select';

/**
 * 移动端 Radio（单选）。
 *
 * Value 为标量（`string | number`），与 PC `@formily/antd` 的
 * `Radio.Group` 保持一致。选项来源复用 `normalizeSelectOptions`：
 * Formily 把 schema 的 `enum` 编译到 `field.dataSource`，因此这里使用与
 * Select 相同的 `mapProps({ dataSource: 'options' })` 接线。
 */

type RadioValueLike = string | number;

type RadioFieldProps = {
  value?: unknown;
  onChange?: (value: RadioValueLike) => void;
  dataSource?: unknown;
  options?: unknown;
} & Record<string, unknown>;

/** 标量值原样保留；数组 / 对象 / 空值等非 `RadioValue` 统一回落为 `null`。 */
function toRadioValue(value: unknown): RadioValueLike | null {
  if (typeof value === 'string' || typeof value === 'number') return value;
  return null;
}

function RadioWidget({
  value,
  onChange,
  dataSource,
  options,
  ...rest
}: RadioFieldProps) {
  const items = normalizeSelectOptions({ dataSource, options });

  return (
    <AntdMobileRadio.Group
      value={toRadioValue(value)}
      onChange={(next) => onChange?.(next)}
      {...rest}
    >
      {items.map((option) => (
        <AntdMobileRadio key={String(option.value)} value={option.value}>
          {option.label}
        </AntdMobileRadio>
      ))}
    </AntdMobileRadio.Group>
  );
}

export const Radio = connect(RadioWidget, mapProps({ dataSource: 'options' }));
