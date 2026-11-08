import { connect } from '@formily/react';
import { TextArea as AntdMobileTextArea } from 'antd-mobile';

/**
 * 移动端 Textarea：由 `@formily/react` 的 `connect` 绑定 value/onChange，
 * 值类型为 `string`。`placeholder` / `disabled` / `style` 等
 * `x-component-props` 原样透传，移动端不认识的 PC 专属 props 由
 * antd-mobile 静默忽略，不抛错。
 */
export const Textarea = connect(AntdMobileTextArea);
