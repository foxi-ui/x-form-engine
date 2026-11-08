import type {
  DatasourceRequest,
  DatasourceResult,
  DatasourceService,
} from '@x-form-engine/types';

/**
 * 静态数据源兜底：用于字典/选项等无需远程请求的场景。
 * keyword 做朴素包含匹配（演示用），支持分页。
 */
export function createStaticDatasourceService<T>(
  items: T[]
): DatasourceService {
  return {
    async query<U = unknown>(
      request: DatasourceRequest
    ): Promise<DatasourceResult<U>> {
      const list = items as unknown as U[];
      const keyword = request.keyword;
      const filtered = keyword
        ? list.filter((item) => JSON.stringify(item).includes(keyword))
        : list;

      const page = request.page ?? 1;
      const pageSize = request.pageSize ?? Math.max(filtered.length, 1);
      const start = (page - 1) * pageSize;
      const slice = filtered.slice(start, start + pageSize);

      return {
        items: slice,
        total: filtered.length,
        hasMore: start + pageSize < filtered.length,
      };
    },
  };
}
