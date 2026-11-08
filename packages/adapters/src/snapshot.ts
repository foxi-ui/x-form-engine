import { createItemId } from '@x-form-engine/core';
import { SNAPSHOT_VERSION } from '@x-form-engine/types';
import type {
  AdapterContext,
  FieldSnapshot,
  FormEngine,
  FormSnapshot,
  FormValue,
  RepeatItemSnapshot,
} from '@x-form-engine/types';
import { resolveFieldMeta, type FieldOption } from './field-meta';
import { isObjectArrayField, isPlainObject } from './internal';

export interface CandidateSnapshotOptions {
  locale?: string;
  schemaId?: string;
  schemaVersion?: number;
  createdAt?: string;
}

export interface SnapshotDiagnostic {
  path: string;
  code: string;
  message: string;
}

/**
 * 生成候选快照（Candidate Snapshot）。
 *
 * - `fields` 以 `path` 为 key，每个字段记录稳定 `fieldId`、`title`、
 *   `component`、`componentVersion`、`value` 与冻结的 `displayValue`；
 * - 枚举组件（Select/Radio/Checkbox）从 schema 选项解析 label；
 * - 对象数组（明细表）按 `itemId` 生成行级 `RepeatItemSnapshot`；
 * - 展示信息为候选、非权威，由后端校验补全。
 */
export function createCandidateSnapshot(
  engine: FormEngine,
  schema: Record<string, unknown>,
  values: FormValue,
  options: CandidateSnapshotOptions = {}
): { snapshot: FormSnapshot; diagnostics: SnapshotDiagnostic[] } {
  const diagnostics: SnapshotDiagnostic[] = [];
  const fields: Record<string, FieldSnapshot> = {};
  const locale = options.locale ?? engine.options.locale ?? 'zh-CN';

  buildFields(engine, schema, values, [], [], fields, locale, diagnostics);

  return {
    snapshot: {
      snapshotVersion: SNAPSHOT_VERSION,
      schemaId: options.schemaId ?? '',
      schemaVersion: options.schemaVersion ?? 0,
      createdAt: options.createdAt ?? new Date().toISOString(),
      locale,
      fields,
    },
    diagnostics,
  };
}

function buildFields(
  engine: FormEngine,
  schemaNode: Record<string, unknown>,
  valuesNode: unknown,
  nameSegments: string[],
  pathSegments: string[],
  fields: Record<string, FieldSnapshot>,
  locale: string,
  diagnostics: SnapshotDiagnostic[]
): void {
  const properties = schemaNode.properties;
  if (!isPlainObject(properties) || !isPlainObject(valuesNode)) {
    return;
  }

  for (const [name, fieldSchema] of Object.entries(properties)) {
    if (!isPlainObject(fieldSchema)) {
      continue;
    }

    // 跳过被权限剔除或缺失的字段（不生成 value 为 undefined 的空快照项）
    if (!Object.prototype.hasOwnProperty.call(valuesNode, name)) {
      continue;
    }

    const value = valuesNode[name];
    const childNames = [...nameSegments, name];
    const childPaths = [...pathSegments, name];
    const path = childPaths.join('.');
    const fieldId = childNames.join('.');

    if (isObjectArrayField(fieldSchema, value)) {
      fields[path] = buildArraySnapshot(
        engine,
        fieldSchema,
        value,
        childNames,
        path,
        fieldId,
        locale,
        diagnostics
      );
    } else if (isPlainObject(fieldSchema.properties) && isPlainObject(value)) {
      buildFields(
        engine,
        fieldSchema,
        value,
        childNames,
        childPaths,
        fields,
        locale,
        diagnostics
      );
    } else {
      fields[path] = buildLeafSnapshot(
        engine,
        fieldSchema,
        value,
        path,
        fieldId,
        locale
      );
    }
  }
}

function buildArraySnapshot(
  engine: FormEngine,
  fieldSchema: Record<string, unknown>,
  value: Record<string, unknown>[],
  nameSegments: string[],
  path: string,
  fieldId: string,
  locale: string,
  diagnostics: SnapshotDiagnostic[]
): FieldSnapshot {
  const meta = resolveFieldMeta(engine, fieldSchema);
  const itemSchema = fieldSchema.items as Record<string, unknown>;
  const rows: RepeatItemSnapshot[] = [];

  value.forEach((row, index) => {
    const identity = createItemId(row, index);
    if (!identity.stable) {
      diagnostics.push({
        path,
        code: 'UNSTABLE_ITEM_ID',
        message: `数组行 ${index} 缺少稳定身份，退化为序号`,
      });
    }

    const rowFields: Record<string, FieldSnapshot> = {};
    buildFields(
      engine,
      itemSchema,
      row,
      nameSegments,
      [path, String(index)],
      rowFields,
      locale,
      diagnostics
    );
    rows.push({ itemId: identity.itemId, fields: rowFields });
  });

  const snapshot: FieldSnapshot = {
    path,
    fieldId,
    component: meta.component ?? 'Unknown',
    value,
    items: rows,
  };
  if (meta.componentVersion) {
    snapshot.componentVersion = meta.componentVersion;
  }
  if (meta.title) {
    snapshot.title = meta.title;
  }
  return snapshot;
}

function buildLeafSnapshot(
  engine: FormEngine,
  fieldSchema: Record<string, unknown>,
  value: unknown,
  path: string,
  fieldId: string,
  locale: string
): FieldSnapshot {
  const meta = resolveFieldMeta(engine, fieldSchema);
  const snapshot: FieldSnapshot = {
    path,
    fieldId,
    component: meta.component ?? 'Unknown',
    value,
  };
  if (meta.componentVersion) {
    snapshot.componentVersion = meta.componentVersion;
  }
  if (meta.title) {
    snapshot.title = meta.title;
  }

  if (meta.adapter?.createSnapshot) {
    const context: AdapterContext = { schema: fieldSchema, path, locale };
    const displayValue = meta.adapter.createSnapshot(value, context);
    if (displayValue !== undefined) {
      snapshot.displayValue = displayValue;
    }
  } else if (meta.options) {
    const resolved = resolveEnum(value, meta.options);
    snapshot.displayValue = resolved.displayValue;
    snapshot.options = resolved.options;
    if (resolved.missing) {
      snapshot.metadata = { displayMissing: true };
    }
  }

  return snapshot;
}

interface EnumResolution {
  displayValue: unknown;
  options: FieldOption[];
  missing: boolean;
}

function resolveEnum(
  value: unknown,
  options: FieldOption[]
): EnumResolution {
  if (value == null) {
    return { displayValue: null, options: [], missing: false };
  }

  if (Array.isArray(value)) {
    const selected: FieldOption[] = [];
    const labels: Array<string | null> = [];
    let missing = false;
    for (const item of value) {
      const found = options.find((option) => option.value === item);
      if (found) {
        selected.push(found);
        labels.push(found.label);
      } else {
        labels.push(null);
        missing = true;
      }
    }
    return { displayValue: labels, options: selected, missing };
  }

  const found = options.find((option) => option.value === value);
  if (found) {
    return { displayValue: found.label, options: [found], missing: false };
  }
  return { displayValue: null, options: [], missing: true };
}
