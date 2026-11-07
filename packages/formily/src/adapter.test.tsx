import { createEngineSchemaField, resolveFormilyComponentMap } from './index';
import { createFormEngine } from '@x-form-engine/core';
import { createForm } from '@formily/core';
import { FormProvider, useField } from '@formily/react';
import { render, screen } from '@testing-library/react';
import type { Field } from '@formily/core';
import type { ReactNode } from 'react';

// 最小自定义字段组件：通过 useField 读写值，证明字段上下文可用
function TextInput() {
  const field = useField<Field>();
  return (
    <>
      <span data-testid="title">{String(field.title ?? '')}</span>
      <input
        data-testid="field"
        value={String(field.value ?? '')}
        onChange={(e) => field.onInput(e.target.value)}
      />
    </>
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

function renderWithForm(node: ReactNode) {
  const form = createForm();
  return render(<FormProvider form={form}>{node}</FormProvider>);
}

test('resolveFormilyComponentMap 按平台取实现、缺实现抛错', () => {
  const engine = createFormEngine({ components: [inputBinding] });

  const map = resolveFormilyComponentMap(engine, 'pc');
  expect(map.components.Input).toBeDefined();
  expect(map.decorators).toEqual({});

  expect(() => resolveFormilyComponentMap(engine, 'mobile')).toThrowError(
    expect.objectContaining({ code: 'COMPONENT_CAPABILITY_MISMATCH' })
  );
});

test('createEngineSchemaField 以 JSX 渲染，registry 组件在字段上下文内可用', async () => {
  const engine = createFormEngine({ components: [inputBinding] });
  const SchemaField = createEngineSchemaField(engine, 'pc');

  renderWithForm(
    <SchemaField
      schema={{
        type: 'object',
        properties: {
          a: { type: 'string', 'x-component': 'Input', default: 'hello' },
        },
      }}
    />
  );

  const input = (await screen.findByTestId('field')) as HTMLInputElement;
  expect(input.value).toBe('hello');
});

test('含 x-engine 的 schema 可正常渲染且保留 Formily 原生键', async () => {
  const engine = createFormEngine({ components: [inputBinding] });
  const SchemaField = createEngineSchemaField(engine, 'pc');

  renderWithForm(
    <SchemaField
      schema={{
        type: 'object',
        properties: {
          a: {
            type: 'string',
            'x-component': 'Input',
            'x-engine': { platform: { pc: {} } },
          },
        },
      }}
    />
  );

  expect(await screen.findByTestId('field')).toBeInTheDocument();
});

test('实例级 scope 覆盖工厂级同名 key', async () => {
  const engine = createFormEngine({ components: [inputBinding] });
  const SchemaField = createEngineSchemaField(engine, 'pc', { label: 'factory' });

  renderWithForm(
    <SchemaField
      scope={{ label: 'instance' }}
      schema={{
        type: 'object',
        properties: {
          a: {
            type: 'string',
            'x-component': 'Input',
            title: '{{label}}',
          },
        },
      }}
    />
  );

  expect(await screen.findByTestId('title')).toHaveTextContent('instance');
});
