// @ts-check
/** @type {import('eslint').Linter.Config} */
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "react"],
  rules: {
    // we've got "jsxImportSource": "react-jsx" in tsconfig
    "react/react-in-jsx-scope": "off",
    // don't care
    "react/prop-types": "off",
    // no cheating!
    "react-hooks/exhaustive-deps": "error",
    // i don't care
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/ban-types": [
      "error",
      {
        // re-enable {}, because i'm lazy
        types: {
          "{}": false,
        },
      },
    ],
    // allow `_foo` for unused vars/args
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      },
    ],
    // i like to live dangerously, and it adds a lot of noise
    "@typescript-eslint/no-non-null-assertion": "off",
    // if i'm typing out an `any` i've already accepted the consequences
    "@typescript-eslint/no-explicit-any": "off",
  },
};
