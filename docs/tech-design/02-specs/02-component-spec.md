# 02. 组件定义、Adapter 与组件开发规范

> 状态：implemented ｜ 落地对照：`packages/types/component.ts`、`packages/components` ｜ 最后更新：2026-11-08

## 1. 目标

建立统一组件契约，使同一个业务组件可以被设计器、PC 编辑器、移动端编辑器和只读渲染器识别，并共享一致的 Value 与 Snapshot 语义。

## 2. 组件分层

一个组件由四部分组成：

1. **Definition**：组件名称、版本、能力、属性 Schema 和平台实现索引。
2. **Implementation**：具体平台的 React 组件。
3. **Adapter**：Value 标准化、序列化、快照生成和恢复。
4. **Designer Material**：设计器物料、默认 Schema 和 Setter。

不要求所有组件都必须同时提供全部平台实现，但必须声明能力并定义缺失时的处理策略。

## 3. 建议接口

```ts
export interface ComponentImplementations {
  pc?: React.ComponentType<unknown>;
  mobile?: React.ComponentType<unknown>;
}

export interface ReadonlyImplementations {
  pc?: React.ComponentType<unknown>;
  mobile?: React.ComponentType<unknown>;
  default?: React.ComponentType<unknown>;
}

export interface ComponentBinding {
  protocol: ComponentProtocolDefinition;
  implementations: ComponentImplementations;
  /** 只读实现按 当前平台 → default → Formatter → Unknown 兜底解析 */
  readonly?: ReadonlyImplementations;
}

export interface AdapterContext {
  schema: Record<string, unknown>;
  path: string;
  locale: string;
  // 编辑期缓存的展示信息（JSON-safe），供 createSnapshot 读取
  displayState?: Record<string, unknown>;
  // 记录可恢复的规范化告警（不阻断提交）
  warn?(code: string, message: string): void;
  // 记录不可恢复的规范化错误（阻断提交）
  error?(code: string, message: string): void;
}

export interface ComponentAdapter<Value = unknown, Snapshot = unknown> {
  normalizeValue?(
    value: unknown,
    context: AdapterContext
  ): Value;

  serializeValue?(
    value: Value,
    context: AdapterContext
  ): unknown;

  createSnapshot?(
    value: Value,
    context: AdapterContext
  ): Snapshot;

  restoreSnapshot?(
    snapshot: Snapshot,
    context: AdapterContext
  ): Value;
}
```

`types` 只放 `ComponentProtocolDefinition`（纯协议，无 React）；React 实现通过 `ComponentBinding` 在组件实现层绑定，实现层可建立独立 React 类型入口，避免纯协议包被迫依赖 React。

## 4. UserSelect 示例

### 4.1 Value 规范

单选：

```json
"u_10001"
```

多选：

```json
["u_10001", "u_10002"]
```

建议业务 Value 只保存稳定 ID；展示名称、部门等放入 Snapshot 或由业务查询接口按需获取。

### 4.2 Schema 示例

```json
{
  "type": "string",
  "title": "申请人",
  "x-component": "UserSelect",
  "x-component-props": {
    "multiple": false,
    "placeholder": "请选择人员"
  },
  "x-engine": {
    "datasource": {
      "service": "organization.users",
      "labelField": "name",
      "valueField": "id"
    },
    "snapshot": {
      "strategy": "component"
    }
  }
}
```

多选时字段类型应与组件 Value 结构一致，例如数组。不要只依赖 `multiple` 属性推断数据类型。

### 4.3 Definition 示例

```ts
export const UserSelectBinding: ComponentBinding = {
  protocol: {
    name: 'UserSelect',
    version: '1.0.0',
    meta: {
      title: '人员选择',
      category: 'organization',
    },
    capabilities: {
      editable: true,
      readonly: true,
      mobile: true,
      datasource: true,
      validation: true,
      snapshot: true,
    },
    schema: {
      type: 'object',
      properties: {
        multiple: { type: 'boolean', default: false },
        placeholder: { type: 'string' },
      },
    },
    adapter: UserSelectAdapter,
  },
  implementations: {
    pc: UserSelectPC,
    mobile: UserSelectMobile,
  },
  readonly: {
    pc: UserSelectReadonly,
  },
};
```

上例为示意代码。若公共 types 包不依赖 React，应将实现映射拆至 React 专用定义类型。

## 5. 组件实现规范

### 编辑态组件

- 遵循 Formily 字段组件约定，正确处理 `value`、`onChange`、`disabled`、`readOnly`。
- 声明 `snapshot` 能力的组件应在编辑期把展示信息（如 `{ id, name, dept }`）缓存进字段状态（`displayState`），供 `createSnapshot` 读取。
- 不自行创建第二份业务表单状态。
- 不直接依赖全局单例 Engine。
- 远程请求通过注入的数据源服务执行。
- 支持请求取消、加载态、空态和错误态。
- 避免在 render 阶段发起副作用。

### 移动端组件

- 与 PC 保持相同业务 Value 协议。
- 交互可针对触屏优化，但不能改变提交值语义。
- 处理软键盘、弹层高度、滚动容器和安全区域。
- 对复杂选择器优先采用移动端友好的弹层或全屏选择页。

### 只读组件

- 输入稳定 Value 和 Snapshot 展示信息。
- 不发起编辑态搜索请求。
- 不执行字段联动或修改 Value。
- 无 Snapshot 时允许按明确策略降级展示，不得静默显示错误 ID。

## 6. Adapter 规则

- `normalizeValue`：兼容历史或外部输入，转为组件内部标准值。
- `serializeValue`：输出后端业务值。
- `createSnapshot`：从编辑期缓存（`context.displayState`）读取展示信息生成历史展示，不发起新请求。
- `restoreSnapshot`：从快照恢复展示或组件所需值。

Adapter 应尽量纯函数化，避免网络请求和隐式全局状态。需要补充信息时，应由 Snapshot Service 或数据源层在明确的提交流程中完成。

## 7. 组件版本与弃用

- 组件名称一经发布不随意更改。
- 破坏性 Value 变更必须升级组件协议版本，并提供迁移器。
- 删除组件前先标记 deprecated，保留旧 Schema 的只读兼容能力。
- 组件实现版本与 Schema 版本分开管理。

## 8. 组件验收清单

- [ ] Definition 可注册并通过 Schema 校验。
- [ ] PC 编辑态可正常输入和校验。
- [ ] 移动端与 PC 输出 Value 一致。
- [ ] 只读组件可独立展示。
- [ ] Adapter 的序列化和快照测试通过。
- [ ] 远程数据源支持分页、取消和错误处理。
- [ ] 无障碍属性和键盘操作符合组件要求。
- [ ] 旧版本 Schema 有明确兼容策略。
