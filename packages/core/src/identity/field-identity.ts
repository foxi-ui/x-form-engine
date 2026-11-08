import type { FieldPath } from '@x-form-engine/types';

/** 用字段 `name` 拼接稳定字段身份（数组行用 itemId，不用下标）。 */
export function joinFieldId(parts: readonly string[]): FieldPath {
  return parts.join('.');
}

export interface ItemIdentity {
  itemId: string;
  /** false 表示退化为序号，行重排/插入删除后可能错位（仅供诊断，不静默丢弃）。 */
  stable: boolean;
}

/** 从数组行对象中提取显式稳定身份：优先 `id` / `key`。 */
export function extractStableItemKey(item: unknown): string | undefined {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) {
    return undefined;
  }
  const record = item as Record<string, unknown>;
  for (const key of ['id', 'key'] as const) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return undefined;
}

/** 对行内容做确定性摘要（djb2），保证「相同内容 → 相同身份」的尽力稳定。 */
function contentDigest(value: unknown): string | null {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      return null;
    }
    let hash = 5381;
    for (let i = 0; i < serialized.length; i += 1) {
      hash = ((hash << 5) + hash + serialized.charCodeAt(i)) | 0;
    }
    return `item_${(hash >>> 0).toString(16)}`;
  } catch {
    return null;
  }
}

/**
 * 生成数组行稳定身份。
 *
 * 优先级：显式 `id`/`key` → 确定性内容摘要 → 序号（标记 unstable）。
 * 不用裸数组下标作为历史重复行的唯一身份。
 */
export function createItemId(item: unknown, index: number): ItemIdentity {
  const key = extractStableItemKey(item);
  if (key !== undefined) {
    return { itemId: key, stable: true };
  }

  const digest = contentDigest(item);
  if (digest !== null) {
    return { itemId: digest, stable: true };
  }

  return { itemId: `item_${index}`, stable: false };
}
