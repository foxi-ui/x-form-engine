/** 判断一个值是否为「普通对象」：非 null、非数组，原型为 Object.prototype 或 null。 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** 判断一个值是否为「对象数组」（重复行 / 明细表结构）。 */
export function isArrayOfObjects(
  value: unknown
): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((item) => isPlainObject(item));
}

/**
 * 判断字段是否为「对象数组字段」（ArrayTable/Repeater）：值为数组且 schema 的
 * `items.properties` 存在。多选（数组 primitive）不满足，按叶字段处理。
 */
export function isObjectArrayField(
  fieldSchema: Record<string, unknown>,
  value: unknown
): value is Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return false;
  }
  const items = fieldSchema.items;
  return isPlainObject(items) && isPlainObject(items.properties);
}
