import type { ComponentName, FieldPath } from './base';

/** 当前引擎冻结的快照协议版本。 */
export const SNAPSHOT_VERSION = '1.0.0';

/** 业务表单值：以稳定字段路径为 key 的普通对象。 */
export type FormValue = Record<string, unknown>;

export interface FormSubmitResult {
  values: FormValue;
  snapshot: FormSnapshot;
  schemaId?: string;
  schemaVersion?: number;
}

export interface FormSnapshot {
  snapshotVersion: string;
  schemaId: string;
  schemaVersion: number;
  createdAt: string;
  locale?: string;
  fields: Record<string, FieldSnapshot>;
}

export interface FieldSnapshot {
  path: FieldPath;
  component: ComponentName;
  componentVersion?: string;
  /** 稳定字段身份（用字段 name 拼接，与用下标访问的 `path` 分离）。 */
  fieldId?: string;
  title?: string;
  value: unknown;
  displayValue?: unknown;
  options?: Array<{ label: string; value: unknown }>;
  metadata?: Record<string, unknown>;
  /** 数组字段的行级快照：itemId 保证行身份稳定，不错位。 */
  items?: RepeatItemSnapshot[];
}

/** 重复数组行的稳定快照。 */
export interface RepeatItemSnapshot {
  itemId: string;
  fields: Record<string, FieldSnapshot>;
}

/** 前端生成的候选快照（展示信息非权威，仅供后端校验补全）。 */
export type CandidateSnapshot = FormSnapshot;

/** 后端校验、补全后的权威历史快照。 */
export type CanonicalSnapshot = FormSnapshot;

export interface NormalizeWarning {
  path: FieldPath;
  code: string;
  message: string;
}

export interface NormalizeError {
  path: FieldPath;
  code: string;
  message: string;
}

export interface NormalizeResult<T = FormValue> {
  value: T;
  warnings: NormalizeWarning[];
  errors: NormalizeError[];
}
