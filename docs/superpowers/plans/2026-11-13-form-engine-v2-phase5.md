# Form Engine V2 Phase 5（Designable Adapter）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans 实施本计划。步骤使用 `- [ ]` 复选框语法跟踪。

**Goal:** 新增独立 `@x-form-engine/designer-designable` 包，把 Designable 隔离为 Adapter：实现 `DesignerMaterialDefinition → Designable Behavior/Resource`、`SetterDefinition → Designable Setter`、`TreeNode ↔ Schema` 双向转换、画布事件映射与 `DesignerAdapter`，并通过依赖检查证明 Designer Core 不感知 Designable。

**Architecture:** `designer-designable` 依赖 `designer-core` + Designable + antd + `@x-form-engine/components`（React host）。`deriveDesignerMaterials` 产出框架无关的 `DesignerMaterialDefinition[]`（含缺 pc 诊断），`createDesignableMaterialAdapter` 再转成 Designable host。现有 `packages/designer` 的 M2 闭环保持不变（Phase 9 统一切换）。

**Tech Stack:** React 17.0.2（`ReactDOM.render`）· Designable 1.0.0-beta.45 · antd 4.22.8 · TypeScript 5.9.3 · Vitest 3.2.7。

**Spec:**
- `docs/architecture/02-form-engine-v2-task.md` Phase 5（Task 5.1–5.6）
- `docs/architecture/01-form-engine-v2.md`（C3/C4/C5/C11/C13）
- `AGENTS.md`

## Global Constraints

- 禁止升级任何依赖版本；React 17 用 `ReactDOM.render`，不用 `createRoot`。
- Designer Core 不引用 Designable 类型；Designable 类型只出现在 `designer-designable`。
- 不破坏现有 M2 闭环（`packages/designer` 的 `createDesignerMaterials`/`createEngineDesigner`/`schema-io` 保持行为）。
- 物料缺 `implementations.pc` 必须显式诊断，不得静默跳过（C5）。
- Schema 往返不丢 Formily 原生字段 / `x-engine` 扩展 / 未知字段 / `designerMetadata`。
- 每个 Phase 有测试与验收报告。

## Review Focus

1. 缺 `implementations.pc` 的 binding 派生时产生诊断而非静默跳过（C5）。
2. `designerMetadata` 在导入→导出往返中不被丢弃（C1 端到端）。
3. 相同 `componentName` 的派生物料冲突产生诊断（Task 5.6）。
4. 画布事件映射不泄漏 Designable `TreeNode` 到 Designer Event（C11）。
5. `designer-designable` 不反向依赖 `designer-core` 的内部源码路径。

---

### Task 1: 包骨架 + `deriveDesignerMaterials`（Task 5.6）

**Files:**
- Create: `packages/designer-designable/package.json`、`tsconfig.json`、`vitest.config.ts`
- Create: `packages/designer-designable/src/derive-materials.ts`
- Test: `packages/designer-designable/src/derive-materials.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface DeriveMaterialsResult {
    materials: DesignerMaterialDefinition[];
    diagnostics: SchemaDiagnostic[];
  }
  function deriveDesignerMaterials(bindings: ReactComponentBinding[]): DeriveMaterialsResult;
  ```
  缺 `implementations.pc` → 诊断 `MATERIAL_PC_IMPLEMENTATION_MISSING`(warning) 并跳过；同名 `componentName` 冲突 → 诊断；正常物料含 `runtimeTarget: {kind:'component'}` 与 `designerComponent`（React host 转 `unknown`）。

- [ ] **Step 1: 建包骨架**（deps：`@x-form-engine/designer-core` + `@x-form-engine/types` + `@x-form-engine/components` + Designable 全家 + antd + react）
- [ ] **Step 2: 写失败测试**：缺 pc 诊断 / 正常派生（含 createSchema、runtimeTarget、designerComponent）/ 同名冲突诊断
- [ ] **Step 3: 运行确认失败**
- [ ] **Step 4: 实现 `deriveDesignerMaterials`**
- [ ] **Step 5: 运行确认通过**
- [ ] **Step 6: Commit**

### Task 2: `createDesignableMaterialAdapter`（Task 5.2）

**Files:**
- Create: `packages/designer-designable/src/material-adapter.ts`
- Test: `packages/designer-designable/src/material-adapter.test.ts`

**Interfaces:**
- Produces: `function createDesignableMaterialAdapter(materials: DesignerMaterialDefinition[]): DesignableMaterialMap;`（Designable host map，含 Field/Form/FormItem 基础宿主；Behavior selector 按 `x-component === componentName`；Resource 由 `createSchema` 生成）

- [ ] **Step 1: 写失败测试**：普通物料转 host（Behavior selector + Resource）/ 容器物料 / 纯设计器物料 / createSchema 结果保留 Formily 原生 + x-engine 字段
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现 `createDesignableMaterialAdapter`**
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: Commit**

### Task 3: `createDesignableSetterAdapter`（Task 5.3）

**Files:**
- Create: `packages/designer-designable/src/setter-adapter.ts`
- Test: `packages/designer-designable/src/setter-adapter.test.ts`

**Interfaces:**
- Produces: `function createDesignableSetterAdapter(setters: SetterDefinition[]): Record<string, ComponentType<unknown>>;`（`SetterBinding.name` ↔ 注册 Setter；`value`/`onChange` 语义一致；不存在 Setter 有诊断）

- [ ] **Step 1: 写失败测试**：Setter 转组件 map / binding.props 透传 / 不存在 Setter 诊断
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现 `createDesignableSetterAdapter`**
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: Commit**

### Task 4: Schema ↔ TreeNode 往返 + designerMetadata（Task 5.4）

**Files:**
- Create: `packages/designer-designable/src/schema-adapter.ts`
- Modify: `packages/core/src/schema/parser.ts`（`parseSchemaDocument` 保留 `designerMetadata`）
- Test: `packages/designer-designable/src/schema-adapter.test.ts` + `packages/core/src/schema/schema.test.ts`（补 designerMetadata 用例）

**Interfaces:**
- Produces: `schemaDocumentToTree(doc: FormSchemaDocument): TreeNode;` / `treeToSchemaDocument(tree: TreeNode, options: {schemaId; previousVersion?; designerMetadata?}): FormSchemaDocument;`

- [ ] **Step 1: 写失败测试**：往返保留 Formily 原生 / x-engine / 未知字段 / designerMetadata / componentName / 字段路径 / 默认值
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 修 `parseSchemaDocument` 保留 designerMetadata**
- [ ] **Step 4: 实现 `schema-adapter.ts`**
- [ ] **Step 5: 运行确认通过**
- [ ] **Step 6: Commit**

### Task 5: 画布事件 → DesignerEvent 映射（Task 5.5）

**Files:**
- Create: `packages/designer-designable/src/events.ts`
- Test: `packages/designer-designable/src/events.test.ts`

**Interfaces:**
- Produces: `function mapCanvasEventToDesignerEvent(type: string, payload: unknown): DesignerEvent | null;`（`node:select/unselect/add/remove/move/update`、`schema:change`；不返回 TreeNode）

- [ ] **Step 1: 写失败测试**：各类画布事件映射、未知事件返回 null、结果不含 TreeNode
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现 `events.ts`**
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: Commit**

### Task 6: `createDesignableAdapter`（Task 5.1）

**Files:**
- Create: `packages/designer-designable/src/adapter.ts`、`src/index.ts`
- Test: `packages/designer-designable/src/adapter.test.ts`

**Interfaces:**
- Produces: `function createDesignableAdapter(options?: CreateDesignableAdapterOptions): DesignerAdapter;` 其中 `createWorkspace(context)` 返回 `DesignerWorkspace`（`setSchema`/`getSchema` 走 TreeNode↔Schema；`subscribe` 返回退订；`mount`/`unmount` 用 ReactDOM.render 渲染最小画布）

- [ ] **Step 1: 写失败测试**：createWorkspace 返回 workspace；setSchema/getSchema 往返；subscribe 退订；unmount 幂等
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现 `adapter.ts` + `index.ts`**
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: Commit**

### Task 7: 依赖检查 + 全量验证

**Files:**
- Create: `packages/designer-designable/src/__tests__/no-designer-core-internals.test.ts`
- Create: `docs/tech-design/phase-5-designer-designable.md`

- [ ] **Step 1: 写依赖守卫**：不反向依赖 `designer-core` 内部源码路径；Designable 只在 adapter 内
- [ ] **Step 2: 运行 `pnpm --filter @x-form-engine/designer-designable` test/typecheck/build**
- [ ] **Step 3: 运行 `pnpm -r typecheck` 与 `pnpm test:run` 确认无回归**
- [ ] **Step 4: 写 Phase 5 报告**
- [ ] **Step 5: Commit**
