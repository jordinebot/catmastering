import { defineConfig } from 'astro/config';

const isCustomDomain = process.env.SITE_DOMAIN === 'true';
export default defineConfig({
  site: isCustomDomain ? 'https://catmastering.cat' : 'https://jordinebot.github.io',
  base: isCustomDomain ? '/' : '/catmastering',
  output: 'static',
});
