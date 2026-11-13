/**
 * @deprecated 兼容 Facade（Task 9.5 / C12）：Designable 耦合实现（引擎引导、物料派生、
 * Schema 往返）已迁至 `@x-form-engine/designer-designable`；新设计器的权威入口是
 * `@x-form-engine/designer-core`（headless）+ `@x-form-engine/designer-designable`（Adapter）。
 *
 * 本包仅保留 M2 旧公开签名供 `apps/designer-demo` 兼容，避免长期双轨——新代码请勿再依赖本包。
 */

export { createDesignableMaterials as createDesignerMaterials } from '@x-form-engine/designer-designable';
export type { DesignerHostComponent } from '@x-form-engine/designer-designable';
export type { DesignableMaterialMap as DesignerMaterialMap } from '@x-form-engine/designer-designable';

export { createDesignableEngine as createEngineDesigner } from '@x-form-engine/designer-designable';

export { exportSchemaDocument, importSchemaDocument } from './schema-io';
export type { ExportSchemaOptions, ImportedSchemaDocument } from './schema-io';

export { DesignerPreview } from './preview';
export type { DesignerPreviewProps } from './preview';

export { OptionsSetter } from './setters';
export type { OptionItem, OptionsSetterProps } from './setters';
