import { resolveFieldAccess } from '@x-form-engine/services';
import type {
  ComponentBinding,
  FieldSnapshot,
  Formatter,
  FormatterContext,
  Platform,
  ReadonlyComponentProps,
  ReadonlyDiagnostic,
  ReadonlyRenderContext,
  ReadonlyRendererProps,
} from '@x-form-engine/types';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import { useFormEngine } from '../context';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isObjectArrayField(
  fieldSchema: Record<string, unknown>,
  value: unknown
): value is Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return false;
  }
  const items = fieldSchema.items;
  return isPlainObject(items) && isPlainObject(items.properties);
}

function toDisplayText(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => toDisplayText(item)).join('、');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.name === 'string' && record.name.length > 0) {
      return record.name;
    }
    return String(record.id ?? '');
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatterTypeOf(value: unknown): string {
  if (typeof value === 'string') {
    return 'string';
  }
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  return 'unknown';
}

interface FieldOption {
  label: string;
  value: unknown;
}

function extractOptions(
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

/** 无快照 displayValue 时，按 Schema 静态规则解析枚举 label（多选连接）。 */
function resolveEnumFromSchema(
  fieldSchema: Record<string, unknown>,
  value: unknown
): unknown {
  const options = extractOptions(fieldSchema);
  if (!options || options.length === 0 || value == null) {
    return undefined;
  }
  const resolveOne = (item: unknown): string | undefined =>
    options.find((option) => option.value === item)?.label;

  if (Array.isArray(value)) {
    const labels = value.map(resolveOne);
    return labels.some((label) => label === undefined)
      ? undefined
      : labels.join('、');
  }
  return resolveOne(value);
}

/**
 * 独立只读渲染器：不创建 Formily Form，不执行编辑态 Reactions/Effects，
 * 不访问实时数据源。展示优先级：快照 `displayValue` → 组件只读实现 →
 * Formatter → 原始值 + 诊断（Unknown）。
 */
export function ReadonlyRenderer(props: ReadonlyRendererProps): ReactElement {
  const engine = useFormEngine();
  const platform: Platform = props.platform ?? 'pc';
  const locale = props.locale ?? engine.options.locale ?? 'zh-CN';
  const diagnostics: ReadonlyDiagnostic[] = [];
  const context: ReadonlyRenderContext = { locale, platform, diagnostics };

  const { schema, snapshot, values, permission } = props;

  const children = renderFields(
    engine,
    schema,
    values ?? {},
    snapshot?.fields ?? {},
    [],
    permission,
    context
  );

  return <div className="x-form-engine-readonly">{children}</div>;
}

function renderFields(
  engine: ReturnType<typeof useFormEngine>,
  schemaNode: Record<string, unknown>,
  valuesNode: Record<string, unknown>,
  snapshotFields: Record<string, FieldSnapshot>,
  pathSegments: string[],
  permission: ReadonlyRendererProps['permission'],
  context: ReadonlyRenderContext
): ReactNode[] {
  const properties = schemaNode.properties;
  if (!isPlainObject(properties)) {
    return [];
  }

  const nodes: ReactNode[] = [];
  for (const [name, fieldSchema] of Object.entries(properties)) {
    if (!isPlainObject(fieldSchema)) {
      continue;
    }

    const path = [...pathSegments, name].join('.');
    const snapshotField = snapshotFields[path];
    const value =
      snapshotField !== undefined ? snapshotField.value : valuesNode[name];
    const snapshotValue = snapshotField?.displayValue;

    // 不可读字段不渲染（隐藏字段在进入只读组件前已被过滤）
    if (
      permission &&
      !resolveFieldAccess({ envelope: permission, path }).read
    ) {
      continue;
    }

    if (isObjectArrayField(fieldSchema, value)) {
      nodes.push(
        renderArrayField(
          engine,
          fieldSchema,
          snapshotField,
          value,
          path,
          context
        )
      );
    } else if (isPlainObject(fieldSchema.properties) && isPlainObject(value)) {
      nodes.push(
        <div key={path} className="readonly-object">
          {typeof fieldSchema.title === 'string' && (
            <div className="readonly-field-label">{fieldSchema.title}</div>
          )}
          {renderFields(
            engine,
            fieldSchema,
            value,
            snapshotFields,
            [...pathSegments, name],
            permission,
            context
          )}
        </div>
      );
    } else {
      nodes.push(
        renderLeafField(
          engine,
          fieldSchema,
          value,
          snapshotValue,
          path,
          context
        )
      );
    }
  }
  return nodes;
}

function renderLeafField(
  engine: ReturnType<typeof useFormEngine>,
  fieldSchema: Record<string, unknown>,
  value: unknown,
  snapshotValue: unknown,
  path: string,
  context: ReadonlyRenderContext
): ReactNode {
  const title =
    typeof fieldSchema.title === 'string' ? fieldSchema.title : undefined;
  const component =
    typeof fieldSchema['x-component'] === 'string'
      ? fieldSchema['x-component']
      : undefined;
  const binding = component
    ? engine.registry.components.get(component)
    : undefined;

  const readonlyImpl =
    binding?.readonly?.[context.platform] ?? binding?.readonly?.default;

  // 展示优先级：快照 displayValue → Schema 静态规则（枚举）→ 原始值
  const displayValue =
    snapshotValue !== undefined
      ? snapshotValue
      : resolveEnumFromSchema(fieldSchema, value);

  let body: ReactNode;
  if (readonlyImpl) {
    body = renderReadonlyComponent(readonlyImpl, {
      value,
      snapshotValue: displayValue,
      schema: fieldSchema,
      locale: context.locale,
      context,
    });
  } else if (binding) {
    body = renderFormatterFallback(
      engine,
      component as string,
      value,
      displayValue,
      fieldSchema,
      path,
      context
    );
  } else {
    // 未注册组件：直接 Unknown 兜底（原始值 + 诊断），不执行未知组件代码
    context.diagnostics.push({
      path,
      code: 'UNKNOWN_COMPONENT',
      message: `组件 "${component ?? '(未声明)'}" 未注册`,
    });
    body = <ReadonlyUnknown value={value} component={component} path={path} />;
  }

  return (
    <div key={path} className="readonly-field">
      {title && <div className="readonly-field-label">{title}</div>}
      <div className="readonly-field-value">{body}</div>
    </div>
  );
}

function renderReadonlyComponent(
  impl: unknown,
  props: ReadonlyComponentProps
): ReactNode {
  const Component = impl as ComponentType<ReadonlyComponentProps>;
  return <Component {...props} />;
}

function renderFormatterFallback(
  engine: ReturnType<typeof useFormEngine>,
  component: string | undefined,
  value: unknown,
  snapshotValue: unknown,
  fieldSchema: Record<string, unknown>,
  path: string,
  context: ReadonlyRenderContext
): ReactNode {
  const formatterContext: FormatterContext = {
    path,
    locale: context.locale,
    schema: fieldSchema,
    snapshotValue,
  };

  const byComponent = component
    ? (engine.registry.formatters.get(component) as Formatter | undefined)
    : undefined;
  const formatted = byComponent
    ? byComponent(value, formatterContext)
    : null;

  if (formatted !== null) {
    return <span>{formatted}</span>;
  }

  const byType = engine.registry.formatters.get(
    formatterTypeOf(value)
  ) as Formatter | undefined;
  const typeFormatted = byType ? byType(value, formatterContext) : null;
  if (typeFormatted !== null) {
    return <span>{typeFormatted}</span>;
  }

  // 已注册组件但无只读实现/Formatter：兜底原始值 + 诊断
  context.diagnostics.push({
    path,
    code: 'NO_READONLY_IMPL',
    message: `组件 "${component ?? '(未声明)'}" 无只读实现或 Formatter`,
  });
  return <ReadonlyUnknown value={value} component={component} path={path} />;
}

function ReadonlyUnknown({
  value,
  component,
  path,
}: {
  value: unknown;
  component?: string;
  path: string;
}): ReactElement {
  const text = toDisplayText(value);
  return (
    <span
      className="readonly-unknown"
      data-path={path}
      title={`未知组件: ${component ?? '(未声明)'}`}
    >
      {text === '' ? '—' : text}
      <span className="readonly-unknown-badge">（未知组件）</span>
    </span>
  );
}

function renderArrayField(
  engine: ReturnType<typeof useFormEngine>,
  fieldSchema: Record<string, unknown>,
  snapshotField: FieldSnapshot | undefined,
  value: Record<string, unknown>[],
  path: string,
  context: ReadonlyRenderContext
): ReactNode {
  const title =
    typeof fieldSchema.title === 'string' ? fieldSchema.title : path;

  const items = snapshotField?.items;
  if (items && items.length > 0) {
    return (
      <div key={path} className="readonly-array">
        <div className="readonly-field-label">{title}</div>
        {items.map((item) => (
          <div key={item.itemId} className="readonly-array-item">
            {Object.values(item.fields).map((field) =>
              renderSnapshotLeaf(engine, field, context)
            )}
          </div>
        ))}
      </div>
    );
  }

  const text = toDisplayText(snapshotField?.displayValue ?? value);
  return (
    <div key={path} className="readonly-array">
      <div className="readonly-field-label">{title}</div>
      <div className="readonly-field-value">{text === '' ? '—' : text}</div>
    </div>
  );
}

function renderSnapshotLeaf(
  engine: ReturnType<typeof useFormEngine>,
  field: FieldSnapshot,
  context: ReadonlyRenderContext
): ReactNode {
  const binding = engine.registry.components.get(field.component);
  const readonlyImpl =
    binding?.readonly?.[context.platform] ?? binding?.readonly?.default;

  if (readonlyImpl) {
    return renderReadonlyComponent(readonlyImpl, {
      value: field.value,
      snapshotValue: field.displayValue,
      schema: {},
      locale: context.locale,
      context,
    });
  }

  const text = toDisplayText(
    field.displayValue !== undefined ? field.displayValue : field.value
  );
  return <span key={field.path}>{text === '' ? '—' : text}</span>;
}
