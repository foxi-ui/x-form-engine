import { parseSchemaDocument } from './parser';
import { validateEngineSchema } from './validator';

test('parseSchemaDocument 接受合法文档', () => {
  const doc = parseSchemaDocument({ schemaId: 's1', version: 3, engineSchemaVersion: '1.0.0', schema: { type: 'object', properties: {} } });
  expect(doc.schemaId).toBe('s1');
});

test('parseSchemaDocument 缺 schemaId 抛 SCHEMA_INVALID', () => {
  expect(() => parseSchemaDocument({ version: 1, engineSchemaVersion: '1.0.0', schema: {} }))
    .toThrowError(expect.objectContaining({ code: 'SCHEMA_INVALID' }));
});

test('validateEngineSchema 对未知 x-engine 键告警、对 Formily 原生键不告警', () => {
  const r = validateEngineSchema({
    type: 'object',
    properties: {
      a: { type: 'string', 'x-component': 'Input', 'x-engine': { platform: { pc: {} }, bogus: true } },
    },
  });
  expect(r.valid).toBe(true);
  expect(r.warnings).toContain('unknown x-engine key: bogus');
  expect(r.warnings).not.toContain('unknown x-engine key: platform');
});

test('validateEngineSchema 对非对象 schema 报错', () => {
  expect(validateEngineSchema(null).valid).toBe(false);
});

test('validateEngineSchema 对不支持的 engineSchemaVersion 报错', () => {
  const r = validateEngineSchema({ type: 'object', engineSchemaVersion: '9.9.9', properties: {} });
  expect(r.valid).toBe(false);
  expect(r.errors.some((e) => e.includes('unsupported engineSchemaVersion'))).toBe(true);
});
