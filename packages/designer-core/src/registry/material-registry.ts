import type { DesignerMaterialDefinition, SchemaDiagnostic } from '@x-form-engine/types';
import { createNamedRegistry } from './named-registry';
import type { NamedRegistry } from './named-registry';

/** 物料缺少 `runtimeTarget`（无法校验 Runtime 目标，C10）。 */
export const MATERIAL_RUNTIME_TARGET_MISSING = 'MATERIAL_RUNTIME_TARGET_MISSING';
/** `component` target 的 `componentName` 与物料 `componentName` 不一致（C10）。 */
export const MATERIAL_RUNTIME_TARGET_MISMATCH = 'MATERIAL_RUNTIME_TARGET_MISMATCH';

/**
 * Material 注册表（Task 4.1）。
 *
 * 在 `NamedRegistry` 基础上叠加按分类查询、清空与注册诊断。注册不静默跳过：
 * 缺失 `runtimeTarget`（warning）或 `component` target 与 `componentName` 不一致
 * （error）都会进入 `getDiagnostics()`，供 Schema 导出前做一致性校验（C10）。
 */
export interface MaterialRegistryImpl extends NamedRegistry<DesignerMaterialDefinition> {
  getByCategory(category: string): DesignerMaterialDefinition[];
  clear(): void;
  getDiagnostics(): SchemaDiagnostic[];
}

function validateMaterial(def: DesignerMaterialDefinition): SchemaDiagnostic[] {
  const target = def.runtimeTarget;
  if (!target) {
    return [
      {
        code: MATERIAL_RUNTIME_TARGET_MISSING,
        severity: 'warning',
        message: `Material "${def.name}" 未声明 runtimeTarget，导出时无法校验 Runtime 目标`,
        materialName: def.name,
      },
    ];
  }

  if (target.kind === 'component' && target.componentName !== def.componentName) {
    return [
      {
        code: MATERIAL_RUNTIME_TARGET_MISMATCH,
        severity: 'error',
        message: `Material "${def.name}" 的 runtimeTarget.componentName "${target.componentName}" 与 componentName "${def.componentName}" 不一致`,
        materialName: def.name,
        componentName: def.componentName,
      },
    ];
  }

  return [];
}

export function createMaterialRegistry(): MaterialRegistryImpl {
  const registry = createNamedRegistry<DesignerMaterialDefinition>();

  return {
    ...registry,
    getByCategory(category: string): DesignerMaterialDefinition[] {
      return registry.getAll().filter((def) => def.category === category);
    },
    clear(): void {
      for (const def of registry.getAll()) {
        registry.unregister(def.name);
      }
    },
    getDiagnostics(): SchemaDiagnostic[] {
      return registry.getAll().flatMap((def) => validateMaterial(def));
    },
  };
}
