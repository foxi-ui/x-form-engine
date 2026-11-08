import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@formily\/antd$/, replacement: '@formily/antd/esm' },
      { find: /^@designable\/react$/, replacement: '@designable/react/esm' },
      { find: /^@designable\/formily-antd$/, replacement: '@designable/formily-antd/esm' },
      { find: /^@designable\/formily-setters$/, replacement: '@designable/formily-setters/esm' },
      { find: /^@designable\/react-settings-form$/, replacement: '@designable/react-settings-form/esm' },
    ],
  },
  test: {
    name: '@x-form-engine/designer',
    globals: true,
    environment: 'jsdom',
    setupFiles: [fileURLToPath(new URL('./vitest.setup.ts', import.meta.url))],
    css: false,
  },
});
