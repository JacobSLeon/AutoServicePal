module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
  },
  rules: {
    // Error prevention
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-process-exit': 'error',

    // Best practices
    eqeqeq: ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-throw-literal': 'error',

    // Style (deferred to Prettier for formatting)
    semi: ['error', 'always'],
    quotes: ['error', 'single', { avoidEscape: true }],
  },
  ignorePatterns: ['node_modules/', 'dist/', 'coverage/'],
};
