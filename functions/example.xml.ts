
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
    console.log(`INFO: fetching feedurl=${feedurl}`);
    const start = Date.now();

    const feeddata = await fetch(feedurl, {
        headers: {
            'User-Agent': 'Feed.Style/1.0 (you are one of the examples on https://www.feed.style/ !)',
            'Referer': 'https://www.feed.style/',
        },
    });
    console.log(`INFO: fetched feedurl=${feedurl} in ${Date.now() - start}ms`);

    let feedtext = await feeddata.text();

    if (feedtext.indexOf('<?xml-stylesheet') != -1) {
        console.log(`INFO: removing default xslt stylesheet`)
        feedtext = feedtext.replace(/<[?]xml-stylesheet .*[?]>/, '');
    }

    //let style = `<?xml-stylesheet type="text/xsl" href="https://www.feed.style/xslt/simple-rss.xslt" ?>`;
    let style = `<?xml-stylesheet type="text/xsl" href="/xslt/simple-rss.xslt" ?>`;
    if (feedtext.indexOf('<rss') == -1) {
        console.log(`INFO: using atom stylesheet`);
        style = `<?xml-stylesheet type="text/xsl" href="/xslt/simple-atom.xslt" ?>`;
    } else {
        console.log(`INFO: using rss stylesheet`);
    }
    feedtext = feedtext.replace(/<[?]xml-stylesheet type="text\/xsl" href=".*" [?]>/, '');

    // you know you're naughty when you use regex to parse xml...
    const styledtext = feedtext.replace(/^(<[?]xml .*[?]>)?(.*)$/s, `$1${style}$2`);

    return new Response(styledtext, { headers: { 
        'Content-Type': 'text/xml; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex',
        'X-Original-Content-Type': feeddata.headers.get('Content-Type') || '(not set?!?)',
    } });
}