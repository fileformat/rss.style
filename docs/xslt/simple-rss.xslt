<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
    xmlns:atom="http://www.w3.org/2005/Atom">
    <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
    <xsl:template match="/">
    <xsl:variable name="owner_url"><xsl:value-of select="/rss/channel/link"/></xsl:variable>
<html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="referrer" content="unsafe-url" />
        <title><xsl:value-of select="/rss/channel/title"/></title>
        <link rel="stylesheet" href="https://www.feed.style/css/water.min.css" />
        <script src="https://cdn.jsdelivr.net/npm/clipboard@2.0.11/dist/clipboard.min.js"></script>    
        <script>
            new ClipboardJS('.clipboard');
        </script>
    </head>
    <body>
        <h1><xsl:value-of select="/rss/channel/title"/></h1>

        <p>
            <xsl:value-of select="/rss/channel/description"/>
        </p>

        <p>This is the RSS feed for the 
            <a><xsl:attribute name="href">
                <xsl:value-of select="/rss/channel/link"/>
            </xsl:attribute>
            <xsl:value-of select="/rss/channel/title"/></a> 
            website.
        </p>

        <p>It is meant for news readers, not humans.  Please copy-and-paste the URL into your news reader!</p>

        <p>
            <pre>
                <code id="feedurl"><xsl:value-of select="/rss/channel/atom:link/@href"/></code>    
            </pre>
            <button
                class="clipboard"
                data-clipboard-target="#feedurl">
                Copy to clipboard
            </button>
        </p>

        <ul>
        <xsl:for-each select="/rss/channel/item">
            <li>
                <xsl:value-of select="title" /> 
                (<xsl:value-of select="pubDate" />)
            </li>
        </xsl:for-each>
        </ul>
        <p><xsl:value-of select="count(/rss/channel/item)"/> news items.</p>
    </body>
</html>
    </xsl:template>
</xsl:stylesheet>
