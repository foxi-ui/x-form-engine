import { basicComponents } from '@x-form-engine/components';
import {
  FormEngineProvider,
  FormRenderer,
  createFormEngine,
} from '@x-form-engine/sdk';
import type { FormRendererInstance } from '@x-form-engine/sdk';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * M1 演示 schema：使用 `basicComponents` 中已登记的 Input / Select / DatePicker / Textarea。
 *
 * 说明：M1 的 Formily 适配层尚未注册装饰器（`x-decorator`），因此字段标签
 * 暂时通过 placeholder 呈现；装饰器适配列入 M2。
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
      }),
    []
  );

  useEffect(() => () => engine.dispose(), [engine]);

  const formRef = useRef<FormRendererInstance>(null);
  const [submittedValues, setSubmittedValues] = useState<Record<string, unknown> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setErrorMessage(null);

    try {
      const result = await formRef.current?.submit();

      if (!result) {
        return;
      }

      // M1 验收点：提交成功后打印标准化 Value。
      console.log('[playground] submit values =', result.values);
      setSubmittedValues(result.values);
    } catch (error: unknown) {
      // Formily 校验失败时 submit() 会 reject（errors 数组），此处做非阻塞提示。
      console.error('[playground] submit failed =', error);
      setErrorMessage('校验未通过：请先补全必填项（详情见控制台）。');
    }
  }, []);

  return (
    <FormEngineProvider engine={engine}>
      <main style={pageStyle}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>x-form-engine playground</h1>
        <p style={{ color: '#666', marginTop: 0 }}>
          M1 演示：创建 Engine → 渲染 Schema → 填写 → 提交打印 Value。
        </p>

        <FormRenderer ref={formRef} schema={demoSchema} />

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

        {submittedValues ? (
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 16 }}>提交的 Value</h2>
            <pre
              style={{
                background: '#f5f5f5',
                borderRadius: 4,
                padding: 12,
                overflowX: 'auto',
              }}
            >
              {JSON.stringify(submittedValues, null, 2)}
            </pre>
          </section>
        ) : null}
      </main>
    </FormEngineProvider>
  );
}
