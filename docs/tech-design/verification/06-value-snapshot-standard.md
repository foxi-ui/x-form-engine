# 06. 人员、部门、字典组件的 Value 与 Snapshot 标准

> 对应第 19 节第 6 项：明确人员、部门、字典等组件的 Value 标准及 Snapshot 标准。

## 1. 验证目标

为高频组织/字典类组件定义可执行的标准，确保：

- Value 只保存稳定业务标识，可独立用于业务处理；
- Snapshot 冻结提交时的展示信息，可独立用于历史展示；
- PC / Mobile / 只读渲染器使用同一套语义；
- Adapter 能处理空值、多选、历史脏数据、未知 ID 等边界。

## 2. 验证方式

验证文件：`verification/src/06-value-snapshot-contract.test.ts`。

由于正式组件尚未实现，本项通过**协议级可执行用例**验证规范化规则和边界语义，而不是验证某个具体 React 组件。共 6 个用例，全部通过：

```text
✓ 人员单选 Value 只保存稳定 ID，空值归一为 null
✓ 人员多选 Value 为去重后的 ID 数组，空值为 []
✓ 人员 Snapshot 冻结提交时展示信息，未知 ID 保留并标记 missing
✓ 部门 Value 与人员共用 ID 规则，Snapshot 可附带路径信息
✓ 字典 Snapshot 冻结 label 与字典版本，缺失选项不伪造 label
✓ Value 与 Snapshot 的职责边界可被断言
```

## 3. 通用规则

### 3.1 Value 规则

| 规则 | 说明 |
|---|---|
| 只存稳定 ID/编码 | 人员、部门存 ID；字典存 `value`，不存 label |
| 类型稳定 | 单选与多选必须有明确类型，不能靠 `multiple` 属性推断 |
| 空值归一 | 单选空值为 `null`；多选空值为 `[]`，不得为 `undefined` 或 `null` |
| 去重保序 | 多选 ID 去重，保留用户选择顺序 |
| 不存展示信息 | 名称、部门名、头像等不得写入 Value |
| 可由 Adapter 归一 | 允许输入历史对象结构，但 `normalizeValue` 后必须是标准结构 |

### 3.2 Snapshot 规则

| 规则 | 说明 |
|---|---|
| 最小必要 | 只冻结构历史展示必需的字段 |
| 冻结展示信息 | 名称、部门、字典 label 使用提交时值 |
| 保留 ID | `value` 必须保留稳定 ID，`displayValue` 另存 |
| 未知不丢弃 | 查不到的 ID 保留并标记 `missing`，由只读渲染器显示降级文案 |
| 不伪造 | 查不到 label 时返回 `null`，不能用 ID 冒充名称 |
| 版本可追溯 | 字典快照记录 `dictCode`、`dictVersion`；组件快照记录 `componentVersion` |

## 4. 人员选择 UserSelect

### 4.1 Value

单选：

```json
"u_10001"
```

多选：

```json
["u_10001", "u_10002"]
```

空值：

```json
// 单选
null

// 多选
[]
```

规范化规则：

```ts
type UserValue = string | null
type UserMultiValue = string[]
```

- 接受 `string`、`{ id }`、`string[]`、`{ id }[]`；
- 单选取第一个有效 ID；
- 多选去重保序；
- 非法项（空字符串、无 id 对象）丢弃。

### 4.2 Snapshot

单选：

```json
{
  "path": "applicant",
  "component": "UserSelect",
  "componentVersion": "1.0.0",
  "title": "申请人",
  "value": "u_10001",
  "displayValue": {
    "id": "u_10001",
    "name": "张三",
    "departmentId": "d_100",
    "departmentName": "研发部"
  }
}
```

多选：

```json
{
  "path": "approvers",
  "component": "UserSelect",
  "value": ["u_10001", "u_10002"],
  "displayValue": [
    { "id": "u_10001", "name": "张三", "departmentName": "研发部" },
    { "id": "u_10002", "name": "李四", "departmentName": "产品部" }
  ]
}
```

未知人员：

```json
{
  "id": "u_404",
  "name": "",
  "missing": true
}
```

建议 `metadata` 记录诊断：

```json
{
  "metadata": {
    "displayMissing": ["u_404"]
  }
}
```

## 5. 部门选择 DeptSelect

### 5.1 Value

与 UserSelect 相同：

- 单选：`string | null`
- 多选：`string[]`

### 5.2 Snapshot

```json
{
  "path": "ownerDept",
  "component": "DeptSelect",
  "value": "d_100",
  "displayValue": {
    "id": "d_100",
    "name": "研发部",
    "path": ["总部", "研发中心", "研发部"]
  }
}
```

`path` 用于展示组织层级；组织调整后历史路径不应重新计算。

## 6. 字典选择 DictSelect

### 6.1 Value

| 字典值类型 | Value 类型 | 空值 |
|---|---|---|
| 字符串字典 | `string` | `null` |
| 数字字典 | `number` | `null` |
| 多选字典 | `Array<string \| number>` | `[]` |

不要把 label 写入 Value，也不要在 Value 中混用字符串和数字。

### 6.2 Snapshot

```json
{
  "path": "leaveType",
  "component": "DictSelect",
  "value": 1,
  "displayValue": "事假",
  "options": [
    { "label": "事假", "value": 1 }
  ],
  "metadata": {
    "dictCode": "leave_type",
    "dictVersion": "2026-01"
  }
}
```

规则：

- `displayValue` 冻结 label；
- `options` 只保存当前选中项，不保存整份字典；
- `dictCode` / `dictVersion` 用于追溯；
- 字典项被删除时，历史展示仍显示冻结 label；
- 找不到 label 时 `displayValue` 为 `null`，并标记 `metadata.displayMissing = true`。

## 7. 边界语义汇总

| 场景 | Value | Snapshot | 只读展示 |
|---|---|---|---|
| 单选未填 | `null` | `value: null`，`displayValue: null` | 空占位 |
| 多选未填 | `[]` | `value: []`，`displayValue: []` | 空占位 |
| 多选重复 | 去重后数组 | 按去重后 ID 生成 | 不重复 |
| 未知人员/部门 | 保留 ID | `{ id, name: "", missing: true }` | 降级文案 + 诊断 |
| 未知字典项 | 保留 value | `displayValue: null`，`missing: true` | 显示原始值 + 诊断 |
| 组织改名 | 不变 | 保留提交时名称 | 不漂移 |
| 字典项删除 | 不变 | 保留提交时 label | 不漂移 |

## 8. Adapter 契约

```ts
interface ComponentAdapter<Value, Snapshot> {
  normalizeValue(input: unknown, context: AdapterContext): Value
  serializeValue(value: Value, context: AdapterContext): unknown
  createSnapshot(value: Value, context: AdapterContext): Snapshot
  restoreSnapshot(snapshot: Snapshot, context: AdapterContext): Value
}
```

建议实现：

- `normalizeValue`：统一历史对象结构、去重、空值归一；
- `serializeValue`：提交前再次保证标准结构；
- `createSnapshot`：批量解析展示信息；失败项标记 `missing`；
- `restoreSnapshot`：从 Snapshot 恢复 Value 时只取 ID，不取展示名称。

## 9. 安全与权威性

- 前端 Snapshot 的 `displayValue` 不是权威身份信息；
- 后端提交时应重新校验人员/部门 ID 的有效性和权限；
- 审批、审计场景建议由后端生成或补全权威快照；
- Snapshot 中的敏感字段应按业务策略脱敏或加密。

## 10. 待确认问题

1. 人员/部门 ID 是否统一为字符串，还是允许数字 ID？
2. 多选是否允许重复选择同一实体？本协议默认去重。
3. 人员 Snapshot 是否需要头像、工号、邮箱？建议只存展示必需字段。
4. 部门 `path` 的组织层级深度是否有限制？
5. 字典 `value` 是否允许字符串与数字混用？本协议默认不允许。
6. 历史未知 ID 的降级文案由组件、业务还是国际化服务提供？
7. Snapshot 是否需要记录提交时 locale，以正确展示本地化名称？

## 11. 结论

**第 6 项结论：协议级验证通过。**

- Value 与 Snapshot 的职责边界可以用可执行规则表达；
- 空值、多选、未知实体、字典缺失等边界均有明确语义；
- 6 个协议用例全部通过；
- 进入组件实现前，需要业务方确认第 10 节问题。
