import { FormEngineError } from '@x-form-engine/types';
import type {
  EngineRegistry,
  EngineServices,
  EngineStatus,
  EventBus,
  FormEngine,
  FormEngineOptions,
  FormEnginePlugin,
} from '@x-form-engine/types';
import { createEventBus } from './events/event-bus';
import { createEngineRegistry } from './registry/engine-registry';

/**
 * 内置注册来源标识。
 *
 * 通过 `options.components` 传入的组件都归属于引擎内置来源，
 * 后续卸载/覆盖校验据此判断归属。
 */
const BUILTIN_SOURCE = 'builtin';

class Engine implements FormEngine {
  readonly id: string;
  readonly options: FormEngineOptions;
  readonly registry: EngineRegistry;
  readonly events: EventBus;
  readonly services: EngineServices;
  status: EngineStatus;

  constructor(options: FormEngineOptions = {}) {
    this.id = options.id ?? 'form-engine';
    this.options = options;
    this.registry = createEngineRegistry();
    this.events = createEventBus();
    this.services = options.services ?? {};
    this.status = 'created';

    for (const binding of options.components ?? []) {
      this.registry.components.register(
        binding.protocol.name,
        binding,
        BUILTIN_SOURCE
      );
    }

    this.status = 'ready';
    this.events.emit('engine:init', undefined);
  }

  installPlugin(_plugin: FormEnginePlugin): void {
    throw new FormEngineError(
      'PLUGIN_DEPENDENCY_MISSING',
      'installPlugin 在 Task 4 实现'
    );
  }

  dispose(): void {
    if (this.status === 'disposed') {
      return;
    }

    this.events.emit('engine:dispose', undefined);
    this.status = 'disposed';
  }
}

/**
 * 创建 FormEngine 实例。
 *
 * 生命周期：创建后注册内置组件并进入 `ready`；`dispose()` 幂等，
 * 首次调用触发 `engine:dispose` 事件并置为 `disposed`。
 */
export function createFormEngine(options?: FormEngineOptions): FormEngine {
  return new Engine(options);
}
