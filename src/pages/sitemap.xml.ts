const origin = import.meta.env.SITE_DOMAIN === 'true' ? 'https://catmastering.cat' : 'https://jordinebot.github.io/catmastering';
export function GET() {
  const routes = ['/', '/ca/', '/es/', '/en/'];
  const urls = routes.map((route) => `<url><loc>${origin}${route}</loc>${route !== '/' ? `<xhtml:link rel="alternate" hreflang="ca" href="${origin}/ca/"/><xhtml:link rel="alternate" hreflang="es" href="${origin}/es/"/><xhtml:link rel="alternate" hreflang="en" href="${origin}/en/"/><xhtml:link rel="alternate" hreflang="x-default" href="${origin}/"/>` : ''}</url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
