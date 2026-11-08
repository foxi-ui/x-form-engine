/**
 * `@x-form-engine/sdk` —— 业务项目唯一依赖入口。
 *
 * 仅在此处聚合公共 API，业务项目不应直接依赖 `core` / `renderer` 等内部包。
 * 类型全部来自 `@x-form-engine/types`，不泄漏 Formily / Designable 内部类型。
 */
export * from '@x-form-engine/types';

export {
  createFormEngine,
  createMigrationRegistry,
  createItemId,
  extractStableItemKey,
  joinFieldId,
  KNOWN_X_ENGINE_KEYS,
  parseSchemaDocument,
  validateEngineSchema,
} from '@x-form-engine/core';
export type { SchemaValidationResult } from '@x-form-engine/core';

export {
  createCandidateSnapshot,
  createDictSnapshot,
  createEntitySnapshots,
  normalizeEntityValue,
  normalizeFormValues,
} from '@x-form-engine/adapters';
export type {
  CandidateSnapshotOptions,
  NormalizeOptions,
  SnapshotDiagnostic,
} from '@x-form-engine/adapters';

export {
  canSubmit,
  createI18nService,
  createStaticDatasourceService,
  defaultFormatters,
  defaultFormattersPlugin,
  filterWritableValues,
  resolveFieldAccess,
  resolveFormAccess,
} from '@x-form-engine/services';

export {
  FormEngineProvider,
  FormRenderer,
  ReadonlyRenderer,
  useFormEngine,
} from '@x-form-engine/renderer';
export type { FormRendererInstance, FormRendererProps } from '@x-form-engine/renderer';
