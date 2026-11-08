import { render, screen } from '@testing-library/react';
import { createFormEngine } from '@x-form-engine/core';
import { basicComponents } from '@x-form-engine/components';
import { defaultFormattersPlugin } from '@x-form-engine/services';
import { describe, expect, it } from 'vitest';
import { FormEngineProvider } from '../context';
import { ReadonlyRenderer } from '../readonly/ReadonlyRenderer';

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: '姓名', 'x-component': 'Input' },
    leaveType: {
      type: 'number',
      title: '请假类型',
      'x-component': 'Select',
      'x-component-props': {
        options: [{ label: '事假', value: 1 }],
      },
    },
  },
};

function renderReadonly(ui: React.ReactElement): void {
  const engine = createFormEngine({
    components: basicComponents,
    plugins: [defaultFormattersPlugin],
  });
  render(<FormEngineProvider engine={engine}>{ui}</FormEngineProvider>);
}

function PcReadonly(): React.ReactElement {
  return <span>readonly-pc</span>;
}
function MobileReadonly(): React.ReactElement {
  return <span>readonly-mobile</span>;
}
const platformReadonlyBinding = {
  protocol: {
    name: 'Probe',
    version: '1',
    meta: { title: 'P' },
    capabilities: { editable: true, readonly: true, mobile: true },
    schema: { type: 'object' as const },
  },
  implementations: {},
  readonly: { pc: PcReadonly, mobile: MobileReadonly },
};

describe('ReadonlyRenderer', () => {
  it('无快照时按 values 降级显示', () => {
    renderReadonly(
      <ReadonlyRenderer schema={schema} values={{ name: '张三' }} />
    );
    expect(screen.getByText('张三')).toBeTruthy();
  });

  it('无快照时按 Schema 静态规则解析枚举 label', () => {
    renderReadonly(<ReadonlyRenderer schema={schema} values={{ leaveType: 1 }} />);
    expect(screen.getByText('事假')).toBeTruthy();
  });

  it('有快照时优先显示冻结 displayValue', () => {
    renderReadonly(
      <ReadonlyRenderer
        schema={schema}
        snapshot={{
          snapshotVersion: '1.0.0',
          schemaId: 's',
          schemaVersion: 1,
          createdAt: 'x',
          fields: {
            leaveType: {
              path: 'leaveType',
              component: 'Select',
              value: 1,
              displayValue: '年假',
            },
          },
        }}
        values={{ leaveType: 1 }}
      />
    );
    // 即使 values 可解析出「事假」，也优先显示冻结的「年假」
    expect(screen.getByText('年假')).toBeTruthy();
    expect(screen.queryByText('事假')).toBeNull();
  });

  it('未知组件降级显示原始值 + 诊断标记', () => {
    renderReadonly(
      <ReadonlyRenderer
        schema={{
          type: 'object',
          properties: { x: { type: 'string', 'x-component': 'Ghost' } },
        }}
        values={{ x: 'abc' }}
      />
    );
    expect(screen.getByText(/abc/)).toBeTruthy();
    expect(screen.getByText('（未知组件）')).toBeTruthy();
  });

  it('不可读字段不渲染', () => {
    renderReadonly(
      <ReadonlyRenderer
        schema={schema}
        values={{ name: '张三', leaveType: 1 }}
        permission={{
          version: 1,
          form: { read: true, submit: true },
          fields: {
            name: { read: true, write: true },
            leaveType: { read: false, write: false },
          },
        }}
      />
    );
    expect(screen.getByText('张三')).toBeTruthy();
    expect(screen.queryByText('事假')).toBeNull();
  });

  it('嵌套对象递归渲染子字段', () => {
    renderReadonly(
      <ReadonlyRenderer
        schema={{
          type: 'object',
          properties: {
            period: {
              type: 'object',
              properties: {
                start: { type: 'string', title: '开始日期', 'x-component': 'Input' },
              },
            },
          },
        }}
        values={{ period: { start: '2026-11-10' } }}
      />
    );
    expect(screen.getByText('2026-11-10')).toBeTruthy();
    expect(screen.getByText('开始日期')).toBeTruthy();
  });

  it('platform 未传时回退到 engine.options.platform', () => {
    const engine = createFormEngine({
      platform: 'mobile',
      components: [platformReadonlyBinding],
    });
    render(
      <FormEngineProvider engine={engine}>
        <ReadonlyRenderer
          schema={{ type: 'object', properties: { f: { type: 'string', 'x-component': 'Probe' } } }}
          values={{ f: 'x' }}
        />
      </FormEngineProvider>
    );
    expect(screen.getByText('readonly-mobile')).toBeTruthy();
    expect(screen.queryByText('readonly-pc')).toBeNull();
  });
});
