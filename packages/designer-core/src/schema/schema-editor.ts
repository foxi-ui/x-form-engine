import { ENGINE_SCHEMA_VERSION } from '@x-form-engine/types';
import type { FormSchemaDocument, SchemaEditor } from '@x-form-engine/types';

function createDefaultDocument(): FormSchemaDocument {
  return {
    schemaId: 'default',
    version: 1,
    engineSchemaVersion: ENGINE_SCHEMA_VERSION,
    schema: {},
  };
}

/**
 * SchemaEditor 受控实现（Task 4.5，C11）。
 *
 * 只操作 `FormSchemaDocument`，不公开 Designable `TreeNode`；
 * `update` 采用不可变更新（updater 返回新文档），并同步通知订阅者。
 */
export function createSchemaEditor(initial?: FormSchemaDocument): SchemaEditor {
  let document: FormSchemaDocument = initial ?? createDefaultDocument();
  const listeners = new Set<(doc: FormSchemaDocument) => void>();

  return {
    getDocument(): FormSchemaDocument {
      return document;
    },
    update(updater: (doc: FormSchemaDocument) => FormSchemaDocument): void {
      document = updater(document);
      for (const listener of [...listeners]) {
        listener(document);
      }
    },
    subscribe(listener: (doc: FormSchemaDocument) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
