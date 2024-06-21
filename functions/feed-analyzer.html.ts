import { PagesFunction, EventContext } from '@cloudflare/workers-types';
import { render } from '../src/render';
import he from 'he';
import xmlFormat from 'xml-formatter';

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

    const notes: string[] = [];
    notes.push(`Feed fetched in ${Date.now() - start}ms`);

    let contentType = feeddata.headers.get('content-type');
    if (!contentType) {
        notes.push('No content type header?!?');
    } else {
        notes.push(`Content type is "${contentType}"`)
    }

    let feedtext = await feeddata.text();
    notes.push(`Feed is ${feedtext.length} characters long`);

    if (feedtext.indexOf('<?xml-stylesheet') != -1) {
        notes.push('Feed already has a stylesheet');
    }

    if (feedtext.indexOf('<rss') == -1) {
        notes.push(`This appears to be an Atom feed`);
    } else {
        notes.push(`This appears to be an RSS feed`);
    }

    const analysis = notes.join('<br>');//LATER: html ul/li/etc.

    const data = {
        page: {
            title: `Feed Analyzer`,
            h1: `Feed Analysis`,
        },
        content: `<h3>Analysis of <code>${he.encode(feedurl)}</code></h3>
<p>${analysis}</p>
<pre>${he.encode(xmlFormat(feedtext, { collapseContent: true, }))}</pre>`,
    }

    return new Response(await render(data), { headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex',
    } });
}

async function showForm(ctx: EventContext<Env, any, Record<string, unknown>>, feedurl:string, msg:string) {

    const alert = msg ? `<div class="alert alert-danger" role="alert">${he.encode(msg)}</div>` : '';

    const data = {
        page: {
            title: `Feed Analyzer`,
            h1: `Analyze my feed!`,
        },
        content: `
${alert}
<form action="feed-analyzer.html" method="get" style="max-width:500px;margin:auto;padding-top:2em;">
    <label for="feedurl">Feed URL:</label>
    <input type="text" id="feedurl" value="${he.encode(feedurl)}" name="feedurl" placeholder="" required>
    <button type="submit">Analyze!</button>
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
