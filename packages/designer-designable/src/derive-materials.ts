import type { ReactComponentBinding } from '@x-form-engine/components';
import type { DesignerMaterialDefinition, SchemaDiagnostic } from '@x-form-engine/types';

/** ComponentBinding 缺少 `implementations.pc`（无法作为画布物料，C5）。 */
export const MATERIAL_PC_IMPLEMENTATION_MISSING = 'MATERIAL_PC_IMPLEMENTATION_MISSING';
/** 派生出的物料 `componentName` 重复（Task 5.6 冲突诊断）。 */
export const MATERIAL_COMPONENT_NAME_CONFLICT = 'MATERIAL_COMPONENT_NAME_CONFLICT';

export interface DeriveMaterialsResult {
  materials: DesignerMaterialDefinition[];
  diagnostics: SchemaDiagnostic[];
}

/**
 * 从 ComponentBinding 派生框架无关的 DesignerMaterialDefinition（Task 5.6）。
 *
 * - 缺 `implementations.pc` 的 binding 不再静默跳过，而是产生诊断（C5）。
 * - 相同 `componentName` 冲突产生诊断，不重复注册。
 * - `createSchema` 保留 Formily 原生字段（`type`/`x-decorator`/`x-component`），
 *   `designerComponent` 携带 React host（`unknown` 占位，Designable Adapter 消费）。
 */
export function deriveDesignerMaterials(
  bindings: ReactComponentBinding[]
): DeriveMaterialsResult {
  const materials: DesignerMaterialDefinition[] = [];
  const diagnostics: SchemaDiagnostic[] = [];
  const seen = new Set<string>();

  for (const binding of bindings) {
    const name = binding.protocol.name;
    const pc = binding.implementations.pc;

    if (!pc) {
      diagnostics.push({
        code: MATERIAL_PC_IMPLEMENTATION_MISSING,
        severity: 'warning',
        message: `ComponentBinding "${name}" 缺少 implementations.pc，无法作为画布物料`,
        materialName: name,
      });
      continue;
    }

    if (seen.has(name)) {
      diagnostics.push({
        code: MATERIAL_COMPONENT_NAME_CONFLICT,
        severity: 'error',
        message: `ComponentBinding "${name}" 的 componentName 重复`,
        materialName: name,
        componentName: name,
      });
      continue;
    }
    seen.add(name);

    materials.push({
      name,
      version: binding.protocol.version,
      title: binding.protocol.meta.title,
      description: binding.protocol.meta.description,
      category: binding.protocol.meta.category,
      componentName: name,
      designerComponent: pc,
      runtimeTarget: { kind: 'component', componentName: name },
      createSchema: () => ({
        type: 'string',
        title: binding.protocol.meta.title,
        'x-decorator': 'FormItem',
        'x-component': name,
      }),
    });
  }

  return { materials, diagnostics };
}
