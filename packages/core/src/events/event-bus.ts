import type { EventBus } from '@x-form-engine/types';

type AnyHandler = (payload: unknown) => void;

/**
 * 创建同步事件总线。
 *
 * - `on` 返回退订函数，可重复调用（幂等）。
 * - `once` 在首次触发后自动移除。
 * - `emit` 同步派发；派发期间修改监听器集合不会影响本次遍历。
 */
export function createEventBus(): EventBus {
  const listeners = new Map<string, Set<AnyHandler>>();

  const subscribe = (
    event: string,
    handler: AnyHandler,
    once: boolean
  ): (() => void) => {
    let active = true;

    const wrapped: AnyHandler = (payload) => {
      if (!active) {
        return;
      }

      if (once) {
        active = false;
        detach(event, wrapped);
      }

      handler(payload);
    };

    let handlers = listeners.get(event);
    if (!handlers) {
      handlers = new Set<AnyHandler>();
      listeners.set(event, handlers);
    }
    handlers.add(wrapped);

    return () => {
      active = false;
      detach(event, wrapped);
    };
  };

  const detach = (event: string, handler: AnyHandler): void => {
    const handlers = listeners.get(event);
    if (!handlers) {
      return;
    }

    handlers.delete(handler);
    if (handlers.size === 0) {
      listeners.delete(event);
    }
  };

  return {
    on<T>(event: string, handler: (payload: T) => void): () => void {
      return subscribe(event, handler as AnyHandler, false);
    },

    once<T>(event: string, handler: (payload: T) => void): () => void {
      return subscribe(event, handler as AnyHandler, true);
    },

    emit<T>(event: string, payload: T): void {
      const handlers = listeners.get(event);
      if (!handlers) {
        return;
      }

      for (const handler of [...handlers]) {
        handler(payload);
      }
    },
  };
}
