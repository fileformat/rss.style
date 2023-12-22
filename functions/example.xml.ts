
interface Env {
}

export const onRequest: PagesFunction<Env> = async (ctx) => {

    const me = new URL(ctx.request.url);
    const feedurl = me.searchParams.get('feedurl');
    if (!feedurl) {
        return new Response("Missing feedurl query parameter", { 
            headers: { 'location': '/?err=nofeedurl'},
            status: 302,
        });
    }

    const feeddata = await fetch(feedurl);

    let feedtext = await feeddata.text();

    //let style = `<?xml-stylesheet type="text/xsl" href="https://www.feed.style/xslt/simple-rss.xslt" ?>`;
    let style = `<?xml-stylesheet type="text/xsl" href="/xslt/simple-rss.xslt" ?>`;
    if (feedtext.indexOf('<rss') == -1) {
        style = `<?xml-stylesheet type="text/xsl" href="/xslt/simple-atom.xslt" ?>`;
    }

    // you know you're naughty when you use regex to parse xml...
    const styledtext = feedtext.replace(/^(<[?]xml .*[?]>)?(.*)$/s, `$1${style}$2`);

    return new Response(styledtext, { headers: { 
        'Content-Type': 'text/xml; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex',
        'X-Original-Content-Type': feeddata.headers.get('Content-Type') || '(not set?!?)',
    } });
}