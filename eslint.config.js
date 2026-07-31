import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: false }],
      "no-console": "off",
      "no-undef": "error",
    },
  },
  {
    ignores: ["dist/", "node_modules/"],
  },
];
