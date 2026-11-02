import nx from '@nx/eslint-plugin';
import pluginQuery from '@tanstack/eslint-plugin-query';
import baseConfig from '../../eslint.config.mjs';

const noUseEffect =
  "Don't call useEffect: derive state, use an event handler, an api/ query hook, a key, or useMountEffect. A component's own timer or subscription may disable this with a reason. See the no-use-effect skill.";

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

const typedState =
  'Give useState and useRef their type, even when TypeScript could infer it: useState<UsersQuery>(defaultQuery).';

// useState(x) / React.useState(x) without <Type>, and the same for useRef.
const typedStateRules = [
  {
    selector:
      'CallExpression[callee.name=/^use(State|Ref)$/]:not([typeArguments])',
    message: typedState,
  },
  {
    selector:
      'CallExpression[callee.property.name=/^use(State|Ref)$/]:not([typeArguments])',
    message: typedState,
  },
];

const noColor =
  "Don't hardcode a colour: use a theme token (sx `color: 'text.secondary'`, `useTheme().palette`). Add a missing one to DESIGN.md and theme/palette.ts.";
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
        ...typedStateRules,
        { selector: `Literal[value=${colorPattern}]`, message: noColor },
        {
          selector: `TemplateElement[value.raw=${colorPattern}]`,
          message: noColor,
        },
      ],
    },
  },
  {
    // Shared folders never reach into a page or a feature: move shared code up instead.
    files: ['src/{api,components,hooks,mocks,test,theme,utils}/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/**', '@/pages/**'],
              message:
                'Shared code must not import a page or a feature. Move what both need into a shared folder.',
            },
          ],
        },
      ],
    },
  },
  {
    // A feature imports its own files relatively, and never another feature or a page.
    files: ['src/features/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/**', '@/pages/**'],
              message:
                "Features don't import each other or pages. Move what both need into a shared folder.",
            },
          ],
        },
      ],
    },
  },
  {
    // A page lays out features; it never imports another page.
    files: ['src/pages/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/pages/**'],
              message:
                "Pages don't import each other. Move what both need into a feature or a shared folder.",
            },
          ],
        },
      ],
    },
  },
  {
    // Prettier keeps blank lines but never adds them, so this one spaces out the steps of a function, as in the
    // API. Specs keep their own arrange / act / assert spacing.
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/*.spec.ts', '**/*.spec.tsx', 'src/test/**'],
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
  {
    // The theme is the one place colours are defined.
    files: ['src/theme/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...noUseEffectRules,
        ...typedStateRules,
      ],
    },
  },
];
