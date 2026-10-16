// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'public/mockServiceWorker.js',
      // Intentionally broken code shown on the "Rules of Hooks" / anti-pattern
      // pages. These files are only ever loaded as raw text and never executed.
      'src/examples/anti-patterns/broken/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // "recommended-latest" = Rules of Hooks + exhaustive-deps + the React
      // Compiler-powered rules (purity, refs, set-state-in-effect, ...).
      ...reactHooks.configs['recommended-latest'].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // The original esp-js demo keeps each store's context object, provider and
    // consumer hook together in one `context.tsx` (its original structure).
    // That only costs Fast Refresh granularity for these files (a full reload
    // on edit), so the rule is relaxed here rather than splitting every store.
    files: ['src/esp-demo/**/context/context.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Tests and node-side tooling.
    files: ['**/*.test.{ts,tsx}', 'src/test/**', 'scripts/**', 'e2e/**', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
);
