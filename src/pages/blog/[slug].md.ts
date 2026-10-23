import type { APIRoute } from 'astro';
import type { CollectionEntry } from 'astro:content';
import { postMarkdown, postMarkdownPaths } from '../../lib/llms';

export const getStaticPaths = () => postMarkdownPaths('en');

export const GET: APIRoute = ({ props, site }) => postMarkdown(props.post as CollectionEntry<'blog'>, 'en', site!);
