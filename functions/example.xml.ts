import { PagesFunction, EventContext } from '@cloudflare/workers-types';
import { render } from '../src/render';
import he from 'he';

interface Env {
}

export const onRequest: PagesFunction<Env> = async (ctx) => {

    const me = new URL(ctx.request.url);
    const feedurl = me.searchParams.get('feedurl');
    if (!feedurl) {
        return showForm(ctx, '', '')
    }
    try {
        const url = new URL(feedurl);
    } catch (err:unknown) {
        if (err instanceof Error) {
            return showForm(ctx, feedurl, `Invalid URL: ${err.message}`);
        }
        return showForm(ctx, feedurl, `Error parsing URL: ${err}`);
    }
    console.log(`INFO: fetching feedurl=${feedurl}`);
    const start = Date.now();

    let feeddata:globalThis.Response;

    try {
        feeddata = await fetch(feedurl, {
            headers: {
                'User-Agent': `RSS.Style/1.0 (your feed is being stylish on https://www.rss.style/ )`,
                'Referer': ctx.request.url,
            },
        });
    } catch (err:unknown) {
        if (err instanceof Error) {
            return showForm(ctx, feedurl, `Error fetching feed: ${err.message}`);
        }
        return showForm(ctx, feedurl, `Unable to fetch feed: ${err}`);
    }
    console.log(`INFO: fetched feedurl=${feedurl} in ${Date.now() - start}ms`);

    if (!feeddata.ok) {
        return showForm(ctx, feedurl, `Error fetching feed: ${feeddata.status} ${feeddata.statusText}`);
    }

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

    const alert = msg ? `<div class="alert alert-danger" role="alert">${he.encode(msg)}</div>` : '';

    const data = {
        page: {
            title: `Try RSS.style on your own news feed!`,
            h1: `Style my feed!`,
        },
        content: `
${alert}
<form action="example.xml" class="row justify-content-md-center" method="get">
    <div class="col-sm-12 col-md-9 col-lg-6">
        <div class="row">
            <label class="col-2 col-form-label" for="feedurl">Feed&nbsp;URL:</label>
            <div class="col-10">
                <div class="input-group mb-3">
                    <input type="text" class="form-control" id="feedurl" value="${he.encode(
                        feedurl
                    )}" name="feedurl" placeholder="" required>
                    <input class="btn btn-primary" value="Make it pretty!" type="submit" />
                </div>
            </div>
        </div>
    </div>
</form>
`,
    };

    const html = await render(data);
    return new Response(html, {
        headers: {
            'Content-Type': 'text/html',
        }
    });
}
