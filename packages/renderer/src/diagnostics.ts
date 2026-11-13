import { collectSchemaComponentRefs } from '@x-form-engine/core';
import type { PlatformFallbackDiagnostic } from '@x-form-engine/types';

// 兼容 re-export：`collectSchemaComponentRefs` 已迁移到 `@x-form-engine/core`。
export { collectSchemaComponentRefs } from '@x-form-engine/core';
export type { SchemaComponentRefs } from '@x-form-engine/core';

/**
 * 过滤出当前 Schema 实际引用的回退诊断。
 *
 * 同 `kind:name` 只保留第一条，避免一个组件在 Schema 中多次引用时重复提示。
 */
export function filterDiagnosticsBySchema(
  diagnostics: PlatformFallbackDiagnostic[],
  schema: unknown
): PlatformFallbackDiagnostic[] {
  const refs = collectSchemaComponentRefs(schema);
  const seen = new Set<string>();

  return diagnostics.filter((diagnostic) => {
    const referenced =
      diagnostic.kind === 'component' ? refs.components : refs.decorators;
    if (!referenced.has(diagnostic.name)) {
      return false;
    }

    const key = `${diagnostic.kind}:${diagnostic.name}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
