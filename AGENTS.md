# AGENTS.md

Guidance for coding agents working in this repository.

> This is the canonical instruction file for all coding agents. `CLAUDE.md` imports this file, so edits here take effect for both — do not duplicate instructions into `CLAUDE.md`.

## Repository state

This repo is an implemented pnpm monorepo (React + TypeScript + Formily 2.3). M1 is complete — the engine kernel, PC renderer, and base components across six packages (`types`, `core`, `formily`, `renderer`, `components`, `sdk`) plus `apps/playground`. M2's **Designer closed loop** is also complete — `packages/designer` (Designable 1.x adapter: materials, schema round-trip/import-export, bootstrap, preview, OptionsSetter) plus the `apps/designer-demo` full Workbench. Use `pnpm test:run` for the full Vitest suite, `pnpm -r typecheck` for all packages, and `pnpm --filter playground dev|build` / `pnpm --filter designer-demo dev|build` for the demo apps. Still remaining (M2 remainder / M3): Mobile and Readonly renderers, value/snapshot/datasource adapters, real Snapshot generation, schema/snapshot migration, and asynchronous plugins.

Documentation is written in Simplified Chinese with Mermaid diagrams; match that style when editing or adding docs.

## Documentation map

- `docs/tech-design/form-engine-architecture-design.md` — architecture baseline covering goals, layers, monorepo layout, domain models, compiler, all adapters, SDK, error handling, and milestones.
- `docs/tech-design/02-specs/README.md` — spec index and recommended review/implementation order.
- `01-types.md` … `10-testing-and-roadmap.md` — topic specs (types, component spec, registry/plugin, Formily adapter, renderer/SDK, runtime context, designer adapter, readonly renderer, value/snapshot, testing/roadmap).

Recommended order: freeze `01` + `02` (public contracts) → implement `03` + `04` (registry/plugin + Formily adapter kernel) → parallelize `05`–`07` → review `08`/`09` against real business components and backend storage.

Specs are **proposed contracts, not verified implementations**. Never present them as Formily/Designable native APIs; the docs repeatedly require validating exports, types, and runtime behavior against the pinned dependency versions before relying on them.

## Architecture at a glance

pnpm workspace, split by responsibility. **Implemented** (M1/M2): `types`, `core`, `formily`, `renderer`, `components`, `sdk`, `designer` + `apps/playground`, `apps/designer-demo`. **Planned**: `adapters`, `services`, `apps/renderer-demo`. `packages/schema` was merged into `packages/core` (M1 baseline).

| Package | Responsibility | Status |
|---|---|---|
| `packages/types` | Pure protocol types, domain models, error codes | implemented |
| `packages/core` | Registry, Plugin, Context, Scope, Events, Runtime, `x-engine` schema parser/validator | implemented |
| `packages/formily` | Formily adapter (component/decorator map + SchemaField) | implemented |
| `packages/renderer` | UI-agnostic render core, React entry, PC Renderer | implemented (PC only) |
| `packages/designer` | Designable 1.x adapter — materials, schema round-trip, bootstrap, preview, setters | implemented |
| `packages/components` | Shared component definitions + platform implementations | implemented |
| `packages/sdk` | Public consumer entry (`createFormEngine`, `FormEngineProvider`, `FormRenderer`, schema parse/validate) | implemented |
| `packages/adapters` | Value, snapshot, datasource adapters | planned (M2/M3) |
| `packages/services` | Datasource, permission, i18n, snapshot | planned (M3) |
| `apps/` | playground (M1 demo), designer-demo (M2 demo) | implemented |

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

## Implementation milestones (from the docs)

- **M0** — pin dependency versions; validate Formily/Designable APIs with minimal demos; freeze types/component/schema-value-snapshot contracts.
- **M1** — Types, Registry, Plugin, Runtime Context/Scope, Formily Adapter, PC Renderer, base components, minimal SDK.
- **M2** — Designable adapter + materials/setters (**done** — Designer closed loop); still open: Mobile renderer, datasource/value/snapshot adapters, schema/snapshot migration basics.
- **M3** — Plugin extension spec, permission/i18n services, Devtools/diagnostics, E2E/compat/performance testing, release and version governance.

The architecture doc explicitly warns against building all business components, designer features, and backend snapshot protocols in the first phase; stabilize `types + component definition + registry/plugin + formily adapter` first.
