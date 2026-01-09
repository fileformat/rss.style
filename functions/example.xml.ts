import { PagesFunction, EventContext } from '@cloudflare/workers-types';
import { render } from '../src/render';
import he from 'he';
import { XMLBuilder, XMLParser } from "fast-xml-parser";

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

    if (!feeddata.headers.get('Content-Type')?.match(/(application\/(rss\+xml|atom\+xml|xml)|text\/xml)/i)) {
        return showForm(ctx, feedurl, `This URL does not appear to be an RSS or Atom feed (Content-Type: ${feeddata.headers.get('Content-Type')})`);
    }

    let feedtext = await feeddata.text();
    console.log(`INFO: feed size=${feedtext.length} for feedurl=${feedurl}`);
    console.log('DEBUG: feed content:', feedtext.slice(0, 500));

    const xmlOptions = {
        // Use a prefix to distinguish attributes from elements in the JSON object
        attributeNamePrefix: "@_",
        // Do not ignore attributes during parsing
        ignoreAttributes: false,
        // Optionally, parse attribute values to native types (int, float, boolean)
        parseAttributeValue: false,
        suppressBooleanAttributes: false,
        format: true,
        indentBy: "  ",
    };

    const parser = new XMLParser(xmlOptions);

    const xmlDocument = parser.parse(feedtext);

    console.log(JSON.stringify(xmlDocument));

    if (xmlDocument["?xml-stylesheet"]) {
        console.log(`INFO: removing existing stylesheet processing instruction`);
        delete xmlDocument["?xml-stylesheet"];
    }

    // prevent flash of unstyled content by adding a blank stylesheet first (not totally effective, but helps)
    xmlDocument["?xml-stylesheet"] = {
        "@_type": "text/css",
        "@_href": "/css/blank.css",
    };

    if (xmlDocument.rss) {
        xmlDocument.rss["script"] = {
            "@_src": "/js/rss-style.js",
            "@_xmlns": "http://www.w3.org/1999/xhtml",
            "#text": "",
        };
    } else if (xmlDocument.feed) {
        xmlDocument.feed["script"] = {
            "@_src": "/js/atom-style.js",
            "@_xmlns": "http://www.w3.org/1999/xhtml",
            "#text": "",
        };
    } else {
        console.log(`WARN: unrecognized top-level node keys: ${Object.keys(xmlDocument).join(', ')}`);
    }

    var styledtext = new XMLBuilder(xmlOptions).build(xmlDocument);

    return new Response(styledtext, { headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'nofollow, noindex',
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
