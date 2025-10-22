module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: ['@typescript-eslint'],
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
    },
  },
  rules: {
    'no-console': 'error',
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        ts: 'never',
        js: 'always',
      },
    ],
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'lines-between-class-members': ['error', 'always', { 'exceptAfterSingleLine': true }],
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message: 'for..in is not allowed.',
      },
      {
        selector: 'LabeledStatement',
        message: 'labels is not allowed.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is not allowed.',
      },
    ],
    'new-cap': ['error', { properties: false }],
  },
  ignorePatterns: [
    'bin/',
    'node_modules/',
    'dist/',
    'coverage/',
    'migrations/',
    '*.d.ts',
    '*.js',
    '*.cjs',
    '*.mjs',
    'jest.config.js',
    'src/sandbox/',
    'test/',
    'src/interfaces/declarated.ts',
    'src/interfaces/implemented.ts',
    'src/interfaces/contract.ts'
  ],
};
