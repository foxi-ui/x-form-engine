import { FormEngineError } from '@x-form-engine/types';
import type { PluginDefinition } from '@x-form-engine/types';

/**
 * 按依赖关系对插件做稳定拓扑排序（Kahn 算法）。
 *
 * 依赖边方向：`plugin` 依赖 `dependency`，即 `dependency` 必须更早安装。
 *
 * - 依赖缺失 → `PLUGIN_DEPENDENCY_MISSING`
 * - 插件名重复或存在循环依赖 → `PLUGIN_CONFLICT`
 *
 * 泛型 `P extends PluginDefinition`：Runtime `FormEnginePlugin`、Designer 插件
 * 及纯 `PluginDefinition` 对象都可直接传入，排序逻辑与错误码完全一致。
 */
export function resolvePluginOrder<P extends PluginDefinition>(
  plugins: P[]
): P[] {
  const byName = new Map<string, P>();
  for (const plugin of plugins) {
    // 同名插件会产生歧义拓扑节点，显式报冲突，而不是让后续长度校验误报循环依赖。
    if (byName.has(plugin.name)) {
      throw new FormEngineError(
        'PLUGIN_CONFLICT',
        `Duplicate plugin name "${plugin.name}"`,
        { plugin: plugin.name }
      );
    }
    byName.set(plugin.name, plugin);
  }

  for (const plugin of plugins) {
    for (const dependency of plugin.dependencies ?? []) {
      if (!byName.has(dependency)) {
        throw new FormEngineError(
          'PLUGIN_DEPENDENCY_MISSING',
          `Plugin "${plugin.name}" depends on missing plugin "${dependency}"`,
          { plugin: plugin.name, dependency }
        );
      }
    }
  }

  // dep -> 依赖它的插件名列表
  const dependents = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  for (const plugin of plugins) {
    dependents.set(plugin.name, []);
    indegree.set(plugin.name, 0);
  }

  for (const plugin of plugins) {
    for (const dependency of new Set(plugin.dependencies ?? [])) {
      dependents.get(dependency)?.push(plugin.name);
      indegree.set(plugin.name, (indegree.get(plugin.name) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const plugin of plugins) {
    if (indegree.get(plugin.name) === 0) {
      queue.push(plugin.name);
    }
  }

  const ordered: P[] = [];
  while (queue.length > 0) {
    const name = queue.shift() as string;
    const plugin = byName.get(name);
    if (plugin) {
      ordered.push(plugin);
    }

    for (const dependent of dependents.get(name) ?? []) {
      const remaining = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, remaining);
      if (remaining === 0) {
        queue.push(dependent);
      }
    }
  }

  if (ordered.length !== plugins.length) {
    throw new FormEngineError(
      'PLUGIN_CONFLICT',
      'Plugin dependency cycle detected',
      { plugins: plugins.map((plugin) => plugin.name) }
    );
  }

  return ordered;
}
