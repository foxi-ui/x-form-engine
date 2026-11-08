import type { FieldPath } from './base';

export interface FormatterContext {
  path: FieldPath;
  locale: string;
  /** 字段 schema（含 options / format 等静态规则）。 */
  schema?: Record<string, unknown>;
  /** 快照中的展示信息（优先使用，冻结展示）。 */
  snapshotValue?: unknown;
}

/**
 * Formatter：把字段值渲染为展示文本。
 * 返回 null 表示「不处理该值」，注册表继续向后匹配。
 */
export type Formatter = (
  value: unknown,
  context: FormatterContext
) => string | null;
