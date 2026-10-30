const origin = import.meta.env.SITE_DOMAIN === 'true' ? 'https://catmastering.cat' : 'https://jordinebot.github.io/catmastering';
export function GET() {
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
