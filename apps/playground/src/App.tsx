import { Button, Input, message, Modal } from 'antd';
import { basicComponents, basicDecorators } from '@x-form-engine/components';
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
 * 从 localStorage 加载设计器导出的 Schema 文档（跨应用：designer-demo 保存 →
 * playground 渲染）。无导入时回退到下方 `demoSchema`。
 */
function loadImportedDoc(): {
  schema: Record<string, unknown>;
  schemaId?: string;
  schemaVersion?: number;
} | null {
  try {
    const raw = localStorage.getItem('x-form-engine:playground:schema');
    if (!raw) {
      return null;
    }
    const doc = JSON.parse(raw) as Record<string, unknown>;
    const schema = 'schema' in doc ? (doc.schema as Record<string, unknown>) : doc;
    if (!schema || typeof schema !== 'object') {
      return null;
    }
    return {
      schema,
      schemaId: typeof doc.schemaId === 'string' ? doc.schemaId : undefined,
      schemaVersion: typeof doc.version === 'number' ? doc.version : undefined,
    };
  } catch {
    return null;
  }
}

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
      'x-decorator': 'FormItem',
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
      'x-decorator': 'FormItem',
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
      'x-decorator': 'FormItem',
      'x-component': 'DatePicker',
      'x-component-props': {
        placeholder: '请选择入职日期',
        style: { width: 320 },
      },
    },
    备注: {
      type: 'string',
      title: '备注',
      'x-decorator': 'FormItem',
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
        decorators: basicDecorators,
        plugins: [defaultFormattersPlugin],
      }),
    []
  );

  useEffect(() => () => engine.dispose(), [engine]);

  const imported = useMemo(() => loadImportedDoc(), []);
  const [importedState, setImportedState] = useState<{
    schema: Record<string, unknown>;
    schemaId?: string;
    schemaVersion?: number;
  } | null>(null);
  const [importVisible, setImportVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const effectiveImported = importedState ?? imported;
  const renderSchema = effectiveImported?.schema ?? demoSchema;
  const schemaId = effectiveImported?.schemaId ?? 'demo-employee';
  const schemaVersion = effectiveImported?.schemaVersion ?? 1;

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

  const handleImport = () => {
    try {
      const doc = JSON.parse(importText) as Record<string, unknown>;
      const schema = 'schema' in doc ? (doc.schema as Record<string, unknown>) : doc;
      if (!schema || typeof schema !== 'object') {
        throw new Error('schema 不是对象');
      }
      localStorage.setItem('x-form-engine:playground:schema', importText.trim());
      setImportedState({
        schema,
        schemaId: typeof doc.schemaId === 'string' ? doc.schemaId : undefined,
        schemaVersion: typeof doc.version === 'number' ? doc.version : undefined,
      });
      setImportVisible(false);
      setSubmitted(null);
      message.success('已导入 Schema');
    } catch (error) {
      message.error(`导入失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <FormEngineProvider engine={engine}>
      <main style={pageStyle}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>x-form-engine playground</h1>
        <p style={{ color: '#666', marginTop: 0 }}>
          M3 演示：填写 → 提交生成 Value + 候选 Snapshot → 只读历史还原。
        </p>

        <div style={{ marginBottom: 12 }}>
          <Button size="small" onClick={() => setImportVisible(true)}>
            导入 Schema
          </Button>
        </div>

        <FormRenderer
          ref={formRef}
          schema={renderSchema}
          schemaId={schemaId}
          schemaVersion={schemaVersion}
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
              <ReadonlyRenderer schema={renderSchema} snapshot={submitted.snapshot} />
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

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16 }}>Schema</h2>
          <pre
            style={{
              background: '#f5f5f5',
              borderRadius: 4,
              padding: 12,
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(renderSchema, null, 2)}
          </pre>
        </section>

        <Modal
          title="导入 Schema"
          visible={importVisible}
          onCancel={() => setImportVisible(false)}
          width={720}
          footer={[
            <Button key="import" type="primary" onClick={handleImport}>
              导入
            </Button>,
            <Button key="cancel" onClick={() => setImportVisible(false)}>
              取消
            </Button>,
          ]}
        >
          <p style={{ color: '#666' }}>粘贴设计器「导出」的 Schema JSON：</p>
          <Input.TextArea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            autoSize={{ minRows: 10, maxRows: 22 }}
            placeholder='{"schemaId":"...","schema":{...}}'
            style={{ fontFamily: 'monospace' }}
          />
        </Modal>
      </main>
    </FormEngineProvider>
  );
}
