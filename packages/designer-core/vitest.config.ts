import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@x-form-engine/designer-core',
    globals: true,
    environment: 'node',
  },
});
