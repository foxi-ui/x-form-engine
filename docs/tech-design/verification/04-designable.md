# 04. Designable 物料、Setter 与 Schema 回写验证

> 对应第 19 节第 4 项：验证 Designable 物料、Setter 与 Schema 回写机制。

## 1. 验证目标

在锁定版本（`@designable/*@1.0.0-beta.45`）下验证：

1. 物料如何通过 `Behavior` / `Resource` 声明；
2. 注册中心如何匹配物料；
3. Designer Engine 如何管理节点树；
4. Formily Schema 与 Designable TreeNode 如何双向转换；
5. Setter 组件的挂载条件与受控协议。

## 2. 验证过程

### 2.1 安装与首次导入失败

按 `package.json` 安装后，直接在 Node 中导入 Designable 会失败：

```text
@designable/react/lib/theme.less:1
@import './variables.less';
^
SyntaxError: Invalid or unexpected token
```

原因：`@designable/react`、`@formily/antd` 的 CJS 产物直接 `require('./theme.less')`，Node 不认识 `.less`。

这不是版本安装错误，而是**构建链路约束**。验证环境采用：

- Vitest 中把 `@designable/react`、`@designable/formily-antd`、`@designable/formily-setters`、`@formily/antd` 指向 ESM 产物；
- 安装 `less@4.9.1`；
- `test.css = false`，避免在 jsdom 中做真实样式计算。

配置位于 `verification/vitest.config.ts`。

### 2.2 物料声明

Designable 的物料不是单独的 JSON 文件，而是挂在组件上：

```ts
Input.Behavior = createBehavior(
  {
    name: 'Input',
    extends: ['Field'],
    selector: (node) => node.props['x-component'] === 'Input',
    designerProps: {
      propsSchema: createFieldSchema(AllSchemas.Input),
    },
    designerLocales: AllLocales.Input,
  },
  // 同一组件可以有多个 Behavior
)

Input.Resource = createResource({
  icon: 'InputSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        type: 'string',
        title: 'Input',
        'x-decorator': 'FormItem',
        'x-component': 'Input',
      },
    },
  ],
})
```

验证点：

- `Behavior` 是数组；
- `Resource` 是数组；
- `Resource[0].node.isSourceNode === true`；
- `Resource[0].node.children[0]` 是物料拖入画布后的初始节点。

### 2.3 注册中心匹配

```ts
GlobalRegistry.registerDesignerBehaviors([Field, Input])
const node = new TreeNode({
  componentName: 'Field',
  props: { 'x-component': 'Input' },
})
const matched = GlobalRegistry.getDesignerBehaviors(node)
```

验证点：

- `Field` 与 `Input` 的 Behavior 都能匹配到；
- `registerDesignerBehaviors` 会按 `extends` 依赖排序；
- 缺少依赖 Behavior 时会抛错（实现中的 `No ${dep} behavior that ${name} depends on`）。

### 2.4 Designer Engine

```ts
const engine = createDesigner({ rootComponentName: 'Form' })
engine.workbench.ensureWorkspace({ id: 'verification-workspace' })
engine.setCurrentTree(tree)

const current = engine.getCurrentTree()
const child = current.children[0]
engine.findNodeById(child.id)
child.setProps({ title: '用户名' })
```

关键发现：

- `setCurrentTree(tree)` 的实现是：

```js
if (this.workbench.currentWorkspace) {
  this.workbench.currentWorkspace.operation.tree.from(tree)
}
```

**没有 workspace 时是空操作**。必须先用 `workbench.ensureWorkspace(...)` 或 `addWorkspace(...)` 创建 workspace。

### 2.5 Schema 双向回写

```ts
const tree = transformToTreeNode({ schema: originalSchema })
const back = transformToSchema(tree)
const treeAgain = transformToTreeNode(back)
```

验证点：

- `transformToTreeNode` 生成根节点 `Form`，每个属性生成 `Field` 子节点；
- `transformToSchema` 回写为 `{ type: 'object', properties: ... }`；
- 节点 ID 写入 `x-designable-id`；
- 回写时补充 `x-index` 用于排序；
- 二次往返复用已有 `x-designable-id`，不会生成新 ID。

### 2.6 Setter

`@designable/formily-setters` 导出：

| Setter | Props | 上下文要求 |
|---|---|---|
| `ValidatorSetter` | `{ value?, onChange? }` | 必须位于 Formily `Field` 上下文；内部 `useField()` 读取 `field.title` |
| `ReactionsSetter` | `{ value?, onChange? }` | 还依赖 Designable `usePrefix`、`TextWidget`，并引入 Monaco 编辑器 |
| `DataSourceSetter` | `{ value, onChange, allowTree?, ... }` | 依赖 Designable `usePrefix` / `useTheme` |

验证中发现：直接渲染 `ValidatorSetter` 会抛：

```text
TypeError: Cannot read properties of undefined (reading 'title')
```

原因是它在 `FormProvider` 之外没有字段上下文。放入 `<Field name="validator" title="校验规则">` 后正常挂载，并渲染出 antd Select。

另一个发现：这些 Setter 经过 `observer()` 包装，运行时 `typeof` 是 `object`，不是 `function`，不要用 `typeof === 'function'` 做导出校验。

## 3. 验证结果

```text
✓ 物料通过 Behavior / Resource 声明并可被注册中心匹配
✓ createBehavior / createResource 可独立扩展自定义物料
✓ Designer Engine 可管理节点树、选中节点与属性更新
✓ Formily Schema 与 Designable TreeNode 可双向回写并保持节点 ID
✓ Setter 组件对外暴露受控 value/onChange 协议
```

5 个用例全部通过。原始输出：`appendix/test-run.txt`。

## 4. 对 Designer Adapter 的设计含义

### 4.1 适配层职责

建议 Adapter 做三件事：

```text
引擎 ComponentBinding（protocol + implementations）
  ├─ 运行时实现（PC / Mobile / Readonly）
  ├─ Schema 属性定义
  └─ Designer 物料描述
        ├─ 生成 Designable Behavior（selector + propsSchema + locales）
        └─ 生成 Designable Resource（拖入画布的初始节点）
```

引擎的公共类型不应直接引用 Designable 类型；Adapter 在 `packages/designer` 内完成转换。

### 4.2 节点 ID 不是业务数据

`x-designable-id` 是设计器内部节点标识，不应参与业务 Value 或 Snapshot 语义。建议：

- 设计器保存 Schema 时保留该字段；
- 渲染器编译时忽略；
- 迁移时不要把它当作稳定业务键。

### 4.3 设计器必须隔离

- Designable 依赖 React 17 + antd 4，且长期未更新；
- CJS 产物直接依赖 less；
- Setter 依赖 Designable Context 和 Monaco。

因此设计器应作为独立应用或懒加载模块，不能进入运行时 Renderer 的主包。运行时只消费最终 Schema。

### 4.4 Engine 初始化顺序

设计器启动时必须：

```text
createDesigner
  → workbench.ensureWorkspace
  → registerDesignerBehaviors / registerDesignerLocales
  → setCurrentTree
  → 渲染 Designer UI
```

否则 `setCurrentTree` 静默失效，表现为画布空白，且没有明显错误。

## 5. 风险与未覆盖项

| 风险 | 说明 |
|---|---|
| Designable 维护停滞 | 最后发布 2022-02-28，无 React 18/antd 5 支持 |
| 构建链路复杂 | CJS/ESM 混用、less、Monaco，需要专门的设计器构建配置 |
| Setter 上下文耦合 | Setter 不是独立组件，依赖 Formily Field 与 Designable Context |
| 未做真实拖拽 E2E | 本次只验证引擎、物料、回写和 Setter 挂载，未在真实浏览器中执行拖拽/缩放/撤销 |
| 未验证完整 Designer UI | 未渲染 `Designer` / `Workbench` / `Viewport` 全量界面 |

## 6. 结论

**第 4 项结论：核心机制通过，完整设计器 UI 未做 E2E。**

- 物料 = `Behavior` + `Resource` 的模型可落地；
- 注册中心、节点树、Schema 双向回写均可运行；
- Setter 可用，但必须满足上下文条件；
- 设计器必须隔离构建和升级，不能与运行时 Renderer 混在同一依赖域。
