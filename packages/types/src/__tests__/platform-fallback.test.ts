import { expectTypeOf } from 'vitest';
import type { PlatformFallbackDiagnostic } from '../index';

test('PlatformFallbackDiagnostic 契约形状', () => {
  expectTypeOf<PlatformFallbackDiagnostic>().toEqualTypeOf<{
    kind: 'component' | 'decorator';
    name: string;
    requestedPlatform: 'pc' | 'mobile';
    fallbackPlatform: 'pc' | 'mobile';
  }>();

  const diagnostic: PlatformFallbackDiagnostic = {
    kind: 'component',
    name: 'LegacyNote',
    requestedPlatform: 'mobile',
    fallbackPlatform: 'pc',
  };
  expect(diagnostic.fallbackPlatform).toBe('pc');
});
