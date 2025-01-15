import { PagesFunction, EventContext } from "@cloudflare/workers-types";
import he from "he";

// LATER: this is a hack to workaround inlining the files with extensions other than '.html'
import rss_base64 from "../docs/xslt/_simple-rss.base64.html";
import atom_base64 from "../docs/xslt/_simple-atom.base64.html";

interface Env {}

const remoteHost = "https://feed-style.pages.dev";

const sampleRss = `<?xml version="1.0" encoding="UTF-8"?>
{{style}}
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Sample Feed</title>
    <link>https://www.rss.style/</link>
    <description>A sample RSS feed</description>
    <language>en-us</language>
    <lastBuildDate>Fri, 21 Jul 2023 09:04 EDT</lastBuildDate>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <generator>RSS.Style/1.0</generator>
    <webMaster>webmaster@rss.style</webMaster>
    <atom:link href="https://www.rss.style/content-type.xml" rel="self" type="application/rss+xml"/>
    <item>
      <title>Sample Item</title>
      <link>https://example.com/sample-item</link>
      <description>Sample item description</description>
      <pubDate>Fri, 21 Jul 2023 09:04 EDT</pubDate>
    </item>
    <item>
      <title>Content Type {{ct}}</title>
      <link>https://example.com/sample-item</link>
      <description>This test is served with content type {{ct}}</description>
      <pubDate>Fri, 21 Jul 2023 09:04 EDT</pubDate>
    </item>
    <item>
      <title>Style Sheet</title>
      <link>https://example.com/sample-item</link>
      <description>{{style_description}}</description>
      <pubDate>Fri, 21 Jul 2023 09:04 EDT</pubDate>
    </item>
  </channel>
</rss>`;

const sampleAtom = `<?xml version="1.0" encoding="UTF-8"?>
{{style}}
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Sample Feed</title>
  <link href="https://example.com/" />
  <id>https://example.com/</id>
  <updated>2022-01-01T00:00:00Z</updated>
  <entry>
    <title>Sample Item</title>
    <link href="https://example.com/sample-item" />
    <id>https://example.com/sample-item</id>
    <updated>2022-01-01T00:00:00Z</updated>
    <content>Sample item description</content>
  </entry>
</feed>`;

export const onRequest: PagesFunction<Env> = async (ctx) => {
    const me = new URL(ctx.request.url);
    let ct = me.searchParams.get("type");
    let style = me.searchParams.get("style");
    if (!ct || !style) {
        return Response.redirect("/content-type.html", 302);
    }

    if (ct == "custom") {
        ct = me.searchParams.get("custom");
        if (!ct) {
            return Response.redirect("/content-type.html", 302);
        }
    }

    //LATER: check that ct is something reasonable /^[a-z]+\/[a-z]+/i

    let isAtom: boolean;
    let feed: string;
    if (ct.startsWith("application/atom")) {
        feed = sampleAtom;
        isAtom = true;
    } else {
        feed = sampleRss;
        isAtom = false;
    }
    feed = feed.replace("{{ct}}", he.encode(ct));

    switch (style) {
        case "xslt":
            feed = feed.replace(
                "{{style}}",
                `<?xml-stylesheet type="text/xsl" href="/xslt/simple-${
                    isAtom ? "atom" : "rss"
                }.xslt" ?>`
            );
            feed = feed.replace(
                "{{style_description}}",
                "This feed uses a local XSLT stylesheet."
            );
            break;
        case "xslt_remote":
            feed = feed.replace(
                "{{style}}",
                `<?xml-stylesheet type="text/xsl" href="${remoteHost}/xslt/simple-${
                    isAtom ? "atom" : "rss"
                }.xslt" ?>`
            );
            feed = feed.replace(
                "{{style_description}}",
                "This feed uses a remote XSLT stylesheet."
            );
            break;
        case "xslt_base64":
            const replacement = isAtom ? atom_base64 : rss_base64;
            feed = feed.replace(
                "{{style}}",
                `<?xml-stylesheet type="text/xsl" href="data:text/xml;base64,${replacement}" ?>`
            );
            feed = feed.replace(
                "{{style_description}}",
                "This feed uses a base64-encoded XSLT stylesheet."
            );
            break;
        case "css":
            feed = feed.replace(
                "{{style}}",
                `<?xml-stylesheet type="text/css" href="/css/simple-rss.css" ?>`
            );
            feed = feed.replace(
                "{{style_description}}",
                "This feed uses a local CSS stylesheet."
            );
            break;
        default:
            feed = feed.replace("{{style}}", "");
            feed = feed.replace(
                "{{style_description}}",
                "This feed does not use a stylesheet."
            );
            break;
    }

    return new Response(feed, {
        headers: { "Content-Type": ct },
    });
};
