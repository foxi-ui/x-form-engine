# 03. Registry 与 Plugin 系统

> 状态：implemented（同步插件）｜ 落地对照：`packages/core/registry`、`packages/core/plugin` ｜ 最后更新：2026-11-08

## 1. 设计目标

Registry 管理引擎可发现的扩展资源；Plugin 将一组资源和服务以可控生命周期安装到 Engine。两者应支持冲突检测、依赖管理、卸载和诊断。

## 2. Registry 分类

| Registry | 注册内容 |
|---|---|
| ComponentRegistry | 字段组件、布局组件 |
| DecoratorRegistry | Formily 装饰器 |
| ServiceRegistry | 数据源、权限、国际化等服务 |
| FormatterRegistry | 只读格式化器 |
| ScopeRegistry | Engine / App / Custom Scope |
| DesignerRegistry | 设计器物料和 Setter |

建议提供统一 `EngineRegistry` 门面，但内部保持独立命名空间和类型约束。

## 3. 基础接口

```ts
export interface Registry<T> {
  register(name: string, value: T): void;
  unregister(name: string): void;
  get(name: string): T | undefined;
  has(name: string): boolean;
  list(): Array<{ name: string; value: T }>;
}

export interface EngineRegistry {
  components: Registry<ComponentBinding>;
  decorators: Registry<unknown>;
  services: Registry<unknown>;
  formatters: Registry<unknown>;
  designer: Registry<unknown>;
}
```

注册 API 应支持来源信息，例如 `sourcePlugin`、版本和注册时间，以便冲突定位和卸载回滚。

## 4. Plugin 契约

```ts
export interface FormEnginePlugin {
  name: string;
  version: string;
  dependencies?: string[];
  install(context: PluginContext): void | Promise<void>;
  dispose?(context: PluginContext): void | Promise<void>;
}

export interface PluginContext {
  registry: EngineRegistry;
  services: EngineServices;
  events: EventBus;
  config: EngineConfig;
}
```

## 5. 安装流程

1. 校验插件名称和版本。
2. 校验依赖插件已安装或在本次安装队列中。
3. 检测循环依赖。
4. 检测 Registry 名称冲突。
5. 创建安装事务，记录本次新增资源。
6. 执行插件 `install`。
7. 安装成功后标记为 active。
8. 安装失败时回滚本次资源，并标记 failed。

插件安装顺序应基于依赖拓扑排序，而不是简单依赖数组顺序。

## 6. 卸载流程

- 默认禁止卸载仍被其他插件依赖的插件。
- 卸载时先执行 `dispose`，再移除该插件拥有的注册资源。
- 插件只能移除自己拥有的资源，不能误删其他插件注册项。
- `dispose` 应尽量幂等。
- Engine 销毁时按安装顺序的逆序释放插件。

## 7. 冲突策略

建议默认采用严格冲突策略：

- 同名组件重复注册：抛出 `PLUGIN_CONFLICT`。
- 显式声明 `replace: true` 的覆盖行为：仅允许受信任插件，并记录覆盖来源。
- 组件版本不兼容：拒绝注册。
- 插件依赖缺失：拒绝安装。
- 插件安装失败：回滚，不保留半安装状态。

不要默认采用“后注册覆盖先注册”，否则插件加载顺序会影响线上行为。

## 8. 插件示例

```ts
const organizationPlugin: FormEnginePlugin = {
  name: 'organization',
  version: '1.0.0',
  install({ registry, services }) {
    registry.components.register(
      'UserSelect',
      UserSelectBinding
    );

    registry.services.register(
      'organization.datasource',
      services.datasource
    );
  },
};
```

示例中的 Registry API 仅用于说明。正式实现应确保资源注册带有插件归属信息，便于回滚和卸载。

## 9. 事件系统

事件适用于通知，不应用作强类型服务调用的替代品。`emit` 隔离监听器异常：单个监听器抛错不影响其余监听器、也不向 `emit` 抛出，仅记录日志（错误仍走 `FormEngineError`，不走 EventBus 传播）。

```ts
export interface EventBus {
  on<T>(event: string, handler: (payload: T) => void): () => void;
  emit<T>(event: string, payload: T): void;
  once<T>(event: string, handler: (payload: T) => void): () => void;
}
```

建议事件命名（事件 = 命名空间 + 载荷 + 来源，同步优先，异步订阅用微任务）：

- `engine:init` / `engine:dispose`
- `plugin:install` / `plugin:dispose` / `plugin:failed`
- `schema:compile`
- `renderer:mount` / `renderer:unmount`
- `submit`
- `snapshot:create`

## 10. 验收标准

- 插件依赖排序正确。
- 重复注册可被检测。
- 安装中途失败能够回滚。
- 卸载不会删除其他插件资源。
- Engine 销毁能释放监听器和资源。
- 插件错误能定位到插件名、版本和资源名。
