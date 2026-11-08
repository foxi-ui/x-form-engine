import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * 与 playground 同构：
 * 1. `javascriptEnabled`：antd 4 的 less 使用 JS 表达式；
 * 2. alias 去掉 webpack 风格的 `~` 前缀，交给 Vite/Less 按 node_modules 解析。
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^~/, replacement: '' }],
    // pnpm 会因 peer 依赖差异安装多份 @designable/react 与 @formily/*。
    // Designable 的 React Context / GlobalRegistry、Formily 的 FormContext 必须
    // 单实例，否则画布拿不到宿主上下文、字段拿不到 Formily field（无标签）。
    dedupe: [
      'react',
      'react-dom',
      '@formily/antd',
      '@formily/core',
      '@formily/json-schema',
      '@formily/react',
      '@designable/core',
      '@designable/react',
      '@designable/react-settings-form',
    ],
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
});
