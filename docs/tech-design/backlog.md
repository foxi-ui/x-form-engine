# 技术债台账（Backlog）

> 本文由 `m2-backlog.md` 迁移而来（原文件已删除）。迁移日期：2026-11-08。
> 已随 M1 修复波解决的项不再列入本台账（见 git 历史 `m2-backlog.md` §2）。

## 现状核对（2026-11-08 已逐条复核，共 33 项）

> 结论：**大多数延期项在 M2/M3 期间未被顺手解决，仍挂账 23 项；已解决 3 项、部分解决 7 项。**

### 已解决（3）

| 项 | 结论 |
|---|---|
| T7 | `no-react-deps.test.ts` 已补源码 import 扫描（`readFileSync` + 正则匹配） |
| D3 | sdk 现含 `.tsx` 测试，`@testing-library/react`/`@types/react` 为合理 devDep |
| G1 | AGENTS.md 已更新为「已实现」措辞 |

### 部分解决（7）

| 项 | 现状 |
|---|---|
| T6 | reset/submit/initialValues 已覆盖；destroy/disabled/readOnly 专项仍缺 |
| T8 | 有「实例覆盖工厂 scope」测试；缺「仅工厂 key 透传」独立断言 |
| R1 | mode 收窄到 `edit/preview`（readonly 已拆独立渲染器）；FormRenderer 仍未消费 mode |
| R2 | destroy 仍是 no-op，已加「M1 占位」注释 |
| C1 | Radio/Checkbox 已无 placeholder；仍缺 `default: []` |
| E1 | 根 README 已补；CI/lint 仍无 |
| G2 | destroy 已标注占位；mode 等占位未标注 |

### 仍挂账（23）

| 主题 | 项 |
|---|---|
| 测试 | T1、T2、T3、T4、T5、T9 |
| 依赖 | D1（dev 依赖环）、D2（@types/node）、D4（icons/formily-react 冗余）、D5（caret 版本） |
| 渲染器 | R3（漏 engine.options.platform）、R4（disabled 首帧闪烁）、R5（reset 丢 Promise） |
| 插件 | P1（disposed 守卫）、P2（listener 抛错）、P3（依赖失败无 failed 事件）、P4（异步插件 = FUT-03）、P5（toJS 引用） |
| 组件 | C2（无 README）、C3（Textarea 冒烟） |
| 工程化 | E2（main/private）、E3（vitest workspace 旧 API）、E4（registeredAt Date.now） |

以下为原 M1 评审快照明细，供排期定位。

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
