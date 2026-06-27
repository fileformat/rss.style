import type { APIRoute } from 'astro';

const pages = [
  '/',
  '/changelog.xml',
  '/example.html',
  '/feed-analyzer.html',
  '/newsreaders.html',
  '/what-is-a-feed.html',
];

export const GET: APIRoute = async () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `\t<url><loc>https://www.rss.style${page}</loc></url>`).join('\n')}
</urlset>\n`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
};

export const prerender = true;