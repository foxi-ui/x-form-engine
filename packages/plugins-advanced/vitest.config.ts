import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@x-form-engine/plugins-advanced',
    globals: true,
    environment: 'jsdom',
    css: false,
  },
});
