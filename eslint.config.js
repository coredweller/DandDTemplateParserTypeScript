// @ts-check
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Apply type-aware rules to all source and test TypeScript files
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', 'test/*/*.ts'],
          defaultProject: 'tsconfig.test.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Enforce `import type` for type-only imports (keeps runtime bundle clean)
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      // Ban explicit `any` — use `unknown` and narrow instead
      '@typescript-eslint/no-explicit-any': 'error',
      // Unused vars are bugs; prefix with _ to intentionally ignore
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Prefer `Promise<void>` return over floating promises
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  // In test files vi.fn() mocks have no real `this` binding — unbound-method is a false positive.
  // @vitest/eslint-plugin would handle this automatically; we replicate its behaviour here.
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  // Always ignore compiled output and deps
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
);
