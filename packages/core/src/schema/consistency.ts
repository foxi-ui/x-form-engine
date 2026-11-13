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
 * 设计器导出一致性闸门（S1）：组合 Schema→Runtime 组件注册校验与
 * Material→Runtime target 校验。error 级诊断表示「画了、Runtime 渲染不出」的失配，
 * 由导出路径调用方决定拒绝或降级。纯函数 + 依赖倒置，宿主为 `core`，不违反 C13。
 */
export interface DesignerExportCheckOptions {
  components: ReadonlySet<string>;
  decorators: ReadonlySet<string>;
  /** 参与本次导出的物料（可选），逐一做 runtimeTarget 可映射校验。 */
  materials?: DesignerMaterialDefinition[];
}

export function validateDesignerExport(
  schema: unknown,
  options: DesignerExportCheckOptions
): SchemaDiagnostic[] {
  const diagnostics = checkSchemaComponentRegistrations(
    schema,
    options.components,
    options.decorators
  );

  for (const material of options.materials ?? []) {
    diagnostics.push(...checkMaterialRuntimeTarget(material, options.components));
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
