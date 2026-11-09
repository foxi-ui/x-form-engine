/**
 * 「员工入职登记」贯穿示例的 Schema。
 *
 * 字段名（name / department / ...）就是提交后 `values` 的 key；
 * 中文展示名放在 `title`，这样业务值和后端字段都保持稳定。
 */
export const employeeOnboardingSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      title: '姓名',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
      'x-component-props': {
        placeholder: '请输入姓名',
        style: { width: 320 },
      },
      'x-validator': [{ required: true, message: '请输入姓名' }],
    },
    department: {
      type: 'string',
      title: '部门',
      'x-decorator': 'FormItem',
      'x-component': 'Select',
      enum: [
        { label: '研发部', value: 'rd' },
        { label: '产品部', value: 'product' },
        { label: '运营部', value: 'operation' },
        { label: '其他', value: 'other' },
      ],
      'x-component-props': {
        placeholder: '请选择部门',
        style: { width: 320 },
      },
      'x-validator': [{ required: true, message: '请选择部门' }],
    },
    departmentOther: {
      type: 'string',
      title: '部门说明',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
      'x-component-props': {
        placeholder: '请填写部门名称',
        style: { width: 320 },
      },
      'x-reactions': {
        dependencies: ['department'],
        fulfill: {
          state: {
            visible: '{{ $deps[0] === "other" }}',
          },
        },
      },
      'x-validator': [{ required: true, message: '请填写部门名称' }],
    },
    joinDate: {
      type: 'string',
      title: '入职日期',
      'x-decorator': 'FormItem',
      'x-component': 'DatePicker',
      'x-component-props': {
        placeholder: '请选择入职日期',
        style: { width: 320 },
      },
      'x-validator': [{ required: true, message: '请选择入职日期' }],
    },
    probationMonths: {
      type: 'number',
      title: '试用期（月）',
      'x-decorator': 'FormItem',
      'x-component': 'Number',
      'x-component-props': {
        min: 0,
        max: 6,
        style: { width: 320 },
      },
    },
    regularDate: {
      type: 'string',
      title: '预计转正日期',
      'x-decorator': 'FormItem',
      'x-component': 'DatePicker',
      'x-component-props': {
        style: { width: 320 },
        disabled: true,
      },
      'x-reactions': {
        dependencies: ['joinDate', 'probationMonths'],
        fulfill: {
          state: {
            value: '{{ addMonths($deps[0], $deps[1]) }}',
          },
        },
      },
    },
    remark: {
      type: 'string',
      title: '备注',
      'x-decorator': 'FormItem',
      'x-component': 'Textarea',
      'x-component-props': {
        placeholder: '选填：补充说明',
        rows: 3,
        style: { width: 480 },
      },
    },
  },
};

/** 业务值类型：与 Schema 字段名一一对应。 */
export type EmployeeOnboardingValues = {
  name: string;
  department: string;
  departmentOther?: string;
  joinDate: string;
  probationMonths?: number;
  regularDate?: string;
  remark?: string;
};

/**
 * 计算 `{{ addMonths(...) }}` 用到的 scope 函数。
 *
 * 通过 `<FormRenderer scope={...} />` 注入，表达式里即可按名字调用。
 */
export function addMonths(date: unknown, months: unknown): string {
  if (typeof date !== 'string' || date === '') {
    return '';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  parsed.setMonth(parsed.getMonth() + Number(months ?? 0));
  return parsed.toISOString().slice(0, 10);
}

/** `<FormRenderer scope>` 的稳定引用（模块级常量，避免每次渲染重建）。 */
export const employeeOnboardingScope = { addMonths };

/**
 * 后端持久化的 Schema 文档信封（`FormSchemaDocument`）。
 * `version` 对应渲染时的 `schemaVersion`，会写进提交快照。
 */
export const employeeOnboardingDocument = {
  schemaId: 'employee-onboarding',
  version: 1,
  engineSchemaVersion: '1.0.0',
  schema: employeeOnboardingSchema,
};
