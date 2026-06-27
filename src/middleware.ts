import { defineMiddleware } from 'astro:middleware';

const forceHost = import.meta.env.FORCE_HOST;

export const onRequest = defineMiddleware(async (context, next) => {
  if (forceHost) {
    const requestUrl = new URL(context.request.url);
    if (requestUrl.host !== forceHost) {
      return Response.redirect(`${requestUrl.protocol}//${forceHost}${requestUrl.pathname}${requestUrl.search}`, 302);
    }
  }

  try {
    return await next();
  } catch (err) {
    if (err instanceof Error) {
      return new Response(`${err.message}\n${err.stack}`, { status: 500 });
    }
    return new Response(String(err), { status: 500 });
  }
});
