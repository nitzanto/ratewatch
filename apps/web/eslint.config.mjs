import nx from '@nx/eslint-plugin';
import pluginQuery from '@tanstack/eslint-plugin-query';
import baseConfig from '../../eslint.config.mjs';

const noUseEffect =
  "Don't call useEffect: derive state, use an event handler, a hooks/api query, a key, or useMountEffect. See the no-use-effect skill.";

const noUseEffectRules = [
  {
    selector: "CallExpression[callee.name='useEffect']",
    message: noUseEffect,
  },
  {
    selector: "CallExpression[callee.property.name='useEffect']",
    message: noUseEffect,
  },
];

const noColor =
  "Don't hardcode a colour: use a theme token (sx `color: 'text.secondary'`, `useTheme().palette`). Add a missing one to DESIGN.md and libs/theme/palette.ts.";
const colorPattern = '/#[0-9a-f]{3,8}\\b|\\b(rgb|hsl)a?\\(/i';

export default [
  ...nx.configs['flat/react'],
  ...pluginQuery.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...noUseEffectRules,
        { selector: `Literal[value=${colorPattern}]`, message: noColor },
        {
          selector: `TemplateElement[value.raw=${colorPattern}]`,
          message: noColor,
        },
      ],
    },
  },
  {
    // The theme is the one place colours are defined.
    files: ['src/libs/theme/**'],
    rules: { 'no-restricted-syntax': ['error', ...noUseEffectRules] },
  },
];
