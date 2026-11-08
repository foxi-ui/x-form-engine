import type { PlatformFallbackDiagnostic } from '@x-form-engine/types';

/** 当前 Schema 中按名称引用的组件与装饰器集合。 */
export interface SchemaComponentRefs {
  components: Set<string>;
  decorators: Set<string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 递归收集 Schema 中的 `x-component` / `x-decorator` 名称引用。
 *
 * 遍历 `properties` 的每个子节点与 `items`（对象或数组），忽略非对象节点；
 * 只收集字符串型名称，其余形态视为无效扩展不参与诊断过滤。
 */
export function collectSchemaComponentRefs(schema: unknown): SchemaComponentRefs {
  const components = new Set<string>();
  const decorators = new Set<string>();

  const visit = (node: unknown): void => {
    if (!isRecord(node)) {
      return;
    }

    const component = node['x-component'];
    if (typeof component === 'string') {
      components.add(component);
    }

    const decorator = node['x-decorator'];
    if (typeof decorator === 'string') {
      decorators.add(decorator);
    }

    const properties = node.properties;
    if (isRecord(properties)) {
      for (const child of Object.values(properties)) {
        visit(child);
      }
    }

    const items = node.items;
    if (Array.isArray(items)) {
      for (const child of items) {
        visit(child);
      }
    } else {
      visit(items);
    }
  };

  visit(schema);

  return { components, decorators };
}

/**
 * 过滤出当前 Schema 实际引用的回退诊断。
 *
 * 同 `kind:name` 只保留第一条，避免一个组件在 Schema 中多次引用时重复提示。
 */
export function filterDiagnosticsBySchema(
  diagnostics: PlatformFallbackDiagnostic[],
  schema: unknown
): PlatformFallbackDiagnostic[] {
  const refs = collectSchemaComponentRefs(schema);
  const seen = new Set<string>();

  return diagnostics.filter((diagnostic) => {
    const referenced =
      diagnostic.kind === 'component' ? refs.components : refs.decorators;
    if (!referenced.has(diagnostic.name)) {
      return false;
    }

    const key = `${diagnostic.kind}:${diagnostic.name}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
