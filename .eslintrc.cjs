module.exports = {
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:prettier/recommended",
    "plugin:sonarjs/recommended",
  ],
  env: {
    node: true,
    es6: true,
    es2020: true,
  },
  rules: {
    "import/order": "error",
  },
  overrides: [
    {
      files: ["**/*.test.js"],
      env: {
        jest: true,
      },
      extends: ["plugin:jest/recommended"],
    },
    {
      files: ["**/*.mjs"],
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
    {
      files: ["**/*.ts"],
      parser: "@typescript-eslint/parser",
      extends: ["plugin:@typescript-eslint/recommended"],
      env: {
        node: true,
      },
    },
  ],
};
