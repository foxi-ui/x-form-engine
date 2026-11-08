import type { ComponentType } from 'react';
import { ReadonlyText } from '../readonly/readonly-components';
import { createBasicProtocol, createFormItemProtocol } from '../shared/protocols';
import type { ReactComponentBinding } from '../types';
import { Checkbox } from './checkbox';
import { DatePicker } from './date-picker';
import { FormItem } from './form-item';
import { Input } from './input';
import { NumberInput } from './number';
import { Radio } from './radio';
import { Select } from './select';
import { Textarea } from './textarea';

/**
 * antd-mobile 组件携带具体 props（`ForwardRefExoticComponent<...>`），
 * 与物料绑定使用的 `ComponentType<unknown>` 逆变签名不兼容；
 * 这里在物料装配边界做一次显式收窄，组件协议本身仍保持 UI 无关。
 */
function mobileImplementation(component: unknown): ComponentType<unknown> {
  return component as ComponentType<unknown>;
}

/** 移动端只读实现：默认展示（优先快照 displayValue，降级原始值）。 */
const defaultReadonly = { mobile: ReadonlyText, default: ReadonlyText };

/**
 * P0 基础组件的移动端物料入口：协议与 PC 入口共享（`../shared/protocols`），
 * 这里只提供 antd-mobile 实现，不混入任何 `@formily/antd` / 桌面 `antd` 依赖。
 *
 * 顺序与 PC 入口保持一致：Input、Textarea、Number、Select、Radio、Checkbox、DatePicker。
 */
export const basicComponents: ReactComponentBinding[] = [
  {
    protocol: createBasicProtocol('Input'),
    implementations: { mobile: mobileImplementation(Input) },
    readonly: defaultReadonly,
  },
  {
    protocol: createBasicProtocol('Textarea'),
    implementations: { mobile: mobileImplementation(Textarea) },
    readonly: defaultReadonly,
  },
  {
    protocol: createBasicProtocol('Number'),
    implementations: { mobile: mobileImplementation(NumberInput) },
    readonly: defaultReadonly,
  },
  {
    protocol: createBasicProtocol('Select'),
    implementations: { mobile: mobileImplementation(Select) },
    readonly: defaultReadonly,
  },
  {
    protocol: createBasicProtocol('Radio'),
    implementations: { mobile: mobileImplementation(Radio) },
    readonly: defaultReadonly,
  },
  {
    protocol: createBasicProtocol('Checkbox'),
    implementations: { mobile: mobileImplementation(Checkbox) },
    readonly: defaultReadonly,
  },
  {
    protocol: createBasicProtocol('DatePicker'),
    implementations: { mobile: mobileImplementation(DatePicker) },
    readonly: defaultReadonly,
  },
];

/** 基础装饰器的移动端物料入口：协议与 PC 共享，只提供 antd-mobile 版 FormItem。 */
export const basicDecorators: ReactComponentBinding[] = [
  {
    protocol: createFormItemProtocol(),
    implementations: { mobile: mobileImplementation(FormItem) },
  },
];
