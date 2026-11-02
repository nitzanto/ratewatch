import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    // Prettier keeps blank lines but never adds them, so this one spaces out the steps of a function. Specs keep
    // their own arrange / act / assert spacing.
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts', '**/test-utils/**'],
    rules: {
      'padding-line-between-statements': [
        'error',
        // A blank line after the variables a step sets up, but not between them.
        { blankLine: 'always', prev: ['const', 'let'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let'], next: ['const', 'let'] },
        // Around every block (if, for, try…), and before the result.
        {
          blankLine: 'always',
          prev: '*',
          next: ['block-like', 'if', 'for', 'try'],
        },
        {
          blankLine: 'always',
          prev: ['block-like', 'if', 'for', 'try'],
          next: '*',
        },
        { blankLine: 'always', prev: '*', next: 'return' },
      ],
    },
  },
];
