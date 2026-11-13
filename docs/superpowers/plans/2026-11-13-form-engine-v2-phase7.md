# Form Engine V2 Phase 7（Material → Schema → Runtime 一致性闭环）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans 实施本计划。步骤使用 `- [ ]` 复选框语法跟踪。

**Goal:** 落地 Material → Schema → Runtime 一致性校验（C10）：把 `collectSchemaComponentRefs` 收敛到 `core`，新增 `checkSchemaComponentRegistrations` / `checkMaterialRuntimeTarget` 两个 UI 无关的校验函数，并新增 Contract Tests 验证基础物料生成的 Schema 能被 Runtime 解析、缺失能力明确报错。

**Architecture:** 一致性校验函数放 `@x-form-engine/core/src/schema/`（引擎内核：Registry + Schema），UI 无关；`collectSchemaComponentRefs` 从 `renderer` 迁到 core 并 re-export（renderer 生产代码从此依赖 core，方向合法）。Contract Tests 放 `designer-designable`（jsdom + React，已依赖 core/components），新增 `@x-form-engine/materials-basic` devDep 以使用真实 `basicMaterials`。

**Tech Stack:** TypeScript 5.9.3 · Vitest 3.2.7 · React 17（Contract Tests 用 jsdom）。

**Spec:**
- `docs/architecture/02-form-engine-v2-task.md` Phase 7（Task 7.1–7.4）
- `docs/architecture/01-form-engine-v2.md`（C10）
- `AGENTS.md`（#2 冲突严格、#7 依赖边界）

## Global Constraints

- 校验函数 UI 无关，只依赖 `types`（`SchemaDiagnostic` / `DesignerMaterialDefinition`）。
- 不得只检查组件名称字符串相等，必须走 `ComponentBinding` 实际映射（`collectSchemaComponentRefs` 遍历 `properties`/`items` + `engine.registry.components`）。
- 缺失组件/装饰器/平台实现必须产生诊断，不静默跳过（C5）。
- 不升级依赖；不新建空壳包。

## Review Focus

1. Schema 引用未注册组件/装饰器时产生 `error` 诊断（而非静默渲染 void 字段）。
2. Material 的 `component` target `componentName` 未注册时产生 `error` 诊断。
3. `designer-only` 物料不会被当作 Runtime 组件校验/导出。
4. 基础物料 `createSchema` 的 `x-component` 全部能被 Runtime `basicComponents` 命中。
5. Schema 往返保留 Material 属性（`x-component-props`/默认值）。

---

### Task 1: 迁移 `collectSchemaComponentRefs` 到 core

**Files:**
- Create: `packages/core/src/schema/diagnostics.ts`（`collectSchemaComponentRefs` + `SchemaComponentRefs`）
- Modify: `packages/renderer/src/diagnostics.ts`（改为 re-export + 保留 `filterDiagnosticsBySchema`）
- Modify: `packages/renderer/package.json`（`@x-form-engine/core` 从 devDependencies 移到 dependencies）

**Interfaces:**
- Produces: `@x-form-engine/core` 导出 `collectSchemaComponentRefs(schema): { components: Set<string>; decorators: Set<string> }`；`renderer` 保持 `collectSchemaComponentRefs`/`filterDiagnosticsBySchema` 公开签名不变。

- [ ] **Step 1: 把函数迁到 core，renderer 改为 re-export**
- [ ] **Step 2: 运行 core + renderer 现有测试确认无回归**
- [ ] **Step 3: Commit**

### Task 2: 一致性校验函数（Task 7.1/7.3）

**Files:**
- Create: `packages/core/src/schema/consistency.ts`
- Test: `packages/core/src/schema/consistency.test.ts`

**Interfaces:**
- Produces:
  ```ts
  function checkSchemaComponentRegistrations(
    schema: unknown,
    components: ReadonlySet<string>,
    decorators: ReadonlySet<string>
  ): SchemaDiagnostic[];

  function checkMaterialRuntimeTarget(
    material: DesignerMaterialDefinition,
    components: ReadonlySet<string>
  ): SchemaDiagnostic[];
  ```

- [ ] **Step 1: 写失败测试**：schema 引用未注册组件 → `COMPONENT_NOT_REGISTERED`(error)；未注册装饰器 → `DECORATOR_NOT_REGISTERED`；material 缺 runtimeTarget → warning；`component` target 未注册 → `MATERIAL_COMPONENT_NOT_REGISTERED`(error)；`designer-only` → 不产生注册诊断
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现 `consistency.ts`**
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: Commit**

### Task 3: Contract Tests（Task 7.4）

**Files:**
- Create: `packages/designer-designable/src/__tests__/contract.test.ts`
- Modify: `packages/designer-designable/package.json`（devDependencies 增 `@x-form-engine/materials-basic`）

**Interfaces:**
- Consumes: `basicMaterials`（materials-basic）、`basicComponents`（components）、`createFormEngine`/`validateEngineSchema`/`parseSchemaDocument`/`checkSchemaComponentRegistrations`（core）、`treeToSchemaDocument`/`schemaDocumentToTree`（self）

- [ ] **Step 1: 写失败测试**（Task 7.4 九项）：
  1. 基础 Material 均生成合法 Schema（`validateEngineSchema.valid`）
  2. `component` target 能找到 Runtime Binding（`checkSchemaComponentRegistrations` 空诊断）
  3. `schema-container` 生成合法容器 Schema
  4. `designer-only` 不产生 Runtime 注册校验（不报组件未注册）
  5. 导出 Schema 被 `parseSchemaDocument` / `validateEngineSchema` 接受
  6. 缺 Runtime 组件 → `COMPONENT_NOT_REGISTERED`
  7. Material 属性映射到 Schema 后不丢（`x-component-props`/默认值）
  8. Schema 导入后恢复设计器状态（TreeNode 结构一致）
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 运行确认通过（补齐实现如有偏差）**
- [ ] **Step 4: Commit**

### Task 4: 全量验证 + 报告

- [ ] **Step 1: 三包 test/typecheck**
- [ ] **Step 2: `pnpm -r typecheck` + `pnpm test:run`**
- [ ] **Step 3: 写 Phase 7 报告**
- [ ] **Step 4: Commit**
