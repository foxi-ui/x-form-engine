import { createForm, onFormValuesChange } from '@formily/core';
import { FormProvider } from '@formily/react';
import { toJS } from '@formily/reactive';
import { createCandidateSnapshot, normalizeFormValues } from '@x-form-engine/adapters';
import { createEngineSchemaField } from '@x-form-engine/formily';
import { filterWritableValues } from '@x-form-engine/services';
import type { FormSubmitResult, FormValue } from '@x-form-engine/types';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useFormEngine } from './context';
import type { FormRendererInstance, FormRendererProps } from './types';

export const FormRenderer = forwardRef<FormRendererInstance, FormRendererProps>(
  function FormRenderer(props, ref) {
    const engine = useFormEngine();
    const platform = props.platform ?? 'pc';

    // 回调与提交配置放在 ref 中，保证变化不会重建 form。
    const onChangeRef = useRef(props.onValuesChange);
    useEffect(() => {
      onChangeRef.current = props.onValuesChange;
    }, [props.onValuesChange]);

    const propsRef = useRef(props);
    useEffect(() => {
      propsRef.current = props;
    });

    const form = useMemo(
      () =>
        createForm<Record<string, unknown>>({
          // initialValues 既是当前值（values），也是 reset() 的恢复目标。
          initialValues: props.initialValues,
          values: props.initialValues,
          effects: () => {
            onFormValuesChange((changedForm) => {
              onChangeRef.current?.(toJS(changedForm.values));
            });
          },
        }),
      // M1：每个 FormRenderer 实例只创建一次 form；initialValues 仅在挂载时生效。
      []
    );

    const SchemaField = useMemo(
      () => createEngineSchemaField(engine, platform),
      [engine, platform]
    );

    const { disabled, readOnly } = props;
    useEffect(() => {
      form.setPattern(disabled ? 'disabled' : readOnly ? 'readOnly' : 'editable');
    }, [form, disabled, readOnly]);

    useImperativeHandle(
      ref,
      () => ({
        // 返回普通对象快照，避免把 Formily 活 observable 泄漏给业务代码。
        getValues: () => toJS(form.values),
        setValues: (values) => {
          form.setValues(values);
        },
        validate: () => form.validate(),
        reset: () => {
          void form.reset();
        },
        submit: async (): Promise<FormSubmitResult> => {
          // 校验失败时 Formily 会 reject（throw form.errors），直接向上抛。
          await form.validate();

          const current = propsRef.current;
          const locale = current.locale ?? engine.options.locale ?? 'zh-CN';
          const rawValues = toJS(form.values) as FormValue;

          // 1. Value 规范化（组件 adapter 归一）
          const normalized = normalizeFormValues(engine, current.schema, rawValues, {
            locale,
          });

          // 2. 提交前剔除无写权限字段（有权限信封时）
          const writableValues = current.permission
            ? filterWritableValues(current.permission, normalized.value)
            : normalized.value;

          // 3. 生成候选快照（Candidate Snapshot）
          const { snapshot } = createCandidateSnapshot(
            engine,
            current.schema,
            writableValues,
            {
              locale,
              schemaId: current.schemaId,
              schemaVersion: current.schemaVersion,
            }
          );

          return {
            values: writableValues,
            snapshot,
            schemaId: current.schemaId,
            schemaVersion: current.schemaVersion,
          };
        },
        destroy: () => {
          // M1 占位：Formily form 没有公开的 destroy API，
          // 其生命周期订阅随 React unmount / FormProvider 销毁而清理。
        },
      }),
      [form, engine]
    );

    return (
      <FormProvider form={form}>
        <SchemaField schema={props.schema} scope={props.scope} />
      </FormProvider>
    );
  }
);
