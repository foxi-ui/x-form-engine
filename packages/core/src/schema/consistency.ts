import type { DesignerMaterialDefinition, SchemaDiagnostic } from '@x-form-engine/types';
import { collectSchemaComponentRefs } from './diagnostics';

/** Schema 引用了未注册的组件（C10，不静默渲染 void 字段）。 */
export const COMPONENT_NOT_REGISTERED = 'COMPONENT_NOT_REGISTERED';
/** Schema 引用了未注册的装饰器。 */
export const DECORATOR_NOT_REGISTERED = 'DECORATOR_NOT_REGISTERED';
/** Material 的 `component` target 在 Runtime 注册表中无对应绑定。 */
export const MATERIAL_COMPONENT_NOT_REGISTERED = 'MATERIAL_COMPONENT_NOT_REGISTERED';

/**
 * Runtime 解析检查（Task 7.3）：校验 Schema 引用的 `x-component` / `x-decorator`
 * 是否都已注册。未注册项产生 `error` 诊断，不静默跳过。
 *
 * 依据 `collectSchemaComponentRefs` 遍历 `properties` / `items`，走
 * ComponentBinding 的实际映射（不是字符串相等）。`components` / `decorators`
 * 由调用方从 Engine Registry 派生（如 `engine.registry.components.list()`）。
 */
export function checkSchemaComponentRegistrations(
  schema: unknown,
  components: ReadonlySet<string>,
  decorators: ReadonlySet<string>
): SchemaDiagnostic[] {
  const refs = collectSchemaComponentRefs(schema);
  const diagnostics: SchemaDiagnostic[] = [];

  for (const name of refs.components) {
    if (!components.has(name)) {
      diagnostics.push({
        code: COMPONENT_NOT_REGISTERED,
        severity: 'error',
        message: `Schema 引用了未注册的组件 "${name}"`,
        componentName: name,
      });
    }
  }

  for (const name of refs.decorators) {
    if (!decorators.has(name)) {
      diagnostics.push({
        code: DECORATOR_NOT_REGISTERED,
        severity: 'error',
        message: `Schema 引用了未注册的装饰器 "${name}"`,
        componentName: name,
      });
    }
  }

  return diagnostics;
}

/**
 * Material Target 检查（Task 7.1）：校验 Material 的 `component` target 在 Runtime
 * 注册表中可映射。`designer-only` / `schema-container` 不参与组件注册校验；
 * 缺 `runtimeTarget` 的诊断由 MaterialRegistry 注册阶段负责（Phase 4）。
 */
export function checkMaterialRuntimeTarget(
  material: DesignerMaterialDefinition,
  components: ReadonlySet<string>
): SchemaDiagnostic[] {
  const target = material.runtimeTarget;
  if (!target || target.kind !== 'component') {
    return [];
  }

  if (!components.has(target.componentName)) {
    return [
      {
        code: MATERIAL_COMPONENT_NOT_REGISTERED,
        severity: 'error',
        message: `Material "${material.name}" 的 runtimeTarget.componentName "${target.componentName}" 在 Runtime 注册表中不存在`,
        materialName: material.name,
        componentName: target.componentName,
      },
    ];
  }

  return [];
}
