import type {
  SetterBinding,
  SetterDefinition,
  SetterResolveResult,
} from '@x-form-engine/types';
import { createNamedRegistry } from './named-registry';
import type { NamedRegistry } from './named-registry';

/** 解析到的 Setter 未注册（C5，不静默丢弃）。 */
export const SETTER_NOT_FOUND = 'SETTER_NOT_FOUND';

/**
 * Setter 注册表（Task 4.2）。
 *
 * 不依赖 Designable；`resolve` 将 `SetterBinding.name` 解析为已注册的
 * `SetterDefinition`，未注册时返回 `found:false` + 诊断，绝不静默丢弃。
 */
export interface SetterRegistryImpl extends NamedRegistry<SetterDefinition> {
  resolve(binding: SetterBinding): SetterResolveResult;
}

export function createSetterRegistry(): SetterRegistryImpl {
  const registry = createNamedRegistry<SetterDefinition>();

  return {
    ...registry,
    resolve(binding: SetterBinding): SetterResolveResult {
      const setter = registry.get(binding.name);
      if (!setter) {
        return {
          found: false,
          binding,
          diagnostics: [
            {
              code: SETTER_NOT_FOUND,
              severity: 'warning',
              message: `Setter "${binding.name}" 未注册`,
              setterName: binding.name,
            },
          ],
        };
      }
      return { found: true, setter, binding, diagnostics: [] };
    },
  };
}
