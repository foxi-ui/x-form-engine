# Form Engine V2 完整架构设计方案

> 版本：V2.1（订正版）  
> 状态：架构改造基线（已订正，待实施）  
> 技术基线：React 17 + Formily 2.3.x + Designable 1.0.0-beta + Ant Design 4 + Ant Design Mobile 5  
> 后端：Java Spring Boot  
> 目标：保留现有企业级 Runtime 能力，补齐可独立开源、可扩展的 Designer Core 和扩展包体系。
>
> 订正说明：本版依据《Form Engine V2 架构文档审核报告》（`03-form-engine-v2-review.md`）及 C1–C13 决策完成订正。本阶段只订正文档，不实施 V2 源码改造；下一阶段以《Form Engine V2 Claude Code 工程改造任务书》（`02-form-engine-v2-task.md`）为执行依据。

---

## 1. 架构目标

本次改造不是重写现有 Form Engine，而是在现有架构上补齐设计器产品化能力，使其同时满足：

1. 企业级表单运行能力：表单渲染、组件适配、数据规范化、快照、权限、只读回放。
2. 独立设计器能力：设计器核心不绑定 Designable，Designable 作为可替换的画布 Adapter。
3. 物料扩展能力：支持基础物料、业务物料、容器物料和纯设计器物料。
4. Setter 扩展能力：基础 Setter 内置，高级 Setter 可独立安装。
5. Plugin 扩展能力：Runtime Plugin 与 Designer Plugin 分离，互不依赖；抽取通用 Plugin 编排核心。
6. 开源发布能力：基础设计器具备独立使用价值，高级能力通过扩展包按需接入。
7. 渐进式实施：保留当前完整架构，优先完成必要的 MVP 闭环，不因架构预留而一次性实现所有高级功能。

**范围界定（C3）**：本方案中 Runtime 侧绝大部分为**保留**现有实现；Designer 侧是**新建**一套独立框架——Material / Setter / Panel / Command / Toolbar Registry、DesignerEngine、SchemaEditor、DesignerAdapter 接口在现有代码中均为零落点，属于全新抽象。唯一属于「迁移」的部分，是把现有 `packages/designer` 中与 Designable 耦合的代码重构为 `designer-designable` Adapter。下文不再用「拆分」描述新建部分，也不再把本次工作描述为单纯拆分现有 Designer Package。

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
Registry   Registry    Host     Registry    Parser      Services
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
- 插件生命周期（通过 Generic Plugin Core 承载）。
- 面板、命令、工具栏扩展。
- Schema 编辑和变更事件。
- 画布 Adapter 接入。
- 设计器状态和上下文管理。
- 设计器能力的公开 SDK。

**Runtime Engine**

负责表单运行能力：
- 组件协议与组件注册。
- PC / Mobile 组件实现解析。
- Schema 解析与校验（`parseSchemaDocument` / `validateEngineSchema`，分散实现，无统一 Compiler）。
- Formily 适配。
- 表单数据规范化。
- 权限处理。
- 数据源服务。
- Snapshot 创建与展示（恢复待实现，见 §11.2）。
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
| ADR-010 | 插件体系 | 通用 Plugin Core + Runtime / Designer 双 Plugin Host | 两个引擎 |
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

### 3.2 本轮订正与新增决策（C1–C13）

以下 13 项是本轮文档订正确认的架构决策，为后续实施阶段的执行依据。C1–C9 为对既有文档事实性错误与边界失真的修正，C10–C13 为新增决策。

| 编号 | 决策 | 结论摘要 |
|---|---|---|
| C1 | 保留现有 `FormSchemaDocument` | 该类型已存在于 `packages/types/src/schema.ts`，禁止重定义；设计器元数据只做兼容性扩展（新增 `designerMetadata?`），并区分 Runtime Schema / Designer Metadata / Designer UI State |
| C2 | 修正 SchemaCompiler 实现状态 | 全仓库无统一 `SchemaCompiler`，编译能力分散在 parser / validator / component-map；如需统一编排，规划 `SchemaPreparationPipeline`，不建空壳 Compiler |
| C3 | 新建 Designer Framework + 迁移 Designable Adapter | 本次是「新建」而非「简单拆包」；Designable 限定在 Adapter 层，Designer Core 不依赖 Designable |
| C4 | 明确 `createDesignerMaterials` 真实职责 | 它是 ComponentBinding → Designable 物料的派生工具，不是 Material Registry；新建 `MaterialRegistry`，派生工厂保留在 Adapter 内 |
| C5 | 缺少平台实现不能静默跳过 | 现状是静默 `return`；目标为显式诊断（Material 注册诊断、画布平台能力检查、Runtime Target 校验、Setter/Component 缺失诊断、Schema 导出前校验，分级 error/warning/info） |
| C6 | Snapshot 状态不夸大 | 「创建」已有实现；`restoreSnapshot` 仅类型声明无实现；Canonical Snapshot 后端协作未落地；Designer MVP 不隐式依赖完整 Snapshot 后端闭环 |
| C7 | 术语更新 | 统一 `ComponentBinding` / `ComponentAdapter` / `FormSchemaDocument` / `DesignerMaterialDefinition` / `MaterialRuntimeTarget`，废弃 `FormComponentDefinition` |
| C8 | 先逻辑分层，再决定物理拆包 | 先在现有 Package 内建立模块边界，具备独立职责、公共 API、依赖价值和测试后再拆包；不建空壳包，不以 Package 数量作为验收标准 |
| C9 | Runtime Plugin Manager 不能直接复制 | 现有实现耦合 `FormEngine` + 5 类 `RegistryKind`，无 `uninstall(name)`；抽取通用 Plugin 编排核心（独立前置任务），Runtime / Designer 各自提供 Host |
| C10 | Material → Schema → Runtime 一致性校验 | 定义 `MaterialRuntimeTarget` 与四阶段校验，跨 Designer / Runtime 契约，配 Contract Tests |
| C11 | SchemaEditor 不暴露 Designable TreeNode | SchemaEditor 只操作 `FormSchemaDocument` / Schema Node；Designable Adapter 负责 TreeNode 双向映射 |
| C12 | 分阶段开发，最终统一切换 | 按 Phase 0–9 推进，最终统一切换，不长期双轨演进 |
| C13 | Designer Core 依赖边界 | 允许 React（peer）、Types/Protocol、Generic Plugin Core；禁止 Designable / antd / antd-mobile / Runtime Renderer / FormEngine / 业务组件 / 具体画布实现 |

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

仓库中已存在的类型（`packages/types/src/component.ts`）为权威定义，改造时优先复用，不得为了示例接口重复创建一套同义类型：

```ts
interface ComponentProtocolDefinition {
  name: ComponentName;
  version: string;
  meta: ComponentMeta;
  capabilities: ComponentCapabilities;
  schema: ComponentSchemaDefinition;
  adapter?: ComponentAdapter;
}

interface ComponentBinding<Impl = unknown, ReadonlyImpl = unknown> {
  protocol: ComponentProtocolDefinition;
  implementations: ComponentImplementations<Impl>;
  readonly?: ReadonlyImplementations<ReadonlyImpl>;
}

interface ComponentAdapter<Value = unknown, Snapshot = unknown> {
  normalizeValue?(value: unknown, context: AdapterContext): Value;
  serializeValue?(value: Value, context: AdapterContext): unknown;
  createSnapshot?(value: Value, context: AdapterContext): Snapshot;
  restoreSnapshot?(snapshot: Snapshot, context: AdapterContext): Value;
}
```

注意：`restoreSnapshot` 目前仅有类型声明，无实现、无调用（见 §11.2），不得描述为已完成能力。

### 4.2 Designer 以 Material / Setter / Plugin 为中心

Designer 不应直接把 Runtime 的 ComponentBinding 当成唯一物料定义。

设计器物料与运行时组件有交集，但不是同一个概念：

- Runtime Component：负责真实运行时行为。
- Designer Material：负责画布拖拽、节点创建、属性配置和设计器展示。
- Setter：负责某类属性的编辑交互。
- Designer Plugin：负责向设计器注入能力。

一个业务组件可以关联一个 Runtime ComponentBinding 和一个 Designer Material；一个纯设计器布局节点可以只有 Designer Material，不必存在 Runtime ComponentBinding。

### 4.3 先逻辑分层，再决定物理拆包（C8）

禁止「为了满足架构图而立即创建全部 Package」。改造顺序必须是：

1. 先确定逻辑职责。
2. 再建立依赖边界。
3. 优先在现有 Package 中建立清晰模块边界。
4. 有独立职责、公共 API、依赖价值和测试后，再考虑物理拆包。
5. 不创建空壳 Package。
6. 不以 Package 数量作为架构验收标准。

下文 Package 清单一律标注为「目标逻辑模块」，其能否成为「经审计确认后的物理包」由实施阶段按上述标准决定，二者不得混为一谈。

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

Designer Core 依赖边界（C13）：

**允许依赖**：
- React（按需作为 peer dependency）。
- Types / Protocol。
- Generic Plugin Core（§7）。

**禁止依赖**：
- Designable。
- antd / antd-mobile。
- Runtime Renderer。
- FormEngine。
- 具体业务组件。
- 具体画布实现。

Setter UI、物料 UI、画布实现通过 Adapter / Extension 注入。

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
- `DesignerMaterialDefinition` 是**一等公民**，与 `ComponentBinding` 分离；它不要求从 `ComponentBinding` 派生（C4）。

### 5.3 Material Runtime Target（C10）

每个普通 Material 必须声明其 Runtime Target，用于跨 Designer / Runtime 的一致性校验（详见 §10）：

```ts
type MaterialRuntimeTarget =
  | {
      kind: 'component';
      componentName: string;
    }
  | {
      kind: 'schema-container';
      schemaType: string;
    }
  | {
      kind: 'designer-only';
    };
```

| 类型 | 说明 | 导出要求 |
|---|---|---|
| `component` | 对应 Runtime 中可注册的组件 | 必须能映射到 Runtime Component |
| `schema-container` | 对应 Schema 容器/布局结构 | 必须生成合法 Runtime Schema |
| `designer-only` | 仅用于设计器辅助操作 | 不得直接进入最终 Runtime Schema，导出前转换或剔除 |

### 5.4 Material Registry

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
- 支持从 ComponentBinding 派生默认 Material（由 Adapter 派生工具完成）。
- 支持独立注册 Material。
- 支持纯设计器物料和容器物料。

现有 `createDesignerMaterials(bindings)` 只是 ComponentBinding → Designable 物料的**派生工具**（返回普通对象，从未是 Registry）；本次**新建** `MaterialRegistry` 承担注册 / 查询 / 卸载职责。不得只通过改名把派生工厂描述成 Registry（C4）。

### 5.5 Setter Protocol

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
- 未安装 Setter 时必须有明确的降级提示，不能静默丢失属性（C5）。
- Setter 只负责属性编辑，不直接持有 Designable 内部节点实例。
- Setter 与 Schema 的读写必须经过 Schema Editor 或 Adapter 提供的受控接口。

### 5.6 Designer Plugin

Runtime Plugin 与 Designer Plugin 必须分离，但共享 Generic Plugin Core（§7）提供的通用生命周期能力。

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

Designer Plugin Host（基于 Generic Plugin Core）至少支持：

- 插件注册与安装。
- 依赖检查与拓扑排序。
- 重复安装检测。
- 安装失败回滚。
- 插件资源归属。
- 单插件 `uninstall(name)`。
- 卸载时只释放自身资源（依赖保护）。
- 逆序卸载。
- 生命周期事件。
- 插件安装状态查询。

不得直接复制 Runtime Plugin Manager 实现为 Designer Plugin Manager；应先抽取 Generic Plugin Core（C9，§7）。

### 5.7 Panel / Command / Toolbar Registry

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

### 5.8 SchemaEditor 边界（C11）

SchemaEditor 是 Designer 内部操作 Schema 的受控接口：

- SchemaEditor 操作 `FormSchemaDocument` / Schema Node。
- 不公开 Designable TreeNode。
- 不允许插件直接依赖 Designable 内部类型。
- Designable Adapter 负责 TreeNode 与 Schema 的双向映射。
- 画布事件转换为与底层画布无关的 Designer Event。

所有对 Schema 的读写必须经过 SchemaEditor 或 Adapter 提供的受控接口，不允许插件持有或直接操作画布内部节点实例。

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
- Schema Document 与 Designable Schema 之间的转换（TreeNode ↔ Schema 双向映射）。
- 画布初始化、销毁和事件订阅。
- 设计器选中节点、拖拽、节点增删改等事件映射为 Designer Event。
- Designable 特有配置的隔离。
- 处理 Designable 与 React 17 / antd4 的兼容。

不负责：

- 定义 Designer Material 协议。
- 决定高级 Setter 的业务语义。
- 实现 Runtime Formily 渲染。
- 实现 Snapshot 或业务数据服务。

### 6.2 现有代码改造方向

现有 `packages/designer/src/materials.ts`：

- 保留从 ComponentBinding 派生物料的能力（作为 Adapter 内的派生工具）。
- 移除其作为唯一物料入口的定位。
- 增加独立 Material Registry。
- 现状对缺少 `implementations.pc` 的 binding 是**静默跳过**（`materials.ts:127-130`，`if (!host) return`），不报错、不拒绝；目标改为显式支持纯设计器物料，并对缺失给出诊断（C5）。
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

### 6.3 平台实现能力检查与诊断（C5）

现状：缺少 PC implementation 时，`createDesignerMaterials` 可能静默跳过，而不是主动拒绝注册。目标设计必须补充以下诊断能力：

1. **Material 注册诊断**：注册时检查 Target 是否完整、Setter 引用是否存在、画布实现是否可用。
2. **画布平台实现能力检查**：画布侧检查物料是否有可用平台实现。
3. **Runtime Target 校验**：校验 `MaterialRuntimeTarget` 的合法性（§10）。
4. **缺失 Setter / Component / 平台实现诊断**：解析或导出处对缺失项产生明确诊断。
5. **Schema 导出前校验**：导出前检查结构、组件标识、容器结构、不可序列化值、designer-only 节点。

诊断必须区分 `error` / `warning` / `info` 级别，不得静默跳过、也不得仅返回笼统的「Schema 无效」。

允许 Designer Material 独立存在，不要求所有设计器物料都必须是 Runtime Component；但导出规则必须明确（`designer-only` 不得直接导出）。

## 7. Generic Plugin Core 与 Plugin Host

Generic Plugin Core 是本轮**独立、先行、可验收**的工程任务（C9），不再是 Designer Core 开发过程中的顺带重构。

### 7.1 Generic Plugin Core 职责

只处理通用插件机制：

- Plugin Definition。
- Plugin Registry。
- 依赖解析和拓扑排序。
- 重复注册 / 安装检测。
- 安装顺序。
- 安装失败回滚。
- 插件资源归属。
- 单插件卸载 `uninstall(name)`。
- 依赖保护。
- 逆序资源清理。
- 全量 `disposeAll()`。

不得依赖：

- FormEngine。
- DesignerContext。
- Runtime Registry。
- Designer Registry。
- Formily。
- Designable。
- antd。

现状依据（C9）：现有 Runtime Plugin Manager（`packages/core/src/plugin/plugin-manager.ts`）的生命周期、依赖排序、增量快照归属与回滚算法已具备，但硬编码了 `FormEngine` 与 5 类 `RegistryKind`，且**没有按插件 `uninstall(name)`**（仅 `disposeAll`）。因此必须先抽取泛型编排核心，再供两个 Host 复用。

### 7.2 Runtime Plugin Host

Runtime Host 负责将 Generic Plugin Core 接入现有 Runtime：

- 提供 Runtime Context。
- 暴露 Runtime Registry 能力。
- 将现有 Runtime Plugin Manager 的行为迁移到通用机制。
- 保持现有 Runtime 插件 API 的必要兼容。
- 对比迁移前后的行为。
- 保证 Runtime 既有插件功能回归。

不得因为抽取 Plugin Core 而改变 Runtime 业务行为。

### 7.3 Designer Plugin Host

Designer Host 在 Designer Core 阶段实现：

- 提供 DesignerContext。
- 管理 Material / Setter / Panel / Command / Toolbar 等资源。
- 将插件注册资源归属到插件。
- 支持插件卸载时清理资源。
- 不直接依赖 Runtime Context。

### 7.4 插件卸载规则

MVP 默认采用依赖保护：

- 若插件 A 依赖插件 B，且 A 仍处于已安装状态，不允许直接卸载 B。
- 先卸载 A，再卸载 B。
- 卸载顺序按安装顺序逆序执行。
- 卸载时清理插件注册的资源。
- `disposeAll()` 必须尽最大努力清理所有已安装插件。
- 级联卸载不作为 MVP 默认行为。

## 8. Runtime Engine

### 8.1 保留的现有能力

以下能力原则上不重写：

- ComponentProtocolDefinition。
- ComponentBinding。
- ComponentAdapter。
- Component Registry。
- Runtime Plugin Manager（迁移到 Generic Plugin Core 之上，见 §7.2）。
- Schema 解析与校验（`parseSchemaDocument` / `validateEngineSchema`）。
- Formily Adapter。
- Runtime Context。
- Value Normalization。
- Permission Filtering。
- Snapshot Candidate（`createCandidateSnapshot`）。
- Canonical Snapshot 协议类型（后端协作集成尚未落地）。
- PC / Mobile / Default Readonly Renderer。
- Datasource / Formatter / Service Registry。

### 8.2 Schema 编译职责（现状与目标）

仓库中不存在名为「Schema Compiler」的统一模块（C2）。编译职责目前分散在：

- `packages/core/src/schema/parser.ts`：`parseSchemaDocument`（信封解析）。
- `packages/core/src/schema/validator.ts`：`validateEngineSchema`（结构校验、`x-engine` 扩展告警）。
- `packages/formily/src/component-map.ts`：`resolveFormilyComponentMap`（组件存在性检查、平台实现解析与 PC fallback 诊断）。

不得把上述分散能力描述为已存在的完整统一 `SchemaCompiler`。只有实际需要统一编排时，才规划 `SchemaPreparationPipeline`（规划能力，非现有实现），其目标职责为：

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

不得为了架构图创建空壳 Compiler。

### 8.3 Runtime Renderer

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

### 8.4 Readonly Renderer

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

## 9. Schema Protocol

### 9.1 统一扩展命名空间

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

### 9.2 Schema Document（C1）

`FormSchemaDocument` 已定义于 `packages/types/src/schema.ts`（含 `schemaId` / `version` / `engineSchemaVersion` / `formilyVersion?` / `schema: Record<string,unknown>` / `createdAt?` / `updatedAt?`）。本次**扩展**而非重定义，仅新增 `designerMetadata`：

```ts
interface FormSchemaDocument {
  // 现有字段见 packages/types/src/schema.ts（权威定义，此处不重复抄写）
  designerMetadata?: DesignerMetadata;
}
```

`schema` 保持 `Record<string, unknown>`，不得收窄为 `ISchema`（避免 `types` 包耦合 Formily）。

必须区分三类数据，不得混为一谈：

1. **Runtime Schema**：`schema` 字段，进入 Runtime 解析与渲染。
2. **Designer Metadata**：`designerMetadata`，保存需要跨编辑会话保存的设计器信息（如画布布局、节点设计态标识）。
3. **Designer UI State**：选中节点、面板展开、拖拽状态等临时 UI 状态，**默认不持久化**，只在确有跨会话需要时才进入持久化元数据。

运行时 Schema 不应被迫携带全部设计器状态。

### 9.3 兼容性要求

- 完整保留 Formily 原生属性和能力。
- `x-engine` 只放引擎扩展。
- 未识别扩展字段不能无提示丢弃。
- Schema 导入、导出必须可往返。
- 设计器编辑不能破坏未知的 Formily 原生字段。
- Schema 版本迁移由明确的 Migration 机制承担。

## 10. Material → Schema → Runtime 一致性（C10）

这是跨 Designer 与 Runtime 的关键契约，不得只检查组件名称字符串相等，必须覆盖完整链路。

### 10.1 一致性链路

```text
Designer Material
       |
       v
MaterialRuntimeTarget
       |
       v
Schema Node / FormSchemaDocument
       |
       v
Schema Parser / Validator
       |
       v
Runtime Component Registry
       |
       v
ComponentBinding
       |
       v
ComponentAdapter
       |
       v
PC / Mobile Runtime Component
```

### 10.2 四个校验阶段

1. **Material 注册阶段**：检查 Target 是否完整、Setter 引用是否存在、画布实现是否可用。
2. **Schema 生成阶段**：检查物料生成的 Schema 节点是否符合协议，默认属性是否正确。
3. **Schema 导出阶段**：检查 Schema 结构、组件标识、容器结构、不可序列化值和 designer-only 节点。
4. **Runtime 解析阶段**：检查组件是否注册、平台实现是否存在、Adapter 是否能够解析。

### 10.3 错误诊断信息

错误至少应能定位：

- Material 名称。
- Schema 路径。
- Runtime Component 名称。
- 缺失的平台。
- 缺失的 Setter。
- 错误代码。
- 严重级别。
- 具体原因。

不能静默跳过，也不能仅返回笼统的「Schema 无效」。

### 10.4 自动化契约测试

工程任务书（`02-form-engine-v2-task.md`）必须新增 Material Contract / Schema Contract / Runtime Binding Contract Tests，覆盖：

- 基础 Material 均能生成合法 Schema。
- `component` Target 能找到 Runtime Binding。
- `schema-container` 能生成合法容器 Schema。
- `designer-only` 不会直接导出。
- 导出 Schema 能被 Runtime Parser / Validator 接受。
- 缺少 Runtime Component 时产生明确错误。
- PC / Mobile 缺失实现时产生平台诊断。
- Material 属性映射到 Schema 后不丢失。
- Schema 导入后可恢复设计器状态。

测试须根据现有 Schema 协议和 ComponentBinding 的实际映射方式设计，不得只检查字符串相等。

## 11. Value / Snapshot / Permission

### 11.1 数据生命周期

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

### 11.2 Snapshot 原则与边界（C6）

区分：

- Schema：表单结构。
- Value：当前业务值。
- Candidate Snapshot：前端候选快照。
- Canonical Snapshot：后端校验并确认的审计快照。

必须区分五类「能力」的真实状态，不得因为存在类型或局部代码就描述为完整闭环已完成：

1. Snapshot 创建能力：**已实现**（`createCandidateSnapshot`）。
2. Snapshot 类型定义：**已实现**（`CandidateSnapshot` / `CanonicalSnapshot`）。
3. Snapshot Restore 类型定义：`restoreSnapshot` **仅有类型声明**（`component.ts:44`），无实现。
4. Restore 具体实现：**缺失**。
5. Canonical Snapshot 协议：**类型存在**，后端持久化和恢复集成**未落地**。
6. 后端持久化和恢复集成：**未落地**。

Snapshot 属于 Runtime / 后端数据能力，不是 Designer Core 的职责。本次 Designer MVP 不得隐式依赖完整 Snapshot 后端闭环。

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

### 11.3 权限边界

- 前端权限过滤只用于交互和展示。
- 后端必须执行最终权限校验。
- 不允许通过前端隐藏字段实现安全控制。
- Snapshot 生成前应按策略过滤敏感字段。
- 只读详情同样需要执行数据可见性控制。

## 12. 扩展包与发布策略

### 12.1 目标包结构

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

这是**目标逻辑边界**，不是本轮的物理建包清单（C8）。建包遵循「边界全量、随内容落地」：只有具备独立构建 / 发布 / 隔离价值的包才在本轮立包，`setters-advanced` / `plugins-advanced` 等有真实消费者再建，不建空壳包。是否立包由审计 + 依赖价值 + 测试决定，不以 Package 数量作为验收标准。

### 12.2 包职责

| Package | 职责 | 是否依赖 Designable | 是否依赖 antd |
|---|---|---:|---:|
| types | 协议、公共类型 | 否 | 否 |
| core | Runtime Core / Registry / Plugin / Generic Plugin Core | 否 | 否 |
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

### 12.3 开源基础版与扩展版

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

## 13. 关键依赖约束

```text
types
  ↑
core（含 Generic Plugin Core）
  ↑
formily
  ↑
renderer

types
  ↑
designer-core（依赖 Generic Plugin Core）
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

1. `designer-core` 不依赖 `designer-designable`（C13）。
2. `designer-core` 不依赖 Runtime Renderer / FormEngine（C13）。
3. Runtime 不依赖 Designer。
4. Runtime ComponentBinding 不依赖 Designable。
5. Designer Material 不要求必须存在 Runtime ComponentBinding。
6. Designable 私有类型不得泄漏到公共 Designer Core API（C11）。
7. 高级扩展包不得成为基础包的强依赖。
8. React / React DOM 不得在多个包中重复打包。
9. PC / Mobile 组件依赖边界必须清楚。
10. 不允许为了形式上的分层引入无实际价值的循环依赖。
11. Generic Plugin Core 不依赖 Runtime / Designer 业务上下文（C9）。
12. SchemaEditor 只操作 Schema Document，不暴露 Designable TreeNode（C11）。

## 14. 分阶段开发与统一切换（C12）

开发按 Phase 分阶段推进，最终发布统一切换：

- 开发按 Phase 0–9 分阶段（见工程任务书）。
- 最终发布统一切换，不长期维护两套 Designer。
- 所有 Demo、Tests、Public Exports、文档在最终切换时一起更新。
- 可提供短期兼容 Facade，但必须有退役策略。
- 不允许新旧实现长期双轨演进。

## 15. 需要改造的现有模块

| 现有模块 | 改造动作 | 优先级 |
|---|---|---|
| `packages/types` | 补充 Material / Setter / Designer Plugin / Schema Document 公共协议 | P0 |
| `packages/core` | 保留 Runtime 核心；抽取 Generic Plugin Core；检查 Registry 生命周期和插件资源回收 | P0 |
| `packages/designer` | 新建 Designer Core；将现有 Designable 耦合代码重构为 `designer-designable` Adapter | P0 |
| `packages/designer/src/materials.ts` | 从唯一物料入口改为 Binding 派生工具 | P0 |
| `packages/designer/src/schema-io.ts` | 通过 Schema Protocol 隔离 Designable Schema 类型 | P1 |
| `packages/designer/src/preview.tsx` | 通过 Runtime SDK 使用预览能力 | P1 |
| `packages/renderer` | 保留 Formily Runtime；明确公开 API 和销毁行为 | P1 |
| `packages/renderer/src/readonly` | 验证 PC / Mobile / Default fallback 和 Snapshot 展示 | P1 |
| `packages/components` | 规范 PC / Mobile / Readonly 组件绑定 | P1 |
| 发布配置 | 独立构建、peerDependencies、类型导出和包隔离 | P0 |

具体文件和目录以 Claude Code 实际检查结果为准。如果当前目录与上述路径不同，先映射，不要直接新建重复目录。

## 16. MVP 改造范围

### P0：本轮必须完成

1. React17 / antd4 版本基线锁定。
2. Designer Core 公共类型（含 `MaterialRuntimeTarget`）。
3. Generic Plugin Core 抽取（独立前置任务）。
4. Runtime Plugin Host 迁移与回归。
5. Material Registry。
6. Setter Registry。
7. Designer Plugin Host。
8. Designable Adapter 边界。
9. 基础 Material / Setter 注册。
10. 现有 Binding 派生物料兼容。
11. Designer Schema 导入导出。
12. Material → Schema → Runtime 一致性 Contract Tests。
13. 基础设计器 Demo。
14. Runtime 与 Designer 依赖隔离。
15. 包构建、类型导出、外部项目安装验证。

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

## 17. 核心验收标准

### Generic Plugin Core
- 注册插件、重复注册、重复安装均有明确行为。
- 依赖拓扑排序正确，循环依赖可检测。
- 安装失败能够回滚。
- 插件资源归属正确。
- 单插件卸载、依赖保护、逆序清理、`disposeAll()` 均通过测试。
- 不依赖 Runtime / Designer 业务模块。

### Designer Core
- 不安装 Designable 也能创建 Designer Engine。
- 可以注册、查询、卸载 Material。
- 可以注册、查询、卸载 Setter。
- 插件依赖顺序正确。
- 插件安装失败能够回滚。
- 卸载插件只清理其注册资源。
- Designer Core 不引用 Designable 和 antd（C13 依赖检查通过）。
- SchemaEditor 不暴露 Designable TreeNode（C11 类型依赖检查通过）。

### Designable Adapter
- 可将 Material 转换为 Designable Behavior / Resource。
- 可将 SetterBinding 转换为 Designable Setter。
- Schema 导入、编辑、导出不丢字段。
- 画布卸载后释放监听和资源。
- 不支持的物料或 Setter 有明确诊断（C5）。

### Material → Schema → Runtime 一致性
- 基础 Material 均能生成合法 Schema。
- `component` Target 能找到 Runtime Binding。
- `schema-container` 能生成合法容器 Schema。
- `designer-only` 不会直接导出。
- 导出 Schema 能被 Runtime Parser / Validator 接受。
- 缺失组件 / 平台实现时产生明确诊断。

### Runtime
- 现有 Formily 渲染能力不回归。
- ComponentBinding 能关联 PC / Mobile 实现。
- Value Normalization 正常。
- 权限过滤正常。
- Snapshot 创建正常；恢复为待实现缺口（C6）。
- Readonly PC / Mobile / Default fallback 正常。

### 发布
- 各公共包可以独立构建。
- 类型声明可被外部 TypeScript 项目消费。
- React / React DOM 不重复打包。
- 外部项目仅通过公开 API 即可注册自定义 Material、Setter、Plugin 和 Runtime Component。
- 在 React17 + antd4 环境下完成安装和运行验证。

## 18. 最终架构结论

本方案明确采用：

**Runtime 以 ComponentBinding 为中心，Designer 以 Material / Setter / Plugin 为中心，两者通过 Schema Protocol 协作，并由 Material → Schema → Runtime 一致性校验闭环保证两侧契约一致。**

保留现有 Runtime 企业级能力，不重写 ComponentBinding、Schema 解析/校验、Snapshot、Permission 和 Readonly。

新增 Designer Core（独立框架），独立管理 Material、Setter、Plugin、Panel、Command 和 Toolbar；Designable 只作为可替换 Adapter。抽取 Generic Plugin Core 作为 Runtime / Designer 共享的插件编排基础，先行独立验收。

React17 + antd4 是当前稳定兼容基线，不把 UI 框架升级纳入本轮改造。高级 Setter 和 Plugin 以扩展包形式发布，基础设计器不依赖高级能力。开发按 Phase 0–9 分阶段推进，最终统一切换，不长期双轨演进。

最终形成一个既可作为企业表单引擎使用，也可将设计器核心独立开源的工程架构。
