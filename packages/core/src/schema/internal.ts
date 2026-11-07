/**
 * 判断一个值是否为“普通对象”：非 null、非数组，且原型为 Object.prototype 或 null。
 *
 * Schema 文档、字段 schema 与 `x-engine` 配置都要求是普通对象，
 * 类实例、数组、null 等一律拒绝。
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
