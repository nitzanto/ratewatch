import nx from '@nx/eslint-plugin';
import pluginQuery from '@tanstack/eslint-plugin-query';
import baseConfig from '../../eslint.config.mjs';

const noUseEffect =
  "Don't call useEffect: derive state, use an event handler, a hooks/api query, a key, or useMountEffect. A component's own timer or subscription may disable this with a reason. See the no-use-effect skill.";

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
    // Shared layers never reach into a feature: move shared code up instead.
    files: ['src/{app,components,contexts,hooks,libs,mocks}/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/**'],
              message:
                'Shared code must not import a feature. Move what both need into a shared layer.',
            },
          ],
        },
      ],
    },
  },
  {
    // A feature imports its own files relatively and never another feature.
    files: ['src/features/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/**'],
              message:
                "Features don't import each other. Move what both need into a shared layer.",
            },
          ],
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
