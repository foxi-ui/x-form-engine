import type {
  AdapterContext,
  FormEngine,
  FormValue,
  NormalizeError,
  NormalizeResult,
  NormalizeWarning,
} from '@x-form-engine/types';
import { resolveFieldMeta } from './field-meta';
import { cloneValue, isObjectArrayField, isPlainObject } from './internal';

export interface NormalizeOptions {
  locale?: string;
}

/**
 * 规范化整份表单 Value。
 *
 * - 遍历 schema 字段，叶字段按组件 binding 的 `adapter.normalizeValue` 归一；
 * - 无 adapter 的字段（基础 primitive）透传；
 * - 嵌套对象与对象数组逐层递归；
 * - 可恢复问题经 `context.warn` 进入 `warnings`，硬错误经 `context.error` 或抛错进入 `errors`，
 *   不静默丢弃业务数据。
 */
export function normalizeFormValues(
  engine: FormEngine,
  schema: Record<string, unknown>,
  values: FormValue,
  options: NormalizeOptions = {}
): NormalizeResult<FormValue> {
  const warnings: NormalizeWarning[] = [];
  const errors: NormalizeError[] = [];
  const locale = options.locale ?? engine.options.locale ?? 'zh-CN';

  const normalized = normalizeNode(
    engine,
    schema,
    values,
    [],
    locale,
    warnings,
    errors
  );

  return {
    // 深拷贝返回结果，确保规范化后的 Value 不共享调用方（如表单状态）的可变叶子（Date/File/Blob）。
    value: isPlainObject(normalized) ? (cloneValue(normalized) as FormValue) : {},
    warnings,
    errors,
  };
}

function normalizeNode(
  engine: FormEngine,
  schemaNode: Record<string, unknown>,
  valuesNode: unknown,
  pathSegments: string[],
  locale: string,
  warnings: NormalizeWarning[],
  errors: NormalizeError[]
): unknown {
  const properties = schemaNode.properties;
  if (!isPlainObject(properties) || !isPlainObject(valuesNode)) {
    return valuesNode;
  }

  const result: Record<string, unknown> = {};
  for (const [name, fieldSchema] of Object.entries(properties)) {
    if (!isPlainObject(fieldSchema)) {
      continue;
    }
    result[name] = normalizeField(
      engine,
      fieldSchema,
      valuesNode[name],
      [...pathSegments, name],
      locale,
      warnings,
      errors
    );
  }
  return result;
}

function normalizeField(
  engine: FormEngine,
  fieldSchema: Record<string, unknown>,
  value: unknown,
  pathSegments: string[],
  locale: string,
  warnings: NormalizeWarning[],
  errors: NormalizeError[]
): unknown {
  // 对象字段：递归子字段
  if (isPlainObject(value) && isPlainObject(fieldSchema.properties)) {
    return normalizeNode(
      engine,
      fieldSchema,
      value,
      pathSegments,
      locale,
      warnings,
      errors
    );
  }

  // 对象数组字段（明细表）：逐行递归
  if (isObjectArrayField(fieldSchema, value)) {
    const itemSchema = fieldSchema.items as Record<string, unknown>;
    return value.map((row, index) =>
      normalizeNode(
        engine,
        itemSchema,
        row,
        [...pathSegments, String(index)],
        locale,
        warnings,
        errors
      )
    );
  }

  // 叶字段：应用组件 adapter
  return normalizeLeaf(
    engine,
    fieldSchema,
    value,
    pathSegments,
    locale,
    warnings,
    errors
  );
}

function normalizeLeaf(
  engine: FormEngine,
  fieldSchema: Record<string, unknown>,
  value: unknown,
  pathSegments: string[],
  locale: string,
  warnings: NormalizeWarning[],
  errors: NormalizeError[]
): unknown {
  const meta = resolveFieldMeta(engine, fieldSchema);
  const adapter = meta.adapter?.normalizeValue;
  if (!adapter) {
    return value;
  }

  const path = pathSegments.join('.');
  const context: AdapterContext = {
    schema: fieldSchema,
    path,
    locale,
    warn: (code, message) => warnings.push({ path, code, message }),
    error: (code, message) => errors.push({ path, code, message }),
  };

  try {
    return adapter(value, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({ path, code: 'ADAPTER_THREW', message });
    return value;
  }
}
