import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@x-form-engine/adapters',
    globals: true,
    environment: 'node',
  },
});
