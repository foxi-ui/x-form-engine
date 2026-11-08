import { FormEngineError } from '@x-form-engine/types';
import type {
  Migration,
  MigrationAxisConfig,
  MigrationErrorCode,
  MigrationFailure,
  MigrationRegistry,
  MigrationResult,
  VersionAxis,
  VersionedDocument,
} from '@x-form-engine/types';

/**
 * 迁移失败时抛出 `FormEngineError('MIGRATION_FAILED')`，`details` 携带结构化
 * `MigrationFailure`，便于调用方诊断并保留原始数据。
 */
function fail(
  code: MigrationErrorCode,
  axis: VersionAxis,
  version: string,
  message: string
): never {
  const failure: MigrationFailure = { code, axis, version, message };
  throw new FormEngineError('MIGRATION_FAILED', message, failure);
}

/**
 * 创建有序迁移注册表（生产版，对应 verification/08 协议）。
 *
 * - `(axis, from)` 唯一：同一轴同一来源出现多个迁移器抛 `AMBIGUOUS_MIGRATION`。
 * - 迁移器输出必须声明为 `to`，否则抛 `BAD_MIGRATOR_OUTPUT`。
 * - 检测迁移环，避免读取时死循环。
 * - 非破坏：输入文档被结构化克隆，原始对象不被改写。
 * - 每个轴使用独立的 `versionKey` 与目标版本，互不混用。
 */
export function createMigrationRegistry(
  config: Record<VersionAxis, MigrationAxisConfig>
): MigrationRegistry {
  const migrations: Migration[] = [];

  const registry: MigrationRegistry = {
    register(migration: Migration): MigrationRegistry {
      migrations.push(migration);
      return registry;
    },

    migrate(axis: VersionAxis, input: VersionedDocument): MigrationResult {
      const { versionKey, target } = config[axis];
      const original = structuredClone(input);
      const applied: string[] = [];
      const visited = new Set<string>();
      let current = structuredClone(input);

      while (current[versionKey] !== target) {
        const version = String(current[versionKey] ?? '');
        const marker = `${axis}:${version}`;

        if (visited.has(marker)) {
          fail(
            'CYCLE_DETECTED',
            axis,
            version,
            `Migration cycle detected on ${marker}`
          );
        }
        visited.add(marker);

        const candidates = migrations.filter(
          (migration) => migration.axis === axis && migration.from === version
        );

        if (candidates.length === 0) {
          fail(
            'NO_MIGRATION',
            axis,
            version,
            `No ${axis} migration from version ${version}`
          );
        }
        if (candidates.length > 1) {
          fail(
            'AMBIGUOUS_MIGRATION',
            axis,
            version,
            `Multiple ${axis} migrations from version ${version}`
          );
        }

        const migration = candidates[0];
        const next = migration.migrate(current);
        if (!next || next[versionKey] !== migration.to) {
          fail(
            'BAD_MIGRATOR_OUTPUT',
            axis,
            version,
            `Migrator ${migration.from}->${migration.to} returned unexpected version`
          );
        }

        applied.push(`${migration.from}->${migration.to}`);
        current = next;
      }

      return { result: current, applied, original };
    },
  };

  return registry;
}
