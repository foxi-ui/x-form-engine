import { FormEngineError } from '@x-form-engine/types';
import type {
  ComponentBinding,
  ComponentImplementations,
  FormEngine,
  Platform,
  PlatformFallbackDiagnostic,
} from '@x-form-engine/types';
import type { ComponentType } from 'react';

/**
 * Formily 组件映射。
 *
 * `components` 供 SchemaField 按 `x-component` / `x-decorator` 名称解析
 * （Formily 的 createSchemaField 用同一张 components 表解析两者）：
 * `registry.decorators` 中的装饰器会按名称合并进同一张 `components` 表，
 * 因此 `x-decorator` 与 `x-component` 走同一条解析路径。
 * `decorators` 字段按名称单独保留装饰器映射，便于调用方区分两类注册项。
 */
export interface FormilyComponentMap {
  components: Record<string, ComponentType<unknown>>;
  decorators: Record<string, ComponentType<unknown>>;
}

/** 组件映射解析结果，附带 mobile 平台回退产生的诊断。 */
export interface FormilyComponentMapResolution extends FormilyComponentMap {
  diagnostics: PlatformFallbackDiagnostic[];
}

/**
 * 解析单个组件/装饰器在目标平台上的实现。
 *
 * `pc` 保持严格语义：缺少实现直接抛错，避免静默渲染错误实现。
 * `mobile` 缺少实现时回退到 `pc`，并记录一条诊断；
 * 两个平台都没有实现时仍然抛错。
 */
function resolveImplementation(
  kind: PlatformFallbackDiagnostic['kind'],
  name: string,
  implementations: ComponentImplementations,
  platform: Platform,
  diagnostics: PlatformFallbackDiagnostic[]
): unknown {
  const implementation = implementations[platform];

  if (implementation) {
    return implementation;
  }

  if (platform === 'mobile' && implementations.pc) {
    diagnostics.push({
      kind,
      name,
      requestedPlatform: platform,
      fallbackPlatform: 'pc',
    });
    return implementations.pc;
  }

  throw new FormEngineError(
    'COMPONENT_CAPABILITY_MISMATCH',
    `${kind === 'component' ? '组件' : '装饰器'} "${name}" 缺少 ${platform} 平台实现`,
    { name, platform }
  );
}

/**
 * 把 Engine Registry 中的组件绑定映射为 Formily 可用的组件表。
 *
 * `pc` 平台缺少实现时立即抛错；`mobile` 平台缺少实现时回退到 `pc` 实现，
 * 并在 `diagnostics` 中记录每一次回退，供上层提示降级渲染。
 */
export function resolveFormilyComponentMap(
  engine: FormEngine,
  platform: Platform
): FormilyComponentMapResolution {
  const components: Record<string, ComponentType<unknown>> = {};
  const decorators: Record<string, ComponentType<unknown>> = {};
  const diagnostics: PlatformFallbackDiagnostic[] = [];

  for (const entry of engine.registry.components.list()) {
    // React 边界收窄点：Registry 中的实现类型是 unknown。
    components[entry.name] = resolveImplementation(
      'component',
      entry.name,
      entry.value.implementations,
      platform,
      diagnostics
    ) as ComponentType<unknown>;
  }

  // Formily 的 createSchemaField 使用同一张 components 表解析
  // `x-component` 与 `x-decorator`，装饰器同样按 name 合并进来。
  for (const entry of engine.registry.decorators.list()) {
    const binding = entry.value as ComponentBinding;
    const implementation = resolveImplementation(
      'decorator',
      entry.name,
      binding.implementations,
      platform,
      diagnostics
    ) as ComponentType<unknown>;

    components[entry.name] = implementation;
    decorators[entry.name] = implementation;
  }

  return { components, decorators, diagnostics };
}
