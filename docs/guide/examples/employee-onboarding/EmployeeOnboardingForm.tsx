import { Button, message } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FormEngineProvider,
  FormRenderer,
} from '@x-form-engine/sdk';
import type { FormRendererInstance, FormSubmitResult } from '@x-form-engine/sdk';
import { createEmployeeOnboardingEngine } from './engine';
import {
  employeeOnboardingDocument,
  employeeOnboardingSchema,
  employeeOnboardingScope,
} from './schema';
import type { EmployeeOnboardingValues } from './schema';

/** 示例保存函数：替换成你所在业务的真实接口。 */
async function defaultSave(result: FormSubmitResult): Promise<void> {
  console.info('[employee-onboarding] 待保存载荷', result);
}

export interface EmployeeOnboardingFormProps {
  /** 编辑场景的回填值；只在首次挂载时生效。 */
  initialValues?: Partial<EmployeeOnboardingValues>;
  /** 自定义保存函数；不传时只打印到控制台。 */
  save?: (result: FormSubmitResult) => Promise<void>;
  /** 保存成功后的回调，便于上层关闭弹窗或刷新列表。 */
  onSaved?: (result: FormSubmitResult) => void;
}

/**
 * 「员工入职登记」完整示例。
 *
 * 使用前请确保应用已满足：React 17、antd 4，
 * 并在应用入口引入一次 `antd/dist/antd.css`。
 */
export function EmployeeOnboardingForm(
  props: EmployeeOnboardingFormProps
): JSX.Element {
  const engine = useMemo(createEmployeeOnboardingEngine, []);
  useEffect(() => () => engine.dispose(), [engine]);

  const formRef = useRef<FormRendererInstance>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);

    try {
      let result: FormSubmitResult;

      try {
        // 校验失败时 Formily 会 reject，且抛出的不是 Error 实例，
        // 因此这里按「校验未通过」处理，不要依赖 error.message。
        result = await formRef.current!.submit();
      } catch (validationError) {
        console.error('[employee-onboarding] 校验未通过', validationError);
        message.error('请先补全必填项');
        return;
      }

      try {
        await (props.save ?? defaultSave)(result);
        message.success('提交成功');
        props.onSaved?.(result);
      } catch (saveError) {
        console.error('[employee-onboarding] 保存失败', saveError);
        message.error('保存失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormEngineProvider engine={engine}>
      <div style={{ maxWidth: 640 }}>
        <FormRenderer
          ref={formRef}
          schema={employeeOnboardingSchema}
          scope={employeeOnboardingScope}
          schemaId={employeeOnboardingDocument.schemaId}
          schemaVersion={employeeOnboardingDocument.version}
          initialValues={props.initialValues}
        />

        <div style={{ marginTop: 16 }}>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            提交
          </Button>
        </div>
      </div>
    </FormEngineProvider>
  );
}
