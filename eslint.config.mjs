/**
 * One ESLint config for every workspace (apps/*, packages/*): Next.js (core web vitals) + TypeScript.
 * Each workspace runs `eslint .`, which finds this file; `npm run lint` at the root runs them all.
 */
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // App Router only: there is no pages/ directory for this rule to check against.
      '@next/next/no-html-link-for-pages': 'off',
      // `_unused` names are deliberate (e.g. destructuring a field away).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
  {
    // The design system doesn't depend on Next.js, so next/image isn't available there; images it
    // shows (logos, member photos) are already sized by Cloudinary URLs.
    files: ['packages/ui/**'],
    rules: { '@next/next/no-img-element': 'off' },
  },
  {
    // Playwright fixtures call their callback `use`; it isn't React's `use` hook.
    files: ['apps/*/e2e/**'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  globalIgnores([
    '**/.next/**',
    '**/.next-*/**',
    '**/out/**',
    '**/build/**',
    '**/next-env.d.ts',
    '**/test-results/**',
    '**/playwright-report/**',
    'packages/api-client/src/schema.d.ts', // generated from the backend's OpenAPI spec
  ]),
]);
