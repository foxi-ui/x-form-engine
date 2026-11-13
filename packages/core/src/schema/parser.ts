import { FormEngineError } from '@x-form-engine/types';
import type { DesignerMetadata, FormSchemaDocument } from '@x-form-engine/types';
import { isPlainObject } from './internal';

/**
 * 解析并校验 Schema 文档信封（schemaId / version / engineSchemaVersion / schema）。
 *
 * 只校验信封字段的类型，不对 `schema` 内部的 Formily 结构做解释；
 * 任何不满足契约的输入都抛 `SCHEMA_INVALID`，消息中指明具体字段。
 */
export function parseSchemaDocument(input: unknown): FormSchemaDocument {
  if (!isPlainObject(input)) {
    throw new FormEngineError('SCHEMA_INVALID', 'schema document must be an object');
  }

  const { schemaId, version, engineSchemaVersion, schema } = input;

  if (typeof schemaId !== 'string') {
    throw new FormEngineError('SCHEMA_INVALID', 'schemaId must be a string');
  }
  if (typeof version !== 'number' || !Number.isFinite(version)) {
    throw new FormEngineError('SCHEMA_INVALID', 'version must be a finite number');
  }
  if (typeof engineSchemaVersion !== 'string') {
    throw new FormEngineError('SCHEMA_INVALID', 'engineSchemaVersion must be a string');
  }
  if (!isPlainObject(schema)) {
    throw new FormEngineError('SCHEMA_INVALID', 'schema must be an object');
  }

  const doc: FormSchemaDocument = {
    schemaId,
    version,
    engineSchemaVersion,
    schema,
  };

  if (typeof input.formilyVersion === 'string') {
    doc.formilyVersion = input.formilyVersion;
  }
  if (typeof input.createdAt === 'string') {
    doc.createdAt = input.createdAt;
  }
  if (typeof input.updatedAt === 'string') {
    doc.updatedAt = input.updatedAt;
  }
  if (isPlainObject(input.designerMetadata)) {
    doc.designerMetadata = input.designerMetadata as DesignerMetadata;
  }

  return doc;
}
