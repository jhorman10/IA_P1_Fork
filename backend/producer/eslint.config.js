import jsConfig from "@eslint/js";
import parser from "@typescript-eslint/parser";
import tsEslintPlugin from "@typescript-eslint/eslint-plugin";
import simpleImportSort from "eslint-plugin-simple-import-sort";

function withoutExtends(config) {
  const { extends: _extends, ...rest } = config || {};
  return rest;
}

const js = Object.assign({}, withoutExtends(jsConfig.configs.recommended), {
  files: ["**/*.js"],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

const ts = Object.assign({}, withoutExtends(tsEslintPlugin.configs.recommended), {
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
});

const testOverride = {
  files: ["**/*.spec.ts", "test/**/*.ts", "**/*.spec.tsx", "test/**/*.tsx"],
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: {
    "@typescript-eslint": tsEslintPlugin,
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-require-imports": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
    ],
  },
};

export default [js, ts, testOverride];
