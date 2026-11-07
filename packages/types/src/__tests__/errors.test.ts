import { FormEngineError } from '../errors';

test('FormEngineError 保留 code/name/details 且是 Error 实例', () => {
  const e = new FormEngineError('PLUGIN_CONFLICT', '重复注册 Input', { name: 'Input' });
  expect(e).toBeInstanceOf(Error);
  expect(e.name).toBe('FormEngineError');
  expect(e.code).toBe('PLUGIN_CONFLICT');
  expect(e.details).toEqual({ name: 'Input' });
});
