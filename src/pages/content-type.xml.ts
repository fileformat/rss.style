import type { APIRoute } from 'astro';
import he from 'he';

import rssXsltBase64 from '../site-content/embedded/simple-rss.xslt.base64.txt?raw';
import atomXsltBase64 from '../site-content/embedded/simple-atom.xslt.base64.txt?raw';
import rssCssBase64 from '../site-content/embedded/simple-rss.css.base64.txt?raw';
import atomCssBase64 from '../site-content/embedded/simple-atom.css.base64.txt?raw';
import atomJs from '../site-content/embedded/atom-style.min.inline.js?raw';
import rssJs from '../site-content/embedded/rss-style.min.inline.js?raw';

const remoteHost = import.meta.env.PROD ? 'https://www.rss.style' : 'http://127.0.0.1:8787';

function getReplacement(isAtom: boolean, isCss: boolean): string {
  if (isCss) {
    return isAtom ? atomCssBase64 : rssCssBase64;
  }
  return isAtom ? atomXsltBase64 : rssXsltBase64;
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

export const GET: APIRoute = async ({ request }) => {
  const me = new URL(request.url);
  let ct = me.searchParams.get('type');
  let style = me.searchParams.get('style');
  const location = me.searchParams.get('location');

  if (!ct || !style || !location) {
    return Response.redirect('/content-type.html?err=Missing+parameters', 302);
  }

  if (!['none', 'xslt', 'css', 'js'].includes(style)) {
    return Response.redirect('/content-type.html?err=invalid+style', 302);
  }

  if (!['local', 'remote', 'base64'].includes(location)) {
    return Response.redirect('/content-type.html?err=invalid+location', 302);
  }

  if (ct === 'custom') {
    ct = me.searchParams.get('custom');
    if (!ct) {
      return Response.redirect('/content-type.html?err=Missing+custom+content+type', 302);
    }
  }

  const isAtom = ct.startsWith('application/atom');
  let feed = isAtom ? sampleAtom : sampleRss;

  feed = feed.replace('{{ct}}', he.encode(ct));
  feed = feed.replace('{{location}}', location);
  feed = feed.replace('{{style}}', style);

  const styleType = style === 'xslt' ? 'xsl' : style;
  if (styleType === 'none' || styleType === 'js') {
    feed = feed.replace('{{style_instruction}}', '');
  } else if (location === 'local') {
    feed = feed.replace(
      '{{style_instruction}}',
      `<?xml-stylesheet type="text/${styleType}" href="/${style}/simple-${isAtom ? 'atom' : 'rss'}.${style}" ?>`
    );
  } else if (location === 'remote') {
    feed = feed.replace(
      '{{style_instruction}}',
      `<?xml-stylesheet type="text/${styleType}" href="${remoteHost}/${style}/simple-${isAtom ? 'atom' : 'rss'}.${style}" ?>`
    );
  } else {
    const replacement = getReplacement(isAtom, style === 'css');
    feed = feed.replace(
      '{{style_instruction}}',
      `<?xml-stylesheet type="text/${styleType}" href="data:text/${styleType};base64,${replacement}" ?>`
    );
  }

  let scriptContent = '';
  if (styleType === 'js') {
    if (location === 'base64') {
      const replacement = isAtom ? atomJs : rssJs;
      scriptContent = `<script type="text/javascript" xmlns="http://www.w3.org/1999/xhtml"><![CDATA[${replacement}]]></script>`;
    } else {
      scriptContent = `<script src="${remoteHost}/js/${isAtom ? 'atom' : 'rss'}-style.js" xmlns="http://www.w3.org/1999/xhtml"></script>`;
    }
  }

  feed = feed.replace('{{script}}', scriptContent);

  return new Response(feed, {
    headers: { 'Content-Type': ct }
  });
};
