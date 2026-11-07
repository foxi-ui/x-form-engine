import { render, act, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { useField } from '@formily/react';
import type { Field } from '@formily/core';
import { createFormEngine } from '@x-form-engine/core';
import { FormEngineProvider, useFormEngine } from './context';
import { FormRenderer } from './FormRenderer';
import type { FormRendererInstance } from './types';

function TextInput() {
  const field = useField<Field>();
  return (
    <input
      data-testid="field"
      value={String(field.value ?? '')}
      onChange={(e) => field.onInput?.(e.target.value)}
    />
  );
}

const inputBinding = {
  protocol: {
    name: 'Input',
    version: '1',
    meta: { title: 'I' },
    capabilities: { editable: true, readonly: true, mobile: false },
    schema: { type: 'object' as const },
  },
  implementations: { pc: TextInput },
};

test('useFormEngine 在 Provider 外抛错', () => {
  function C() {
    useFormEngine();
    return null;
  }
  expect(() => render(<C />)).toThrow();
});

test('渲染 + 填值 + getValues/submit 闭环', async () => {
  const engine = createFormEngine({ components: [inputBinding] });
  const ref = createRef<FormRendererInstance>();
  render(
    <FormEngineProvider engine={engine}>
      <FormRenderer
        ref={ref}
        schema={{
          type: 'object',
          properties: {
            name: {
              type: 'string',
              'x-component': 'Input',
              'x-validator': [{ required: true }],
            },
          },
        }}
      />
    </FormEngineProvider>
  );
  act(() => ref.current!.setValues({ name: '张三' }));
  expect(ref.current!.getValues().name).toBe('张三');
  await act(async () => {
    await ref.current!.submit(); // 已填值，required 校验通过，返回 FormSubmitResult
  });
});

test('onValuesChange 回读 form.values 且与 getValues 一致', async () => {
  const engine = createFormEngine({ components: [inputBinding] });
  const seen: Record<string, unknown>[] = [];
  const ref = createRef<FormRendererInstance>();
  render(
    <FormEngineProvider engine={engine}>
      <FormRenderer
        ref={ref}
        schema={{
          type: 'object',
          properties: { name: { type: 'string', 'x-component': 'Input' } },
        }}
        onValuesChange={(values) => seen.push(values)}
      />
    </FormEngineProvider>
  );
  fireEvent.change(screen.getByTestId('field'), { target: { value: 'x' } });
  expect(seen.at(-1)).toEqual(ref.current!.getValues());
});
