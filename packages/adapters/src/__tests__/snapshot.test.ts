import { createFormEngine } from '@x-form-engine/core';
import { SNAPSHOT_VERSION } from '@x-form-engine/types';
import type { ComponentBinding } from '@x-form-engine/types';
import { describe, expect, it } from 'vitest';
import { createCandidateSnapshot } from '../snapshot';

function makeBinding(name: string): ComponentBinding {
  return {
    protocol: {
      name,
      version: '1.0.0',
      meta: { title: name, category: 'test' },
      capabilities: { editable: true, readonly: true, mobile: false },
      schema: { type: 'object' },
    },
    implementations: {},
  };
}

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: '姓名', 'x-component': 'Input' },
    leaveType: {
      type: 'number',
      title: '请假类型',
      'x-component': 'Select',
      'x-component-props': {
        options: [
          { label: '事假', value: 1 },
          { label: '年假', value: 2 },
        ],
      },
    },
    period: {
      type: 'object',
      properties: {
        start: { type: 'string', title: '开始日期', 'x-component': 'DatePicker' },
      },
    },
    members: {
      type: 'array',
      title: '出差人员',
      'x-component': 'ArrayTable',
      items: {
        type: 'object',
        properties: {
          approver: { type: 'string', title: '审批人', 'x-component': 'UserSelect' },
        },
      },
    },
  },
};

const engine = createFormEngine({
  components: [
    makeBinding('Input'),
    makeBinding('Select'),
    makeBinding('DatePicker'),
    makeBinding('ArrayTable'),
    makeBinding('UserSelect'),
  ],
});

describe('createCandidateSnapshot', () => {
  it('信封字段完整，叶字段捕获 title/component/componentVersion/value', () => {
    const { snapshot } = createCandidateSnapshot(
      engine,
      schema,
      { name: '张三' },
      { schemaId: 'leave-form', schemaVersion: 3 }
    );

    expect(snapshot.snapshotVersion).toBe(SNAPSHOT_VERSION);
    expect(snapshot.schemaId).toBe('leave-form');
    expect(snapshot.schemaVersion).toBe(3);
    expect(snapshot.fields.name).toMatchObject({
      path: 'name',
      fieldId: 'name',
      component: 'Input',
      componentVersion: '1.0.0',
      title: '姓名',
      value: '张三',
    });
  });

  it('枚举组件解析 label 并只冻结选中项', () => {
    const { snapshot } = createCandidateSnapshot(engine, schema, {
      leaveType: 1,
    });

    expect(snapshot.fields.leaveType.displayValue).toBe('事假');
    expect(snapshot.fields.leaveType.options).toEqual([
      { label: '事假', value: 1 },
    ]);
  });

  it('枚举缺失选项不伪造 label，标记 displayMissing', () => {
    const { snapshot } = createCandidateSnapshot(engine, schema, {
      leaveType: 99,
    });
    expect(snapshot.fields.leaveType.displayValue).toBeNull();
    expect(snapshot.fields.leaveType.metadata).toEqual({ displayMissing: true });
  });

  it('嵌套对象递归生成 path / fieldId', () => {
    const { snapshot } = createCandidateSnapshot(engine, schema, {
      period: { start: '2026-11-10' },
    });
    expect(snapshot.fields['period.start']).toMatchObject({
      path: 'period.start',
      fieldId: 'period.start',
      title: '开始日期',
      value: '2026-11-10',
    });
  });

  it('对象数组按 itemId 生成行级快照', () => {
    const { snapshot } = createCandidateSnapshot(engine, schema, {
      members: [
        { id: 'row_1', approver: 'u_1' },
        { id: 'row_2', approver: 'u_2' },
      ],
    });

    expect(snapshot.fields.members.items).toHaveLength(2);
    expect(snapshot.fields.members.items?.[0].itemId).toBe('row_1');
    expect(snapshot.fields.members.items?.[1].itemId).toBe('row_2');

    const rowField = snapshot.fields.members.items?.[0].fields['members.0.approver'];
    expect(rowField).toMatchObject({
      path: 'members.0.approver',
      fieldId: 'members.approver',
      value: 'u_1',
    });
  });

  it('无显式 id 的行用内容摘要保持相同内容相同身份', () => {
    const { snapshot, diagnostics } = createCandidateSnapshot(engine, schema, {
      members: [{ approver: 'u_1' }, { approver: 'u_1' }],
    });

    const [a, b] = snapshot.fields.members.items ?? [];
    expect(a.itemId).toBe(b.itemId);
    expect(diagnostics).toEqual([]);
  });

  it('未注册组件保留声明名，交由只读渲染器降级', () => {
    const { snapshot } = createCandidateSnapshot(
      engine,
      {
        type: 'object',
        properties: { mystery: { type: 'string', 'x-component': 'Ghost' } },
      },
      { mystery: 'x' }
    );
    expect(snapshot.fields.mystery.component).toBe('Ghost');
  });
});
