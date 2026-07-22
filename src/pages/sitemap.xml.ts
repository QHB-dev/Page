const SITE_URL = 'https://www.shedio.life';

const routes = [
  { path: '/', changeFrequency: 'weekly', priority: '1.0' },
  { path: '/about', changeFrequency: 'monthly', priority: '0.8' },
  { path: '/blog', changeFrequency: 'weekly', priority: '0.8' },
  { path: '/help', changeFrequency: 'monthly', priority: '0.6' },
  { path: '/privacy', changeFrequency: 'monthly', priority: '0.4' },
  { path: '/cookie-policy', changeFrequency: 'monthly', priority: '0.3' },
  { path: '/terms', changeFrequency: 'monthly', priority: '0.4' },
  { path: '/subscription-terms', changeFrequency: 'monthly', priority: '0.4' },
  { path: '/money-back-policy', changeFrequency: 'monthly', priority: '0.4' },
  { path: '/consumer-health-data', changeFrequency: 'monthly', priority: '0.4' },
];

export const prerender = true;

export function GET() {
  const urls = routes.map(({ path, changeFrequency, priority }) => `
  <url>
    <loc>${SITE_URL}${path === '/' ? '' : path}</loc>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
