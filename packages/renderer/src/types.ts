import type { FormSubmitResult, PermissionEnvelope } from '@x-form-engine/types';

export interface FormRendererProps {
  schema: Record<string, unknown>;
  mode?: 'edit' | 'preview';
  platform?: 'pc' | 'mobile';
  initialValues?: Record<string, unknown>;
  disabled?: boolean;
  readOnly?: boolean;
  scope?: Record<string, unknown>;
  onValuesChange?: (values: Record<string, unknown>) => void;
  /** 快照信封：schemaId / schemaVersion / locale（缺省时用空值兜底）。 */
  schemaId?: string;
  schemaVersion?: number;
  locale?: string;
  /** 后端签发的权限信封：提交前剔除无写权限字段（可选）。 */
  permission?: PermissionEnvelope;
}

export interface FormRendererInstance {
  getValues(): Record<string, unknown>;
  setValues(values: Record<string, unknown>): void;
  validate(): Promise<void>;
  reset(): void;
  submit(): Promise<FormSubmitResult>;
  destroy(): void;
}
