/**
 * @deprecated 兼容 Facade（Task 9.5）：ComponentBinding → Designable 物料派生已迁至
 * `@x-form-engine/designer-designable`（`createDesignableMaterials`）。本文件仅保留旧
 * 公开签名，新代码请直接使用 `@x-form-engine/designer-designable`。
 */
export { createDesignableMaterials as createDesignerMaterials } from '@x-form-engine/designer-designable';
export type { DesignerHostComponent } from '@x-form-engine/designer-designable';
export type { DesignableMaterialMap as DesignerMaterialMap } from '@x-form-engine/designer-designable';
