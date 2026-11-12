# Phase 4 Designer Core — 完成报告

> 依据：`docs/architecture/02-form-engine-v2-task.md` Phase 4（Task 4.1–4.7）
> 分支：`feat/form-engine-v2`
> 完成日期：2026-11-13
> 结论：Phase 4 验收达成 —— 新增独立 `@x-form-engine/designer-core` 包，Material/Setter/Panel/Command/Toolbar Registry、Designer Plugin Host（复用 Generic Plugin Core）、SchemaEditor、DesignerEngine 全部实现；C13 依赖检查通过（不依赖 Designable / antd / Runtime Renderer / FormEngine）。

---

## 1. 交付物清单

| 文件 | 动作 | 内容 |
|---|---|---|
| `packages/designer-core/package.json` | 新增 | 包定义，deps 仅 `@x-form-engine/core` + `@x-form-engine/types` |
| `packages/designer-core/tsconfig.json` | 新增 | 基座配置 |
| `packages/designer-core/vitest.config.ts` | 新增 | 测试配置 |
| `packages/designer-core/src/registry/named-registry.ts` | 新增 | 共享基类 `createNamedRegistry<T>`（`DesignerRegistry` + `PluginResourceRegistry`） |
| `packages/designer-core/src/registry/material-registry.ts` | 新增 | `createMaterialRegistry`（分类查询 / clear / runtimeTarget 诊断） |
| `packages/designer-core/src/registry/setter-registry.ts` | 新增 | `createSetterRegistry`（`resolve` + `SETTER_NOT_FOUND` 诊断） |
| `packages/designer-core/src/registry/panels.ts` | 新增 | `createPanelRegistry`/`createCommandRegistry`/`createToolbarRegistry` |
| `packages/designer-core/src/plugin/plugin-host.ts` | 新增 | `createDesignerPluginHost`（复用 `createGenericPluginHost`） |
| `packages/designer-core/src/schema/schema-editor.ts` | 新增 | `createSchemaEditor` |
| `packages/designer-core/src/engine.ts` | 新增 | `createDesigner` |
| `packages/designer-core/src/index.ts` | 新增 | 公开入口 |
| `packages/designer-core/src/__tests__/no-designable-runtime-deps.test.ts` | 新增 | C13 依赖守卫（源码 + package.json） |
| `packages/types/src/designer.ts` | 修改 | `SetterRegistry` 增补 `resolve(binding)` |
| `packages/core/src/index.ts` | 修改 | 公开导出 Generic Plugin Core（`plugin-host`） |

测试文件（8 个）：`named-registry`（7）、`material-registry`（11）、`setter-registry`（9）、`panels`（3）、`schema-editor`（4）、`plugin-host`（9）、`engine`（6）、`no-designable-runtime-deps`（3）；`types` 新增 `resolve` 类型断言 1 条。

---

## 2. 各 Task 完成情况

- **Task 4.1 MaterialRegistry** ✅：`register/registerMany/unregister/get/getAll/getByCategory/has/clear/getDiagnostics`；唯一标识按 name；重复注册抛 `PLUGIN_CONFLICT`；注册时校验 `runtimeTarget`（缺 → `MATERIAL_RUNTIME_TARGET_MISSING` warning；`component` target 与 `componentName` 不一致 → `MATERIAL_RUNTIME_TARGET_MISMATCH` error）；不静默跳过；支持插件资源归属（`list()` 供泛型宿主追踪）。
- **Task 4.2 SetterRegistry** ✅：`register/registerMany/unregister/get/getAll/has` + `resolve`；未注册 Setter 的解析返回 `found:false` + `SETTER_NOT_FOUND` 诊断；`defaultProps`/`validate` 保留。
- **Task 4.3 Panel/Command/Toolbar Registry** ✅：最小能力，复用 `createNamedRegistry`；`order` 字段稳定；不写 UI 实现。
- **Task 4.4 Designer Plugin Host** ✅：基于 `createGenericPluginHost`，注入五类 Registry + `events`/`schema`/`engine`；依赖拓扑/缺失/重复安装/回滚/归属/单插件卸载（依赖保护 `PLUGIN_DEPENDENCY_ACTIVE`）/逆序 dispose/disposeAll 幂等全部复用泛型能力。
- **Task 4.5 SchemaEditor** ✅：`getDocument/update/subscribe`，不可变更新，不暴露 Designable `TreeNode`。
- **Task 4.6 DesignerEngine** ✅：`createDesigner(options)`；不装 Adapter 可实例化；`use(adapter)` 存储；`destroy()` 幂等释放插件并派发 `designer:destroy`；不暴露内部 Map。
- **Task 4.7 依赖图检查** ✅：源码级 + package.json 级守卫，禁止 Designable/antd/antd-mobile/renderer/formily/components 与 Runtime FormEngine 符号。

---

## 3. 关键裁定

1. **`designer-core` 依赖 `@x-form-engine/core`（仅 import `createGenericPluginHost` / `createEventBus`）**。Generic Plugin Core 物理上在 `core` 包内（Phase 2 未单独拆包），C13 的「不依赖 FormEngine」以**源码级守卫**落实（禁止 import `createFormEngine`/`createPluginManager`/`createEngineRegistry`/`FormEngine`/`EngineRegistry` 等），而非禁止 package 级依赖 `@x-form-engine/core`。
2. **`DesignerPlugin.dispose?()`（无参）与泛型宿主 `InstallablePlugin.dispose?(context)` 结构兼容**（TS 允许少参函数赋值给多参），无需改泛型核心。
3. **`list()`/`unregister(name, source?)` 是 `PluginResourceRegistry` 内部接口**，不进入公开 `DesignerRegistry`/`DesignerEnginePublicAPI`；公开 API 用 `getAll()`，不暴露内部 Map。
4. **`install` 的 `options.force` 覆盖未实现**（AGENTS #3 要求显式可信声明 + provenance），重复安装始终抛 `PLUGIN_CONFLICT`。
5. **`SetterRegistry` 增补 `resolve`**，补全 Phase 1 悬空的 `SetterResolveResult`。
6. **未新建 `DesignerContext` 类型**——任务书 Phase 4 头部的「DesignerContext」映射到已有 `DesignerPluginContext`/`DesignerAdapterContext`。
7. **`destroy()` 本阶段只释放插件**；Adapter workspace 挂载/卸载生命周期属 Phase 5，`use` 仅存储 Adapter。

---

## 4. 验证结果

```text
pnpm --filter @x-form-engine/designer-core exec vitest run → 8 文件 / 52 用例全绿
pnpm --filter @x-form-engine/designer-core typecheck            → 通过（0 错误）
pnpm --filter @x-form-engine/designer-core build                → ESM + CJS + DTS 成功
pnpm -r typecheck                                               → 12 包 + 3 app 全部 Done
pnpm test:run                                                   → 61 文件 / 301 用例全绿
```

---

## 5. 遗留与下一阶段

- **`designerMetadata` 仍被 `parseSchemaDocument` 静默丢弃**（`core/src/schema/parser.ts`），Phase 5 导入→导出往返必须补。
- **Adapter 实际挂载与 workspace 生命周期**（`DesignerWorkspace.mount/unmount`、画布事件 → `DesignerEvent` 映射）属 Phase 5。
- **`install.force` 覆盖 + provenance**：AGENTS #3 的显式可信声明机制，后续按需实现。
- **Material `componentName` ↔ Runtime Binding 可映射校验**：属 Phase 7 Contract Tests（需 Runtime registry，Designer Core 不感知）。
- **`createDesignerMaterials` 迁移为 Adapter 内派生工厂**：Phase 5.6，去「缺 `implementations.pc` 静默跳过」。

下一步进入 **Phase 5（Designable Adapter）**：定义并落地 `DesignerAdapter`/`DesignerWorkspace`，把 `packages/designer` 的 Designable 耦合代码（`designer.ts`/`materials.ts`/`schema-io.ts`）重构为 Adapter，并实现 Material/Setter/Schema 双向转换。
