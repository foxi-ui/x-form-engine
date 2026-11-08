import type { ComponentBinding, ReadonlyComponentProps } from '@x-form-engine/types';
import type { ComponentType } from 'react';

/**
 * 组件绑定在 React 平台上的实现类型。
 *
 * `@x-form-engine/types` 的 `ComponentBinding` 默认实现类型为 `unknown`，
 * 这里收窄为 React 组件；这是唯一允许的具体实现类型边界，
 * 组件协议本身仍保持 UI 无关。
 */
export type ReadonlyComponent = ComponentType<ReadonlyComponentProps>;

export type ReactComponentBinding = ComponentBinding<
  ComponentType<unknown>,
  ReadonlyComponent
>;
