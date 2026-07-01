import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'test/**',
        'node_modules/**',
        'src/**/*.module.ts',
        'src/main.ts',
        'src/**/*.controller.ts',
      ],
      lines: 95,
      branches: 95,
      functions: 95,
      statements: 95,
    },
    reporters: ['verbose', 'junit'],
  },
});
