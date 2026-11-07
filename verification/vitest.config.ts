import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: [
      // Designable 与 @formily/antd 的 CJS 产物会直接 require .less，Node 无法解析。
      // 验证环境统一指向 ESM 产物，并由 test.css=false 将样式模块置空。
      { find: /^@formily\/antd$/, replacement: '@formily/antd/esm' },
      { find: /^@designable\/react$/, replacement: '@designable/react/esm' },
      { find: /^@designable\/formily-antd$/, replacement: '@designable/formily-antd/esm' },
      { find: /^@designable\/formily-setters$/, replacement: '@designable/formily-setters/esm' },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    testTimeout: 15000,
    css: false,
  },
})
