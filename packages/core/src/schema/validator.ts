import { ENGINE_SCHEMA_VERSION } from '@x-form-engine/types';
import { isPlainObject } from './internal';

/** 引擎当前认识的 `x-engine` 一级扩展键。未知键只告警，不静默丢弃。 */
export const KNOWN_X_ENGINE_KEYS = [
  'platform',
  'readonly',
  'snapshot',
  'permission',
  'datasource',
  'validation',
  'i18n',
] as const;

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const KNOWN_KEY_SET: ReadonlySet<string> = new Set(KNOWN_X_ENGINE_KEYS);

/**
 * 校验 Formily schema 中的 `x-engine` 扩展与引擎 Schema 版本。
 *
 * - schema 必须是普通对象；
 * - 递归遍历 `properties` 下的字段 schema，`x-engine` 若存在必须是对象；
 * - `x-engine` 的未知一级键进入 warnings（保留 Formily 原生键，不做丢弃）；
 * - 顶层 `engineSchemaVersion` 若存在但不同于当前 `ENGINE_SCHEMA_VERSION` 进入 errors。
 */
export function validateEngineSchema(schema: unknown): SchemaValidationResult {
  if (!isPlainObject(schema)) {
    return { valid: false, errors: ['schema must be an object'], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  const version = schema.engineSchemaVersion;
  if (typeof version === 'string' && version !== ENGINE_SCHEMA_VERSION) {
    errors.push(`unsupported engineSchemaVersion: ${version}`);
  }

  collectProperties(schema, errors, warnings);

  return { valid: errors.length === 0, errors, warnings };
}

function collectProperties(
  schema: Record<string, unknown>,
  errors: string[],
  warnings: string[]
): void {
  const properties = schema.properties;
  if (!isPlainObject(properties)) {
    return;
  }

  for (const field of Object.values(properties)) {
    if (!isPlainObject(field)) {
      continue;
    }

    const engineConfig = field['x-engine'];
    if (engineConfig !== undefined) {
      if (!isPlainObject(engineConfig)) {
        errors.push('x-engine must be an object');
      } else {
        for (const key of Object.keys(engineConfig)) {
          if (!KNOWN_KEY_SET.has(key)) {
            const warning = `unknown x-engine key: ${key}`;
            if (!warnings.includes(warning)) {
              warnings.push(warning);
            }
          }
        }
      }
    }

    collectProperties(field, errors, warnings);
  }
}
