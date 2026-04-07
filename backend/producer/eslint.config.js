import jsConfig from "@eslint/js";
import parser from "@typescript-eslint/parser";
import tsEslintPlugin from "@typescript-eslint/eslint-plugin";
import simpleImportSort from "eslint-plugin-simple-import-sort";

function withoutExtends(config) {
  // remove `extends` (and any other legacy-only keys) when using flat config
  const { extends: _extends, overrideConfig, ...rest } = config || {};
  return rest;
}

export default [
  Object.assign({}, withoutExtends(jsConfig.configs.recommended), {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  }),
  Object.assign({}, withoutExtends(tsEslintPlugin.configs.recommended), {
    files: ["**/*.ts"],
    languageOptions: {
      parser,
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": tsEslintPlugin,
      "simple-import-sort": simpleImportSort,
    },
    rules: Object.assign({}, tsEslintPlugin.configs.recommended.rules, {
      "no-unused-vars": "off",
      "no-console": "off",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    }),
  }),
];
