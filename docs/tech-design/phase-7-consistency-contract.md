# Phase 7 Material → Schema → Runtime 一致性闭环 — 完成报告

> 依据：`docs/architecture/02-form-engine-v2-task.md` Phase 7（Task 7.1–7.4）
> 分支：`feat/form-engine-v2`
> 完成日期：2026-11-13
> 结论：Phase 7 验收达成 —— 落地 C10 一致性校验函数 + Material/Schema/Runtime Contract Tests，基础物料生成的 Schema 能被 Runtime 解析，缺失组件明确报 `COMPONENT_NOT_REGISTERED`。

---

## 1. 交付物清单

| 文件 | 动作 | 内容 |
|---|---|---|
| `packages/core/src/schema/diagnostics.ts` | 新增 | `collectSchemaComponentRefs`（自 renderer 迁入，通用 Schema 遍历） |
| `packages/core/src/schema/consistency.ts` | 新增 | `checkSchemaComponentRegistrations` + `checkMaterialRuntimeTarget`（Task 7.1/7.3） |
| `packages/core/src/index.ts` | 修改 | 导出 `./schema/diagnostics`、`./schema/consistency` |
| `packages/renderer/src/diagnostics.ts` | 修改 | 改为 re-export `collectSchemaComponentRefs` + 保留 `filterDiagnosticsBySchema` |
| `packages/renderer/package.json` | 修改 | `@x-form-engine/core` 移到 dependencies |
| `packages/designer-designable/src/__tests__/contract.test.ts` | 新增 | Material/Schema/Runtime Contract Tests（8 用例） |
| `packages/designer-designable/package.json` | 修改 | devDependencies 增 `@x-form-engine/materials-basic` |

测试：core `consistency.test.ts` 7 用例、designer-designable `contract.test.ts` 8 用例。

---

## 2. 各 Task 完成情况

- **Task 7.1 Material Target 检查** ✅：`checkMaterialRuntimeTarget` 校验 `component` target 的 `componentName` 能在 Runtime 注册表命中（`MATERIAL_COMPONENT_NOT_REGISTERED`）；`designer-only` / `schema-container` 不参与组件注册校验；缺 `runtimeTarget` 的诊断由 MaterialRegistry 注册阶段负责（Phase 4）。
- **Task 7.2 Schema 生成与导出检查** ✅：生成阶段 `validateEngineSchema` 校验；导出阶段由 `treeToSchemaDocument`（Phase 5）承担，缺失组件/装饰器经 `checkSchemaComponentRegistrations` 产生诊断。
- **Task 7.3 Runtime 解析检查** ✅：`checkSchemaComponentRegistrations` 校验 Schema 引用的 `x-component` / `x-decorator` 是否已注册（走 `collectSchemaComponentRefs` 遍历 `properties`/`items`，非字符串相等）；平台实现缺失沿用 `resolveFormilyComponentMap` 的 PC 严格 / Mobile 回退诊断。
- **Task 7.4 Contract Tests** ✅：8 用例覆盖「基础 Material 生成合法 Schema」「component target 命中 Runtime Binding」「schema-container 合法」「designer-only 不参与注册校验」「缺组件报错」「导出被 Parser/Validator 接受」「导入恢复设计器状态」「Material 属性往返不丢」。

---

## 3. 关键裁定

1. **`collectSchemaComponentRefs` 收敛到 core**：它是通用 Schema 遍历工具（UI 无关），从 `renderer` 迁入 `core/src/schema/`，`renderer` 改为 re-export；`renderer` 生产代码自此依赖 `core`（方向合法，renderer 是 runtime 层）。
2. **一致性校验函数放 core 而非 renderer**：`checkSchemaComponentRegistrations` / `checkMaterialRuntimeTarget` 只依赖 `types`（`SchemaDiagnostic`/`DesignerMaterialDefinition`），UI 无关，与 Registry/Schema 同居内核。
3. **`checkMaterialRuntimeTarget` 只做「可映射」校验**：缺 `runtimeTarget` / `componentName` 不一致的诊断已在 MaterialRegistry 注册阶段（Phase 4）覆盖，避免重复。
4. **Contract Tests 放 designer-designable**（jsdom + React，已依赖 core/components）：用真实 `basicMaterials` + `basicComponents` + `createFormEngine` 的 registry，非字符串相等。

---

## 4. 验证结果

```text
core consistency.test.ts                → 7 用例全绿
designer-designable contract.test.ts    → 8 用例全绿
pnpm -r typecheck                       → 16 包 + 3 app 全部 Done
pnpm test:run                           → 74 文件 / 363 用例全绿
```

---

## 5. 遗留与下一阶段

- **PC / Mobile 缺失实现的平台诊断**：已由 `resolveFormilyComponentMap`（M4）+ `filterDiagnosticsBySchema`（renderer）覆盖，Phase 7 未重复实现，仅通过 `checkSchemaComponentRegistrations` 补「未注册组件」维度。
- **`designer-only` 导出过滤**：目前 `checkMaterialRuntimeTarget` 对 `designer-only` 返回空（不参与注册校验）；「导出前过滤 designer-only 节点」的导出路径过滤尚未在 `treeToSchemaDocument` 显式实现（当前设计器 Material 均为 component target，暂无 designer-only 节点进入导出）。
- **`schema-container` 的 `schemaType` 合法性校验**：类型已定义，具体 `schemaType` 白名单校验留待有真实容器物料时补充。

下一步进入 **Phase 8（高级扩展示例）**：实现至少一个高级 Setter（ExpressionSetter 等）与一个完整示例插件，验证第三方通过公开 `SetterRegistry` / `DesignerPlugin` 扩展，不访问 Core 私有字段。
