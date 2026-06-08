// @ts-check
import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  // 1. Next.js + TypeScript recommended via legacy compat
  ...compat.extends(
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ),

  // 2. Parser options for TypeScript (compat already loads @typescript-eslint/parser)
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      }
    },

    rules: {
      // ========== 错误预防 (Error Prevention) ==========
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-alert": "warn",

      // ========== TypeScript (Type Safety) ==========
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // NOTE: @typescript-eslint/no-floating-promises and await-thenable
      // require parserOptions.project (tsconfig) – skipped for simplicity

      // ========== React (React Best Practices) ==========
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-unescaped-entities": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // ========== 代码风格 (Code Style) ==========
      "semi": ["error", "always"],
      "comma-dangle": ["error", "never"],
      "arrow-parens": ["error", "as-needed"],
      "object-curly-spacing": ["error", "always"],

      // ========== 可维护性 (Maintainability) ==========
      "no-nested-ternary": "warn",

      // ========== 安全性 (Security) ==========
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-script-url": "error"
    }
  },

  // 3. Ignore patterns
  {
    ignores: [
      "node_modules/",
      ".next/",
      "dist/",
      "build/",
      "*.config.js",
      "*.config.cjs",
      "scripts/"
    ]
  }
];

export default eslintConfig;
