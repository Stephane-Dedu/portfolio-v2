// Plain-text views of the site for LLMs: /llms.txt (https://llmstxt.org) and a
// Markdown version of every project and post at the same URL plus `.md`.
import { getCollection, type CollectionEntry } from 'astro:content';
import { entrySlug, formatMonth, inLang, localize, type Lang } from '../i18n/ui';
import { site } from './site';

const markdownResponse = (text: string) =>
  new Response(text.trimEnd() + '\n', { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
export const textResponse = (text: string) =>
  new Response(text.trimEnd() + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

const absolute = (siteUrl: URL, path: string) => new URL(path, siteUrl).href;

/** MDX body to plain Markdown: drop imports and components, keep what they say, absolute links. */
export function mdxToMarkdown(body = '', siteUrl?: URL) {
  const markdown = body
    .replace(/^import .*$/gm, '')
    .replace(/<Checklist[\s\S]*?\/>/g, (block) =>
      [...block.matchAll(/\{\s*done:\s*(true|false),\s*text:\s*'((?:[^'\\]|\\.)*)'\s*\}/g)]
        .map(([, done, text]) => `- [${done === 'true' ? 'x' : ' '}] ${text}`)
        .join('\n'),
    )
    .replace(/<ThemedImage[\s\S]*?alt="([^"]*)"[\s\S]*?\/>/g, (_, alt) => `*${alt}*`)
    .replace(/<Callout([^>]*)>([\s\S]*?)<\/Callout>/g, (_, attrs: string, inner: string) => {
      const title = attrs.match(/title="([^"]*)"/)?.[1];
      return (title ? `**${title}**\n\n` : '') + inner.trim();
    })
    .replace(/<[A-Z][A-Za-z]*\b[^>]*\/>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // Internal links point to the Markdown version of the page
  return siteUrl ? markdown.replace(/\]\(\/([^)#]*)\)/g, (_, path) => `](${absolute(siteUrl, `/${path}${path && !path.includes('.') ? '.md' : ''}`)})`) : markdown;
}

// How each certification is usually written
const certLabel: Record<string, string> = {
  CKS: 'CKS',
  CKA: 'CKA',
  SAA: 'AWS Solutions Architect – Associate',
  TFA: 'HashiCorp Terraform Associate',
};

const labels = {
  en: { problem: 'Problem', decision: 'Decision', result: 'Result', stack: 'Stack', links: 'Links', writeup: 'Full write-up' },
  fr: { problem: 'Problème', decision: 'Décision', result: 'Résultat', stack: 'Stack', links: 'Liens', writeup: 'Retex complet' },
};

export function projectMarkdown(project: CollectionEntry<'projects'>, lang: Lang, siteUrl: URL) {
  const { title, summary, facts, story, tags, links, status, post } = project.data;
  const l = labels[lang];
  const allLinks = [
    ...links,
    ...(post ? [{ label: l.writeup, href: localize(lang, `/blog/${post}.md`) }] : []),
  ];
  return markdownResponse(
    [
      `# ${title}${status === 'wip' ? (lang === 'fr' ? ' (en cours)' : ' (in progress)') : ''}`,
      `> ${summary}`,
      facts.map((fact) => `- ${fact}`).join('\n'),
      `**${l.problem}:** ${story.problem}\n\n**${l.decision}:** ${story.decision}\n\n**${l.result}:** ${story.result}`,
      `**${l.stack}:** ${tags.join(', ')}`,
      allLinks.length ? `**${l.links}:**\n${allLinks.map((link) => `- [${link.label}](${absolute(siteUrl, link.href)})`).join('\n')}` : '',
      mdxToMarkdown(project.body, siteUrl),
    ]
      .filter(Boolean)
      .join('\n\n'),
  );
}

export function postMarkdown(post: CollectionEntry<'blog'>, lang: Lang, siteUrl: URL) {
  const { title, excerpt, date, tags } = post.data;
  return markdownResponse(
    [`# ${title}`, `> ${excerpt}`, `${formatMonth(date, lang)} · ${tags.join(', ')}`, mdxToMarkdown(post.body, siteUrl)].join('\n\n'),
  );
}

export async function projectMarkdownPaths(lang: Lang) {
  return inLang(await getCollection('projects'), lang).map((project) => ({
    params: { slug: entrySlug(project.id) },
    props: { project },
  }));
}

export async function postMarkdownPaths(lang: Lang) {
  return inLang(await getCollection('blog'), lang).map((post) => ({ params: { slug: entrySlug(post.id) }, props: { post } }));
}

export async function llmsTxt(siteUrl: URL) {
  const url = (path: string) => absolute(siteUrl, path);
  const sorted = async (lang: Lang) => ({
    projects: inLang(await getCollection('projects'), lang).sort((a, b) => a.data.order - b.data.order),
    posts: inLang(await getCollection('blog'), lang).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf()),
  });
  const en = await sorted('en');
  const fr = await sorted('fr');
  const current = site.experience.find((item) => item.current);

  return [
    `# ${site.name}`,
    `> ${site.role}${current ? `, currently ${current.role.en} at ${current.company}` : ''}. Works on AWS, Terraform, Kubernetes and Kubernetes security. Certified ${site.certs.map((cert) => certLabel[cert.code] ?? cert.name).join(', ').replace(/, ([^,]*)$/, ' and $1')}.`,
    site.pitch.en,
    `Experience:\n${site.experience
      .map((item) => `- ${item.role.en}, ${item.company}, ${item.period.en}${item.details ? `. ${item.details.en}` : ''}`)
      .join('\n')}`,
    `Education:\n${site.education.map((item) => `- ${item.degree.en}, ${item.school}, ${item.period}`).join('\n')}`,
    `The site is in English at ${url('/')} and in French under ${url('/fr')}, with the same paths. Every project and post below is also available as Markdown at its URL plus \`.md\`.`,
    `## Projects\n${en.projects
      .map((project) => `- [${project.data.title}](${url(`/projects/${entrySlug(project.id)}.md`)}): ${project.data.summary}`)
      .join('\n')}`,
    `## Blog\n${en.posts
      .map((post) => `- [${post.data.title}](${url(`/blog/${entrySlug(post.id)}.md`)}): ${post.data.excerpt} (${formatMonth(post.data.date, 'en')})`)
      .join('\n')}`,
    `## Certifications\n${site.certs
      .map((cert) => `- [${cert.name}](${cert.verify}): ${cert.issuer}, ${cert.issued.en}, verifiable on Credly`)
      .join('\n')}`,
    `## Contact\n- [CV (PDF)](${url(site.cv)})\n- [GitHub](${site.github})\n- [LinkedIn](${site.linkedin})`,
    `## Optional\n${[
      `- [Version française](${url('/fr')}): same content in French`,
      ...fr.projects.map((project) => `- [${project.data.title} (FR)](${url(`/fr/projects/${entrySlug(project.id)}.md`)})`),
      ...fr.posts.map((post) => `- [${post.data.title}](${url(`/fr/blog/${entrySlug(post.id)}.md`)})`),
    ].join('\n')}`,
  ].join('\n\n');
}
