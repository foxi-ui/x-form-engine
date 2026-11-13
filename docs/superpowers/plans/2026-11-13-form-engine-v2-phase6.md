# Form Engine V2 Phase 6（基础物料 / Setter / Plugin）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans 实施本计划。步骤使用 `- [ ]` 复选框语法跟踪。

**Goal:** 新增 `@x-form-engine/materials-basic`、`@x-form-engine/setters-basic`、`@x-form-engine/plugins-basic` 三个基础扩展包，基于 Phase 5 的 `DesignerMaterialDefinition`/`SetterDefinition`/`DesignerPlugin` 协议提供基础物料、基础 Setter 与基础插件，构建「可拖入/修改/删除 + Schema 导入导出」的基础设计器闭环。

**Architecture:** 三个包都只依赖公开协议（`types`）+ 各自最小运行时依赖，不直接操作 Designable。`materials-basic` 承载框架无关的 `deriveDesignerMaterials`（从 `designer-designable` 迁来，消除其对 Designable 的传递依赖）并导出 `basicMaterials`；`setters-basic` 用 antd4 实现受控 Setter；`plugins-basic` 用 `DesignerPlugin` 注册面板/工具栏/Schema 命令。

**Tech Stack:** React 17.0.2 · antd 4.22.8 · TypeScript 5.9.3 · Vitest 3.2.7。

**Spec:**
- `docs/architecture/02-form-engine-v2-task.md` Phase 6（Task 6.1–6.3）
- `docs/architecture/01-form-engine-v2.md`（C4/C9/C10/C11）
- `AGENTS.md`

## Global Constraints

- 基础物料通过 `DesignerMaterialDefinition` 注册，声明 `MaterialRuntimeTarget`，物料 `createSchema` 可被现有 Runtime 渲染。
- 基础 Setter 基于 `SetterDefinition`，受控（`value`/`onChange`），支持 `disabled`/`readonly`，UI 用 antd4，不依赖 Designable。
- 基础 Plugin 基于 `DesignerPlugin`，复用 Phase 4 的 Panel/Command/Toolbar Registry，不重新实现平行功能。
- 不直接操作 Designable；不依赖高级 Setter/Plugin；不升级依赖。
- `basicComponents` 现有 7 组件（无 Switch/Divider/Grid），「以现有组件能力为准」。

## Review Focus

1. `basicMaterials` 每个物料都有 `runtimeTarget` 且 `createSchema` 能被 Runtime 的 `validateEngineSchema`/Formily 组件映射接受（C10）。
2. Setter 受控：外部 `value` 变化后 UI 随之更新，`onChange` 以新值回写；`disabled`/`readonly` 生效。
3. Plugin 重复安装抛 `PLUGIN_CONFLICT`；注册的资源归属插件、卸载清理。
4. `materials-basic` 不依赖 Designable（框架无关）；`deriveDesignerMaterials` 迁出 `designer-designable` 后其公共 API 仍可用。
5. JSON Setter 对非法 JSON 不崩溃。

---

### Task 1: `materials-basic` 包 + 迁移 `deriveDesignerMaterials`（Task 6.1）

**Files:**
- Create: `packages/materials-basic/{package.json,tsconfig.json,vitest.config.ts}`
- Create: `packages/materials-basic/src/derive-materials.ts`（从 `designer-designable` 迁来）、`src/index.ts`
- Modify: `packages/designer-designable/src/index.ts`（改为 re-export `deriveDesignerMaterials` 自 materials-basic）
- Delete: `packages/designer-designable/src/derive-materials.ts`
- Test: `packages/materials-basic/src/derive-materials.test.ts`（迁来）、`src/basic-materials.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // @x-form-engine/materials-basic
  function deriveDesignerMaterials(bindings: ReactComponentBinding[]): { materials: DesignerMaterialDefinition[]; diagnostics: SchemaDiagnostic[] };
  const basicMaterials: DesignerMaterialDefinition[];  // = deriveDesignerMaterials(basicComponents).materials（7 个）
  ```

- [ ] **Step 1: 建包骨架**（deps：`@x-form-engine/types` + `@x-form-engine/components`，无 Designable）
- [ ] **Step 2: 迁 `derive-materials.ts` 到 materials-basic**，`designer-designable/src/index.ts` 改为 re-export
- [ ] **Step 3: 写 `basic-materials.test.ts`**（7 物料、均有 runtimeTarget、createSchema 经 `validateEngineSchema` 通过、x-component 与组件名一致）
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: Commit**

### Task 2: `setters-basic` 包（Task 6.2）

**Files:**
- Create: `packages/setters-basic/{package.json,tsconfig.json,vitest.config.ts}`
- Create: `packages/setters-basic/src/basic-setters.tsx`、`src/index.ts`
- Test: `packages/setters-basic/src/basic-setters.test.tsx`

**Interfaces:**
- Produces: `basicSetters: SetterDefinition[]`（StringSetter/NumberSetter/BooleanSetter/SelectSetter/RadioSetter/JSONSetter/ArraySetter，均受控 + disabled/readonly）

- [ ] **Step 1: 建包骨架**（deps：`@x-form-engine/types` + antd + react）
- [ ] **Step 2: 写失败测试**：每个 Setter 受控（value→UI、onChange 回写）、disabled/readonly、JSON 非法输入不崩溃
- [ ] **Step 3: 运行确认失败**
- [ ] **Step 4: 实现 7 个 Setter**
- [ ] **Step 5: 运行确认通过**
- [ ] **Step 6: Commit**

### Task 3: `plugins-basic` 包（Task 6.3）

**Files:**
- Create: `packages/plugins-basic/{package.json,tsconfig.json,vitest.config.ts}`
- Create: `packages/plugins-basic/src/{plugins.ts,index.ts}`
- Test: `packages/plugins-basic/src/plugins.test.ts`

**Interfaces:**
- Produces: `basicPlugins: DesignerPlugin[]`（属性面板 / 组件面板 / 工具栏 / Schema 导入导出命令，经 Panel/Toolbar/Command Registry 注册）

- [ ] **Step 1: 建包骨架**（deps：`@x-form-engine/designer-core` + `@x-form-engine/types` + react）
- [ ] **Step 2: 写失败测试**：安装进 `createDesigner({plugins: basicPlugins})` 后 panels/toolbars/commands 已注册；重复安装抛 `PLUGIN_CONFLICT`；卸载清理
- [ ] **Step 3: 运行确认失败**
- [ ] **Step 4: 实现 plugins**
- [ ] **Step 5: 运行确认通过**
- [ ] **Step 6: Commit**

### Task 4: 依赖检查 + 全量验证 + 报告

**Files:**
- Create: `packages/materials-basic/src/__tests__/no-designable-dep.test.ts`
- Create: `docs/tech-design/phase-6-basic-extensions.md`

- [ ] **Step 1: 写依赖守卫**：materials-basic 不依赖 Designable；setters-basic 不依赖 Designable；plugins-basic 不依赖 Designable/Runtime
- [ ] **Step 2: 三包 test/typecheck/build**
- [ ] **Step 3: `pnpm -r typecheck` + `pnpm test:run` 全量**
- [ ] **Step 4: 写 Phase 6 报告**
- [ ] **Step 5: Commit**
