import type {
  SchemaDiagnostic,
  SetterBinding,
  SetterRegistry,
} from '@x-form-engine/types';
import type { ComponentType } from 'react';

/** Designable Setter 转换结果：React 组件 map + 解析（C5 诊断）。 */
export interface DesignableSetterAdapter {
  /** Designable SettingsForm 的 `components` 表：setter name → React 组件。 */
  components: Record<string, ComponentType<unknown>>;
  /** 解析 SetterBinding；未注册 Setter 产生诊断，不静默丢弃。 */
  resolve(binding: SetterBinding): {
    found: boolean;
    component?: ComponentType<unknown>;
    diagnostics: SchemaDiagnostic[];
  };
}

/**
 * Designable Setter 转换（Task 5.3）。
 *
 * 复用 `designer-core` 的 `SetterRegistry`（其 `resolve` 已含诊断），这里只做
 * React 边界收窄：`SetterDefinition.component`（`unknown`）→ React 组件。
 * Setter 组件不感知 Designable 内部节点对象（C11）。
 */
export function createDesignableSetterAdapter(
  registry: SetterRegistry
): DesignableSetterAdapter {
  const components: Record<string, ComponentType<unknown>> = {};
  for (const setter of registry.getAll()) {
    components[setter.name] = setter.component as ComponentType<unknown>;
  }

  return {
    components,
    resolve(binding: SetterBinding) {
      const result = registry.resolve(binding);
      if (!result.found || !result.setter) {
        return { found: false, diagnostics: result.diagnostics };
      }
      return {
        found: true,
        component: result.setter.component as ComponentType<unknown>,
        diagnostics: result.diagnostics,
      };
    },
  };
}
