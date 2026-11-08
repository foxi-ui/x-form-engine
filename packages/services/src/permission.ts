import type {
  EffectiveFieldAccess,
  EffectiveFormAccess,
  PermissionEnvelope,
  SchemaPermissionHint,
} from '@x-form-engine/types';

export interface ResolveFieldAccessParams {
  envelope?: PermissionEnvelope;
  expectedVersion?: number;
  path: string;
  schemaHint?: SchemaPermissionHint;
}

/**
 * 解析字段有效权限：服务端权限信封 ∩ Schema 提示。
 *
 * - 信封缺失 → `CONTEXT_MISSING`，读写均拒绝（fail-closed）。
 * - 版本不一致 → `STALE_VERSION`，读写均拒绝。
 * - `form.read !== true` → `FORM_READ_DENIED`。
 * - 字段未在信封声明 → 默认拒绝。
 * - Schema 提示只能收紧，不能提权。
 */
export function resolveFieldAccess(
  params: ResolveFieldAccessParams
): EffectiveFieldAccess {
  const { envelope, expectedVersion, path, schemaHint } = params;

  if (!envelope) {
    return { read: false, write: false, reason: 'CONTEXT_MISSING' };
  }
  if (expectedVersion !== undefined && envelope.version !== expectedVersion) {
    return { read: false, write: false, reason: 'STALE_VERSION' };
  }
  if (envelope.form?.read !== true) {
    return { read: false, write: false, reason: 'FORM_READ_DENIED' };
  }

  const field = envelope.fields?.[path];
  const envelopeRead = field?.read === true;
  const envelopeWrite = envelopeRead && field?.write === true;
  const schemaAllowsRead = schemaHint?.read !== false;
  const schemaAllowsWrite = schemaHint?.write !== false;

  return {
    read: envelopeRead && schemaAllowsRead,
    write: envelopeWrite && schemaAllowsWrite,
  };
}

/** 解析表单级有效权限（read/submit）。 */
export function resolveFormAccess(
  envelope?: PermissionEnvelope,
  expectedVersion?: number
): EffectiveFormAccess {
  if (!envelope) {
    return { read: false, submit: false, reason: 'CONTEXT_MISSING' };
  }
  if (expectedVersion !== undefined && envelope.version !== expectedVersion) {
    return { read: false, submit: false, reason: 'STALE_VERSION' };
  }
  const read = envelope.form?.read === true;
  const submit = read && envelope.form?.submit === true;
  return read ? { read, submit } : { read, submit, reason: 'FORM_READ_DENIED' };
}

/** 提交动作需要独立的 submit 权限，且同样 fail-closed。 */
export function canSubmit(
  envelope?: PermissionEnvelope,
  expectedVersion?: number
): boolean {
  return resolveFormAccess(envelope, expectedVersion).submit;
}

/**
 * 提交前剔除无写权限字段，避免隐藏字段被静默提交。
 * 注意：当前按顶层 key 过滤；嵌套/数组字段级写权限由后端强制校验。
 */
export function filterWritableValues(
  envelope: PermissionEnvelope | undefined,
  values: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([path]) => resolveFieldAccess({ envelope, path }).write
    )
  );
}
