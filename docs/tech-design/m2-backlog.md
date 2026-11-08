# M2 Backlog — M1 延期项清单

> 来源：MVP M1 执行台账（`.superpowers/sdd/2026-11-07-mvp-m1-engine-kernel/progress.md`）+ 最终全分支评审结论
> 生成日期：2026-11-08
> 状态：M1 闭环已验收通过（48/48 测试、7/7 包 typecheck、playground 构建成功）。下列项均**不阻塞 M1 合并**，进入 M2 迭代。

---

## 1. 说明

M1 采用「完整架构保留、最小内核实现」策略。执行过程中，任务评审与最终全分支评审共记录了约 40 条 Minor 级问题，其中 7 条 load-bearing（影响正确性或红线）已随最终修复波解决，其余作为 M2 backlog 记录于此。

优先级约定：

| 级别 | 含义 |
|---|---|
| P1 | M2 应尽早处理（影响后续迭代或存在易踩的坑） |
| P2 | M2 可延后（清理/加固，不阻塞新功能） |
| P3 | 生产化/发布前必须（发布治理） |

---

## 2. 已随 M1 修复波解决（不再延期，供追溯）

| 原问题 | 结果 |
|---|---|
| `reset()` 不恢复 `initialValues` | ✅ `createForm({ initialValues, values })` 修复 |
| `getValues()/submit()` 返回活 MobX observable | ✅ 统一经 `toJS` 返回普通对象 |
| 插件同名绕过冲突检测 + 按 source 回滚误删旧资源 + `builtin` 命名冲突 | ✅ 改为增量快照归属 + 同名显式检测 |
| Engine 构造期插件安装失败不回滚已装插件 | ✅ try/catch → `disposeAll()` → `failed` |
| SDK 未导出 schema 解析/校验（x-engine 校验不可达） | ✅ SDK 导出 `parseSchemaDocument`/`validateEngineSchema` |
| SDK 组件面矛盾（「仅依赖 SDK」vs 实际依赖 components） | ✅ components 定为一等公共包，更新 AGENTS.md |
| AGENTS.md 仓库状态过时 | ✅ 更新为「已实现 6 包 + playground」 |

---

## 3. 延期项（按主题）

### 3.1 测试覆盖缺口（P2）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| T1 | 7 个基础组件只有 Input 被真实渲染，Select/Radio/Checkbox/DatePicker 未触 DOM onChange | `packages/components/src/basic.test.tsx` | 每个组件补最小渲染冒烟 |
| T2 | 集成测试校验拒绝断言偏弱（只 `rejects.toBeDefined()`，未断言 path） | `packages/renderer/src/__tests__/m1-integration.test.tsx` | 断言 `arrayContaining([{path:'出发日期'}])` |
| T3 | 集成测试阶段 3 `toBe(0)` 无区分力（挂载 autorun 也算出 0） | 同上 | 在 setValues 前先断言 `出差天数` 为 undefined |
| T4 | DatePicker 值格式结论仅靠源码推断，未触 DOM 交互验证 | 同上 | 补一个真实 DatePicker onChange 用例 |
| T5 | `dispose` 未放 `afterEach`，断言提前失败会残留未 dispose 的 engine | 同上 | 移到 `afterEach` |
| T6 | 未断言 `FormSubmitResult` 完整形状；无 `reset/destroy/initialValues/disabled/readOnly` 专项覆盖 | `packages/renderer` | 补实例 API 行为测试 |
| T7 | types 包 `no-react-deps` 测试只扫 manifest 不扫源码 import | `packages/types/src/__tests__/no-react-deps.test.ts` | 补源码 import 说明符扫描 |
| T8 | formily scope 工厂级透传无独立断言（只验证实例级覆盖） | `packages/formily/src/adapter.test.tsx` | 加仅存于工厂 scope 的 key 断言 |
| T9 | sdk 无「类型全量 re-export」编译期断言 | `packages/sdk/src/sdk.test.tsx` | 加 `import type` 断言 |

### 3.2 包自洽性 / 依赖（P2）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| D1 | renderer↔components 存在 dev 依赖环（均为测试用 devDep，pnpm 容忍） | `packages/renderer`、`packages/components` | 把跨包集成测试迁到独立测试包解除环 |
| D2 | types/sdk/playground 未声明各自 `@types/node` 等 devDependency，靠根提升 | 各 package.json | 各自补齐 devDeps |
| D3 | sdk 冗余 devDeps（`@testing-library/react` 等，无 JSX/React 直接 import） | `packages/sdk/package.json` | 删除或说明用途 |
| D4 | components 冗余依赖 `@ant-design/icons`、`@formily/react`（未直接 import） | `packages/components/package.json` | 清理 |
| D5 | vite/less/@vitejs/plugin-react 用 caret，其余依赖精确锁版，不一致 | `apps/playground/package.json` | 统一精确版本 |

### 3.3 渲染器语义（占位能力未文档化，P1）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| R1 | `mode` prop 完全忽略（静默 no-op） | `packages/renderer/src/types.ts` | 实现或从公共类型移除，标注 M2 |
| R2 | `destroy()` 是 no-op，业务可能误以为可手动释放 | `packages/renderer/src/FormRenderer.tsx` | JSDoc 写明语义与 M2/M3 计划 |
| R3 | `platform` 与 `engine.options.platform` 两处独立来源，`FormRenderer` 只取默认 `'pc'` | 同上 | `props.platform ?? engine.options.platform ?? 'pc'` |
| R4 | `disabled/readOnly` 在 useEffect 后置，首帧可编辑闪烁 | 同上 | 传入 `createForm` 初始 props |
| R5 | `reset()` 返回 void 丢弃异步完成信号 | 同上 | 评估改为返回 Promise |

### 3.4 插件事务边界（P2）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| P1 | dispose 后仍可 `installPlugin`（无 status 守卫） | `packages/core/src/engine.ts` | 加 `status==='disposed'` 拦截 |
| P2 | EventBus 监听器抛错会中断派发/顶替原始错误（隔离 vs 传播未定） | `packages/core/src/events/event-bus.ts` | 明确语义并文档化 |
| P3 | 依赖校验失败不派发 `plugin:failed`；失败安装不出现在 `list()`（无 failed 标记） | `packages/core/src/plugin/plugin-manager.ts` | 对齐 spec 03 §5.8 |
| P4 | 异步/延迟注册的资源不会被 `owned` 记录（M2 异步插件范围） | 同上 | 异步插件设计时一并处理 |
| P5 | `toJS` 对 Date/File/Blob 等非 observable 可变叶子仍按引用 | `packages/renderer/src/FormRenderer.tsx` | M3 snapshot 前评估深拷贝策略 |

### 3.5 组件包（P2）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| C1 | Radio/Checkbox `options` 缺 `default: []`，且声明了不支持的 `placeholder` | `packages/components/src/definitions/basic.ts` | 补 `default: []`，移除无关 placeholder |
| C2 | 消费方构建要求（`@formily/antd` 根入口 LESS、`~antd` alias、antd 4 CSS）未写入文档 | `packages/components` | 写入 README/replacements.md |
| C3 | `Input.TextArea` 可选类型会掩盖上游删除 | 同上 | 补 Textarea 渲染冒烟 |

### 3.6 工程化 / 发布治理（P3）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| E1 | 无 CI、无 lint、无根 README | 仓库根 | M1/M2 交界补 CI（test+typecheck+build） |
| E2 | 各包 `main` 指向 TS 源码，`private: true` | 各 package.json | 发布前补构建产物与 exports |
| E3 | `vitest.workspace.ts` 弃用告警 | 根 | 迁移 `test.projects` |
| E4 | `registeredAt` 用 `Date.now()`，同毫秒可能相同 | `packages/core/src/registry/registry.ts` | 改单调计数器 |

### 3.7 文档措辞（P1）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| G1 | AGENTS.md「Planned pnpm workspace」标题/表格仍列未实现的 schema/designer/adapters/services 包，与「已实现」措辞不一致 | `AGENTS.md` | 明确区分「已实现」与「目标架构」 |
| G2 | 若干占位能力（`destroy`/`mode`/`decorators` 空实现）未在 JSDoc 标注 M2/M3 | `packages/*` | 按 DoD 显式标注 |

---

## 4. M2 优先排入短名单

以下 5 条建议排进 M2 首批（易踩坑或影响后续迭代）：

1. **R1/R2/R3** — 渲染器占位能力（`mode`/`destroy`/`platform`）的语义文档化，避免业务误用。
2. **D1** — renderer↔components dev 环解耦（迁移集成测试），为后续 `pnpm -r build` 铺路。
3. **C2** — 组件消费方构建文档（LESS/`~antd` alias），否则每个业务项目重复踩 playground 已踩的坑。
4. **G1** — AGENTS.md「Planned」措辞修正，避免误导后续 agent。
5. **E1** — CI（test + typecheck + build），M1/M2 交界的最低生产保障。

---

## 5. 与 MVP roadmap 的对应

以下延期项与 `docs/tech-design/mvp-roadmap.md` 的非阻塞清单直接对应，无需重复跟踪，此处只做关联：

| 本清单主题 | roadmap FUT 项 |
|---|---|
| 3.3 渲染器 `mode`/`destroy` 占位 | FUT-01（Mobile Renderer）、M2 渲染器完善 |
| 3.4 P4 异步插件 | FUT-03（异步 Plugin） |
| 3.5 组件包 Radio/Checkbox options | FUT-16（设计器高级 Setter，届时组件 schema 需完善） |
| 3.6 工程化/发布治理 | M4（工程化与发布） |

其余项为 M1 执行过程中新发现的技术债，非 roadmap 既有 FUT 项，按本清单跟踪。
