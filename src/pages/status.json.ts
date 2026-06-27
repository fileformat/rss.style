import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const now = new Date().toISOString();
  const commit = import.meta.env.CF_PAGES_COMMIT_SHA || null;

  return new Response(
    JSON.stringify(
      {
        success: true,
        message: 'OK',
        commit: commit ? String(commit).slice(0, 7) : 'null',
        lastmod: now,
        tech: 'Astro + Cloudflare Workers'
      },
      null,
      0
    ),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    }
  );
};
