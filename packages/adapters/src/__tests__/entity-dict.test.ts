import { describe, expect, it } from 'vitest';
import { createDictSnapshot } from '../dict';
import {
  createEntitySnapshots,
  normalizeEntityValue,
  type EntityRef,
} from '../entity';

describe('normalizeEntityValue', () => {
  it('单选只存稳定 ID，空值归一为 null', () => {
    expect(normalizeEntityValue('u_10001', false)).toBe('u_10001');
    expect(normalizeEntityValue({ id: 'u_10001', name: '张三' }, false)).toBe(
      'u_10001'
    );
    expect(normalizeEntityValue(null, false)).toBeNull();
    expect(normalizeEntityValue(undefined, false)).toBeNull();
    expect(normalizeEntityValue([], false)).toBeNull();
    // 不把展示名称写入 Value
    expect(
      JSON.stringify(normalizeEntityValue({ id: 'u_1', name: '张三' }, false))
    ).not.toContain('张三');
  });

  it('多选去重保序，空值为 []', () => {
    expect(
      normalizeEntityValue(['u_1', 'u_2', 'u_1', { id: 'u_3' }], true)
    ).toEqual(['u_1', 'u_2', 'u_3']);
    expect(normalizeEntityValue(null, true)).toEqual([]);
    expect(normalizeEntityValue([], true)).toEqual([]);
  });
});

describe('createEntitySnapshots', () => {
  it('冻结展示信息，未知 ID 保留并标记 missing', () => {
    const directory = new Map<string, EntityRef>([
      ['u_1', { id: 'u_1', name: '张三', departmentName: '研发部' }],
    ]);
    const snapshots = createEntitySnapshots(['u_1', 'u_404'], directory);

    expect(snapshots[0]).toMatchObject({
      id: 'u_1',
      name: '张三',
      departmentName: '研发部',
    });
    expect(snapshots[1]).toEqual({ id: 'u_404', name: '', missing: true });
  });

  it('组织改名不影响历史快照（返回副本）', () => {
    const directory = new Map<string, EntityRef>([
      ['d_1', { id: 'd_1', name: '研发部' }],
    ]);
    const snapshot = createEntitySnapshots(['d_1'], directory)[0];
    directory.set('d_1', { id: 'd_1', name: '产品部' });
    expect(snapshot.name).toBe('研发部');
  });
});

describe('createDictSnapshot', () => {
  it('冻结 label 与字典版本，缺失选项不伪造 label', () => {
    const options = [
      { label: '事假', value: 1 },
      { label: '年假', value: 2 },
    ];
    expect(createDictSnapshot(1, options, 'leave_type', '2026-01')).toEqual({
      value: 1,
      label: '事假',
      dictCode: 'leave_type',
      dictVersion: '2026-01',
    });
    expect(createDictSnapshot(99, options, 'leave_type').label).toBeNull();
    expect(createDictSnapshot(99, options, 'leave_type').missing).toBe(true);
  });
});
