# Phase 5 Designable Adapter — 完成报告

> 依据：`docs/architecture/02-form-engine-v2-task.md` Phase 5（Task 5.1–5.6）
> 分支：`feat/form-engine-v2`
> 完成日期：2026-11-13
> 结论：Phase 5 验收达成 —— 新增独立 `@x-form-engine/designer-designable` 包，把 Designable 隔离为 Adapter；Designer Core 不感知 Designable 类型，Schema ↔ TreeNode 双向转换 + `designerMetadata` 往返 + 画布事件映射 + `DesignerAdapter` 全部落地。

---

## 1. 交付物清单

| 文件 | 动作 | 内容 |
|---|---|---|
| `packages/designer-designable/package.json` | 新增 | 依赖 designer-core + core + components + types + Designable 全家 + antd |
| `packages/designer-designable/src/derive-materials.ts` | 新增 | `deriveDesignerMaterials(bindings)`：框架无关派生 + 缺 pc 诊断（Task 5.6） |
| `packages/designer-designable/src/material-adapter.ts` | 新增 | `createDesignableMaterialAdapter`：`DesignerMaterialDefinition → Designable Behavior/Resource`（Task 5.2） |
| `packages/designer-designable/src/setter-adapter.ts` | 新增 | `createDesignableSetterAdapter`：`SetterDefinition → React 组件 map` + resolve 诊断（Task 5.3） |
| `packages/designer-designable/src/schema-adapter.ts` | 新增 | `treeToSchemaDocument`/`schemaDocumentToTree` + `designerMetadata` 保留（Task 5.4） |
| `packages/designer-designable/src/events.ts` | 新增 | `mapCanvasEventToDesignerEvent`：画布事件 → DesignerEvent，不泄漏 TreeNode（Task 5.5） |
| `packages/designer-designable/src/adapter.ts` | 新增 | `createDesignableAdapter`：`DesignerAdapter` + workspace 生命周期（Task 5.1） |
| `packages/designer-designable/src/index.ts` | 新增 | 公开入口 |
| `packages/designer-designable/src/__tests__/no-renderer-internals.test.ts` | 新增 | 依赖守卫（不依赖 Runtime Renderer/Formily Adapter，不深依赖内部路径） |
| `packages/core/src/schema/parser.ts` | 修改 | `parseSchemaDocument` 保留 `designerMetadata`（C1 端到端修复） |
| `packages/designer/src/schema-io.ts` | 修改 | 委托到 `designer-designable` 的 Schema Adapter（兼容 Facade） |
| `packages/designer/package.json` | 修改 | 新增 `@x-form-engine/designer-designable` 依赖 |

测试：designer-designable 7 文件 / 30 用例；core schema 补 1 用例。

---

## 2. 各 Task 完成情况

- **Task 5.1 Adapter 接口** ✅：`createDesignableAdapter` 实现 `DesignerAdapter`；`createWorkspace` 返回带 `mount/unmount/setSchema/getSchema/subscribe` 的 workspace。
- **Task 5.2 Material 转换** ✅：`DesignerMaterialDefinition → Designable Behavior/Resource`；普通/容器（`capabilities.container` → droppable）/纯设计器物料均可转换；`createSchema` 保留 Formily 原生 + `x-engine` 扩展（测试验证）。
- **Task 5.3 Setter 转换** ✅：复用 `designer-core` 的 `SetterRegistry`，输出 Designable SettingsForm 组件 map + `resolve`（未注册诊断）。
- **Task 5.4 Schema 双向转换** ✅：`treeToSchemaDocument`/`schemaDocumentToTree`；往返保留 Formily 原生字段、`x-component-props`、默认值、`x-engine`、`designerMetadata`。
- **Task 5.5 TreeNode ↔ Schema 映射** ✅：Schema Adapter 负责双向映射；`mapCanvasEventToDesignerEvent` 只输出标量，不泄漏 TreeNode。
- **Task 5.6 materials.ts 迁移** ✅：`deriveDesignerMaterials` 产出框架无关 `DesignerMaterialDefinition[]`，缺 `implementations.pc` 显式诊断、同名冲突诊断（不再静默跳过）；`packages/designer` 的 schema-io 已委托到 Adapter。

---

## 3. 关键裁定

1. **「先逻辑分层」落地为「新增 Adapter 包 + 旧包委托」**：`packages/designer` 的 `schema-io` 委托到 `designer-designable`（消除复制代码）；`createDesignerMaterials`（ComponentBinding → Designable）暂留在 `packages/designer` 作为 M2 兼容路径，Phase 9 统一切换。
2. **`deriveDesignerMaterials` 产出最小物料**（`createSchema`/`designerComponent`/`runtimeTarget`，不含组件专属 Setter）；propsSchema 字段级默认面板由 Material Adapter 生成，组件专属 Setter 由 Phase 6 丰富。
3. **`designerMetadata` 端到端修复**：`parseSchemaDocument` 现在保留 `designerMetadata`（此前被静默丢弃）；Schema Adapter 的 `treeToSchemaDocument` 支持传入 `designerMetadata`。
4. **`DesignerWorkspace.mount` 用 `ReactDOM.render`**（React 17 无 `createRoot`），渲染最小 `Designer → Workbench → WorkspacePanel → ViewportPanel` 画布；测试聚焦 schema/engine 部分，mount 不做深度 DOM 断言。

---

## 4. 验证结果

```text
pnpm --filter @x-form-engine/designer-designable exec vitest run → 7 文件 / 30 用例全绿
pnpm --filter @x-form-engine/designer-designable typecheck           → 通过（0 错误）
pnpm --filter @x-form-engine/designer-designable build               → ESM + CJS + DTS 成功
pnpm -r typecheck                                                    → 13 包 + 3 app 全部 Done
pnpm test:run                                                        → 68 文件 / 332 用例全绿
```

---

## 5. 遗留与下一阶段

- **`createDesignerMaterials`（ComponentBinding → Designable）尚未迁移到 Adapter**：当前 M2 兼容路径仍在 `packages/designer`，Phase 9 统一切换时迁移到 `designer-designable`（或退役）。
- **Material Adapter 的 propsSchema 是字段级默认**：组件专属 Setter（按 `ComponentProtocolDefinition.schema.properties` 派生）由 Phase 6 的 `materials-basic` 通过独立 `DesignerMaterialDefinition.setters` 补齐。
- **`DesignerWorkspace.mount` 的完整 Workbench（面板/工具栏/资源面板）**：当前只渲染最小画布，完整 Widget 组合留在 demo（Phase 9 统一）。
- **`install.force` 覆盖 + provenance**：延续 Phase 4 遗留。

下一步进入 **Phase 6（基础物料 / Setter / Plugin）**：基于 `DesignerMaterialDefinition`/`SetterDefinition`/`DesignerPlugin` 提供 `materials-basic`、`setters-basic`、`plugins-basic`，构建可拖入/修改/删除 + Schema 导入导出的基础设计器闭环。
