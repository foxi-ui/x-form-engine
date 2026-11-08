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

  it('快照深拷贝 Date/File/Blob，不被后续修改污染', () => {
    const date = new Date('2026-11-08T00:00:00.000Z');
    const file = new File(['hello'], 'a.txt', { type: 'text/plain' });
    const blob = new Blob(['world'], { type: 'text/plain' });

    const { snapshot } = createCandidateSnapshot(
      engine,
      {
        type: 'object',
        properties: {
          when: { type: 'string', 'x-component': 'DatePicker' },
          attach: { type: 'string', 'x-component': 'Upload' },
          blob: { type: 'string', 'x-component': 'Upload' },
        },
      },
      { when: date, attach: file, blob }
    );

    expect(snapshot.fields.when.value).not.toBe(date);
    expect(snapshot.fields.attach.value).not.toBe(file);
    expect(snapshot.fields.blob.value).not.toBe(blob);
    expect((snapshot.fields.when.value as Date).getTime()).toBe(date.getTime());

    date.setFullYear(2030);
    expect((snapshot.fields.when.value as Date).getFullYear()).toBe(2026);
  });

  it('对象数组行内 Date 也深拷贝', () => {
    const rowDate = new Date('2026-01-01T00:00:00.000Z');
    const { snapshot } = createCandidateSnapshot(
      engine,
      {
        type: 'object',
        properties: {
          rows: {
            type: 'array',
            'x-component': 'ArrayTable',
            items: {
              type: 'object',
              properties: { at: { type: 'string', 'x-component': 'DatePicker' } },
            },
          },
        },
      },
      { rows: [{ id: 'r1', at: rowDate }] }
    );

    const rowField = snapshot.fields.rows.items?.[0].fields['rows.0.at'];
    expect(rowField?.value).not.toBe(rowDate);
    rowDate.setFullYear(2030);
    expect((rowField?.value as Date).getFullYear()).toBe(2026);
  });
});
