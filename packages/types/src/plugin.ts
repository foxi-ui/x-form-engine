/**
 * Generic Plugin Core 最小通用契约（C9）。
 *
 * 编排核心只依赖本文件的静态契约，与 Runtime `FormEnginePlugin`、Designer
 * `DesignerPlugin` 解耦：两者在结构上都满足 `PluginDefinition`
 * （`name` / `version` / `dependencies?`），但本文件不 import 任何业务上下文。
 */

/** 依赖解析与拓扑排序所需的最小插件形状。 */
export interface PluginDefinition {
  name: string;
  version: string;
  dependencies?: string[];
}

/**
 * 依赖解析器所需的插件注册表最小视图。
 *
 * 由 Runtime / Designer 两个 Plugin Host 各自提供具体实现（Phase 2 的编排核心
 * 只面向此接口，不接触具体 Host 的资源注册表）。
 */
export interface PluginRegistry {
  get(name: string): PluginDefinition | undefined;
  has(name: string): boolean;
  list(): PluginDefinition[];
}

/**
 * 依赖边：`from` 依赖 `to`（`to` 必须先于 `from` 安装）。
 */
export interface DependencyEdge {
  from: string;
  to: string;
}
