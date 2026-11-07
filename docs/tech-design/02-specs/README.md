# Form Engine 设计文档集

本目录将《Form Engine 企业级前端渲染引擎设计方案》拆分为可独立评审、分工和验收的专题文档。

## 文档清单

| 文档 | 主题 | 主要评审对象 |
|---|---|---|
| 01-types.md | 公共类型、领域模型、错误协议 | 架构负责人、前后端 |
| 02-component-spec.md | 组件定义、Adapter、组件开发规范 | 前端基础设施、组件开发 |
| 03-registry-plugin.md | Registry、Plugin 生命周期与冲突策略 | 引擎核心开发 |
| 04-formily-adapter.md | Formily 2.x 适配与原生能力 | Formily 适配开发 |
| 05-renderer-sdk.md | Renderer、实例 API、React SDK | 前端应用接入方 |
| 06-runtime-context.md | Context、Scope、事件与服务注入 | 引擎核心开发 |
| 07-designer-adapter.md | Designable 1.x、物料和 Setter | 设计器开发 |
| 08-readonly-renderer.md | 独立只读渲染器与 Formatter | 只读详情开发 |
| 09-value-snapshot.md | Value、Snapshot、后端存储与历史回显 | 前后端、业务架构 |
| 10-testing-and-roadmap.md | 测试、验收、研发计划和风险 | 项目负责人、QA |

## 推荐阅读与实施顺序

1. 先评审 `01`、`02`，冻结公共类型和组件契约。
2. 再实现 `03`、`04`，建立 Registry、Plugin 和 Formily 适配内核。
3. 并行推进 `05`、`06`、`07`。
4. `08`、`09` 应结合真实业务组件和后端存储协议共同评审。
5. 按 `10` 的阶段门禁逐步验收。

## 重要约定

- 文档中的接口是引擎建议契约，不代表 Formily 或 Designable 的原生 API。
- 具体依赖版本锁定后，必须通过最小 Demo 核验导出、类型和运行行为。
- 后端必须独立执行权限、数据校验和业务规则；前端配置不能作为安全边界。
- Snapshot 应冻结历史展示所需的信息，并明确敏感数据最小化策略。
