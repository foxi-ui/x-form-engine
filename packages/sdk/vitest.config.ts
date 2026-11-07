import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@x-form-engine/sdk',
    globals: true,
    environment: 'jsdom',
  },
});
