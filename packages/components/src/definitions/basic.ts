import { Checkbox, DatePicker, Input, NumberPicker, Radio, Select } from '@formily/antd';
import { ReadonlyText } from '../readonly/readonly-components';
import { createBasicProtocol } from '../shared/protocols';
import type { ReactComponentBinding } from '../types';

/** 基础组件的只读实现：默认展示（优先快照 displayValue，降级原始值）。 */
const defaultReadonly = { pc: ReadonlyText, default: ReadonlyText };

/**
 * P0 基础组件：PC 实现直接借用 `@formily/antd` 已连接组件（useField 可用），
 * 替换清单见 `src/replacements.md`。M1 值即原生 primitive，不配置 Adapter。
 *
 * 协议来自无 UI 依赖的 `../shared/protocols`；移动端实现在后续任务的 `src/mobile` 中提供。
 */
export const basicComponents: ReactComponentBinding[] = [
  {
    protocol: createBasicProtocol('Input'),
    implementations: { pc: Input },
    readonly: defaultReadonly,
  },
  {
    protocol: createBasicProtocol('Textarea'),
    implementations: { pc: Input.TextArea },
    readonly: defaultReadonly,
  },
  {
    protocol: createBasicProtocol('Number'),
    implementations: { pc: NumberPicker },
    readonly: defaultReadonly,
  },
  {
    protocol: createBasicProtocol('Select'),
    implementations: { pc: Select },
    readonly: defaultReadonly,
  },
  {
    protocol: createBasicProtocol('Radio'),
    implementations: { pc: Radio.Group },
    readonly: defaultReadonly,
  },
  {
    protocol: createBasicProtocol('Checkbox'),
    implementations: { pc: Checkbox.Group },
    readonly: defaultReadonly,
  },
  {
    protocol: createBasicProtocol('DatePicker'),
    implementations: { pc: DatePicker },
    readonly: defaultReadonly,
  },
];
