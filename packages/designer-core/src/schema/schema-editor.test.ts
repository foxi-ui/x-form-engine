import { ENGINE_SCHEMA_VERSION } from '@x-form-engine/types';
import type { FormSchemaDocument } from '@x-form-engine/types';
import { createSchemaEditor } from './schema-editor';

describe('createSchemaEditor（Task 4.5）', () => {
  test('默认文档含 engineSchemaVersion 与空 schema', () => {
    const editor = createSchemaEditor();
    const doc = editor.getDocument();
    expect(doc.engineSchemaVersion).toBe(ENGINE_SCHEMA_VERSION);
    expect(doc.schema).toEqual({});
    expect(doc.version).toBe(1);
  });

  test('传入初始文档时 getDocument 返回该文档', () => {
    const initial: FormSchemaDocument = {
      schemaId: 's1',
      version: 3,
      engineSchemaVersion: ENGINE_SCHEMA_VERSION,
      schema: { type: 'object' },
    };
    const editor = createSchemaEditor(initial);
    expect(editor.getDocument()).toBe(initial);
  });

  test('update 应用 updater（不可变）并通知订阅者', () => {
    const editor = createSchemaEditor();
    const received: FormSchemaDocument[] = [];
    editor.subscribe((doc) => received.push(doc));

    editor.update((doc) => ({ ...doc, version: doc.version + 1 }));
    expect(editor.getDocument().version).toBe(2);
    expect(received).toHaveLength(1);
    expect(received[0].version).toBe(2);
  });

  test('subscribe 返回退订函数，退订后不再通知', () => {
    const editor = createSchemaEditor();
    const received: FormSchemaDocument[] = [];
    const unsubscribe = editor.subscribe((doc) => received.push(doc));

    editor.update((doc) => ({ ...doc, version: 2 }));
    expect(received).toHaveLength(1);

    unsubscribe();
    editor.update((doc) => ({ ...doc, version: 3 }));
    expect(received).toHaveLength(1);
  });
});
