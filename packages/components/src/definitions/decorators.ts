import { FormItem } from '@formily/antd';
import { createFormItemProtocol } from '../shared/protocols';
import type { ReactComponentBinding } from '../types';

/**
 * 基础装饰器：PC 实现直接借用 `@formily/antd` 的 FormItem，
 * 用于渲染字段标签与布局。
 *
 * 协议来自无 UI 依赖的 `../shared/protocols`；移动端实现在后续任务的 `src/mobile` 中提供。
 */
export const basicDecorators: ReactComponentBinding[] = [
  {
    protocol: createFormItemProtocol(),
    implementations: { pc: FormItem },
  },
];
