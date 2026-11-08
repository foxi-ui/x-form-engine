import { describe, expect, it } from 'vitest';
import {
  createItemId,
  extractStableItemKey,
  joinFieldId,
} from './field-identity';

describe('joinFieldId', () => {
  it('用 . 连接字段 name 得到稳定身份', () => {
    expect(joinFieldId(['period', 'start'])).toBe('period.start');
    expect(joinFieldId(['applicant'])).toBe('applicant');
  });
});

describe('extractStableItemKey', () => {
  it('优先取 id / key', () => {
    expect(extractStableItemKey({ id: 'row_1' })).toBe('row_1');
    expect(extractStableItemKey({ key: 'row_2' })).toBe('row_2');
    expect(extractStableItemKey({ id: 7 })).toBe('7');
  });

  it('空 id / 非对象返回 undefined', () => {
    expect(extractStableItemKey({ id: '' })).toBeUndefined();
    expect(extractStableItemKey('x')).toBeUndefined();
    expect(extractStableItemKey(['x'])).toBeUndefined();
    expect(extractStableItemKey(null)).toBeUndefined();
  });
});

describe('createItemId', () => {
  it('有显式 id 时稳定', () => {
    expect(createItemId({ id: 'row_1', name: 'A' }, 0)).toEqual({
      itemId: 'row_1',
      stable: true,
    });
  });

  it('无 id 时用内容摘要保证相同内容相同身份', () => {
    const a = createItemId({ name: 'A' }, 0);
    const b = createItemId({ name: 'A' }, 1);
    expect(a.itemId).toBe(b.itemId);
    expect(a.stable).toBe(true);
  });

  it('不同内容产生不同摘要', () => {
    expect(createItemId({ name: 'A' }, 0).itemId).not.toBe(
      createItemId({ name: 'B' }, 1).itemId
    );
  });

  it('行内显式 id 相同则身份相同，不受行序影响', () => {
    expect(createItemId({ id: 'r1' }, 0).itemId).toBe(
      createItemId({ id: 'r1' }, 5).itemId
    );
  });
});
