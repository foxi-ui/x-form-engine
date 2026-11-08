import { connect, mapProps } from '@formily/react';
import { List, Picker, Selector } from 'antd-mobile';
import { useState } from 'react';

/**
 * 移动端 Select（单选 / 多选）。
 *
 * 单选复用 antd-mobile `Picker`（单列），以 `List.Item clickable` 作为
 * 弹出触发区；多选使用 antd-mobile `Selector multiple`。两条分支都通过
 * `connect` 接入 Formily，Value 结构与 PC 一致：单选框为标量，多选框为数组。
 */

export interface MobileSelectOption {
  label: string;
  value: string | number;
}

/** `value` 统一收窄为 `string | number`，其他类型走 `String()`。 */
function narrowOptionValue(raw: unknown): string | number {
  return typeof raw === 'string' || typeof raw === 'number' ? raw : String(raw);
}

/**
 * 统一选项来源：优先 `dataSource`（Formily 的 `enum`），其次
 * `x-component-props.options`。对象选项取 `label` / `value` 并互相兜底，
 * 原始值选项的 label 与 value 同为 `String(item)`。
 */
export function normalizeSelectOptions(props: {
  dataSource?: unknown;
  options?: unknown;
}): MobileSelectOption[] {
  const source = Array.isArray(props.dataSource)
    ? props.dataSource
    : Array.isArray(props.options)
      ? props.options
      : [];

  return source.map((item): MobileSelectOption => {
    if (item !== null && typeof item === 'object') {
      const record = item as { label?: unknown; value?: unknown };
      const labelRaw = record.label !== undefined ? record.label : record.value;
      const valueRaw = record.value !== undefined ? record.value : record.label;
      return {
        label: labelRaw === undefined ? '' : String(labelRaw),
        value: valueRaw === undefined ? '' : narrowOptionValue(valueRaw),
      };
    }
    return { label: String(item), value: narrowOptionValue(item) };
  });
}

/** 单选框值 → Picker 的单列数组；空值给空数组，避免 Picker 误选首项。 */
export function toPickerValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
}

/**
 * Picker 的单列数组 → 单选框原值。匹配选项时返回原始 `value`（保留
 * number 类型），未匹配则回退为 Picker 给出的字符串。
 */
export function optionValueFromPicker(
  values: string[],
  options: MobileSelectOption[]
): unknown {
  const picked = values[0];
  if (picked === undefined) return undefined;
  const matched = options.find((option) => String(option.value) === picked);
  return matched ? matched.value : picked;
}

/** 多选框值 → Selector 数组；单值包装为数组，空值给空数组。 */
export function toSelectorValue(value: unknown): Array<string | number> {
  if (Array.isArray(value)) return value.map((item) => narrowOptionValue(item));
  if (value === null || value === undefined || value === '') return [];
  return [narrowOptionValue(value)];
}

/**
 * Selector 数组 → Formily 值：多选保持数组，单选取首项（空数组为
 * `undefined`）。这里不做数组/标量的隐式互相转换。
 */
export function fromSelectorValue(
  values: Array<string | number>,
  multiple: boolean
): unknown {
  if (multiple) return [...values];
  return values[0];
}

type SelectFieldProps = {
  value?: unknown;
  onChange?: (value: unknown) => void;
  multiple?: boolean;
  placeholder?: string;
  dataSource?: unknown;
  options?: unknown;
};

type SingleSelectProps = {
  value: unknown;
  onChange?: (value: unknown) => void;
  options: MobileSelectOption[];
  placeholder?: string;
} & Record<string, unknown>;

/** 单选触发区 + Picker 弹出层。 */
function SingleSelect({
  value,
  onChange,
  options,
  placeholder,
  ...rest
}: SingleSelectProps) {
  const [visible, setVisible] = useState(false);
  const pickerValue = toPickerValue(value);
  const selected = options.find(
    (option) => String(option.value) === pickerValue[0]
  );

  return (
    <>
      <List.Item clickable onClick={() => setVisible(true)} {...rest}>
        {selected?.label ?? placeholder ?? '请选择'}
      </List.Item>
      <Picker
        visible={visible}
        columns={[options]}
        value={pickerValue}
        onClose={() => setVisible(false)}
        onConfirm={(values) => {
          onChange?.(optionValueFromPicker(values as string[], options));
          setVisible(false);
        }}
      />
    </>
  );
}

function SelectWidget(props: SelectFieldProps) {
  const {
    value,
    onChange,
    multiple = false,
    placeholder,
    dataSource,
    options,
    ...rest
  } = props;
  const normalizedOptions = normalizeSelectOptions({ dataSource, options });

  if (multiple) {
    return (
      <Selector
        multiple
        options={normalizedOptions}
        value={toSelectorValue(value)}
        onChange={(values) => onChange?.(fromSelectorValue(values, true))}
        {...rest}
      />
    );
  }

  return (
    <SingleSelect
      value={value}
      onChange={onChange}
      options={normalizedOptions}
      placeholder={placeholder}
      {...rest}
    />
  );
}

/**
 * Formily 把 schema 的 `enum` 编译到 `field.dataSource`，而 `ReactiveField`
 * 只会传 `x-component-props`；因此这里把 `dataSource` 映射为 `options`，
 * 与 `@formily/antd` Select 的接线方式保持一致。
 */
export const Select = connect(
  SelectWidget,
  mapProps({ dataSource: 'options' })
);
