import { createForm } from '@formily/core';
import { FormProvider } from '@formily/react';
import type { FormEngine } from '@x-form-engine/types';
import { createEngineSchemaField } from '@x-form-engine/formily';
import { useMemo } from 'react';
import type { ComponentType } from 'react';

export interface DesignerPreviewProps {
  engine: FormEngine;
  schema: Record<string, unknown>;
  platform?: 'pc' | 'mobile';
}

/**
 * 设计器预览：直接把设计器中的 schema 交给 Formily 编译路径渲染。
 *
 * 刻意不复用 `@x-form-engine/renderer`，以保证预览验证的是
 * `createEngineSchemaField` 这一条与运行时同源的编译链路。
 * `engine` 需由调用方预先注册组件与装饰器。
 */
export const DesignerPreview: ComponentType<DesignerPreviewProps> = (props) => {
  const { engine, schema, platform = 'pc' } = props;

  // 每个预览实例只创建一次 form；schema 变化由 SchemaField 自行响应。
  const form = useMemo(() => createForm<Record<string, unknown>>(), []);
  const { SchemaField } = useMemo(
    () => createEngineSchemaField(engine, platform),
    [engine, platform]
  );

  return (
    <FormProvider form={form}>
      <SchemaField schema={schema} />
    </FormProvider>
  );
};
