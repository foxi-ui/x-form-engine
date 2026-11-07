# 07. 权限规则：前端展示控制与后端强制执行

> 对应第 19 节第 7 项：明确权限规则由前端展示控制还是后端强制执行；业务安全必须由后端兜底。

## 1. 验证目标

回答三个问题：

1. Schema 中的 `x-engine.permission` 能不能作为授权依据？
2. 前端权限服务应该做什么、不应该做什么？
3. 后端必须在哪些环节独立校验？

## 2. 验证方式

验证文件：`verification/src/07-permission-contract.test.ts`。

本项没有真实后端，因此用**协议级可执行用例**验证前端权限解析器的 fail-closed 语义、权限信封与 Schema 提示的合并规则、提交前字段收敛行为。共 8 个用例，全部通过：

```text
✓ 缺少权限信封时 fail-closed
✓ 权限信封版本过期时拒绝，而不是沿用旧权限
✓ 表单整体不可读时所有字段拒绝
✓ 字段未在信封中声明时默认拒绝
✓ 支持只读字段、可写字段和不可见字段三态
✓ Schema 权限提示只能收紧，不能提权
✓ 提交前剔除无写权限字段
✓ 提交动作需要独立的 submit 权限且同样 fail-closed
```

## 3. 核心结论

> **前端权限只负责 UX 收敛；后端必须独立完成鉴权、字段级写权限校验和业务规则校验。**
>
> Schema 里的 `permission` 配置是**展示提示**，不是授权凭证，不能替代后端校验。

## 4. 两层权限模型

### 4.1 后端签发的权限信封

建议后端在加载表单实例时返回与实例绑定的权限信封：

```ts
interface PermissionEnvelope {
  version: number
  form: {
    read: boolean
    submit: boolean
    approve?: boolean
  }
  fields: Record<string, {
    read?: boolean
    write?: boolean
  }>
}
```

示例：

```json
{
  "version": 7,
  "form": { "read": true, "submit": true },
  "fields": {
    "name": { "read": true, "write": true },
    "idCard": { "read": true, "write": false },
    "salary": { "read": false, "write": false }
  }
}
```

要求：

- 信封与用户、租户、表单实例、流程节点绑定；
- 带版本号，前端提交时回传版本号；
- 后端在提交时重新计算，不能信任前端回传结果；
- 字段未声明时默认拒绝，不做“未声明即允许”。

### 4.2 Schema 权限提示

```json
{
  "x-engine": {
    "permission": {
      "read": true,
      "write": false
    }
  }
}
```

Schema 提示的作用：

- 设计器展示组件能力；
- 无权限服务时提供保守默认值；
- 在服务端信封基础上进一步收紧。

**Schema 提示不能提权。** 有效权限采用交集：

```text
effective.read  = envelope.form.read && envelope.fields[path].read && schemaHint.read !== false
effective.write = effective.read && envelope.fields[path].write && schemaHint.write !== false
```

验证用例覆盖了两种方向：

- Schema 说不可读，即使信封允许也不读；
- Schema 说可写，信封拒绝时仍不可写。

## 5. 前端职责

| 职责 | 做法 |
|---|---|
| 隐藏不可读字段 | `read=false` 不渲染；不要只做 CSS 隐藏 |
| 只读展示 | `read=true, write=false` 使用只读组件或 `readOnly` |
| 禁用不可写字段 | `write=false` 不允许输入 |
| 提交前剔除无写权限字段 | 防止隐藏字段被静默提交 |
| 提交按钮收敛 | `submit=false` 时禁用按钮并提示 |
| 权限版本校验 | 版本不一致时重新拉取，不沿用旧权限 |
| 失败关闭 | 权限服务缺失、超时、解析失败 → 只读或阻断，默认不可写 |

前端**不应**：

- 把 `x-engine.permission` 当授权凭证；
- 通过修改前端状态绕过只读；
- 把“隐藏”当“安全”；
- 在客户端计算并缓存最终授权结果后长期使用。

## 6. 后端职责

| 环节 | 后端必须校验 |
|---|---|
| 读取表单 | 用户是否有权读取该实例 |
| 读取字段 | 字段级读权限；敏感字段脱敏 |
| 提交 | 表单提交权限、字段写权限、额外字段拒绝 |
| 校验 | 必填、类型、范围、跨字段规则、唯一性 |
| 业务动作 | 审批、撤回、转交、导出等动作权限 |
| 幂等 | 重复提交不重复产生业务副作用 |
| 审计 | 权限变更、敏感字段访问、提交记录 |

**字段级写权限是后端校验重点。** 前端剔除无权限字段只是 UX 优化，后端必须：

1. 按权限信封建立可写字段白名单；
2. 拒绝未声明字段和只读字段；
3. 对数组/嵌套字段使用稳定路径校验；
4. 对 `unknown` 字段默认拒绝，而不是忽略。

## 7. 反模式清单

| 反模式 | 风险 |
|---|---|
| `disabled={true}` 即认为安全 | 用户可直接构造请求 |
| 只隐藏字段但仍提交 | 越权写入 |
| 把权限规则写进 Schema 并当成授权 | Schema 可被篡改或复用 |
| 前端缓存权限到会话结束 | 流程节点变化后越权 |
| 后端只校验表单级权限 | 字段级越权 |
| 权限失败时默认放行 | 最危险的 fail-open |
| 历史 Snapshot 不做鉴权 | 敏感历史数据泄露 |

## 8. 建议接口

```ts
export interface PermissionService {
  getFormPermission(params: {
    formInstanceId: string
    userId: string
    tenantId: string
  }): Promise<PermissionEnvelope>
}

export interface EffectiveFieldAccess {
  read: boolean
  write: boolean
  reason?:
    | 'CONTEXT_MISSING'
    | 'STALE_VERSION'
    | 'FORM_READ_DENIED'
}
```

Resolver 规则：

- `envelope` 缺失 → `CONTEXT_MISSING`，读写均拒绝；
- 版本不一致 → `STALE_VERSION`，读写均拒绝并触发重新拉取；
- `form.read !== true` → `FORM_READ_DENIED`；
- 字段未声明 → 读写均拒绝；
- 有效权限 = 信封 ∩ Schema 提示。

## 9. 与现有规格的一致性

| 现有规格 | 本项结论 | 是否一致 |
|---|---|---|
| 06 §8 前端控制 UI、后端独立校验 | 明确为两层模型 | 一致 |
| 06 §8 不能把 Schema permission 当授权凭证 | 明确只能收紧、不能提权 | 一致 |
| 架构 §6.3 权限结果不应被普通组件属性覆盖 | 采用交集，Schema 不能提权 | 一致 |
| 09 §10 Snapshot 访问必须鉴权 | 历史详情同样走权限信封 | 一致 |

## 10. 待确认问题

1. 权限信封由哪个服务签发？是否与流程节点、租户、数据范围绑定？
2. 权限版本如何失效？轮询、WebSocket 还是提交时校验？
3. 字段级权限的路径规则是否与 Snapshot 的 `fields` key 完全一致？
4. 数组字段的权限粒度是数组整体还是行级/元素级？
5. 敏感字段的脱敏规则由后端返回，还是前端按字段类型处理？
6. 后端是否拒绝请求中的额外字段，还是忽略并记录告警？

## 11. 结论

**第 7 项结论：协议级验证通过。**

- 前端只做 UI 收敛，且必须 fail-closed；
- 后端必须独立校验表单级、字段级和业务规则；
- Schema 权限提示只能收紧，不能授权；
- 8 个协议用例全部通过；
- 真正的安全性仍需后端接口与权限服务联调验证。
