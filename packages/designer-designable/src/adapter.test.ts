import { createEventBus } from '@x-form-engine/core';
import {
  createMaterialRegistry,
  createSchemaEditor,
  createSetterRegistry,
} from '@x-form-engine/designer-core';
import type { DesignerAdapterContext } from '@x-form-engine/types';
import { createDesignableAdapter } from './adapter';

function makeContext(): DesignerAdapterContext {
  return {
    materials: createMaterialRegistry(),
    setters: createSetterRegistry(),
    events: createEventBus(),
    schema: createSchemaEditor(),
  };
}

describe('createDesignableAdapter（Task 5.1）', () => {
  test('adapter 具有 name / version / createWorkspace', () => {
    const adapter = createDesignableAdapter();
    expect(adapter.name).toBe('designable');
    expect(typeof adapter.version).toBe('string');
    expect(typeof adapter.createWorkspace).toBe('function');
  });

  test('createWorkspace 返回带 setSchema/getSchema/subscribe/mount/unmount 的 workspace', () => {
    const ws = createDesignableAdapter().createWorkspace(makeContext());
    expect(typeof ws.setSchema).toBe('function');
    expect(typeof ws.getSchema).toBe('function');
    expect(typeof ws.subscribe).toBe('function');
    expect(typeof ws.mount).toBe('function');
    expect(typeof ws.unmount).toBe('function');
  });

  test('setSchema/getSchema 往返保留 componentName 与 x-component', () => {
    const ws = createDesignableAdapter().createWorkspace(makeContext());
    const schema = {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          title: '用户名',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
        },
      },
    };
    ws.setSchema(schema);
    const back = ws.getSchema() as any;
    expect(back.properties.username['x-component']).toBe('Input');
    expect(back.properties.username.title).toBe('用户名');
  });

  test('subscribe 在 setSchema 后收到 schema，退订后不再收到', () => {
    const ws = createDesignableAdapter().createWorkspace(makeContext());
    const received: unknown[] = [];
    const unsubscribe = ws.subscribe((schema) => received.push(schema));

    ws.setSchema({ type: 'object', properties: { a: { type: 'string', 'x-component': 'Input' } } });
    expect(received).toHaveLength(1);

    unsubscribe();
    ws.setSchema({ type: 'object', properties: { b: { type: 'string', 'x-component': 'Input' } } });
    expect(received).toHaveLength(1);
  });

  test('unmount 未挂载时幂等（不抛错）', () => {
    const ws = createDesignableAdapter().createWorkspace(makeContext());
    expect(() => ws.unmount()).not.toThrow();
    expect(() => ws.unmount()).not.toThrow();
  });
});
