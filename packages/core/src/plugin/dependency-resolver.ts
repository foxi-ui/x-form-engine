import { FormEngineError } from '@x-form-engine/types';
import type { FormEnginePlugin } from '@x-form-engine/types';

/**
 * 按依赖关系对插件做稳定拓扑排序（Kahn 算法）。
 *
 * 依赖边方向：`plugin` 依赖 `dependency`，即 `dependency` 必须更早安装。
 *
 * - 依赖缺失 → `PLUGIN_DEPENDENCY_MISSING`
 * - 存在循环依赖 → `PLUGIN_CONFLICT`
 */
export function resolvePluginOrder(
  plugins: FormEnginePlugin[]
): FormEnginePlugin[] {
  const byName = new Map<string, FormEnginePlugin>();
  for (const plugin of plugins) {
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

  const ordered: FormEnginePlugin[] = [];
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
