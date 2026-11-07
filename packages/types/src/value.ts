import type { ComponentName, FieldPath } from './base';

export interface FormSubmitResult {
  values: Record<string, unknown>;
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
  title?: string;
  value: unknown;
  displayValue?: unknown;
  options?: Array<{ label: string; value: unknown }>;
  metadata?: Record<string, unknown>;
}
