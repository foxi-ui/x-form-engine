# Phase 1 公共协议与依赖边界 — 完成报告

> 依据：`docs/architecture/02-form-engine-v2-task.md` Phase 1（Task 1.1–1.7）
> 分支：`feat/form-engine-v2`
> 完成日期：2026-11-12
> 结论：Phase 1 验收达成 —— 无重复类型、无 Designable / Runtime 内部类型泄漏、`packages/types` 保持 UI / Formily / Designable 无关。

---

## 1. 交付物清单

| 文件 | 动作 | 内容 |
|---|---|---|
| `packages/types/src/schema.ts` | 修改 | 新增 `DesignerMetadata`；`FormSchemaDocument` 新增 `designerMetadata?`（C1 兼容扩展） |
| `packages/types/src/plugin.ts` | 新增 | Generic Plugin Core 最小通用类型（`PluginDefinition` / `PluginRegistry` / `DependencyEdge`，C9） |
| `packages/types/src/designer.ts` | 新增 | Designer 公共协议（Material / Setter / Plugin / SchemaEditor / Diagnostic / Registry / Event / Engine / Adapter） |
| `packages/types/src/index.ts` | 修改 | 导出 `./plugin`、`./designer` |
| `packages/types/src/__tests__/designer-types.test.ts` | 新增 | 14 条类型级断言（`expectTypeOf` + `@ts-expect-error`） |
| 本文档 | 新增 | Phase 1 报告 |

未新建任何 Package（C8：先逻辑分层，Phase 1 不立包）。

---

## 2. 各 Task 完成情况

### Task 1.1 — 核对 FormSchemaDocument（C1）✅

- 读取 `packages/types/src/schema.ts` 现有 `FormSchemaDocument`：`schemaId` / `version` / `engineSchemaVersion` / `formilyVersion?` / `schema: Record<string, unknown>` / `createdAt?` / `updatedAt?`。
- **未重定义**同义类型；仅在现有类型上新增 `designerMetadata?: DesignerMetadata`。
- `schema` 保持 `Record<string, unknown>`，未收窄为 `ISchema`。
- 区分 Runtime Schema（`schema`）/ Designer Metadata（`designerMetadata`）/ Designer UI State（默认不持久化）。

### Task 1.2 — Designer Material 类型与 MaterialRuntimeTarget（C1/C4/C10）✅

- 新增 `DesignerMaterialDefinition`、`MaterialCapabilities`、`MaterialCreateContext`、`DesignerComponentProps`、`MaterialRuntimeTarget`（三态：`component` / `schema-container` / `designer-only`）。
- `DesignerMaterialDefinition` 是一等公民，与 `ComponentBinding` 分离，不要求派生（C4）。
- 每个普通 Material 可声明 `runtimeTarget?`（C10，注册校验时补全，缺失产生诊断）。
- Designable 专属字段 `designable.behavior/resource` 为 `unknown`，仅 Adapter 消费。

### Task 1.3 — Setter 类型 ✅

- 新增 `SetterProps<T>`（泛型值）、`SetterDefinition`、`SetterBinding`、`SetterContext`、`ValidationResult`、`SetterRegistryOptions`、`SetterResolveResult`。
- `SetterResolveResult.diagnostics` 保证未注册 / 校验失败的 Setter 可诊断，不静默丢弃（C5）。
- Setter 不依赖 Designable API。

### Task 1.4 — Schema Diagnostic 类型（C5/C10）✅

- 新增 `SchemaDiagnostic`、`SchemaDiagnosticSeverity`（`error` / `warning` / `info`）。
- 可定位 Material 名称、Schema 路径、Runtime Component 名称、缺失平台、缺失 Setter、错误码、严重级别、具体原因。
- 被 Material 注册 / Schema 导出 / Runtime 解析三处复用。

### Task 1.5 — Designer Plugin 类型与 Generic Plugin Core 最小类型（C9）✅

- 新增 `DesignerPlugin`、`DesignerPluginContext`、`PluginInstallOptions`、`PluginStatus`、`PluginLifecycleEvent`、`PluginDependencyError`。
- Generic Plugin Core 最小类型：`PluginDefinition` / `PluginRegistry` / `DependencyEdge`（`plugin.ts`），与 `FormEnginePlugin`、`DesignerPlugin` 解耦；两者在结构上都满足 `PluginDefinition`（测试 `toMatchTypeOf` 断言）。
- `DesignerPluginContext` 不暴露 Designable 内部实例（测试 `@ts-expect-error ctx.treeNode` 断言）。

### Task 1.6 — SchemaEditor 协议边界（C11）✅

- 新增 `SchemaEditor`、`SchemaNode`、`DesignerEvent`。
- `SchemaEditor` 只操作 `FormSchemaDocument`，不公开 Designable `TreeNode`（测试 `@ts-expect-error editor.treeNode` 断言）。
- 画布事件映射为与底层画布无关的 `DesignerEvent`（`node:select` / `node:add` / `node:remove` / `node:move` / `node:update` / `schema:change`）。

### Task 1.7 — Package 依赖方向确认（C8/C13）✅

依赖方向（Phase 1 仅动 `types`，方向不变，无循环）：

```text
types ──► nothing
core / formily / renderer / components / services / adapters / sdk / designer ──► types

（后续）designer-core ──► types + React(peer) + Generic Plugin Core
（后续）designer-designable ──► designer-core + designable
```

确认项：

- `designer-core` 允许依赖 React（peer）、Types/Protocol、Generic Plugin Core；禁止 Designable / antd / antd-mobile / Runtime Renderer / FormEngine / 业务组件 / 具体画布实现。
- `packages/types` 保持 UI / Formily / Designable 无关（`no-react-deps.test.ts` 静态守卫持续通过）。
- Phase 1 不立包（C8）。

---

## 3. 关键裁定（与任务书/设计文档的差异）

> 任务书 Task 1.2/1.3 与设计文档 §5.2/§5.5 的接口片段使用 `React.ReactNode`、`React.ComponentType` 与 Formily `ISchema`。这些与 `packages/types` 的硬约束冲突，故按以下方式落实：

1. **`types` 保持 UI/Formily 无关**：UI 字段 `icon` / `designerComponent` / setter `component` / panel & toolbar `component` 在 `packages/types` 中一律为 `unknown`（沿用现有 `ComponentImplementations<Impl = unknown>` 约定），JSDoc 标注具体类型为 `React.ReactNode` / `React.ComponentType`。具体 React 类型由 Phase 4 的 `designer-core`（C13 允许 React peer）提供。
   - 依据：CLAUDE.md 约束 #7（`types` 不得有 React/Formily/Designable/UI 依赖）、`no-react-deps.test.ts` 静态守卫、设计文档 §9.2「避免 `types` 包耦合 Formily」。
2. **`ISchema` → `Record<string, unknown>`**：`createSchema` 返回值、`SetterProps.schema`、`DesignerWorkspace.setSchema/getSchema` 一律使用 `Record<string, unknown>`，避免 `types` 耦合 Formily（C1）。
3. **Adapter 类型为 Phase 5 草案**：`DesignerAdapter` / `DesignerAdapterContext` / `DesignerWorkspace` 为满足 `DesignerEnginePublicAPI.use(adapter)` 与 `DesignerPluginContext.engine` 的类型闭包而前置声明，标注「Phase 5 草案，需结合现有 Designer 生命周期调整」，不视为 Phase 5 的最终实现。

---

## 4. 验证结果

```text
pnpm --filter @x-form-engine/types typecheck   → 通过（tsc --noEmit 无输出）
pnpm --filter @x-form-engine/types exec vitest run → 6 文件 / 26 用例全绿
pnpm -r typecheck                               → 12 包 + 3 app 全部 Done
pnpm test:run                                   → 50 文件 / 215 用例全绿
```

类型级断言覆盖：C1（`schema` 不收窄）、C4（Material 一等公民）、C9（Plugin 解耦）、C10（`MaterialRuntimeTarget` 三态）、C11（`SchemaEditor` 不暴露 `TreeNode`）、C13（`types` 无 UI/Designable 泄漏）。

---

## 5. 遗留与下一阶段

- **未完成**：Generic Plugin Core 抽取实现（Phase 2）、Designer Core 实现（Phase 4）、Designable Adapter（Phase 5）。
- **待 Phase 4/5 收窄**：`designer-core` 落地时提供 React 类型的 `DesignerMaterialDefinition` / `SetterDefinition` 收窄（`icon`/`component` 具体化）；Adapter 草案随现有 `packages/designer` 生命周期调整。
- **下一阶段**：Phase 2（Generic Plugin Core 独立前置任务，基于 `packages/core/src/plugin/{dependency-resolver,plugin-manager}.ts` 抽取）。
