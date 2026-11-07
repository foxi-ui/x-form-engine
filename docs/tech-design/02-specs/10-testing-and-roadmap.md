# 10. 测试策略、验收标准与研发路线

## 1. 测试目标

验证引擎的正确性、兼容性、扩展性和可维护性。测试不能只覆盖基础输入框，需要覆盖 Formily 原生能力、多端一致性、历史快照和插件生命周期。

## 2. 测试分层

| 层级 | 测试范围 | 典型工具 |
|---|---|---|
| Unit | Registry、Plugin、Compiler、Adapter、Formatter | Vitest |
| Component | PC、Mobile、Readonly 组件交互 | Testing Library |
| Integration | Formily Adapter、Runtime、Datasource、Snapshot | Vitest |
| E2E | 设计、发布、填写、提交、历史回显 | Playwright |
| Compatibility | Formily / Designable 升级、Schema 迁移 | 自动化兼容套件 |
| Visual | 关键组件和设计器视觉回归 | Storybook / 视觉测试工具 |

## 3. 核心测试场景

### Schema 与 Formily

- 原生 Schema 能力不回归。
- `x-reactions` 动态显隐和必填。
- 异步校验和自定义校验。
- ArrayField、ObjectField 嵌套。
- 自定义组件和 Decorator。
- Scope 方法在表达式中按预期工作。

### Registry 与 Plugin

- 重复注册冲突。
- 插件依赖拓扑排序。
- 循环依赖检测。
- 安装失败回滚。
- 卸载资源归属正确。
- Engine 销毁清理监听器。

### 多端和组件

- PC、Mobile 的 Value 结构一致。
- 不同平台交互适配正确。
- 缺少平台实现时有明确提示。
- 组件 Adapter 序列化结果稳定。

### Snapshot

- 人员、部门、字典等展示信息被冻结。
- 历史数据不受当前数据源变化影响。
- 未知组件可降级显示。
- 旧 Snapshot 可迁移或明确报错。
- 敏感信息不会被不必要地复制。

## 4. 性能指标建议

先建立基准，再确定具体门槛。建议关注：

- Engine 初始化耗时。
- Schema 编译耗时。
- 首屏渲染耗时。
- 大表单字段数量与渲染性能。
- 远程数据源请求次数和缓存命中率。
- Snapshot 生成耗时。
- 设计器节点操作响应时间。
- 多个 Renderer 并存时的内存和订阅数量。

性能测试应使用固定硬件、浏览器、Schema 和数据集，避免只用主观感受判断。

## 5. 研发阶段

### M0：技术验证与协议冻结

交付：

- 依赖版本矩阵。
- Formily 原生能力验证 Demo。
- Designable 物料和 Setter 验证 Demo。
- Schema / Value / Snapshot 初版协议。
- Monorepo 工程规范。

退出条件：

- 核心 API 已按实际版本验证。
- 关键技术风险有结论。
- 公共类型和组件契约通过评审。

### M1：核心渲染引擎

交付：

- Types。
- Registry。
- Plugin System。
- Runtime Context / Scope。
- Formily Adapter。
- PC Renderer。
- 基础组件集。
- SDK 最小 API。

退出条件：

- Formily 原生 Schema 可渲染。
- 自定义组件可注册。
- 校验、联动和 Effects 正常。
- Renderer 生命周期和资源清理通过测试。

### M2：设计器、只读与数据适配

交付：

- Designable Adapter。
- Designer Materials / Setters。
- Mobile Renderer。
- Readonly Renderer。
- Datasource Service。
- Value / Snapshot Adapter。
- Schema 和 Snapshot 迁移基础能力。

退出条件：

- 设计器产出的 Schema 可运行。
- PC 与移动端 Value 一致。
- 提交结果包含 Value 和 Snapshot。
- 历史记录可脱离实时数据源展示。

### M3：生产化与开放扩展

交付：

- 插件扩展规范。
- 自定义组件开发文档。
- 权限和国际化服务。
- Devtools 和诊断能力。
- E2E、兼容性和性能测试。
- 发布和版本治理规范。

退出条件：

- 外部业务应用可通过 SDK 接入。
- 第三方组件按规范扩展。
- 生产问题可诊断、可回滚。
- Schema 和 Snapshot 有明确兼容策略。

## 6. 角色建议

| 角色 | 主要职责 |
|---|---|
| 架构负责人 | 协议、依赖边界、技术决策和评审 |
| 引擎核心开发 | Types、Registry、Plugin、Runtime |
| Formily 开发 | Formily Adapter、Effects、Renderer |
| 设计器开发 | Designable Adapter、物料、Setter |
| 组件开发 | PC / Mobile / Readonly 组件和 Adapter |
| 后端开发 | Schema、Value、Snapshot 存储和校验 |
| QA | 单测策略、集成测试、E2E 和兼容性 |

小团队可以由同一人承担多个角色，但产物仍应经过交叉评审。

## 7. 评审门禁

每个阶段至少检查：

- 需求与范围是否明确。
- 接口和数据结构是否稳定。
- 依赖方向是否违反架构约束。
- 是否有异常、权限和兼容策略。
- 是否有自动化测试。
- 是否有可运行 Demo。
- 是否有迁移和回滚方案。
- 是否形成变更记录。

## 8. 主要风险

| 风险 | 影响 | 应对 |
|---|---|---|
| Formily 版本 API 差异 | 适配层返工 | M0 锁版验证 |
| 设计器与运行时组件定义漂移 | Schema 不可运行 | 统一 Definition |
| Snapshot 设计过轻 | 历史展示失真 | 先梳理复杂业务组件 |
| Snapshot 设计过重 | 存储膨胀和隐私风险 | 最小必要展示信息 |
| 组件直接依赖业务 HTTP | 难以复用和测试 | Datasource Service 注入 |
| 权限只在前端处理 | 越权风险 | 后端强制校验 |
| 插件随意覆盖注册项 | 运行结果不确定 | 严格冲突和资源归属 |
| 一次性建设范围过大 | 交付延期 | 按 M0-M3 分阶段 |

## 9. 首批开发任务建议

按依赖顺序：

1. 建立 pnpm Monorepo 和构建规范。
2. 完成 `01-types.md` 对应公共类型。
3. 完成 `02-component-spec.md` 对应组件契约。
4. 完成 Registry 和 Plugin 最小实现。
5. 完成 Formily Adapter 最小 Demo。
6. 用 Input、Select、UserSelect 三个组件验证组件模型。
7. 完成 PC Renderer 和 SDK 最小接入。
8. 再推进 Designable、Readonly、Snapshot 和 Mobile。

## 10. Definition of Done

一个模块只有满足以下条件才算完成：

- 公共接口有类型定义和说明。
- 核心逻辑有自动化测试。
- 至少一个可运行示例。
- 错误和边界情况有处理。
- 不违反包依赖规则。
- 对外 API 有使用文档。
- 关键设计决策有记录。
