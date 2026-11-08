# x-form-engine MVP 实施基线与阻塞问题清单

> 文档版本：v1.0  
> 文档状态：待评审  
> 适用项目：foxi-ui/x-form-engine  
> 目标：在保留完整架构和长期扩展能力的前提下，确定 MVP 实际实现范围，识别开发阻塞问题，形成可执行的研发任务和验收标准。

---

# 1. 文档目的

本文件是 x-form-engine 现有技术设计文档的实施基线，用于指导 MVP 阶段的研发工作。

本项目采用以下研发策略：

**完整架构设计、最小内核实现、垂直业务闭环、渐进式能力扩展。**

不因 MVP 缩减长期架构边界，也不要求 MVP 实现所有预留模块。

需要明确区分：

| 分类 | 定义 | 处理原则 |
|---|---|---|
| Core | MVP 核心能力 | 必须实现并通过验收 |
| Contract | 架构扩展契约 | 必须定义稳定接口，允许暂不提供完整实现 |
| Future | 后续扩展能力 | 保留架构位置，暂不实现 |

## 1.1 核心目标

MVP 必须跑通以下业务闭环：

1. 通过设计器创建表单。
2. 导出并保存 Schema。
3. 根据 Schema 渲染表单。
4. 用户填写数据并执行校验。
5. 获取标准化 Value。
6. 生成候选 Snapshot。
7. 后端校验并生成权威 Snapshot。
8. 保存表单提交记录。
9. 读取历史提交记录。
10. 使用历史 Schema、Value、Snapshot 还原只读展示。

以上链路完成，才视为 MVP 闭环通过。

## 1.2 非目标

MVP 不要求实现：

- 完整工作流审批引擎。
- 完整移动端设计器。
- 全量业务组件库。
- 动态远程插件加载。
- 复杂 Schema 自动迁移引擎。
- 复杂字段权限表达式。
- 完整国际化配置中心。
- 多租户组件隔离。
- 虚拟滚动和大型表单专项性能优化。
- 完整的组件市场和插件市场。

---

# 2. 完整架构保留原则

完整架构继续保留以下逻辑模块：

```text
x-form-engine
│
├── types
│
├── core
│   ├── engine
│   ├── registry
│   ├── plugin
│   ├── context
│   └── lifecycle
│
├── schema
│   ├── parser
│   ├── validator
│   ├── version
│   └── migration
│
├── adapters
│   ├── formily
│   └── designable
│
├── renderer
│   ├── core
│   ├── pc
│   ├── mobile
│   └── readonly
│
├── components
│   ├── definitions
│   ├── basic
│   ├── business
│   ├── pc
│   ├── mobile
│   └── readonly
│
├── services
│   ├── datasource
│   ├── permission
│   ├── snapshot
│   ├── formatter
│   └── i18n
│
└── designer
    ├── core
    ├── adapter
    ├── materials
    └── setters
```

以上是逻辑模块边界，不要求第一阶段每个目录都成为独立 npm 包。

## 2.1 包拆分原则

MVP 建议采用适度合并：

| 包 | MVP 处理 |
|---|---|
| types | 独立包 |
| core | 独立包 |
| schema | 可以先合并到 core，保持内部边界 |
| adapters/formily | 独立包 |
| adapters/designable | 独立包 |
| renderer | 一个包，内部区分 core、PC、readonly |
| components | 一个包，内部区分 definitions、basic、PC、readonly |
| services | 一个包，内部模块化 |
| designer | 独立包 |
| playground | 独立应用 |

后续根据依赖关系、发布频率和实际复用情况再拆包。

禁止为了目录结构完整而提前引入大量 npm 包及版本协调成本。

---

# 3. MVP 模块实施范围

## 3.1 模块实施分级

| 模块 | 分级 | MVP 实现范围 |
|---|---|---|
| Types | Core | 公共类型、协议 |
| Engine | Core | 创建、销毁、基础生命周期 |
| Registry | Core | 组件、Formatter、Service 注册 |
| Plugin | Core | 同步插件安装和卸载 |
| Schema | Core | 基础解析、校验、版本识别 |
| Formily Adapter | Core | Schema 转换、Form 创建、校验和 Value 获取 |
| Designable Adapter | Core | 基础设计器接入 |
| PC Renderer | Core | 编辑、预览 |
| Mobile Renderer | Core | 编辑、预览、只读；七类 P0 移动组件 + FormItem；缺实现按字段回退并记诊断（M4 已落地） |
| Readonly Renderer | Core | 独立只读运行时、PC 实现、默认兜底 |
| Component Definition | Core | 统一组件定义契约 |
| Basic Components | Core | 基础输入和选择组件 |
| Datasource | Core | 静态数据和基础远程数据 |
| Permission | Core | 基础表单授权和必要字段授权 |
| Snapshot | Core | 候选 Snapshot、权威 Snapshot 协议 |
| Formatter | Core | 基础类型 Formatter |
| I18n | Contract | locale 和基础文案接口 |
| Migration | Contract | 版本标识和兼容入口 |
| Expression Engine | Contract | 安全边界、受控能力预留 |

## 3.2 MVP 组件清单

第一阶段只实现真正用于闭环的组件。

| 组件 | 编辑态 | PC 只读 | 默认只读 | 优先级 |
|---|---|---|---|---|
| Input | 是 | 是 | 是 | P0 |
| Textarea | 是 | 是 | 是 | P0 |
| Number | 是 | 是 | 是 | P0 |
| Select | 是 | 是 | 是 | P0 |
| Radio | 是 | 是 | 是 | P0 |
| Checkbox | 是 | 是 | 是 | P0 |
| DatePicker | 是 | 是 | 是 | P0 |
| Array / Repeater | 基础 | 基础 | 是 | P1 |
| Upload | 基础 | 基础 | 是 | P1 |
| UserSelect | 可选 | 默认兜底 | 是 | P2 |
| DepartmentSelect | 可选 | 默认兜底 | 是 | P2 |
| 自定义业务组件 | 预留 | 预留 | Unknown 兜底 | Future |

组件定义和具体 UI 实现分离，避免将来替换 UI 组件库时修改 Registry 核心契约。

---

# 4. 阻塞问题清单

阻塞问题必须在相关模块进入正式实现前解决。

## BLOCK-01：权限与只读渲染规则冲突

级别：P0  
状态：已解决  
涉及文档：

- form-engine-architecture-design.md
- 06-runtime-context.md
- 08-readonly-renderer.md
- 07-permission-enforcement.md

### 问题

现有设计中存在只读渲染不执行权限控制与权限信封缺失时 fail-closed 的规则冲突。

只读 Renderer 不能绕过字段读取权限。

### MVP 决策

1. 后端负责判断用户是否可以访问表单和提交记录。
2. 后端负责返回经过授权的数据。
3. 前端统一消费 Permission Result。
4. 无权限上下文不得默认允许访问敏感数据。
5. Schema 中的权限配置不能提升后端授权结果。
6. 隐藏字段必须在数据进入只读组件前完成过滤。
7. 附件下载权限由后端再次验证。

### MVP 接口

```ts
interface FieldAccess {
  readable: boolean;
  writable: boolean;
  masked?: boolean;
}

interface FormAccessResult {
  readable: boolean;
  writable: boolean;
  fields?: Record<string, FieldAccess>;
}
```

### 暂不实现

- 复杂权限表达式。
- 多角色动态权限合并。
- 组织树权限 DSL。
- 可视化权限设计器。

### 验收标准

- 无权访问的提交记录无法获取。
- 未授权字段不进入 Renderer。
- 脱敏字段不展示原始敏感值。
- 附件下载必须经过后端授权。

---

## BLOCK-02：Readonly Renderer 缺少 PC / Mobile 平台契约

级别：P0（组件契约阻塞）  
状态：已解决  
涉及文档：

- 01-types.md
- 02-component-spec.md
- 08-readonly-renderer.md

### 问题

当前只读实现只有单一 readonly 组件，不能表达平台差异和默认实现。

### MVP 决策

必须在组件契约中支持：

```ts
type Platform = 'pc' | 'mobile';

interface ReadonlyImplementations {
  pc?: React.ComponentType<ReadonlyComponentProps>;
  mobile?: React.ComponentType<ReadonlyComponentProps>;
  default?: React.ComponentType<ReadonlyComponentProps>;
}
```

统一解析顺序：

```text
当前平台只读实现
       ↓
默认只读实现
       ↓
内置 Formatter
       ↓
ReadonlyUnknown
```

### MVP 实现

- 实现 PC Readonly Renderer。
- 实现默认只读组件。
- 实现基础 Formatter。
- 实现 Unknown Fallback。
- Mobile 使用 antd-mobile 独立实现，缺实现按字段回退并记诊断。

### 暂不实现

- 全量 Mobile 专用只读组件。
- 复杂移动端表格。
- 移动端附件高级预览。

### 验收标准

- 缺少 PC 专用实现时能够兜底。
- 缺少 Mobile 专用实现时能够兜底。
- 未注册组件能够展示安全降级内容。
- 两个平台的字段 Value 和展示语义一致。

---

## BLOCK-03：Value 与 Snapshot 生成和持久化边界不明确

级别：P0  
状态：已解决  
涉及文档：

- 01-types.md
- 02-component-spec.md
- 09-value-snapshot.md
- 05-persistence-boundary.md

### 问题

前端 Snapshot 生成接口与后端权威展示信息生成职责存在冲突。

### MVP 决策

明确两种 Snapshot：

- Candidate Snapshot：前端生成的候选展示数据。
- Canonical Snapshot：后端校验、补全后形成的权威历史展示数据。

### 数据流

```text
Renderer.submit()
       ↓
Formily 校验
       ↓
获取 Value
       ↓
生成 Candidate Snapshot
       ↓
返回业务层
       ↓
业务提交 API
       ↓
后端校验和补全
       ↓
生成 Canonical Snapshot
       ↓
事务持久化
```

### MVP 数据协议

```ts
interface FormSnapshot {
  version: number;
  schemaId: string;
  schemaVersion: number;
  fields: Record<string, FieldSnapshot>;
}

interface FieldSnapshot {
  fieldId: string;
  name: string;
  title?: string;
  component: string;
  componentVersion?: string;
  value: unknown;
  displayValue?: unknown;
}
```

### MVP 决策约束

- Value 保存原始业务数据。
- Snapshot 保存历史展示信息。
- 前端 Snapshot 不作为权限依据。
- 后端 Canonical Snapshot 是历史展示的权威数据。
- Value 与 Canonical Snapshot 必须原子持久化。
- 历史展示不得默认重新查询并覆盖已冻结的展示值。

### 暂不实现

- 通用异步 Snapshot Resolver。
- 复杂业务对象批量补全引擎。
- 多级缓存。
- Snapshot 自动修复工具。

### 验收标准

- 提交后同时存在 Value 和 Canonical Snapshot。
- 历史数据能够使用提交时的展示信息还原。
- 当前字典或人员名称发生变化不影响历史展示。
- Snapshot 生成失败时不得保存不完整的成功记录。

---

## BLOCK-04：字段身份和重复数组路径不稳定

级别：P0（涉及数组组件时）  
状态：已解决  
涉及文档：

- 01-types.md
- 09-value-snapshot.md
- 06-value-snapshot-standard.md

### 问题

仅使用数组下标构造 Snapshot 路径，无法保证重复行排序、插入和删除后的身份稳定。

### MVP 决策

区分：

- fieldId：字段稳定身份。
- path：当前 Value 访问路径。
- itemId：重复数组行的稳定身份。

```ts
interface RepeatItemSnapshot {
  itemId: string;
  fields: Record<string, FieldSnapshot>;
}
```

### MVP 支持范围

- 普通字段。
- 对象嵌套字段。
- 基础数组。
- 基础明细表格。

复杂多层嵌套数组迁移暂不实现。

### 验收标准

- 数组行新增、删除和排序后，历史 Snapshot 不错位。
- 字段标题修改不改变 fieldId。
- Schema 重新打开后字段身份保持稳定。

---

## BLOCK-05：Value 规范化不能静默丢失数据

级别：P1  
状态：已解决  
涉及文档：

- 02-component-spec.md
- 06-value-snapshot-standard.md

### MVP 决策

规范化和校验分离。

```ts
interface NormalizeResult<T> {
  value: T;
  warnings: NormalizeWarning[];
  errors: NormalizeError[];
}
```

处理规则：

| 情况 | MVP 行为 |
|---|---|
| 合法数据 | 允许 |
| 可修复格式 | 归一化并记录 Warning |
| 重复 ID | 按组件协议去重并记录 Warning |
| 非法对象 | 返回错误，不静默丢弃 |
| 未知关联 ID | 保留原始 ID，标记缺失 |
| 单选多值 | 返回校验错误 |

### 验收标准

- 不允许无提示地丢弃业务数据。
- 不合法数据可以定位到具体字段。
- Warning 和 Error 可以被业务层消费。

---

## BLOCK-06：Runtime 与 Designer 技术依赖边界不明确

级别：P1  
状态：已确认  
涉及文档：

- ADR-0001
- 01-version-lock.md
- 04-designable.md

### MVP 决策

Runtime 与 Designer 保持独立依赖边界。

- Runtime 不依赖 Designable。
- Designer 通过标准 Schema Document 与 Runtime 交互。
- 不共享 React 组件实例。
- 不将 Designer 专属依赖暴露给 Runtime SDK。

MVP 暂时沿用已验证的 React / Formily / Designable 组合，不因为未来升级而阻塞开发。

### 后续

- React 版本升级验证。
- Designable 替换评估。
- Designer 独立部署。
- UI 依赖升级。

### 验收标准

独立业务应用仅安装 Runtime 相关包，也能够完成表单渲染、校验和提交。

---

## BLOCK-07：Plugin 同步安装与异步生命周期不一致

级别：P1  
状态：已实现（同步插件）  
涉及文档：

- form-engine-architecture-design.md
- 03-registry-plugin.md
- 06-runtime-context.md

### MVP 决策

第一版仅支持同步 Plugin。

```ts
interface FormEnginePlugin {
  name: string;
  install(context: PluginContext): void;
}
```

保留 Engine 生命周期扩展位置。

```ts
type EngineStatus =
  | 'created'
  | 'initializing'
  | 'ready'
  | 'failed'
  | 'disposed';
```

MVP 插件初始化可以同步完成。

### 后续

- 异步 Plugin。
- 插件依赖关系。
- 初始化回滚。
- 插件冲突治理。
- 插件版本兼容。

### 验收标准

- 插件可以注册组件和 Formatter。
- 插件可以卸载自己注册的资源。
- Engine 销毁后相关资源得到清理。

---

# 5. 非阻塞问题与后续迭代清单

以下事项不得成为 MVP 开发阻塞条件。

| 编号 | 能力 | MVP 处理 | 后续迭代 |
|---|---|---|---|
| FUT-01 | 完整 Mobile Renderer | 基础响应式兜底 | M4（已落地：七类 P0） |
| FUT-02 | Mobile 专用组件库 | 支持注册入口 | M4（已落地：七类 P0） |
| FUT-03 | 异步 Plugin | 同步插件 | M2 |
| FUT-04 | Schema Migration | 版本识别 | M2 |
| FUT-05 | 高级 Datasource | 基础远程请求 | M2 |
| FUT-06 | Datasource 缓存 | 不实现 | M2 |
| FUT-07 | 复杂权限 DSL | 基础授权 | M2 |
| FUT-08 | 高级 Snapshot Resolver | 基础展示值冻结 | M2 |
| FUT-09 | 完整 I18n | locale 接口 | M2 |
| FUT-10 | 复杂表达式引擎 | 禁止任意动态执行 | M2 |
| FUT-11 | 虚拟滚动 | 不实现 | M3 |
| FUT-12 | 大型表单性能优化 | 基础性能测试 | M3 |
| FUT-13 | 多租户隔离 | 不实现 | M3 |
| FUT-14 | 组件市场 | 不实现 | M3 |
| FUT-15 | 自动化数据修复工具 | 不实现 | M3 |
| FUT-16 | 设计器高级 Setter | 基础 Setter | M2 |
| FUT-17 | 组件国际化管理平台 | 不实现 | M3 |

注意：不实现某项功能不代表可以破坏其未来扩展所依赖的数据协议和接口边界。

---

# 6. MVP 研发阶段和任务清单

## M1：Engine 内核

目标：可以通过 SDK 使用 Schema 创建和运行表单。

### 任务

- [x] M1-01：确定 Types 公共类型。
- [x] M1-02：实现 Engine 创建与销毁。
- [x] M1-03：实现 Component Registry。
- [x] M1-04：实现同步 Plugin。
- [x] M1-05：实现 Schema 基础解析。
- [x] M1-06：实现 Schema 基础校验。
- [x] M1-07：实现 Formily Adapter。
- [x] M1-08：实现 PC Renderer。
- [x] M1-09：实现基础组件。
- [x] M1-10：实现基础校验和联动。
- [x] M1-11：实现基础 Playground。

### 验收

- [x] 可以创建 Engine。
- [x] 可以注册组件和插件。
- [x] 可以使用 Schema 渲染表单。
- [x] 可以正常填写和校验。
- [x] 可以获取标准化 Value。
- [x] Engine 销毁后资源正常释放。

## M2：Designer 闭环

目标：设计器可以产出 Runtime 可直接消费的 Schema。

### 任务

- [x] M2-01：实现 Designable Adapter。
- [x] M2-02：实现基础物料面板。
- [x] M2-03：实现基础属性配置面板。
- [x] M2-04：实现 Schema 导出。
- [x] M2-05：实现 Schema 导入。
- [x] M2-06：实现 Schema 保存和加载。
- [x] M2-07：实现 Schema 版本标识。
- [x] M2-08：实现设计器预览。
- [x] M2-09：验证 Designer 与 Runtime 解耦。

### 验收

- [x] 可以拖拽创建表单。
- [x] 可以配置字段基础属性。
- [x] 可以保存并重新打开。
- [x] 可以通过独立 Runtime 渲染设计器产出的 Schema。
- [x] 设计器预览与 Runtime 结果一致。

## M3：Value / Snapshot / Readonly 闭环

目标：提交记录可以可靠保存和历史还原。

### 任务

- [x] M3-01：确定 Value 协议。
- [x] M3-02：实现 Value 规范化和校验。
- [x] M3-03：实现稳定 fieldId。
- [x] M3-04：实现基础数组 itemId。
- [x] M3-05：实现 Candidate Snapshot。
- [x] M3-06：定义 Canonical Snapshot 后端协议（`CanonicalSnapshot` 类型 + 提交信封协议，见 `verification/05`）。
- [x] M3-07：实现 Snapshot 持久化闭环（前端 transport-free：`submit()` 产出候选 + `SnapshotService.validate` + Demo 内存闭环；后端原子持久化留待联调）。
- [x] M3-08：实现 PC Readonly Renderer。
- [x] M3-09：实现 Formatter Registry。
- [x] M3-10：实现 Default Readonly Fallback。
- [x] M3-11：实现 Unknown Fallback。
- [x] M3-12：实现基础权限处理（fail-closed，Schema 提示只能收紧）。
- [x] M3-13：实现历史 Schema 加载和展示（有序迁移链 + 只读还原）。

> 实现边界：M3-06/M3-07 的「权威快照生成、原子持久化、后端鉴权」属于后端职责，本仓库只交付协议与传输无关的前端实现；M3-12 的「未授权无法读取」由前端 fail-closed 收敛，后端必须独立强制校验。

### 验收

- [x] 提交记录同时保存 Value 和 Candidate Snapshot（后端补全为 Canonical）。
- [x] 可以读取历史记录（Demo 内存闭环）。
- [x] 可以正确还原字段标题和展示值。
- [x] 当前 Schema 修改不影响历史记录（快照冻结 displayValue，不查实时数据源）。
- [x] 缺少组件时能够降级展示（Unknown Fallback + 诊断）。
- [x] 未授权用户无法读取受保护的数据（前端 fail-closed；后端独立强制）。

## M4：Mobile 渲染器

目标：同一份 Schema 在移动端完成编辑、校验、提交和只读还原，业务 Value 与 PC 一致。

- [x] M4-01：移动物料入口 `@x-form-engine/components/mobile`。
- [x] M4-02：Input / Textarea / Number / Select / Radio / Checkbox / DatePicker 的 antd-mobile 实现。
- [x] M4-03：FormItem 移动装饰器。
- [x] M4-04：mobile 缺实现按字段回退 pc 并产生诊断。
- [x] M4-05：移动端只读还原。
- [x] M4-06：`apps/mobile-demo` 端到端验收。
- [x] M4-07：移动产物不夹带桌面 antd 的构建校验。

## M5：工程化与发布

目标：形成可接入业务项目的 MVP SDK。

### 任务

- [ ] M5-01：完成包构建配置。
- [ ] M5-02：完成公共 API 导出。
- [ ] M5-03：完成 TypeScript 类型导出。
- [ ] M5-04：完成核心单元测试。
- [ ] M5-05：完成关键集成测试。
- [ ] M5-06：完成端到端闭环测试。
- [ ] M5-07：完成 Playground。
- [ ] M5-08：完成基础组件文档。
- [ ] M5-09：完成版本管理。
- [ ] M5-10：完成 npm 发布或 Workspace 接入验证。

---

# 7. MVP 端到端验收场景

使用员工出差申请作为贯穿项目的标准验证表单。

## 7.1 表单字段

| 字段 | 组件 | 验证能力 |
|---|---|---|
| 申请人 | Input / UserSelect | 基础值 |
| 所属部门 | Select | 选项 |
| 出差事由 | Textarea | 长文本 |
| 出发日期 | DatePicker | 日期 |
| 返回日期 | DatePicker | 日期联动校验 |
| 出差天数 | Number | 计算 |
| 出差城市 | Select | 数据源 |
| 出差人员 | Array | 重复数据 |
| 费用明细 | Array | 数组结构 |
| 预计金额 | Number | 数字计算 |
| 相关附件 | Upload | 文件展示 |

UserSelect 和 Upload 可以根据实际工期采用简化实现，但必须保证 Value / Snapshot 协议可扩展。

## 7.2 闭环步骤

- [ ] 在 Designer 创建表单。
- [ ] 保存 Schema。
- [ ] 重新打开 Schema。
- [ ] 使用 PC Renderer 渲染。
- [ ] 填写数据。
- [ ] 触发校验和联动。
- [ ] 获取 Value。
- [ ] 生成 Candidate Snapshot。
- [ ] 后端校验并生成 Canonical Snapshot。
- [ ] 原子保存提交记录。
- [ ] 读取历史记录。
- [ ] 使用历史 Schema 和 Snapshot 展示。
- [ ] 修改当前 Schema。
- [ ] 再次读取历史记录，验证展示没有漂移。
- [ ] 使用未注册组件的历史 Schema，验证 Unknown Fallback。
- [ ] 使用未授权身份读取，验证权限拒绝。

以上步骤全部通过，MVP 闭环验收通过。

---

# 8. 对现有技术文档的更新要求

不要重写所有技术设计文档。

本文件作为 MVP 实施基线，其他文档继续承担详细接口设计职责。

建议按以下顺序修订：

| 顺序 | 文件 | 更新内容 |
|---|---|---|
| 1 | form-engine-architecture-design.md | 增加 MVP 分期、Core/Contract/Future 说明 |
| 2 | 01-types.md | Platform、RenderMode、Readonly、Snapshot、fieldId |
| 3 | 02-component-spec.md | PC/Mobile/Readonly 实现契约、Value 规范化 |
| 4 | 03-registry-plugin.md | MVP 同步插件、注册和卸载接口 |
| 5 | 04-formily-adapter.md | MVP 支持的 Formily 能力范围 |
| 6 | 06-runtime-context.md | 权限、Datasource、生命周期边界 |
| 7 | 08-readonly-renderer.md | 平台隔离、Formatter、Fallback、权限 |
| 8 | 09-value-snapshot.md | Candidate / Canonical Snapshot、稳定字段身份 |
| 9 | verification 文档 | 补充 MVP 验收用例和验证结果 |

更新规则：

1. 先修改公共类型和协议，再修改具体模块文档。
2. 不允许只修改某一份子文档而不更新总架构。
3. 同一个接口只能有一个权威定义。
4. 旧设计与新设计冲突时，以正式批准后的新决策为准。
5. Future 功能必须明确标记为未实现，不能在文档中描述为已有能力。
6. 所有技术验证结论必须标明实际验证环境和验证范围。

---

# 9. MVP 开发准入条件

以下事项完成后，允许进入正式 MVP 编码。

- [x] BLOCK-01 权限与只读规则统一。
- [x] BLOCK-02 组件平台契约确定。
- [x] BLOCK-03 Snapshot 生成与持久化边界确定。
- [x] BLOCK-04 字段和重复行身份规则确定。
- [x] BLOCK-05 Value 规范化规则确定。
- [x] BLOCK-06 Runtime 与 Designer 依赖边界确认。
- [x] BLOCK-07 同步 Plugin 生命周期确定。
- [x] Core / Contract / Future 范围得到确认。
- [x] MVP 验收场景得到确认。
- [x] M1 任务拆分完成。

其中 BLOCK-01 至 BLOCK-05 是核心协议和数据安全相关的实质阻塞项。BLOCK-06 和 BLOCK-07 可以通过明确的 MVP 限定决策解除阻塞，不需要等待后续高级能力实现。

---

# 10. 研发过程中的范围控制规则

## 10.1 新需求判断

新增需求必须回答：

1. 是否影响 MVP 核心闭环？
2. 是否影响已有公共接口？
3. 是否影响 Schema / Value / Snapshot 协议？
4. 是否涉及权限或安全？
5. 是否可以通过扩展点在后续实现？

只有影响核心闭环、核心协议或安全边界的问题，才允许直接进入 MVP。

其他需求原则上进入 Future Backlog。

## 10.2 不允许的做法

- 为了赶进度直接删除平台扩展接口。
- 把 Snapshot 和 Value 合并。
- 把 Designable 引入 Runtime。
- 使用数组下标作为历史重复行的唯一身份。
- 使用 String(value) 处理所有未知组件。
- 在前端执行不可信 Schema 表达式。
- 将前端权限配置视为后端授权依据。
- 为了预留功能提前实现复杂基础设施。
- 未经评审修改核心协议。

## 10.3 完成定义（Definition of Done）

一个 MVP 任务只有同时满足以下条件才算完成：

- 实现符合公共接口契约。
- 有对应测试。
- 关键异常路径得到验证。
- 不破坏已有核心闭环。
- 同步技术文档：凡落地协议/接口，必须回写对应 spec 的状态戳与「落地对照」路径；公共类型以 `packages/types` 为唯一权威，spec 不重复抄类型定义。
- 明确标记未实现的扩展能力。
- 通过代码 Review。

---

# 11. 最终实施决策

本项目正式采用以下策略：

1. 完整架构保留，不因 MVP 缩减长期模块边界。
2. MVP 仅实现 Core 能力。
3. Contract 只实现必要接口和最小兜底。
4. Future 能力进入后续迭代清单。
5. 权限、Schema、Value、Snapshot 和组件契约作为第一阶段核心协议。
6. 优先实现 Designer → Renderer → Value → Snapshot → Readonly 的垂直闭环。
7. 不以 npm 包数量衡量架构完整度。
8. 不以组件数量衡量 MVP 完成度。
9. 所有 MVP 功能以可运行、可验证、可回归的验收结果为准。

**最终验收标准：使用独立业务项目，能够完成表单设计、Schema 保存、表单填写、数据校验、提交持久化和历史只读展示，并且后续增加 Mobile、业务组件、异步插件和高级权限能力时，不需要推翻 MVP 的核心协议和模块边界。**
