import type { I18nService } from './i18n';
import type { PermissionService } from './permission';
import type { CandidateSnapshot } from './value';

export interface DatasourceRequest {
  service: string;
  params?: Record<string, unknown>;
  keyword?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export interface DatasourceResult<T = unknown> {
  items: T[];
  total?: number;
  hasMore?: boolean;
}

export interface DatasourceService {
  query<T = unknown>(request: DatasourceRequest): Promise<DatasourceResult<T>>;
}

export interface SnapshotValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** 快照服务：前端只校验候选快照结构，不做权威补全（后端负责）。 */
export interface SnapshotService {
  validate?(snapshot: CandidateSnapshot): SnapshotValidationResult;
}

export interface EngineServices {
  datasource?: DatasourceService;
  permission?: PermissionService;
  i18n?: I18nService;
  snapshot?: SnapshotService;
}
