import type { APIRoute } from 'astro';

const posts = [
  {
    date: '2026-01-25',
    title: 'Fixed home link source, made into a button',
    content: 'The home link was not specific about which <link> element it was using as the source. Also made it a button so it stands out more.'
  },
  {
    date: '2026-01-19',
    title: 'Fixed home link in RSS',
    content: 'Fixed the hyperlink in RSS version for the "for the Xxx Website" link to use the <link> from the feed instead of modifying the feed url.'
  },
  {
    date: '2026-01-12',
    title: 'Added viewport',
    content: 'Added viewport meta element to the HTML header so it displays nicely on mobile.'
  },
  {
    date: '2026-01-08',
    title: 'Added home link',
    content: 'Added a hyperlink to the site name in the "for the Xxx Website" text.'
  },
  {
    date: '2026-01-04',
    title: 'Javascript version released',
    content: 'After trying to use XSLT polyfill approaches, the project moved to direct JavaScript feed rendering.'
  },
  {
    date: '2025-08-01',
    title: 'Discussion started about deprecating XSLT in the browser',
    content: 'Google started discussing deprecating XSLT support in WHATWG issues.'
  },
  {
    date: '2024-04-07',
    title: 'Feed Analyzer',
    content: 'The Feed Analyzer tool was added to automate feed checks and produce diagnostics.'
  },
  {
    date: '2023-12-26',
    title: 'Initial XSLT-based release',
    content: 'First public release of RSS.Style, with styling done via XSLT.'
  },
  {
    date: '2023-12-12',
    title: 'Registered feed.style domain',
    content: 'The project initially used feed.style before settling on rss.style.'
  },
  {
    date: '2023-11-15',
    title: 'Registered rss.style domain',
    content: 'Registered the rss.style domain.'
  }
];

function asRssDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toUTCString();
}

export const GET: APIRoute = async () => {
  const now = new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xml:base="https://www.rss.style/">\n  <script src="/js/rss-style.js" xmlns="http://www.w3.org/1999/xhtml"></script>\n  <channel>\n    <copyright>Copyright © 2026 by Andrew Marcuse</copyright>\n    <description>Log of changes to the embeddable/hotlinkable scripts</description>\n    <docs>https://validator.w3.org/feed/docs/rss2.html</docs>\n    <generator>Astro</generator>\n    <image>\n      <link>https://www.rss.style/</link>\n      <title>RSS.Style Changelog</title>\n      <url>https://www.rss.style/favicon.svg</url>\n    </image>\n    <language>en</language>\n    <lastBuildDate>${now}</lastBuildDate>\n    <link>https://www.rss.style/</link>\n    <atom:link href="https://www.rss.style/changelog.xml" rel="self" type="application/rss+xml" />\n    <managingEditor>fileformat@gmail.com (Andrew Marcuse)</managingEditor>\n    <pubDate>${now}</pubDate>\n    <title>RSS.Style Changelog</title>\n    <ttl>1440</ttl>\n    <webMaster>fileformat@gmail.com (Andrew Marcuse)</webMaster>\n${posts
      .map(
        (post) => `    <item>\n      <guid>https://www.rss.style/${post.date}</guid>\n      <link>https://www.rss.style/</link>\n      <pubDate>${asRssDate(post.date)}</pubDate>\n      <title>${post.title}</title>\n      <description><![CDATA[<p>${post.content}</p>]]></description>\n    </item>`
      )
      .join('\n')}\n  </channel>\n</rss>\n`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8'
    }
  });
};
