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

export interface EngineServices {
  datasource?: DatasourceService;
}
