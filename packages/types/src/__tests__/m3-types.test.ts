import { expectTypeOf } from 'vitest';
import { SNAPSHOT_VERSION } from '../index';
import type {
  ComponentBinding,
  FieldSnapshot,
  FormSnapshot,
  Migration,
  PermissionEnvelope,
  ReadonlyImplementations,
} from '../index';

test('SNAPSHOT_VERSION 已冻结为 1.0.0', () => {
  expect(SNAPSHOT_VERSION).toBe('1.0.0');
});

test('ComponentBinding.readonly 默认实现类型为 unknown（types 无 UI 依赖）', () => {
  expectTypeOf<ComponentBinding['readonly']>().toEqualTypeOf<
    | { pc?: unknown; mobile?: unknown; default?: unknown }
    | undefined
  >();
});

test('FieldSnapshot 支持稳定 fieldId 与数组行快照', () => {
  expectTypeOf<FieldSnapshot['fieldId']>().toEqualTypeOf<string | undefined>();
  expectTypeOf<FieldSnapshot['items']>().toEqualTypeOf<
    | Array<{ itemId: string; fields: Record<string, FieldSnapshot> }>
    | undefined
  >();
});

test('FormSnapshot 字段以 path 为 key', () => {
  expectTypeOf<FormSnapshot['fields']>().toEqualTypeOf<
    Record<string, FieldSnapshot>
  >();
});

test('PermissionEnvelope / Migration 契约形状', () => {
  expectTypeOf<PermissionEnvelope['form']>().toEqualTypeOf<{
    read?: boolean;
    submit?: boolean;
    approve?: boolean;
  }>();
  expectTypeOf<Migration['axis']>().toEqualTypeOf<
    'schema' | 'snapshot' | 'engineSchema' | 'component'
  >();
});

test('ReadonlyImplementations 覆盖 pc/mobile/default 三态', () => {
  expectTypeOf<ReadonlyImplementations>().toEqualTypeOf<{
    pc?: unknown;
    mobile?: unknown;
    default?: unknown;
  }>();
});
