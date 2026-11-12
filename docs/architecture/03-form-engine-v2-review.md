# Form Engine V2 架构文档审核报告

> 审核对象：`01-form-engine-v2.md`（融合架构设计方案）、`02-form-engine-v2-task.md`（改造任务书）
> 审核方式：grilling 决策树访谈 + 三路源码审计（仓库结构与类型 / designer 耦合点 / Registry·Plugin·Readonly 现状）
> 审核日期：2026-11-12
> 结论：**技术基线与组件模型命名正确，但「范围定性」和若干「现有能力」表述与代码不符，须按 C1–C9 修正后方可作为执行基线。**

---

## 1. 审核范围与方法

本次审核目标：判断两份 V2 文档能否作为下一阶段改造的执行基线，以及它们对当前仓库现状的断言是否成立。

方法分两层：

1. **事实层**：派三个独立子代理对源码做只读审计，逐项核对文档对「现有能力 / 现有模块 / 现有命名」的断言，产出 `file:line` 级别的证据。事实由代码决定，不采信文档或 AGENTS.md 的单方面表述。
2. **决策层**：用 grilling 把文档隐含的设计决策拆成决策树，逐轮逼问文档作者，直到每项决策都显式锁定（Q1–Q9）。

权威原则沿用仓库既有规则：**代码 > 文档**。凡文档与 `packages/` 源码冲突处，一律以源码为准。

---

## 2. 事实核查结论（文档 vs 代码）

### 2.1 文档正确之处

| 断言 | 核实结果 |
|---|---|
| 组件模型叫 `ComponentBinding` / `ComponentProtocolDefinition` / `ComponentAdapter` | ✅ 均真实存在于 `packages/types/src/component.ts`（`:47` / `:61` / `:40`） |
| 技术基线（React 17 / antd 4 / antd-mobile 5 / Designable 1.0.0-beta / Formily 2.3） | ✅ 与锁定的 `react 17.0.2`、`antd 4.22.8`、`antd-mobile 5.43.0`、`@designable/* 1.0.0-beta.45`、`@formily/* 2.3.7` 一致 |
| 「Designer 与 Designable 耦合」这一前提 | ✅ 成立：`packages/designer/src/{materials,schema-io,designer}.ts` 直接 import `@designable/*`，`package.json` 声明 7 个 designable 依赖 |

### 2.2 文档与代码不符之处（按严重度）

| # | 位置 | 代码事实 | 性质 |
|---|---|---|---|
| C1 | 01 §8.2 | `FormSchemaDocument` 已存在（`packages/types/src/schema.ts:3`，含 `formilyVersion?`、`createdAt?`、`updatedAt?`，`schema: Record<string,unknown>`） | 重定义同义类型 |
| C2 | 01 §7.1/§7.2 | 全仓库无 `Compiler` / `compileSchema` / `SchemaCompiler` 命名；「编译」职责分散在 `core/schema/{parser,validator}.ts` + `formily/component-map.ts` | 虚构/聚合概念当现有模块 |
| C3 | 通篇 | Material/Setter/Panel/Command/Toolbar Registry、`SchemaEditor`、`DesignerEngine`、`DesignerAdapter` 接口在代码中零落点，全是全新抽象 | 「拆分/迁移」定性失真 |
| C4 | 01 §5.3 | `createDesignerMaterials` 从来不是 Registry，只返回 `Record<string, DnComponent>`（`packages/designer/src/materials.ts:115`） | 「不再承担 Registry 职责」表述错误 |
| C5 | 01 §6.2 | 缺 `implementations.pc` 的 binding 被**静默跳过**（`materials.ts:127-130`，`if (!host) return`），不报错、不拒绝 | 「拒绝」措辞错误 |
| C6 | 01 §7.1/§14 | `restoreSnapshot` 仅类型声明、无实现无调用（`component.ts:44`）；`CanonicalSnapshot` 为协议类型，后端协作集成仍未做 | 「Snapshot 恢复」非现有能力 |
| C7 | AGENTS.md:52 及 guide 06/07 | 代码权威名是 `ComponentBinding`，`FormComponentDefinition` 是过时词（代码与 tech-design 均无此类型） | 术语漂移 |

---

## 3. 已锁定决策（Q1–Q9）

| # | 决策 | 结论 |
|---|---|---|
| Q1 | 审核终点 | 先校验文档是否成立 |
| Q2 | 拆分动机 | A 开源产品化 + B 技术债修复，**两者都要** |
| Q3 | 文档权威 | 提案回写 canonical，权威仍以 `docs/tech-design` 为主 |
| Q4 | 物料与组件关系 | `DesignerMaterialDefinition` 是**一等公民**，与 `ComponentBinding` 分离 |
| Q5 | 迁移策略 | **big-bang**（beta 阶段可接受方向调整） |
| Q6 | DesignerPluginManager | **抽取泛型核心**，复用 Runtime 算法 |
| Q7/Q8 | 包粒度 | **7 包边界为目标**，随内容落地分阶段建包，不建空壳 |
| Q9 | 定性 | 接受「**新建框架**，不是拆分迁移」 |

---

## 4. 文档修正清单（C1–C9）

> 以下每条给出「问题 → 改法」。类型定义不在此重复抄录，一律以 `packages/*` 源码为权威（遵守「不复制同义类型」铁律）。

### C1 — `FormSchemaDocument` 重定义（严重）

- **问题**：01 §8.2 重新定义了一个同名 `FormSchemaDocument`，丢掉了现有字段 `formilyVersion?` / `createdAt?` / `updatedAt?`，并把 `schema` 从 `Record<string,unknown>` 收窄为 `ISchema`（会把 `types` 包耦合到 Formily）。
- **改法**：在 `packages/types/src/schema.ts` 的现有类型上**增加** `designerMetadata?` 字段；文档 §8.2 改为「扩展现有 `FormSchemaDocument`」而非重定义。`schema` 保持 `Record<string,unknown>`。

### C2 — 「Schema Compiler」是虚构模块（严重）

- **问题**：01 §7.1 把它列入「保留的现有能力」，§7.2 又给它列了 8 条职责；但代码里没有这个模块。
- **改法**：二选一——(a) 明确「Schema Compiler」是本次**新建**的聚合层，8 条职责是它的目标边界；(b) 删掉该名词，改写为描述现状：`parseSchemaDocument` + `validateEngineSchema`（`core/schema/*`）+ `resolveFormilyComponentMap`（`formily/component-map.ts`）各自承担什么。

### C3 — 通篇「拆分/迁移」定性失真（严重）

- **问题**：文档把范围写成「保留现有能力 + 拆包」，实际是「新建 Designer 框架 + 迁移 Designable adapter」。
- **改法**：标题、§0 目标、§12 改造模块表、§15 结论，统一按「新建框架」改写，明确「新建」与「迁移」两部分的边界，让工作量评估与排期对齐。

### C4 — `createDesignerMaterials` 的 Registry 表述（中）

- **问题**：01 §5.3 说它「不再承担完整 Registry 的职责」，暗示它现在承担着；事实是它从未是 Registry。
- **改法**：改为「现有 `createDesignerMaterials` 是 ComponentBinding → Designable 物料的**派生工具**，本次**新建** `MaterialRegistry`」。

### C5 — 「拒绝」vs「静默跳过」（中）

- **问题**：01 §6.2 说「不再因缺少 PC implementation 就拒绝注册」，但现状是静默跳过。
- **改法**：改为「现状对缺 `implementations.pc` 的 binding **静默跳过**；目标是改为显式支持纯设计器物料，并对缺失给出诊断」。

### C6 — Snapshot「恢复」与 Canonical「协作」不实（中）

- **问题**：01 §7.1、§14 把「Snapshot 创建和恢复」都列为现有能力；`restoreSnapshot` 只有类型声明，`CanonicalSnapshot` 后端协作集成仍未落地（与 AGENTS.md「backend Canonical Snapshot integration 仍待做」一致）。
- **改法**：「创建」保留，「恢复」和「Canonical 后端协作」标为缺口，移出「现有能力」清单，列入待办。

### C7 — `FormComponentDefinition` 术语纠错（中）

- **问题**：AGENTS.md:52 及 guide 06/07 使用过时词 `FormComponentDefinition`。
- **改法**：统一改为 `ComponentBinding` / `ComponentProtocolDefinition`，兑现「代码 > 文档」权威。此项属于 Q3（回写 canonical）的一部分。

### C8 — 包粒度（低）

- **问题**：01 §10.1、02 Task 7.2 的 7 包清单容易诱发「空壳包」。
- **改法**：保留 7 包边界为**最终目标**，但明确「随内容落地分阶段建包，不建空壳」，advanced 包等有真实消费者再建。

### C9 — Runtime plugin-manager 的复用前提（实现要求）

- **问题**：02 Task 2.4 说「复用 Runtime Plugin Manager 底层算法」，但现状是：算法硬编码 `FormEngine` + 5 类 `RegistryKind`，且**没有 `uninstall(name)`**（只有 `disposeAll`）。
- **改法**：把 Task 2.4 明确为一次 **Runtime 重构**——抽泛型 plugin 核心 + 新增按插件卸载能力 + 补 `plugin-manager` 回归测试；文档不得把这一步写成纯 Designer 工作。

---

## 5. 重排后的 MVP 边界

按 Q5（big-bang）、Q6（抽泛型核心）、Q7/Q8（7 包边界为目标、分阶段建包）重排：

1. **`designer-core`**：Material/Setter/Panel/Command/Toolbar Registry + DesignerPluginManager（复用抽取后的泛型核心）+ DesignerEngine + SchemaEditor + events/lifecycle。
2. **`designer-designable`**：`DesignerAdapter` / `DesignerWorkspace` 接口 + Material→Behavior/Resource + SetterBinding→Setter + Schema 往返（复用现有 `schema-io`）+ 迁移 `packages/designer` 的 Designable 耦合代码。
3. **Runtime 侧（Q6 硬伤）**：抽泛型 plugin 核心 + 新增 `uninstall` + 回归测试——这是本 big-bang 中风险最高的一环。
4. 现有 `packages/designer` 重构为 adapter 后**退役旧入口**（big-bang 一次落地）。
5. 基础 material/setter/plugin 随内容落地建包，支撑 `designer-demo`。
6. advanced 包延后，等有真实消费者再建。

**每阶段硬门槛（big-bang 下不可省）**：`pnpm test:run` + `pnpm -r typecheck` + 对应包 `build` + 循环依赖检查。

---

## 6. 残余风险

- **R1**：Q5=B + Q6=A 同时落地，无中间可验证状态 → 回归测试是唯一护栏；建议 plugin-manager 的泛型抽取单独先行落地、先绿，再进 designer 拆分。
- **R2**：Material 成为一等公民后，必须新增 `componentName ↔ Runtime 注册表 ↔ Schema` 的一致性校验，否则会出现「画了、Runtime 渲染不出」的静默失配。
- **R3**：AGENTS.md 术语已证实漂移，说明文档地图存在陈旧项，本次应一并修正，让「代码 > 文档」权威真正落地。

---

## 7. 结论与后续动作

两份文档**技术基线正确、组件模型命名正确、耦合诊断正确**，具备继续演进的基础；但「范围定性」（C3）和若干「现有能力」表述（C1/C2/C4/C5/C6）与代码不符，直接执行会把工作量低估、把尚不存在的模块当作现成能力。

建议顺序：先落 C1–C9 修正 → 再按 §5 重排的 MVP 边界进入执行。C7（AGENTS.md 纠错）可立即做，与后续是否执行解耦。
