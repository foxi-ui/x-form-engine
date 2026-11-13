import type { SetterDefinition } from '@x-form-engine/types';
import {
  ArraySetter,
  BooleanSetter,
  JSONSetter,
  NumberSetter,
  RadioSetter,
  SelectSetter,
  StringSetter,
} from './basic-setters';

export * from './basic-setters';

/**
 * 基础 Setter（Task 6.2）。
 *
 * 基于 `SetterDefinition`，UI 使用 antd4，受控（value / onChange），支持
 * disabled / readonly，不依赖 Designable。
 */
export const basicSetters: SetterDefinition[] = [
  { name: 'StringSetter', version: '1.0.0', component: StringSetter, valueType: 'string' },
  { name: 'NumberSetter', version: '1.0.0', component: NumberSetter, valueType: 'number' },
  { name: 'BooleanSetter', version: '1.0.0', component: BooleanSetter, valueType: 'boolean' },
  { name: 'SelectSetter', version: '1.0.0', component: SelectSetter, valueType: 'string' },
  { name: 'RadioSetter', version: '1.0.0', component: RadioSetter, valueType: 'string' },
  { name: 'JSONSetter', version: '1.0.0', component: JSONSetter, valueType: 'json' },
  { name: 'ArraySetter', version: '1.0.0', component: ArraySetter, valueType: 'array' },
];
