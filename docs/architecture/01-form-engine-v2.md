# Form Engine 融合架构设计方案

> 版本：V2.0  
> 状态：架构改造基线  
> 技术基线：React 17 + Formily 2.3.x + Designable 1.0.0-beta + Ant Design 4 + Ant Design Mobile 5  
> 后端：Java Spring Boot  
> 目标：保留现有企业级 Runtime 能力，补齐可独立开源、可扩展的 Designer Core 和扩展包体系。

---

## 1. 架构目标

本次改造不是重写现有 Form Engine，而是在现有架构上补齐设计器产品化能力，使其同时满足：

1. 企业级表单运行能力：表单渲染、组件适配、数据规范化、快照、权限、只读回放。
2. 独立设计器能力：设计器核心不绑定 Designable，Designable 作为可替换的画布 Adapter。
3. 物料扩展能力：支持基础物料、业务物料、容器物料和纯设计器物料。
4. Setter 扩展能力：基础 Setter 内置，高级 Setter 可独立安装。
5. Plugin 扩展能力：Runtime Plugin 与 Designer Plugin 分离，互不依赖。
6. 开源发布能力：基础设计器具备独立使用价值，高级能力通过扩展包按需接入。
7. 渐进式实施：保留当前完整架构，优先完成必要的 MVP 闭环，不因架构预留而一次性实现所有高级功能。

**范围界定**：本方案中 Runtime 侧绝大部分为**保留**现有实现；Designer 侧是**新建**一套独立框架——Material / Setter / Panel / Command / Toolbar Registry、DesignerEngine、SchemaEditor、DesignerAdapter 接口在现有代码中均为零落点，属于全新抽象。唯一属于「迁移」的部分，是把现有 `packages/designer` 中与 Designable 耦合的代码重构为 `designer-designable` Adapter。下文不再用「拆分」描述新建部分。

## 2. 总体架构

采用分层、双引擎、适配器模式。

```text
                         Application
                              |
              +---------------+---------------+
              |                               |
        Designer SDK                     Runtime SDK
              |                               |
       Designer Engine                    Runtime Engine
              |                               |
  +-----------+-----------+       +-----------+-----------+
  |           |           |       |           |           |
Material   Setter      Plugin   Component   Schema      Runtime
Registry   Registry    Manager  Registry    Parser      Services
  |           |           |       |           |           |
  +-----------+-----------+       +-----------+-----------+
              |                               |
       Designer Adapter                 Formily Adapter
              |                               |
        Designable Canvas                Formily Runtime
              |                               |
       Schema Document <---- Schema Protocol ---->
                              |
                 Enterprise Data Layer
                              |
          Value / Snapshot / Permission / Datasource
```

### 2.1 两个核心引擎

**Designer Engine**

负责设计器的通用能力：
- 物料注册与管理。
- Setter 注册与属性配置。
- 插件生命周期。
- 面板、命令、工具栏扩展。
- Schema 编辑和变更事件。
- 画布 Adapter 接入。
- 设计器状态和上下文管理。
- 设计器能力的公开 SDK。

**Runtime Engine**

负责表单运行能力：
- 组件协议与组件注册。
- PC / Mobile 组件实现解析。
- Schema 编译。
- Formily 适配。
- 表单数据规范化。
- 权限处理。
- 数据源服务。
- Snapshot 创建与展示（恢复待实现）。
- PC / Mobile Readonly Renderer。

两个引擎通过 Schema Protocol 协作，不互相依赖。

## 3. 已确认的架构决策

| 编号 | 决策项 | 最终决策 | 影响范围 |
|---|---|---|---|
| ADR-001 | React 版本 | React 17 | 所有 React 包 |
| ADR-002 | PC UI | Ant Design 4 | PC Renderer、Designer |
| ADR-003 | Mobile UI | Ant Design Mobile 5 | Mobile Renderer |
| ADR-004 | 表单运行时 | Formily 2.x | Runtime |
| ADR-005 | 设计器底层 | Designable | Designable Adapter |
| ADR-006 | 设计器核心 | 独立 Designer Core | Designer |
| ADR-007 | 组件协议 | 保留 ComponentBinding | Runtime / Designer |
| ADR-008 | 物料体系 | 独立 Material Registry | Designer |
| ADR-009 | Setter 体系 | 独立 Setter Registry | Designer |
| ADR-010 | 插件体系 | Runtime / Designer 双 Plugin Manager | 两个引擎 |
| ADR-011 | Schema 扩展 | 统一 x-engine 命名空间 | Schema Protocol |
| ADR-012 | Readonly | 独立 React Renderer，PC / Mobile 分开，支持 Default fallback | Renderer |
| ADR-013 | 自定义业务组件 | React Component + Adapter | Runtime |
| ADR-014 | 扩展发布 | 基础包 + 可选扩展包 | Packages |
| ADR-015 | 版本升级 | 当前阶段不升级 React / antd | 工程治理 |

### 3.1 React / Ant Design 兼容性决策

当前正式兼容基线：

```text
React                 17.x
React DOM             17.x
Formily               2.3.x
Designable            1.0.0-beta.x
Ant Design            4.x
Ant Design Mobile     5.x
TypeScript            使用仓库当前锁定版本
```

约束：

- 不将 React 18/19 作为本轮改造目标。
- 不将 Ant Design 5 作为本轮改造目标。
- Designer Core 不直接依赖 Ant Design 组件。
- Designer 的基础 UI 和 Setter 可以依赖 antd4，但应通过 UI Adapter 或独立实现隔离。
- Designable Adapter 负责处理 Designable 与当前 React / antd 版本之间的兼容。
- Mobile Renderer 不得直接依赖 antd4 的组件实现。
- React、React DOM、Formily 等宿主依赖应避免被重复打包，作为适当的 peerDependencies 管理。
- 具体 peerDependencies 版本范围以仓库实际锁定版本和验证结果为准，不得仅凭主版本号推断兼容性。

## 4. 核心设计原则

### 4.1 Runtime 以 ComponentBinding 为中心

保留现有组件协议体系：

```text
ComponentProtocol
       |
ComponentBinding
       |
  +----+----------+----------------+
  |               |                |
PC Implementation Mobile Impl  Readonly Impl
  |               |                |
  +---------------+----------------+
                  |
            ComponentAdapter
                  |
       normalize / serialize /
       snapshot / restore
```

组件协议描述组件的跨端、数据和能力契约；Binding 将协议与各平台实现关联。

建议保留或完善以下类型：

```ts
interface ComponentProtocolDefinition {
  name: string;
  version: string;
  meta: ComponentMeta;
  capabilities: ComponentCapabilities;
  schema: ComponentSchemaDefinition;
  adapter?: ComponentAdapter;
}

interface ComponentBinding {
  protocol: ComponentProtocolDefinition;
  implementations: {
    pc?: ComponentImplementation;
    mobile?: ComponentImplementation;
  };
  readonly?: {
    pc?: ReadonlyImplementation;
    mobile?: ReadonlyImplementation;
    default?: ReadonlyImplementation;
  };
}

interface ComponentAdapter {
  normalizeValue?(value: unknown, context: AdapterContext): unknown;
  serializeValue?(value: unknown, context: AdapterContext): unknown;
  createSnapshot?(value: unknown, context: SnapshotContext): unknown;
  restoreSnapshot?(snapshot: unknown, context: SnapshotContext): unknown;
}
```

以上为目标契约，改造时优先复用仓库已有类型，不得为了示例接口重复创建一套同义类型。

### 4.2 Designer 以 Material / Setter / Plugin 为中心

Designer 不应直接把 Runtime 的 ComponentBinding 当成唯一物料定义。

设计器物料与运行时组件有交集，但不是同一个概念：

- Runtime Component：负责真实运行时行为。
- Designer Material：负责画布拖拽、节点创建、属性配置和设计器展示。
- Setter：负责某类属性的编辑交互。
- Designer Plugin：负责向设计器注入能力。

一个业务组件可以关联一个 Runtime ComponentBinding 和一个 Designer Material；一个纯设计器布局节点可以只有 Designer Material，不必存在 Runtime ComponentBinding。

## 5. Designer Core 设计

### 5.1 目标模块

```text
designer-core
├── engine
├── context
├── registry
│   ├── material-registry
│   ├── setter-registry
│   ├── panel-registry
│   ├── command-registry
│   └── toolbar-registry
├── plugin
├── schema
├── events
├── lifecycle
└── public-api
```

Designer Core 不直接依赖：
- Designable。
- antd。
- Formily React Renderer。
- 具体业务组件。

可以依赖公共 types 和无 UI 的基础工具。

### 5.2 Designer Material Protocol

```ts
interface DesignerMaterialDefinition {
  name: string;
  version: string;

  title: string;
  description?: string;
  category?: string;
  icon?: React.ReactNode;
  keywords?: string[];

  componentName: string;

  createSchema: (
    context: MaterialCreateContext
  ) => ISchema;

  setters?: Record<string, SetterBinding>;

  designerComponent?: React.ComponentType<DesignerComponentProps>;

  capabilities?: {
    draggable?: boolean;
    container?: boolean;
    nested?: boolean;
    resizable?: boolean;
    hidden?: boolean;
  };

  designable?: {
    behavior?: unknown;
    resource?: unknown;
  };

  dependencies?: string[];
}
```

注意：
- `designable.behavior/resource` 只能由 Designable Adapter 消费。
- Designer Core 不解释 Designable 的内部结构。
- Material 可以只服务设计器，不要求一定有 Runtime Component。
- Material 的 `componentName` 必须能在最终 Schema 中得到一致的组件标识。
- `createSchema` 必须返回合法的 Formily Schema 或受控的扩展 Schema。

### 5.3 Material Registry

目标 API：

```ts
interface MaterialRegistry {
  register(material: DesignerMaterialDefinition): void;
  registerMany(materials: DesignerMaterialDefinition[]): void;

  unregister(name: string): void;

  get(name: string): DesignerMaterialDefinition | undefined;
  getAll(): DesignerMaterialDefinition[];
  getByCategory(category: string): DesignerMaterialDefinition[];

  has(name: string): boolean;
  clear(): void;
}
```

能力要求：

- 名称唯一，重复注册必须有明确策略。
- 支持版本信息。
- 支持依赖检查。
- 支持插件归属记录。
- 支持插件卸载时释放插件注册的物料。
- 支持从 ComponentBinding 派生默认 Material。
- 支持独立注册 Material。
- 支持纯设计器物料和容器物料。

现有 `createDesignerMaterials(bindings)` 只是 ComponentBinding → Designable 物料的派生工具（返回普通对象，从未是 Registry）；本次**新建** `MaterialRegistry` 承担注册 / 查询 / 卸载职责。

### 5.4 Setter Protocol

```ts
interface SetterProps<T = unknown> {
  value: T;
  onChange(value: T): void;
  disabled?: boolean;
  readonly?: boolean;
  schema?: ISchema;
  context: SetterContext;
  [key: string]: unknown;
}

interface SetterDefinition {
  name: string;
  version: string;
  component: React.ComponentType<SetterProps>;
  valueType?: string;
  defaultProps?: Record<string, unknown>;
  validate?: (
    value: unknown,
    context: SetterContext
  ) => ValidationResult;
}

interface SetterBinding {
  name: string;
  props?: Record<string, unknown>;
}
```

目标 API：

```ts
interface SetterRegistry {
  register(setter: SetterDefinition): void;
  registerMany(setters: SetterDefinition[]): void;
  unregister(name: string): void;

  get(name: string): SetterDefinition | undefined;
  getAll(): SetterDefinition[];
  has(name: string): boolean;
}
```

Setter 分层：

**基础 Setter**
- StringSetter
- NumberSetter
- BooleanSetter
- SelectSetter
- RadioSetter
- JSONSetter
- ArraySetter

**高级 Setter**
- ExpressionSetter
- ConditionSetter
- DataSourceSetter
- PermissionSetter
- I18nSetter
- ReactionsSetter
- RemoteOptionsSetter

扩展原则：

- 基础 Designer Core 不依赖高级 Setter。
- 高级 Setter 以独立扩展包提供。
- Material 通过 `SetterBinding` 声明使用哪个 Setter。
- 未安装 Setter 时必须有明确的降级提示，不能静默丢失属性。
- Setter 只负责属性编辑，不直接持有 Designable 内部节点实例。
- Setter 与 Schema 的读写必须经过 Schema Editor 或 Adapter 提供的受控接口。

### 5.5 Designer Plugin

Runtime Plugin 与 Designer Plugin 必须分离。

```ts
interface DesignerPlugin {
  name: string;
  version: string;
  dependencies?: string[];

  install(
    context: DesignerPluginContext
  ): void | (() => void);

  dispose?(): void;
}

interface DesignerPluginContext {
  materials: MaterialRegistry;
  setters: SetterRegistry;
  panels: PanelRegistry;
  commands: CommandRegistry;
  toolbars: ToolbarRegistry;
  events: DesignerEventBus;
  schema: SchemaEditor;
  engine: DesignerEnginePublicAPI;
}
```

Designer Plugin Manager 至少支持：

- 插件注册与安装。
- 依赖检查与拓扑排序。
- 重复安装检测。
- 安装失败回滚。
- 插件资源归属。
- 卸载时只释放自身资源。
- 逆序卸载。
- 生命周期事件。
- 插件安装状态查询。

现有 Runtime Plugin Manager 的生命周期、依赖和资源回收实现应优先复用其底层机制，但不能复用 Runtime Context 作为 Designer Context。

### 5.6 Panel / Command / Toolbar Registry

设计器面板和命令属于扩展能力。

```ts
interface PanelDefinition {
  name: string;
  title: string;
  component: React.ComponentType<PanelProps>;
  position?: 'left' | 'right' | 'bottom';
  order?: number;
}

interface CommandDefinition {
  name: string;
  execute(context: CommandContext): void | Promise<void>;
  disabled?: (context: CommandContext) => boolean;
}

interface ToolbarDefinition {
  name: string;
  component: React.ComponentType<ToolbarProps>;
  order?: number;
}
```

本轮先提供最小注册、查询、卸载能力。复杂快捷键、命令历史、面板布局持久化放到后续版本。

## 6. Designable Adapter

### 6.1 职责

`designer-designable` 是 Designer Core 与 Designable 的唯一连接层。

```text
Designer Core
      |
Designable Adapter
      |
Designable Engine / Workspace
      |
Designable Behavior / Resource / Setter
      |
Canvas
```

负责：

- Designer Material 转换为 Designable Behavior / Resource。
- SetterBinding 转换为 Designable Setter 配置。
- Schema Document 与 Designable Schema 之间的转换。
- 画布初始化、销毁和事件订阅。
- 设计器选中节点、拖拽、节点增删改等事件映射。
- Designable 特有配置的隔离。
- 处理 Designable 与 React 17 / antd4 的兼容。

不负责：

- 定义 Designer Material 协议。
- 决定高级 Setter 的业务语义。
- 实现 Runtime Formily 渲染。
- 实现 Snapshot 或业务数据服务。

### 6.2 现有代码改造方向

现有 `packages/designer/src/materials.ts`：

- 保留从 ComponentBinding 派生物料的能力。
- 移除其作为唯一物料入口的定位。
- 增加独立 Material Registry。
- 现状对缺少 `implementations.pc` 的 binding 是**静默跳过**（`materials.ts:127-130`），不报错、不拒绝；目标改为显式支持纯设计器物料，并对缺失给出诊断。
- 将 Designable Behavior / Resource 的生成迁移到 Adapter。

现有 `packages/designer/src/schema-io.ts`：

- 评估其作为 Schema Protocol 转换层的职责。
- 避免 Designer Core 直接依赖 Designable 的 Schema 类型。
- 保留原有 Schema 读写能力和扩展字段。
- 对无法识别的扩展字段提供可诊断行为，避免静默丢弃。

现有 `packages/designer/src/preview.tsx`：

- 明确其属于预览 Runtime，而非 Designer Core。
- 通过公开 Renderer SDK 调用 Runtime。
- 不允许 Designer Core 直接创建 Formily Form。

## 7. Runtime Engine

### 7.1 保留的现有能力

以下能力原则上不重写：

- ComponentProtocolDefinition。
- ComponentBinding。
- ComponentAdapter。
- Component Registry。
- Runtime Plugin Manager。
- Schema 解析与校验（`parseSchemaDocument` / `validateEngineSchema`）。
- Formily Adapter。
- Runtime Context。
- Value Normalization。
- Permission Filtering。
- Snapshot Candidate。
- Canonical Snapshot 协议类型（后端协作集成尚未落地）。
- PC / Mobile / Default Readonly Renderer。
- Datasource / Formatter / Service Registry。

### 7.2 Schema 编译职责

仓库中不存在名为「Schema Compiler」的统一模块，编译职责目前分散在：

- `packages/core/src/schema/parser.ts`：`parseSchemaDocument`（信封解析）。
- `packages/core/src/schema/validator.ts`：`validateEngineSchema`（结构校验、`x-engine` 扩展告警）。
- `packages/formily/src/component-map.ts`：`resolveFormilyComponentMap`（组件存在性检查、平台实现解析与 PC fallback 诊断）。

若本轮将其收敛为统一编译层，其目标职责为：

1. Schema 结构校验。
2. `x-engine` 扩展字段解析。
3. 组件注册存在性检查。
4. 平台实现检查。
5. Schema 版本识别。
6. 默认配置和平台配置合并。
7. Formily Adapter 转换。
8. 诊断信息生成。

不负责：

- 执行 Formily Reactions。
- 执行业务请求。
- 最终权限裁决。
- Snapshot 持久化。
- 业务数据事务。

### 7.3 Runtime Renderer

编辑态 Renderer 继续以 Formily 为运行时：

```tsx
const engine = createFormEngine({
  platform: 'pc',
  components: [
    inputBinding,
    departmentSelectBinding,
    userSelectBinding,
  ],
  services,
});

<FormEngineProvider engine={engine}>
  <FormRenderer
    schema={schema}
    initialValues={initialValues}
    onValuesChange={handleChange}
  />
</FormEngineProvider>
```

Runtime 通过 ComponentBinding 解析实际组件，不直接依赖 Designer Material。

### 7.4 Readonly Renderer

保留独立只读 React Renderer：

```text
ReadonlyRenderer
   |
Platform Resolver
   |
+-- PC Readonly
+-- Mobile Readonly
+-- Default Readonly
   |
Formatter / Snapshot Display
```

优先级：

1. 当前平台专属 readonly 实现。
2. Default readonly 实现。
3. Formatter。
4. Unknown fallback。

只读模式不得创建编辑态 Formily Form，不执行编辑态 Reactions / Effects，不调用实时数据源。

历史详情以 Canonical Snapshot 为主要展示依据。缺失 Snapshot 时，才允许按明确策略降级使用当前 Value。

## 8. Schema Protocol

### 8.1 统一扩展命名空间

继续使用：

```json
{
  "type": "string",
  "x-engine": {
    "component": {
      "version": "1.0.0"
    },
    "platform": {
      "pc": {},
      "mobile": {}
    },
    "data": {},
    "permission": {},
    "snapshot": {}
  }
}
```

不要新增散落的 `x-engine-*` 字段。

### 8.2 Schema Document

`FormSchemaDocument` 已定义于 `packages/types/src/schema.ts`（含 `schemaId` / `version` / `engineSchemaVersion` / `formilyVersion?` / `schema: Record<string,unknown>` / `createdAt?` / `updatedAt?`）。本次**扩展**而非重定义，仅新增 `designerMetadata`：

```ts
interface FormSchemaDocument {
  // 现有字段见 packages/types/src/schema.ts
  designerMetadata?: DesignerMetadata;
}
```

`schema` 保持 `Record<string, unknown>`，不得收窄为 `ISchema`（避免 `types` 包耦合 Formily）。

`designerMetadata` 用于保存设计器专属信息，例如：

- 画布布局。
- 面板状态（如确需持久化）。
- 节点设计态标识。
- 设计器辅助元数据。

运行时 Schema 不应被迫携带全部设计器状态。

### 8.3 兼容性要求

- 完整保留 Formily 原生属性和能力。
- `x-engine` 只放引擎扩展。
- 未识别扩展字段不能无提示丢弃。
- Schema 导入、导出必须可往返。
- 设计器编辑不能破坏未知的 Formily 原生字段。
- Schema 版本迁移由明确的 Migration 机制承担。

## 9. Value / Snapshot / Permission

### 9.1 数据生命周期

```text
Schema Document
      |
Runtime Compile
      |
Formily Form
      |
User Input
      |
Value Normalization
      |
Permission Filtering
      |
Candidate Snapshot
      |
Backend Validation / Canonicalization
      |
Value + Canonical Snapshot
      |
Atomic Persistence
```

### 9.2 Snapshot 原则

区分：

- Schema：表单结构。
- Value：当前业务值。
- Candidate Snapshot：前端候选快照。
- Canonical Snapshot：后端校验并确认的审计快照。

Snapshot 应支持：

- 字段标识和路径。
- 数组明细 itemId。
- 组件名称及版本。
- 展示值冻结。
- 远程组织树、远程搜索下拉、数据字典回放。
- 历史 Schema 版本。
- 迁移和诊断。
- 权限过滤。

Candidate Snapshot 不能直接作为审计最终依据。Canonical Snapshot 应由后端生成或校验，并与业务 Value 原子持久化。

### 9.3 权限边界

- 前端权限过滤只用于交互和展示。
- 后端必须执行最终权限校验。
- 不允许通过前端隐藏字段实现安全控制。
- Snapshot 生成前应按策略过滤敏感字段。
- 只读详情同样需要执行数据可见性控制。

## 10. 扩展包与发布策略

### 10.1 目标包结构

```text
packages/
├── types/
├── core/
├── formily/
├── renderer/
├── components/
├── designer-core/
├── designer-designable/
├── materials-basic/
├── setters-basic/
├── plugins-basic/
├── setters-advanced/
├── plugins-advanced/
├── renderer-readonly/
├── services/
└── sdk/
```

这是目标逻辑边界。建包遵循「边界全量、随内容落地」：只有具备独立构建 / 发布 / 隔离价值的包才在本轮立包，`setters-advanced` / `plugins-advanced` 等有真实消费者再建，不建空壳包。

### 10.2 包职责

| Package | 职责 | 是否依赖 Designable | 是否依赖 antd |
|---|---|---:|---:|
| types | 协议、公共类型 | 否 | 否 |
| core | Runtime Core / Registry / Plugin | 否 | 否 |
| formily | Formily 适配 | 否 | 否 |
| renderer | 编辑态渲染 | 否 | 可通过组件包间接使用 |
| components | PC / Mobile 组件实现 | 否 | 是，按平台拆分 |
| designer-core | Designer 核心能力 | 否 | 否 |
| designer-designable | Designable Adapter | 是 | 是，兼容 Designable |
| materials-basic | 基础物料 | 否 | 可选 |
| setters-basic | 基础 Setter | 否 | 可选 |
| plugins-basic | 基础设计器插件 | 否 | 可选 |
| setters-advanced | 高级 Setter | 否 | 可选 |
| plugins-advanced | 高级 Plugin | 否 | 可选 |
| renderer-readonly | 只读渲染 | 否 | 可按平台适配 |

### 10.3 开源基础版与扩展版

基础开源版应具备：
- Designer Core。
- Designable Adapter。
- 基础 Material。
- 基础 Setter。
- 基础 Designer Plugin。
- 基础 Schema 导入导出。
- Runtime Renderer。
- 基础 PC / Mobile 组件接入能力。

高级扩展包可提供：
- 表达式 Setter。
- 条件配置 Setter。
- 数据源 Setter。
- 权限 Setter。
- 国际化 Setter。
- Reactions 可视化配置。
- 复杂布局和业务物料。
- 高级调试和诊断插件。

扩展包必须基于公开协议注册，不能依赖 Core 内部私有变量或 Designable 内部对象。

## 11. 关键依赖约束

```text
types
  ↑
core
  ↑
formily
  ↑
renderer

types
  ↑
designer-core
  ↑
designer-designable

designer-core
  ↑
materials-basic / setters-basic / plugins-basic
  ↑
setters-advanced / plugins-advanced

core + formily + renderer
  ↑
components / services / sdk
```

硬性约束：

1. `designer-core` 不依赖 `designer-designable`。
2. `designer-core` 不依赖 Runtime Renderer。
3. Runtime 不依赖 Designer。
4. Runtime ComponentBinding 不依赖 Designable。
5. Designer Material 不要求必须存在 Runtime ComponentBinding。
6. Designable 私有类型不得泄漏到公共 Designer Core API。
7. 高级扩展包不得成为基础包的强依赖。
8. React / React DOM 不得在多个包中重复打包。
9. PC / Mobile 组件依赖边界必须清楚。
10. 不允许为了形式上的分层引入无实际价值的循环依赖。

## 12. 需要改造的现有模块

| 现有模块 | 改造动作 | 优先级 |
|---|---|---|
| `packages/types` | 补充 Material / Setter / Designer Plugin / Schema Document 公共协议 | P0 |
| `packages/core` | 保留 Runtime 核心；检查 Registry 生命周期和插件资源回收 | P1 |
| `packages/designer` | 新建 Designer Core；将现有 Designable 耦合代码重构为 `designer-designable` Adapter | P0 |
| `packages/designer/src/materials.ts` | 从唯一物料入口改为 Binding 派生工具 | P0 |
| `packages/designer/src/schema-io.ts` | 通过 Schema Protocol 隔离 Designable Schema 类型 | P1 |
| `packages/designer/src/preview.tsx` | 通过 Runtime SDK 使用预览能力 | P1 |
| `packages/renderer` | 保留 Formily Runtime；明确公开 API 和销毁行为 | P1 |
| `packages/renderer/src/readonly` | 验证 PC / Mobile / Default fallback 和 Snapshot 展示 | P1 |
| `packages/components` | 规范 PC / Mobile / Readonly 组件绑定 | P1 |
| 发布配置 | 独立构建、peerDependencies、类型导出和包隔离 | P0 |

具体文件和目录以 Claude Code 实际检查结果为准。如果当前目录与上述路径不同，先映射，不要直接新建重复目录。

## 13. MVP 改造范围

### P0：本轮必须完成

1. React17 / antd4 版本基线锁定。
2. Designer Core 公共类型。
3. Material Registry。
4. Setter Registry。
5. Designer Plugin Manager。
6. Designable Adapter 边界。
7. 基础 Material / Setter 注册。
8. 现有 Binding 派生物料兼容。
9. Designer Schema 导入导出。
10. 基础设计器 Demo。
11. Runtime 与 Designer 依赖隔离。
12. 包构建、类型导出、外部项目安装验证。

### P1：闭环增强

1. Panel / Command / Toolbar Registry。
2. 高级 Setter 插件化。
3. 高级 Designer Plugin。
4. Schema 迁移和诊断增强。
5. PC / Mobile 预览联动。
6. 插件卸载和资源释放测试。
7. Snapshot / Readonly 完整回放验证。

### P2：后续演进

1. 替换 Designable 的第二种 Adapter。
2. 更复杂的设计器工作区。
3. 多人协同编辑。
4. 设计器状态持久化。
5. 插件市场或扩展目录。
6. 高级调试、性能分析和诊断工具。

## 14. 核心验收标准

### Designer Core
- 不安装 Designable 也能创建 Designer Engine。
- 可以注册、查询、卸载 Material。
- 可以注册、查询、卸载 Setter。
- 插件依赖顺序正确。
- 插件安装失败能够回滚。
- 卸载插件只清理其注册资源。
- Designer Core 不引用 Designable 和 antd。

### Designable Adapter
- 可将 Material 转换为 Designable Behavior / Resource。
- 可将 SetterBinding 转换为 Designable Setter。
- Schema 导入、编辑、导出不丢字段。
- 画布卸载后释放监听和资源。
- 不支持的物料或 Setter 有明确诊断。

### Runtime
- 现有 Formily 渲染能力不回归。
- ComponentBinding 能关联 PC / Mobile 实现。
- Value Normalization 正常。
- 权限过滤正常。
- Snapshot 创建正常；恢复为待实现缺口。
- Readonly PC / Mobile / Default fallback 正常。

### 发布
- 各公共包可以独立构建。
- 类型声明可被外部 TypeScript 项目消费。
- React / React DOM 不重复打包。
- 外部项目仅通过公开 API 即可注册自定义 Material、Setter、Plugin 和 Runtime Component。
- 在 React17 + antd4 环境下完成安装和运行验证。

## 15. 最终架构结论

本方案明确采用：

**Runtime 以 ComponentBinding 为中心，Designer 以 Material / Setter / Plugin 为中心，两者通过 Schema Protocol 协作。**

保留现有 Runtime 企业级能力，不重写 ComponentBinding、Schema 解析/校验、Snapshot、Permission 和 Readonly。

新增 Designer Core，独立管理 Material、Setter、Plugin、Panel、Command 和 Toolbar；Designable 只作为可替换 Adapter。

React17 + antd4 是当前稳定兼容基线，不把 UI 框架升级纳入本轮改造。高级 Setter 和 Plugin 以扩展包形式发布，基础设计器不依赖高级能力。

最终形成一个既可作为企业表单引擎使用，也可将设计器核心独立开源的工程架构。
