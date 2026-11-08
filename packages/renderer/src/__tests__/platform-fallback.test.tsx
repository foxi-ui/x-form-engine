import { render, waitFor } from '@testing-library/react';
import { createFormEngine } from '@x-form-engine/core';
import type { Field } from '@formily/core';
import { useField } from '@formily/react';
import type { ComponentBinding, PlatformFallbackDiagnostic } from '@x-form-engine/types';
import { vi } from 'vitest';
import { FormEngineProvider } from '../context';
import { FormRenderer } from '../FormRenderer';

function Probe() {
  const field = useField<Field>();
  return (
    <input
      aria-label="probe"
      value={String(field.value ?? '')}
      onChange={(e) => field.onInput(e.target.value)}
    />
  );
}

const probeBinding: ComponentBinding = {
  protocol: {
    name: 'Probe',
    version: '1.0.0',
    meta: { title: 'Probe' },
    capabilities: { editable: true, readonly: true, mobile: false },
    schema: { type: 'object' },
  },
  implementations: { pc: Probe },
};

const unusedBinding: ComponentBinding = {
  ...probeBinding,
  protocol: { ...probeBinding.protocol, name: 'UnusedProbe' },
};

test('mobile 回退派发事件与 onDiagnostic，只报 Schema 引用的组件，且不重复', async () => {
  const engine = createFormEngine({ components: [probeBinding, unusedBinding] });
  const events: PlatformFallbackDiagnostic[] = [];
  const onDiagnostic = vi.fn();
  engine.events.on<PlatformFallbackDiagnostic>('component:platform-fallback', (d) =>
    events.push(d)
  );

  const schema = {
    type: 'object',
    properties: { p: { type: 'string', 'x-component': 'Probe' } },
  };
  const { rerender } = render(
    <FormEngineProvider engine={engine}>
      <FormRenderer platform="mobile" schema={schema} onDiagnostic={onDiagnostic} />
    </FormEngineProvider>
  );

  await waitFor(() => {
    expect(events).toEqual([
      { kind: 'component', name: 'Probe', requestedPlatform: 'mobile', fallbackPlatform: 'pc' },
    ]);
    expect(onDiagnostic).toHaveBeenCalledTimes(1);
  });

  rerender(
    <FormEngineProvider engine={engine}>
      <FormRenderer platform="mobile" schema={{ ...schema }} onDiagnostic={onDiagnostic} />
    </FormEngineProvider>
  );
  expect(onDiagnostic).toHaveBeenCalledTimes(1);
  expect(events).toHaveLength(1);
});

test('debug 模式下回退诊断同时写 console.warn', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const engine = createFormEngine({ debug: true, components: [probeBinding] });
  render(
    <FormEngineProvider engine={engine}>
      <FormRenderer
        platform="mobile"
        schema={{ type: 'object', properties: { p: { type: 'string', 'x-component': 'Probe' } } }}
      />
    </FormEngineProvider>
  );
  await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
  warn.mockRestore();
});
