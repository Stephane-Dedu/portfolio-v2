// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import expressiveCode from 'astro-expressive-code';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://sdedu.cloud',
  devToolbar: { enabled: false },
  // English at the root, French under /fr
  i18n: {
    locales: ['en', 'fr'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    // Must come before mdx() so code blocks in .mdx go through Expressive Code
    expressiveCode({
      themes: ['min-dark', 'min-light'],
      themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
      useDarkModeMediaQuery: false,
      styleOverrides: {
        borderRadius: '0.6rem',
        borderColor: 'var(--line)',
        codeFontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
        uiFontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
        codeFontSize: '0.84rem',
        frames: { shadowColor: 'transparent' },
      },
    }),
    mdx(),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
