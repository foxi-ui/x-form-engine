import { TreeNode } from '@designable/core';
import { transformToSchema, transformToTreeNode } from '@designable/formily-transformer';
import type { ISchema } from '@formily/json-schema';
import { parseSchemaDocument, validateEngineSchema } from '@x-form-engine/core';
import { ENGINE_SCHEMA_VERSION, FormEngineError } from '@x-form-engine/types';
import type { DesignerMetadata, FormSchemaDocument } from '@x-form-engine/types';

export interface TreeToSchemaOptions {
  schemaId: string;
  /** 上一次的 schema 版本号，缺省视为 0（导出后为 1）。 */
  previousVersion?: number;
  /** 设计器元数据（C1）：与 Runtime Schema 分离，随文档往返。 */
  designerMetadata?: DesignerMetadata;
}

/**
 * 将 Designable 组件树导出为带信封的 Schema 文档（Task 5.4）。
 *
 * 导出前先补齐缺失字段名（避免退化成不可读 UUID），再做同父节点字段重名检查。
 * 保留 Formily 原生字段 / `x-engine` 扩展 / 未知字段；`designerMetadata` 独立于
 * Runtime Schema 持久化。
 */
export function treeToSchemaDocument(
  tree: TreeNode,
  options: TreeToSchemaOptions
): FormSchemaDocument {
  assignDefaultFieldNames(tree);
  assertNoDuplicateFieldNames(tree);

  const { schema } = transformToSchema(tree);
  const result = validateEngineSchema(schema);
  if (!result.valid) {
    throw new FormEngineError('SCHEMA_INVALID', result.errors.join('; '));
  }

  const doc: FormSchemaDocument = {
    schemaId: options.schemaId,
    version: (options.previousVersion ?? 0) + 1,
    engineSchemaVersion: ENGINE_SCHEMA_VERSION,
    schema: schema as Record<string, unknown>,
    updatedAt: new Date().toISOString(),
  };
  if (options.designerMetadata) {
    doc.designerMetadata = options.designerMetadata;
  }
  return doc;
}

export interface SchemaToTreeResult {
  tree: TreeNode;
  doc: FormSchemaDocument;
}

/**
 * 解析 Schema 文档信封并还原为 Designable 组件树（Task 5.4）。
 *
 * 信封字段由 `parseSchemaDocument` 校验（含 `designerMetadata` 保留）；引擎 Schema
 * 版本不一致时拒绝导入。
 */
export function schemaDocumentToTree(input: unknown): SchemaToTreeResult {
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
 * 默认名只需在同一父节点的直接 Field 子节点间唯一：每个父节点独立计数，
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
 * 按父节点作用域检查字段重名：同一父节点的直接 Field 子节点重名会被
 * `transformToSchema` 静默覆盖，因此必须在转换前拒绝。
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
