import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const content = `#\n# robots.txt for RSS Style\n#\n\nSitemap: https://www.rss.style/sitemap.xml\n\nUser-agent: *\nDisallow: /honeypot.txt\nDisallow: /example\nClean-param: feedurl\n`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
};
