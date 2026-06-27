import type { APIRoute } from 'astro';
import he from 'he';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

import { render } from '../render';

export const GET: APIRoute = async ({ request }) => {
  const me = new URL(request.url);
  const feedurl = me.searchParams.get('feedurl');
  if (!feedurl) {
    return showForm('', '');
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
  const alert = msg ? `<div class="alert alert-danger" role="alert">${he.encode(msg)}</div>` : '';

  const data = {
    page: {
      title: 'Preview - RSS.Style'
    },
    content: `<h1>Preview</h1>
${alert}
<form action="example.xml" class="row justify-content-md-center" method="get">
    <div class="col-sm-12 col-md-9 col-lg-6">
        <div class="mb-3">
            <label class="col-2 col-form-label" for="feedurl">Feed&nbsp;URL:</label>
            <input type="text" class="form-control" id="feedurl" value="${he.encode(feedurl)}" name="feedurl" placeholder="" required>
        </div>
        <div class="mb-3">
            <input class="btn btn-primary" value="Make it pretty!" type="submit" />
            <a href="/" class="btn btn-outline-primary ms-2">Cancel</a>
        </div>
    </div>
</form>
`
  };

  const html = await render(data);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html'
    }
  });
}
