import { TreeNode } from '@designable/core';
import { transformToSchema, transformToTreeNode } from '@designable/formily-transformer';
import type { ISchema } from '@formily/json-schema';
import { parseSchemaDocument, validateEngineSchema } from '@x-form-engine/core';
import { ENGINE_SCHEMA_VERSION, FormEngineError } from '@x-form-engine/types';
import type { FormSchemaDocument } from '@x-form-engine/types';

export interface ExportSchemaOptions {
  schemaId: string;
  /** 上一次的 schema 版本号，缺省视为 0（导出后为 1）。 */
  previousVersion?: number;
}

/**
 * 将 Designable 组件树导出为带信封的 Schema 文档。
 *
 * 导出前先补齐缺失的字段名：`transformToSchema` 以 `props.name || id` 作为
 * `schema.properties` 的键，缺失 `name` 时会退化成不可读的节点 UUID。
 * 随后做字段重名检查：`transformToSchema` 按父节点分组写入 `properties`，
 * 同一父节点下的直接 Field 子节点重名会被静默覆盖，因此必须在转换前拒绝。
 */
export function exportSchemaDocument(
  tree: TreeNode,
  options: ExportSchemaOptions
): FormSchemaDocument {
  assignDefaultFieldNames(tree);
  assertNoDuplicateFieldNames(tree);

  const { schema } = transformToSchema(tree);
  const result = validateEngineSchema(schema);
  if (!result.valid) {
    throw new FormEngineError('SCHEMA_INVALID', result.errors.join('; '));
  }

  return {
    schemaId: options.schemaId,
    version: (options.previousVersion ?? 0) + 1,
    engineSchemaVersion: ENGINE_SCHEMA_VERSION,
    schema: schema as Record<string, unknown>,
    updatedAt: new Date().toISOString(),
  };
}

export interface ImportedSchemaDocument {
  tree: TreeNode;
  doc: FormSchemaDocument;
}

/**
 * 解析 Schema 文档信封并还原为 Designable 组件树。
 *
 * 信封字段类型由 `parseSchemaDocument` 校验；引擎 Schema 版本不一致时拒绝导入。
 */
export function importSchemaDocument(input: unknown): ImportedSchemaDocument {
  const doc = parseSchemaDocument(input);
  if (doc.engineSchemaVersion !== ENGINE_SCHEMA_VERSION) {
    throw new FormEngineError(
      'SCHEMA_INVALID',
      'unsupported engineSchemaVersion: ' + doc.engineSchemaVersion
    );
  }

  const tree = new TreeNode(transformToTreeNode({ schema: doc.schema as ISchema }));

  return { tree, doc };
}

/**
 * 为缺失 `name` 的 Field 节点补齐默认字段名（`field_1`、`field_2` …）。
 *
 * `transformToSchema` 只在同一父节点的直接 Field 子节点之间生成
 * `properties` 键，因此默认名只需在该作用域内唯一：每个父节点独立计数，
 * 并跳过同级已有字段名，避免与显式命名冲突。
 */
function assignDefaultFieldNames(node: TreeNode): void {
  const children = node.children ?? [];
  const usedNames = new Set<string>();

  for (const child of children) {
    if (child.componentName !== 'Field') {
      continue;
    }
    const name = child.props?.name;
    if (typeof name === 'string' && name.length > 0) {
      usedNames.add(name);
    }
  }

  let counter = 0;
  for (const child of children) {
    if (child.componentName !== 'Field') {
      continue;
    }
    const name = child.props?.name;
    if (typeof name === 'string' && name.length > 0) {
      continue;
    }

    let candidate: string;
    do {
      counter += 1;
      candidate = 'field_' + counter;
    } while (usedNames.has(candidate));

    usedNames.add(candidate);
    child.setProps({ name: candidate });
  }

  for (const child of children) {
    assignDefaultFieldNames(child);
  }
}

/**
 * 按父节点作用域检查字段重名。
 *
 * `transformToSchema` 在每个节点下独立生成 `properties`，因此
 * `user.name` 与 `company.name` 这类不同父节点下的同名字段是合法的；
 * 只有同一父节点的直接 Field 子节点重名才会互相覆盖。
 */
function assertNoDuplicateFieldNames(node: TreeNode): void {
  const seen = new Set<string>();

  for (const child of node.children ?? []) {
    if (child.componentName !== 'Field') {
      continue;
    }
    const name = child.props?.name;
    if (typeof name !== 'string' || name.length === 0) {
      continue;
    }
    if (seen.has(name)) {
      throw new FormEngineError('SCHEMA_INVALID', 'duplicate field name: ' + name);
    }
    seen.add(name);
  }

  for (const child of node.children ?? []) {
    assertNoDuplicateFieldNames(child);
  }
}
