import { getCollection } from 'astro:content';
import { entrySlug, inLang, type Lang } from '../i18n/ui';

export async function projectPaths(lang: Lang) {
  const projects = inLang(await getCollection('projects'), lang);
  return projects.map((project) => ({ params: { slug: entrySlug(project.id) }, props: { project } }));
}

export async function postPaths(lang: Lang) {
  const posts = inLang(await getCollection('blog'), lang).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return posts.map((post, i) => ({
    params: { slug: entrySlug(post.id) },
    props: { post, newer: posts[i - 1], older: posts[i + 1] },
  }));
}
