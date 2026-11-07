import type { FormSubmitResult } from '@x-form-engine/types';

export interface FormRendererProps {
  schema: Record<string, unknown>;
  mode?: 'edit' | 'preview';
  platform?: 'pc' | 'mobile';
  initialValues?: Record<string, unknown>;
  disabled?: boolean;
  readOnly?: boolean;
  scope?: Record<string, unknown>;
  onValuesChange?: (values: Record<string, unknown>) => void;
}

export interface FormRendererInstance {
  getValues(): Record<string, unknown>;
  setValues(values: Record<string, unknown>): void;
  validate(): Promise<void>;
  reset(): void;
  submit(): Promise<FormSubmitResult>;
  destroy(): void;
}
