import type { I18nMessages, I18nService } from '@x-form-engine/types';

/**
 * 创建最小 I18n 服务：locale + key 查找 + `{{param}}` 插值。
 * 缺失 key 时返回 key 本身（不抛错，便于诊断）。
 */
export function createI18nService(
  messages: I18nMessages,
  locale = 'zh-CN'
): I18nService {
  return {
    locale,
    has(key: string): boolean {
      return messages[locale]?.[key] !== undefined;
    },
    t(key: string, params?: Record<string, unknown>): string {
      let text = messages[locale]?.[key] ?? key;
      if (params) {
        for (const [name, value] of Object.entries(params)) {
          text = text.replace(
            new RegExp(`\\{\\{${name}\\}\\}`, 'g'),
            String(value)
          );
        }
      }
      return text;
    },
  };
}
