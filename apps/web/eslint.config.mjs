import nx from '@nx/eslint-plugin';
import pluginQuery from '@tanstack/eslint-plugin-query';
import baseConfig from '../../eslint.config.mjs';

const noUseEffect =
  "Don't call useEffect: derive state, use an event handler, a hooks/api query, a key, or useMountEffect. See the no-use-effect skill.";

export default [
  ...nx.configs['flat/react'],
  ...pluginQuery.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='useEffect']",
          message: noUseEffect,
        },
        {
          selector: "CallExpression[callee.property.name='useEffect']",
          message: noUseEffect,
        },
      ],
    },
  },
];
