import type {
  ComponentAdapter,
  ComponentBinding,
  FormEngine,
} from '@x-form-engine/types';
import { isPlainObject } from './internal';

export interface FieldOption {
  label: string;
  value: unknown;
}

export interface FieldMeta {
  /** `x-component` 名称；未知时 undefined。 */
  component: string | undefined;
  binding: ComponentBinding | undefined;
  componentVersion: string | undefined;
  title: string | undefined;
  options: FieldOption[] | undefined;
  adapter: ComponentAdapter | undefined;
}

/** 从字段 schema 中提取选项：`x-component-props.options` → `enum` → `options`。 */
export function extractOptions(
  fieldSchema: Record<string, unknown>
): FieldOption[] | undefined {
  const componentProps = fieldSchema['x-component-props'];
  const candidate =
    (isPlainObject(componentProps) && componentProps.options) ||
    fieldSchema.enum ||
    fieldSchema.options;

  if (!Array.isArray(candidate)) {
    return undefined;
  }

  return candidate.map((option): FieldOption => {
    if (isPlainObject(option)) {
      return {
        label: String(option.label ?? option.value ?? ''),
        value: option.value,
      };
    }
    return { label: String(option), value: option };
  });
}

/** 解析字段的组件元数据：组件名、binding、版本、标题、选项、adapter。 */
export function resolveFieldMeta(
  engine: FormEngine,
  fieldSchema: Record<string, unknown>
): FieldMeta {
  const component =
    typeof fieldSchema['x-component'] === 'string'
      ? fieldSchema['x-component']
      : undefined;
  const binding = component
    ? engine.registry.components.get(component)
    : undefined;

  return {
    component,
    binding,
    componentVersion: binding?.protocol.version,
    title: typeof fieldSchema.title === 'string' ? fieldSchema.title : undefined,
    options: extractOptions(fieldSchema),
    adapter: binding?.protocol.adapter,
  };
}
