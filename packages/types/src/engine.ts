import type { Platform } from './base';
import type { ComponentBinding } from './component';
import type { EngineServices } from './services';

export type EngineStatus =
  | 'created'
  | 'initializing'
  | 'ready'
  | 'failed'
  | 'disposed';

export interface RegistryEntry<T> {
  name: string;
  value: T;
  source?: string;
  registeredAt: number;
}

export interface Registry<T> {
  register(name: string, value: T, source?: string): void; // 重名抛 PLUGIN_CONFLICT
  unregister(name: string, source?: string): void; // source 不匹配抛 PLUGIN_CONFLICT
  get(name: string): T | undefined;
  has(name: string): boolean;
  list(): RegistryEntry<T>[];
}

export interface EngineRegistry {
  components: Registry<ComponentBinding>;
  decorators: Registry<unknown>;
  services: Registry<unknown>;
  formatters: Registry<unknown>;
  designer: Registry<unknown>;
}

export interface EventBus {
  on<T>(event: string, handler: (payload: T) => void): () => void;
  once<T>(event: string, handler: (payload: T) => void): () => void;
  emit<T>(event: string, payload: T): void;
}

export interface PluginContext {
  registry: EngineRegistry;
  services: EngineServices;
  events: EventBus;
  config: FormEngineOptions;
}

export interface FormEnginePlugin {
  name: string;
  version: string;
  dependencies?: string[];
  install(context: PluginContext): void; // 同步（BLOCK-07），抛错即安装失败
  dispose?(context: PluginContext): void;
}

export interface FormEngineOptions {
  id?: string;
  platform?: Platform;
  locale?: string;
  debug?: boolean;
  components?: ComponentBinding[];
  plugins?: FormEnginePlugin[];
  services?: Partial<EngineServices>;
}

export interface FormEngine {
  readonly id: string;
  readonly options: FormEngineOptions;
  readonly registry: EngineRegistry;
  readonly events: EventBus;
  readonly services: EngineServices;
  readonly status: EngineStatus;
  installPlugin(plugin: FormEnginePlugin): void;
  dispose(): void;
}
