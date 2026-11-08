import { basicComponents } from '../../index';
import { basicComponents as mobileComponents, basicDecorators } from '../index';

const P0 = ['Input', 'Textarea', 'Number', 'Select', 'Radio', 'Checkbox', 'DatePicker'];

test('移动物料包含七类 P0 与 FormItem，且只提供 mobile 实现', () => {
  expect(mobileComponents.map((b) => b.protocol.name)).toEqual(P0);
  for (const binding of mobileComponents) {
    expect(binding.implementations.mobile).toBeTruthy();
    expect(binding.implementations.pc).toBeUndefined();
    expect(binding.readonly?.mobile).toBeTruthy();
    expect(binding.readonly?.default).toBeTruthy();
    expect(binding.protocol.capabilities.mobile).toBe(true);
  }
  expect(basicDecorators.map((b) => b.protocol.name)).toEqual(['FormItem']);
  expect(basicDecorators[0].implementations.mobile).toBeTruthy();
});

test('PC 物料入口不混入 mobile 实现（包拆分基线）', () => {
  for (const binding of basicComponents) {
    expect(binding.implementations.mobile).toBeUndefined();
  }
});
