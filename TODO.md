# To Do

- [ ] Federo font
- [ ] FAQ: how to tell if I have atom or rss
- [ ] test on more browsers
- [ ] test on Windows
- [ ] test on mobile
- [ ] maybe: `<pre>` section in XSLT with original XML
- [ ] Page explaining news readers w/list of ones to choose
- [ ] `atom.css` - CSS instead of XSLT for Atom feeds
- [ ] `rss.css` - CSS instead of XSLT for RSS feeds
- [ ] `debug-atom.xslt` - show details of an Atom feed
- [ ] `debug-rss.xslt` - show details of an RSS feed
- [ ] `parsed.json` - what it would look like when parsed (by ??? library)
- [ ] `pretty.xml` - pretty-printed XML

## Fonts

### Handwriting

- Monte Carlo
- Carattere
- x Gwendolyn
- Great Vibes
- Limelight
- Imperial Script
- x Sansita Swashed
- x Parisienne
- x Meow Script
- x Norican
- Tangerine
- Niconne
- Pinyon Script
- Charm
- x Ephesis
- x Mea Culpe
- [Google search](https://fonts.google.com/?classification=Handwriting)


### Other
- Limelight
- Barrio
- Fascinate Inline
- Molle
- Mr Bedfort
- Ruge Boogie
- Updock
- Felipa
- Amarante
- Berkshire Swash
- Federo

## Analyzer

Letter grade for feeds.

Criteria:

- [ ] valid xml
- [ ] official schema validation
- [ ] actual feed parsing libraries can parse (which libraries?)
- [ ] content-type header
- [ ] header `x-content-type-options: nosniff`
- [ ] `self` link matches URL
- [ ] `link` parent page is valid
- [ ] `link` parent page has `link/rel=alternate` header
- [ ] `link` parent page has a regular `<a>` link in the HTML
- [ ] has icon, icon is square (bonus for SVG)
- [ ] has logo, logo is 2:1 (bonus for SVG)
- [ ] has styling
- [ ] absolute links
- [ ] secure links
- [ ] has style
- [ ] full/partial content (maybe not)
- [ ] plain/html content (or at least parseable)
- [ ] overall size in bytes
- [ ] age of oldest entry (if a lot of entries)
