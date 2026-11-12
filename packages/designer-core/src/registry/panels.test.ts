import { createCommandRegistry, createPanelRegistry, createToolbarRegistry } from './panels';

describe('Panel / Command / Toolbar Registry（Task 4.3）', () => {
  test('PanelRegistry：register/get/getAll/unregister，order 字段稳定', () => {
    const registry = createPanelRegistry();
    registry.register({ name: 'settings', title: '设置', component: {}, position: 'right', order: 1 });
    registry.register({ name: 'tree', title: '组件树', component: {}, position: 'left', order: 0 });

    expect(registry.getAll().map((p) => p.name)).toEqual(['settings', 'tree']);
    expect(registry.get('settings')?.order).toBe(1);
    expect(registry.get('tree')?.position).toBe('left');

    registry.unregister('settings');
    expect(registry.has('settings')).toBe(false);
    expect(registry.getAll()).toHaveLength(1);
  });

  test('CommandRegistry：register/get/has，execute 透传（不写 UI 实现）', () => {
    const registry = createCommandRegistry();
    const executed: string[] = [];
    registry.register({
      name: 'export',
      execute: (context) => {
        executed.push(context.schemaId as string);
      },
    });

    expect(registry.has('export')).toBe(true);
    registry.get('export')?.execute({ schemaId: 's1' });
    expect(executed).toEqual(['s1']);
  });

  test('ToolbarRegistry：register/get，order 字段稳定', () => {
    const registry = createToolbarRegistry();
    registry.register({ name: 'undo', component: {}, order: 0 });
    registry.register({ name: 'redo', component: {}, order: 1 });

    expect(registry.get('undo')?.order).toBe(0);
    expect(registry.getAll().map((t) => t.name)).toEqual(['undo', 'redo']);
  });
});
