import type { ReadonlyComponentProps } from '@x-form-engine/types';

/** 把任意展示值渲染为文本：对象取 name/id，数组以「、」连接，空值给占位。 */
function toDisplayText(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => toDisplayText(item)).join('、');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.name === 'string' && record.name.length > 0) {
      return record.name;
    }
    return String(record.id ?? '');
  }
  return String(value);
}

/**
 * 默认只读展示：优先渲染快照冻结的 `snapshotValue`（displayValue），
 * 无快照时降级为原始 `value`。空值给占位符「—」。
 */
export function ReadonlyText({
  value,
  snapshotValue,
}: ReadonlyComponentProps): JSX.Element {
  const text =
    snapshotValue !== undefined ? toDisplayText(snapshotValue) : toDisplayText(value);
  return <span>{text === '' ? '—' : text}</span>;
}

export const readonlyComponents = {
  ReadonlyText,
} as const;
