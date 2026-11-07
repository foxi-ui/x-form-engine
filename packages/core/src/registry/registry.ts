import { FormEngineError } from '@x-form-engine/types';
import type { Registry, RegistryEntry } from '@x-form-engine/types';

/**
 * 创建通用的严格冲突 Registry。
 *
 * - 同名重复注册抛 `PLUGIN_CONFLICT`，不做隐式覆盖。
 * - 所有注册项记录来源 `source` 与注册时间，供回滚和卸载归属校验使用。
 * - `unregister` 只允许注册时的同一来源卸载；名称不存在时为幂等 no-op。
 */
export function createRegistry<T>(): Registry<T> {
  const entries = new Map<string, RegistryEntry<T>>();

  return {
    register(name: string, value: T, source?: string): void {
      const existing = entries.get(name);
      if (existing) {
        throw new FormEngineError(
          'PLUGIN_CONFLICT',
          `Registry entry "${name}" is already registered`,
          { name, existingSource: existing.source, source }
        );
      }

      entries.set(name, {
        name,
        value,
        source,
        registeredAt: Date.now(),
      });
    },

    unregister(name: string, source?: string): void {
      const entry = entries.get(name);
      if (!entry) {
        return;
      }

      if (entry.source !== source) {
        throw new FormEngineError(
          'PLUGIN_CONFLICT',
          `Cannot unregister "${name}" from source "${String(source)}": owned by "${String(entry.source)}"`,
          { name, ownerSource: entry.source, source }
        );
      }

      entries.delete(name);
    },

    get(name: string): T | undefined {
      return entries.get(name)?.value;
    },

    has(name: string): boolean {
      return entries.has(name);
    },

    list(): RegistryEntry<T>[] {
      return Array.from(entries.values(), (entry) => ({ ...entry }));
    },
  };
}
