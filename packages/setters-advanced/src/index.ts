import type { SetterDefinition } from '@x-form-engine/types';
import { ExpressionSetter, validateExpression } from './expression-setter';

export * from './expression-setter';

/**
 * 高级 Setter（Task 8.1）。
 *
 * 基于 `SetterDefinition`，通过公开 `SetterRegistry` 注册；不访问 Core 私有字段，
 * 不依赖 Designable、不依赖基础包。
 */
export const advancedSetters: SetterDefinition[] = [
  {
    name: 'ExpressionSetter',
    version: '1.0.0',
    component: ExpressionSetter,
    valueType: 'string',
    validate: validateExpression,
  },
];
