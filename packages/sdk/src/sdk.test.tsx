import {
  createFormEngine,
  FormEngineProvider,
  FormRenderer,
  KNOWN_X_ENGINE_KEYS,
  parseSchemaDocument,
  useFormEngine,
  validateEngineSchema,
} from './index';
import type { SchemaValidationResult } from './index';

test('sdk 暴露创建、Provider、Renderer、Hook', () => {
  expect(typeof createFormEngine).toBe('function');
  expect(FormEngineProvider).toBeDefined();
  expect(FormRenderer).toBeDefined();
  expect(useFormEngine).toBeDefined();
  const engine = createFormEngine({ platform: 'pc' });
  expect(engine.status).toBe('ready');
});

test('sdk 暴露 schema 解析与校验能力', () => {
  expect(typeof parseSchemaDocument).toBe('function');
  expect(typeof validateEngineSchema).toBe('function');
  expect(Array.isArray(KNOWN_X_ENGINE_KEYS)).toBe(true);

  const result: SchemaValidationResult = validateEngineSchema({
    type: 'object',
    engineSchemaVersion: '9.9.9',
  });
  expect(result.valid).toBe(false);
});
