import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@x-form-engine/plugins-basic',
    globals: true,
    environment: 'node',
  },
});
