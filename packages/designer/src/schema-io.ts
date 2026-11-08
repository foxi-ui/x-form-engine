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
 * 导出前先做字段重名检查：`transformToSchema` 以 `props.name` 作为
 * `schema.properties` 的键，重名会被静默覆盖，因此必须在转换前拒绝。
 */
export function exportSchemaDocument(
  tree: TreeNode,
  options: ExportSchemaOptions
): FormSchemaDocument {
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

function assertNoDuplicateFieldNames(tree: TreeNode): void {
  const seen = new Set<string>();
  visitFields(tree, (name) => {
    if (seen.has(name)) {
      throw new FormEngineError('SCHEMA_INVALID', 'duplicate field name: ' + name);
    }
    seen.add(name);
  });
}

function visitFields(node: TreeNode, onName: (name: string) => void): void {
  for (const child of node.children ?? []) {
    if (child.componentName === 'Field') {
      const name = child.props?.name;
      if (typeof name === 'string') {
        onName(name);
      }
    }
    visitFields(child, onName);
  }
}
