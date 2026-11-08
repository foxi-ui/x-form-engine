import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { createFormEngine } from '@x-form-engine/core';
import { basicComponents } from '@x-form-engine/components';
import { defaultFormattersPlugin } from '@x-form-engine/services';
import { describe, expect, it } from 'vitest';
import { FormEngineProvider } from '../context';
import { FormRenderer } from '../FormRenderer';
import { ReadonlyRenderer } from '../readonly/ReadonlyRenderer';
import type { FormRendererInstance } from '../types';

/**
 * M3 最小闭环验证：编辑态渲染 → 填写 → 校验 → 提交（Value + 候选快照）→
 * 独立只读渲染器按冻结快照还原历史展示。
 *
 * 后端环节（权威补全 / 原子持久化 / 鉴权）不在本仓库范围内，对应 roadmap §7
 * 的「后端校验生成 Canonical Snapshot、原子保存、读取历史记录」步骤。
 */
const tripSchema = {
  type: 'object',
  properties: {
    申请人: {
      type: 'string',
      title: '申请人',
      'x-component': 'Input',
      'x-validator': [{ required: true, message: '请填写申请人' }],
    },
    部门: {
      type: 'string',
      title: '所属部门',
      'x-component': 'Select',
      enum: [
        { label: '研发部', value: 'rd' },
        { label: '产品部', value: 'product' },
      ],
    },
  },
};

describe('M3 最小闭环：填写 → 提交 → 快照 → 只读还原', () => {
  it('端到端闭环', async () => {
    const engine = createFormEngine({
      components: basicComponents,
      plugins: [defaultFormattersPlugin],
    });
    const ref = createRef<FormRendererInstance>();

    // 1. 编辑态渲染（初始值：部门 = 研发部）
    const { unmount } = render(
      <FormEngineProvider engine={engine}>
        <FormRenderer
          ref={ref}
          schema={tripSchema}
          schemaId="trip"
          schemaVersion={1}
          initialValues={{ 部门: 'rd' }}
        />
      </FormEngineProvider>
    );

    // 2. 填写申请人
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '张三' } });

    // 3. 提交 → 标准化 Value + 候选快照（枚举 label 冻结）
    const result = await ref.current!.submit();
    expect(result.schemaId).toBe('trip');
    expect(result.values).toMatchObject({ 申请人: '张三', 部门: 'rd' });
    expect(result.snapshot.fields['申请人'].value).toBe('张三');
    expect(result.snapshot.fields['部门'].displayValue).toBe('研发部');

    // 4. 卸载编辑态，用快照做历史只读还原（不创建 Formily Form）
    unmount();
    render(
      <FormEngineProvider engine={engine}>
        <ReadonlyRenderer schema={tripSchema} snapshot={result.snapshot} />
      </FormEngineProvider>
    );

    // 5. 只读展示还原字段标题 + 冻结展示值
    expect(screen.getByText('申请人')).toBeTruthy();
    expect(screen.getByText('张三')).toBeTruthy();
    expect(screen.getByText('所属部门')).toBeTruthy();
    expect(screen.getByText('研发部')).toBeTruthy();
  });
});
