import type {
  ComponentProtocolDefinition,
  ComponentSchemaDefinition,
} from '@x-form-engine/types';
import { Checkbox, DatePicker, Input, NumberPicker, Radio, Select } from '@formily/antd';
import type { ReactComponentBinding } from '../types';

/** M1 基础组件共享的协议骨架：可编辑、可只读渲染，暂不提供移动端实现。 */
function createProtocol(
  name: string,
  title: string,
  properties: ComponentSchemaDefinition['properties'] = {}
): ComponentProtocolDefinition {
  return {
    name,
    version: '1.0.0',
    meta: {
      title,
      category: 'basic',
    },
    capabilities: {
      editable: true,
      readonly: true,
      mobile: false,
    },
    schema: {
      type: 'object',
      properties: {
        placeholder: { type: 'string' },
        ...properties,
      },
    },
  };
}

/**
 * P0 基础组件：PC 实现直接借用 `@formily/antd` 已连接组件（useField 可用），
 * 替换清单见 `src/replacements.md`。M1 值即原生 primitive，不配置 Adapter。
 */
export const basicComponents: ReactComponentBinding[] = [
  {
    protocol: createProtocol('Input', '输入框'),
    implementations: { pc: Input },
  },
  {
    protocol: createProtocol('Textarea', '多行文本'),
    implementations: { pc: Input.TextArea },
  },
  {
    protocol: createProtocol('Number', '数字输入'),
    implementations: { pc: NumberPicker },
  },
  {
    protocol: createProtocol('Select', '下拉选择', {
      options: { type: 'array' },
    }),
    implementations: { pc: Select },
  },
  {
    protocol: createProtocol('Radio', '单选', {
      options: { type: 'array' },
    }),
    implementations: { pc: Radio.Group },
  },
  {
    protocol: createProtocol('Checkbox', '多选', {
      options: { type: 'array' },
    }),
    implementations: { pc: Checkbox.Group },
  },
  {
    protocol: createProtocol('DatePicker', '日期选择'),
    implementations: { pc: DatePicker },
  },
];
