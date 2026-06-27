import * as cheerio from "cheerio";

export function findFeedsInHeader(url: string, html: string): string[] {
    const $ = cheerio.load(html);
    const feeds: string[] = [];
    $('link[type="application/rss+xml"]').each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
            feeds.push(new URL(href, url).href);
        }
    });
    $('link[type="application/atom+xml"]').each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
            feeds.push(new URL(href, url).href);
        }
    });
    return feeds;
}
