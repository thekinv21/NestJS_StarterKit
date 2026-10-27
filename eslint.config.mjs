import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Public API rule (see CLAUDE.md → Public API).
 * Blocks `@/` imports that reach into a file (PascalCase) instead of a folder's index.ts.
 */

const PUBLIC_API_PATTERN = {
  regex: '^@/.+/[A-Z][^/]*$',
  caseSensitive: true,
  message: "Import from the folder's public API (index.ts), not from a file.",
};

const restrictImports = (files, extraPatterns = []) => ({
  files,
  rules: {
    'no-restricted-imports': [
      'error',
      { patterns: [PUBLIC_API_PATTERN, ...extraPatterns] },
    ],
  },
});

/**
 * Layer dependency rules (see CLAUDE.md → Dependency rules).
 * Blocks imports of the given layers via `@/` alias or relative paths.
 */
const restrictLayers = (files, layers, message) =>
  restrictImports(files, [
    {
      regex: `^(@/|(\\.\\./)+)(${layers.join('|')})(/|$)`,
      message,
    },
  ]);

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'error',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  restrictImports(['src/**/*.ts']),
  restrictLayers(
    ['src/shared/**/*.ts'],
    ['app', 'presentation', 'use-case', 'infrastructure'],
    'shared must not depend on other layers.',
  ),
  restrictLayers(
    ['src/use-case/**/*.ts'],
    ['app', 'presentation', 'infrastructure'],
    'use-case may only depend on shared. Define a port instead.',
  ),
  restrictLayers(
    ['src/presentation/**/*.ts'],
    ['app', 'infrastructure'],
    'presentation may only depend on use-case and shared.',
  ),
  restrictLayers(
    ['src/infrastructure/**/*.ts'],
    ['app', 'presentation'],
    'infrastructure may only depend on use-case and shared.',
  ),
);
