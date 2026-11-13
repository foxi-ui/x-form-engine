import { Button, Input, InputNumber, Radio, Select, Switch } from 'antd';
import type { SetterProps } from '@x-form-engine/types';
import { useState } from 'react';
import type { ComponentType } from 'react';

/** Setter 选项（SelectSetter / RadioSetter 使用）。 */
export interface SetterOption {
  label: string;
  value: string | number;
}

/** 字符串 Setter（antd Input）。 */
export const StringSetter: ComponentType<SetterProps<string>> = ({
  value,
  onChange,
  disabled,
  readonly,
}) => (
  <Input
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    readOnly={readonly}
  />
);

/** 数字 Setter（antd InputNumber）。 */
export const NumberSetter: ComponentType<SetterProps<number>> = ({
  value,
  onChange,
  disabled,
  readonly,
}) => (
  <InputNumber
    value={value as number}
    onChange={(v) => onChange(v as number)}
    disabled={disabled}
    readOnly={readonly}
  />
);

/** 布尔 Setter（antd Switch）。 */
export const BooleanSetter: ComponentType<SetterProps<boolean>> = ({
  value,
  onChange,
  disabled,
  readonly,
}) => (
  <Switch
    checked={Boolean(value)}
    onChange={(v) => onChange(v)}
    disabled={disabled || readonly}
  />
);

/** 下拉 Setter（antd Select）。 */
export const SelectSetter: ComponentType<SetterProps<unknown> & { options?: SetterOption[] }> = ({
  value,
  onChange,
  disabled,
  readonly,
  options = [],
}) => (
  <Select
    value={value as string | number}
    onChange={(v) => onChange(v)}
    disabled={disabled || readonly}
    options={options}
  />
);

/** 单选 Setter（antd Radio.Group）。 */
export const RadioSetter: ComponentType<SetterProps<unknown> & { options?: SetterOption[] }> = ({
  value,
  onChange,
  disabled,
  readonly,
  options = [],
}) => (
  <Radio.Group
    value={value as string | number}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled || readonly}
    options={options}
  />
);

/** JSON Setter（antd Input.TextArea，非法 JSON 不回调、不崩溃）。 */
export const JSONSetter: ComponentType<SetterProps<unknown>> = ({
  value,
  onChange,
  disabled,
  readonly,
}) => {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));

  return (
    <Input.TextArea
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        try {
          onChange(JSON.parse(next));
        } catch {
          // 非法 JSON：保留文本，不回调。
        }
      }}
      disabled={disabled}
      readOnly={readonly}
    />
  );
};

/** 数组 Setter（字符串数组增删）。 */
export const ArraySetter: ComponentType<SetterProps<string[]>> = ({
  value,
  onChange,
  disabled,
  readonly,
}) => {
  const items = Array.isArray(value) ? value : [];

  return (
    <div>
      {items.map((item, index) => (
        <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Input
            aria-label={`数组项 ${index}`}
            value={String(item ?? '')}
            onChange={(e) => onChange(items.map((x, i) => (i === index ? e.target.value : x)))}
            disabled={disabled}
          />
          <Button
            aria-label={`删除 ${index}`}
            danger
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            disabled={disabled || readonly}
          >
            删除
          </Button>
        </div>
      ))}
      <Button
        type="dashed"
        block
        onClick={() => onChange([...items, ''])}
        disabled={disabled || readonly}
      >
        添加
      </Button>
    </div>
  );
};
