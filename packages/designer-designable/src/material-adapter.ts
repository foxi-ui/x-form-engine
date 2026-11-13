import { createBehavior, createResource } from '@designable/core';
import { Field, Form as DesignableForm } from '@designable/formily-antd';
import type { DnComponent } from '@designable/react';
import { basicDecorators } from '@x-form-engine/components';
import type { DesignerMaterialDefinition } from '@x-form-engine/types';
import { createElement } from 'react';
import type { ComponentType } from 'react';

export type DesignerHostComponent = DnComponent<unknown>;
export type DesignableMaterialMap = Record<string, DesignerHostComponent>;

/** 画布 Form 宿主：保留可放置能力，不继承 form 级 Behavior。 */
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

/** 字段级默认属性面板（name/title/description/required）。组件专属 Setter 由 Phase 6 丰富。 */
function createDefaultPropsSchema(): Record<string, unknown> {
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
    },
  };
}

/**
 * Designable 物料转换（Task 5.2）。
 *
 * 把框架无关的 `DesignerMaterialDefinition[]` 转成 Designable host map：
 * `designerComponent`（React host）挂载 Behavior（`x-component` 匹配）+ Resource
 * （由 `createSchema` 生成）。Designable 专属字段只在此 Adapter 内部实现（C11/C13）。
 */
export function createDesignableMaterialAdapter(
  materials: DesignerMaterialDefinition[]
): DesignableMaterialMap {
  const map: DesignableMaterialMap = {
    Field: Field as DesignerHostComponent,
    Form: FormHost,
    FormItem: basicDecorators[0].implementations.pc as DesignerHostComponent,
  };

  for (const material of materials) {
    const host = material.designerComponent as DesignerHostComponent;

    const behavior = createBehavior({
      name: material.componentName,
      extends: ['Field'],
      selector: (node) => node.props?.['x-component'] === material.componentName,
      designerProps: {
        propsSchema: createDefaultPropsSchema(),
        droppable: material.capabilities?.container === true,
      },
      designerLocales: { 'zh-CN': { title: material.title } },
    });

    const resource = createResource({
      title: material.title,
      icon: 'TextSource',
      elements: [
        {
          componentName: 'Field',
          props: material.createSchema({}),
        },
      ],
    });

    host.Behavior = behavior;
    host.Resource = resource;
    map[material.name] = host;
  }

  return map;
}
