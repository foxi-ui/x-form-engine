import type { TreeNode } from '@designable/core';
import type { DesignerEvent } from '@x-form-engine/types';

/** Designable 画布事件的最小 payload 形状（只取标量，不泄漏 TreeNode）。 */
interface CanvasEventPayload {
  target?: TreeNode;
  source?: TreeNode;
}

/** 节点在 Schema 中的稳定标识：优先字段名，回退节点 id。 */
function nodePath(node: TreeNode): string {
  const name = node.props?.name;
  return typeof name === 'string' && name.length > 0 ? name : node.id;
}

/** 节点的组件名：优先 `x-component`，回退 TreeNode.componentName。 */
function nodeComponentName(node: TreeNode): string {
  const xComponent = node.props?.['x-component'];
  return typeof xComponent === 'string' ? xComponent : node.componentName;
}

/**
 * 把 Designable 画布事件映射为与底层画布无关的 DesignerEvent（Task 5.5，C11）。
 *
 * 只输出标量（`path` / `componentName` / `from` / `to`），绝不泄漏 TreeNode；
 * 未知事件返回 null。
 */
export function mapCanvasEventToDesignerEvent(
  type: string,
  payload: unknown
): DesignerEvent | null {
  const { target, source } = (payload ?? {}) as CanvasEventPayload;

  switch (type) {
    case 'node:select':
      return target ? { type: 'node:select', path: nodePath(target) } : null;
    case 'node:unselect':
      return target ? { type: 'node:unselect', path: nodePath(target) } : null;
    case 'node:add':
      return target
        ? { type: 'node:add', path: nodePath(target), componentName: nodeComponentName(target) }
        : null;
    case 'node:remove':
      return target ? { type: 'node:remove', path: nodePath(target) } : null;
    case 'node:move':
      return target
        ? {
            type: 'node:move',
            from: source ? nodePath(source) : '',
            to: nodePath(target),
          }
        : null;
    case 'node:update':
      return target ? { type: 'node:update', path: nodePath(target) } : null;
    case 'schema:change':
      return { type: 'schema:change' };
    default:
      return null;
  }
}
