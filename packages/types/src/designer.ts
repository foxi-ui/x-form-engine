import type { Platform } from './base';
import type { EventBus } from './engine';
import type { PluginInstallOptions } from './plugin';
import type { FormSchemaDocument } from './schema';

/**
 * Designer Core 公共协议（Phase 1，C3/C4/C5/C9/C10/C11/C13）。
 *
 * 依赖边界：本文件属于 `packages/types`，保持 UI / Formily / Designable 无关。
 * - 所有 UI 组件字段（`icon` / `designerComponent` / setter `component` /
 *   panel & toolbar `component`）一律以 `unknown` 占位，具体类型
 *   （`React.ReactNode` / `React.ComponentType`）由 React 宿主（designer-core，
 *   C13 允许 React peer）提供。
 * - `createSchema` 返回 `Record<string, unknown>` 而非 Formily `ISchema`，
 *   避免 `types` 包耦合 Formily（C1）。
 * - Designable 专属字段（`designable.behavior/resource`）只能是 `unknown`，
 *   仅由 Designable Adapter 消费（C11/C13）。
 */

// ---------------------------------------------------------------------------
// Material
// ---------------------------------------------------------------------------

/** 物料画布能力标记。 */
export interface MaterialCapabilities {
  draggable?: boolean;
  container?: boolean;
  nested?: boolean;
  resizable?: boolean;
  hidden?: boolean;
}

/** `createSchema` 的调用上下文，可扩展且 UI 无关。 */
export interface MaterialCreateContext {
  platform?: Platform;
  locale?: string;
  [key: string]: unknown;
}

/** 画布内展示组件（`designerComponent`）的 props，可扩展且 UI 无关。 */
export interface DesignerComponentProps {
  /** 节点渲染所需的 Schema 属性。 */
  props?: Record<string, unknown>;
  /** 子节点内容（容器物料）。 */
  children?: unknown;
  [key: string]: unknown;
}

/**
 * 每个普通 Material 必须声明的 Runtime Target，用于
 * Material → Schema → Runtime 一致性校验（C10）。
 */
export type MaterialRuntimeTarget =
  | { kind: 'component'; componentName: string }
  | { kind: 'schema-container'; schemaType: string }
  | { kind: 'designer-only' };

/**
 * Designer Material 一等公民定义（C4）。
 *
 * 与 Runtime `ComponentBinding` 分离，不要求从 `ComponentBinding` 派生；
 * 每个 Material 通过 `runtimeTarget` 声明其 Runtime 目标（缺失时注册校验产生诊断）。
 */
export interface DesignerMaterialDefinition {
  name: string;
  version: string;

  title: string;
  description?: string;
  category?: string;
  /** 图标。UI 无关占位；具体类型为 `React.ReactNode`（由 React 宿主提供）。 */
  icon?: unknown;
  keywords?: string[];

  /** 组件标识；当 `runtimeTarget.kind === 'component'` 时须与其 `componentName` 一致（C10）。 */
  componentName: string;

  /** 生成 Formily 原生 + x-engine 扩展 Schema。 */
  createSchema: (context: MaterialCreateContext) => Record<string, unknown>;

  setters?: Record<string, SetterBinding>;

  /** 画布展示组件。UI 无关占位；具体类型为 `React.ComponentType<DesignerComponentProps>`。 */
  designerComponent?: unknown;

  capabilities?: MaterialCapabilities;

  /** Designable 专属字段，仅由 Designable Adapter 消费（C11/C13）。 */
  designable?: { behavior?: unknown; resource?: unknown };

  dependencies?: string[];

  /** Runtime 目标（C10）。 */
  runtimeTarget?: MaterialRuntimeTarget;
}

// ---------------------------------------------------------------------------
// Setter
// ---------------------------------------------------------------------------

/** Setter 渲染上下文，可扩展且 UI 无关。 */
export interface SetterContext {
  schema?: Record<string, unknown>;
  path?: string;
  locale?: string;
  [key: string]: unknown;
}

/** Setter 值校验结果。 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
  code?: string;
}

/** Setter 组件 props（受控，value / onChange 语义统一）。 */
export interface SetterProps<T = unknown> {
  value: T;
  onChange(value: T): void;
  disabled?: boolean;
  readonly?: boolean;
  /** Formily 原生 schema；`types` 保持 Formily 无关，用 Record 表示。 */
  schema?: Record<string, unknown>;
  context: SetterContext;
  [key: string]: unknown;
}

/** Setter 定义（不依赖 Designable API）。 */
export interface SetterDefinition {
  name: string;
  version: string;
  /** Setter UI 组件。UI 无关占位；具体类型为 `React.ComponentType<SetterProps>`。 */
  component: unknown;
  valueType?: string;
  defaultProps?: Record<string, unknown>;
  validate?: (value: unknown, context: SetterContext) => ValidationResult;
}

/** Material 声明使用某个 Setter 的绑定（name + 透传 props）。 */
export interface SetterBinding {
  name: string;
  props?: Record<string, unknown>;
}

/** Setter Registry 注册选项。 */
export interface SetterRegistryOptions {
  onDuplicate?: 'throw' | 'ignore' | 'override';
}

/**
 * 解析 `SetterBinding` 的结果：未注册 / 校验失败必须可诊断（C5），
 * 不允许静默丢弃 SetterBinding。
 */
export interface SetterResolveResult {
  found: boolean;
  setter?: SetterDefinition;
  binding?: SetterBinding;
  diagnostics: SchemaDiagnostic[];
}

// ---------------------------------------------------------------------------
// Diagnostic
// ---------------------------------------------------------------------------

/** 诊断严重级别。 */
export type SchemaDiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * Schema 一致性诊断（C5/C10）。
 *
 * 可被 Material 注册、Schema 导出、Runtime 解析三处复用；
 * 必须能定位到 Material / Schema 路径 / Runtime Component / 平台 / Setter，
 * 不静默跳过、不笼统报错。
 */
export interface SchemaDiagnostic {
  /** 错误码（跨 Designer / Runtime 复用）。 */
  code: string;
  severity: SchemaDiagnosticSeverity;
  /** 具体原因（人类可读）。 */
  message: string;
  materialName?: string;
  /** Schema 路径（JSON Pointer 风格）。 */
  schemaPath?: string;
  componentName?: string;
  /** 缺失的平台。 */
  platform?: Platform;
  /** 缺失的 Setter 名称。 */
  setterName?: string;
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/** Designer 命名资源注册表的最小通用形状。 */
export interface DesignerRegistry<T extends { name: string }> {
  register(def: T): void;
  registerMany(defs: T[]): void;
  unregister(name: string): void;
  get(name: string): T | undefined;
  getAll(): T[];
  has(name: string): boolean;
}

export interface MaterialRegistry extends DesignerRegistry<DesignerMaterialDefinition> {
  getByCategory(category: string): DesignerMaterialDefinition[];
  clear(): void;
  /** 读取注册阶段累积的诊断（如缺失平台实现、非法 runtimeTarget，C5/C10）。 */
  getDiagnostics(): SchemaDiagnostic[];
}

export interface SetterRegistry extends DesignerRegistry<SetterDefinition> {}

export interface PanelDefinition {
  name: string;
  title: string;
  /** UI 无关占位；具体类型为 `React.ComponentType<PanelProps>`。 */
  component: unknown;
  position?: 'left' | 'right' | 'bottom';
  order?: number;
}

export interface CommandContext {
  [key: string]: unknown;
}

export interface CommandDefinition {
  name: string;
  execute(context: CommandContext): void | Promise<void>;
  disabled?(context: CommandContext): boolean;
}

export interface ToolbarDefinition {
  name: string;
  /** UI 无关占位；具体类型为 `React.ComponentType<ToolbarProps>`。 */
  component: unknown;
  order?: number;
}

export type PanelRegistry = DesignerRegistry<PanelDefinition>;
export type CommandRegistry = DesignerRegistry<CommandDefinition>;
export type ToolbarRegistry = DesignerRegistry<ToolbarDefinition>;

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Designer 事件总线，复用通用 EventBus 协议。 */
export type DesignerEventBus = EventBus;

/** 与底层画布无关的 Designer 事件（C11），由 Adapter 从画布事件映射而来。 */
export type DesignerEvent =
  | { type: 'node:select'; path: string }
  | { type: 'node:unselect'; path: string }
  | { type: 'node:add'; path: string; componentName: string }
  | { type: 'node:remove'; path: string }
  | { type: 'node:move'; from: string; to: string }
  | { type: 'node:update'; path: string }
  | { type: 'schema:change' };

// ---------------------------------------------------------------------------
// SchemaEditor
// ---------------------------------------------------------------------------

/** 与底层画布无关的 Schema 节点（C11），不暴露 Designable TreeNode。 */
export interface SchemaNode {
  path: string;
  schema: Record<string, unknown>;
}

/**
 * SchemaEditor 受控接口（C11）。
 *
 * 只操作 `FormSchemaDocument` / Schema Node，不公开 Designable TreeNode；
 * Designable Adapter 负责 TreeNode ↔ Schema 的双向映射。
 */
export interface SchemaEditor {
  getDocument(): FormSchemaDocument;
  update(updater: (document: FormSchemaDocument) => FormSchemaDocument): void;
  subscribe(listener: (document: FormSchemaDocument) => void): () => void;
}

// ---------------------------------------------------------------------------
// Designer Plugin
// ---------------------------------------------------------------------------

/**
 * Designer 插件（C9，与 Runtime `FormEnginePlugin` 解耦）。
 *
 * `install` 可返回一个清理函数；两者共享 Generic Plugin Core 的生命周期能力。
 */
export interface DesignerPlugin {
  name: string;
  version: string;
  dependencies?: string[];

  /**
   * 安装插件，可返回一个清理函数。
   *
   * 若同时实现 `dispose`，卸载时 `dispose()` 先执行，再执行此处返回的
   * teardown；两者各自异常隔离（一个抛错不影响另一个）。语义由 Generic
   * Plugin Core 定义，见 `packages/core/src/plugin/generic/plugin-host.ts`。
   */
  install(context: DesignerPluginContext): void | (() => void);

  dispose?(): void;
}

/**
 * Designer 插件上下文（C13）：只注入 Designer 侧公开能力，
 * 不暴露 Designable 内部实例。
 */
export interface DesignerPluginContext {
  materials: MaterialRegistry;
  setters: SetterRegistry;
  panels: PanelRegistry;
  commands: CommandRegistry;
  toolbars: ToolbarRegistry;
  events: DesignerEventBus;
  schema: SchemaEditor;
  engine: DesignerEnginePublicAPI;
}

/** Designer 插件宿主（基于 Generic Plugin Core，Phase 4 实现）。 */
export interface DesignerPluginHost {
  install(plugin: DesignerPlugin, options?: PluginInstallOptions): void;
  uninstall(name: string): void;
  list(): Array<{ plugin: DesignerPlugin; active: boolean }>;
  disposeAll(): void;
}

// ---------------------------------------------------------------------------
// DesignerEngine / Adapter
// ---------------------------------------------------------------------------

/**
 * Designer Adapter 目标接口草案（Phase 5）。
 *
 * 需结合现有 Designer 生命周期、React 容器管理和 Designable 能力调整，
 * 不要机械照搬；Designer Core 不引用 Designable 类型。
 */
export interface DesignerAdapter {
  name: string;
  version: string;
  createWorkspace(context: DesignerAdapterContext): DesignerWorkspace;
}

/** Adapter 创建画布工作区的上下文，可扩展且 UI 无关。 */
export interface DesignerAdapterContext {
  materials: MaterialRegistry;
  setters: SetterRegistry;
  events: DesignerEventBus;
  schema: SchemaEditor;
  [key: string]: unknown;
}

/** 画布工作区（Adapter 实现，Phase 5 草案）。 */
export interface DesignerWorkspace {
  /** 挂载容器。具体类型为 `HTMLElement`（Phase 5 结合现有生命周期调整）。 */
  mount(container: unknown): void;
  unmount(): void;
  setSchema(schema: Record<string, unknown>): void;
  getSchema(): Record<string, unknown>;
  subscribe(listener: (schema: Record<string, unknown>) => void): () => void;
}

/** `createDesigner` 的创建选项（Phase 4）。 */
export interface CreateDesignerOptions {
  adapter?: DesignerAdapter;
  materials?: DesignerMaterialDefinition[];
  setters?: SetterDefinition[];
  plugins?: DesignerPlugin[];
}

/**
 * Designer Engine 公开 API（Phase 4）。
 *
 * Designer Core 不安装 Adapter 时也能实例化；`destroy()` 幂等并释放
 * 插件、事件订阅与 Adapter 资源。
 */
export interface DesignerEnginePublicAPI {
  materials: MaterialRegistry;
  setters: SetterRegistry;
  panels: PanelRegistry;
  commands: CommandRegistry;
  toolbars: ToolbarRegistry;
  plugins: DesignerPluginHost;
  events: DesignerEventBus;
  schema: SchemaEditor;

  use(adapter: DesignerAdapter): void;
  destroy(): void;
}
