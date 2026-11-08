import type {
  FormEngine,
  Platform,
  PlatformFallbackDiagnostic,
} from '@x-form-engine/types';
import { createSchemaField } from '@formily/react';
import type { ComponentType } from 'react';
import { resolveFormilyComponentMap } from './component-map';

/** SchemaField 的受控渲染契约（不泄漏 Formily 内部 Schema 类型）。 */
export type EngineSchemaField = ComponentType<{
  schema: unknown;
  scope?: Record<string, unknown>;
}>;

/** `createEngineSchemaField` 的返回结果。 */
export interface EngineSchemaFieldResult {
  SchemaField: EngineSchemaField;
  diagnostics: PlatformFallbackDiagnostic[];
}

/**
 * 创建可 JSX 渲染的 Formily SchemaField。
 *
 * 工厂级 `scope` 放入 createSchemaField options；实例级 `scope` prop
 * 由 Formily SchemaField 自身合并（实例级覆盖同名 key），无需自行实现。
 *
 * mobile 平台回退到 pc 实现的诊断随结果一并带出，由调用方决定如何呈现。
 */
export function createEngineSchemaField(
  engine: FormEngine,
  platform: Platform,
  scope?: Record<string, unknown>
): EngineSchemaFieldResult {
  const { components, diagnostics } = resolveFormilyComponentMap(engine, platform);
  const SchemaField = createSchemaField({ components, scope });

  // createSchemaField 的 props 类型绑定了 Formily 内部 Schema 类型，
  // 这里在公共边界收窄为本包声明的受控契约。
  return {
    SchemaField: SchemaField as unknown as EngineSchemaField,
    diagnostics,
  };
}
