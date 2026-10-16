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
    // The largest chunk is `catalog` (~700 kB raw / ~215 kB gzip): the text of
    // every topic, needed up front for client-side search. The app shell
    // itself is ~170 kB. Splitting the catalog into a search index + lazily
    // loaded details is on the roadmap; until then the limit reflects reality.
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        // Separately cacheable chunks: the React runtime changes rarely, the
        // catalog (all topic text, needed for search) changes with content.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            // `[^?]*$` skips the `?raw` copies loaded by the source viewer.
            { name: 'catalog', test: /src[\\/]catalog[\\/][^?]*$/ },
          ],
        },
      },
    },
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
