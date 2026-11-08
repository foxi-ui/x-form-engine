import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { createFormEngine } from '@x-form-engine/core';
import {
  FormEngineProvider,
  FormRenderer,
  type FormRendererInstance,
} from '@x-form-engine/renderer';
import { basicComponents } from './index';

const P0_COMPONENTS = [
  'Input',
  'Textarea',
  'Number',
  'Select',
  'Radio',
  'Checkbox',
  'DatePicker',
] as const;

test('basicComponents 含 7 个 P0 组件且可注册', () => {
  expect(basicComponents.map((binding) => binding.protocol.name)).toEqual([
    ...P0_COMPONENTS,
  ]);

  const engine = createFormEngine({ components: basicComponents });
  for (const name of P0_COMPONENTS) {
    expect(engine.registry.components.has(name)).toBe(true);
  }
});

test('Input 在字段上下文内 useField 可用且值可回写', () => {
  const engine = createFormEngine({ components: basicComponents });
  const ref = createRef<FormRendererInstance>();
  render(
    <FormEngineProvider engine={engine}>
      <FormRenderer
        ref={ref}
        schema={{
          type: 'object',
          properties: {
            name: { type: 'string', 'x-component': 'Input' },
          },
        }}
      />
    </FormEngineProvider>
  );

  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'hello' } });
  expect(ref.current!.getValues().name).toBe('hello');
});

test('七个基础组件族的协议声明 mobile 能力（描述性，不参与运行时回退）', () => {
  for (const binding of basicComponents) {
    expect(binding.protocol.capabilities.mobile).toBe(true);
  }
});

test('PC 物料入口仍然只提供 pc 实现', () => {
  for (const binding of basicComponents) {
    expect(binding.implementations.pc).toBeTruthy();
    expect(binding.implementations.mobile).toBeUndefined();
  }
});
