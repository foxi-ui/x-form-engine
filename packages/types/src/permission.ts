import type { FieldPath } from './base';

/** 后端签发的字段级权限。 */
export interface FieldPermission {
  read?: boolean;
  write?: boolean;
}

/** 后端签发的表单级权限。 */
export interface FormPermission {
  read?: boolean;
  submit?: boolean;
  approve?: boolean;
}

/**
 * 后端签发的权限信封，与用户/租户/表单实例/流程节点绑定。
 * 前端只做 UI 收敛；后端在提交时重新计算，不能信任前端回传结果。
 */
export interface PermissionEnvelope {
  version: number;
  form: FormPermission;
  fields: Record<FieldPath, FieldPermission>;
}

/** Schema 中的权限提示（`x-engine.permission`）：只能收紧，不能提权。 */
export interface SchemaPermissionHint {
  read?: boolean;
  write?: boolean;
}

export type PermissionReason =
  | 'CONTEXT_MISSING'
  | 'STALE_VERSION'
  | 'FORM_READ_DENIED';

export interface EffectiveFieldAccess {
  read: boolean;
  write: boolean;
  reason?: PermissionReason;
}

export interface EffectiveFormAccess {
  read: boolean;
  submit: boolean;
  reason?: PermissionReason;
}

export interface PermissionService {
  getFormPermission(params: {
    formInstanceId: string;
    userId?: string;
    tenantId?: string;
  }): Promise<PermissionEnvelope>;
}
