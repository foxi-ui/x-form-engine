import { act, render } from '@testing-library/react';
import { createRef } from 'react';
import { createFormEngine } from '@x-form-engine/core';
import { basicComponents } from '@x-form-engine/components';
import type { FormEngine, FormSubmitResult } from '@x-form-engine/types';
import { FormEngineProvider, FormRenderer } from '../index';
import type { FormRendererInstance } from '../index';

const travelSchema = {
  type: 'object',
  properties: {
    出发日期: {
      type: 'string',
      'x-component': 'DatePicker',
      'x-validator': [{ required: true }],
    },
    返回日期: {
      type: 'string',
      'x-component': 'DatePicker',
    },
    出差天数: {
      type: 'number',
      'x-component': 'Number',
      'x-reactions': {
        dependencies: ['出发日期', '返回日期'],
        fulfill: {
          state: {
            value:
              '{{ $deps[1] && $deps[0] ? (new Date($deps[1]) - new Date($deps[0])) / 86400000 : 0 }}',
          },
        },
      },
    },
  },
};

function renderForm(engine: FormEngine) {
  const ref = createRef<FormRendererInstance>();
  render(
    <FormEngineProvider engine={engine}>
      <FormRenderer ref={ref} schema={travelSchema} />
    </FormEngineProvider>
  );
  return ref;
}

test('M1 闭环：渲染 → 校验 → 联动计算 → Value → 销毁', async () => {
  const engine = createFormEngine({
    platform: 'pc',
    components: basicComponents,
    locale: 'zh-CN',
  });
  const ref = renderForm(engine);

  // 1. 空表单 validate() 因必填未填而失败（Formily 以 errors 数组 reject）。
  await act(async () => {
    await expect(ref.current!.validate()).rejects.toBeDefined();
  });

  // 2. 空表单 submit() 抛校验错误，不产生成功结果。
  await act(async () => {
    await expect(ref.current!.submit()).rejects.toBeDefined();
  });

  // 3. 只写出发日期时，reaction 因缺少返回日期仍算出 0。
  act(() => {
    ref.current!.setValues({ 出发日期: '2026-11-01' });
  });
  expect(ref.current!.getValues()['出差天数']).toBe(0);

  // 4. 再写返回日期后 getValues() 原样返回业务 Value，
  //    且 x-reactions 真实联动：两天日期差由 reaction 计算出 4。
  act(() => {
    ref.current!.setValues({ 返回日期: '2026-11-05' });
  });

  expect(ref.current!.getValues()).toMatchObject({
    出发日期: '2026-11-01',
    返回日期: '2026-11-05',
  });
  expect(ref.current!.getValues()['出差天数']).toBe(4);

  // 5. 校验通过后 submit 返回标准化 Value 与占位快照。
  // 注意：react-dom 的 act() 不返回回调结果，需在回调内捕获 submit 结果。
  let submitted: FormSubmitResult | undefined;
  await act(async () => {
    submitted = await ref.current!.submit();
  });
  expect(submitted?.values).toMatchObject({
    出发日期: '2026-11-01',
    返回日期: '2026-11-05',
    出差天数: 4,
  });
  expect(submitted?.snapshot.snapshotVersion).toBe('1.0.0');

  // 6. 销毁后引擎进入 disposed，且 disposing 幂等。
  act(() => {
    engine.dispose();
  });
  expect(engine.status).toBe('disposed');
  engine.dispose();
  expect(engine.status).toBe('disposed');
});
