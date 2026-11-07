import { describe, expect, it } from 'vitest'

/**
 * 第 8 项协议验证：版本识别 + 有序迁移链 + 原始数据不可变 + 失败可诊断。
 * 该实现是协议可行性验证，不是最终生产代码。
 */

type Axis = 'snapshot' | 'schema'
type Version = string

interface VersionedDocument {
  [key: string]: unknown
}

interface Migration {
  axis: Axis
  from: Version
  to: Version
  migrate: (input: VersionedDocument) => VersionedDocument
}

type MigrationErrorCode =
  | 'NO_MIGRATION'
  | 'AMBIGUOUS_MIGRATION'
  | 'BAD_MIGRATOR_OUTPUT'
  | 'CYCLE_DETECTED'

class MigrationError extends Error {
  constructor(
    public code: MigrationErrorCode,
    message: string,
    public detail?: Record<string, unknown>
  ) {
    super(message)
  }
}

interface AxisConfig {
  versionKey: string
  target: Version
}

class MigrationRegistry {
  private migrations: Migration[] = []

  constructor(private config: Record<Axis, AxisConfig>) {}

  register(migration: Migration): this {
    this.migrations.push(migration)
    return this
  }

  migrate(
    axis: Axis,
    input: VersionedDocument
  ): {
    result: VersionedDocument
    applied: string[]
    original: VersionedDocument
  } {
    const { versionKey, target } = this.config[axis]
    const original = structuredClone(input)
    const applied: string[] = []
    const visited = new Set<string>()
    let current = structuredClone(input)

    while (current[versionKey] !== target) {
      const version = String(current[versionKey] ?? '')
      const marker = `${axis}:${version}`
      if (visited.has(marker)) {
        throw new MigrationError(
          'CYCLE_DETECTED',
          `Migration cycle detected on ${marker}`,
          { axis, version }
        )
      }
      visited.add(marker)

      const candidates = this.migrations.filter(
        (migration) => migration.axis === axis && migration.from === version
      )

      if (candidates.length === 0) {
        throw new MigrationError(
          'NO_MIGRATION',
          `No ${axis} migration from version ${version}`,
          { axis, version }
        )
      }
      if (candidates.length > 1) {
        throw new MigrationError(
          'AMBIGUOUS_MIGRATION',
          `Multiple ${axis} migrations from version ${version}`,
          { axis, version }
        )
      }

      const migration = candidates[0]
      const next = migration.migrate(current)
      if (!next || next[versionKey] !== migration.to) {
        throw new MigrationError(
          'BAD_MIGRATOR_OUTPUT',
          `Migrator ${migration.from}->${migration.to} returned unexpected version`,
          { axis, expected: migration.to, actual: next?.[versionKey] }
        )
      }

      applied.push(`${migration.from}->${migration.to}`)
      current = next
    }

    return { result: current, applied, original }
  }
}

const createRegistry = () =>
  new MigrationRegistry({
    snapshot: { versionKey: 'snapshotVersion', target: '3.0' },
    schema: { versionKey: 'schemaVersion', target: '2' },
  })

describe('第 8 项：Schema / Snapshot 版本迁移协议', () => {
  it('按注册顺序执行多跳迁移链', () => {
    const registry = createRegistry()
      .register({
        axis: 'snapshot',
        from: '1.0',
        to: '2.0',
        migrate: (input) => ({
          ...input,
          snapshotVersion: '2.0',
          fields: Object.fromEntries(
            Object.entries(input.fields as Record<string, unknown>).map(
              ([key, value]) => [key, { ...(value as object), path: key }]
            )
          ),
        }),
      })
      .register({
        axis: 'snapshot',
        from: '2.0',
        to: '3.0',
        migrate: (input) => ({
          ...input,
          snapshotVersion: '3.0',
          locale: input.locale ?? 'zh-CN',
        }),
      })

    const source = {
      snapshotVersion: '1.0',
      fields: { applicant: { value: 'u_1' } },
    }
    const { result, applied } = registry.migrate('snapshot', source)

    expect(applied).toEqual(['1.0->2.0', '2.0->3.0'])
    expect(result).toMatchObject({
      snapshotVersion: '3.0',
      locale: 'zh-CN',
      fields: { applicant: { value: 'u_1', path: 'applicant' } },
    })
  })

  it('迁移不修改原始数据，便于保留历史快照', () => {
    const registry = new MigrationRegistry({
      snapshot: { versionKey: 'snapshotVersion', target: '2.0' },
      schema: { versionKey: 'schemaVersion', target: '2' },
    }).register({
      axis: 'snapshot',
      from: '1.0',
      to: '2.0',
      migrate: (input) => ({ ...input, snapshotVersion: '2.0' }),
    })
    const source = { snapshotVersion: '1.0', fields: {} }

    const { original } = registry.migrate('snapshot', source)
    expect(original).toEqual(source)
    expect(source.snapshotVersion).toBe('1.0')
  })

  it('缺少迁移器时抛出可诊断错误，并保留原始数据', () => {
    const registry = createRegistry()
    const source = { snapshotVersion: '0.9', fields: {} }

    try {
      registry.migrate('snapshot', source)
      throw new Error('should not reach here')
    } catch (error) {
      expect(error).toBeInstanceOf(MigrationError)
      expect((error as MigrationError).code).toBe('NO_MIGRATION')
      expect((error as MigrationError).detail).toEqual({
        axis: 'snapshot',
        version: '0.9',
      })
    }
    expect(source.snapshotVersion).toBe('0.9')
  })

  it('已是目标版本时为空操作', () => {
    const registry = createRegistry()
    const source = { snapshotVersion: '3.0', fields: {} }
    expect(registry.migrate('snapshot', source)).toMatchObject({
      applied: [],
      result: { snapshotVersion: '3.0' },
    })
  })

  it('迁移器输出版本不符合声明时立即失败', () => {
    const registry = createRegistry().register({
      axis: 'snapshot',
      from: '1.0',
      to: '2.0',
      migrate: (input) => ({ ...input, snapshotVersion: '9.9' }),
    })

    expect(() =>
      registry.migrate('snapshot', { snapshotVersion: '1.0', fields: {} })
    ).toThrowError(MigrationError)
  })

  it('检测迁移环，避免读取时死循环', () => {
    const registry = new MigrationRegistry({
      snapshot: { versionKey: 'snapshotVersion', target: '3.0' },
      schema: { versionKey: 'schemaVersion', target: '2' },
    })
      .register({
        axis: 'snapshot',
        from: '1.0',
        to: '2.0',
        migrate: (input) => ({ ...input, snapshotVersion: '2.0' }),
      })
      .register({
        axis: 'snapshot',
        from: '2.0',
        to: '1.0',
        migrate: (input) => ({ ...input, snapshotVersion: '1.0' }),
      })

    try {
      registry.migrate('snapshot', { snapshotVersion: '1.0', fields: {} })
      throw new Error('should not reach here')
    } catch (error) {
      expect((error as MigrationError).code).toBe('CYCLE_DETECTED')
    }
  })

  it('同一起点的重复迁移器应被拒绝，避免执行顺序不确定', () => {
    const registry = createRegistry()
      .register({
        axis: 'snapshot',
        from: '1.0',
        to: '2.0',
        migrate: (input) => ({ ...input, snapshotVersion: '2.0' }),
      })
      .register({
        axis: 'snapshot',
        from: '1.0',
        to: '2.0',
        migrate: (input) => ({ ...input, snapshotVersion: '2.0' }),
      })

    try {
      registry.migrate('snapshot', { snapshotVersion: '1.0', fields: {} })
      throw new Error('should not reach here')
    } catch (error) {
      expect((error as MigrationError).code).toBe('AMBIGUOUS_MIGRATION')
    }
  })

  it('schemaVersion 与 snapshotVersion 两条版本轴互不混用', () => {
    const registry = createRegistry()
      .register({
        axis: 'schema',
        from: '1',
        to: '2',
        migrate: (input) => ({ ...input, schemaVersion: '2' }),
      })
      .register({
        axis: 'snapshot',
        from: '1.0',
        to: '2.0',
        migrate: (input) => ({ ...input, snapshotVersion: '2.0' }),
      })
      .register({
        axis: 'snapshot',
        from: '2.0',
        to: '3.0',
        migrate: (input) => ({ ...input, snapshotVersion: '3.0' }),
      })

    const schemaResult = registry.migrate('schema', {
      schemaVersion: '1',
      snapshotVersion: '1.0',
    })
    expect(schemaResult.applied).toEqual(['1->2'])
    expect(schemaResult.result.snapshotVersion).toBe('1.0')

    const snapshotResult = registry.migrate('snapshot', {
      schemaVersion: '1',
      snapshotVersion: '1.0',
    })
    expect(snapshotResult.applied).toEqual(['1.0->2.0', '2.0->3.0'])
    expect(snapshotResult.result.schemaVersion).toBe('1')
  })
})
