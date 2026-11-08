import type { Platform } from './base';
import type { FormSnapshot } from './value';
import type { PermissionEnvelope } from './permission';

export interface ReadonlyRendererProps {
  schema: Record<string, unknown>;
  snapshot?: FormSnapshot;
  values?: Record<string, unknown>;
  locale?: string;
  platform?: Platform;
  permission?: PermissionEnvelope;
}

export interface ReadonlyDiagnostic {
  path: string;
  code: string;
  message: string;
}

export interface ReadonlyRenderContext {
  locale: string;
  platform: Platform;
  diagnostics: ReadonlyDiagnostic[];
}

export interface ReadonlyComponentProps<Value = unknown> {
  value: Value;
  snapshotValue?: unknown;
  schema: Record<string, unknown>;
  locale?: string;
  context: ReadonlyRenderContext;
}

export interface ReadonlyImplementations<Impl = unknown> {
  pc?: Impl;
  mobile?: Impl;
  default?: Impl;
}
