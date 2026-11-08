import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * 移动端 demo：antd-mobile 的 `es` 入口自带 `global.css` 的副作用 import，
 * 因此这里只需要 React 插件，不需要任何 less 预处理配置。
 */
export default defineConfig({
  plugins: [react()],
});
