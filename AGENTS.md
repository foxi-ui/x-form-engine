# AGENTS.md

Guidance for coding agents working in this repository.

> This is the canonical instruction file for all coding agents. `CLAUDE.md` imports this file, so edits here take effect for both — do not duplicate instructions into `CLAUDE.md`.

## Repository state

This repo is an implemented pnpm monorepo (React + TypeScript + Formily 2.3). M1 is complete — the engine kernel, PC renderer, and base components across six packages (`types`, `core`, `formily`, `renderer`, `components`, `sdk`) plus `apps/playground`. M2's **Designer closed loop** is complete — `packages/designer` (Designable 1.x adapter) plus the `apps/designer-demo` full Workbench. M3's **Value / Snapshot / Readonly 闭环** is complete — `packages/adapters`, `packages/services`, the independent Readonly renderer (`ReadonlyRenderer`), and schema/snapshot 有序迁移注册表 in `core`. M4's **Mobile renderer** is complete — the `@x-form-engine/components/mobile` entry, seven P0 antd-mobile components + FormItem, per-field PC fallback diagnostics, and `apps/mobile-demo`. The **Form Engine V2 Designer framework (Phase 0–9)** is also complete — `designer-core` (headless Designer Core), `designer-designable` (Designable Adapter), Generic Plugin Core in `core/plugin/generic`, plus the `materials-basic`/`setters-basic`/`plugins-basic`/`setters-advanced`/`plugins-advanced` extension packages and the external consumer demo `examples/designer-consumer`; `packages/designer` is now a `@deprecated` compat facade. Use `pnpm test:run` for the full Vitest suite, `pnpm -r typecheck` for all packages, `pnpm check:boundaries` for the dependency-boundary gate, and `pnpm --filter playground dev|build` / `pnpm --filter designer-demo dev|build` / `pnpm --filter mobile-demo dev|build` for the demo apps. Still remaining: asynchronous plugins, backend Canonical Snapshot integration, Devtools/diagnostics, E2E/compatibility/performance testing, and release/version governance.

Documentation is written in Simplified Chinese with Mermaid diagrams; match that style when editing or adding docs.

## Documentation map

- `README.md` + `docs/README.md` — the canonical doc map: five-layer structure, authority rules, and per-spec landing status. Start here for "where is X documented".
- `docs/tech-design/form-engine-architecture-design.md` — architecture baseline (goals, layers, monorepo layout, domain models, adapters, error handling). Milestones point to `mvp-roadmap.md` §6.
- `docs/tech-design/mvp-roadmap.md` — MVP baseline: Core/Contract/Future classification, BLOCK items, M1–M5 milestones, acceptance criteria.
- `docs/tech-design/backlog.md` — tech-debt ledger (M1 review carryovers; re-verify each before planning).
- `docs/tech-design/pending-confirmations.md` — 13 backend/business/security questions to close before backend integration.
- `docs/tech-design/02-specs/` — topic specs `01`–`10`. Each carries a status stamp (`implemented` / `proposed` / superseded) and a `落地对照` pointer to the owning `packages/*` source.
- `docs/tech-design/verification/` + `adr/` — read-only facts and decisions.
- `docs/architecture/01-form-engine-v2.md` — Form Engine V2 完整架构设计方案（**已订正**；C1–C13 决策依据）。
- `docs/architecture/02-form-engine-v2-task.md` — Form Engine V2 Claude Code 工程改造任务书（V2 执行依据，Phase 0–9，**已实施**）。
- `docs/architecture/03-form-engine-v2-review.md` — V2 架构文档审核报告（C1–C9 事实核查结论，只读归档）。
- `docs/architecture/04-form-engine-v2-review-2.md` — V2 二次审核报告（第一性原理；S1–S6 发现，只读归档，S1 已落地）。
- `docs/tech-design/phase-{1..9}-*.md` — V2 各 Phase 完成报告（验收依据）。

Recommended order: freeze `01` + `02` (public contracts) → implement `03` + `04` (registry/plugin + Formily adapter kernel) → parallelize `05`–`07` → review `08`/`09` against real business components and backend storage.

**Authority rule**: implemented interfaces are authoritative in code (`packages/types`, etc.), not in prose. Specs describe intent + point to code; never copy a type definition into a second file. Conflicts resolve code → spec → roadmap → architecture baseline → verification. Specs are **proposed contracts, not verified implementations** — never present them as Formily/Designable native APIs; validate exports/types/runtime behavior against the pinned versions before relying on them.

## Architecture at a glance

pnpm workspace, split by responsibility. **Implemented** (M1–M4): `types`, `core`, `formily`, `renderer`, `components`, `sdk`, `designer`, `adapters`, `services` + `apps/playground`, `apps/designer-demo`, `apps/mobile-demo`. **Planned**: `apps/renderer-demo`. `packages/schema` was merged into `packages/core` (M1 baseline).

| Package | Responsibility | Status |
|---|---|---|
| `packages/types` | Pure protocol types, domain models, error codes | implemented |
| `packages/core` | Registry, Plugin, Context, Scope, Events, Runtime, `x-engine` schema parser/validator | implemented |
| `packages/formily` | Formily adapter (component/decorator map + SchemaField) | implemented |
| `packages/renderer` | UI-agnostic render core, React entry, PC Renderer, Mobile renderer, Readonly Renderer | implemented (PC + Mobile + Readonly) |
| `packages/designer` | Designable 1.x 适配（**legacy**）— 现为 `@deprecated` 兼容 Facade，Designable 耦合实现已迁 `designer-designable` | deprecated compat facade |
| `packages/designer-core` | Headless Designer Core：Material/Setter/Panel/Command/Toolbar Registry + Designer Plugin Host + SchemaEditor + `createDesigner` | implemented |
| `packages/designer-designable` | Designable Adapter：`createDesignableAdapter` + Material/Setter/Schema 转换 + `createDesignableEngine`/`createDesignableMaterials` | implemented |
| `packages/materials-basic` | 基础物料（`basicMaterials`，ComponentBinding 派生） | implemented |
| `packages/setters-basic` / `packages/setters-advanced` | 基础 7 Setter / 高级 ExpressionSetter | implemented |
| `packages/plugins-basic` / `packages/plugins-advanced` | 基础 4 插件 / 表达式配置示例插件 | implemented |
| `packages/components` | Shared component definitions + platform implementations (PC entry + `@x-form-engine/components/mobile` subpath + readonly) | implemented |
| `packages/sdk` | Public consumer entry (`createFormEngine`, `FormEngineProvider`, `FormRenderer`, schema parse/validate) | implemented |
| `packages/adapters` | Value 规范化 + Candidate Snapshot 生成 + 实体/字典参考适配器 | implemented |
| `packages/services` | Permission 解析、Formatter、i18n、静态 Datasource | implemented |
| `apps/` | playground (M1 demo), designer-demo (M2 demo), mobile-demo (M4 demo) | implemented |

Dependency direction is one-way and must be preserved: `types` depends on nothing; `core/registry` does not depend on React; `renderer/core` does not depend on Ant Design; `designer` never depends on Renderer; `formily/adapter` does not depend on Designable. **V2 Designer** additions: `designer-core` depends only on `types` + `core` (Generic Plugin Core), never on Designable / antd / Runtime Renderer / FormEngine (C13); `designer-designable` is the sole Designable-coupled package; advanced extensions depend only on public `types` / `designer-core` API, never on `core`/`renderer`/`components` internals. Enforce with `pnpm check:boundaries`. Business projects depend on the two public packages `@x-form-engine/sdk` and `@x-form-engine/components`, and must not depend on internal implementation packages such as `core`, `renderer`, or `formily`.

Three data classes are deliberately kept separate — do not collapse them:

- **Schema** — form structure/configuration (versioned, persisted).
- **Value** — stable business values (e.g. user IDs, not display names).
- **Snapshot** — frozen display information captured at submission for faithful history rendering.

Component identity is unified: one `ComponentBinding` drives designer material, PC/mobile editing, and readonly rendering; implementations map per platform and adapters handle value normalization/serialization/snapshot creation/restoration. Snapshot generation happens in `submit()`, which validates and returns `{ values, snapshot }` but never performs business HTTP itself.

## Non-negotiable design constraints

These recur across the specs and are the easiest things to violate during implementation:

1. **Do not reimplement Formily.** The engine extends Formily (components, decorators, scope, effects, reactions, validation); it does not replace its field model, reactivity, validation, or effects.
2. **`x-engine` is the only engine extension namespace.** Preserve unknown Formily native keys; validate or reject unknown `x-engine` extensions by protocol version.
3. **Registry conflicts are strict.** No implicit last-write-wins. Duplicate names throw `PLUGIN_CONFLICT`; overrides require explicit trusted declaration and recorded provenance. Plugin installs are transactional with rollback, dependency topological ordering, and resource ownership so uninstall removes only the plugin's own registrations.
4. **Readonly is an independent renderer**, not `disabled={true}`. It creates no Formily Form, runs no editing reactions/effects, and does not hit live datasources by default. Display priority: snapshot `displayValue` → component snapshot metadata → static schema rules → explicitly allowed compatibility lookup → raw value with diagnostics.
5. **Frontend permissions are UX only.** Backend must independently enforce read/write/validation; schema permission config is not an authorization credential.
6. **Version axes are distinct**: business `schemaVersion`, `engineSchemaVersion`, `snapshotVersion`, and component version. Migrations must be ordered, non-destructive to original snapshots, and version-detected on read.
7. **Public API stability**: `types` must stay free of React/Formily/Designable/UI dependencies; `unknown` over `any`; never leak Formily internal types across all public packages.
8. **`submit()` is transport-free** and `getFormilyForm()` (if exposed at all) is a version-coupled escape hatch, not a normal business API.
9. **Docs must not drift from code.** When a PR lands a protocol/interface, it must set the owning spec's status stamp to `implemented` and add the `落地对照` pointer to the source; `packages/types` (and other implemented packages) are the single authority, so specs must not re-copy type definitions. Process artifacts (spikes, plans) stay out of `docs/tech-design/`.

## Form Engine V2 (Designer framework) — 已实施（Phase 0–9）

V2 架构（Designer Core + Designable Adapter + Generic Plugin Core）已按 `docs/architecture/02-form-engine-v2-task.md` Phase 0–9 落地。以下约束已确认，后续编码不得违反。阶段验收见 `docs/tech-design/phase-{1..9}-*.md`；架构二次审核见 `docs/architecture/04-form-engine-v2-review-2.md`（S1–S6，其中 S1 导出一致性闸门已在 Phase 9 落地）。

### 架构事实约束

- `FormSchemaDocument` 已存在于 `packages/types/src/schema.ts`，修改前先检查现有定义，禁止重定义；设计器元数据只在现有类型上做 `designerMetadata?` 兼容扩展。
- `ComponentBinding` 是现有 Runtime 组件绑定核心（`packages/types/src/component.ts`）。
- `createDesignableMaterials`（ComponentBinding → Designable 物料，含富 propsSchema）已迁至 `packages/designer-designable/src/designable-materials.ts`；`createDesignableEngine` 在 `designer-designable/src/designable-engine.ts`；`packages/designer` 仅保留 `@deprecated` 兼容 Facade（Task 9.5）。
- 一致性闸门在 `core/src/schema/consistency.ts`：`checkSchemaComponentRegistrations` / `checkMaterialRuntimeTarget` / `validateDesignerExport`（S1），已接进 `treeToSchemaDocument` 导出路径。
- Snapshot：`createCandidateSnapshot` 已实现；`restoreSnapshot` 仅类型声明（`component.ts:44`）；Canonical Snapshot 后端协作未落地。类型存在 ≠ 完整 Restore 闭环完成。

### Designer 依赖约束

- Designer Core 不得依赖 Designable。
- Designer Core 不得依赖 antd / antd-mobile。
- Designer Core 不得依赖 Runtime Renderer / FormEngine。
- Designable 只能通过 Adapter 接入。
- Designer 插件不得暴露或依赖 Designable TreeNode。
- SchemaEditor 只操作 Schema Document。

### Plugin 约束

- Generic Plugin Core 不依赖 Runtime / Designer 业务上下文，是独立前置任务（Phase 2）。
- Runtime / Designer 各自提供 Plugin Host。
- 插件注册资源必须归属插件。
- 插件卸载必须处理依赖保护和资源清理（单插件 `uninstall(name)`）。
- 不得直接复制 Runtime Plugin Manager 实现为 Designer Plugin Manager。

### Schema 一致性约束

- 每个普通 Material 必须声明 Runtime Target（`component` / `schema-container` / `designer-only`）。
- Schema 导出必须检查 Material Target。
- Runtime 解析必须检查组件是否可用。
- 缺失组件、平台实现或 Setter 时必须产生诊断。
- 禁止静默跳过不支持的节点。
- `designer-only` 节点不能直接进入最终 Runtime Schema。

### 工程执行约束

- 先审计再修改。
- 先逻辑分层再拆 Package。
- 不创建空壳 Package。
- 不擅自升级依赖。
- 不将规划能力标记为已实现。
- 每个 Phase 必须有测试和验收报告。
- 先完成 Generic Plugin Core 前置任务（Phase 2），再让 Designer Core（Phase 4）依赖它。
- 包 `exports`/`main`/`module`/`types` 指向 `dist`（Task 9.3）：改动源码后须先 `pnpm build` 再 `pnpm test:run` / `pnpm -r typecheck`，否则跑的是旧 `dist` 产物。
- 外部消费验证见 `examples/designer-consumer`（独立 workspace，消费 `pnpm pack` 产物；`scripts/rewire-dist-exports.mjs` 负责 dist 出口重写）。

## Implementation milestones (from the docs)

- **M0** — pin dependency versions; validate Formily/Designable APIs with minimal demos; freeze types/component/schema-value-snapshot contracts.
- **M1** — Types, Registry, Plugin, Runtime Context/Scope, Formily Adapter, PC Renderer, base components, minimal SDK.
- **M2** — Designable adapter + materials/setters (**done** — Designer closed loop).
- **M3** — Value / Snapshot / Readonly 闭环（**done**）：Value 规范化、稳定 fieldId/itemId、Candidate Snapshot、Canonical Snapshot 协议、Readonly 渲染器、Formatter 注册表、权限 fail-closed、历史 Schema/Snapshot 有序迁移。
- **M4** — Mobile renderer (**done**): `@x-form-engine/components/mobile` entry, seven P0 antd-mobile components + FormItem, per-field PC fallback diagnostics, `apps/mobile-demo`, and the mobile bundle-purity check.
- **M5** — Engineering and release (**open**): package builds, public API/type exports, unit/integration/E2E tests, Playground docs, versioning, and npm/workspace integration validation. Still open beyond it: asynchronous plugins, backend Canonical Snapshot integration, Devtools/diagnostics, E2E/compatibility/performance testing.

The architecture doc explicitly warns against building all business components, designer features, and backend snapshot protocols in the first phase; stabilize `types + component definition + registry/plugin + formily adapter` first.
