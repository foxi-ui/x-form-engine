import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@x-form-engine/types',
    globals: true,
    environment: 'node',
  },
});
