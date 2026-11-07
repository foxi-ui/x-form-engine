import type { FormEngine } from '@x-form-engine/types';
import { createSchemaField } from '@formily/react';
import type { ComponentType } from 'react';
import { resolveFormilyComponentMap } from './component-map';

/**
 * 创建可 JSX 渲染的 Formily SchemaField。
 *
 * 工厂级 `scope` 放入 createSchemaField options；实例级 `scope` prop
 * 由 Formily SchemaField 自身合并（实例级覆盖同名 key），无需自行实现。
 */
export function createEngineSchemaField(
  engine: FormEngine,
  platform: 'pc' | 'mobile',
  scope?: Record<string, unknown>
): ComponentType<{ schema: unknown; scope?: Record<string, unknown> }> {
  const { components } = resolveFormilyComponentMap(engine, platform);
  const SchemaField = createSchemaField({ components, scope });

  // createSchemaField 的 props 类型绑定了 Formily 内部 Schema 类型，
  // 这里在公共边界收窄为本包声明的受控契约。
  return SchemaField as unknown as ComponentType<{
    schema: unknown;
    scope?: Record<string, unknown>;
  }>;
}
