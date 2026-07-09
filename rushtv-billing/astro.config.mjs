import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://rushtv-billing.pages.dev',
  integrations: [tailwind()],
});
