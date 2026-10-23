import type { APIRoute } from 'astro';
import type { CollectionEntry } from 'astro:content';
import { projectMarkdown, projectMarkdownPaths } from '../../lib/llms';

export const getStaticPaths = () => projectMarkdownPaths('en');

export const GET: APIRoute = ({ props, site }) =>
  projectMarkdown(props.project as CollectionEntry<'projects'>, 'en', site!);
