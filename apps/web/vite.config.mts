/// <reference types='vitest' />
import { nxReadySignal } from '@nx/vite/plugins/nx-ready-signal.plugin';
import react from '@vitejs/plugin-react';
import { msw } from 'msw/vite';
import { defaultClientConditions, defineConfig } from 'vite';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/web',
  resolve: {
    // Resolve workspace libs (e.g. @ratewatch/contracts) from source, so they need no prior build.
    conditions: ['@ratewatch/source', ...defaultClientConditions],
    // Mirrors the `@/*` paths in tsconfig.app.json and tsconfig.spec.json.
    alias: { '@': `${import.meta.dirname}/src` },
  },
  server: {
    // From the root .env, which Nx loads. In a container Vite must listen on every interface
    // (the dev image sets WEB_HOST=0.0.0.0).
    port: Number(process.env.WEB_PORT),
    host: process.env.WEB_HOST,
    // Same origin as production, where nginx forwards /api to the API.
    proxy: { '/api': { target: process.env.API_URL, changeOrigin: true } },
  },
  plugins: [
    react(),
    nxReadySignal(),
    // Serves MSW's worker script from node_modules in dev only, so it is neither committed nor shipped.
    { ...msw({ mode: 'worker-only' }), apply: 'serve' },
  ],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'web',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
