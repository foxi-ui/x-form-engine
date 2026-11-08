import { connect, mapProps } from '@formily/react';
import { Checkbox as AntdMobileCheckbox } from 'antd-mobile';
import { normalizeSelectOptions } from './select';

/**
 * 移动端 Checkbox（多选）。
 *
 * Value 为数组（`Array<string | number>`），与 PC `@formily/antd` 的
 * `Checkbox.Group` 保持一致。选项来源复用 `normalizeSelectOptions`：
 * Formily 把 schema 的 `enum` 编译到 `field.dataSource`，因此这里使用与
 * Select 相同的 `mapProps({ dataSource: 'options' })` 接线。
 */

type CheckboxValueLike = string | number;

type CheckboxFieldProps = {
  value?: unknown;
  onChange?: (value: CheckboxValueLike[]) => void;
  dataSource?: unknown;
  options?: unknown;
} & Record<string, unknown>;

/** 数组值保留其中的标量项；非数组或非法项直接丢弃，避免污染字段值。 */
function toCheckboxValue(value: unknown): CheckboxValueLike[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is CheckboxValueLike =>
      typeof item === 'string' || typeof item === 'number'
  );
}

function CheckboxWidget({
  value,
  onChange,
  dataSource,
  options,
  ...rest
}: CheckboxFieldProps) {
  const items = normalizeSelectOptions({ dataSource, options });

  return (
    <AntdMobileCheckbox.Group
      value={toCheckboxValue(value)}
      onChange={(next) => onChange?.(next)}
      {...rest}
    >
      {items.map((option) => (
        <AntdMobileCheckbox key={String(option.value)} value={option.value}>
          {option.label}
        </AntdMobileCheckbox>
      ))}
    </AntdMobileCheckbox.Group>
  );
}

export const Checkbox = connect(
  CheckboxWidget,
  mapProps({ dataSource: 'options' })
);
