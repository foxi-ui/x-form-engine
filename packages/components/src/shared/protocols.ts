import type {
  ComponentProtocolDefinition,
  ComponentSchemaDefinition,
} from '@x-form-engine/types';

/**
 * 组件协议构造：纯数据层，不依赖 React / Formily / 任何 UI 库。
 *
 * PC 入口（`src/index.ts`）与移动端入口（后续任务的 `src/mobile/index.ts`）
 * 共享这里定义的协议，只各自提供平台实现。
 */

const PROTOCOL_VERSION = '1.0.0';

export interface BasicComponentSpec {
  name: string;
  title: string;
  properties?: Record<string, unknown>;
}

/** P0 基础组件族的协议规格（标题 + 额外 schema 属性）。 */
export const BASIC_COMPONENT_SPECS: ReadonlyArray<BasicComponentSpec> = [
  { name: 'Input', title: '输入框' },
  { name: 'Textarea', title: '多行文本' },
  { name: 'Number', title: '数字输入' },
  {
    name: 'Select',
    title: '下拉选择',
    properties: { options: { type: 'array' } },
  },
  {
    name: 'Radio',
    title: '单选',
    properties: { options: { type: 'array' } },
  },
  {
    name: 'Checkbox',
    title: '多选',
    properties: { options: { type: 'array' } },
  },
  { name: 'DatePicker', title: '日期选择' },
];

export interface ProtocolOptions {
  /**
   * 组件族是否具备移动端实现（描述性元数据，不参与运行时平台解析）。
   * 运行时只读取 `implementations`，缺 mobile 时由 renderer 回退到 pc 并发诊断。
   */
  mobile?: boolean;
}

function baseSchema(
  properties: ComponentSchemaDefinition['properties'] = {}
): ComponentSchemaDefinition {
  return {
    type: 'object',
    properties: {
      placeholder: { type: 'string' },
      ...properties,
    },
  };
}

/** 构造基础组件协议；`capabilities.mobile` 默认 `true`（组件族有移动端实现）。 */
export function createBasicProtocol(
  name: string,
  options: ProtocolOptions = {}
): ComponentProtocolDefinition {
  const spec = BASIC_COMPONENT_SPECS.find((item) => item.name === name);
  if (!spec) {
    throw new Error(`未知的基础组件协议：${name}`);
  }

  return {
    name: spec.name,
    version: PROTOCOL_VERSION,
    meta: {
      title: spec.title,
      category: 'basic',
    },
    capabilities: {
      editable: true,
      readonly: true,
      mobile: options.mobile ?? true,
    },
    schema: baseSchema(spec.properties),
  };
}

/** 构造 FormItem 装饰器协议；`capabilities.mobile` 默认 `true`。 */
export function createFormItemProtocol(
  options: ProtocolOptions = {}
): ComponentProtocolDefinition {
  return {
    name: 'FormItem',
    version: PROTOCOL_VERSION,
    meta: { title: '表单项' },
    capabilities: {
      editable: false,
      readonly: false,
      mobile: options.mobile ?? true,
    },
    schema: { type: 'object' },
  };
}
