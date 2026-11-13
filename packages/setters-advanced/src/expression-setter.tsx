import { Input } from 'antd';
import type { SetterContext, SetterProps, ValidationResult } from '@x-form-engine/types';
import type { ComponentType } from 'react';

/**
 * 高级 Setter：表达式编辑器（Task 8.1）。
 *
 * 受控编辑表达式字符串；`validateExpression` 校验 `{{ }}` 平衡。UI 无关于
 * Designable，只通过 `SetterProps` 的 `value` / `onChange` 交互。
 */
export const ExpressionSetter: ComponentType<SetterProps<string>> = ({
  value,
  onChange,
  disabled,
  readonly,
}) => (
  <Input.TextArea
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    readOnly={readonly}
    placeholder="{{ $self.value }}"
    autoSize={{ minRows: 2 }}
  />
);

/** 校验表达式：必须是字符串，且 `{{ }}` 成对。 */
export function validateExpression(
  value: unknown,
  _context: SetterContext
): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, message: '表达式必须是字符串' };
  }
  const open = (value.match(/{{/g) ?? []).length;
  const close = (value.match(/}}/g) ?? []).length;
  if (open !== close) {
    return { valid: false, message: '表达式 {{ }} 不平衡' };
  }
  return { valid: true };
}
