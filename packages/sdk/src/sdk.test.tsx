import { createFormEngine, FormEngineProvider, FormRenderer, useFormEngine } from './index';

test('sdk 暴露创建、Provider、Renderer、Hook', () => {
  expect(typeof createFormEngine).toBe('function');
  expect(FormEngineProvider).toBeDefined();
  expect(FormRenderer).toBeDefined();
  expect(useFormEngine).toBeDefined();
  const engine = createFormEngine({ platform: 'pc' });
  expect(engine.status).toBe('ready');
});
