import { basicComponents, basicDecorators } from '@x-form-engine/components';
import { createFormEngine, defaultFormattersPlugin } from '@x-form-engine/sdk';
import type { FormEngine } from '@x-form-engine/sdk';

/**
 * 创建登记表单使用的 Engine。
 *
 * Engine 负责注册组件、装饰器与插件；它不持有任何 Formily Form，
 * 每个 `<FormRenderer>` 会在内部创建自己的 Form。
 */
export function createEmployeeOnboardingEngine(): FormEngine {
  return createFormEngine({
    platform: 'pc',
    locale: 'zh-CN',
    components: basicComponents,
    decorators: basicDecorators,
    // 默认 Formatter 主要供只读渲染使用；先注册，后续加详情页无需改 Engine。
    plugins: [defaultFormattersPlugin],
  });
}
