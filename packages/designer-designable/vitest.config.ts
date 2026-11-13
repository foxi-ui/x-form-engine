import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@x-form-engine/designer-designable',
    globals: true,
    environment: 'jsdom',
  },
});
