export const ENGINE_SCHEMA_VERSION = '1.0.0';

/**
 * 设计器持久化元数据（C1）。
 *
 * 与 Runtime Schema（`FormSchemaDocument.schema`）分离，保存需要跨编辑会话保存的
 * 设计器信息（如画布布局、节点设计态标识）。具体结构由 Designer Core 定义，本类型
 * 只提供版本轴 + 可扩展槽位，保持 `types` 包 UI / Formily 无关。
 */
export interface DesignerMetadata {
  /**
   * 元数据版本，用于版本检测。设计器元数据迁移轴尚未纳入 `migration.ts` 的
   * `VersionAxis`（Phase 5/7 补齐后再做有序迁移，见 phase-1 报告遗留项）。
   */
  version?: string;
  [key: string]: unknown;
}

export interface FormSchemaDocument {
  schemaId: string;
  version: number;
  engineSchemaVersion: string;
  formilyVersion?: string;
  /** Runtime Schema，保持 `Record<string, unknown>`，不得收窄为 Formily `ISchema`（C1）。 */
  schema: Record<string, unknown>;
  /** 设计器元数据（兼容性扩展，C1）：不混入 Runtime Schema。 */
  designerMetadata?: DesignerMetadata;
  createdAt?: string;
  updatedAt?: string;
}
