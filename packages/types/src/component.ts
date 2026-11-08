import type { ComponentName, Platform } from './base';
import type { ReadonlyImplementations } from './readonly';

export interface ComponentCapabilities {
  editable: boolean;
  readonly: boolean;
  mobile: boolean;
  datasource?: boolean;
  validation?: boolean;
  snapshot?: boolean;
  children?: boolean;
}

export interface ComponentMeta {
  title: string;
  description?: string;
  category?: string;
  icon?: string;
  tags?: string[];
  deprecated?: boolean;
}

export interface ComponentSchemaDefinition {
  type: 'object';
  properties?: Record<string, unknown>;
  default?: Record<string, unknown>;
}

export interface AdapterContext {
  schema: Record<string, unknown>;
  path: string;
  locale: string;
  displayState?: Record<string, unknown>;
  /** 记录一个可恢复的规范化告警（不阻断提交）。 */
  warn?(code: string, message: string): void;
  /** 记录一个不可恢复的规范化错误（阻断提交）。 */
  error?(code: string, message: string): void;
}

export interface ComponentAdapter<Value = unknown, Snapshot = unknown> {
  normalizeValue?(value: unknown, context: AdapterContext): Value;
  serializeValue?(value: Value, context: AdapterContext): unknown;
  createSnapshot?(value: Value, context: AdapterContext): Snapshot;
  restoreSnapshot?(snapshot: Snapshot, context: AdapterContext): Value;
}

export interface ComponentProtocolDefinition {
  name: ComponentName;
  version: string;
  meta: ComponentMeta;
  capabilities: ComponentCapabilities;
  schema: ComponentSchemaDefinition;
  adapter?: ComponentAdapter;
}

export interface ComponentImplementations<Impl = unknown> {
  pc?: Impl;
  mobile?: Impl;
}

export interface ComponentBinding<Impl = unknown, ReadonlyImpl = unknown> {
  protocol: ComponentProtocolDefinition;
  implementations: ComponentImplementations<Impl>;
  /** 只读渲染实现：按 当前平台 → default → Formatter → Unknown 兜底解析。 */
  readonly?: ReadonlyImplementations<ReadonlyImpl>;
}

/** mobile 平台缺失实现时，字段/装饰器回退到 pc 产生的一次诊断。 */
export interface PlatformFallbackDiagnostic {
  kind: 'component' | 'decorator';
  name: string;
  requestedPlatform: Platform;
  fallbackPlatform: Platform;
}
