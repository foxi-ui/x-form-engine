import { createBehavior, createResource } from '@designable/core';
import { Field, Form as DesignableForm } from '@designable/formily-antd';
import type { ISchema } from '@formily/json-schema';
import { basicDecorators } from '@x-form-engine/components';
import type { ReactComponentBinding } from '@x-form-engine/components';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import type { DesignerHostComponent, DesignableMaterialMap } from './material-adapter';

/** 组件属性 Setter 的名称。 */
const OPTIONS_SETTER = 'OptionsSetter';

/**
 * 协议里只声明 JSON 类型、不声明设置组件的属性，按类型选择默认设置组件。
 * 缺少 `x-component` 时 Formily 会渲染成没有编辑器的 void 字段。
 */
const SETTING_COMPONENT_BY_TYPE: Record<string, string> = {
  string: 'Input',
  boolean: 'Switch',
  array: OPTIONS_SETTER,
};

function createDeclaredPropertySchema(name: string, property: ISchema): ISchema {
  const component =
    property['x-component'] ??
    (typeof property.type === 'string' ? SETTING_COMPONENT_BY_TYPE[property.type] : undefined);

  return {
    'x-decorator': 'FormItem',
    title: name,
    ...property,
    ...(component ? { 'x-component': component } : {}),
  };
}

/**
 * 手工构造属性面板 schema：字段级属性位于顶层，
 * 组件自身协议属性统一收纳在 `x-component-props` 内。
 */
function createPropsSchema(binding: ReactComponentBinding): ISchema {
  const declaredProperties = (binding.protocol.schema.properties ?? {}) as Record<string, ISchema>;
  const declaredPropertySchemas: Record<string, ISchema> = {};

  for (const [name, property] of Object.entries(declaredProperties)) {
    declaredPropertySchemas[name] = createDeclaredPropertySchema(name, property);
  }

  const componentPropsProperties: Record<string, ISchema> = { ...declaredPropertySchemas };

  // 只有协议显式声明了 `options` 的组件（Select/Radio/Checkbox）才挂载选项编辑器。
  if (Object.prototype.hasOwnProperty.call(declaredProperties, 'options')) {
    componentPropsProperties.options = {
      type: 'array',
      'x-decorator': 'FormItem',
      title: '选项',
      ...declaredProperties.options,
      'x-component': OPTIONS_SETTER,
    };
  }

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
        properties: componentPropsProperties,
      },
    },
  };
}

/** 画布上的 Form 宿主：复用 Designable 渲染，不继承 form 级 Behavior（M2 范围外）。 */
const FormHost: DesignerHostComponent = (props) =>
  createElement(
    DesignableForm as ComponentType<Record<string, unknown>>,
    props as Record<string, unknown>
  );

FormHost.Behavior = createBehavior({
  name: 'Form',
  selector: (node) => node.componentName === 'Form',
  designerProps: (node) => ({
    draggable: !node.isRoot,
    cloneable: !node.isRoot,
    deletable: !node.isRoot,
    droppable: true,
  }),
  designerLocales: { 'zh-CN': { title: '表单' }, 'en-US': { title: 'Form' } },
});

/**
 * 从 ComponentBinding 派生 Designable 物料（Designable 专属，旧 `packages/designer`
 * 的 `createDesignerMaterials` 迁移至此，Task 9.5）。
 *
 * 返回 map 含基础宿主 `Field`、隐藏 form 级设置的 `Form` 宿主、基础装饰器 `FormItem`
 * 以及每个组件 binding 对应的宿主（含由 ComponentBinding 协议派生的富 propsSchema）。
 */
export function createDesignableMaterials(
  bindings: ReactComponentBinding[]
): DesignableMaterialMap {
  const material: DesignableMaterialMap = {
    Field: Field as DesignerHostComponent,
    Form: FormHost,
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
