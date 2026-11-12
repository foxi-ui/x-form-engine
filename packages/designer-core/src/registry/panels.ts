import type {
  CommandDefinition,
  PanelDefinition,
  ToolbarDefinition,
} from '@x-form-engine/types';
import { createNamedRegistry } from './named-registry';
import type { NamedRegistry } from './named-registry';

/**
 * Panel / Command / Toolbar 注册表（Task 4.3）。
 *
 * 最小能力：register / registerMany / unregister / get / getAll / has，
 * 直接复用 `createNamedRegistry` 泛型基类，不写 UI 实现、不做复杂布局/快捷键系统。
 */

export function createPanelRegistry(): NamedRegistry<PanelDefinition> {
  return createNamedRegistry<PanelDefinition>();
}

export function createCommandRegistry(): NamedRegistry<CommandDefinition> {
  return createNamedRegistry<CommandDefinition>();
}

export function createToolbarRegistry(): NamedRegistry<ToolbarDefinition> {
  return createNamedRegistry<ToolbarDefinition>();
}
