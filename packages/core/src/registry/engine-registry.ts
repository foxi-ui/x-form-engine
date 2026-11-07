import type { ComponentBinding, EngineRegistry } from '@x-form-engine/types';
import { createRegistry } from './registry';

/**
 * 创建按资源类型分命名空间的 EngineRegistry。
 * 每个子 Registry 拥有独立的存储与冲突检测，互不影响。
 */
export function createEngineRegistry(): EngineRegistry {
  return {
    components: createRegistry<ComponentBinding>(),
    decorators: createRegistry<unknown>(),
    services: createRegistry<unknown>(),
    formatters: createRegistry<unknown>(),
    designer: createRegistry<unknown>(),
  };
}
