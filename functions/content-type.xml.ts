import { PagesFunction, EventContext } from "@cloudflare/workers-types";
import he from "he";

// LATER: this is a hack to workaround inlining the files with extensions other than '.html'
import rss_xslt_base64 from "../docs/xslt/_simple-rss.base64.html";
import atom_xslt_base64 from "../docs/xslt/_simple-atom.base64.html";
import rss_css_base64 from "../docs/css/_simple-rss.base64.html";
import atom_css_base64 from "../docs/css/_simple-atom.base64.html";
import atom_js from "../docs/js/_atom-style.min.html";
import rss_js from "../docs/js/_rss-style.min.html";

interface Env {}

const remoteHost = process.env.NODE_ENV === "production" ? "https://www.rss.style" : "http://127.0.0.1:5000";

function getReplacement(isAtom: boolean, isCss: boolean): string {
    if (isCss) {
        return isAtom ? atom_css_base64 : rss_css_base64;
    } else {
        return isAtom ? atom_xslt_base64 : rss_xslt_base64;
    }
}

const sampleRss = `<?xml version="1.0" encoding="UTF-8"?>
{{style_instruction}}
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  {{script}}
  <channel>
    <title>Sample RSS Feed</title>
    <link>https://www.rss.style/</link>
    <description>A sample RSS feed</description>
    <language>en-us</language>
    <lastBuildDate>Fri, 21 Jul 2023 09:04 EDT</lastBuildDate>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <generator>RSS.Style/1.0</generator>
    <webMaster>webmaster@rss.style</webMaster>
    <atom:link href="https://www.rss.style/content-type.xml" rel="self" type="application/rss+xml"/>
    <item>
      <title>Location {{location}}</title>
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
      <title>Style {{style}}</title>
      <link>https://example.com/sample-item</link>
      <description>Sample item description</description>
      <pubDate>Fri, 21 Jul 2023 09:04 EDT</pubDate>
    </item>
  </channel>
</rss>`;

const sampleAtom = `<?xml version="1.0" encoding="UTF-8"?>
{{style_instruction}}
<feed xmlns="http://www.w3.org/2005/Atom">
  {{script}}
  <title>Sample Feed</title>
  <link href="https://example.com/" />
  <id>https://example.com/</id>
  <updated>2022-01-01T00:00:00Z</updated>
  <entry>
    <title>Location {{location}}</title>
    <link href="https://example.com/sample-item" />
    <id>https://example.com/sample-item</id>
    <updated>2022-01-01T00:00:00Z</updated>
    <content>Sample item description</content>
  </entry>
  <entry>
    <title>Content type {{ct}}</title>
    <link href="https://example.com/sample-item" />
    <id>https://example.com/sample-item</id>
    <updated>2022-01-01T00:00:00Z</updated>
    <content>Sample item description</content>
  </entry>
  <entry>
    <title>Style {{style}}</title>
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
    let location = me.searchParams.get("location");
    if (!ct || !style || !location) {
        return Response.redirect("/content-type.html?err=Missing+parameters", 302);
    }

    if (style != "none" && style != "xslt" && style != "css" && style != "js") {
        return Response.redirect("/content-type.html?err=invalid+style", 302);
    }

    if (location != "local" && location != "remote" && location != "base64") {
        return Response.redirect("/content-type.html?err=invalid+location", 302);
    }

    if (ct == "custom") {
        ct = me.searchParams.get("custom");
        if (!ct) {
            return Response.redirect("/content-type.html?err=Missing+custom+content+type", 302);
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
    feed = feed.replace("{{location}}", location);
    feed = feed.replace("{{style}}", style);

    let styleType = style == "xslt" ? "xsl" : style;

    if (styleType == "none" || styleType == "js") {
        feed = feed.replace("{{style_instruction}}", "");
    } else {
        switch (location) {
            case "local":
                feed = feed.replace(
                    "{{style_instruction}}",
                    `<?xml-stylesheet type="text/${styleType}" href="/${style}/simple-${
                        isAtom ? "atom" : "rss"
                    }.${style}" ?>`
                );
                break;
            case "remote":
                feed = feed.replace(
                    "{{style_instruction}}",
                    `<?xml-stylesheet type="text/${styleType}" href="${remoteHost}/${style}/simple-${
                        isAtom ? "atom" : "rss"
                    }.${style}" ?>`
                );
                break;
            case "base64":
                const replacement = getReplacement(isAtom, style == "css");
                feed = feed.replace(
                    "{{style_instruction}}",
                    `<?xml-stylesheet type="text/${styleType}" href="data:text/${styleType};base64,${replacement}" ?>`
                );
                break;
        }
    }

    var scriptContent = '';
    if (styleType == "js") {
        if (location === "base64") {
            const replacement = isAtom ? atom_js : rss_js;
            scriptContent = `<script type="text/javascript" xmlns="http://www.w3.org/1999/xhtml"><![CDATA[${replacement}]]></script>`;
        } else {
            scriptContent = `<script src="${remoteHost}/js/${isAtom ? "atom" : "rss"}-style.js" xmlns="http://www.w3.org/1999/xhtml"></script>`
        }
    }
    feed = feed.replace(
        "{{script}}",
        scriptContent
    );

    return new Response(feed, {
        headers: { "Content-Type": ct },
    });
};
