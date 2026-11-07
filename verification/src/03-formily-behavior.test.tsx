import React from 'react'
import { describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  createForm,
  onFieldInit,
  onFieldReact,
  onFieldValueChange,
  onFormValuesChange,
} from '@formily/core'
import type { ISchema } from '@formily/json-schema'
import { FormProvider, createSchemaField, useFormEffects } from '@formily/react'

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

const Checkbox = (props: any) => {
  const { value, onChange, ...rest } = props
  return (
    <input
      {...rest}
      type="checkbox"
      checked={!!value}
      onChange={(event) => onChange?.(event.target.checked)}
    />
  )
}

const components = { Input, Checkbox }

describe('第 3 项：x-reactions、自定义组件、Effects 与动态校验', () => {
  it('自定义组件可通过 createSchemaField components 注册并双向绑定', async () => {
    const form = createForm({ values: { name: '' } })
    const SchemaField = createSchemaField({ components })
    const schema: ISchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          'x-component': 'Input',
          'x-component-props': { 'data-testid': 'custom-input' },
        },
      },
    }

    render(
      <FormProvider form={form}>
        <SchemaField schema={schema} />
      </FormProvider>
    )

    fireEvent.change(screen.getByTestId('custom-input'), {
      target: { value: '张三' },
    })

    await waitFor(() => expect(form.values.name).toBe('张三'))
    expect((screen.getByTestId('custom-input') as HTMLInputElement).value).toBe(
      '张三'
    )
    cleanup()
  })

  it('x-reactions dependencies + display 可驱动字段显隐', async () => {
    const form = createForm({ values: { enabled: false } })
    const SchemaField = createSchemaField({ components })
    const schema: ISchema = {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          'x-component': 'Checkbox',
          'x-component-props': { 'data-testid': 'enabled' },
        },
        detail: {
          type: 'string',
          'x-component': 'Input',
          'x-component-props': { 'data-testid': 'detail' },
          'x-reactions': {
            dependencies: ['enabled'],
            fulfill: {
              state: {
                display: "{{ $deps[0] ? 'visible' : 'none' }}",
              },
            },
          },
        },
      },
    }

    render(
      <FormProvider form={form}>
        <SchemaField schema={schema} />
      </FormProvider>
    )

    expect(screen.queryByTestId('detail')).toBeNull()

    fireEvent.click(screen.getByTestId('enabled'))

    await waitFor(() => expect(screen.getByTestId('detail')).toBeTruthy())
    expect(form.values.enabled).toBe(true)
    cleanup()
  })

  it('x-reactions 可动态设置 required，并配合 x-validator 自定义校验', async () => {
    const form = createForm({ values: { kind: 'normal', amount: null } })
    const SchemaField = createSchemaField({
      components,
      scope: {
        evenOnly: (value: unknown) => {
          if (value === null || value === undefined || value === '') return true
          return Number(value) % 2 === 0 || '金额必须为偶数'
        },
      },
    })
    const schema: ISchema = {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          'x-component': 'Input',
          'x-component-props': { 'data-testid': 'kind' },
        },
        amount: {
          type: 'number',
          'x-component': 'Input',
          'x-validator': '{{ evenOnly }}',
          'x-component-props': { 'data-testid': 'amount' },
          'x-reactions': {
            dependencies: ['kind'],
            fulfill: {
              state: {
                required: "{{ $deps[0] === 'invoice' }}",
              },
            },
          },
        },
      },
    }

    render(
      <FormProvider form={form}>
        <SchemaField schema={schema} />
      </FormProvider>
    )

    const amountField = form.query('amount').take() as any
    await waitFor(() => expect(amountField.required).toBe(false))

    // kind=normal 时不要求必填，空值可通过校验
    await form.validate()

    form.setValuesIn('kind', 'invoice')
    await waitFor(() => expect(amountField.required).toBe(true))

    let missingError: unknown
    try {
      await form.validate()
    } catch (error) {
      missingError = error
    }
    expect(missingError).toBeTruthy()

    // 奇数触发自定义 validator 失败
    form.setValuesIn('amount', 3)
    let oddError: unknown
    try {
      await form.validate()
    } catch (error) {
      oddError = error
    }
    expect(oddError).toBeTruthy()

    // 偶数通过
    form.setValuesIn('amount', 4)
    await form.validate()
    expect(form.values.amount).toBe(4)
    cleanup()
  })

  it('createForm effects 与 useFormEffects 均可注册生命周期', async () => {
    const events: string[] = []
    const form = createForm({
      values: { name: '' },
      effects() {
        onFieldInit('name', (field) => {
          events.push(`field:init:${field.path}`)
        })
        onFieldValueChange('name', (field) => {
          events.push(`field:value:${String(field.value)}`)
        })
        onFormValuesChange((currentForm) => {
          events.push(`form:values:${JSON.stringify(currentForm.values)}`)
        })
        onFieldReact('name', (field) => {
          if ((field as any).value === 'react') {
            field.setState({ title: 'React 标题' })
          }
        })
      },
    })

    function EffectsProbe() {
      useFormEffects(() => {
        onFieldValueChange('name', () => {
          events.push('hook:field:value')
        })
      })
      return null
    }

    const SchemaField = createSchemaField({ components })
    const schema: ISchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          'x-component': 'Input',
          'x-component-props': { 'data-testid': 'effects-input' },
        },
      },
    }

    render(
      <FormProvider form={form}>
        <EffectsProbe />
        <SchemaField schema={schema} />
      </FormProvider>
    )

    await waitFor(() =>
      expect(events).toContain('field:init:name')
    )

    fireEvent.change(screen.getByTestId('effects-input'), {
      target: { value: 'react' },
    })

    await waitFor(() => {
      expect(events).toContain('hook:field:value')
      expect(
        events.some((event) => event.startsWith('form:values:'))
      ).toBe(true)
      expect(events).toContain('field:value:react')
    })

    const field = form.query('name').take() as any
    await waitFor(() => expect(field.title).toBe('React 标题'))
    cleanup()
  })
})
