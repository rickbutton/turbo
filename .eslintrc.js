module.exports = {
    parser: "@typescript-eslint/parser",
    extends: [
        "plugin:@typescript-eslint/recommended",
        "prettier/@typescript-eslint",
        "plugin:prettier/recommended",
        "plugin:react/recommended",
    ],
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: "module",
    },
    settings: {
        react: {
            pragma: "React",
            version: "detect"
        }
    },
    rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": ["error", { "varsIgnorePattern": "(^_|logger|React)", "argsIgnorePattern": "^_" }],
    },
};
