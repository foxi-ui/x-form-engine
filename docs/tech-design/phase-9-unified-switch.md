# Phase 9 统一切换、文档与发布验证 — 完成报告

> 依据：`docs/architecture/02-form-engine-v2-task.md` Phase 9（Task 9.1–9.6，C12）
> 分支：`feat/form-engine-v2`
> 完成日期：2026-11-13
> 结论：Phase 9 验收达成 —— 全部 16 个 publishable 包出口改指 `dist`（可被外部消费）、`packages/designer` 降级为 `@deprecated` 兼容 Facade（消除双轨）、`apps/designer-demo` 切换到权威新栈 `designer-designable`、新增 `examples/designer-consumer` 外部消费项目（packed tarballs 6 用例全绿）、依赖边界检查脚本落地，并接入二次审核 S1（导出一致性闸门）。全仓 372 用例 / typecheck / 构建全绿。

---

## 1. 交付物清单

| 文件 | 动作 | 内容 |
|---|---|---|
| `scripts/check-dependency-boundaries.mjs` | 新增 | 依赖边界检查（Task 9.2）：16 包 package.json 依赖方向 + 源码深路径 import 守卫 |
| `scripts/rewire-dist-exports.mjs` | 新增 | 一次性迁移脚本：把 `main/module/types/exports` 从 `./src/*.ts` 改指 `./dist/*` |
| 16 个 `packages/*/package.json` | 修改 | `main/module/types/exports` → `dist`（Task 9.3；`components` 多入口映射 `dist/src/index.*` + `./mobile`） |
| `package.json`（根） | 修改 | 新增 `check:boundaries` 脚本 |
| `packages/core/src/schema/consistency.ts` | 修改 | 新增 `validateDesignerExport` 组合闸门 + `DesignerExportCheckOptions`（S1） |
| `packages/designer-designable/src/schema-adapter.ts` | 修改 | `treeToSchemaDocument` 扩展 `components/decorators/materials` 并调用 S1 闸门 |
| `packages/designer-designable/src/schema-adapter.test.ts` | 修改 | +2 用例（S1 导出拒绝 / 通过） |
| `packages/designer-designable/src/designable-materials.ts` | 新增 | `createDesignableMaterials`（自 `packages/designer` 迁移，富 propsSchema） |
| `packages/designer-designable/src/designable-engine.ts` | 新增 | `createDesignableEngine`（自 `packages/designer` 迁移） |
| `packages/designer-designable/src/index.ts` | 修改 | 导出上述两模块 |
| `packages/designer/src/{index,designer,materials}.ts` | 修改 | 降级为 `@deprecated` 兼容 Facade（re-export 自 designer-designable） |
| `apps/designer-demo/package.json` + `src/App.tsx` | 修改 | 增加 `designer-designable` 依赖；engine/materials 改从 `designer-designable` 导入 |
| `examples/designer-consumer/*` | 新增 | 外部消费项目（独立 workspace，消费 `pnpm pack` 产物，6 用例 + typecheck） |
| `AGENTS.md` | 修改 | V2 标记为已实施（Phase 0–9）、新增包表、打包/边界约束、依赖方向 |
| `docs/README.md` | 修改 | V2 状态改为已实施、收录 `04` 二次审核、`07` 落地对照改指 designer-designable |
| `docs/tech-design/phase-9-unified-switch.md` | 新增 | 本报告 |

---

## 2. 各 Task 完成情况

- **Task 9.1 Runtime 回归** ✅：全仓 372 用例全绿（ComponentBinding / Renderer / Readonly 均回归）。`FormRenderer.destroy()` 为已文档化的占位（Formily 无公开 destroy API，生命周期随 React unmount / `FormProvider` 销毁清理），未使用 Formily 私有方法。
- **Task 9.2 包依赖隔离** ✅：`scripts/check-dependency-boundaries.mjs`（`pnpm check:boundaries`）断言 `designer-core` 不依赖 designable/antd/renderer、runtime 层不依赖 designer、高级扩展只依赖公开 API、无 `@x-form-engine/*/src/` 深路径 import；16 包通过。
- **Task 9.3 构建和类型导出** ✅：16 个 publishable 包 `main/module/types/exports` 改指 `dist`（此前 `files:["dist"]` 但出口仍指 `./src/index.ts`，`dist` 产物实际未被外部消费）。`pnpm build`（ESM + CJS + DTS）、`pnpm -r typecheck`、`pnpm test:run` 全绿。
- **Task 9.4 外部项目消费验证** ✅：`examples/designer-consumer`（独立 `pnpm-workspace.yaml` 隔离主仓库）经 `pnpm pack` 产物安装 10 个包，验证 `createDesigner` + `createDesignableAdapter` + 基础/高级物料/Setter/Plugin + 第三方自定义 Material/Setter/Plugin；6 用例 + `tsc --noEmit`（`moduleResolution: bundler` 解析 `dist/*.d.ts`）全绿。
- **Task 9.5 统一切换（C12）** ✅：Designable 耦合代码（引擎引导 + 物料派生）迁至 `designer-designable`（唯一 Designable 宿主）；`packages/designer` 降级为 `@deprecated` 兼容 Facade；`apps/designer-demo` 改从 `designer-designable` 导入 engine/materials（保留完整 Workbench + 预览）。不存在长期双轨。
- **Task 9.6 AGENTS.md 与文档地图** ✅：AGENTS.md 标记 V2 已实施、补充新包表 + 打包/边界约束 + 依赖方向；`docs/README.md` V2 状态改为已实施并收录 `04` 二次审核；清理过时「待实施」术语。

---

## 3. 关键裁定

1. **出口改指 `dist` 是发布正确性的硬修复**：`files:["dist"]` + tsup 早已产出 `dist`，但 `main/exports` 仍指 `./src/index.ts` 且依赖为 `workspace:*`，导致 `pnpm pack` 产物不可被外部消费。改动后 `workspace:*` 由 pack 重写为版本号、`exports` 指向 `dist`，外部项目可安装。**代价**：workspace 内解析也走 `dist`，改源码后须先 `pnpm build` 再测试/typecheck（已写入 AGENTS.md）。
2. **`components` 多入口 tsup 保留目录结构**：`dist/src/index.*`（主入口）+ `dist/mobile.*`（子路径），`exports` 按实际路径映射。
3. **外部消费项目的两处必要配置**：(a) `pnpm.overrides` 把传递依赖 `@x-form-engine/*` 固定到本地 tarball（否则 pnpm 走 registry 404）；(b) vitest `server.deps.inline` 让 `react/jsx-runtime`（react@17 无 exports map）走 bundler 解析——真实消费方本就使用 bundler，非包缺陷。
4. **S1 导出一致性闸门落地**（二次审核 04 的 S1）：`validateDesignerExport` 组合 `checkSchemaComponentRegistrations` + `checkMaterialRuntimeTarget`，接进 `treeToSchemaDocument`；引用未注册组件/装饰器时导出抛 `SCHEMA_INVALID`，关闭「画了 → 导出成功 → 渲染时才暴露未注册」的洞。
5. **双轨消除**：Designable 耦合实现（`createDesignableEngine` / `createDesignableMaterials`）只存在于 `designer-designable`；`packages/designer` 仅保留 `@deprecated` re-export + 非 Designable 的 UI 助手（`DesignerPreview` / `OptionsSetter` / schema-io Facade）。demo 同步切换到权威新栈。

---

## 4. 验证结果

```text
pnpm check:boundaries                       → 16 包通过
pnpm build                                  → 16 包 ESM + CJS + DTS 成功
pnpm -r typecheck                           → 16 包 + 3 app 全部 Done
pnpm test:run                               → 76 文件 / 372 用例全绿（含 S1 +2 用例）
pnpm --filter designer-demo build           → ✓ built（完整 Workbench 正常打包）
examples/designer-consumer: pnpm test       → 1 文件 / 6 用例全绿
examples/designer-consumer: pnpm typecheck  → tsc --noEmit 通过
```

---

## 5. 遗留与下一阶段

二次审核 `04`（只读归档）中的剩余发现，Phase 9 未一并处理，列为明确后续项（非本次 MVP 阻断）：

- **S2 Workbench UI 装配层**：新栈 `createDesignableAdapter.mount` 仍是最小画布；完整 Workbench（SettingsForm / 物料资源面板 / 工具栏）目前由 `apps/designer-demo` 用 `@designable/react` 直接组合，尚未沉淀为新栈可复用的装配层。建议按「迁移旧 Workbench」而非从零重写。
- **S4 `designable?` 字段**：`DesignerMaterialDefinition.designable?` 仍住在 `types`（`designer.ts:89`），属 C13 精神层泄漏；建议改中性 `adapterConfig?` 或移入 `designer-designable` 扩展类型；「可替换 Adapter」尚未用极简 stub adapter 探针验证。
- **S3 物料派生双路径**：`createDesignableMaterials`（ComponentBinding → Designable，富 propsSchema）与 `deriveDesignerMaterials` + `createDesignableMaterialAdapter`（默认 propsSchema）仍平行；建议合并，令 derive 成为 `component` 类物料唯一入口。
- **S5 结构化 Schema 类型**：`createSchema` 返回 `Record<string, unknown>`，可定义 `EngineSchemaNode` 部分静态化合法性校验。
- **react/react-dom 应改 `peerDependencies`**：当前 `components`/`designer-designable`/`setters-*` 等把 react 声明为 `dependencies`，外部消费产生重复实例；Task 9.3 已定位但未改（属较广的发布策略变更）。
- **workspace 环警告**：`components ↔ renderer ↔ formily` 存在既有循环依赖（pnpm 提示，非本 Phase 引入），需单独核查。
- **其余既有缺口**：异步插件、后端 Canonical Snapshot 集成、Devtools/诊断、E2E/兼容/性能测试、版本治理（对应 M5 / 任务书 13.5 未覆盖项）。

下一步建议：按 `04` 顺序 S2（Workbench 装配层迁移）→ S4（`designable?` 移除 + stub adapter 探针）→ S5（结构化 Schema 类型）→ S3（derive 唯一入口），随后处理 react peerDependencies 与 workspace 环。
