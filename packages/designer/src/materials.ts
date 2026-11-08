import { createBehavior, createResource } from '@designable/core';
import { Field, Form } from '@designable/formily-antd';
import { basicDecorators } from '@x-form-engine/components';
import type { ReactComponentBinding } from '@x-form-engine/components';
import type { ISchema } from '@formily/json-schema';
import type { ComponentType } from 'react';

/** Designable 宿主组件：普通 React 组件上挂载 Behavior / Resource 声明。 */
export type DesignerHostComponent = ComponentType<unknown> & {
  Behavior?: unknown[];
  Resource?: unknown[];
};

export type DesignerMaterialMap = Record<string, DesignerHostComponent>;

/** 组件属性 Setter 的名称；Task 7 提供具体实现。 */
const OPTIONS_SETTER = 'OptionsSetter';

/**
 * 手工构造属性面板 schema：字段级属性位于顶层，
 * 组件自身协议属性统一收纳在 `x-component-props` 内。
 */
function createPropsSchema(binding: ReactComponentBinding): ISchema {
  const declaredProperties = (binding.protocol.schema.properties ?? {}) as Record<string, ISchema>;

  return {
    type: 'object',
    properties: {
      name: { type: 'string', 'x-decorator': 'FormItem', 'x-component': 'Input' },
      title: { type: 'string', 'x-decorator': 'FormItem', 'x-component': 'Input' },
      description: {
        type: 'string',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
      },
      required: { type: 'boolean', 'x-decorator': 'FormItem', 'x-component': 'Switch' },
      'x-component-props': {
        type: 'object',
        properties: {
          ...declaredProperties,
          options: {
            type: 'array',
            ...declaredProperties.options,
            'x-component': OPTIONS_SETTER,
          },
        },
      },
    },
  };
}

/**
 * 从组件定义派生 Designable 物料，使设计器与运行时共享同一份组件来源。
 *
 * 返回的 map 同时包含基础宿主 `Field` / `Form`（Designable 自带声明）
 * 与基础装饰器 `FormItem`，以及每个组件 binding 对应的宿主。
 */
export function createDesignerMaterials(
  bindings: ReactComponentBinding[]
): DesignerMaterialMap {
  const material: DesignerMaterialMap = {
    Field: Field as DesignerHostComponent,
    Form: Form as DesignerHostComponent,
    FormItem: basicDecorators[0].implementations.pc as DesignerHostComponent,
  };

  bindings.forEach((binding) => {
    const { name } = binding.protocol;
    const { title } = binding.protocol.meta;
    const host = binding.implementations.pc;
    if (!host) {
      return;
    }

    const behavior = createBehavior({
      name,
      extends: ['Field'],
      selector: (node) => node.props?.['x-component'] === name,
      designerProps: { propsSchema: createPropsSchema(binding) },
      designerLocales: { 'zh-CN': { ...binding.protocol.meta } },
    });

    const resource = createResource({
      title,
      icon: 'TextSource',
      elements: [
        {
          componentName: 'Field',
          props: {
            type: 'string',
            title,
            'x-decorator': 'FormItem',
            'x-component': name,
            ...(name === 'Select' || name === 'Radio' || name === 'Checkbox'
              ? { 'x-component-props': { options: [] } }
              : {}),
          },
        },
      ],
    });

    const designerHost = host as DesignerHostComponent;
    designerHost.Behavior = behavior;
    designerHost.Resource = resource;
    material[name] = designerHost;
  });

  return material;
}
