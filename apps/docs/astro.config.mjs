// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import mermaid from 'astro-mermaid';

export default defineConfig({
  // GitHub Pages serves the repo's site under /ratewatch/.
  site: 'https://nitzanto.github.io',
  base: '/ratewatch',
  integrations: [
    // Must come before starlight, so it handles mermaid code blocks first.
    mermaid(),
    starlight({
      title: 'ratewatch',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/nitzanto/ratewatch',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/nitzanto/ratewatch/edit/main/apps/docs/',
      },
      sidebar: [
        { label: 'Overview', link: '/' },
        {
          label: 'Feature specs',
          items: [{ autogenerate: { directory: 'features' } }],
        },
        { label: 'Design', link: '/design/' },
        {
          label: 'Architecture',
          items: [{ autogenerate: { directory: 'architecture' } }],
        },
        { label: 'ADRs', items: [{ autogenerate: { directory: 'adrs' } }] },
        {
          label: 'Design docs',
          items: [{ autogenerate: { directory: 'design-docs' } }],
        },
        { label: 'Guides', items: [{ autogenerate: { directory: 'guides' } }] },
      ],
    }),
  ],
});
