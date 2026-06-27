import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return Response.redirect('https://aboutfeeds.com/', 302);
};
