import { Button, Input } from 'antd';
import type { ComponentType } from 'react';

export interface OptionItem {
  label: string;
  value: unknown;
}

export interface OptionsSetterProps {
  value?: OptionItem[];
  onChange?: (value: OptionItem[]) => void;
}

function toInputValue(value: unknown): string {
  return value == null ? '' : String(value);
}

/**
 * Designable 受控 Setter：编辑 `{ label, value }[]`。
 *
 * 遵循 `value` / `onChange` 受控协议，自身不持有状态；任何变更都以
 * 新数组回写，且不修改传入的 `value`。`value` 为 `unknown`，编辑后
 * 该项会变为字符串，未被编辑的项保持原值。
 */
export const OptionsSetter: ComponentType<OptionsSetterProps> = ({ value, onChange }) => {
  const options = Array.isArray(value) ? value : [];

  const emit = (next: OptionItem[]) => {
    onChange?.(next);
  };

  const updateItem = (index: number, key: 'label' | 'value', next: string) => {
    emit(options.map((item, i) => (i === index ? { ...item, [key]: next } : item)));
  };

  return (
    <div className="x-options-setter">
      {options.map((item, index) => (
        <div
          key={index}
          className="x-options-setter-row"
          style={{ display: 'flex', gap: 8, marginBottom: 8 }}
        >
          <Input
            aria-label={`选项 ${index + 1} 标签`}
            placeholder="标签"
            value={toInputValue(item.label)}
            onChange={(event) => updateItem(index, 'label', event.target.value)}
          />
          <Input
            aria-label={`选项 ${index + 1} 值`}
            placeholder="值"
            value={toInputValue(item.value)}
            onChange={(event) => updateItem(index, 'value', event.target.value)}
          />
          <Button
            aria-label={`删除选项 ${index + 1}`}
            danger
            onClick={() => emit(options.filter((_, i) => i !== index))}
          >
            删除
          </Button>
        </div>
      ))}
      <Button type="dashed" block onClick={() => emit([...options, { label: '', value: '' }])}>
        添加选项
      </Button>
    </div>
  );
};
