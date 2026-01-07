import { PagesFunction, EventContext } from "@cloudflare/workers-types";
import { render } from "../src/render";
import he from "he";
import xmlFormat from "xml-formatter";
import * as cheerio from "cheerio";
import { parseFeed } from "@rowanmanning/feed-parser";
import { FeedItem } from "@rowanmanning/feed-parser/lib/feed/item/base";
import { XMLParser } from "fast-xml-parser";

interface Env {}

const error = `<span class="badge text-bg-danger">Error</span>`;
const warning = `<span class="badge text-bg-warning">Warning</span>`;
const info = `<span class="badge text-bg-secondary">Info</span>`;

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

    if (feeddata.url != feedurl) {
        notes.push(
            `${warning} Feed URL redirected to <a href="${he.encode(
                feeddata.url
            )}">${he.encode(feeddata.url)}</a>.`
        );
    }

    let contentType = feeddata.headers.get("content-type");
    if (!contentType) {
        notes.push(`${error} No content type header found!`);
    } else if (!contentType.startsWith("text/xml") && !contentType.startsWith("application/xml")) {
        notes.push(
            `${warning} Content type is <code>${contentType}</code>, not <code>text/xml</code> or <code>applicaton/xml</code>.`
        );
    } else {
        notes.push(`Content type is <code>${contentType}</code>.`);
    }

    if (contentType && contentType.indexOf("text/html") != -1) {
        const html = await feeddata.text();
        const feeds = findFeedsInHeader(feedurl, html);
        //LATER: also check HTTP headers
        //LATER: make feeds be a set instead of an array
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
        notes.push(`Feed has an ETag of <code>${he.encode(etag)}</code>.`);
    } else {
        notes.push(`${warning} Feed is missing an ETag.`);
    }
    //LATER: see if it responds properly when passed the ETag

    let lastModifiedDate: Date | null = null;
    const lastModified = feeddata.headers.get("last-modified");
    if (lastModified) {
        notes.push(
            `Feed has a last modified date of <code>${he.encode(lastModified)}</code>.`
        );
        const parsedDate = new Date(lastModified);
        if (!isNaN(parsedDate.getTime())) {
            lastModifiedDate = parsedDate;
        }
        const now = new Date();
        const ageMillis = now.getTime() - parsedDate.getTime();
        if (ageMillis < 0) {
            notes.push(`${error} Last-Modified header date is in the future!`);
        } else if (ageMillis < 1000 * 60) {
            notes.push(`${warning} Feed was modified less than a minute ago.  Is that correct?`);
        }
    } else {
        notes.push(`${warning} Feed is missing the Last-Modified HTTP header.`);
    }
    //LATER: see if it responds properly when passed the Last-Modified date

    //LATER: check for published date
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

    if (!xmlDocument) {
        notes.push(`${error} Unable to parse feed as XML.`);
    } else {
        notes.push(`Feed is well-formed XML.`);
        var xmlStyle = xmlDocument["?xml-stylesheet"];
        if (xmlStyle) {
            notes.push(`DEBUG: ${JSON.stringify(xmlStyle)}`);
            if (xmlStyle["@_type"] == "text/css") {
                notes.push(
                    `Feed has an associated CSS stylesheet at <a href="${he.encode(
                        xmlStyle["@_href"]
                    )}">${he.encode(xmlStyle["@_href"])}</a>.`
                );
            } else if (xmlStyle["@_type"] == "text/xsl") {
                notes.push(
                    `${warning} Feed has an associated XSLT stylesheet at <a href="${he.encode(
                        xmlStyle["@_href"]
                    )}">${he.encode(
                        xmlStyle["@_href"]
                    )}</a>, but XSLT is deprecated.`
                );
            } else {
                notes.push(
                    `${error} Feed has an associated stylesheet at <a href="${he.encode(
                        xmlStyle["@_href"]
                    )}">${he.encode(
                        xmlStyle["@_href"]
                    )}</a> but with an unrecognized type <code>${he.encode(
                        xmlStyle["@_type"]
                    )}</code>.`
                );
            }
        }
        var xmlScript = xmlDocument.rss?.script || xmlDocument.feed?.script;
        if (xmlScript) {
            if (xmlScript["@_xmlns"] != "http://www.w3.org/1999/xhtml") {
                notes.push(
                    `${warning} Feed has a script but it is missing the correct xmlns attribute.`
                );
            } else {
                notes.push(
                    `Feed has an associated script, presumably for styling <code>${he.encode(
                        xmlScript["@_src"]
                    )}</code>.`
                );
            }
        }
        if (!xmlStyle && !xmlScript) {
            notes.push(`${warning} Feed has no styling.`);
        }
        //LATER: check if the stylesheet url is the same protocol
        //LATER: check if the stylesheet url returns 200
        //LATER: check if the stylesheet url has the correct Content-Type
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
            notes.push(`${error} Error parsing feed: ${he.encode(err.message)}`);
        } else {
            notes.push(`${error} Error parsing feed: ${he.encode(String(err))}`);
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

        if (feed.items.length == 0) {
            notes.push(`${error} Feed has no items.`);
        } else {
            notes.push(`Feed has ${feed.items.length.toLocaleString()} items.`);
            const firstItem = feed.items[0];
            const firstItemDate = newestItemDate(firstItem);
            if (firstItemDate) {
                notes.push(
                    `First item published on ${firstItemDate.toISOString()}`
                );
            }
            if (feed.items.length > 1) {
                const lastItem = feed.items[feed.items.length - 1];
                const lastItemDate = oldestItemDate(lastItem);
                if (lastItemDate) {
                    notes.push(
                        `Last item published on ${lastItemDate.toISOString()}`
                    );
                }
            }

            let missingPublishedDates = 0
            for (const item of feed.items) {
                if (!item.published && !item.updated) {
                    missingPublishedDates++;
                }
            }
            if (missingPublishedDates > 0) {
                notes.push(
                    `${warning} ${missingPublishedDates.toLocaleString()} item${
                        missingPublishedDates == 1 ? '' : 's'
                    } missing published date.`
                );
            } else {
                notes.push(`All items have published dates.`);

                // check for chronological order
                // LATER: how to account for .updated dates?
                for (let i = 0; i < feed.items.length - 1; i++) {
                    const itemA = oldestItemDate(feed.items[i]);
                    const itemB = newestItemDate(feed.items[i + 1]);
                    if (itemA && itemB && itemA < itemB) {
                        notes.push(
                            `${info} Item ${i} is published before item ${
                                i + 1
                            }: ${itemA.toISOString()} < ${itemB.toISOString()}`
                        );
                    }
                }
            }

            let newestDate: Date | null = null;
            for (const item of feed.items) {
                const itemDate = newestItemDate(item);
                if (itemDate) {
                    if (!newestDate || itemDate > newestDate) {
                        newestDate = itemDate;
                    }
                }
            }
            if (newestDate) {
                notes.push(
                    `Newest item was published on ${newestDate.toISOString()}.`
                );
            }
            if (lastModifiedDate && newestDate) {
                if (newestDate > lastModifiedDate) {
                    notes.push(
                        `${error} Newest item is newer than the feed's Last-Modified date (${newestDate.toISOString()} > ${lastModifiedDate.toISOString()}).`
                    );
                } else if (newestDate < lastModifiedDate) {
                    // occurs too often to make this a warning
                    notes.push(
                        `${info} Feed's Last-Modified date is newer than the newest item's published date (${lastModifiedDate.toISOString()} > ${newestDate.toISOString()}).`
                    );
                }
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
                        `${error} Error fetching home page: he.encode(err.message)}`
                    );
                } else {
                    notes.push(`${error} Error fetching home page: ${he.encode(String(err))}`);
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
                                .map((f) => `<li><a href="${he.encode(f)}">${he.encode(f)}</a></li>`)
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
                        `${error} Error fetching home page: ${homeresponse.status} ${he.encode(homeresponse.statusText)}`
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
            title: `RSS/Atom Feed Analyzer`,
            h1: `RSS/Atom Feed Analysis`,
        },
        content: `<h3>Analysis of <a href="${he.encode(feedurl)}">${he.encode(
            feedurl
        )}</a></h3>
<p class="lh-lg">${analysis}</p>
<details class="py-1"><summary>Formatted XML</summary>
<pre class="border bg-body-secondary rounded p-2">${he.encode(
            xmlFormat(feedtext, { collapseContent: true })
        )}</pre>
</details>
<details class="py-1"><summary>Raw text</summary>
<pre class="border bg-body-secondary rounded p-2">${he.encode(feedtext)}</pre>
</details>
<details class="py-1"><summary>Raw headers</summary>
<pre class="border bg-body-secondary rounded p-2">${he.encode(
            JSON.stringify(Object.fromEntries(feeddata.headers), null, 2)
        )}</pre>
</details>
<details class="py-1"><summary>Parsed with <a href="https://github.com/rowanmanning/feed-parser">@rowanmanning/feed-parser</a></summary>
<pre class="border bg-body-secondary rounded p-2">${he.encode(
            JSON.stringify(feed, null, 2)
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
        : ''; //`<div class="alert alert-info" role="alert">Under Construction: Please don't take it seriously yet!</div>`;

    const data = {
        page: {
            title: `RSS/Atom Feed Analyzer`,
            h1: `Analyze my RSS/Atom feed!`,
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

function newestItemDate(item: FeedItem): Date | null {
    if (item.published) {
        if (item.updated) {
            return item.published > item.updated ? item.published : item.updated;
        }
        return item.published;
    }
    return item.updated || null;
}

function oldestItemDate(item: FeedItem): Date | null {
    if (item.published) {
        if (item.updated) {
            return item.published < item.updated
                ? item.published
                : item.updated;
        }
        return item.published;
    }
    return item.updated || null;
}

function findFeedsInHtml(
    homeUrl: string,
    html: string
): string[] {
    const $ = cheerio.load(html);
    const feeds: string[] = [];
    const links = $("a");
    for (let i = 0; i < links.length; i++) {
        const href = $(links[i]).attr("href");
        if (href && (href.indexOf(".rss") != -1 || href.indexOf(".xml") != -1 || href.indexOf("/feed") != -1)) {
            const linkUrl = new URL(href, homeUrl);
            feeds.push(linkUrl.href);
        }
    }
    return feeds;
}

function findFeedInHtml(
    homeUrl: string,
    feedUrl: string,
    html: string
): string {
    const $ = cheerio.load(html);
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
