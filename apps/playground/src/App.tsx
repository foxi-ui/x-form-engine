import { basicComponents } from '@x-form-engine/components';
import {
  FormEngineProvider,
  FormRenderer,
  ReadonlyRenderer,
  createFormEngine,
  defaultFormattersPlugin,
} from '@x-form-engine/sdk';
import type { FormRendererInstance, FormSubmitResult } from '@x-form-engine/sdk';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * M3 演示 schema：复用 M1 的 Input / Select / DatePicker / Textarea。
 * 提交后生成候选快照（Value + Snapshot），并用独立只读渲染器做历史还原。
 */
const demoSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    姓名: {
      type: 'string',
      title: '姓名',
      'x-component': 'Input',
      'x-component-props': {
        placeholder: '请输入姓名',
        style: { width: 320 },
      },
      'x-validator': [{ required: true, message: '请输入姓名' }],
    },
    部门: {
      type: 'string',
      title: '部门',
      'x-component': 'Select',
      enum: [
        { label: '研发部', value: 'rd' },
        { label: '产品部', value: 'product' },
        { label: '运营部', value: 'operation' },
      ],
      'x-component-props': {
        placeholder: '请选择部门',
        style: { width: 320 },
      },
      'x-validator': [{ required: true, message: '请选择部门' }],
    },
    入职日期: {
      type: 'string',
      title: '入职日期',
      'x-component': 'DatePicker',
      'x-component-props': {
        placeholder: '请选择入职日期',
        style: { width: 320 },
      },
    },
    备注: {
      type: 'string',
      title: '备注',
      'x-component': 'Textarea',
      'x-component-props': {
        placeholder: '选填：补充说明',
        rows: 3,
        style: { width: 480 },
      },
    },
  },
};

const pageStyle = {
  maxWidth: 640,
  margin: '48px auto',
  padding: '0 24px',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", sans-serif',
} as const;

export default function App(): JSX.Element {
  // Engine 全应用只创建一次；卸载时统一释放。
  const engine = useMemo(
    () =>
      createFormEngine({
        platform: 'pc',
        locale: 'zh-CN',
        components: basicComponents,
        plugins: [defaultFormattersPlugin],
      }),
    []
  );

  useEffect(() => () => engine.dispose(), [engine]);

  const formRef = useRef<FormRendererInstance>(null);
  const [submitted, setSubmitted] = useState<FormSubmitResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setErrorMessage(null);

    try {
      const result = await formRef.current?.submit();

      if (!result) {
        return;
      }

      console.log('[playground] submit values =', result.values);
      console.log('[playground] submit snapshot =', result.snapshot);
      setSubmitted(result);
    } catch (error: unknown) {
      console.error('[playground] submit failed =', error);
      setErrorMessage('校验未通过：请先补全必填项（详情见控制台）。');
    }
  }, []);

  return (
    <FormEngineProvider engine={engine}>
      <main style={pageStyle}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>x-form-engine playground</h1>
        <p style={{ color: '#666', marginTop: 0 }}>
          M3 演示：填写 → 提交生成 Value + 候选 Snapshot → 只读历史还原。
        </p>

        <FormRenderer
          ref={formRef}
          schema={demoSchema}
          schemaId="demo-employee"
          schemaVersion={1}
        />

        <button
          type="button"
          onClick={handleSubmit}
          style={{
            marginTop: 16,
            padding: '8px 20px',
            border: 'none',
            borderRadius: 4,
            background: '#1677ff',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          提交
        </button>

        {errorMessage ? (
          <p style={{ color: '#cf1322', marginTop: 16 }}>{errorMessage}</p>
        ) : null}

        {submitted ? (
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 16 }}>历史只读还原（Snapshot）</h2>
            <div
              style={{
                border: '1px solid #eee',
                borderRadius: 4,
                padding: 12,
                background: '#fafafa',
              }}
            >
              <ReadonlyRenderer schema={demoSchema} snapshot={submitted.snapshot} />
            </div>

            <h2 style={{ fontSize: 16, marginTop: 24 }}>提交的 Value</h2>
            <pre
              style={{
                background: '#f5f5f5',
                borderRadius: 4,
                padding: 12,
                overflowX: 'auto',
              }}
            >
              {JSON.stringify(submitted.values, null, 2)}
            </pre>

            <h2 style={{ fontSize: 16 }}>候选 Snapshot</h2>
            <pre
              style={{
                background: '#f5f5f5',
                borderRadius: 4,
                padding: 12,
                overflowX: 'auto',
              }}
            >
              {JSON.stringify(submitted.snapshot, null, 2)}
            </pre>
          </section>
        ) : null}
      </main>
    </FormEngineProvider>
  );
}
