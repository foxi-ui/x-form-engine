import { describe, expect, it } from 'vitest';
import { createStaticDatasourceService } from '../datasource';
import { createI18nService } from '../i18n';

describe('createI18nService', () => {
  const i18n = createI18nService(
    {
      'zh-CN': { greeting: '你好，{{name}}' },
      en: { greeting: 'Hello, {{name}}' },
    },
    'zh-CN'
  );

  it('按 locale 翻译并插值', () => {
    expect(i18n.t('greeting', { name: '张三' })).toBe('你好，张三');
  });

  it('缺失 key 返回 key 本身', () => {
    expect(i18n.t('missing')).toBe('missing');
    expect(i18n.has('missing')).toBe(false);
    expect(i18n.has('greeting')).toBe(true);
  });
});

describe('createStaticDatasourceService', () => {
  it('支持分页与 keyword 过滤', async () => {
    const service = createStaticDatasourceService([
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Banana' },
      { value: 'c', label: 'Cherry' },
    ]);

    const page1 = await service.query({ service: 'dict', page: 1, pageSize: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(3);
    expect(page1.hasMore).toBe(true);

    const filtered = await service.query({
      service: 'dict',
      keyword: 'Banana',
    });
    expect(filtered.items).toEqual([{ value: 'b', label: 'Banana' }]);
  });
});
