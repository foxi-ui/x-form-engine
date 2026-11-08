import { useField } from '@formily/react';
import {
  basicComponents as mobileBasicComponents,
  basicDecorators as mobileBasicDecorators,
} from '@x-form-engine/components/mobile';
import {
  FormEngineProvider,
  FormRenderer,
  ReadonlyRenderer,
  createFormEngine,
  defaultFormattersPlugin,
} from '@x-form-engine/sdk';
import type {
  ComponentBinding,
  ComponentProtocolDefinition,
  FormRendererInstance,
  FormSubmitResult,
  PlatformFallbackDiagnostic,
  ReadonlyComponentProps,
} from '@x-form-engine/sdk';
import { Button } from 'antd-mobile';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';

/**
 * 纯 PC 的遗留组件：用于演示移动端缺少实现时的回退诊断。
 *
 * 只依赖 `@formily/react` 的 `useField()` + 原生 `<input>`，
 * 不引入 `antd` / `@formily/antd`，避免桌面产物混入移动端 bundle。
 */
function LegacyNote(): JSX.Element {
  // `useField` 默认泛型是 `GeneralField`（含 VoidField，无 value）；
  // 这里只看需要的结构，避免把 Formily 内部类型扩散到应用代码。
  const field = useField<{ value?: unknown }>();
  const value = field.value;

  return (
    <input
      aria-label="遗留备注"
      value={value == null ? '' : String(value)}
      onChange={(event) => {
        field.value = event.target.value;
      }}
      style={{
        width: '100%',
        padding: '8px 12px',
        boxSizing: 'border-box',
        border: '1px solid #ddd',
        borderRadius: 6,
      }}
    />
  );
}

/** LegacyNote 的只读实现（无快照 displayValue 时回退原始值）。 */
function LegacyNoteReadonly(props: ReadonlyComponentProps): JSX.Element {
  const display = props.snapshotValue ?? props.value;
  return <span>{display == null ? '' : String(display)}</span>;
}

const legacyNoteProtocol: ComponentProtocolDefinition = {
  name: 'LegacyNote',
  version: '1.0.0',
  meta: { title: '遗留备注（PC 专用组件）', category: 'basic' },
  capabilities: { editable: true, readonly: true, mobile: false },
  schema: {
    type: 'object',
    properties: { placeholder: { type: 'string' } },
  },
};

/**
 * 本地定义的 pc-only 组件绑定：`implementations` 只有 `pc`，
 * 移动端渲染时 renderer 会回退到 pc 实现并派发 `PlatformFallbackDiagnostic`。
 */
const legacyNoteBinding: ComponentBinding<
  ComponentType<unknown>,
  ComponentType<ReadonlyComponentProps>
> = {
  protocol: legacyNoteProtocol,
  implementations: { pc: LegacyNote as ComponentType<unknown> },
  readonly: { default: LegacyNoteReadonly },
};

/**
 * 验收 schema：覆盖移动端七类 P0 组件。
 *
 * `出差天数` 复刻 M1 集成测试的 `x-reactions` 日期差表达式，
 * 用来验证移动端仍复用 Formily 的 effects / reactions 能力。
 */
const demoSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    姓名: {
      type: 'string',
      title: '姓名',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
      'x-component-props': { placeholder: '请输入姓名' },
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
      'x-component-props': { placeholder: '请选择部门' },
      'x-validator': [{ required: true, message: '请选择部门' }],
    },
    出差事由: {
      type: 'string',
      title: '出差事由',
      'x-decorator': 'FormItem',
      'x-component': 'Textarea',
      'x-component-props': { placeholder: '请填写出差事由', rows: 3 },
    },
    出发日期: {
      type: 'string',
      title: '出发日期',
      'x-decorator': 'FormItem',
      'x-component': 'DatePicker',
      'x-component-props': { placeholder: '请选择出发日期' },
      'x-validator': [{ required: true, message: '请选择出发日期' }],
    },
    返回日期: {
      type: 'string',
      title: '返回日期',
      'x-decorator': 'FormItem',
      'x-component': 'DatePicker',
      'x-component-props': { placeholder: '请选择返回日期' },
    },
    出差天数: {
      type: 'number',
      title: '出差天数',
      'x-decorator': 'FormItem',
      'x-component': 'Number',
      'x-reactions': {
        dependencies: ['出发日期', '返回日期'],
        fulfill: {
          state: {
            value:
              '{{ $deps[1] && $deps[0] ? (new Date($deps[1]) - new Date($deps[0])) / 86400000 : 0 }}',
          },
        },
      },
    },
    是否紧急: {
      type: 'string',
      title: '是否紧急',
      'x-decorator': 'FormItem',
      'x-component': 'Radio',
      enum: [
        { label: '是', value: 'yes' },
        { label: '否', value: 'no' },
      ],
    },
    随行人员: {
      type: 'array',
      title: '随行人员',
      'x-decorator': 'FormItem',
      'x-component': 'Checkbox',
      enum: [
        { label: '张三', value: 'zhangsan' },
        { label: '李四', value: 'lisi' },
        { label: '王五', value: 'wangwu' },
      ],
    },
    LegacyNote: {
      type: 'string',
      title: '遗留备注（PC 专用组件）',
      'x-decorator': 'FormItem',
      'x-component': 'LegacyNote',
      'x-component-props': { placeholder: '该字段只在 PC 端有实现' },
    },
  },
};

const pageStyle = {
  maxWidth: 480,
  margin: '0 auto',
  padding: '16px 16px 48px',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", sans-serif',
} as const;

const sectionStyle = {
  marginTop: 24,
} as const;

const preStyle = {
  background: '#f5f5f5',
  borderRadius: 8,
  padding: 12,
  overflowX: 'auto',
  fontSize: 12,
} as const;

export default function App(): JSX.Element {
  // Engine 全应用只创建一次；卸载时统一释放。
  const engine = useMemo(
    () =>
      createFormEngine({
        platform: 'mobile',
        locale: 'zh-CN',
        components: [...mobileBasicComponents, legacyNoteBinding],
        decorators: mobileBasicDecorators,
        plugins: [defaultFormattersPlugin],
      }),
    []
  );

  useEffect(() => () => engine.dispose(), [engine]);

  const formRef = useRef<FormRendererInstance>(null);
  const [diagnostics, setDiagnostics] = useState<PlatformFallbackDiagnostic[]>([]);
  const [submitted, setSubmitted] = useState<FormSubmitResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDiagnostic = useCallback((diagnostic: PlatformFallbackDiagnostic) => {
    setDiagnostics((prev) => [...prev, diagnostic]);
  }, []);

  const handleSubmit = useCallback(async () => {
    setErrorMessage(null);

    try {
      const result = await formRef.current?.submit();

      if (!result) {
        return;
      }

      console.log('[mobile-demo] submit values =', result.values);
      console.log('[mobile-demo] submit snapshot =', result.snapshot);
      setSubmitted(result);
    } catch (error: unknown) {
      console.error('[mobile-demo] submit failed =', error);
      setErrorMessage('校验未通过：请先补全必填项（姓名 / 部门 / 出发日期）。');
    }
  }, []);

  return (
    <FormEngineProvider engine={engine}>
      <main style={pageStyle}>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>x-form-engine mobile demo</h1>
        <p style={{ color: '#666', marginTop: 0 }}>
          移动端验收：七类 P0 组件、必填校验、提交生成 Value + Snapshot、只读还原，
          以及 pc-only 组件回退诊断。
        </p>

        <FormRenderer
          ref={formRef}
          schema={demoSchema}
          schemaId="mobile-travel-apply"
          schemaVersion={1}
          platform="mobile"
          onDiagnostic={handleDiagnostic}
        />

        <Button block color="primary" onClick={handleSubmit} style={{ marginTop: 16 }}>
          提交
        </Button>

        {errorMessage ? (
          <p style={{ color: '#cf1322', marginTop: 12 }}>{errorMessage}</p>
        ) : null}

        <section style={sectionStyle}>
          <h2 style={{ fontSize: 16 }}>平台回退诊断</h2>
          {diagnostics.length === 0 ? (
            <p style={{ color: '#666' }}>当前 Schema 引用的组件均有移动端实现。</p>
          ) : (
            <ul style={{ paddingLeft: 20 }}>
              {diagnostics.map((diagnostic) => (
                <li key={`${diagnostic.kind}:${diagnostic.name}`}>
                  {diagnostic.kind === 'component' ? '组件' : '装饰器'}{' '}
                  <code>{diagnostic.name}</code> 缺少 {diagnostic.requestedPlatform} 实现，
                  已回退到 {diagnostic.fallbackPlatform} 实现。
                </li>
              ))}
            </ul>
          )}
        </section>

        {submitted ? (
          <section style={sectionStyle}>
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
                schema={demoSchema}
                snapshot={submitted.snapshot}
                values={submitted.values}
              />
            </div>

            <h2 style={{ fontSize: 16, marginTop: 24 }}>提交的 Value</h2>
            <pre style={preStyle}>{JSON.stringify(submitted.values, null, 2)}</pre>

            <h2 style={{ fontSize: 16 }}>候选 Snapshot</h2>
            <pre style={preStyle}>{JSON.stringify(submitted.snapshot, null, 2)}</pre>
          </section>
        ) : null}
      </main>
    </FormEngineProvider>
  );
}
