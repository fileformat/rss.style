import { PagesFunction, EventContext } from '@cloudflare/workers-types';
import { render } from '../src/render';

interface Env {
}

export const onRequest: PagesFunction<Env> = async (ctx) => {

    const me = new URL(ctx.request.url);
    const feedurl = me.searchParams.get('feedurl');
    if (!feedurl) {
        return showForm(ctx, '', '')
    }
    console.log(`INFO: fetching feedurl=${feedurl}`);
    const start = Date.now();

    const feeddata = await fetch(feedurl, {
        headers: {
            'User-Agent': `Feed.Style/1.0 (your feed is being stylish on https://www.feed.style/ )`,
            'Referer': ctx.request.url,
        },
    });
    console.log(`INFO: fetched feedurl=${feedurl} in ${Date.now() - start}ms`);

    let feedtext = await feeddata.text();

    if (feedtext.indexOf('<?xml-stylesheet') != -1) {
        console.log(`INFO: removing default xslt stylesheet`)
        feedtext = feedtext.replace(/<[?]xml-stylesheet .*[?]>/, '');
    }

    let style = `<?xml-stylesheet type="text/xsl" href="/xslt/simple-rss.xslt" ?>`;
    if (feedtext.indexOf('<rss') == -1) {
        console.log(`INFO: using atom stylesheet`);
        style = `<?xml-stylesheet type="text/xsl" href="/xslt/simple-atom.xslt" ?>`;
    } else {
        console.log(`INFO: using rss stylesheet`);
    }
    feedtext = feedtext.replace(/<[?]xml-stylesheet type="text\/xsl" href=".*" [?]>/, '');

    // you know you're naughty when you use regex to parse xml...
    const styledtext = feedtext.replace(/^(<[?]xml .*[?]>)?(.*)$/s, `$1${style}$2`);

    return new Response(styledtext, { headers: { 
        'Content-Type': 'text/xml; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex',
        'X-Original-Content-Type': feeddata.headers.get('Content-Type') || '(not set?!?)',
    } });
}

async function showForm(ctx: EventContext<Env, any, Record<string, unknown>>, feedurl:string, msg:string) {

    const alert = msg ? `<div class="alert alert-danger" role="alert">${msg}</div>` : '';

    const data = {
        page: {
            title: `Try Feed.style on your own news feed!`,
            h1: `Style my feed!`,
        },
        content: `
${alert}
<form action="example.xml" method="get" style="max-width:500px;margin:auto;padding-top:2em;">
    <label for="feedurl">Feed URL:</label>
    <input type="text" id="${feedurl}" name="feedurl" placeholder="" required>
    <button type="submit">Make it pretty!</button>
</form>
`,
    }

    const html = await render(data);
    return new Response(html, {
        headers: {
            'Content-Type': 'text/html',
        }
    });
}
