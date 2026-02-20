

import jsConfig from '@eslint/js';
import parser from '@typescript-eslint/parser';
import tsEslintPlugin from '@typescript-eslint/eslint-plugin';

function withoutExtends(config) {
  const { extends: _extends, ...rest } = config;
  return rest;
}

export default [
  Object.assign({}, withoutExtends(jsConfig.configs.recommended), {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  }),
  Object.assign({}, withoutExtends(tsEslintPlugin.configs.recommended), {
    files: ['**/*.ts'],
    languageOptions: {
      parser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tsEslintPlugin,
    },
    rules: Object.assign({}, tsEslintPlugin.configs.recommended.rules, {
      'no-unused-vars': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    }),
  }),
];
