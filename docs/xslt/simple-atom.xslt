<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" 
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
	xmlns:atom="http://www.w3.org/2005/Atom">
	<xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
	<xsl:template match="/">
<html>
	<head>
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="referrer" content="unsafe-url" />
		<title><xsl:value-of select="/atom:feed/atom:title"/></title>
		<link rel="stylesheet" href="https://www.feed.style/css/water.min.css" />
	</head>
	<body>
		<h1>
			<img alt="feed icon" src="https://www.vectorlogo.zone/logos/rss/rss-tile.svg" style="height:1em;vertical-align:middle;" />&#xa0;
			<xsl:value-of select="/atom:feed/atom:title"/>
		</h1>

		<p>
			<xsl:value-of select="/atom:feed/atom:subtitle"/>
		</p>

		<p>
			This is the Atom <a href="https://www.feed.style/what-is-a-feed.html">news feed</a> for the&#xa0; 
			<a><xsl:attribute name="href">
				<xsl:value-of select="/atom:feed/atom:link[@rel='alternate']/@href | /atom:feed/atom:link[not(@rel)]/@href"/>
			</xsl:attribute>
			<xsl:value-of select="/atom:feed/atom:title"/></a>&#xa0;
			website.
		</p>

		<p>It is meant for <a href="https://www.feed.style/newsreaders.html">news readers</a>, not humans.  Please copy-and-paste the URL into your news reader!</p>

		<p>
			<pre>
				<code id="feedurl"><xsl:value-of select="/atom:feed/atom:link[@rel='self']/@href"/></code>    
			</pre>
			<button
				class="clipboard"
				data-clipboard-target="#feedurl">
				Copy to clipboard
			</button>
		</p>

		<ul>
		<xsl:for-each select="/atom:feed/atom:entry">
			<li>
				<a>
				<xsl:attribute name="href">
					<xsl:value-of select="atom:id"/>
				</xsl:attribute>
				<xsl:value-of select="atom:title"/>
				</a>&#xa0;-&#xa0;
				<xsl:value-of select="atom:updated" />
			</li>
		</xsl:for-each>
		</ul>
		<p><xsl:value-of select="count(/atom:feed/atom:entry)"/> news items.</p>
		<p><small>Powered by <a href="https://www.feed.style/"><img referrerpolicy="origin" src="https://www.feed.style/favicon.svg" style="height:1em;padding-right:0.25em;vertical-align:middle;" />Feed.Style</a></small></p>
		<script src="https://cdn.jsdelivr.net/npm/clipboard@2.0.11/dist/clipboard.min.js"></script>    
		<script>
			new ClipboardJS('.clipboard');
		</script>
	</body>
</html>
	</xsl:template>
</xsl:stylesheet>
