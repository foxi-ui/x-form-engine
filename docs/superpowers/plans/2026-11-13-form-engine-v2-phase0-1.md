# Form Engine V2 Phase 0–1 重新执行实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans 实施本计划。步骤使用 `- [ ]` 复选框语法跟踪。

**Goal:** 对 `foxi-ui/x-form-engine` 重新执行 Phase 0（仓库审计）与 Phase 1（公共协议与依赖边界），产出两份审计文档 + 核验/补齐 `types` 包公共协议类型与测试。

**Architecture:** Phase 0 只读审计，产出事实型文档；Phase 1 在既有 `packages/types` 上核验并（仅在发现偏差时）以 TDD 修正类型协议。不新建空壳包、不重写 Runtime、不升级依赖。

**Tech Stack:** React 17.0.2 · Formily 2.3.7 · Designable 1.0.0-beta.45 · antd 4.22.8 · antd-mobile 5.43.0 · TypeScript 5.9.3 · Vitest 3.2.7 · pnpm 10.34.5。

**Spec:**
- `docs/architecture/02-form-engine-v2-task.md`（工程任务书，Phase 0/1 的规范来源）
- `docs/architecture/01-form-engine-v2.md`（V2 架构设计，C1–C13 决策依据）
- `AGENTS.md`（权威项目约束，其中「Form Engine V2 已确认约束」与「Non-negotiable design constraints」优先于任务书中的冲突表述）

## 现状判定（前置结论，已通过源码核实）

- Phase 1 公共协议类型**已存在于** `packages/types/src/`：`designer.ts`（Material/Setter/Diagnostic/Registry/SchemaEditor/DesignerPlugin/Engine/Adapter）、`plugin.ts`（Generic Plugin Core 通用类型）、`schema.ts`（`FormSchemaDocument` + `designerMetadata`）。配套类型级测试 `__tests__/designer-types.test.ts` 与依赖边界守卫 `__tests__/no-react-deps.test.ts` 已存在。
- Phase 2 Generic Plugin Core（`core/src/plugin/generic/plugin-host.ts` + `dependency-resolver.ts`）与 Phase 3 Runtime Host 迁移（`core/src/plugin/plugin-manager.ts` 委托 `createGenericPluginHost`）**已落地**。
- `packages/designer` 仍直接耦合 Designable（`materials.ts` 的 `createDesignerMaterials` 用 `@designable/core`/`@designable/formily-antd`，对缺 `implementations.pc` 的 binding 静默跳过）；`designer-core` 独立包**尚未建立**（Phase 4+ 范围，不在本计划内）。

因此「重新执行 Phase 0~1」的实质是：**重新审计当前仓库（含已落地的 Phase 1/2/3 代码）→ 逐条核验类型协议是否满足任务书 1.1–1.7 → 只在发现偏差时用 TDD 修正**，而非从空仓库重写类型。

## Global Constraints

（逐条来自任务书 §1.2/§1.3 与 AGENTS.md，实施时隐式作用于每个 Task）

- React/ReactDOM 锁定 17.x，Formily 锁定 2.3.7，Designable 锁定 1.0.0-beta.45，antd 4.x，antd-mobile 5.x；**禁止擅自升级**。
- 禁止重定义 `FormSchemaDocument`（C1）；`schema` 保持 `Record<string, unknown>`，不得收窄为 `ISchema`；`designerMetadata` 仅作兼容扩展。
- `types` 包必须保持 React/Formily/Designable/antd 无关（AGENTS.md 约束 #7，`unknown` 优于 `any`）；UI 组件字段与 Designable 专属字段用 `unknown` 作隔离边界，`createSchema` 返回 `Record<string, unknown>`。
- 不建空壳包（C8）；先逻辑分层、再物理拆包。
- Designer Core 不得依赖 Designable/antd/renderer（C13，Phase 4 落地）；本计划只保证类型协议层不泄漏。
- 所有新增公开 API 必须有类型声明和测试；不得用 `any` 绕过核心协议类型。
- 每个 Phase 完成后运行测试、类型检查，并产出验收报告。

## Review Focus

（任务书规范隐含、但需在核验时特别盯住的输入类/失败模式）

1. `FormSchemaDocument.schema` 被收窄为 Formily `ISchema` → 破坏「不破坏 Formily 原生 Schema 能力 + types 无 Formily 依赖」。
2. `DesignerMaterialDefinition.createSchema` / `icon` / `designerComponent` 泄漏 React/Formily/Designable 类型到 `types` 包。
3. `DesignerPluginContext` 或 `SchemaEditor` 暴露 Designable `TreeNode` / 内部引擎实例。
4. `MaterialRuntimeTarget` 三态未区分，导致 `component`/`schema-container`/`designer-only` 一致性校验（C10）无法落地。
5. Generic Plugin Core 类型（`PluginDefinition`/`PluginRegistry`/`DependencyEdge`）与 Runtime `FormEnginePlugin`、Designer `DesignerPlugin` 混用。

---

### Task 1: Phase 0 — 架构审计文档 `architecture-refactor-audit.md`

**Files:**
- 重写：`docs/tech-design/architecture-refactor-audit.md`
- 只读依据：`packages/*/package.json`、`packages/core/src/plugin/{plugin-manager.ts,generic/*}`、`packages/designer/src/*`、`packages/types/src/*`、`packages/core/src/schema/{parser.ts,validator.ts}`、`packages/formily/src/component-map.ts`、`packages/renderer/src/*`、`AGENTS.md`

**Interfaces:**
- 产出：审计文档（10 项内容，见任务书 §1.1），事实型、每项有文件路径/符号名/行号依据。

- [ ] **Step 1: 汇总「当前 package 结构 / 模块职责 / 依赖关系」**（基于已读全部 `package.json` 与源码树）
- [ ] **Step 2: 定位「Designer↔Designable 耦合点」「Material/Setter 现状」「Runtime Plugin Manager 可复用能力与泛型边界」**（`materials.ts`、`setters.tsx`、`plugin-manager.ts`、`generic/plugin-host.ts`）
- [ ] **Step 3: 写出「与目标架构差异」「需新增/修改/保留文件」「兼容风险」「建议实施顺序」**，并注明 Phase 1/2/3 已落地、Phase 4+ 未落地的真实状态
- [ ] **Step 4: 自检**——审计文档 10 项逐条核对任务书 §1.1，无「待审计」字样残留、无虚构实现
- [ ] **Step 5: Commit** `docs(tech-design): 重新审计 architecture-refactor-audit`

验收：审计文档包含任务书 §1.1 全部 10 项；每项事实有路径/符号/行号；Phase 4 差异不虚报为已实现。

### Task 2: Phase 0 — 兼容性基线文档 `compatibility-baseline.md`

**Files:**
- 重写：`docs/tech-design/compatibility-baseline.md`
- 只读依据：全部 `package.json`、`pnpm-lock.yaml`、`tsconfig.base.json`、各包 `vitest.config.ts`、`packages/types/vitest.config.ts`

**Interfaces:**
- 产出：兼容性基线文档（版本、peerDependencies 策略、React/Formily 重复实例、构建产物/导出，见任务书 Task 0.1）。

- [ ] **Step 1: 记录 React/ReactDOM/Formily 全家/Designable 全家/antd/antd-mobile 实际版本**（从 lockfile 与 package.json 交叉核对）
- [ ] **Step 2: 记录 peerDependencies 策略与重复 React/Formily 风险**（各包 deps 已读；`types`/`core`/`services` 无 React，`components`/`designer`/`formily`/`renderer` 直接 `react@17.0.2`）
- [ ] **Step 3: 记录 ESM/CJS/DTS 导出现状**（各包 `exports` 指向 `./src/*.ts`，`publishConfig` 指向 `dist`；`tsup` 构建）
- [ ] **Step 4: 记录 Designable 与 React17/antd4 兼容验证方式**（`designer/__tests__/designable-smoke.test.tsx` 与 `designer-demo`）
- [ ] **Step 5: Commit** `docs(tech-design): 重新审计 compatibility-baseline`

验收：版本有明确记录、无未授权升级、peerDependencies 策略明确。

### Task 3: Phase 1 — 核验 FormSchemaDocument / Material / Setter / Diagnostic 类型（Task 1.1–1.4）

**Files:**
- 核验（只读为主）：`packages/types/src/schema.ts`、`packages/types/src/designer.ts`
- 若发现偏差才改：`packages/types/src/{schema.ts,designer.ts}`
- 测试：`packages/types/src/__tests__/designer-types.test.ts`（已存在，缺口时才补断言）

**Interfaces:**
- Consumes: 任务书 Task 1.1–1.4 的精确字段与验收项。
- Produces: 无新增类型（已存在），可能修正的字段/断言。

- [ ] **Step 1: 逐条比对** Task 1.1（`FormSchemaDocument` 无重复定义、`designerMetadata?` 扩展、`schema` 不收窄）与 `schema.ts`
- [ ] **Step 2: 逐条比对** Task 1.2（`DesignerMaterialDefinition` + `MaterialRuntimeTarget` 三态 + `MaterialCreateContext`/`DesignerComponentProps`）与 `designer.ts`
- [ ] **Step 3: 逐条比对** Task 1.3（`SetterProps`/`SetterDefinition`/`SetterBinding`/`SetterContext`/`ValidationResult`/`SetterRegistryOptions`/`SetterResolveResult`）与 `designer.ts`
- [ ] **Step 4: 逐条比对** Task 1.4（`SchemaDiagnostic` 定位信息与严重级别）与 `designer.ts`
- [ ] **Step 5: 对发现的每条偏差**：先写失败的类型断言（`expectTypeOf`）→ 运行确认失败 → 修正类型 → 运行确认通过（TDD；无偏差则记录「核验通过」）
- [ ] **Step 6: 运行** `pnpm --filter @x-form-engine/types test:run` 与 `pnpm --filter @x-form-engine/types typecheck`，读输出确认通过
- [ ] **Step 7: Commit** `chore(types): 重新核验 Phase 1 类型协议 1.1–1.4`

验收：Task 1.1–1.4 每条有明确「符合/偏差+修正」结论；类型测试与 typecheck 全绿。

### Task 4: Phase 1 — 核验 Plugin / SchemaEditor / 依赖边界类型（Task 1.5–1.7）

**Files:**
- 核验（只读为主）：`packages/types/src/plugin.ts`、`packages/types/src/designer.ts`、`packages/types/src/index.ts`
- 测试：`packages/types/src/__tests__/designer-types.test.ts`、`packages/types/src/__tests__/no-react-deps.test.ts`（已存在）

**Interfaces:**
- Consumes: 任务书 Task 1.5–1.7。
- Produces: 无新增类型；确认 Generic Plugin Core 类型与 Runtime/Designer 插件类型解耦、SchemaEditor 不暴露 TreeNode、依赖方向无泄漏。

- [ ] **Step 1: 核验** Task 1.5（`DesignerPlugin`/`DesignerPluginContext`/`PluginInstallOptions`/`PluginStatus`/`PluginLifecycleEvent`/`PluginDependencyError` + `PluginDefinition`/`PluginRegistry`/`DependencyEdge`）
- [ ] **Step 2: 核验** Task 1.6（`SchemaEditor` 只操作 `FormSchemaDocument`/`SchemaNode`，`@ts-expect-error` 断言不暴露 `TreeNode`）
- [ ] **Step 3: 核验** Task 1.7（依赖方向图无环；`no-react-deps.test.ts` 守卫 types 无 react/formily/designable/antd import；`plugin.ts` 零 import）
- [ ] **Step 4: 对发现偏差** 以 TDD 补断言/修正；无偏差则记录「核验通过」
- [ ] **Step 5: 运行** `pnpm --filter @x-form-engine/types test:run` 与 `pnpm --filter @x-form-engine/types typecheck`，读输出确认通过
- [ ] **Step 6: Commit** `chore(types): 重新核验 Phase 1 类型协议 1.5–1.7`

验收：Task 1.5–1.7 每条有明确结论；依赖边界守卫与类型测试全绿。

### Task 5: Phase 1 — 全量验证与 Phase 1 报告

**Files:**
- 新建/重写：`docs/tech-design/phase-1-types-protocol.md`（重新核验的验收报告）

**Interfaces:**
- Consumes: Task 3/4 的核验结论。
- Produces: Phase 1 报告（实际文件、核验结论、遗留项、测试命令与结果）。

- [ ] **Step 1: 运行** `pnpm --filter @x-form-engine/types test:run`（全量），读输出确认通过
- [ ] **Step 2: 运行** `pnpm --filter @x-form-engine/types typecheck`，确认 0 错误
- [ ] **Step 3: 运行** `pnpm -r typecheck` 确认 types 变更未破坏其它包
- [ ] **Step 4: 撰写 Phase 1 报告**，含：核验范围、1.1–1.7 逐条结论、`unknown`/`Record` 替代 React/Formily 类型的 Ruling 及理由、遗留项（如 `designerMetadata` 迁移轴未纳入 `VersionAxis`）
- [ ] **Step 5: Commit** `docs(tech-design): 重新产出 Phase 1 报告`

验收：报告覆盖 1.1–1.7、测试/typecheck 命令与结果真实、Ruling 明确。
