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

/**
 * 深拷贝候选快照的输入值，确保快照不引用调用方传入的可变对象。
 *
 * 处理 Date / File / Blob（`toJS` 按引用返回的可变/非 plain 叶子），
 * 并递归 plain object 与数组；其余值（primitive、函数等）原样返回。
 */
export function cloneValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (typeof File !== 'undefined' && value instanceof File) {
    return new File([value], value.name, {
      type: value.type,
      lastModified: value.lastModified,
    });
  }
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return value.slice(0, value.size, value.type);
  }
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      result[key] = cloneValue(value[key]);
    }
    return result;
  }
  return value;
}
