import type { APIRoute } from 'astro';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

export const GET: APIRoute = async ({ request }) => {
  const me = new URL(request.url);
  const feedurl = me.searchParams.get('feedurl');
  if (!feedurl) {
    return showForm('', 'Please enter a feed URL to preview.');
  }

  try {
    new URL(feedurl);
  } catch (err: unknown) {
    if (err instanceof Error) {
      return showForm(feedurl, `Invalid URL: ${err.message}`);
    }
    return showForm(feedurl, `Error parsing URL: ${String(err)}`);
  }

  let feeddata: Response;
  try {
    feeddata = await fetch(feedurl, {
      headers: {
        'User-Agent': 'RSS.Style/1.0 (your feed is being stylish on https://www.rss.style/ )',
        Referer: request.url
      }
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return showForm(feedurl, `Error fetching feed: ${err.message}`);
    }
    return showForm(feedurl, `Unable to fetch feed: ${String(err)}`);
  }

  if (!feeddata.ok) {
    return showForm(feedurl, `Error fetching feed: ${feeddata.status} ${feeddata.statusText}`);
  }

  if (!feeddata.headers.get('Content-Type')?.match(/(application\/(rss\+xml|atom\+xml|xml)|text\/xml)/i)) {
    return showForm(
      feedurl,
      `This URL does not appear to be an RSS or Atom feed (Content-Type: ${feeddata.headers.get('Content-Type')})`
    );
  }

  const feedtext = await feeddata.text();

  const xmlOptions = {
    attributeNamePrefix: '@_',
    ignoreAttributes: false,
    ignoreNamespaces: false,
    parseAttributeValue: false,
    suppressBooleanAttributes: false,
    format: true,
    indentBy: '  '
  };

  const parser = new XMLParser(xmlOptions);
  const xmlDocument = parser.parse(feedtext);

  if (xmlDocument['?xml-stylesheet']) {
    delete xmlDocument['?xml-stylesheet'];
  }

  xmlDocument['?xml-stylesheet'] = {
    '@_type': 'text/css',
    '@_href': '/css/blank.css'
  };

  if (xmlDocument.rss) {
    xmlDocument.rss.script = {
      '@_src': '/js/rss-style.js',
      '@_xmlns': 'http://www.w3.org/1999/xhtml',
      '#text': ''
    };

    if (!xmlDocument.rss.channel['atom:link']) {
      xmlDocument.rss['@_xmlns:atom'] = 'http://www.w3.org/2005/Atom';
      xmlDocument.rss.channel['atom:link'] = {
        '@_href': feedurl,
        '@_rel': 'self',
        '@_type': 'application/rss+xml'
      };
    }
  } else if (xmlDocument.feed) {
    xmlDocument.feed.script = {
      '@_src': '/js/atom-style.js',
      '@_xmlns': 'http://www.w3.org/1999/xhtml',
      '#text': ''
    };
  }

  const styledtext = new XMLBuilder(xmlOptions).build(xmlDocument);

  return new Response(styledtext, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'nofollow, noindex',
      'X-Original-Content-Type': feeddata.headers.get('Content-Type') || '(not set?!?)'
    }
  });
};

async function showForm(feedurl: string, msg: string) {
  const params = new URLSearchParams();
  params.set('feedurl', feedurl);
  if (msg) {
    params.set('msg', msg);
  }

  //return Response.redirect(`/example.html?${params.toString()}`, 302);
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/example.html?${params.toString()}`
    }
  });
}
