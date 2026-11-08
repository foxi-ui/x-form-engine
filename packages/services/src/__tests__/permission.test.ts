import type { PermissionEnvelope } from '@x-form-engine/types';
import { describe, expect, it } from 'vitest';
import {
  canSubmit,
  filterWritableValues,
  resolveFieldAccess,
  resolveFormAccess,
} from '../permission';

const envelope: PermissionEnvelope = {
  version: 7,
  form: { read: true, submit: true },
  fields: {
    name: { read: true, write: true },
    idCard: { read: true, write: false },
    salary: { read: false, write: false },
  },
};

describe('resolveFieldAccess', () => {
  it('缺少权限信封时 fail-closed', () => {
    expect(resolveFieldAccess({ path: 'name' })).toEqual({
      read: false,
      write: false,
      reason: 'CONTEXT_MISSING',
    });
  });

  it('权限信封版本过期时拒绝', () => {
    expect(
      resolveFieldAccess({ envelope, expectedVersion: 8, path: 'name' })
    ).toEqual({
      read: false,
      write: false,
      reason: 'STALE_VERSION',
    });
  });

  it('表单整体不可读时所有字段拒绝', () => {
    const denied = { ...envelope, form: { read: false, submit: false } };
    expect(resolveFieldAccess({ envelope: denied, path: 'name' })).toMatchObject(
      { read: false, write: false, reason: 'FORM_READ_DENIED' }
    );
  });

  it('字段未声明时默认拒绝', () => {
    expect(resolveFieldAccess({ envelope, path: 'unknownField' })).toEqual({
      read: false,
      write: false,
    });
  });

  it('支持只读/可写/不可见三态', () => {
    expect(resolveFieldAccess({ envelope, path: 'name' })).toEqual({
      read: true,
      write: true,
    });
    expect(resolveFieldAccess({ envelope, path: 'idCard' })).toEqual({
      read: true,
      write: false,
    });
    expect(resolveFieldAccess({ envelope, path: 'salary' })).toEqual({
      read: false,
      write: false,
    });
  });

  it('Schema 权限提示只能收紧，不能提权', () => {
    expect(
      resolveFieldAccess({
        envelope,
        path: 'name',
        schemaHint: { read: false, write: false },
      })
    ).toEqual({ read: false, write: false });

    expect(
      resolveFieldAccess({
        envelope,
        path: 'salary',
        schemaHint: { read: true, write: true },
      })
    ).toEqual({ read: false, write: false });
  });
});

describe('resolveFormAccess / canSubmit', () => {
  it('提交动作需要独立 submit 权限且 fail-closed', () => {
    expect(canSubmit(undefined)).toBe(false);
    expect(canSubmit(envelope)).toBe(true);
    expect(canSubmit(envelope, 8)).toBe(false);
    expect(
      canSubmit({ ...envelope, form: { read: true, submit: false } })
    ).toBe(false);
  });

  it('表单级 read 为 false 时拒绝', () => {
    const denied = { ...envelope, form: { read: false, submit: true } };
    expect(resolveFormAccess(denied)).toMatchObject({
      read: false,
      submit: false,
      reason: 'FORM_READ_DENIED',
    });
  });
});

describe('filterWritableValues', () => {
  it('提交前剔除无写权限字段', () => {
    const values = { name: '张三', idCard: '110101...', salary: 10000 };
    expect(filterWritableValues(envelope, values)).toEqual({ name: '张三' });
  });

  it('无权限信封时剔除全部', () => {
    expect(filterWritableValues(undefined, { name: '张三' })).toEqual({});
  });
});
