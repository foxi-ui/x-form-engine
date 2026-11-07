import { createFormEngine } from './engine';

test('createFormEngine 返回 ready 状态的引擎，注册内置组件', () => {
  const engine = createFormEngine({
    id: 'e1',
    platform: 'pc',
    components: [{ protocol: { name: 'Input', version: '1.0.0', meta: { title: '输入' }, capabilities: { editable: true, readonly: true, mobile: false }, schema: { type: 'object' } }, implementations: { pc: {} } }],
  });
  expect(engine.status).toBe('ready');
  expect(engine.registry.components.has('Input')).toBe(true);
});

test('dispose 幂等且置为 disposed，释放监听器', () => {
  const engine = createFormEngine();
  const events: string[] = [];
  const off = engine.events.on('engine:dispose', () => events.push('dispose'));
  engine.dispose();
  engine.dispose();
  off();
  expect(engine.status).toBe('disposed');
  expect(events).toEqual(['dispose']);
});
