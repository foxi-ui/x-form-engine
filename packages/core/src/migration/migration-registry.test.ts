import { FormEngineError } from '@x-form-engine/types';
import type { MigrationFailure } from '@x-form-engine/types';
import { describe, expect, it } from 'vitest';
import { createMigrationRegistry } from './migration-registry';

const createRegistry = () =>
  createMigrationRegistry({
    snapshot: { versionKey: 'snapshotVersion', target: '3.0' },
    schema: { versionKey: 'schemaVersion', target: '2' },
    engineSchema: { versionKey: 'engineSchemaVersion', target: '1.0.0' },
    component: { versionKey: 'componentVersion', target: '1.0.0' },
  });

function migrationError(error: unknown): MigrationFailure {
  expect(error).toBeInstanceOf(FormEngineError);
  const formError = error as FormEngineError;
  expect(formError.code).toBe('MIGRATION_FAILED');
  return formError.details as MigrationFailure;
}

describe('createMigrationRegistry', () => {
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
      });

    const { result, applied } = registry.migrate('snapshot', {
      snapshotVersion: '1.0',
      fields: { applicant: { value: 'u_1' } },
    });

    expect(applied).toEqual(['1.0->2.0', '2.0->3.0']);
    expect(result).toMatchObject({
      snapshotVersion: '3.0',
      locale: 'zh-CN',
      fields: { applicant: { value: 'u_1', path: 'applicant' } },
    });
  });

  it('迁移不修改原始数据', () => {
    const registry = createMigrationRegistry({
      snapshot: { versionKey: 'snapshotVersion', target: '2.0' },
      schema: { versionKey: 'schemaVersion', target: '2' },
      engineSchema: { versionKey: 'engineSchemaVersion', target: '1.0.0' },
      component: { versionKey: 'componentVersion', target: '1.0.0' },
    }).register({
      axis: 'snapshot',
      from: '1.0',
      to: '2.0',
      migrate: (input) => ({ ...input, snapshotVersion: '2.0' }),
    });
    const source = { snapshotVersion: '1.0', fields: {} };

    const { original } = registry.migrate('snapshot', source);
    expect(original).toEqual(source);
    expect(source.snapshotVersion).toBe('1.0');
  });

  it('缺少迁移器时抛出可诊断错误并保留原始数据', () => {
    const registry = createRegistry();
    const source = { snapshotVersion: '0.9', fields: {} };

    try {
      registry.migrate('snapshot', source);
      throw new Error('should not reach here');
    } catch (error) {
      expect(migrationError(error)).toMatchObject({
        code: 'NO_MIGRATION',
        axis: 'snapshot',
        version: '0.9',
      });
    }
    expect(source.snapshotVersion).toBe('0.9');
  });

  it('已是目标版本时为空操作', () => {
    const registry = createRegistry();
    expect(
      registry.migrate('snapshot', { snapshotVersion: '3.0', fields: {} })
    ).toMatchObject({
      applied: [],
      result: { snapshotVersion: '3.0' },
    });
  });

  it('迁移器输出版本不符合声明时立即失败', () => {
    const registry = createRegistry().register({
      axis: 'snapshot',
      from: '1.0',
      to: '2.0',
      migrate: (input) => ({ ...input, snapshotVersion: '9.9' }),
    });

    try {
      registry.migrate('snapshot', { snapshotVersion: '1.0', fields: {} });
      throw new Error('should not reach here');
    } catch (error) {
      expect(migrationError(error).code).toBe('BAD_MIGRATOR_OUTPUT');
    }
  });

  it('检测迁移环', () => {
    const registry = createRegistry()
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
      });

    try {
      registry.migrate('snapshot', { snapshotVersion: '1.0', fields: {} });
      throw new Error('should not reach here');
    } catch (error) {
      expect(migrationError(error).code).toBe('CYCLE_DETECTED');
    }
  });

  it('同一起点的重复迁移器被拒绝', () => {
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
      });

    try {
      registry.migrate('snapshot', { snapshotVersion: '1.0', fields: {} });
      throw new Error('should not reach here');
    } catch (error) {
      expect(migrationError(error).code).toBe('AMBIGUOUS_MIGRATION');
    }
  });

  it('不同版本轴互不混用', () => {
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
      });

    const schemaResult = registry.migrate('schema', {
      schemaVersion: '1',
      snapshotVersion: '1.0',
    });
    expect(schemaResult.applied).toEqual(['1->2']);
    expect(schemaResult.result.snapshotVersion).toBe('1.0');

    const snapshotResult = registry.migrate('snapshot', {
      schemaVersion: '1',
      snapshotVersion: '1.0',
    });
    expect(snapshotResult.applied).toEqual(['1.0->2.0', '2.0->3.0']);
    expect(snapshotResult.result.schemaVersion).toBe('1');
  });

  it('engineSchema / component 轴同样可独立迁移', () => {
    const registry = createRegistry().register({
      axis: 'component',
      from: '0.5.0',
      to: '1.0.0',
      migrate: (input) => ({ ...input, componentVersion: '1.0.0' }),
    });

    const result = registry.migrate('component', {
      componentVersion: '0.5.0',
    });
    expect(result.applied).toEqual(['0.5.0->1.0.0']);
  });
});
