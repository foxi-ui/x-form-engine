import type {
  Formatter,
  FormatterContext,
  FormEnginePlugin,
} from '@x-form-engine/types';

interface Option {
  label: string;
  value: unknown;
}

function extractOptions(schema?: Record<string, unknown>): Option[] | undefined {
  if (!schema) {
    return undefined;
  }
  const componentProps = schema['x-component-props'];
  const candidate =
    (componentProps &&
      typeof componentProps === 'object' &&
      (componentProps as Record<string, unknown>).options) ||
    schema.enum ||
    schema.options;
  if (!Array.isArray(candidate)) {
    return undefined;
  }
  return candidate.map((option): Option => {
    if (option && typeof option === 'object') {
      const record = option as Record<string, unknown>;
      return { label: String(record.label ?? record.value ?? ''), value: record.value };
    }
    return { label: String(option), value: option };
  });
}

/** 文本：字符串原样、number/boolean 转字符串；其它返回 null。 */
export const textFormatter: Formatter = (value) => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
};

/** 数字：直接字符串化（精度/千分位留待业务扩展）。 */
export const numberFormatter: Formatter = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

/** 布尔：`是` / `否`（可被业务覆盖）。 */
export const booleanFormatter: Formatter = (value) => {
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  return null;
};

/** 日期：字符串原样、Date/时间戳格式化；非法返回 null。 */
export const dateFormatter: Formatter = (value) => {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  const date =
    value instanceof Date
      ? value
      : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

/** 枚举：从 schema 选项解析 label；任一缺失返回 null（回退 raw + 诊断）。 */
export const enumFormatter: Formatter = (value, context: FormatterContext) => {
  const options = extractOptions(context.schema);
  if (!options || options.length === 0) {
    return null;
  }
  if (value == null) {
    return null;
  }
  const resolveOne = (item: unknown): string | null =>
    options.find((option) => option.value === item)?.label ?? null;

  if (Array.isArray(value)) {
    const labels = value.map(resolveOne);
    return labels.some((label) => label === null)
      ? null
      : labels.join('、');
  }
  return resolveOne(value);
};

/** 人员/部门：优先使用冻结的 snapshotValue 展示名；缺失时回退 ID。 */
export const entityFormatter: Formatter = (value, context: FormatterContext) => {
  const snapshot = context.snapshotValue;
  if (snapshot == null) {
    if (value == null) {
      return null;
    }
    return Array.isArray(value) ? value.join('、') : String(value);
  }

  const entities = Array.isArray(snapshot) ? snapshot : [snapshot];
  const names = entities.map((entity) => {
    if (entity && typeof entity === 'object') {
      const record = entity as Record<string, unknown>;
      if (typeof record.name === 'string' && record.name.length > 0) {
        return record.name;
      }
      return String(record.id ?? '');
    }
    return String(entity);
  });
  return names.join('、');
};

export interface NamedFormatter {
  name: string;
  formatter: Formatter;
}

/** 默认 Formatter：按组件名 / 值类型两类 key 注册。 */
export const defaultFormatters: NamedFormatter[] = [
  { name: 'string', formatter: textFormatter },
  { name: 'text', formatter: textFormatter },
  { name: 'number', formatter: numberFormatter },
  { name: 'boolean', formatter: booleanFormatter },
  { name: 'date', formatter: dateFormatter },
  { name: 'enum', formatter: enumFormatter },
  { name: 'entity', formatter: entityFormatter },
  // 基础组件名 -> Formatter 映射
  { name: 'Input', formatter: textFormatter },
  { name: 'Textarea', formatter: textFormatter },
  { name: 'Number', formatter: numberFormatter },
  { name: 'Select', formatter: enumFormatter },
  { name: 'Radio', formatter: enumFormatter },
  { name: 'Checkbox', formatter: enumFormatter },
  { name: 'DatePicker', formatter: dateFormatter },
  // 组织/字典类组件（快照展示信息优先）
  { name: 'UserSelect', formatter: entityFormatter },
  { name: 'DeptSelect', formatter: entityFormatter },
  { name: 'DictSelect', formatter: enumFormatter },
];

/** 把默认 Formatter 注册进引擎的 `registry.formatters` 的插件。 */
export const defaultFormattersPlugin: FormEnginePlugin = {
  name: 'default-formatters',
  version: '1.0.0',
  install(context) {
    for (const { name, formatter } of defaultFormatters) {
      context.registry.formatters.register(name, formatter);
    }
  },
};
