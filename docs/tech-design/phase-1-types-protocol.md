# Phase 1 公共协议与依赖边界 — 重新核验报告

> 依据：`docs/architecture/02-form-engine-v2-task.md` Phase 1（Task 1.1–1.7）
> 分支：`feat/form-engine-v2`
> 重新核验日期：2026-11-13（不沿用 2026-11-12 结论，逐条重审）
> 结论：Phase 1 验收达成 —— 无重复类型、无 Designable / Runtime 内部类型泄漏、`packages/types` 保持 UI / Formily / Designable 无关。**类型已存在且与任务书 1.1–1.7 一致，本轮无偏差需要 TDD 修正**；重新核验确认后重写本报告。

---

## 1. 交付物清单（当前仓库实际状态）

| 文件 | 状态 | 内容 |
|---|---|---|
| `packages/types/src/schema.ts` | 已存在 | `DesignerMetadata` + `FormSchemaDocument.designerMetadata?`（C1 兼容扩展） |
| `packages/types/src/plugin.ts` | 已存在 | Generic Plugin Core 通用类型（`PluginDefinition`/`PluginRegistry`/`DependencyEdge` + `PluginStatus`/`PluginInstallOptions`/`PluginDependencyError`/`PluginLifecycleEvent`，C9） |
| `packages/types/src/designer.ts` | 已存在 | Designer 公共协议（Material/Setter/Diagnostic/Registry/Event/SchemaEditor/Plugin/Engine/Adapter） |
| `packages/types/src/index.ts` | 已存在 | 导出 `./plugin`、`./designer` |
| `packages/types/src/__tests__/designer-types.test.ts` | 已存在 | 15 条类型级断言（`expectTypeOf` + `@ts-expect-error`） |
| `packages/types/src/__tests__/no-react-deps.test.ts` | 已存在 | 依赖边界守卫（package.json 检查 + 源码扫描 + `plugin.ts` 零 import） |
| 本文档 | 重写 | Phase 1 重新核验报告 |

未新建任何 Package（C8：先逻辑分层，Phase 1 不立包）。

---

## 2. 各 Task 核验结论

### Task 1.1 — 核对 FormSchemaDocument（C1）✅ 核验通过

- `schema.ts:19-30` 的 `FormSchemaDocument`：`schemaId`/`version`/`engineSchemaVersion`/`formilyVersion?`/`schema: Record<string, unknown>`/`designerMetadata?`/`createdAt?`/`updatedAt?`。
- **无同义重复定义**；`designerMetadata?` 为兼容扩展；`schema` 未收窄为 `ISchema`。
- 测试 `designer-types.test.ts:46-52` 断言 `schema` 与 `designerMetadata` 类型，`no-react-deps.test.ts` 守卫 types 无 Formily import。

### Task 1.2 — Designer Material 类型与 MaterialRuntimeTarget（C1/C4/C10）✅ 核验通过

- `designer.ts` 已定义 `DesignerMaterialDefinition`、`MaterialCapabilities`、`MaterialCreateContext`、`DesignerComponentProps`、`MaterialRuntimeTarget`（三态：`component`/`schema-container`/`designer-only`）。
- 与 `ComponentBinding` 分离、不要求派生（C4）；`runtimeTarget?` 可选（注册校验补全，缺失产生诊断，C10）。
- `designable.behavior/resource` 为 `unknown`，仅 Adapter 消费（测试 `designer-types.test.ts:70-74`）。

### Task 1.3 — Setter 类型 ✅ 核验通过

- 已定义 `SetterProps<T>`、`SetterDefinition`、`SetterBinding`、`SetterContext`、`ValidationResult`、`SetterRegistryOptions`、`SetterResolveResult`。
- `SetterResolveResult.diagnostics` 保证未注册/校验失败可诊断（C5）；Setter 不依赖 Designable。

### Task 1.4 — Schema Diagnostic 类型（C5/C10）✅ 核验通过

- 已定义 `SchemaDiagnostic`、`SchemaDiagnosticSeverity`（`error`/`warning`/`info`）。
- 可定位 `materialName`/`schemaPath`/`componentName`/`platform`/`setterName` + `code`/`severity`/`message`，覆盖任务书要求的全部定位项。

### Task 1.5 — Designer Plugin 类型与 Generic Plugin Core 通用类型（C9）✅ 核验通过

- 已定义 `DesignerPlugin`、`DesignerPluginContext`；通用类型在 `plugin.ts`（`PluginDefinition`/`PluginRegistry`/`DependencyEdge` + 生命周期类型）。
- 与 `FormEnginePlugin`/`DesignerPlugin` 解耦；两者结构上均满足 `PluginDefinition`（测试 `designer-types.test.ts:116-125` 用 `toMatchTypeOf` 断言）。
- `DesignerPluginContext` 不暴露 Designable 内部实例（`@ts-expect-error ctx.treeNode`，`designer-types.test.ts:146-153`）。

### Task 1.6 — SchemaEditor 协议边界（C11）✅ 核验通过

- 已定义 `SchemaEditor`、`SchemaNode`、`DesignerEvent`。
- `SchemaEditor` 只操作 `FormSchemaDocument`，不公开 `TreeNode`（`@ts-expect-error editor.treeNode`）；画布事件映射为与画布无关的 `DesignerEvent`。

### Task 1.7 — Package 依赖方向确认（C8/C13）✅ 核验通过

- `types ──► nothing`；其余包 `──► types`，方向无环。
- `designer-core` 允许 React（peer）+ Types/Protocol + Generic Plugin Core；禁止 Designable/antd/antd-mobile/Runtime Renderer/FormEngine（C13，Phase 4 落地）。
- `packages/types` 保持 UI/Formily/Designable 无关（`no-react-deps.test.ts` 守卫）。

---

## 3. 关键裁定（与任务书字面接口的差异及理由）

任务书 Task 1.2/1.3 的接口片段出现 `React.ReactNode`、`React.ComponentType`、Formily `ISchema`，与 `packages/types` 的硬约束（AGENTS.md 约束 #7：types 必须 UI/Formily/Designable 无关）冲突。落实方式（维持既有实现，核验确认）：

1. **UI 字段一律 `unknown`**：`icon`/`designerComponent`/setter `component`/panel & toolbar `component` 用 `unknown` 占位，JSDoc 标注具体类型，React 类型由 `designer-core`（C13 允许 React peer）提供。
2. **`ISchema` → `Record<string, unknown>`**：`createSchema` 返回值、`SetterProps.schema`、`DesignerWorkspace.setSchema/getSchema` 用 `Record<string, unknown>`，避免 types 耦合 Formily（C1）。
3. **Adapter 类型为 Phase 5 草案**：`DesignerAdapter`/`DesignerAdapterContext`/`DesignerWorkspace` 为满足 `DesignerEnginePublicAPI.use(adapter)` 的类型闭包而前置声明，标注草案，不作 Phase 5 最终实现。
4. **`MaterialRegistry.getDiagnostics()`**：为满足 Task 4.1 测试 #9（注册无 PC 实现物料产生诊断）的读取需求而补充（设计文档 §5.4 接口未列）。

---

## 4. 验证结果（本轮重新核验实测）

```text
pnpm --filter @x-form-engine/types typecheck   → 通过（tsc --noEmit 无输出）
pnpm --filter @x-form-engine/types exec vitest run → 通过（6 文件 / 30 用例，含 designer-types 15 + no-react-deps 5）
pnpm -r typecheck                               → 12 项目全部 Done（0 错误）
pnpm test:run                                   → 53 文件 / 248 用例全绿
```

类型级断言覆盖：C1（`schema` 不收窄）、C4（Material 一等公民）、C9（Plugin 解耦）、C10（`MaterialRuntimeTarget` 三态）、C11（`SchemaEditor` 不暴露 `TreeNode`）、C13（types 无 UI/Designable 泄漏）。

---

## 5. 遗留与下一阶段

### 5.1 明确遗留（非 Phase 1 范围，Phase 5 必须补）

- **`designerMetadata` 会被现有解析链路静默丢弃**：`core/src/schema/parser.ts:31-46` 只重建已知信封字段，不复制 `designerMetadata`；`designer/src/schema-io.ts` 导入导出不携带 `designerMetadata`。C1 目前是**类型层**闭环，端到端往返尚未成立。Phase 5 必须补带 `designerMetadata` 的导入→导出往返契约测试，且不得静默丢弃未知字段。

### 5.2 延后项（Phase 4 起逐步落地）

- `DesignerPluginHost.list()` 返回值用 `status: PluginStatus` 而非 `active: boolean`（Phase 4）。
- `DesignerRegistry` 对齐现有 `Registry<T>` 的 `source`/provenance 语义；`SetterRegistryOptions.onDuplicate: 'override'` 需明确 provenance（AGENTS #3）。
- `SchemaEditor` 补 `getNode(path)` 或暂不导出 `SchemaNode`（Phase 4）。
- `componentName` 与 `runtimeTarget.componentName` 一致性不变量需 Phase 7 Material Contract Test 覆盖。
- `SetterRegistryOptions` 尚无消费方，Phase 4 明确 `createSetterRegistry(options)` 还是 `register(def, options)`。
- Adapter 草案进入公共面，建议加 `@alpha`/`@experimental` 标记 + Phase 5 对账 Task 5.1。

### 5.3 下一步

**Phase 2（Generic Plugin Core）与 Phase 3（Runtime Plugin Host 迁移）已在之前完成**（`core/src/plugin/generic/*` + `plugin-manager.ts` 迁移，测试 `plugin-host.test.ts` 23 / `plugin.test.ts` 13 / `no-business-deps.test.ts` 2 / `dependency-resolver.test.ts` 4 全绿）。下一步进入 **Phase 4（Designer Core）**：基于 `packages/types` 的 `designer.ts`/`plugin.ts` 协议与 `core` 的 Generic Plugin Core，实现 MaterialRegistry/SetterRegistry/Panel/Command/Toolbar Registry、Designer Plugin Host、SchemaEditor、DesignerEngine，并通过 C13 依赖检查。
