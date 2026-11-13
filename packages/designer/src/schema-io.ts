import type { TreeNode } from '@designable/core';
import {
  schemaDocumentToTree,
  treeToSchemaDocument,
} from '@x-form-engine/designer-designable';
import type { FormSchemaDocument } from '@x-form-engine/types';

/**
 * 兼容 Facade：Schema 往返逻辑已迁移到 `@x-form-engine/designer-designable` 的
 * Schema Adapter（TreeNode ↔ Schema + designerMetadata 保留）。本文件保留原公开
 * 签名，Phase 9 统一切换后退役。
 */

export interface ExportSchemaOptions {
  schemaId: string;
  /** 上一次的 schema 版本号，缺省视为 0（导出后为 1）。 */
  previousVersion?: number;
}

export interface ImportedSchemaDocument {
  tree: TreeNode;
  doc: FormSchemaDocument;
}

export function exportSchemaDocument(
  tree: TreeNode,
  options: ExportSchemaOptions
): FormSchemaDocument {
  return treeToSchemaDocument(tree, options);
}

export function importSchemaDocument(input: unknown): ImportedSchemaDocument {
  return schemaDocumentToTree(input);
}
