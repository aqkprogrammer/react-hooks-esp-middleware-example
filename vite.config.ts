/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` lets the playground be served from GitHub Pages (/<repo>/) when
// VITE_BASE is set in CI; locally it is served from "/".
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  build: {
    sourcemap: true,
  },
  test: {
    globals: true,
    restoreMocks: true,
    unstubGlobals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.ssr.test.{ts,tsx}', 'src/examples/anti-patterns/broken/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ssr',
          environment: 'node',
          include: ['src/**/*.ssr.test.{ts,tsx}'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/hooks/**', 'src/middleware/**'],
      exclude: ['**/*.test.*', '**/index.ts'],
    },
  },
});
