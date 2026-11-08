import { createFormEngine } from '@x-form-engine/core';
import type { ComponentBinding } from '@x-form-engine/types';
import { resolveFormilyComponentMap } from '../index';

function binding(
  name: string,
  implementations: ComponentBinding['implementations']
): ComponentBinding {
  return {
    protocol: {
      name,
      version: '1.0.0',
      meta: { title: name },
      capabilities: { editable: true, readonly: true, mobile: name !== 'PcOnly' },
      schema: { type: 'object' },
    },
    implementations,
  };
}

const PcOnly = () => null;
const MobileOnly = () => null;
const BothPc = () => null;
const BothMobile = () => null;

test('mobile 缺实现回退 pc 并产生一条诊断', () => {
  const engine = createFormEngine({
    components: [binding('PcOnly', { pc: PcOnly })],
  });

  const result = resolveFormilyComponentMap(engine, 'mobile');
  expect(result.components.PcOnly).toBe(PcOnly);
  expect(result.diagnostics).toEqual([
    {
      kind: 'component',
      name: 'PcOnly',
      requestedPlatform: 'mobile',
      fallbackPlatform: 'pc',
    },
  ]);
});

test('mobile 有实现时优先用 mobile，不产生诊断', () => {
  const engine = createFormEngine({
    components: [binding('Both', { pc: BothPc, mobile: BothMobile })],
  });

  const result = resolveFormilyComponentMap(engine, 'mobile');
  expect(result.components.Both).toBe(BothMobile);
  expect(result.diagnostics).toEqual([]);
});

test('pc 缺实现仍抛 COMPONENT_CAPABILITY_MISMATCH', () => {
  const engine = createFormEngine({
    components: [binding('MobileOnly', { mobile: MobileOnly })],
  });

  expect(() => resolveFormilyComponentMap(engine, 'pc')).toThrowError(
    expect.objectContaining({ code: 'COMPONENT_CAPABILITY_MISMATCH' })
  );
});

test('装饰器在 mobile 缺实现时同样回退并记诊断', () => {
  const engine = createFormEngine({
    decorators: [binding('Deco', { pc: PcOnly })],
  });

  const result = resolveFormilyComponentMap(engine, 'mobile');
  expect(result.decorators.Deco).toBe(PcOnly);
  expect(result.diagnostics).toEqual([
    {
      kind: 'decorator',
      name: 'Deco',
      requestedPlatform: 'mobile',
      fallbackPlatform: 'pc',
    },
  ]);
});
