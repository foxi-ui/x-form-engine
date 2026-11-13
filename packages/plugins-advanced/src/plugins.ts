import { advancedSetters } from '@x-form-engine/setters-advanced';
import type { DesignerPlugin } from '@x-form-engine/types';

/**
 * 高级扩展示例插件（Task 8.2）。
 *
 * 验证第三方扩展模式：
 * 1. 经公开 `SetterRegistry` 注册高级 Setter（`registerMany`），不访问 Core 私有字段。
 * 2. 经 `SchemaEditor.update` 修改 Schema（`apply-expression` 命令），保留 Formily
 *    原生字段，把表达式写入 Formily 原生 `x-reactions` 扩展数据。
 */
export const expressionConfigPlugin: DesignerPlugin = {
  name: 'expression-config',
  version: '1.0.0',
  install(ctx) {
    ctx.setters.registerMany(advancedSetters);

    ctx.commands.register({
      name: 'apply-expression',
      execute: (context) => {
        const fieldPath = context.fieldPath;
        const expression = context.expression;
        if (typeof fieldPath !== 'string' || typeof expression !== 'string') {
          return;
        }

        ctx.schema.update((doc) => {
          const properties = (doc.schema.properties ?? {}) as Record<string, unknown>;
          const field = (properties[fieldPath] ?? {}) as Record<string, unknown>;
          field['x-reactions'] = {
            ...(field['x-reactions'] as Record<string, unknown> | undefined),
            expression,
          };
          properties[fieldPath] = field;
          return { ...doc, schema: { ...doc.schema, properties } };
        });
      },
    });
  },
};

/** 高级插件集合。 */
export const advancedPlugins: DesignerPlugin[] = [expressionConfigPlugin];
