/**
 * 人员 / 部门类组件的 Value 规范化与 Snapshot 冻结参考实现。
 * 对应 `verification/06` 协议：Value 只存稳定 ID，Snapshot 冻结提交时展示信息。
 */

export type EntityId = string;

export interface EntityRef {
  id: EntityId;
  name: string;
  [key: string]: unknown;
}

export interface SnapshotEntity extends EntityRef {
  missing?: true;
}

function toIds(value: unknown): EntityId[] {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  return list
    .map((item) =>
      typeof item === 'string'
        ? item
        : typeof item === 'object' && item !== null
          ? (item as EntityRef).id
          : undefined
    )
    .filter((id): id is EntityId => typeof id === 'string' && id.length > 0);
}

/**
 * 规范化实体选择值：单选返回 `id | null`，多选返回去重保序的 `id[]`。
 * 接受 `string`、`{ id }`、`string[]`、`{ id }[]`；非法项（空串、无 id 对象）丢弃。
 */
export function normalizeEntityValue(
  input: unknown,
  multiple: boolean
): EntityId | EntityId[] | null {
  if (!multiple) {
    return toIds(input)[0] ?? null;
  }
  return Array.from(new Set(toIds(input)));
}

/**
 * 冻结实体展示信息：查得到返回副本，查不到保留 `id` 并标记 `missing`，
 * 交由只读渲染器显示降级文案（不伪造名称）。
 */
export function createEntitySnapshots(
  ids: EntityId[],
  directory: Map<EntityId, EntityRef>
): SnapshotEntity[] {
  return ids.map((id) => {
    const found = directory.get(id);
    return found ? { ...found } : { id, name: '', missing: true };
  });
}
