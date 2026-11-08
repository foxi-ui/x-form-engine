export type Locale = string;

export type I18nMessages = Record<Locale, Record<string, string>>;

export interface I18nService {
  /** 当前 locale。 */
  readonly locale: string;
  /** 翻译 key；缺失时返回 key 本身（不抛错，便于诊断）。 */
  t(key: string, params?: Record<string, unknown>): string;
  has(key: string): boolean;
}
