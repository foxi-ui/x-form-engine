import { GlobalRegistry, TreeNode, createDesigner } from '@designable/core';
import type { IDesignerBehaviors } from '@designable/core';
import { transformToSchema, transformToTreeNode } from '@designable/formily-transformer';
import { Designer, ViewportPanel, Workbench, WorkspacePanel } from '@designable/react';
import type {
  DesignerAdapter,
  DesignerAdapterContext,
  DesignerWorkspace,
} from '@x-form-engine/types';
import { createElement } from 'react';
import ReactDOM from 'react-dom';
import { createDesignableMaterialAdapter } from './material-adapter';

export interface CreateDesignableAdapterOptions {
  /** 画布渲染宿主（默认使用 @designable/react 的最小 Workbench）。 */
  mountComponent?: unknown;
}

/**
 * Designable Adapter（Task 5.1）。
 *
 * 把 Designable 初始化、物料 Behavior/Resource 注册、TreeNode ↔ Schema 映射、
 * 画布挂载生命周期封装在 Adapter 内部；Designer Core 只通过
 * `DesignerAdapter`/`DesignerWorkspace` 协议交互，不感知 Designable 类型（C3/C13）。
 */
export function createDesignableAdapter(
  _options: CreateDesignableAdapterOptions = {}
): DesignerAdapter {
  return {
    name: 'designable',
    version: '1.0.0-beta.45',

    createWorkspace(context: DesignerAdapterContext): DesignerWorkspace {
      const engine = createDesigner({ rootComponentName: 'Form' });
      engine.workbench.ensureWorkspace({ id: 'designer' });

      const hosts = createDesignableMaterialAdapter(context.materials.getAll());
      GlobalRegistry.registerDesignerBehaviors(
        Object.values(hosts) as unknown as IDesignerBehaviors
      );

      let currentTree = new TreeNode({ componentName: 'Form' });
      engine.setCurrentTree(currentTree);

      const listeners = new Set<(schema: Record<string, unknown>) => void>();
      let container: HTMLElement | null = null;

      const getSchema = (): Record<string, unknown> => {
        const { schema } = transformToSchema(engine.getCurrentTree());
        return (schema ?? {}) as Record<string, unknown>;
      };

      const notify = (): void => {
        const schema = getSchema();
        for (const listener of [...listeners]) {
          listener(schema);
        }
      };

      return {
        setSchema(schema: Record<string, unknown>): void {
          currentTree = new TreeNode(transformToTreeNode({ schema }));
          engine.setCurrentTree(currentTree);
          notify();
        },
        getSchema(): Record<string, unknown> {
          return getSchema();
        },
        subscribe(listener: (schema: Record<string, unknown>) => void): () => void {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
        mount(c: unknown): void {
          container = c as HTMLElement;
          ReactDOM.render(
            createElement(
              Designer,
              { engine },
              createElement(
                Workbench,
                {},
                createElement(WorkspacePanel, {}, createElement(ViewportPanel))
              )
            ),
            container
          );
        },
        unmount(): void {
          if (container) {
            ReactDOM.unmountComponentAtNode(container);
            container = null;
          }
        },
      };
    },
  };
}
