# Form Engine V2 Phase 4（Designer Core）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans 实施本计划。步骤使用 `- [ ]` 复选框语法跟踪。

**Goal:** 新增独立 `@x-form-engine/designer-core` 包，实现 Material/Setter/Panel/Command/Toolbar Registry、Designer Plugin Host（复用 Generic Plugin Core）、SchemaEditor、DesignerEngine，并通过 C13 依赖检查（不依赖 Designable/antd/Runtime Renderer/FormEngine）。

**Architecture:** `designer-core` 只依赖 `@x-form-engine/types`（协议）+ `@x-form-engine/core`（仅 Generic Plugin Core 与 `createEventBus`）。设计器注册表实现 `DesignerRegistry<T>`（公开）与 `PluginResourceRegistry`（供泛型插件宿主做资源归属）两套接口；Plugin Host 直接复用 `createGenericPluginHost`，不复制 Runtime 实现。

**Tech Stack:** TypeScript 5.9.3 · Vitest 3.2.7 · pnpm 10.34.5。本阶段 designer-core 无 React 依赖（所有 UI 字段为 `unknown`）。

**Spec:**
- `docs/architecture/02-form-engine-v2-task.md` Phase 4（Task 4.1–4.7）
- `docs/architecture/01-form-engine-v2.md`（C3/C4/C5/C9/C11/C13）
- `AGENTS.md`（非协商约束 #2/#3/#7 及「Form Engine V2 已确认约束」）

## Global Constraints

- 禁止擅自升级任何依赖版本。
- 禁止复制 Runtime Plugin Manager 实现（复用 `createGenericPluginHost`）。
- 禁止 `designer-core` 依赖 Designable/antd/antd-mobile/`@x-form-engine/renderer`/`@x-form-engine/formily`/`@x-form-engine/components`；不 import `FormEngine`/`createFormEngine`/`createPluginManager`/`createEngineRegistry` 等 Runtime 符号。
- Registry 冲突严格：同名重复注册抛 `PLUGIN_CONFLICT`；卸载只移除插件自身归属资源。
- 不建空壳包/空目录；`DesignerContext` 映射到已存在的 `DesignerPluginContext`/`DesignerAdapterContext`，不新造类型。
- 所有公开 API 有类型与测试。

## Review Focus

1. Material 缺 `runtimeTarget` 或 `component` target 的 `componentName` 与物料 `componentName` 不一致时，必须产生诊断而非静默跳过（C10）。
2. 未注册 Setter 的 `resolve` 结果必须可诊断、不静默丢弃（C5）。
3. 插件卸载只清理自身资源，不误删同名其它来源；依赖插件仍被依赖时卸载必须抛 `PLUGIN_DEPENDENCY_ACTIVE`。
4. `createDesigner` 不装 Adapter 也能实例化；`destroy()` 幂等并释放插件资源。
5. `designer-core` 源码不得 import Designable/antd/renderer 或 Runtime 符号（C13，源码级扫描守卫）。

---

### Task 1: 包骨架 + 导出 Generic Plugin Core

**Files:**
- Create: `packages/designer-core/package.json`、`packages/designer-core/tsconfig.json`、`packages/designer-core/vitest.config.ts`
- Modify: `packages/core/src/index.ts`（新增 `export * from './plugin/generic/plugin-host';`）
- Test: `packages/core/src/plugin/generic/no-business-deps.test.ts`（已存在，确认不回归）

**Interfaces:**
- Produces: `@x-form-engine/core` 公开导出 `createGenericPluginHost`/`GenericPluginHost`/`PluginResourceRegistry`/`InstallablePlugin`；`@x-form-engine/designer-core` 包可被 workspace 解析。

- [ ] **Step 1: 建包骨架**：`package.json`（name `@x-form-engine/designer-core`、deps `@x-form-engine/types` + `@x-form-engine/core`，无 React）、`tsconfig.json`（extends 基座、include `src`）、`vitest.config.ts`（name `@x-form-engine/designer-core`、node 环境）
- [ ] **Step 2: 在 `core/src/index.ts` 追加导出 Generic Plugin Core**
- [ ] **Step 3: 运行** `pnpm --filter @x-form-engine/core test:run` 与 `pnpm --filter @x-form-engine/core typecheck` 确认无回归
- [ ] **Step 4: Commit** `chore(designer-core): 包骨架 + 导出 Generic Plugin Core`

### Task 2: NamedRegistry 共享基类 + MaterialRegistry（Task 4.1）

**Files:**
- Create: `packages/designer-core/src/registry/named-registry.ts`、`packages/designer-core/src/registry/material-registry.ts`
- Test: `packages/designer-core/src/registry/named-registry.test.ts`、`packages/designer-core/src/registry/material-registry.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // named-registry.ts
  interface NamedRegistry<T extends { name: string }> {
    register(def: T): void;
    registerMany(defs: T[]): void;
    unregister(name: string, source?: string): void;
    get(name: string): T | undefined;
    getAll(): T[];
    has(name: string): boolean;
    list(): Array<{ name: string; source?: string }>;
  }
  function createNamedRegistry<T extends { name: string }>(): NamedRegistry<T>;

  // material-registry.ts
  interface MaterialRegistryImpl extends NamedRegistry<DesignerMaterialDefinition> {
    getByCategory(category: string): DesignerMaterialDefinition[];
    clear(): void;
    getDiagnostics(): SchemaDiagnostic[];
  }
  function createMaterialRegistry(): MaterialRegistryImpl;
  ```

- [ ] **Step 1: 写失败测试**（`named-registry.test.ts`）：注册/重复注册抛 `PLUGIN_CONFLICT`/批量/查询不存在 `undefined`/`getAll`/`has`/`list` 返回 `{name,source}`/`unregister` 幂等与 source 校验
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现 `createNamedRegistry`**（Map 存储 + `{def,source,registeredAt}`，严格重复冲突）
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: 写失败测试**（`material-registry.test.ts`，覆盖 Task 4.1 九用例）：注册/重复/批量/查询不存在/按分类/卸载/插件卸载清理（用 `list` 模拟归属）/纯设计器物料/无 `runtimeTarget` 产生诊断 + `component` target `componentName` 不一致产生诊断
- [ ] **Step 6: 运行确认失败**
- [ ] **Step 7: 实现 `createMaterialRegistry`**（在 NamedRegistry 上叠加 `getByCategory`/`clear`/`getDiagnostics`，注册时校验 `runtimeTarget`：缺 → `MATERIAL_RUNTIME_TARGET_MISSING`(warning)；`component` 且 `componentName` 不一致 → `MATERIAL_RUNTIME_TARGET_MISMATCH`(error)）
- [ ] **Step 8: 运行确认通过**
- [ ] **Step 9: Commit** `feat(designer-core): NamedRegistry + MaterialRegistry`

### Task 3: SetterRegistry + resolve（Task 4.2）

**Files:**
- Modify: `packages/types/src/designer.ts`（`SetterRegistry` 增补 `resolve(binding: SetterBinding): SetterResolveResult`）
- Modify: `packages/types/src/__tests__/designer-types.test.ts`（补 `resolve` 类型断言）
- Create: `packages/designer-core/src/registry/setter-registry.ts`
- Test: `packages/designer-core/src/registry/setter-registry.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // setter-registry.ts
  interface SetterRegistryImpl extends NamedRegistry<SetterDefinition> {
    resolve(binding: SetterBinding): SetterResolveResult;
  }
  function createSetterRegistry(): SetterRegistryImpl;
  ```

- [ ] **Step 1: 写失败类型断言**（types 测试）：`SetterRegistry['resolve']` 存在且返回 `SetterResolveResult`
- [ ] **Step 2: 运行确认失败（类型错）**
- [ ] **Step 3: 在 `types/designer.ts` 给 `SetterRegistry` 增补 `resolve`**
- [ ] **Step 4: 运行 types typecheck 确认通过**
- [ ] **Step 5: 写失败测试**（`setter-registry.test.ts`，覆盖 Task 4.2 八用例）：注册基础/重复/批量/查询卸载/插件卸载清理/不存在 Setter 的 `resolve` 返回 `found:false`+诊断/`defaultProps` 保留/`validate` 可调用
- [ ] **Step 6: 运行确认失败**
- [ ] **Step 7: 实现 `createSetterRegistry`**（`resolve` 查 `binding.name`，未注册 → `{found:false, binding, diagnostics:[SETTER_NOT_FOUND(warning)]}`；命中 → `{found:true, setter, binding, diagnostics:[]}`）
- [ ] **Step 8: 运行确认通过**
- [ ] **Step 9: Commit** `feat(designer-core): SetterRegistry + resolve`

### Task 4: Panel/Command/Toolbar Registry（Task 4.3）

**Files:**
- Create: `packages/designer-core/src/registry/panels.ts`（或并入 engine.ts 用 `createNamedRegistry` 实例化）
- Test: 在 `named-registry.test.ts` 或独立 `panels.test.ts` 覆盖注册/卸载/排序字段稳定

**Interfaces:**
- Produces: `createNamedRegistry<PanelDefinition>()`/`<CommandDefinition>()`/`<ToolbarDefinition>()` 的最小能力实例。

- [ ] **Step 1: 写失败测试**：Panel/Command/Toolbar 各 `register`/`get`/`getAll`/`unregister`，验证排序字段（`order`）稳定、无 UI 实现写入 Core
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现**（`createNamedRegistry` 泛型实例化三处）
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: Commit** `feat(designer-core): Panel/Command/Toolbar Registry`

### Task 5: SchemaEditor（Task 4.5）

**Files:**
- Create: `packages/designer-core/src/schema/schema-editor.ts`
- Test: `packages/designer-core/src/schema/schema-editor.test.ts`

**Interfaces:**
- Produces: `function createSchemaEditor(initial?: FormSchemaDocument): SchemaEditor;`（`getDocument`/`update` 不可变更新+通知/`subscribe` 返回退订）

- [ ] **Step 1: 写失败测试**：`getDocument` 返回初始文档 / `update` 应用 updater 并通知订阅者 / `subscribe` 返回退订、退订后不再通知 / 默认文档含 `engineSchemaVersion`
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现 `createSchemaEditor`**
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: Commit** `feat(designer-core): SchemaEditor`

### Task 6: Designer Plugin Host（Task 4.4）

**Files:**
- Create: `packages/designer-core/src/plugin/plugin-host.ts`
- Test: `packages/designer-core/src/plugin/plugin-host.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface DesignerPluginHostDeps {
    materials: NamedRegistry<DesignerMaterialDefinition>;
    setters: NamedRegistry<SetterDefinition>;
    panels: NamedRegistry<PanelDefinition>;
    commands: NamedRegistry<CommandDefinition>;
    toolbars: NamedRegistry<ToolbarDefinition>;
    events: DesignerEventBus;
    schema: SchemaEditor;
    getEngine(): DesignerEnginePublicAPI;
  }
  function createDesignerPluginHost(deps: DesignerPluginHostDeps): DesignerPluginHost;
  ```

- [ ] **Step 1: 写失败测试**（覆盖 Task 4.4 必须项 + 特别测试）：A 依赖 B 先装 B 再装 A / 依赖缺失安装失败 / 安装抛异常回滚已注册资源 / 卸载不误删其它插件资源 / 多次卸载不重复释放 / 依赖插件仍被依赖时卸载抛 `PLUGIN_DEPENDENCY_ACTIVE` / `disposeAll` 逆序幂等
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现 `createDesignerPluginHost`**：`createGenericPluginHost<DesignerPlugin, DesignerPluginContext>`，`createContext` 注入五类 Registry + `events`/`schema`/`engine`（`getEngine()` 惰性），`resources` 传五类 Registry；包装返回 `DesignerPluginHost`（`install`/`uninstall`/`list`/`disposeAll`）
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: Commit** `feat(designer-core): Designer Plugin Host`

### Task 7: DesignerEngine + createDesigner（Task 4.6）

**Files:**
- Create: `packages/designer-core/src/engine.ts`、`packages/designer-core/src/index.ts`
- Test: `packages/designer-core/src/engine.test.ts`

**Interfaces:**
- Produces: `function createDesigner(options?: CreateDesignerOptions): DesignerEnginePublicAPI;` + `index.ts` 全量导出。

- [ ] **Step 1: 写失败测试**：不装 Adapter 可实例化并注册 Material/Setter / `createDesigner({materials, setters, plugins})` 注入并安装插件 / `use(adapter)` 存 adapter / `destroy()` 幂等、释放插件（`plugins.list()` 全部 inactive）并抛 `ENGINE_DISPOSED` 后续操作
- [ ] **Step 2: 运行确认失败**
- [ ] **Step 3: 实现 `createDesigner`**：惰性构造 Plugin Host（`getEngine` 闭包解循环引用）、注册初始 material/setter、安装插件、`use`/`destroy`
- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: Commit** `feat(designer-core): createDesigner 引擎`

### Task 8: 依赖图检查（Task 4.7）+ 全量验证

**Files:**
- Create: `packages/designer-core/src/__tests__/no-designable-runtime-deps.test.ts`
- Modify: `packages/designer-core/package.json`（若 build 脚本需要）

**Interfaces:**
- Produces: C13 依赖检查通过；`@x-form-engine/designer-core` 独立 typecheck/test/build。

- [ ] **Step 1: 写失败测试**：源码扫描断言 designer-core 不 import `@designable/*`/`antd`/`antd-mobile`/`@x-form-engine/renderer`/`@x-form-engine/formily`/`@x-form-engine/components`，且不引用 `FormEngine`/`createFormEngine`/`createPluginManager`/`createEngineRegistry`（复用 `no-react-deps.test.ts` 的扫描模式）
- [ ] **Step 2: 运行确认失败（若误依赖，则修正）**
- [ ] **Step 3: 运行** `pnpm --filter @x-form-engine/designer-core test:run`、`pnpm --filter @x-form-engine/designer-core typecheck`、`pnpm --filter @x-form-engine/designer-core build`
- [ ] **Step 4: 运行** `pnpm -r typecheck` 与 `pnpm test:run` 确认全仓无回归
- [ ] **Step 5: 更新 `docs/tech-design/phase-4-designer-core.md` 报告**
- [ ] **Step 6: Commit** `feat(designer-core): 依赖检查 + Phase 4 报告`
