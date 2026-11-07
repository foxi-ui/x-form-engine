import { expectTypeOf } from 'vitest';
import type { Platform, RenderMode, ComponentBinding } from '../index';

test('Platform 不含 readonly，RenderMode 含 readonly', () => {
  expectTypeOf<'pc'>().toMatchTypeOf<Platform>();
  expectTypeOf<'mobile'>().toMatchTypeOf<Platform>();
  // @ts-expect-error readonly 不是 Platform
  const _p: Platform = 'readonly';
  expectTypeOf<'readonly'>().toMatchTypeOf<RenderMode>();
});

test('ComponentBinding 默认实现类型为 unknown', () => {
  expectTypeOf<ComponentBinding['implementations']>().toEqualTypeOf<
    { pc?: unknown; mobile?: unknown }
  >();
});
