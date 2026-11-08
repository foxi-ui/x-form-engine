import type { FormatterContext } from '@x-form-engine/types';
import { describe, expect, it } from 'vitest';
import {
  booleanFormatter,
  dateFormatter,
  entityFormatter,
  enumFormatter,
  numberFormatter,
  textFormatter,
} from '../formatters';

const ctx = (overrides: Partial<FormatterContext> = {}): FormatterContext => ({
  path: 'f',
  locale: 'zh-CN',
  ...overrides,
});

describe('基础 Formatter', () => {
  it('textFormatter：字符串原样，number/boolean 转字符串，其它 null', () => {
    expect(textFormatter('abc', ctx())).toBe('abc');
    expect(textFormatter(1, ctx())).toBe('1');
    expect(textFormatter(true, ctx())).toBe('true');
    expect(textFormatter(null, ctx())).toBeNull();
  });

  it('numberFormatter / booleanFormatter', () => {
    expect(numberFormatter(3.14, ctx())).toBe('3.14');
    expect(numberFormatter('x', ctx())).toBeNull();
    expect(booleanFormatter(true, ctx())).toBe('是');
    expect(booleanFormatter(false, ctx())).toBe('否');
  });

  it('dateFormatter：字符串原样，非法返回 null', () => {
    expect(dateFormatter('2026-11-10', ctx())).toBe('2026-11-10');
    expect(dateFormatter('not-a-date', ctx())).toBe('not-a-date');
    expect(dateFormatter(null, ctx())).toBeNull();
  });

  it('enumFormatter：解析单选/多选 label，缺失返回 null', () => {
    const enumCtx = ctx({
      schema: {
        'x-component-props': {
          options: [
            { label: '事假', value: 1 },
            { label: '年假', value: 2 },
          ],
        },
      },
    });
    expect(enumFormatter(1, enumCtx)).toBe('事假');
    expect(enumFormatter([1, 2], enumCtx)).toBe('事假、年假');
    expect(enumFormatter(99, enumCtx)).toBeNull();
  });

  it('entityFormatter：优先冻结 snapshot 展示名，缺失回退 ID', () => {
    expect(
      entityFormatter(
        'u_1',
        ctx({ snapshotValue: { id: 'u_1', name: '张三' } })
      )
    ).toBe('张三');
    expect(
      entityFormatter(['u_1', 'u_2'], ctx({ snapshotValue: ['张三', '李四'] }))
    ).toBe('张三、李四');
    expect(entityFormatter('u_1', ctx())).toBe('u_1');
    expect(entityFormatter(null, ctx())).toBeNull();
  });
});
