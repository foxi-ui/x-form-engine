# AGENTS.md

Guidance for coding agents working in this repository.

> This is the canonical instruction file for all coding agents. `CLAUDE.md` imports this file, so edits here take effect for both — do not duplicate instructions into `CLAUDE.md`.

## Repository state

This repo is an implemented pnpm monorepo (React + TypeScript + Formily 2.3). M1 is complete — the engine kernel, PC renderer, and base components across six packages (`types`, `core`, `formily`, `renderer`, `components`, `sdk`) plus `apps/playground`. M2's **Designer closed loop** is also complete — `packages/designer` (Designable 1.x adapter: materials, schema round-trip/import-export, bootstrap, preview, OptionsSetter) plus the `apps/designer-demo` full Workbench. M3's **Value / Snapshot / Readonly 闭环** is complete — `packages/adapters` (Value 规范化 + Candidate Snapshot 生成), `packages/services` (权限解析 / Formatter / i18n / 静态数据源), the independent Readonly renderer (`ReadonlyRenderer`), and schema/snapshot 有序迁移注册表 in `core`. M4's **Mobile renderer** is also complete — the `@x-form-engine/components/mobile` entry, seven P0 antd-mobile components + FormItem, per-field PC fallback diagnostics, and the `apps/mobile-demo` acceptance app. Use `pnpm test:run` for the full Vitest suite, `pnpm -r typecheck` for all packages, and `pnpm --filter playground dev|build` / `pnpm --filter designer-demo dev|build` / `pnpm --filter mobile-demo dev|build` for the demo apps. Still remaining: asynchronous plugins, backend Canonical Snapshot integration, Devtools/diagnostics, E2E/compatibility/performance testing, and release/version governance.

Documentation is written in Simplified Chinese with Mermaid diagrams; match that style when editing or adding docs.

## Documentation map

- `README.md` + `docs/README.md` — the canonical doc map: five-layer structure, authority rules, and per-spec landing status. Start here for "where is X documented".
- `docs/tech-design/form-engine-architecture-design.md` — architecture baseline (goals, layers, monorepo layout, domain models, adapters, error handling). Milestones point to `mvp-roadmap.md` §6.
- `docs/tech-design/mvp-roadmap.md` — MVP baseline: Core/Contract/Future classification, BLOCK items, M1–M5 milestones, acceptance criteria.
- `docs/tech-design/backlog.md` — tech-debt ledger (M1 review carryovers; re-verify each before planning).
- `docs/tech-design/pending-confirmations.md` — 13 backend/business/security questions to close before backend integration.
- `docs/tech-design/02-specs/` — topic specs `01`–`10`. Each carries a status stamp (`implemented` / `proposed` / superseded) and a `落地对照` pointer to the owning `packages/*` source.
- `docs/tech-design/verification/` + `adr/` — read-only facts and decisions.

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
| `packages/designer` | Designable 1.x adapter — materials, schema round-trip, bootstrap, preview, setters | implemented |
| `packages/components` | Shared component definitions + platform implementations (PC entry + `@x-form-engine/components/mobile` subpath + readonly) | implemented |
| `packages/sdk` | Public consumer entry (`createFormEngine`, `FormEngineProvider`, `FormRenderer`, schema parse/validate) | implemented |
| `packages/adapters` | Value 规范化 + Candidate Snapshot 生成 + 实体/字典参考适配器 | implemented |
| `packages/services` | Permission 解析、Formatter、i18n、静态 Datasource | implemented |
| `apps/` | playground (M1 demo), designer-demo (M2 demo), mobile-demo (M4 demo) | implemented |

Dependency direction is one-way and must be preserved: `types` depends on nothing; `core/registry` does not depend on React; `renderer/core` does not depend on Ant Design; `designer` never depends on Renderer; `formily/adapter` does not depend on Designable. Business projects depend on the two public packages `@x-form-engine/sdk` and `@x-form-engine/components`, and must not depend on internal implementation packages such as `core`, `renderer`, or `formily`.

Three data classes are deliberately kept separate — do not collapse them:

- **Schema** — form structure/configuration (versioned, persisted).
- **Value** — stable business values (e.g. user IDs, not display names).
- **Snapshot** — frozen display information captured at submission for faithful history rendering.

Component identity is unified: one `FormComponentDefinition` drives designer material, PC/mobile editing, and readonly rendering; implementations map per platform and adapters handle value normalization/serialization/snapshot creation/restoration. Snapshot generation happens in `submit()`, which validates and returns `{ values, snapshot }` but never performs business HTTP itself.

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

## Implementation milestones (from the docs)

- **M0** — pin dependency versions; validate Formily/Designable APIs with minimal demos; freeze types/component/schema-value-snapshot contracts.
- **M1** — Types, Registry, Plugin, Runtime Context/Scope, Formily Adapter, PC Renderer, base components, minimal SDK.
- **M2** — Designable adapter + materials/setters (**done** — Designer closed loop).
- **M3** — Value / Snapshot / Readonly 闭环（**done**）：Value 规范化、稳定 fieldId/itemId、Candidate Snapshot、Canonical Snapshot 协议、Readonly 渲染器、Formatter 注册表、权限 fail-closed、历史 Schema/Snapshot 有序迁移。
- **M4** — Mobile renderer (**done**): `@x-form-engine/components/mobile` entry, seven P0 antd-mobile components + FormItem, per-field PC fallback diagnostics, `apps/mobile-demo`, and the mobile bundle-purity check.
- **M5** — Engineering and release (**open**): package builds, public API/type exports, unit/integration/E2E tests, Playground docs, versioning, and npm/workspace integration validation. Still open beyond it: asynchronous plugins, backend Canonical Snapshot integration, Devtools/diagnostics, E2E/compatibility/performance testing.

The architecture doc explicitly warns against building all business components, designer features, and backend snapshot protocols in the first phase; stabilize `types + component definition + registry/plugin + formily adapter` first.
