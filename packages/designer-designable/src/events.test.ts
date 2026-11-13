import { TreeNode } from '@designable/core';
import { mapCanvasEventToDesignerEvent } from './events';

function field(props: Record<string, unknown> = {}): TreeNode {
  return new TreeNode({ componentName: 'Field', props });
}

describe('mapCanvasEventToDesignerEvent（Task 5.5）', () => {
  test('node:select → DesignerEvent（path 取自字段名）', () => {
    const evt = mapCanvasEventToDesignerEvent('node:select', {
      target: field({ name: 'username' }),
    });
    expect(evt).toEqual({ type: 'node:select', path: 'username' });
  });

  test('node:add → 含 componentName（x-component 优先）', () => {
    const evt = mapCanvasEventToDesignerEvent('node:add', {
      target: field({ name: 'username', 'x-component': 'Input' }),
    });
    expect(evt).toEqual({ type: 'node:add', path: 'username', componentName: 'Input' });
  });

  test('node:move → from/to', () => {
    const evt = mapCanvasEventToDesignerEvent('node:move', {
      source: field({ name: 'a' }),
      target: field({ name: 'b' }),
    });
    expect(evt).toEqual({ type: 'node:move', from: 'a', to: 'b' });
  });

  test('schema:change → 无 target', () => {
    expect(mapCanvasEventToDesignerEvent('schema:change', {})).toEqual({ type: 'schema:change' });
  });

  test('未知事件 → null', () => {
    expect(mapCanvasEventToDesignerEvent('bogus:event', {})).toBeNull();
  });

  test('结果不泄漏 TreeNode（无 target 字段，纯标量）', () => {
    const evt = mapCanvasEventToDesignerEvent('node:select', {
      target: field({ name: 'username' }),
    });
    expect(evt).not.toHaveProperty('target');
    expect(JSON.stringify(evt)).not.toContain('TreeNode');
  });
});
