# Form Engine V2 Phase 8（高级扩展示例）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans 实施本计划。步骤使用 `- [ ]` 复选框语法跟踪。

**Goal:** 新增 `@x-form-engine/setters-advanced` 与 `@x-form-engine/plugins-advanced` 两个高级扩展包，验证第三方通过公开 `SetterRegistry` / `DesignerPlugin` / `SchemaEditor` 扩展，不访问 Core 私有字段、不复制基础能力。

**Architecture:** `setters-advanced` 提供 `ExpressionSetter`（受控 + 表达式校验）作为 `SetterDefinition[]`；`plugins-advanced` 提供 `expressionConfigPlugin`（`DesignerPlugin`），安装时经公开 `SetterRegistry` 注册 Setter，并经 `SchemaEditor` 提供「应用表达式」命令，生成 Formily 原生 `x-reactions` 扩展数据、保留原生字段。

**Tech Stack:** React 17.0.2 · antd 4.22.8 · TypeScript 5.9.3 · Vitest 3.2.7。

**Spec:**
- `docs/architecture/02-form-engine-v2-task.md` Phase 8（Task 8.1–8.2）
- `docs/architecture/01-form-engine-v2.md`
- `AGENTS.md`（#2 x-engine 唯一命名空间、#7 公开 API 稳定）

## Global Constraints

- 高级 Setter 独立于基础包；用公开 `SetterRegistry` 注册，不访问 Core 私有字段。
- 只通过 `SchemaEditor` / Adapter 修改 Schema；保留 Formily 原生属性。
- 生成符合 `x-engine` 规范的扩展数据（未知 `x-engine` 键会告警，故表达式放 Formily 原生 `x-reactions`）。
- 不升级依赖；不建空壳包。

## Review Focus

1. ExpressionSetter 校验表达式 `{{ }}` 平衡，非法值返回 `valid:false` 而非崩溃。
2. 插件安装/卸载后 Setter 注册与清理归属插件（重复安装抛 `PLUGIN_CONFLICT`）。
3. `apply-expression` 命令只通过 `SchemaEditor.update` 修改 Schema，且保留 Formily 原生字段。
4. 高级包不依赖基础包（setters-basic / plugins-basic / materials-basic）。
5. 高级 Setter 不依赖 Designable。

---

### Task 1: `setters-advanced` 包（Task 8.1）

**Files:**
- Create: `packages/setters-advanced/{package.json,tsconfig.json,vitest.config.ts,vitest.setup.ts}`
- Create: `packages/setters-advanced/src/{expression-setter.tsx,index.ts}`
- Test: `packages/setters-advanced/src/expression-setter.test.tsx`

**Interfaces:**
- Produces: `ExpressionSetter`（受控 TextArea + `validate` 校验 `{{ }}` 平衡）、`advancedSetters: SetterDefinition[]`

- [ ] **Step 1: 建包骨架**（deps：`@x-form-engine/types` + antd + react）
- [ ] **Step 2: 写失败测试**：受控渲染/onChange、validate 平衡通过、不平衡返回 valid:false
- [ ] **Step 3: 运行确认失败**
- [ ] **Step 4: 实现 ExpressionSetter + advancedSetters**
- [ ] **Step 5: 运行确认通过**
- [ ] **Step 6: Commit**

### Task 2: `plugins-advanced` 包（Task 8.2）

**Files:**
- Create: `packages/plugins-advanced/{package.json,tsconfig.json,vitest.config.ts}`
- Create: `packages/plugins-advanced/src/{plugins.ts,index.ts}`
- Test: `packages/plugins-advanced/src/plugins.test.ts`

**Interfaces:**
- Produces: `expressionConfigPlugin: DesignerPlugin`（注册 Setter + `apply-expression` 命令）、`advancedPlugins: DesignerPlugin[]`

- [ ] **Step 1: 建包骨架**（deps：`@x-form-engine/designer-core` + `@x-form-engine/types` + `@x-form-engine/setters-advanced`）
- [ ] **Step 2: 写失败测试**：安装进 `createDesigner` 后 setter 已注册 + 命令已注册；`apply-expression` 经 SchemaEditor 写入 `x-reactions` 且保留原生字段；卸载清理 setter；重复安装抛 `PLUGIN_CONFLICT`
- [ ] **Step 3: 运行确认失败**
- [ ] **Step 4: 实现 expressionConfigPlugin**
- [ ] **Step 5: 运行确认通过**
- [ ] **Step 6: Commit**

### Task 3: 全量验证 + 报告

- [ ] **Step 1: 两包 test/typecheck/build**
- [ ] **Step 2: `pnpm -r typecheck` + `pnpm test:run`**
- [ ] **Step 3: 写 Phase 8 报告**
- [ ] **Step 4: Commit**
