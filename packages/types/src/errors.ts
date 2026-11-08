export type FormEngineErrorCode =
  | 'SCHEMA_INVALID'
  | 'SCHEMA_VERSION_UNSUPPORTED'
  | 'COMPONENT_NOT_FOUND'
  | 'COMPONENT_CAPABILITY_MISMATCH'
  | 'PLUGIN_CONFLICT'
  | 'PLUGIN_DEPENDENCY_MISSING'
  | 'DATASOURCE_FAILED'
  | 'SNAPSHOT_FAILED'
  | 'PERMISSION_DENIED'
  | 'MIGRATION_FAILED'
  | 'VALUE_NORMALIZE_FAILED'
  | 'SNAPSHOT_VERSION_UNSUPPORTED'
  | 'RENDER_FAILED'
  | 'ENGINE_DISPOSED';

export class FormEngineError extends Error {
  constructor(
    public readonly code: FormEngineErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'FormEngineError';
  }
}
