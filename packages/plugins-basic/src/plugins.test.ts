import { createDesigner } from '@x-form-engine/designer-core';
import { ENGINE_SCHEMA_VERSION } from '@x-form-engine/types';
import type { FormSchemaDocument } from '@x-form-engine/types';
import { basicPlugins } from './index';

describe('basicPlugins（Task 6.3）', () => {
  test('包含 4 个基础插件', () => {
    expect(basicPlugins.map((p) => p.name)).toEqual([
      'basic-property-panel',
      'basic-component-panel',
      'basic-toolbar',
      'basic-schema-commands',
    ]);
  });

  test('安装后 panels / toolbars / commands 已注册', () => {
    const designer = createDesigner({ plugins: basicPlugins });

    expect(designer.panels.has('basic-property')).toBe(true);
    expect(designer.panels.has('basic-component')).toBe(true);
    expect(designer.toolbars.has('basic-save')).toBe(true);
    expect(designer.toolbars.has('basic-preview')).toBe(true);
    expect(designer.commands.has('export-schema')).toBe(true);
    expect(designer.commands.has('import-schema')).toBe(true);
  });

  test('export-schema 命令把当前文档写入 context', () => {
    const designer = createDesigner({ plugins: basicPlugins });
    const cmd = designer.commands.get('export-schema')!;
    const context: Record<string, unknown> = {};
    cmd.execute(context);
    expect(context.document).toBe(designer.schema.getDocument());
  });

  test('import-schema 命令更新 SchemaEditor', () => {
    const designer = createDesigner({ plugins: basicPlugins });
    const cmd = designer.commands.get('import-schema')!;
    const doc: FormSchemaDocument = {
      schemaId: 's1',
      version: 2,
      engineSchemaVersion: ENGINE_SCHEMA_VERSION,
      schema: { type: 'object' },
    };

    cmd.execute({ document: doc });
    expect(designer.schema.getDocument()).toBe(doc);
  });
});
