import { createFormEngine } from '@x-form-engine/core';
import type { ComponentAdapter, ComponentBinding } from '@x-form-engine/types';
import { describe, expect, it } from 'vitest';
import { normalizeEntityValue } from '../entity';
import { normalizeFormValues } from '../value';

function makeBinding(name: string, adapter?: ComponentAdapter): ComponentBinding {
  return {
    protocol: {
      name,
      version: '1.0.0',
      meta: { title: name, category: 'test' },
      capabilities: { editable: true, readonly: true, mobile: false },
      schema: { type: 'object' },
      ...(adapter ? { adapter } : {}),
    },
    implementations: {},
  };
}

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: '姓名', 'x-component': 'Input' },
    applicant: { type: 'string', title: '申请人', 'x-component': 'UserSelect' },
  },
};

describe('normalizeFormValues', () => {
  it('无 adapter 的字段透传 primitive', () => {
    const engine = createFormEngine({ components: [makeBinding('Input')] });
    const result = normalizeFormValues(engine, schema, { name: '张三' });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.value.name).toBe('张三');
  });

  it('应用组件 adapter 归一', () => {
    const adapter: ComponentAdapter = {
      normalizeValue: (value) => normalizeEntityValue(value, false),
    };
    const engine = createFormEngine({
      components: [makeBinding('Input'), makeBinding('UserSelect', adapter)],
    });
    const result = normalizeFormValues(engine, schema, {
      name: '张三',
      applicant: { id: 'u_1', name: '张三' },
    });
    expect(result.value.applicant).toBe('u_1');
    expect(result.errors).toEqual([]);
  });

  it('adapter 抛错时记录 error 并保留原值', () => {
    const adapter: ComponentAdapter = {
      normalizeValue: () => {
        throw new Error('bad input');
      },
    };
    const engine = createFormEngine({
      components: [makeBinding('UserSelect', adapter)],
    });
    const result = normalizeFormValues(engine, schema, {
      applicant: { id: 'u_1' },
    });
    expect(result.value.applicant).toEqual({ id: 'u_1' });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].path).toBe('applicant');
    expect(result.errors[0].code).toBe('ADAPTER_THREW');
  });

  it('adapter 通过 context.warn 记录告警', () => {
    const adapter: ComponentAdapter = {
      normalizeValue: (value, context) => {
        context.warn?.('DUPLICATE', '重复已去重');
        return value;
      },
    };
    const engine = createFormEngine({
      components: [makeBinding('Input', adapter)],
    });
    const result = normalizeFormValues(engine, schema, { name: 'x' });
    expect(result.warnings).toEqual([
      { path: 'name', code: 'DUPLICATE', message: '重复已去重' },
    ]);
  });
});
