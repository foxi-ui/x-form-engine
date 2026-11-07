import type { ComponentName } from './base';

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

export interface ComponentBinding<Impl = unknown> {
  protocol: ComponentProtocolDefinition;
  implementations: ComponentImplementations<Impl>;
}
