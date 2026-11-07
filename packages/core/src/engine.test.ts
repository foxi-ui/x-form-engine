import type { ComponentBinding, EngineRegistry } from '@x-form-engine/types';
import { createFormEngine } from './engine';

const BINDING: ComponentBinding = {
  protocol: {
    name: 'First',
    version: '1',
    meta: { title: 'F' },
    capabilities: { editable: true, readonly: false, mobile: false },
    schema: { type: 'object' },
  },
  implementations: {},
};

test('createFormEngine 返回 ready 状态的引擎，注册内置组件', () => {
  const engine = createFormEngine({
    id: 'e1',
    platform: 'pc',
    components: [{ protocol: { name: 'Input', version: '1.0.0', meta: { title: '输入' }, capabilities: { editable: true, readonly: true, mobile: false }, schema: { type: 'object' } }, implementations: { pc: {} } }],
  });
  expect(engine.status).toBe('ready');
  expect(engine.registry.components.has('Input')).toBe(true);
});

test('构造期第二个插件安装失败时回滚第一个插件资源并抛错', () => {
  let capturedRegistry: EngineRegistry | undefined;

  expect(() => createFormEngine({
    plugins: [
      {
        name: 'first', version: '1.0.0',
        install: ({ registry }) => {
          capturedRegistry = registry;
          registry.components.register('First', BINDING, 'first');
        },
      },
      {
        name: 'second', version: '1.0.0', dependencies: ['first'],
        install: () => {
          throw new Error('second install fail');
        },
      },
    ],
  })).toThrowError(/second install fail/);

  expect(capturedRegistry).toBeDefined();
  expect(capturedRegistry!.components.has('First')).toBe(false);
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
