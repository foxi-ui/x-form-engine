import { connect } from '@formily/react';
import { Select } from 'antd';
import type {
  ComponentAdapter,
  ComponentBinding,
  ComponentProtocolDefinition,
  ReadonlyComponentProps,
} from '@x-form-engine/sdk';

/**
 * 「员工选择器」自定义组件示例（对应指南第 08 章）。
 *
 * 一份 `ComponentBinding` 同时服务三件事：
 *  - 编辑态：antd Select + `connect`，业务值存稳定员工 ID；
 *  - 提交快照：`adapter.createSnapshot` 把 ID 展开成「姓名（部门）」；
 *  - 只读态：优先渲染快照冻结的 `snapshotValue`。
 */

export interface EmployeeOption {
  label: string;
  /** 员工 ID，稳定业务值。 */
  value: string;
  /** 部门，仅展示用，不进业务值。 */
  dept?: string;
}

type EmployeeValue = string | string[] | null;

/** 1. 编辑态组件：遵循 Formily 字段组件约定（value / onChange），用 `connect` 接入。 */
function EmployeeSelectorWidget(props: {
  value?: EmployeeValue;
  onChange?: (value: EmployeeValue) => void;
  options?: EmployeeOption[];
  multiple?: boolean;
  placeholder?: string;
}): JSX.Element {
  return (
    <Select
      mode={props.multiple ? 'multiple' : undefined}
      value={props.value ?? undefined}
      onChange={props.onChange}
      options={props.options}
      placeholder={props.placeholder}
      style={{ width: 320 }}
    />
  );
}

const EmployeeSelector = connect(EmployeeSelectorWidget);

/** 2. 只读组件：优先快照 displayValue，无快照时降级原始值。 */
function EmployeeSelectorReadonly(props: ReadonlyComponentProps): JSX.Element {
  const display = props.snapshotValue ?? props.value;
  if (Array.isArray(display)) {
    return <span>{display.length === 0 ? '—' : display.join('、')}</span>;
  }
  return <span>{display == null ? '—' : String(display)}</span>;
}

function readOptions(schema: Record<string, unknown>): EmployeeOption[] {
  const props = schema['x-component-props'] as Record<string, unknown> | undefined;
  if (Array.isArray(props?.options)) {
    return props.options as EmployeeOption[];
  }
  if (Array.isArray(schema.enum)) {
    return schema.enum as EmployeeOption[];
  }
  return [];
}

/** 3. Adapter：提交前归一 Value，提交时生成候选快照的 displayValue。 */
const employeeSelectorAdapter: ComponentAdapter<EmployeeValue> = {
  normalizeValue(value, context) {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    // 可恢复告警：不阻断提交，进入 warnings。
    context.warn?.(
      'EMPLOYEE_VALUE_INVALID',
      `员工字段收到非字符串值，已忽略：${String(value)}`
    );
    return null;
  },

  createSnapshot(value, context) {
    if (value == null) return null;
    const options = readOptions(context.schema);
    const render = (id: string): string => {
      const found = options.find((option) => option.value === id);
      return found ? `${found.label}（${found.dept ?? '未填部门'}）` : id;
    };
    return Array.isArray(value) ? value.map(render) : render(value);
  },
};

/** 4. 协议：名称、版本、能力、props Schema、Adapter。 */
const employeeSelectorProtocol: ComponentProtocolDefinition = {
  name: 'EmployeeSelector',
  version: '1.0.0',
  meta: { title: '员工选择', category: 'organization' },
  capabilities: {
    editable: true,
    readonly: true,
    mobile: false, // 暂只有 PC 实现；移动端会回退 PC 并诊断
    datasource: true,
    snapshot: true,
  },
  schema: {
    type: 'object',
    properties: {
      multiple: { type: 'boolean', default: false },
      placeholder: { type: 'string' },
      options: { type: 'array' },
    },
  },
  adapter: employeeSelectorAdapter,
};

/** 5. 绑定：平台实现 + 只读实现。 */
export const employeeSelectorBinding: ComponentBinding = {
  protocol: employeeSelectorProtocol,
  implementations: { pc: EmployeeSelector },
  readonly: { default: EmployeeSelectorReadonly },
};
