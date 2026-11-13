import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [{ find: /^@formily\/antd$/, replacement: '@formily/antd/esm' }],
  },
  test: {
    name: '@x-form-engine/materials-basic',
    globals: true,
    environment: 'jsdom',
    css: false,
  },
});
