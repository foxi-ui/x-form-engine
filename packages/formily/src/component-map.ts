import { FormEngineError } from '@x-form-engine/types';
import type { ComponentBinding, FormEngine } from '@x-form-engine/types';
import type { ComponentType } from 'react';

/**
 * Formily 组件映射。
 *
 * `components` 供 SchemaField 按 `x-component` / `x-decorator` 名称解析
 * （Formily 的 createSchemaField 用同一张 components 表解析两者）：
 * `registry.decorators` 中的装饰器会按名称合并进同一张 `components` 表，
 * 因此 `x-decorator` 与 `x-component` 走同一条解析路径。
 * `decorators` 字段是已废弃的空占位，仅为兼容旧调用方保留。
 */
export interface FormilyComponentMap {
  components: Record<string, ComponentType<unknown>>;
  decorators: Record<string, ComponentType<unknown>>;
}

/**
 * 把 Engine Registry 中的组件绑定映射为 Formily 可用的组件表。
 *
 * 只取 `implementations[platform]`：缺少对应平台实现时立即抛错，
 * 而不是静默回退到其他平台，避免在运行时渲染出错误的平台实现。
 */
export function resolveFormilyComponentMap(
  engine: FormEngine,
  platform: 'pc' | 'mobile'
): FormilyComponentMap {
  const components: Record<string, ComponentType<unknown>> = {};
  const decorators: Record<string, ComponentType<unknown>> = {};

  for (const entry of engine.registry.components.list()) {
    const implementation = entry.value.implementations[platform];

    if (!implementation) {
      throw new FormEngineError(
        'COMPONENT_CAPABILITY_MISMATCH',
        `组件 "${entry.name}" 缺少 ${platform} 平台实现`,
        { name: entry.name, platform }
      );
    }

    // React 边界收窄点：Registry 中的实现类型是 unknown。
    components[entry.name] = implementation as ComponentType<unknown>;
  }

  // Formily 的 createSchemaField 使用同一张 components 表解析
  // `x-component` 与 `x-decorator`，装饰器同样按 name 合并进来。
  for (const entry of engine.registry.decorators.list()) {
    const binding = entry.value as ComponentBinding;
    const implementation = binding.implementations[platform];

    if (!implementation) {
      throw new FormEngineError(
        'COMPONENT_CAPABILITY_MISMATCH',
        `装饰器 "${entry.name}" 缺少 ${platform} 平台实现`,
        { name: entry.name, platform }
      );
    }

    components[entry.name] = implementation as ComponentType<unknown>;
  }

  return { components, decorators };
}
