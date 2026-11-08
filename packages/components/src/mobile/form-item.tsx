import { connect, mapProps } from '@formily/react';
import { Form as AntdMobileForm } from 'antd-mobile';
import type { FormItemProps as AntdMobileFormItemProps } from 'antd-mobile';

/**
 * 移动端 FormItem 装饰器。
 *
 * Formily 通过 `x-decorator` 渲染装饰器，并把当前字段（`Field` / `VoidField`）
 * 传给 `mapProps` 的映射函数。这里只读取展示所需的元信息：
 *
 * - `label`：显式传入优先，否则取 `field.title`
 * - `required`：取 `field.required`，用于 antd-mobile 的必填标记
 * - `help`：显式传入优先，否则取 `field.selfErrors`（Formily 负责校验，
 *   不接入 antd-mobile 的 `rc-field-form` 校验）
 * - `extra`：显式传入优先，否则取 `field.description`
 *
 * antd-mobile 的 `help` 只显示为标签旁的提示图标（Popover 未展开时内容不渲染），
 * 因此校验错误另外通过 `errorText` 以内联文案渲染在控件下方。
 *
 * 找不到字段或字段为 void field 时安全降级：`title` / `description` 仍可用，
 * 其余属性不访问。
 */

const AntdMobileFormItem = AntdMobileForm.Item;

/** 从 Formily Field 上安全读取的最小元信息视图。 */
type SafeFieldMeta = {
  title?: unknown;
  description?: unknown;
  required?: unknown;
  selfErrors?: unknown;
};

function toSafeFieldMeta(field: unknown): SafeFieldMeta {
  return field && typeof field === 'object' ? (field as SafeFieldMeta) : {};
}

function toText(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toErrors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/** 装饰器额外注入的内联错误文案，不透传给 antd-mobile。 */
type FormItemDecoratorProps = AntdMobileFormItemProps & {
  errorText?: string;
};

function BaseFormItem({ errorText, children, ...props }: FormItemDecoratorProps) {
  return (
    <AntdMobileFormItem {...props}>
      {children}
      {errorText ? (
        <div className="adm-form-item-feedback-error">{errorText}</div>
      ) : null}
    </AntdMobileFormItem>
  );
}

export const FormItem = connect(
  BaseFormItem,
  mapProps<typeof BaseFormItem>((props, field) => {
    const meta = toSafeFieldMeta(field);
    const errors = toErrors(meta.selfErrors);
    const errorText = errors.length > 0 ? errors.join(', ') : undefined;

    return {
      ...props,
      label: props.label ?? toText(meta.title),
      required: typeof meta.required === 'boolean' ? meta.required : false,
      help: props.help ?? errorText,
      extra: props.extra ?? toText(meta.description),
      errorText,
    };
  })
);
