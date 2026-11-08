# 01. 公共类型、领域模型与协议

> 状态：implemented ｜ 落地对照：`packages/types` ｜ 最后更新：2026-11-08

## 1. 目标

定义 Form Engine 各子包之间稳定、低耦合的公共契约。公共类型包不得依赖 React、Formily、Designable 或具体 UI 组件库。

## 2. 核心领域对象

引擎需要区分以下对象：

| 对象 | 说明 | 生命周期 |
|---|---|---|
| Engine | 注册表、插件、服务和配置的容器 | 应用级 |
| Runtime | 一次渲染或设计会话的运行上下文 | 会话级 |
| Schema | 表单结构和配置 | 版本化持久化 |
| Value | 当前业务数据 | 表单实例级 |
| Snapshot | 提交时的结构和展示信息快照 | 提交记录级 |
| Component Definition | 组件元数据、能力和实现定义 | 引擎注册期 |
| Plugin | 一组可安装的扩展能力 | Engine 生命周期 |

## 3. 基础类型

```ts
export type Platform = 'pc' | 'mobile'; // 'readonly' 是 RenderMode，不是 Platform
export type RenderMode = 'edit' | 'preview' | 'readonly';

export type Primitive =
  | string
  | number
  | boolean
  | null;

export type JsonValue =
  | Primitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = Record<string, JsonValue>;
export type FieldPath = string;
export type ComponentName = string;
export type PluginName = string;
```

业务值可能包含日期、文件对象等非 JSON 运行时对象，因此 `JsonValue` 只用于可序列化协议，不应强行作为 Formily Runtime Value 的类型。

## 4. Engine 配置

```ts
export interface FormEngineOptions {
  id?: string;
  platform?: Platform;
  locale?: string;
  debug?: boolean;
  components?: ComponentBinding[];
  plugins?: FormEnginePlugin[];
  services?: Partial<EngineServices>;
}
```

`FormEngineOptions` 是创建时配置。运行中需要变化的内容应通过明确的配置更新 API，不建议直接修改原始 options 对象。

## 5. 组件能力

```ts
export interface ComponentCapabilities {
  editable: boolean;
  readonly: boolean;
  mobile: boolean;
  datasource?: boolean;
  validation?: boolean;
  snapshot?: boolean;
  children?: boolean;
}
```

能力声明用于注册期校验、设计器过滤和运行时诊断。能力声明不是权限控制，也不能代替服务端安全校验。

## 6. 组件定义

```ts
export interface ComponentMeta {
  title: string;
  description?: string;
  category?: string;
  icon?: string;
  tags?: string[];
  deprecated?: boolean;
}

export interface ComponentSchemaDefinition {
  type: 'object';
  properties?: Record<string, unknown>;
  default?: Record<string, unknown>;
}

export interface ComponentProtocolDefinition {
  name: ComponentName;
  version: string;
  meta: ComponentMeta;
  capabilities: ComponentCapabilities;
  schema: ComponentSchemaDefinition;
  adapter?: ComponentAdapter;
}
```

`ComponentProtocolDefinition` 不含 React / Formily / Designable 依赖；React 实现通过组件实现层的 `ComponentBinding`（见 `02-component-spec.md`）绑定，不进入公共类型包。详细组件契约见 `02-component-spec.md`。

## 7. Schema 与版本

建议持久化封装：

```ts
export interface FormSchemaDocument {
  schemaId: string;
  version: number;
  engineSchemaVersion: string;
  formilyVersion?: string;
  schema: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}
```

必须区分业务表单版本与引擎 Schema 协议版本。前者表示业务发布版本，后者表示引擎扩展字段的协议版本。

## 8. Value 与提交结果

```ts
export interface FormSubmitResult {
  values: Record<string, unknown>;
  snapshot: FormSnapshot;
  schemaId?: string;
  schemaVersion?: number;
}

export interface FormSnapshot {
  snapshotVersion: string;
  schemaId: string;
  schemaVersion: number;
  createdAt: string;
  locale?: string;
  fields: Record<string, FieldSnapshot>;
}

export interface FieldSnapshot {
  path: FieldPath;
  component: ComponentName;
  componentVersion?: string;
  /** 稳定字段身份（name 拼接），与用下标访问的 path 分离 */
  fieldId?: string;
  title?: string;
  value: unknown;
  displayValue?: unknown;
  options?: Array<{
    label: string;
    value: unknown;
  }>;
  metadata?: Record<string, unknown>;
  /** 数组字段的行级快照 */
  items?: RepeatItemSnapshot[];
}

/** 重复数组行的稳定快照：itemId 保证行身份稳定，不错位 */
export interface RepeatItemSnapshot {
  itemId: string;
  fields: Record<string, FieldSnapshot>;
}
```

Snapshot 细节见 `09-value-snapshot.md`。

## 9. 服务协议

```ts
export interface EngineServices {
  datasource: DatasourceService;
  permission: PermissionService;
  i18n: I18nService;
  snapshot?: SnapshotService;
}

export interface DatasourceRequest {
  service: string;
  params?: Record<string, unknown>;
  keyword?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export interface DatasourceResult<T = unknown> {
  items: T[];
  total?: number;
  hasMore?: boolean;
}

export interface DatasourceService {
  query<T = unknown>(
    request: DatasourceRequest
  ): Promise<DatasourceResult<T>>;
}
```

## 10. 错误协议

```ts
export type FormEngineErrorCode =
  | 'SCHEMA_INVALID'
  | 'SCHEMA_VERSION_UNSUPPORTED'
  | 'COMPONENT_NOT_FOUND'
  | 'COMPONENT_CAPABILITY_MISMATCH'
  | 'PLUGIN_CONFLICT'
  | 'PLUGIN_DEPENDENCY_MISSING'
  | 'DATASOURCE_FAILED'
  | 'SNAPSHOT_FAILED'
  | 'PERMISSION_DENIED'
  | 'RENDER_FAILED';

export class FormEngineError extends Error {
  constructor(
    public readonly code: FormEngineErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'FormEngineError';
  }
}
```

## 11. 类型治理要求

- 公共类型采用语义化版本管理。
- 非兼容字段变更必须升级主版本或引入新协议版本。
- `unknown` 优先于 `any`；在边界处校验和收窄类型。
- 不把 Formily 内部类型泄漏到所有公共包。
- 对外导出类型必须配套使用示例和兼容性测试。
