# 技术债台账（Backlog）

> 本文由 `m2-backlog.md` 迁移而来（原文件已删除）。迁移日期：2026-11-08。
> 已随 M1 修复波解决的项不再列入本台账（见 git 历史 `m2-backlog.md` §2）。

## 现状核对与排期优先级（2026-11-08 已逐条复核）

> 33 项已复核：**3 已解决、30 待处理**（P1 正确性 ×6 / P2 加固 ×20 / P3 发布门禁 ×3 / Future ×1）。
> 优先级沿用：P1 = 正确性/一致性，尽早处理；P2 = 加固/测试补强，不阻塞新功能；P3 = 生产化/发布前必须。

### ✅ 已解决（3）

| 项 | 结论 |
|---|---|
| T7 | `no-react-deps.test.ts` 已补源码 import 扫描 |
| D3 | sdk 现含 `.tsx` 测试，`@testing-library/react`/`@types/react` 为合理 devDep |
| G1 | AGENTS.md 已更新为「已实现」措辞 |

### 🔴 P1 正确性 / 一致性（6，应尽早处理）

| 项 | 缺口 |
|---|---|
| R3 | `FormRenderer` 取 platform 漏 `engine.options.platform`，两处来源未合并 |
| R4 | `disabled/readOnly` 在 useEffect 后置，首帧可编辑闪烁（权限 UX 边界） |
| P1 | `installPlugin` 无 disposed 守卫，销毁后仍可安装 |
| P2 | EventBus `emit` 无异常隔离，监听器抛错中断派发 |
| P3 | `resolvePluginOrder` 在 try 外，依赖失败不派发 `plugin:failed`（违反 spec 03 §5.8） |
| P5 | `toJS` 对 Date/File/Blob 按引用，候选快照可能被后续修改污染 |

### 🟡 P2 加固 / 测试补强（20）

| 项 | 缺口 |
|---|---|
| T1 | 7 基础组件仅 Input 触 DOM onChange，其余只验证可注册 |
| T2 | 集成测试校验拒绝仅 `rejects.toBeDefined()`，未断言 path |
| T3 | `toBe(0)` 无区分力，未先断言 `出差天数` 为 undefined |
| T4 | DatePicker 无真实 DOM onChange 用例 |
| T5 | `dispose` 未放 `afterEach`，断言提前失败残留 engine |
| T6 | destroy/disabled/readOnly 实例 API 专项仍缺 |
| T8 | 缺「仅工厂 scope key 透传」独立断言 |
| T9 | sdk 缺「类型全量 re-export」编译期断言 |
| D1 | renderer↔components dev 依赖环（跨包集成测试迁独立包） |
| D2 | types/sdk/playground 未声明 `@types/node` |
| D4 | components 冗余 `@ant-design/icons`、`@formily/react` |
| D5 | playground vite/less/@vitejs/plugin-react 用 caret |
| R1 | mode 收窄后仍未消费（静默 no-op，实现或移除） |
| R2 | destroy 仍 no-op（已标注占位，评估真实释放） |
| R5 | reset 返回 void 丢弃异步完成信号 |
| C1 | Radio/Checkbox 缺 `options` 的 `default: []` |
| C2 | components 无消费方构建文档（LESS/`~antd` alias） |
| C3 | Textarea 无渲染冒烟 |
| E4 | `registeredAt` 用 `Date.now()`，同毫秒可能碰撞 |
| G2 | mode 等占位能力未在 JSDoc 标注 |

### 🔵 P3 发布门禁（3）

| 项 | 缺口 |
|---|---|
| E1 | 无 CI / lint（README 已补） |
| E2 | 各包 `main` 指向 TS 源码、`private: true`（发布前补产物/exports） |
| E3 | `vitest.workspace.ts` 旧 API（迁移 `test.projects`） |

### ⏳ Future（1，非技术债）

| 项 | 说明 |
|---|---|
| P4 | 异步插件 owned 记录，对应 roadmap FUT-03 |

以下为原 M1 评审快照明细（含位置与建议），供排期定位。

## 1. 延期项（按主题）

### 1.1 测试覆盖缺口（P2）

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

### 1.2 包自洽性 / 依赖（P2）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| D1 | renderer↔components 存在 dev 依赖环（均为测试用 devDep，pnpm 容忍） | `packages/renderer`、`packages/components` | 把跨包集成测试迁到独立测试包解除环 |
| D2 | types/sdk/playground 未声明各自 `@types/node` 等 devDependency，靠根提升 | 各 package.json | 各自补齐 devDeps |
| D3 | sdk 冗余 devDeps（`@testing-library/react` 等，无 JSX/React 直接 import） | `packages/sdk/package.json` | 删除或说明用途 |
| D4 | components 冗余依赖 `@ant-design/icons`、`@formily/react`（未直接 import） | `packages/components/package.json` | 清理 |
| D5 | vite/less/@vitejs/plugin-react 用 caret，其余依赖精确锁版，不一致 | `apps/playground/package.json` | 统一精确版本 |

### 1.3 渲染器语义（占位能力未文档化，P1）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| R1 | `mode` prop 完全忽略（静默 no-op） | `packages/renderer/src/types.ts` | 实现或从公共类型移除 |
| R2 | `destroy()` 是 no-op，业务可能误以为可手动释放 | `packages/renderer/src/FormRenderer.tsx` | JSDoc 写明语义 |
| R3 | `platform` 与 `engine.options.platform` 两处独立来源，`FormRenderer` 只取默认 `'pc'` | 同上 | `props.platform ?? engine.options.platform ?? 'pc'` |
| R4 | `disabled/readOnly` 在 useEffect 后置，首帧可编辑闪烁 | 同上 | 传入 `createForm` 初始 props |
| R5 | `reset()` 返回 void 丢弃异步完成信号 | 同上 | 评估改为返回 Promise |

### 1.4 插件事务边界（P2）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| P1 | dispose 后仍可 `installPlugin`（无 status 守卫） | `packages/core/src/engine.ts` | 加 `status==='disposed'` 拦截 |
| P2 | EventBus 监听器抛错会中断派发/顶替原始错误（隔离 vs 传播未定） | `packages/core/src/events/event-bus.ts` | 明确语义并文档化 |
| P3 | 依赖校验失败不派发 `plugin:failed`；失败安装不出现在 `list()`（无 failed 标记） | `packages/core/src/plugin/plugin-manager.ts` | 对齐 spec 03 §5.8 |
| P4 | 异步/延迟注册的资源不会被 `owned` 记录（M2 异步插件范围） | 同上 | 异步插件设计时一并处理 |
| P5 | `toJS` 对 Date/File/Blob 等非 observable 可变叶子仍按引用 | `packages/renderer/src/FormRenderer.tsx` | snapshot 前评估深拷贝策略 |

### 1.5 组件包（P2）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| C1 | Radio/Checkbox `options` 缺 `default: []`，且声明了不支持的 `placeholder` | `packages/components/src/definitions/basic.ts` | 补 `default: []`，移除无关 placeholder |
| C2 | 消费方构建要求（`@formily/antd` 根入口 LESS、`~antd` alias、antd 4 CSS）未写入文档 | `packages/components` | 写入 README |
| C3 | `Input.TextArea` 可选类型会掩盖上游删除 | 同上 | 补 Textarea 渲染冒烟 |

### 1.6 工程化 / 发布治理（P3）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| E1 | 无 CI、无 lint、无根 README | 仓库根 | 补 CI（test+typecheck+build）；README 已随文档治理补齐 |
| E2 | 各包 `main` 指向 TS 源码，`private: true` | 各 package.json | 发布前补构建产物与 exports |
| E3 | `vitest.workspace.ts` 弃用告警 | 根 | 迁移 `test.projects` |
| E4 | `registeredAt` 用 `Date.now()`，同毫秒可能相同 | `packages/core/src/registry/registry.ts` | 改单调计数器 |

### 1.7 文档措辞（P1）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| G1 | AGENTS.md「Planned pnpm workspace」标题/表格仍列未实现的 schema/designer/adapters/services 包 | `AGENTS.md` | 明确区分「已实现」与「目标架构」 |
| G2 | 若干占位能力（`destroy`/`mode`/`decorators` 空实现）未在 JSDoc 标注 | `packages/*` | 按 DoD 显式标注 |

## 2. 与 MVP roadmap 的对应

以下延期项与 `mvp-roadmap.md` 的非阻塞清单直接对应，无需重复跟踪：

| 本清单主题 | roadmap FUT 项 |
|---|---|
| 1.3 渲染器 `mode`/`destroy` 占位 | FUT-01（Mobile Renderer） |
| 1.4 P4 异步插件 | FUT-03（异步 Plugin） |
| 1.5 组件包 Radio/Checkbox options | FUT-16（设计器高级 Setter） |
| 1.6 工程化/发布治理 | M4（工程化与发布） |

其余项为 M1 执行过程中新发现的技术债，按本台账跟踪。
