/**
 * 四条相互独立的版本轴，各自拥有独立的迁移注册表与目标版本。
 * 破坏性变更必须提升对应轴的版本并提供迁移器或明确拒绝策略。
 */
export type VersionAxis = 'schema' | 'snapshot' | 'engineSchema' | 'component';

export interface VersionedDocument {
  [key: string]: unknown;
}

export interface Migration {
  axis: VersionAxis;
  from: string;
  to: string;
  migrate: (input: VersionedDocument) => VersionedDocument;
}

export type MigrationErrorCode =
  | 'NO_MIGRATION'
  | 'AMBIGUOUS_MIGRATION'
  | 'BAD_MIGRATOR_OUTPUT'
  | 'CYCLE_DETECTED';

export interface MigrationFailure {
  code: MigrationErrorCode;
  axis: VersionAxis;
  version: string;
  message: string;
}

export interface MigrationResult {
  result: VersionedDocument;
  applied: string[];
  original: VersionedDocument;
}

export interface MigrationAxisConfig {
  versionKey: string;
  target: string;
}

export interface MigrationRegistry {
  /** 注册迁移器，返回注册表本身以支持链式注册。 */
  register(migration: Migration): MigrationRegistry;
  migrate(axis: VersionAxis, input: VersionedDocument): MigrationResult;
}
