import YAML from 'yaml';

import examplesYaml from '../site-content/data/examples.yaml?raw';
import linksYaml from '../site-content/data/links.yaml?raw';
import newsreadersYaml from '../site-content/data/newsreaders.yaml?raw';
import testingYaml from '../site-content/data/testing.yaml?raw';

type MaybeString = string | undefined;

export interface ExampleLink {
  name: string;
  website?: string;
  url: string;
  notes?: string;
}

export interface LinkItem {
  title: string;
  url: string;
  notes?: string;
}

export interface Newsreader {
  name: string;
  url: string;
  platforms: string[];
  pricing: string;
  pricing_url?: string;
  tags?: string[];
}

interface TestingOption {
  key: string;
  value: string;
  default?: boolean;
  skipall?: boolean;
}

export interface TestingData {
  types: TestingOption[];
  styles: TestingOption[];
  locations: TestingOption[];
}

function parseList<T>(raw: string): T[] {
  return YAML.parse(raw) as T[];
}

export const examples = parseList<ExampleLink>(examplesYaml);
export const links = parseList<LinkItem>(linksYaml);
export const newsreaders = parseList<Newsreader>(newsreadersYaml);
export const testing = YAML.parse(testingYaml) as TestingData;

export function renderInlineMarkdown(input: MaybeString): string {
  if (!input) {
    return '';
  }
  return input
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
