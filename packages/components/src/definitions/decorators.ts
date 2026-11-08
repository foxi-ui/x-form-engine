import { FormItem } from '@formily/antd';
import type { ReactComponentBinding } from '../types';

/**
 * M1 基础装饰器：PC 实现直接借用 `@formily/antd` 的 FormItem，
 * 用于渲染字段标签与布局；移动端实现暂不提供。
 */
export const basicDecorators: ReactComponentBinding[] = [
  {
    protocol: {
      name: 'FormItem',
      version: '1.0.0',
      meta: { title: '表单项' },
      capabilities: { editable: false, readonly: false, mobile: false },
      schema: { type: 'object' },
    },
    implementations: { pc: FormItem },
  },
];
