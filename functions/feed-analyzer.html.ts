import { PagesFunction, EventContext } from "@cloudflare/workers-types";
import { render } from "../src/render";
import he from "he";
import xmlFormat from "xml-formatter";
import * as cheerio from "cheerio";

interface Env {}

export const onRequest: PagesFunction<Env> = async (ctx) => {
    const me = new URL(ctx.request.url);
    let feedurl = me.searchParams.get("feedurl");
    if (!feedurl) {
        return showForm(ctx, "", "");
    }
    if (!feedurl.startsWith("http://") && !feedurl.startsWith("https://")) {
        feedurl = `http://${feedurl}`;
    }
    try {
        const url = new URL(feedurl);
    } catch (err: unknown) {
        if (err instanceof Error) {
            return showForm(ctx, feedurl, `Invalid URL: ${err.message}`);
        }
        return showForm(ctx, feedurl, `Error parsing URL: ${err}`);
    }
    console.log(`INFO: fetching feedurl=${feedurl}`);
    const start = Date.now();

    let feeddata: globalThis.Response;

    try {
        feeddata = await fetch(feedurl, {
            headers: {
                "User-Agent": `RSS.Style/1.0 (your feed is being stylish on https://www.rss.style/ )`,
                Referer: ctx.request.url,
            },
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            return showForm(
                ctx,
                feedurl,
                `Error fetching feed: ${err.message}`
            );
        }
        return showForm(ctx, feedurl, `Unable to fetch feed: ${err}`);
    }
    console.log(`INFO: fetched feedurl=${feedurl} in ${Date.now() - start}ms`);

    if (!feeddata.ok) {
        return showForm(
            ctx,
            feedurl,
            `Error fetching feed: ${feeddata.status} ${feeddata.statusText}`
        );
    }

    const notes: string[] = [];
    notes.push(`Feed fetched in ${Date.now() - start}ms`);

    let contentType = feeddata.headers.get("content-type");
    if (!contentType) {
        notes.push("No content type header?!?");
    } else {
        notes.push(`Content type is "${contentType}"`);
    }

    if (contentType && contentType.indexOf("text/html") != -1) {
        const html = await feeddata.text();
        const feeds = findFeedsInHtml(feedurl, html);
        if (feeds.length == 0) {
            return showForm(
                ctx,
                feedurl,
                `This is an HTML page without any feed links`
            );
        } else {
            const data = {
                page: {
                    title: `Feed Analyzer`,
                    h1: `Feed Analysis`,
                },
                content:
                `<h2>Select a feed</h2><p><code><a href="${he.encode(feedurl)}">${he.encode(feedurl)}</a></code> is an HTML page: try again with one of the feed links:</p>
                 <ul>${feeds
                    .map(
                        (f) =>
                            `<li><a href="feed-analyzer.html?feedurl=${encodeURIComponent(
                                f
                            )}">${he.encode(f)}</a></li>`
                    )
                    .join("")}</ul>`
                };
                const html = await render(data);
            return new Response(html, {
                headers: {
                    "Content-Type": "text/html",
                },
            });
        }
    }

    let feedtext = await feeddata.text();
    notes.push(`Feed is ${feedtext.length} characters long`);

    if (feedtext.indexOf("<?xml-stylesheet") != -1) {
        notes.push("Feed already has a stylesheet");
    }

    if (feedtext.indexOf("<rss") == -1) {
        notes.push(`This appears to be an Atom feed`);
    } else {
        notes.push(`This appears to be an RSS feed`);
    }

    const analysis = notes.join("<br>"); //LATER: html ul/li/etc.

    const data = {
        page: {
            title: `Feed Analyzer`,
            h1: `Feed Analysis`,
        },
        content: `<h3>Analysis of <code>${he.encode(feedurl)}</code></h3>
<p>${analysis}</p>
<details><summary>Formatted XML</summary>
<pre>${he.encode(xmlFormat(feedtext, { collapseContent: true }))}</pre>
</details>
<details><summary>Raw text</summary>
<pre>${he.encode(feedtext)}</pre>
</details>
<a class="btn btn-outline-primary mt-2 ms-2" href="feed-analyzer.html">Analyze Another</a>`,
    };

    return new Response(await render(data), {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Robots-Tag": "noindex",
        },
    });
};

async function showForm(
    ctx: EventContext<Env, any, Record<string, unknown>>,
    feedurl: string,
    msg: string
) {
    const alert = msg
        ? `<div class="alert  alert-danger" role="alert">${he.encode(
              msg
          )}</div>`
        : `<div class="alert alert-info" role="alert">Under Construction: Please don't take it seriously yet!</div>`;

    const data = {
        page: {
            title: `Feed Analyzer`,
            h1: `Analyze my feed!`,
        },
        content: `
${alert}
<form action="feed-analyzer.html" class="row justify-content-md-center" method="get">
    <div class="col-sm-12 col-md-9 col-lg-6">
        <div class="row">
            <label class="col-2 col-form-label" for="feedurl">Feed&nbsp;URL:</label>
            <div class="col-10">
                <div class="input-group mb-3">
                    <input type="text" class="form-control" id="feedurl" value="${he.encode(
                        feedurl
                    )}" name="feedurl" placeholder="" required>
                    <input class="btn btn-primary" value="Analyze!" type="submit" />
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
            "Content-Type": "text/html",
        },
    });
}

function findFeedsInHtml(url: string, html: string): string[] {
    const $ = cheerio.load(html);
    const feeds: string[] = [];
    $('link[type="application/rss+xml"]').each((i, el) => {
        const href = $(el).attr("href");
        if (href) {
            feeds.push(new URL(href, url).href);
        }
    });
    $('link[type="application/atom+xml"]').each((i, el) => {
        const href = $(el).attr("href");
        if (href) {
            feeds.push(new URL(href, url).href);
        }
    });

    return feeds;
}
