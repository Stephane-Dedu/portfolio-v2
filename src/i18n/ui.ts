export const languages = { en: 'English', fr: 'Français' } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'en';
export const otherLang = (lang: Lang): Lang => (lang === 'en' ? 'fr' : 'en');

export const ui = {
  en: {
    'meta.description': 'Stéphane Dedu, SRE: cloud infrastructure, Kubernetes and reliability. Projects, write-ups and certifications.',
    'skip': 'Skip to content',
    'nav.projects': 'projects',
    'nav.blog': 'blog',
    'nav.search': 'Open search (Cmd+K)',
    'nav.theme': 'Toggle light / dark theme',
    'nav.lang': 'Lire en français',
    'home.experience': 'experience',
    'home.certifications': 'certifications',
    'home.education': 'education',
    'story.problem': 'problem',
    'story.decision': 'decision',
    'story.result': 'result',
    'row.read': 'read the case study',
    'row.fig': 'architecture',
    'home.projects': 'Projects',
    'home.allProjects': 'all projects',
    'home.writing': 'Writing',
    'home.allPosts': 'all posts',
    'home.lab': 'Lab',
    'home.labIntro':
      'A small cluster simulated in the browser, driven the way you would with k9s: kill pods, drain nodes, watch the scheduler react.',
    'card.view': 'view project',
    'card.wip': 'in progress',
    'card.facts': 'At a glance',
    'card.tech': 'Technologies',
    'scope.lab': 'personal lab',
    'scope.prod': 'in production',
    'scope.side': 'side project',
    'project.back': '← projects',
    'project.stack': 'stack',
    'project.links': 'links',
    'project.live': 'live',
    'project.writeup': 'full write-up',
    'projects.title': 'Projects',
    'projects.count': 'projects',
    'projects.intro': 'What I have built, deployed, and sometimes broken before rebuilding it properly.',
    'projects.description': 'Cloud, infrastructure and Kubernetes projects by Stéphane Dedu.',
    'projects.filter': 'Filter by technology',
    'projects.all': 'all',
    'blog.title': 'Blog',
    'blog.count': 'posts',
    'blog.intro': 'Write-ups, certifications and instructive mistakes. Written to be read to the end.',
    'blog.description': 'Cloud, DevOps and certification write-ups.',
    'blog.read': 'read',
    'post.back': '← blog',
    'post.toc': 'contents',
    'post.tocLabel': 'Table of contents',
    'post.prev': '← previous',
    'post.next': 'next →',
    'post.others': 'More posts',
    'checklist.done': 'done',
    'checklist.doneSr': 'Done: ',
    'checklist.todoSr': 'To do: ',
    'palette.label': 'Quick navigation',
    'palette.placeholder': 'Search a project, a post, an action…',
    'palette.empty': 'Nothing found.',
    'palette.footer': '↑↓ navigate · ↵ open',
    'palette.pages': 'Pages',
    'palette.projects': 'Projects',
    'palette.posts': 'Posts',
    'palette.links': 'Links',
    'palette.actions': 'Actions',
    'palette.home': 'Home',
    'palette.cv': 'Download the CV',
    'palette.theme': 'Toggle light / dark theme',
    'palette.lang': 'Lire en français',
  },
  fr: {
    'meta.description': 'Stéphane Dedu, SRE : infra cloud, Kubernetes et fiabilité. Projets, retex et certifications.',
    'skip': 'Aller au contenu',
    'nav.projects': 'projets',
    'nav.blog': 'blog',
    'nav.search': 'Ouvrir la recherche (Cmd+K)',
    'nav.theme': 'Basculer le thème clair / sombre',
    'nav.lang': 'Read in English',
    'home.experience': 'expérience',
    'home.certifications': 'certifications',
    'home.education': 'formation',
    'story.problem': 'problème',
    'story.decision': 'décision',
    'story.result': 'résultat',
    'row.read': 'lire l’étude de cas',
    'row.fig': 'architecture',
    'home.projects': 'Projets',
    'home.allProjects': 'tous les projets',
    'home.writing': 'Écrits',
    'home.allPosts': 'tous les articles',
    'home.lab': 'Lab',
    'home.labIntro':
      'Un petit cluster simulé dans le navigateur, piloté comme avec k9s : tue des pods, draine des nodes, regarde le scheduler réagir.',
    'card.view': 'voir le projet',
    'card.wip': 'en cours',
    'card.facts': 'En bref',
    'card.tech': 'Technologies',
    'scope.lab': 'lab perso',
    'scope.prod': 'en prod',
    'scope.side': 'side project',
    'project.back': '← projets',
    'project.stack': 'stack',
    'project.links': 'liens',
    'project.live': 'en ligne',
    'project.writeup': 'retex complet',
    'projects.title': 'Projets',
    'projects.count': 'projets',
    'projects.intro': 'Ce que j’ai construit, déployé, et parfois cassé avant de le reconstruire proprement.',
    'projects.description': 'Projets cloud, infra et Kubernetes de Stéphane Dedu.',
    'projects.filter': 'Filtrer par technologie',
    'projects.all': 'tout',
    'blog.title': 'Blog',
    'blog.count': 'articles',
    'blog.intro': 'Retex, certifications et erreurs instructives. Écrit pour être lu jusqu’au bout.',
    'blog.description': 'Retours d’expérience cloud, DevOps et certifications.',
    'blog.read': 'de lecture',
    'post.back': '← blog',
    'post.toc': 'sommaire',
    'post.tocLabel': 'Sommaire',
    'post.prev': '← précédent',
    'post.next': 'suivant →',
    'post.others': 'Autres articles',
    'checklist.done': 'fait',
    'checklist.doneSr': 'Fait : ',
    'checklist.todoSr': 'À faire : ',
    'palette.label': 'Navigation rapide',
    'palette.placeholder': 'Chercher un projet, un article, une action…',
    'palette.empty': 'Rien trouvé.',
    'palette.footer': '↑↓ naviguer · ↵ ouvrir',
    'palette.pages': 'Pages',
    'palette.projects': 'Projets',
    'palette.posts': 'Articles',
    'palette.links': 'Liens',
    'palette.actions': 'Actions',
    'palette.home': 'Accueil',
    'palette.cv': 'Télécharger le CV',
    'palette.theme': 'Basculer le thème clair / sombre',
    'palette.lang': 'Read in English',
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type UIKey = keyof (typeof ui)['en'];
export const useTranslations = (lang: Lang) => (key: UIKey) => ui[lang][key];

/** '/projects' in a given language: unchanged in English, '/fr/projects' in French. */
export const localize = (lang: Lang, path: string) =>
  lang === defaultLang ? path : `/${lang}${path === '/' ? '' : path}`;

/** Drop the language prefix from a pathname: '/fr/blog/x' → '/blog/x'. */
export const unlocalize = (pathname: string) => pathname.replace(/^\/fr(?=\/|$)/, '') || '/';

// Content entries live in <collection>/<lang>/<slug>.mdx
export const entryLang = (id: string) => id.split('/')[0] as Lang;
export const entrySlug = (id: string) => id.split('/').slice(1).join('/');
export const inLang = <T extends { id: string }>(entries: T[], lang: Lang) =>
  entries.filter((entry) => entryLang(entry.id) === lang);

export const formatMonth = (date: Date, lang: Lang) =>
  new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' }).format(date);

export const readingTime = (body = '') => {
  const words = body.replace(/```[\s\S]*?```/g, '').split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min`;
};
