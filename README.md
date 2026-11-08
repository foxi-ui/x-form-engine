# x-form-engine

企业级前端表单渲染引擎（Form Engine）。基于 React + TypeScript + Formily 2.x 构建，提供表单 Schema 定义、多端渲染（PC / 移动 / 只读）、可视化设计器，以及 Value / Snapshot 的历史数据闭环。

## 技术栈

| 依赖 | 版本 |
|---|---|
| React / react-dom | 17.0.2 |
| TypeScript | 5.9.3 |
| @formily/* | 2.3.7 |
| antd | 4.22.8 |
| @designable/* | 1.0.0-beta.45 |
| pnpm | 10.34.5 |

> 版本锁定原因与 Designable 上游维护状态见 `docs/tech-design/adr/0001-antd5-upgrade-path.md`。

## 快速开始

```bash
pnpm install

# 全量测试（Vitest）
pnpm test:run

# 全包类型检查
pnpm typecheck

# 启动 demo
pnpm --filter playground dev        # 渲染器 demo（M1）
pnpm --filter designer-demo dev     # 设计器 demo（M2）
```

## 包结构

pnpm workspace monorepo，按职责拆包，依赖方向单向。

| 包 | 职责 | 状态 |
|---|---|---|
| `packages/types` | 纯协议类型、领域模型、错误码（无 React/UI 依赖） | 已实现 |
| `packages/core` | Registry、Plugin、Context、Scope、事件、`x-engine` Schema 解析/校验、有序迁移 | 已实现 |
| `packages/formily` | Formily 适配层（组件/装饰器映射 + SchemaField） | 已实现 |
| `packages/renderer` | UI 无关渲染核心、React 入口、PC Renderer、Readonly Renderer | 已实现（PC + Readonly） |
| `packages/components` | 共享组件定义 + 平台实现（PC 编辑 + 只读） | 已实现 |
| `packages/designer` | Designable 1.x 适配（物料、Schema 导入导出、Setter） | 已实现 |
| `packages/adapters` | Value 规范化 + Candidate Snapshot 生成 | 已实现 |
| `packages/services` | 权限解析、Formatter、i18n、静态数据源 | 已实现 |
| `packages/sdk` | 公共消费入口（`createFormEngine`、`FormRenderer`、schema 解析/校验） | 已实现 |
| `apps/playground` | 渲染器 demo | 已实现 |
| `apps/designer-demo` | 设计器 demo（完整 Workbench） | 已实现 |

业务项目只依赖两个公共包：`@x-form-engine/sdk`、`@x-form-engine/components`，不应直接引用 `core` / `renderer` / `formily` 等内部实现包。

## 当前状态

- ✅ **M1** Engine 内核（Types / Registry / Plugin / Formily Adapter / PC Renderer / 基础组件）
- ✅ **M2** Designer 闭环（Designable 适配 + 物料 + Schema 导入导出）
- ✅ **M3** Value / Snapshot / Readonly 闭环（Value 规范化、稳定 fieldId/itemId、Candidate Snapshot、Readonly 渲染器、权限 fail-closed、有序迁移）
- ⬜ **M4** 工程化与发布（CI / 构建产物 / 单元与 E2E 测试 / 版本治理）

未完成：完整 Mobile Renderer、异步 Plugin、后端 Canonical Snapshot 集成、Devtools、E2E/兼容/性能测试。

## 文档

完整文档地图见 [`docs/README.md`](docs/README.md)。核心入口：

- [`docs/tech-design/form-engine-architecture-design.md`](docs/tech-design/form-engine-architecture-design.md) — 架构基线
- [`docs/tech-design/mvp-roadmap.md`](docs/tech-design/mvp-roadmap.md) — MVP 实施基线与里程碑
- [`docs/tech-design/02-specs/README.md`](docs/tech-design/02-specs/README.md) — 专题契约规范
- [`docs/tech-design/backlog.md`](docs/tech-design/backlog.md) — 技术债台账

## 开发指引

对 Agent / 协作者的仓库约定见 [`AGENTS.md`](AGENTS.md)。
