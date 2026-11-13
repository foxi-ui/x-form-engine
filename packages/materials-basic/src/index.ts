import { basicComponents } from '@x-form-engine/components';
import type { DesignerMaterialDefinition } from '@x-form-engine/types';
import { deriveDesignerMaterials } from './derive-materials';

export * from './derive-materials';

const derived = deriveDesignerMaterials(basicComponents);

/**
 * 基础物料（Task 6.1）。
 *
 * 由 `basicComponents`（7 个基础组件）派生，每个物料声明 `runtimeTarget`，
 * `createSchema` 生成的字段可被现有 Runtime 渲染；不直接操作 Designable。
 */
export const basicMaterials: DesignerMaterialDefinition[] = derived.materials;

/** 派生过程中累积的诊断（基础组件均有 pc 实现，正常为空）。 */
export const basicMaterialsDiagnostics = derived.diagnostics;
