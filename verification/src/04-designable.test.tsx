import React from 'react'
import { describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { createForm } from '@formily/core'
import { Field as FormilyField, FormProvider } from '@formily/react'
import {
  GlobalRegistry,
  TreeNode,
  createBehavior,
  createDesigner,
  createResource,
} from '@designable/core'
import {
  transformToSchema,
  transformToTreeNode,
} from '@designable/formily-transformer'
import { Field, Input } from '@designable/formily-antd'
import {
  DataSourceSetter,
  ReactionsSetter,
  ValidatorSetter,
} from '@designable/formily-setters'

describe('第 4 项：Designable 物料、Setter 与 Schema 回写', () => {
  it('物料通过 Behavior / Resource 声明并可被注册中心匹配', () => {
    const fieldBehavior = (Field as any).Behavior
    const inputBehavior = (Input as any).Behavior
    const inputResource = (Input as any).Resource

    expect(Array.isArray(fieldBehavior)).toBe(true)
    expect(Array.isArray(inputBehavior)).toBe(true)
    expect(Array.isArray(inputResource)).toBe(true)

    const input = inputBehavior.find((behavior: any) => behavior.name === 'Input')
    expect(input).toBeTruthy()
    expect(input.extends).toContain('Field')

    const inputNode = new TreeNode({
      componentName: 'Field',
      props: { 'x-component': 'Input' },
    })
    expect(input.selector(inputNode)).toBe(true)

    expect(inputResource[0].node.isSourceNode).toBe(true)
    const element = inputResource[0].node.children[0]
    expect(element.componentName).toBe('Field')
    expect(element.props['x-component']).toBe('Input')

    // registerDesignerBehaviors 会按 extends 依赖排序；缺少依赖时应抛错
    expect(() =>
      GlobalRegistry.registerDesignerBehaviors([Field, Input] as any)
    ).not.toThrow()
    const matched = GlobalRegistry.getDesignerBehaviors(inputNode).map(
      (behavior) => behavior.name
    )
    expect(matched).toContain('Field')
    expect(matched).toContain('Input')
  })

  it('createBehavior / createResource 可独立扩展自定义物料', () => {
    const node = new TreeNode({
      componentName: 'Field',
      props: { 'x-component': 'UserSelect' },
    })

    const behaviors = createBehavior({
      name: 'UserSelect',
      extends: ['Field'],
      selector: (current: TreeNode) =>
        current.props?.['x-component'] === 'UserSelect',
      designerProps: {
        propsSchema: {
          type: 'object',
          properties: {
            multiple: { type: 'boolean', title: '多选' },
          },
        },
      },
    })

    expect(behaviors).toHaveLength(1)
    expect(behaviors[0].selector(node)).toBe(true)

    const resources = createResource({
      title: '人员选择',
      icon: 'UserSelectSource',
      elements: [
        {
          componentName: 'Field',
          props: {
            type: 'string',
            title: '人员选择',
            'x-decorator': 'FormItem',
            'x-component': 'UserSelect',
          },
        },
      ],
    })

    expect(resources).toHaveLength(1)
    const resource = resources[0] as any
    expect(resource.node.isSourceNode).toBe(true)
    expect(resource.node.children[0].props['x-component']).toBe('UserSelect')
  })

  it('Designer Engine 可管理节点树、选中节点与属性更新', () => {
    const engine = createDesigner({ rootComponentName: 'Form' })
    const tree = new TreeNode({
      componentName: 'Form',
      children: [
        {
          componentName: 'Field',
          props: { name: 'username', 'x-component': 'Input' },
        },
      ],
    })

    // setCurrentTree 只写入 currentWorkspace.operation.tree；
    // 未创建 workspace 时是空操作，这是 Designable Engine 的运行时约束。
    engine.workbench.ensureWorkspace({ id: 'verification-workspace' })
    engine.setCurrentTree(tree)

    const current = engine.getCurrentTree()!
    expect(current.componentName).toBe('Form')
    expect(current.children).toHaveLength(1)

    const child = current.children[0]
    expect(engine.findNodeById(child.id)).toBe(child)

    child.setProps({ title: '用户名' })
    expect(child.props?.title).toBe('用户名')

    const serialized = current.serialize()
    expect(serialized.componentName).toBe('Form')
    expect(serialized.children?.[0]?.props?.title).toBe('用户名')
  })

  it('Formily Schema 与 Designable TreeNode 可双向回写并保持节点 ID', () => {
    const originalSchema = {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          title: '用户名',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
        },
      },
    }

    const tree = transformToTreeNode({ schema: originalSchema })
    expect(tree.componentName).toBe('Form')
    expect(tree.children).toHaveLength(1)

    const field = tree.children![0]
    expect(field.componentName).toBe('Field')
    expect(field.props!['x-component']).toBe('Input')
    const designableId = field.id

    const back = transformToSchema(tree)
    const username = (back.schema as any).properties.username
    expect(username['x-component']).toBe('Input')
    expect(username['x-designable-id']).toBe(designableId)
    // transformToSchema 会补充 x-index，用于设计器排序
    expect(username['x-index']).toBe(0)

    // 二次往返应复用已有 x-designable-id，而不是生成新 ID
    const treeAgain = transformToTreeNode(back)
    expect(treeAgain.children![0].id).toBe(designableId)
    expect(treeAgain.children![0].props!['x-component']).toBe('Input')
  })

  it('Setter 组件对外暴露受控 value/onChange 协议', () => {
    // 这些组件由 observer() 包装，运行时是对象而非普通函数
    expect(ValidatorSetter).toBeTruthy()
    expect(ReactionsSetter).toBeTruthy()
    expect(DataSourceSetter).toBeTruthy()

    // 关键约束：ValidatorSetter 内部调用 useField() 读取 field.title，
    // 必须挂载在 Formily Field 上下文内，不能作为独立组件使用。
    const form = createForm()
    const { container } = render(
      <FormProvider form={form}>
        <FormilyField name="validator" title="校验规则">
          <ValidatorSetter value={[]} onChange={() => undefined} />
        </FormilyField>
      </FormProvider>
    )
    expect(container.querySelector('.ant-select')).toBeTruthy()
    cleanup()
  })
})
