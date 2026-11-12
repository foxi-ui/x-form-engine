# Form Engine 架构融合改造任务书

> 目标仓库：`foxi-ui/x-form-engine`  
> 执行工具：Claude Code  
> 执行原则：先审计、再拆分、渐进迁移、每阶段可验证  
> 技术基线：React 17 + Formily 2.x + Designable + Ant Design 4 + Ant Design Mobile 5  
> 重要约束：本任务不是重写项目，必须最大限度复用现有代码。    
> 完整文档：[Form Engine 融合架构设计方案](./01-form-engine-v2.md)

---

# 0. 总任务目标

基于当前仓库完成以下改造：

1. 保留现有 Runtime Engine 和企业级数据能力。
2. 新增独立 Designer Core。
3. 新增独立 Material Registry。
4. 新增独立 Setter Registry。
5. 新增 Designer Plugin Manager。
6. 新建独立 Designer Core，并将现有 `packages/designer` 的 Designable 耦合代码重构为独立 Adapter。
7. 保留现有 ComponentBinding 派生物料能力。
8. 建立基础扩展包和高级扩展包的依赖边界。
9. 完成 React17 + antd4 兼容验证。
10. 提供外部项目可消费的公开 SDK 和 Demo。

最终要求：

- Runtime 可以独立使用，不需要加载 Designer。
- Designer Core 可以独立实例化，不需要加载 Designable。
- 安装 Designable Adapter 后可以使用 Designable 画布。
- 第三方可以通过公开 API 注册自定义物料、Setter、Plugin。
- 不安装高级扩展包时，基础设计器仍可正常工作。
- 不破坏现有 Formily Schema 和 Runtime 行为。

# 1. 执行规则

## 1.1 开始前必须审计

在修改代码前，先检查：

- 仓库目录结构。
- 所有 package.json。
- pnpm workspace 配置。
- tsconfig 配置。
- 构建工具和打包配置。
- 当前公共类型。
- Registry 实现。
- Runtime Plugin Manager。
- Designer 当前实现。
- Designable 的使用位置。
- Schema 导入导出。
- Runtime Renderer。
- Readonly Renderer。
- 组件注册和 Adapter。
- 现有测试和 Demo。

输出：

`docs/tech-design/architecture-refactor-audit.md`

审计报告必须包含：

1. 当前实际 package 结构。
2. 现有模块职责。
3. 现有依赖关系。
4. 当前 Designer 与 Designable 的耦合点。
5. 当前 Material / Setter 的实现情况。
6. Runtime Plugin Manager 可复用能力。
7. 与目标架构的差异。
8. 具体需要新增、修改、保留的文件。
9. 可能影响现有 API 的兼容风险。
10. 建议实施顺序。

审计完成后再进入编码，不允许跳过审计直接批量创建目录和文件。

## 1.2 代码改造约束

- 优先复用现有类型和实现。
- 不允许创建与现有类型同义的重复协议。
- 不允许为了拆包而复制代码。
- 不允许把 Designable 私有类型泄漏到 Designer Core 公共 API。
- 不允许 Designer Core 依赖 Runtime Renderer。
- 不允许 Runtime 依赖 Designer。
- 不允许高级 Setter / Plugin 成为基础包的强依赖。
- 不允许擅自升级 React、React DOM、Formily、Designable、antd 版本。
- 不允许破坏 Formily 原生 Schema 能力。
- 所有新增公开 API 必须有类型声明和测试。
- 所有新增注册能力必须考虑重复注册、卸载和资源回收。
- 不允许通过 `any` 绕过核心协议类型设计；确有必要时必须限制边界并说明原因。
- 不允许在没有测试的情况下删除旧实现。
- 不允许将 TODO 作为已完成的功能验收。

## 1.3 版本基线

严格保持：

```text
React             17.x
React DOM         17.x
Formily           当前仓库锁定的 2.x 版本
Designable        当前仓库锁定的 beta 版本
Ant Design        4.x
Ant Design Mobile 5.x
```

先检查 lockfile 和实际依赖，不要仅按文档中的版本号修改 package.json。

---

# 2. Phase 0：仓库与兼容性审计

## Task 0.1：版本和构建环境审计

检查：

- React / React DOM 的实际版本。
- antd / antd-mobile 的实际版本。
- Formily 全部相关包版本是否一致。
- Designable 相关包版本是否一致。
- peerDependencies 是否合理。
- 是否存在重复 React。
- 是否存在重复 Formily。
- 当前构建产物是否包含宿主依赖。
- ESM / CJS / DTS 导出是否正常。

输出：

`docs/tech-design/compatibility-baseline.md`

验收：

- 所有实际依赖版本有明确记录。
- 不发生无授权的大版本升级。
- 明确当前 Designable 与 React17 / antd4 的兼容验证方式。
- 明确各公共包的 peerDependencies 策略。

## Task 0.2：架构映射

将当前源码映射到目标模块：

| 目标模块 | 当前实现 | 改造方式 |
|---|---|---|
| Designer Core | 待审计 | 新增或抽离 |
| Designable Adapter | 待审计 | 抽离 |
| Material Registry | 待审计 | 新增或扩展 |
| Setter Registry | 待审计 | 新增 |
| Designer Plugin Manager | Runtime Plugin Manager | 新增独立 Manager |
| Component Registry | 当前 Registry | 保留 |
| ComponentBinding | 当前 Binding | 保留 |
| Schema 解析/校验 | `core/schema/{parser,validator}.ts` | 保留 |
| Runtime Renderer | 当前 Renderer | 保留 |
| Readonly Renderer | 当前实现 | 保留并验证 |

实际结果必须替换表格中的“待审计”，不得根据目标设计虚构现有实现。

验收：

- 每个目标模块都能定位到实际源码。
- 标注新增、修改、保留、废弃。
- 明确迁移兼容策略。

---

# 3. Phase 1：公共协议和类型

优先在现有 `packages/types` 中扩展，避免新增重复类型包。

## Task 1.1：Designer Material 类型

新增或完善：

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

实施要求：

- 先检查现有 Material / Component 类型。
- 能复用的字段直接复用。
- Designable 专属字段必须被隔离，必要时放入 Adapter 扩展类型。
- `unknown` 仅作为跨 Adapter 的隔离边界，不允许在 Core 内直接使用 Designable 对象。
- 明确 MaterialCreateContext 和 DesignerComponentProps。

验收：

- 可以定义基础物料。
- 可以定义容器物料。
- 可以定义纯设计器物料。
- 可以定义关联 Runtime ComponentBinding 的物料。
- 不要求所有物料都具有 PC Runtime 实现。

## Task 1.2：Setter 类型

新增：

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

补充必要类型：

- SetterContext
- ValidationResult
- SetterRegistryOptions
- SetterResolveResult

验收：

- Setter 支持泛型值。
- Setter 可以声明默认属性。
- Setter 可以进行值校验。
- Setter 不依赖 Designable API。

## Task 1.3：Designer Plugin 类型

新增：

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

补充：

- PluginInstallOptions
- PluginStatus
- PluginLifecycleEvent
- PluginDependencyError

验收：

- Runtime Plugin 和 Designer Plugin 类型没有混用。
- Designer Plugin Context 不暴露 Designable 内部实例。
- Designer Plugin 可以通过公共 API 注册和释放资源。

---

# 4. Phase 2：Designer Core

建议目标结构：

```text
packages/designer-core/
└── src/
    ├── engine/
    ├── context/
    ├── registry/
    │   ├── material-registry.ts
    │   ├── setter-registry.ts
    │   ├── panel-registry.ts
    │   ├── command-registry.ts
    │   └── toolbar-registry.ts
    ├── plugin/
    │   ├── plugin-manager.ts
    │   └── dependency-resolver.ts
    ├── schema/
    │   ├── schema-editor.ts
    │   └── schema-document.ts
    ├── events/
    ├── lifecycle/
    └── index.ts
```

如果仓库当前包结构不适合新增独立目录，可以先在现有 Designer 包中建立逻辑边界，再完成包级拆分。不得机械创建目录。

## Task 2.1：MaterialRegistry

实现：

```ts
class MaterialRegistryImpl implements MaterialRegistry {
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

实现要求：

- 唯一标识按 name 管理。
- 重复注册采用明确策略，默认报错。
- 注册前进行基础定义校验。
- 支持批量注册。
- 支持按分类查询。
- 支持插件资源归属。
- 支持卸载时释放资源。
- Registry 不得依赖 Designable。

测试：

1. 注册一个 Material。
2. 重复注册。
3. 批量注册。
4. 查询不存在的 Material。
5. 按分类查询。
6. 卸载 Material。
7. 插件卸载时清理 Material。
8. 注册纯设计器物料。
9. 注册无 PC implementation 的物料。

## Task 2.2：SetterRegistry

实现：

```ts
class SetterRegistryImpl implements SetterRegistry {
  register(setter: SetterDefinition): void;
  registerMany(setters: SetterDefinition[]): void;
  unregister(name: string): void;

  get(name: string): SetterDefinition | undefined;
  getAll(): SetterDefinition[];
  has(name: string): boolean;
}
```

实现要求：

- 不依赖 Designable。
- Setter 名称唯一。
- Setter 定义校验。
- 支持插件资源归属。
- 支持卸载。
- 未注册 Setter 的解析结果必须可诊断。
- 不允许静默丢弃 SetterBinding。

测试：

1. 注册基础 Setter。
2. 重复注册。
3. 批量注册。
4. 查询和卸载。
5. 插件卸载清理。
6. 不存在 Setter 的解析。
7. Setter 默认属性。
8. Setter 校验函数。

## Task 2.3：Panel / Command / Toolbar Registry

实现最小能力：

- register
- registerMany
- unregister
- get
- getAll
- has

要求：

- 注册和卸载行为一致。
- 排序字段稳定。
- 不把 UI 实现写进 Core。
- 本阶段不实现复杂布局持久化和快捷键系统。

## Task 2.4：DesignerPluginManager

优先复用 Runtime Plugin Manager 中成熟的底层算法，但建立独立的 Designer Plugin Context。

注意：现有 Runtime Plugin Manager 的依赖 / 拓扑 / 回滚 / 归属算法硬编码在 `packages/core/src/plugin/plugin-manager.ts`（绑定 `FormEngine` + 5 类 `RegistryKind`），且**没有按插件卸载 API**（仅 `disposeAll`）。复用需先做一次 Runtime 侧重构：抽取泛型 Plugin 编排核心 + 新增 `uninstall(name)` + 补 `plugin-manager` 回归测试。这一步属于 Runtime 改造，不是纯 Designer 工作。

必须支持：

1. 插件注册。
2. 依赖检查。
3. 拓扑排序。
4. 重复安装检测。
5. 安装失败回滚。
6. 插件资源归属。
7. 卸载时只清理自身资源。
8. 逆序卸载。
9. dispose 生命周期。
10. 状态查询。

特别测试：

- A 依赖 B 时，先安装 B 再安装 A。
- A 依赖不存在的 B 时安装失败。
- A 安装过程中抛异常时，清理 A 已注册的资源。
- A 卸载不影响 B 的资源。
- 多次卸载不会重复释放。
- 依赖插件卸载时，不允许产生仍被其他插件使用的悬空依赖。

## Task 2.5：DesignerEngine

目标 API：

```ts
interface CreateDesignerOptions {
  adapter?: DesignerAdapter;
  materials?: DesignerMaterialDefinition[];
  setters?: SetterDefinition[];
  plugins?: DesignerPlugin[];
}

interface DesignerEnginePublicAPI {
  materials: MaterialRegistry;
  setters: SetterRegistry;
  panels: PanelRegistry;
  commands: CommandRegistry;
  toolbars: ToolbarRegistry;
  plugins: DesignerPluginManager;
  events: DesignerEventBus;
  schema: SchemaEditor;

  use(adapter: DesignerAdapter): void;
  destroy(): void;
}

function createDesigner(
  options?: CreateDesignerOptions
): DesignerEnginePublicAPI;
```

要求：

- Designer Core 不安装 Adapter 时也能实例化。
- 不加载 Designable 时也能注册 Material / Setter / Plugin。
- `destroy()` 必须释放插件、事件订阅和 Adapter 资源。
- `destroy()` 应具备幂等性。
- 不允许对外暴露 Registry 内部 Map。
- 公开 API 必须通过类型导出。

---

# 5. Phase 3：Designable Adapter

目标包：

`@x-form-engine/designer-designable`

## Task 3.1：定义 Adapter 接口

```ts
interface DesignerAdapter {
  name: string;
  version: string;

  createWorkspace(
    context: DesignerAdapterContext
  ): DesignerWorkspace;
}

interface DesignerWorkspace {
  mount(container: HTMLElement): void;
  unmount(): void;
  setSchema(schema: ISchema): void;
  getSchema(): ISchema;
  subscribe(
    listener: DesignerAdapterEventListener
  ): () => void;
}
```

以上是目标接口草案，必须结合现有 Designer 生命周期、React 容器管理和 Designable 能力调整，不要机械照搬。

约束：

- Designer Core 不引用 Designable 类型。
- Adapter 内部可以使用 Designable 原生 API。
- Adapter 不应把 Designable Engine 暴露为 Core 公共类型。
- Adapter 必须有明确 mount / unmount 生命周期。
- 所有事件订阅必须返回 unsubscribe。

## Task 3.2：Material 转换

实现：

```text
DesignerMaterialDefinition
          |
DesignableMaterialAdapter
          |
Behavior / Resource
          |
Designable Canvas
```

要求：

- 普通物料可以转换。
- 容器物料可以转换。
- 纯设计器物料可以转换。
- 没有 PC Runtime 实现的物料可以正常进入画布。
- Designable 专属行为只在 Adapter 内部实现。
- 物料创建 Schema 的结果必须保留 Formily 原生属性和 x-engine 扩展。

## Task 3.3：Setter 转换

实现：

```text
SetterBinding
     |
SetterRegistry
     |
DesignableSetterAdapter
     |
Designable Setter
```

要求：

- SetterBinding.name 对应注册的 Setter。
- SetterBinding.props 透传到 Setter。
- Setter 的 value / onChange 语义保持一致。
- 不存在的 Setter 有诊断提示。
- Setter 组件不需要感知 Designable 内部节点对象。

## Task 3.4：Schema 双向转换

重点检查现有：

- `schema-io.ts`
- Schema 导入逻辑。
- Schema 导出逻辑。
- Designer 节点编辑逻辑。

要求：

- Schema 导入后不丢失 Formily 原生字段。
- `x-engine` 扩展字段完整保留。
- 未识别字段不能静默删除。
- 导入、导出往返结果可验证。
- Designer Metadata 与 Runtime Schema 分离。
- 对旧版 Schema 提供兼容策略。

测试：

```text
Schema A
  -> Import
  -> Designer Edit
  -> Export
  -> Schema B

验证：
- Formily 原生字段保留
- x-engine 字段保留
- componentName 保留
- 字段路径保留
- 默认值保留
- 联动配置保留
- 未知扩展字段保留
```

## Task 3.5：现有 materials.ts 迁移

当前 `createDesignerMaterials(bindings)` 应调整为：

- 保留为 ComponentBinding -> DesignerMaterial 的派生工具。
- 生成结果注册到 MaterialRegistry。
- 不再承担唯一的物料定义职责。
- 现状对缺 `implementations.pc` 的 binding 是**静默跳过**；目标改为显式支持纯设计器物料并对缺失给出诊断。
- 从 Binding 派生的 Material 与独立 Material 可以共存。
- 对相同 componentName 的冲突必须有明确诊断。

---

# 6. Phase 4：基础扩展包

## Task 4.1：materials-basic

提供基础物料：

- Input
- TextArea
- Number
- Select
- Radio
- Checkbox
- DatePicker
- Switch
- Divider
- Grid / Layout（以现有组件能力为准）

要求：

- 基础物料通过 DesignerMaterialDefinition 注册。
- 不直接操作 Designable。
- 不依赖高级 Setter。
- 物料创建的 Schema 可被现有 Runtime 正常渲染。

## Task 4.2：setters-basic

提供：

- StringSetter
- NumberSetter
- BooleanSetter
- SelectSetter
- RadioSetter
- JSONSetter
- ArraySetter

要求：

- 基于 SetterDefinition。
- 不依赖 Designable。
- UI 可使用 antd4。
- Setter 组件受控，value / onChange 语义统一。
- 支持 disabled / readonly。

## Task 4.3：plugins-basic

提供基础插件：

- 基础属性面板。
- 基础组件面板。
- 基础工具栏。
- Schema 导入导出命令。

如果现有 Designer 已实现相应功能，应迁移或包装，不得重新实现一套平行功能。

---

# 7. Phase 5：高级扩展包

高级扩展包作为独立包实现，不得反向成为基础包依赖。

## Task 5.1：setters-advanced

规划：

- ExpressionSetter
- ConditionSetter
- DataSourceSetter
- PermissionSetter
- I18nSetter
- ReactionsSetter
- RemoteOptionsSetter

本阶段先实现扩展包注册和至少一个可运行的高级 Setter 示例，其余按当前仓库已有能力安排，不要求一次性全部完成。

高级 Setter 必须：

- 使用公开 SetterRegistry 注册。
- 不访问 Core 私有字段。
- 只通过 Schema Editor 或 Adapter 修改 Schema。
- 保留 Formily 原生属性。
- 生成符合 x-engine 规范的扩展数据。

## Task 5.2：plugins-advanced

规划：

- 表达式配置插件。
- 条件配置插件。
- 数据源配置插件。
- 权限配置插件。
- 国际化配置插件。
- Reactions 可视化插件。

本阶段先实现一个完整示例插件，验证第三方扩展模式。

---

# 8. Phase 6：Runtime 回归验证

本次改造重点是 Designer，但必须证明没有破坏 Runtime。

## Task 6.1：ComponentBinding 回归

验证：

- PC 组件注册。
- Mobile 组件注册。
- Readonly PC 组件注册。
- Readonly Mobile 组件注册。
- Default fallback。
- ComponentAdapter 数据转换。
- Snapshot 创建（恢复为待实现缺口）。

## Task 6.2：Renderer 回归

验证：

- Formily Schema 渲染。
- initialValues。
- values change。
- 表单校验。
- 提交。
- Value Normalization。
- Permission Filtering。
- Candidate Snapshot。

检查 Renderer 销毁流程：

- React 卸载后监听是否释放。
- 外部订阅是否释放。
- 是否存在重复挂载问题。
- 是否需要调用 Formily 公开销毁 API。

不得依赖 Formily 内部私有方法实现清理。

## Task 6.3：Readonly 回归

验证：

- 不创建编辑态 Formily Form。
- 不执行编辑态 Reactions / Effects。
- PC Readonly。
- Mobile Readonly。
- Default fallback。
- Formatter fallback。
- Unknown component fallback。
- Snapshot 展示。
- 敏感字段权限过滤。

---

# 9. Phase 7：包边界和发布

## Task 7.1：包依赖隔离

至少验证：

```text
designer-core
  不依赖 designable
  不依赖 antd
  不依赖 renderer

designer-designable
  依赖 designer-core
  依赖 designable

runtime
  不依赖 designer

advanced extensions
  依赖公开 Core API
  不依赖 Core 内部源码路径
```

## Task 7.2：构建和类型导出

检查：

- package.json exports。
- main / module / types。
- ESM 构建。
- CJS 构建（若仓库需要）。
- DTS 类型声明。
- peerDependencies。
- dependencies。
- external 配置。
- React / React DOM 去重。
- Formily 去重。
- CSS / 样式入口。
- 子路径导出。

不要为没有实际消费者的包强行增加复杂的多格式构建。建包遵循「边界全量、随内容落地」：只有具备独立构建 / 发布 / 隔离价值的包才立包，advanced 包等有真实消费者再建，不建空壳包。

## Task 7.3：外部项目消费验证

新建独立 Demo 消费项目，不能直接引用仓库源码路径。

至少验证：

```tsx
import { createDesigner } from '@x-form-engine/designer-core';
import { designableAdapter } from '@x-form-engine/designer-designable';
import { basicMaterials } from '@x-form-engine/materials-basic';
import { basicSetters } from '@x-form-engine/setters-basic';

const designer = createDesigner({
  adapter: designableAdapter,
});

designer.materials.registerMany(basicMaterials);
designer.setters.registerMany(basicSetters);
```

再验证第三方扩展：

```tsx
const customMaterial: DesignerMaterialDefinition = {
  name: 'business-user-select',
  version: '1.0.0',
  title: '人员选择',
  category: 'business',
  componentName: 'BusinessUserSelect',

  createSchema() {
    return {
      type: 'object',
      'x-component': 'BusinessUserSelect',
    };
  },
};

designer.materials.register(customMaterial);
```

注意：示例 Schema 必须结合仓库当前 Formily 组件协议完善，不能将不合法 Schema 当成验收通过。

最终应提供一个第三方自定义 Material、一个自定义 Setter、一个自定义 Plugin 的消费示例。

---

# 10. 测试与验收清单

## 10.1 单元测试

- [ ] Material Registry CRUD。
- [ ] Setter Registry CRUD。
- [ ] Panel / Command / Toolbar Registry。
- [ ] Designer Plugin 依赖排序。
- [ ] 插件重复安装。
- [ ] 插件安装失败回滚。
- [ ] 插件资源归属。
- [ ] 插件卸载资源清理。
- [ ] Adapter 生命周期。
- [ ] Material 转换。
- [ ] Setter 转换。
- [ ] Schema 双向转换。

## 10.2 集成测试

- [ ] Designer Core 独立创建。
- [ ] 不安装 Adapter 时可以正常使用 Core。
- [ ] 安装 Designable Adapter 后画布可运行。
- [ ] 基础物料可拖入画布。
- [ ] 基础 Setter 可编辑属性。
- [ ] 高级 Setter 未安装时有明确提示。
- [ ] 插件安装和卸载正常。
- [ ] Schema 导出可由 Runtime 渲染。
- [ ] 自定义业务组件可接入。

## 10.3 Runtime 回归

- [ ] Formily 表单渲染。
- [ ] PC / Mobile 组件切换。
- [ ] 表单联动。
- [ ] 表单校验。
- [ ] Value Normalization。
- [ ] 权限过滤。
- [ ] Snapshot 创建。
- [ ] Snapshot 恢复（缺口，待实现）。
- [ ] Readonly PC。
- [ ] Readonly Mobile。
- [ ] Default fallback。

## 10.4 发布验收

- [ ] 所有目标包独立构建。
- [ ] 类型声明生成成功。
- [ ] 外部项目安装成功。
- [ ] 无重复 React。
- [ ] 无重复 React DOM。
- [ ] 无不合理的 Formily 重复实例。
- [ ] React17 环境运行正常。
- [ ] antd4 环境运行正常。
- [ ] Mobile antd-mobile5 环境运行正常。
- [ ] 基础包不依赖高级扩展包。
- [ ] Designer Core 不依赖 Designable。

---

# 11. 交付物

必须提交：

1. `docs/tech-design/architecture-refactor-audit.md`
2. `docs/tech-design/compatibility-baseline.md`
3. 更新后的架构设计文档。
4. 新增或更新的公共协议类型。
5. Designer Core 实现。
6. Designable Adapter 实现。
7. 基础 Material / Setter / Plugin。
8. 至少一个高级扩展示例。
9. 单元测试和集成测试。
10. 外部项目消费 Demo。
11. 包依赖关系说明。
12. 改造完成报告。

改造完成报告必须说明：

- 实际修改文件。
- 新增文件。
- 删除或废弃的旧接口。
- 兼容性处理。
- 测试执行命令。
- 测试结果。
- 尚未完成的事项。
- 已知技术债务。
- 下一阶段建议。

---

# 12. 实施顺序与阶段提交

| 阶段 | 内容 | 阶段验收 |
|---|---|---|
| M0 | 仓库审计、版本基线 | 审计文档 |
| M1 | 公共类型和协议 | 类型检查、单元测试 |
| M2 | Designer Core | Registry / Plugin 测试 |
| M3 | Designable Adapter | 画布和 Schema 往返测试 |
| M4 | 基础物料 / Setter / Plugin | 基础设计器 Demo |
| M5 | Runtime 回归 | Runtime 集成测试 |
| M6 | 包拆分和发布验证 | 外部项目消费 Demo |
| M7 | 高级扩展示例 | 自定义扩展验证 |

每阶段完成后：

1. 执行相关测试。
2. 执行 TypeScript 类型检查。
3. 执行对应包构建。
4. 检查是否产生循环依赖。
5. 更新阶段文档。
6. 汇报实际完成情况。
7. 通过验收后再进入下一阶段。

不允许一次性批量改完所有模块后才进行验证。

---

# 13. Claude Code 执行提示词

请按以下规则执行本任务：

你是本项目的资深 TypeScript / React 架构工程师。请基于当前仓库源码完成 Form Engine 架构融合改造。

首先阅读：

- `docs/tech-design/form-engine-architecture-design.md`
- `docs/tech-design/mvp-roadmap.md`
- `docs/tech-design/verification/`
- 本任务书。

然后执行 Phase 0，全面审计仓库现状。

特别注意：

1. 本项目已经存在 Runtime Engine、ComponentBinding、ComponentAdapter、Schema 解析/校验（`parseSchemaDocument` / `validateEngineSchema`）、Renderer、Readonly Renderer 和 Runtime Plugin Manager。优先复用，不得重写。
2. 本轮核心工作是新增独立 Designer Core，并将 Designable 隔离为 Adapter。
3. Material Registry、Setter Registry、Designer Plugin Manager 必须是公开、可扩展的基础能力。
4. 高级 Setter 和 Plugin 必须独立于基础包。
5. React17 + antd4 是明确的版本决策，禁止擅自升级。
6. 不得把 Designable 内部对象和类型泄漏到 Designer Core。
7. 不得让 Designer Core 依赖 Runtime Renderer。
8. 不得破坏 Formily 原生 Schema 能力和 x-engine 扩展字段。
9. 现有 API 如果需要变更，必须提供兼容层或迁移说明。
10. 先完成 MVP 闭环，再处理非阻塞扩展。

执行策略：

- 每次只实施一个 Phase。
- 每个 Phase 完成后运行测试、类型检查和构建。
- 发现当前架构与任务书不一致时，先输出差异和调整建议，不得擅自大范围重构。
- 不得编造测试结果。
- 不得将未实现的接口标记为完成。
- 不得为了追求目录结构而引入不必要的 Package。
- 只有在确实需要独立构建、发布或依赖隔离时，才拆成独立 Package。

现在开始 Phase 0。

完成 Phase 0 后，先给出：
1. 当前架构映射。
2. 与目标架构差异。
3. 文件级改造清单。
4. 风险清单。
5. Phase 1 的具体实施计划。

等待阶段验收后继续下一阶段。
