import { PagesFunction, EventContext } from "@cloudflare/workers-types";
import { render } from "../src/render";
import he from "he";
import xmlFormat from "xml-formatter";
import * as cheerio from "cheerio";
import { parseFeed } from "@rowanmanning/feed-parser";

interface Env {}

const error = `<span class="badge text-bg-danger">Error</span>`;
const warning = `<span class="badge text-bg-warning">Warning</span>`;

export const onRequest: PagesFunction<Env> = async (ctx) => {
    const me = new URL(ctx.request.url);
    let feedurl = me.searchParams.get("feedurl");
    if (!feedurl) {
        return showForm(ctx, "", "");
    }
    if (!feedurl.startsWith("http://") && !feedurl.startsWith("https://")) {
        feedurl = `http://${feedurl}`;
    }
    let feedurlObj: URL;
    try {
        feedurlObj = new URL(feedurl);
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
                "User-Agent": `RSS.Style/1.0 (your feed is being analyzed on https://www.rss.style/ )`,
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
    notes.push(`Feed fetched in ${(Date.now() - start).toLocaleString()} ms.`);

    let contentType = feeddata.headers.get("content-type");
    if (!contentType) {
        notes.push(`${error} No content type header found!`);
    } else if (!contentType.startsWith("text/xml")) {
        notes.push(
            `${warning} Content type is <code>${contentType}</code>, not <code>text/xml</code>.`
        );
    } else {
        notes.push(`Content type is <code>${contentType}</code>.`);
    }

    if (contentType && contentType.indexOf("text/html") != -1) {
        const html = await feeddata.text();
        const feeds = findFeedsInHeader(feedurl, html);
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
                content: `<h2>Select a feed</h2><p><code><a href="${he.encode(
                    feedurl
                )}">${he.encode(
                    feedurl
                )}</a></code> is an HTML page: try again with one of the feed links:</p>
                 <ul>${feeds
                     .map(
                         (f) =>
                             `<li><a href="feed-analyzer.html?feedurl=${encodeURIComponent(
                                 f
                             )}">${he.encode(f)}</a></li>`
                     )
                     .join("")}</ul>`,
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
    notes.push(`Feed is ${feedtext.length.toLocaleString()} characters long.`);

    const etag = feeddata.headers.get("etag");
    if (etag) {
        notes.push(`Feed has an ETag of <code>${etag}</code>.`);
    } else {
        notes.push(`${warning} Feed is missing an ETag.`);
    }
    //LATER: see if it responds properly when passed the ETag

    const lastModified = feeddata.headers.get("last-modified");
    if (lastModified) {
        notes.push(
            `Feed has a last modified date of <code>${lastModified}</code>.`
        );
    } else {
        notes.push(`${warning} Feed is missing the Last-Modified HTTP header.`);
    }
    //LATER: see if it responds properly when passed the Last-Modified date

    const styleStart = feedtext.indexOf("<?xml-stylesheet");
    if (styleStart == -1) {
        notes.push(`${warning} This feed does not have a stylesheet.`);
    } else {
        const styleEnd = feedtext.indexOf("?>", styleStart);
        const xmlStyle = feedtext.slice(styleStart, styleEnd + 2);
        const href_match = /href="([^"]+)"/.exec(xmlStyle);
        const styleHref =
            href_match && href_match.length >= 2 ? href_match[1] : null;
        const type_match = /type="([^"]+)"/.exec(xmlStyle);
        console.log(type_match);
        const styleType =
            type_match && type_match.length >= 2 ? type_match[1] : null;
        if (styleHref && styleType) {
            notes.push(
                `Feed has a <code>${he.encode(
                    styleType
                )}</code> stylesheet: <code>${he.encode(
                    styleHref.length < 100
                        ? styleHref
                        : styleHref.slice(0, 100) + "…"
                )}</code>.`
            );
        } else {
            notes.push(
                `Feed has a stylesheet, but it's missing a href or type: <code>${he.encode(
                    xmlStyle
                )}</code>.`
            );
        }
        if (styleHref) {
            const styleUrl = new URL(styleHref, feedurl);
            if (
                styleUrl.protocol != feedurlObj.protocol &&
                styleUrl.protocol != "data:"
            ) {
                notes.push(
                    `${error} Stylesheet URL is on a different protocol: <code>${he.encode(
                        styleUrl.protocol
                    )}</code>.`
                );
            }
            //LATER: check if the stylesheet is accessible and type matches
        }
    }

    if (feedtext.indexOf("<rss") == -1) {
        notes.push(`This appears to be an Atom feed.`);
    } else {
        notes.push(`This appears to be an RSS feed.`);
    }

    let feed;
    try {
        feed = await parseFeed(feedtext);
    } catch (err: unknown) {
        if (err instanceof Error) {
            notes.push(`${error} Error parsing feed: ${err.message}`);
        } else {
            notes.push(`${error} Error parsing feed: ${err}`);
        }
    }
    if (feed) {
        if (feed.title) {
            notes.push(`Feed title: <code>${he.encode(feed.title)}</code>`);
        } else {
            notes.push(`${error} Feed is missing a title.`);
        }
        if (!feed.self) {
            notes.push(`${error} Feed is missing a self link.`);
        } else if (feed.self != feedurl) {
            notes.push(
                `${error} Feed self link does not match feed URL: <a href="${he.encode(
                    feed.self
                )}">${he.encode(feed.self)}</a>.`
            );
        } else {
            notes.push(`Feed self link matches feed URL.`);
        }
        notes.push(`Feed has ${feed.items.length.toLocaleString()} items.`);
        if (feed.items.length > 0) {
            const firstItem = feed.items[0];
            if (firstItem.published) {
                notes.push(
                    `First item published on ${firstItem.published.toISOString()}`
                );
            }
        }
        if (feed.items.length > 1) {
            const lastItem = feed.items[feed.items.length - 1];
            if (lastItem.published) {
                notes.push(
                    `Last item published on ${lastItem.published.toISOString()}`
                );
            }
        }

        if (!feed.url) {
            notes.push(`${error} Feed is missing a home page URL.`);
        } else {
            const homeUrl = new URL(feed.url, feedurl);
            notes.push(
                `Home page URL: <a href="${he.encode(
                    homeUrl.href
                )}">${he.encode(homeUrl.href)}</a>`
            );
            if (homeUrl.protocol != feedurlObj.protocol) {
                notes.push(
                    `${error} Home page URL is on a different protocol: <code>${he.encode(
                        homeUrl.protocol
                    )}</code>.`
                );
            }
            let homeresponse: globalThis.Response | null = null;
            try {
                homeresponse = await fetch(homeUrl, {
                    headers: {
                        "User-Agent": `RSS.Style/1.0 (your feed is being analyzed on https://www.rss.style/ )`,
                        Referer: ctx.request.url,
                    },
                });
            } catch (err: unknown) {
                if (err instanceof Error) {
                    notes.push(
                        `${error} Error fetching home page: ${err.message}`
                    );
                } else {
                    notes.push(`${error} Error fetching home page: ${err}`);
                }
            }
            if (homeresponse) {
                if (homeresponse.url != homeUrl.href) {
                    notes.push(
                        `${warning} Home page URL redirected to <a href="${he.encode(
                            homeresponse.url
                        )}">${he.encode(homeresponse.url)}</a>.`
                    );
                }
                if (homeresponse.ok) {
                    if (
                        homeresponse.headers
                            .get("content-type")
                            ?.indexOf("text/html") != 0
                    ) {
                        notes.push(`${error} Home page is not an HTML page.`);
                    } else {
                        const homehtml = await homeresponse.text();

                        const homefeeds = findFeedsInHeader(
                            homeresponse.url,
                            homehtml
                        );
                        if (!homefeeds || homefeeds.length == 0) {
                            notes.push(
                                `${error} Home page does not have any feed discovery link in the &lt;head&gt;.`
                            );
                        } else if (homefeeds.indexOf(feedurl) == -1) {
                            notes.push(
                                `${error} Home page does not have a matching feed discovery link in the &lt;head&gt;.`
                            );
                            const homefeedList = homefeeds
                                .map((f) => `<li><a href="${f}">${f}</a></li>`)
                                .join("");
                            notes.push(
                                `<details><summary>${homefeeds.length} feed links in &lt;head&gt;</summary>${homefeedList}</details>`
                            );
                        } else {
                            notes.push(
                                `Home page has feed discovery link in &lt;head&gt;.`
                            );
                        }

                        const feedInHtml = findFeedInHtml(
                            homeresponse.url,
                            feedurl,
                            homehtml
                        );
                        notes.push(feedInHtml);
                    }
                } else {
                    notes.push(
                        `${error} Error fetching home page: ${homeresponse.status} ${homeresponse.statusText}`
                    );
                }
            } else {
                // how could this happen?
                notes.push(`${error} Unable to fetch home page.`);
            }
        }
    }

    const analysis = notes.join("<br>");
    const data = {
        page: {
            title: `Feed Analyzer`,
            h1: `Feed Analysis`,
        },
        content: `<h3>Analysis of <a href="${he.encode(feedurl)}">${he.encode(
            feedurl
        )}</a></h3>
<p class="lh-lg">${analysis}</p>
<details><summary>Formatted XML</summary>
<pre class="border bg-body-secondary rounded p-2">${he.encode(
            xmlFormat(feedtext, { collapseContent: true })
        )}</pre>
</details>
<details><summary>Raw text</summary>
<pre class="border bg-body-secondary rounded p-2">${he.encode(feedtext)}</pre>
</details>
<details><summary>Raw headers</summary>
<pre class="border bg-body-secondary rounded p-2">${he.encode(
            JSON.stringify(Object.fromEntries(feeddata.headers), null, 2)
        )}</pre>
</details>
<a class="btn btn-outline-primary mt-2 ms-2" href="feed-analyzer.html">Analyze Another</a>
<a class="btn btn-outline-primary mt-2 ms-2" href="example.xml?feedurl=${encodeURIComponent(
            feedurl
        )}">View with RSS.Style</a>`,
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

function findFeedsInHeader(url: string, html: string): string[] {
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

function findFeedInHtml(
    homeUrl: string,
    feedUrl: string,
    html: string
): string {
    const $ = cheerio.load(html);
    const feeds: string[] = [];
    const links = $("a");
    for (let i = 0; i < links.length; i++) {
        const href = $(links[i]).attr("href");
        if (href) {
            const linkUrl = new URL(href, homeUrl);
            if (linkUrl.href == feedUrl) {
                return `Home page has a link to the feed in the &lt;body&gt;`;
            }
        }
    }
    return `${error} Home page does not have a link to the feed in the &lt;body&gt;.`;
}
