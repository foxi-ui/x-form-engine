import React from 'react'
import { describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Form } from '@formily/core'
import * as FormilyCore from '@formily/core'
import { createForm } from '@formily/core'
import type { ISchema } from '@formily/json-schema'
import { Schema } from '@formily/json-schema'
import * as FormilyReact from '@formily/react'
import {
  FormProvider,
  createSchemaField,
  useField,
  useFieldSchema,
  useForm,
} from '@formily/react'

const Input = (props: any) => {
  const { value, onChange, ...rest } = props
  return (
    <input
      {...rest}
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value)}
    />
  )
}

const SchemaField = createSchemaField({ components: { Input } })

function HookProbe() {
  const form = useForm()
  const field = useField()
  const fieldSchema = useFieldSchema()
  return (
    <div data-testid="probe">
      {[
        typeof form === 'object' ? 'form:ok' : 'form:missing',
        typeof field === 'object' ? 'field:ok' : 'field:missing',
        fieldSchema ? 'schema:ok' : 'schema:missing',
      ].join(',')}
    </div>
  )
}

describe('第 2 项：Formily API 导出位置、类型与 Scope 传递', () => {
  it('核心 API 的导出位置与类型可见', () => {
    const coreFns = [
      'createForm',
      'onFieldInit',
      'onFieldValueChange',
      'onFieldReact',
      'onFormValuesChange',
      'onFormInit',
      'onFormMount',
      'onFormReact',
      'onFieldMount',
      'onFieldUnmount',
    ] as const

    const reactFns = [
      'createSchemaField',
      'FormProvider',
      'FormConsumer',
      'Field',
      'ObjectField',
      'ArrayField',
      'VoidField',
      'RecursionField',
      'useForm',
      'useField',
      'useFieldSchema',
      'useFormEffects',
      'connect',
      'mapProps',
      'mapReadPretty',
      'observer',
    ] as const

    for (const name of coreFns) {
      expect(typeof (FormilyCore as Record<string, unknown>)[name]).toBe(
        'function'
      )
    }
    for (const name of reactFns) {
      expect((FormilyReact as Record<string, unknown>)[name]).toBeTruthy()
    }

    // 类型层面的验证：严格模式下以下赋值必须编译通过
    const form: Form = createForm()
    const schema: ISchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名' },
      },
    }
    const schemaInstance = new Schema(schema)
    expect(form).toBeTruthy()
    expect(schemaInstance.type).toBe('object')
  })

  it('createSchemaField({ scope }) 可向 Schema 表达式注入作用域', () => {
    const ScopedSchemaField = createSchemaField({
      components: { Input },
      scope: {
        appName: 'form-engine',
        formatTitle: (value: unknown) => `[${String(value)}]`,
      },
    })

    const schema: ISchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          'x-component': 'Input',
          'x-component-props': {
            'data-testid': 'name-input',
            placeholder: '{{ appName }}',
          },
        },
      },
    }

    const form = createForm()
    render(
      <FormProvider form={form}>
        <ScopedSchemaField schema={schema} />
      </FormProvider>
    )

    expect(
      screen.getByTestId('name-input').getAttribute('placeholder')
    ).toBe('form-engine')
    cleanup()
  })

  it('SchemaField 实例级 scope 可覆盖工厂级 scope', () => {
    const ScopedSchemaField = createSchemaField({
      components: { Input },
      scope: { appName: 'factory-scope' },
    })

    const schema: ISchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          'x-component': 'Input',
          'x-component-props': {
            'data-testid': 'name-input-override',
            placeholder: '{{ appName }}',
          },
        },
      },
    }

    render(
      <FormProvider form={createForm()}>
        <ScopedSchemaField
          schema={schema}
          scope={{ appName: 'instance-scope' }}
        />
      </FormProvider>
    )

    expect(
      screen.getByTestId('name-input-override').getAttribute('placeholder')
    ).toBe('instance-scope')
    cleanup()
  })

  it('useForm / useField / useFieldSchema 在字段渲染上下文内可用', () => {
    const HookSchemaField = createSchemaField({
      components: { Input, HookProbe },
    })
    const schema: ISchema = {
      type: 'object',
      properties: {
        probe: {
          type: 'string',
          'x-component': 'HookProbe',
        },
      },
    }
    const form = createForm()

    render(
      <FormProvider form={form}>
        <HookSchemaField schema={schema} />
      </FormProvider>
    )

    expect(screen.getByTestId('probe').textContent).toContain('form:ok')
    expect(screen.getByTestId('probe').textContent).toContain('field:ok')
    expect(screen.getByTestId('probe').textContent).toContain('schema:ok')
    cleanup()
  })
})
