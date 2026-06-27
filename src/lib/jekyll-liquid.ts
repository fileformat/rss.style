import { Liquid } from 'liquidjs';

import { siteConfig } from './site-config';
import { examples, links, newsreaders, renderInlineMarkdown, testing } from './site-data';

const engine = new Liquid();

engine.registerFilter('cgi_escape', (input: string) => encodeURIComponent(input));
engine.registerFilter('url_encode', (input: string) => encodeURIComponent(input));
engine.registerFilter('markdownify', (input: string) => `<p>${renderInlineMarkdown(input)}</p>`);

function stripFrontMatter(input: string): string {
  if (!input.startsWith('---')) {
    return input;
  }
  const second = input.indexOf('\n---\n', 4);
  if (second === -1) {
    return input;
  }
  return input.slice(second + '\n---\n'.length);
}

function buildSite() {
  return {
    title: siteConfig.title,
    production_url: siteConfig.productionUrl,
    sharing_targets: [...siteConfig.sharingTargets],
    data: {
      examples,
      links,
      newsreaders,
      testing
    }
  };
}

export async function renderJekyllTemplate(template: string, page: Record<string, unknown>) {
  const source = stripFrontMatter(template);
  return engine.parseAndRender(source, {
    page,
    site: buildSite()
  });
}
