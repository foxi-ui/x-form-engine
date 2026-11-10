import { Button } from 'antd-mobile';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FormEngineProvider,
  FormRenderer,
  ReadonlyRenderer,
} from '@x-form-engine/sdk';
import type {
  FormRendererInstance,
  FormSubmitResult,
  PlatformFallbackDiagnostic,
} from '@x-form-engine/sdk';
import { createEmployeeOnboardingMobileEngine } from './mobile-engine';
import {
  employeeOnboardingDocument,
  employeeOnboardingSchema,
  employeeOnboardingScope,
} from './schema';

/**
 * 移动端 Schema：在员工登记表基础上追加一个 PC 专用字段 `LegacyRemark`，
 * 用来演示移动端缺少实现时的平台回退与诊断。
 */
const mobileSchema: Record<string, unknown> = {
  ...employeeOnboardingSchema,
  properties: {
    ...(employeeOnboardingSchema.properties as Record<string, unknown>),
    legacyRemark: {
      type: 'string',
      title: '遗留备注（PC 专用）',
      'x-decorator': 'FormItem',
      'x-component': 'LegacyRemark',
      'x-component-props': { placeholder: '该字段只在 PC 端有实现' },
    },
  },
};

/**
 * 「员工入职登记」移动端完整示例。
 *
 * 复用与 PC 端完全一致的 Schema 与 scope，只更换移动端 Engine 物料；
 * 提交出的 `values` 与 PC 端相同。`LegacyRemark` 字段演示平台回退诊断。
 */
export function EmployeeOnboardingMobileForm(): JSX.Element {
  const engine = useMemo(createEmployeeOnboardingMobileEngine, []);
  useEffect(() => () => engine.dispose(), [engine]);

  const formRef = useRef<FormRendererInstance>(null);
  const [diagnostics, setDiagnostics] = useState<PlatformFallbackDiagnostic[]>([]);
  const [submitted, setSubmitted] = useState<FormSubmitResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDiagnostic = (diagnostic: PlatformFallbackDiagnostic): void => {
    setDiagnostics((prev) => [...prev, diagnostic]);
  };

  const handleSubmit = async (): Promise<void> => {
    setErrorMessage(null);

    try {
      const result = await formRef.current!.submit();
      if (!result) {
        return;
      }
      console.info('[mobile] values =', result.values);
      console.info('[mobile] snapshot =', result.snapshot);
      setSubmitted(result);
    } catch (error) {
      console.error('[mobile] submit failed', error);
      setErrorMessage('校验未通过，请补全必填项');
    }
  };

  return (
    <FormEngineProvider engine={engine}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 48px' }}>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>员工入职登记（移动端）</h1>
        <p style={{ color: '#666', marginTop: 0 }}>
          与 PC 端共用同一 Schema，提交 Value 一致；LegacyRemark 演示平台回退。
        </p>

        <FormRenderer
          ref={formRef}
          platform="mobile"
          schema={mobileSchema}
          scope={employeeOnboardingScope}
          schemaId={employeeOnboardingDocument.schemaId}
          schemaVersion={employeeOnboardingDocument.version}
          onDiagnostic={handleDiagnostic}
        />

        <Button block color="primary" onClick={handleSubmit} style={{ marginTop: 16 }}>
          提交
        </Button>

        {errorMessage ? (
          <p style={{ color: '#cf1322', marginTop: 12 }}>{errorMessage}</p>
        ) : null}

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16 }}>平台回退诊断</h2>
          {diagnostics.length === 0 ? (
            <p style={{ color: '#666' }}>当前 Schema 引用的组件均有移动端实现。</p>
          ) : (
            <ul style={{ paddingLeft: 20 }}>
              {diagnostics.map((diagnostic) => (
                <li key={`${diagnostic.kind}:${diagnostic.name}`}>
                  {diagnostic.kind === 'component' ? '组件' : '装饰器'}{' '}
                  <code>{diagnostic.name}</code> 缺少 {diagnostic.requestedPlatform}{' '}
                  实现，已回退到 {diagnostic.fallbackPlatform} 实现。
                </li>
              ))}
            </ul>
          )}
        </section>

        {submitted ? (
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 16 }}>历史只读还原（Snapshot）</h2>
            <div
              style={{
                border: '1px solid #eee',
                borderRadius: 8,
                padding: 12,
                background: '#fafafa',
              }}
            >
              <ReadonlyRenderer
                platform="mobile"
                schema={mobileSchema}
                snapshot={submitted.snapshot}
                values={submitted.values}
              />
            </div>

            <h2 style={{ fontSize: 16, marginTop: 24 }}>提交的 Value</h2>
            <pre
              style={{
                background: '#f5f5f5',
                borderRadius: 8,
                padding: 12,
                overflowX: 'auto',
              }}
            >
              {JSON.stringify(submitted.values, null, 2)}
            </pre>
          </section>
        ) : null}
      </div>
    </FormEngineProvider>
  );
}
