# 文档地图

本文是 x-form-engine 全部技术文档的导航入口。文档分五层，每层职责唯一；同一协议/接口只有**一个**权威定义文件，其余处用链接引用，不重复抄写。

## 文档分层

| 层 | 职责 | 权威度 |
|---|---|---|
| 入口/导航 | 是什么、怎么跑、去哪找 | 唯一导航 |
| 架构总纲 | 为什么这么设计、边界、原则 | 只讲边界，不写 TS 签名 |
| 契约/规范 | 接口、协议、字段定义 | 未实现时的权威设计；实现后指向 `packages/*` 源码 |
| 事实/决策 | 验证结论、ADR | 只读归档 |
| 实施/追踪 | 范围、分期、待办 | 持续更新 |

**权威等级（冲突时取高者）**：已实现代码 → `02-specs` 契约 → `mvp-roadmap` 决策 → 架构总纲 → `verification` 事实。同等级冲突以「最新批准的决策」为准。

## 目录

### 架构总纲

- [`tech-design/form-engine-architecture-design.md`](tech-design/form-engine-architecture-design.md) — 架构基线：目标、分层、monorepo 布局、领域模型、适配器、错误处理。

### 业务接入指南

- [`guide/README.md`](guide/README.md) — 面向业务开发者的渐进式接入手册：从渲染第一张表单到提交 Value / Snapshot（第 1–4 章已完成，第 5–10 章占位）。
- [`guide/examples/employee-onboarding/`](guide/examples/employee-onboarding/) — 贯穿示例「员工入职登记」的完整可复制代码。

### 契约 / 规范（02-specs）

| 文档 | 主题 | 落地状态 |
|---|---|---|
| [`01-types.md`](tech-design/02-specs/01-types.md) | 公共类型、领域模型、错误协议 | 已实现（权威见 `packages/types`） |
| [`02-component-spec.md`](tech-design/02-specs/02-component-spec.md) | 组件定义、Adapter、开发规范 | 已实现（权威见 `packages/types/component.ts`、`packages/components/src/mobile`） |
| [`03-registry-plugin.md`](tech-design/02-specs/03-registry-plugin.md) | Registry、Plugin 生命周期与冲突 | 已实现（同步插件，见 `packages/core`） |
| [`04-formily-adapter.md`](tech-design/02-specs/04-formily-adapter.md) | Formily 2.x 适配 | 已实现（见 `packages/formily`） |
| [`05-renderer-sdk.md`](tech-design/02-specs/05-renderer-sdk.md) | Renderer、实例 API、SDK | 已实现（PC + Mobile + Readonly） |
| [`06-runtime-context.md`](tech-design/02-specs/06-runtime-context.md) | Context、Scope、事件、服务注入 | 已实现 |
| [`07-designer-adapter.md`](tech-design/02-specs/07-designer-adapter.md) | Designable 1.x 适配 | 已实现（见 `packages/designer`） |
| [`08-readonly-renderer.md`](tech-design/02-specs/08-readonly-renderer.md) | 只读渲染器与 Formatter | 已实现 |
| [`09-value-snapshot.md`](tech-design/02-specs/09-value-snapshot.md) | Value、Snapshot、历史回显协议 | 已实现（权威见 `packages/types/value.ts`） |
| [`10-testing-and-roadmap.md`](tech-design/02-specs/10-testing-and-roadmap.md) | 测试、验收、研发计划 | 里程碑已迁至 `mvp-roadmap.md` |

> 「已实现」表示对应代码已合入，spec 仅保留设计意图，最终以 `packages/*` 源码为准。

### 事实 / 决策

- [`tech-design/verification/README.md`](tech-design/verification/README.md) — 落地前技术验证（版本锁定、Formily API、Designable 约束）结论索引。
- [`tech-design/verification/`](tech-design/verification/) — 8 篇验证结论 + 附录证据，只读归档。
- [`tech-design/adr/`](tech-design/adr/) — 架构决策记录（ADR）。

### 实施 / 追踪

- [`tech-design/mvp-roadmap.md`](tech-design/mvp-roadmap.md) — MVP 实施基线：Core/Contract/Future 分级、BLOCK 阻塞项、M1~M5 里程碑、验收标准。
- [`tech-design/backlog.md`](tech-design/backlog.md) — 技术债台账（M1 评审延期项，需逐条复核现状）。
- [`tech-design/pending-confirmations.md`](tech-design/pending-confirmations.md) — 后端/业务/安全 13 项待确认问题，后端联调前须逐项关闭。

## 文档状态约定

每篇文档头部应标注状态，避免「文档说待修订、代码已落地」的错位：

```
> 状态：draft | proposed | implemented | superseded
> 落地对照：packages/types/value.ts（若已实现）
> 最后更新：YYYY-MM-DD
```

## 维护规则

1. **单一权威**：一个接口只在一处定义，其余处链接引用；已实现接口以代码为权威，文档只写语义。
2. **落地即同步**：凡落地协议/接口的 PR，必须回写对应 spec 的状态戳与「落地对照」路径，否则 review 不通过。
3. **不反向改写事实**：`verification/` 是事实证据，只读归档；新验证另开文档，不覆盖旧结论。
4. **过程产物隔离**：spike 工程、执行计划等过程产物不入 `docs/tech-design/`，放 `docs/archive/` 或 `.scratch/`。
