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

test('reset() 恢复到 initialValues', async () => {
  const engine = createFormEngine({ components: [inputBinding] });
  const ref = createRef<FormRendererInstance>();
  render(
    <FormEngineProvider engine={engine}>
      <FormRenderer
        ref={ref}
        initialValues={{ name: '初始值' }}
        schema={{
          type: 'object',
          properties: { name: { type: 'string', 'x-component': 'Input' } },
        }}
      />
    </FormEngineProvider>
  );

  expect(ref.current!.getValues().name).toBe('初始值');
  act(() => ref.current!.setValues({ name: '修改后' }));
  expect(ref.current!.getValues().name).toBe('修改后');

  await act(async () => {
    ref.current!.reset();
  });
  expect(ref.current!.getValues().name).toBe('初始值');
});

test('submit 返回普通对象，序列化后与 getValues 深等且修改不影响表单', async () => {
  const engine = createFormEngine({ components: [inputBinding] });
  const ref = createRef<FormRendererInstance>();
  render(
    <FormEngineProvider engine={engine}>
      <FormRenderer
        ref={ref}
        initialValues={{ name: '张三' }}
        schema={{
          type: 'object',
          properties: { name: { type: 'string', 'x-component': 'Input' } },
        }}
      />
    </FormEngineProvider>
  );

  let result!: Awaited<ReturnType<FormRendererInstance['submit']>>;
  await act(async () => {
    result = await ref.current!.submit();
  });
  const current = ref.current!.getValues();

  expect(JSON.parse(JSON.stringify(result.values))).toEqual(current);
  expect(result.values).toEqual(current);

  result.values.name = '被篡改';
  expect(ref.current!.getValues().name).toBe('张三');
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
