import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * `@formily/antd` 根入口会通过副作用 import 引入大量 `.less` 样式，
 * 其中包含 webpack 风格的 `~antd/...` 引用，因此需要：
 * 1. `javascriptEnabled`：antd 4 的 less 使用 JS 表达式；
 * 2. alias 去掉 `~` 前缀，交给 Vite/Less 按 node_modules 解析。
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^~/, replacement: '' }],
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
});
