import { describe, expect, it } from 'vitest'

/**
 * 第 6 项协议验证：人员 / 部门 / 字典组件的 Value 与 Snapshot 标准。
 * 这里不依赖真实后端，只验证规范化规则和边界语义是否可实现、无歧义。
 */

type EntityId = string

interface EntityRef {
  id: EntityId
  name: string
  [key: string]: unknown
}

interface SnapshotEntity extends EntityRef {
  missing?: true
}

/** 单选返回 id | null；多选返回去重后的 id[]，永不返回 null/undefined。 */
function normalizeEntityValue(
  input: unknown,
  multiple: boolean
): EntityId | EntityId[] | null {
  const toIds = (value: unknown): EntityId[] => {
    const list = Array.isArray(value) ? value : value == null ? [] : [value]
    return list
      .map((item) =>
        typeof item === 'string'
          ? item
          : typeof item === 'object' && item !== null
            ? (item as EntityRef).id
            : undefined
      )
      .filter((id): id is EntityId => typeof id === 'string' && id.length > 0)
  }

  if (!multiple) return toIds(input)[0] ?? null
  return Array.from(new Set(toIds(input)))
}

/**
 * Snapshot 必须保留提交时的展示信息；目录中查不到的 ID 不能静默丢弃，
 * 而是保留 id 并标记 missing，交由只读渲染器显示降级文案。
 */
function createEntitySnapshots(
  ids: EntityId[],
  directory: Map<EntityId, EntityRef>
): SnapshotEntity[] {
  return ids.map((id) => {
    const found = directory.get(id)
    return found ? { ...found } : { id, name: '', missing: true }
  })
}

interface DictSnapshot {
  value: string | number
  label: string | null
  dictCode: string
  dictVersion?: string
  missing?: true
}

function createDictSnapshot(
  value: string | number,
  options: Array<{ label: string; value: string | number }>,
  dictCode: string,
  dictVersion?: string
): DictSnapshot {
  const matched = options.find((option) => option.value === value)
  return {
    value,
    label: matched?.label ?? null,
    dictCode,
    dictVersion,
    ...(matched ? {} : { missing: true as const }),
  }
}

describe('第 6 项：人员 / 部门 / 字典的 Value 与 Snapshot 标准', () => {
  it('人员单选 Value 只保存稳定 ID，空值归一为 null', () => {
    expect(normalizeEntityValue('u_10001', false)).toBe('u_10001')
    expect(normalizeEntityValue({ id: 'u_10001', name: '张三' }, false)).toBe(
      'u_10001'
    )
    expect(normalizeEntityValue(null, false)).toBeNull()
    expect(normalizeEntityValue(undefined, false)).toBeNull()
    expect(normalizeEntityValue([], false)).toBeNull()
    // 不把展示名称写入 Value
    expect(
      JSON.stringify(normalizeEntityValue({ id: 'u_1', name: '张三' }, false))
    ).not.toContain('张三')
  })

  it('人员多选 Value 为去重后的 ID 数组，空值为 []', () => {
    expect(
      normalizeEntityValue(['u_1', 'u_2', 'u_1', { id: 'u_3' }], true)
    ).toEqual(['u_1', 'u_2', 'u_3'])
    expect(normalizeEntityValue(null, true)).toEqual([])
    expect(normalizeEntityValue([], true)).toEqual([])
  })

  it('人员 Snapshot 冻结提交时展示信息，未知 ID 保留并标记 missing', () => {
    const directory = new Map<string, EntityRef>([
      ['u_1', { id: 'u_1', name: '张三', departmentName: '研发部' }],
    ])
    const snapshots = createEntitySnapshots(['u_1', 'u_404'], directory)

    expect(snapshots[0]).toMatchObject({
      id: 'u_1',
      name: '张三',
      departmentName: '研发部',
    })
    expect(snapshots[1]).toEqual({ id: 'u_404', name: '', missing: true })
  })

  it('部门 Value 与人员共用 ID 规则，Snapshot 可附带路径信息', () => {
    const directory = new Map<string, EntityRef>([
      [
        'd_1',
        {
          id: 'd_1',
          name: '研发部',
          path: ['总部', '研发部'],
        },
      ],
    ])
    expect(normalizeEntityValue({ id: 'd_1', name: '研发部' }, false)).toBe(
      'd_1'
    )
    expect(createEntitySnapshots(['d_1'], directory)[0]).toMatchObject({
      id: 'd_1',
      name: '研发部',
      path: ['总部', '研发部'],
    })
  })

  it('字典 Snapshot 冻结 label 与字典版本，缺失选项不伪造 label', () => {
    const options = [
      { label: '事假', value: 1 },
      { label: '年假', value: 2 },
    ]
    expect(createDictSnapshot(1, options, 'leave_type', '2026-01')).toEqual({
      value: 1,
      label: '事假',
      dictCode: 'leave_type',
      dictVersion: '2026-01',
    })
    expect(createDictSnapshot(99, options, 'leave_type').label).toBeNull()
    expect(createDictSnapshot(99, options, 'leave_type').missing).toBe(true)
  })

  it('Value 与 Snapshot 的职责边界可被断言', () => {
    const value = normalizeEntityValue(['u_1', 'u_2'], true)
    const snapshot = createEntitySnapshots(
      value as string[],
      new Map([
        ['u_1', { id: 'u_1', name: '张三' }],
        ['u_2', { id: 'u_2', name: '李四' }],
      ])
    )

    // Value 中只有 ID，没有展示信息
    expect(value).toEqual(['u_1', 'u_2'])
    // Snapshot 中保留展示信息
    expect(snapshot.map((item) => item.name)).toEqual(['张三', '李四'])
  })
})
