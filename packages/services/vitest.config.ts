import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@x-form-engine/services',
    globals: true,
    environment: 'node',
  },
});
