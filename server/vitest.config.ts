import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    reporters: process.env.CI ? ['verbose', 'github-actions'] : ['verbose'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test/**', 'src/main.ts'],
      reporter: ['text', 'lcov'],
    },
  },
});
