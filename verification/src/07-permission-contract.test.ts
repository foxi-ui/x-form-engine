import { describe, expect, it } from 'vitest'

/**
 * 第 7 项协议验证：前端权限只做 UI 收敛，后端必须独立校验。
 * 这里验证前端解析器的 fail-closed 语义和字段级读写收敛行为。
 */

interface FieldPermission {
  read?: boolean
  write?: boolean
}

interface PermissionEnvelope {
  version: number
  form: {
    read?: boolean
    submit?: boolean
  }
  fields: Record<string, FieldPermission>
}

interface SchemaPermissionHint {
  read?: boolean
  write?: boolean
}

interface EffectiveAccess {
  read: boolean
  write: boolean
  reason?: 'CONTEXT_MISSING' | 'STALE_VERSION' | 'FORM_READ_DENIED'
}

/**
 * 前端有效权限 = 服务端权限信封 ∩ Schema 提示。
 * - 权限信封缺失 / 版本过期 / 表单不可读 → 全部拒绝（fail-closed）。
 * - 字段未出现在信封中 → 默认拒绝，不做“未声明即允许”。
 * - Schema 只能进一步收紧，不能提权。
 */
function resolveFieldAccess(params: {
  envelope?: PermissionEnvelope
  expectedVersion?: number
  path: string
  schemaHint?: SchemaPermissionHint
}): EffectiveAccess {
  const { envelope, expectedVersion, path, schemaHint } = params

  if (!envelope) {
    return { read: false, write: false, reason: 'CONTEXT_MISSING' }
  }
  if (expectedVersion !== undefined && envelope.version !== expectedVersion) {
    return { read: false, write: false, reason: 'STALE_VERSION' }
  }
  if (envelope.form?.read !== true) {
    return { read: false, write: false, reason: 'FORM_READ_DENIED' }
  }

  const field = envelope.fields?.[path]
  const envelopeRead = field?.read === true
  const envelopeWrite = envelopeRead && field?.write === true
  const schemaAllowsRead = schemaHint?.read !== false
  const schemaAllowsWrite = schemaHint?.write !== false

  return {
    read: envelopeRead && schemaAllowsRead,
    write: envelopeWrite && schemaAllowsWrite,
  }
}

function canSubmit(
  envelope: PermissionEnvelope | undefined,
  expectedVersion?: number
): boolean {
  if (!envelope) return false
  if (expectedVersion !== undefined && envelope.version !== expectedVersion) {
    return false
  }
  return envelope.form?.read === true && envelope.form?.submit === true
}

/** 提交前剔除无写权限字段，避免隐藏字段被静默提交。 */
function filterWritableValues(
  envelope: PermissionEnvelope | undefined,
  values: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([path]) => resolveFieldAccess({ envelope, path }).write
    )
  )
}

const envelope: PermissionEnvelope = {
  version: 7,
  form: { read: true, submit: true },
  fields: {
    name: { read: true, write: true },
    idCard: { read: true, write: false },
    salary: { read: false, write: false },
  },
}

describe('第 7 项：权限规则的前后端边界', () => {
  it('缺少权限信封时 fail-closed', () => {
    expect(resolveFieldAccess({ path: 'name' })).toEqual({
      read: false,
      write: false,
      reason: 'CONTEXT_MISSING',
    })
  })

  it('权限信封版本过期时拒绝，而不是沿用旧权限', () => {
    expect(
      resolveFieldAccess({ envelope, expectedVersion: 8, path: 'name' })
    ).toEqual({
      read: false,
      write: false,
      reason: 'STALE_VERSION',
    })
  })

  it('表单整体不可读时所有字段拒绝', () => {
    const denied = { ...envelope, form: { read: false, submit: false } }
    expect(resolveFieldAccess({ envelope: denied, path: 'name' })).toMatchObject(
      { read: false, write: false, reason: 'FORM_READ_DENIED' }
    )
  })

  it('字段未在信封中声明时默认拒绝', () => {
    expect(resolveFieldAccess({ envelope, path: 'unknownField' })).toEqual({
      read: false,
      write: false,
    })
  })

  it('支持只读字段、可写字段和不可见字段三态', () => {
    expect(resolveFieldAccess({ envelope, path: 'name' })).toEqual({
      read: true,
      write: true,
    })
    expect(resolveFieldAccess({ envelope, path: 'idCard' })).toEqual({
      read: true,
      write: false,
    })
    expect(resolveFieldAccess({ envelope, path: 'salary' })).toEqual({
      read: false,
      write: false,
    })
  })

  it('Schema 权限提示只能收紧，不能提权', () => {
    // Schema 说不可读 → 即使信封允许，也不读
    expect(
      resolveFieldAccess({
        envelope,
        path: 'name',
        schemaHint: { read: false, write: false },
      })
    ).toEqual({ read: false, write: false })

    // Schema 说可写 → 信封拒绝时仍不可写
    expect(
      resolveFieldAccess({
        envelope,
        path: 'salary',
        schemaHint: { read: true, write: true },
      })
    ).toEqual({ read: false, write: false })
  })

  it('提交前剔除无写权限字段', () => {
    const values = { name: '张三', idCard: '110101...', salary: 10000 }
    expect(filterWritableValues(envelope, values)).toEqual({ name: '张三' })
  })

  it('提交动作需要独立的 submit 权限且同样 fail-closed', () => {
    expect(canSubmit(undefined)).toBe(false)
    expect(canSubmit(envelope)).toBe(true)
    expect(canSubmit(envelope, 8)).toBe(false)
    expect(
      canSubmit({ ...envelope, form: { read: true, submit: false } })
    ).toBe(false)
  })
})
