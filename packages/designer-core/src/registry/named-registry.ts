import { FormEngineError } from '@x-form-engine/types';

/**
 * 设计器命名资源注册表（Material / Setter / Panel / Command / Toolbar 共用基类）。
 *
 * 同时满足两个接口：
 * - `DesignerRegistry<T>`（公开）：`register` / `registerMany` / `unregister(name)` /
 *   `get` / `getAll` / `has`。
 * - `PluginResourceRegistry`（供 Generic Plugin Core 做资源归属追踪）：`list()` 返回
 *   `{ name, source }`，`unregister(name, source?)` 支持来源校验。
 *
 * 语义与 `packages/core` 的 `createRegistry` 对齐：同名重复注册抛 `PLUGIN_CONFLICT`；
 * 卸载只允许匹配来源，避免插件 A 误删插件 B 的同名资源。
 */
export interface NamedRegistry<T extends { name: string }> {
  register(def: T): void;
  registerMany(defs: T[]): void;
  unregister(name: string, source?: string): void;
  get(name: string): T | undefined;
  getAll(): T[];
  has(name: string): boolean;
  /** 供 Generic Plugin Core 做资源归属快照；`source` 缺省为 undefined。 */
  list(): Array<{ name: string; source?: string }>;
}

interface NamedEntry<T> {
  def: T;
  source?: string;
  registeredAt: number;
}

export function createNamedRegistry<T extends { name: string }>(): NamedRegistry<T> {
  const entries = new Map<string, NamedEntry<T>>();

  const register = (def: T): void => {
    if (entries.has(def.name)) {
      throw new FormEngineError(
        'PLUGIN_CONFLICT',
        `Registry entry "${def.name}" is already registered`,
        { name: def.name }
      );
    }
    entries.set(def.name, { def, source: undefined, registeredAt: Date.now() });
  };

  const registerMany = (defs: T[]): void => {
    for (const def of defs) {
      register(def);
    }
  };

  const unregister = (name: string, source?: string): void => {
    const entry = entries.get(name);
    if (!entry) {
      return;
    }
    if (entry.source !== source) {
      throw new FormEngineError(
        'PLUGIN_CONFLICT',
        `Cannot unregister "${name}" from source "${String(source)}": owned by "${String(entry.source)}"`,
        { name, source, ownerSource: entry.source }
      );
    }
    entries.delete(name);
  };

  return {
    register,
    registerMany,
    unregister,
    get(name: string): T | undefined {
      return entries.get(name)?.def;
    },
    getAll(): T[] {
      return Array.from(entries.values(), (entry) => entry.def);
    },
    has(name: string): boolean {
      return entries.has(name);
    },
    list(): Array<{ name: string; source?: string }> {
      return Array.from(entries.values(), (entry) => ({
        name: entry.def.name,
        source: entry.source,
      }));
    },
  };
}
