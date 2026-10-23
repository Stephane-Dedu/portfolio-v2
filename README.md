# sdedu.cloud v2

Personal site and blog of Stéphane Dedu (SRE). Astro 7, React islands, Tailwind 4, fully static for S3 + CloudFront.
English at `/`, French under `/fr`, same paths in both.

## Run it

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

Node 22.22+ (`.tool-versions` pins 24.21.0 for asdf).

## Fonts

| Use | Font | Source |
| --- | --- | --- |
| Titles | Eczar (Rosetta Type, OFL) | `@fontsource-variable/eczar` |
| Running text | Wremena Light (Temporary State, free) | `public/fonts/wremena/`, not in npm |
| Code, labels, terminal UI | JetBrains Mono | `@fontsource-variable/jetbrains-mono` |
| Experience, certifications | M PLUS Rounded 1c (latin subset) | `@fontsource/m-plus-rounded-1c` |

Wremena comes from [type.tmpstate.net](https://type.tmpstate.net/preview/Wremena) (free "order"). Put the WOFF2 files in
`public/fonts/wremena/` as `Wremena-Light.woff2`, `Wremena-Regular.woff2` and `Wremena-Bold.woff2`; the
`@font-face` rules are at the top of `src/styles/global.css`. Until they are there, text falls back to Iowan Old Style / Georgia.

## Where things are

```
src/
├── content/{projects,blog}/{en,fr}/   MDX, one file per language with the same slug
├── content.config.ts                  frontmatter schemas
├── i18n/ui.ts                         UI strings and locale helpers
├── lib/site.ts                        identity, experience, education, certifications
├── views/                             page bodies shared by / and /fr
├── pages/, pages/fr/                  thin routes
├── components/
│   ├── clouds/                        ASCII clouds behind the hero (sky/ by default, ?clouds=ascii or ?clouds=dither)
│   ├── lab/                           k9s simulator (cluster.ts is the scheduler) and globe
│   └── FissureScrolly.astro           architecture that builds itself on scroll
├── layouts/Base.astro                 head, header, footer, ⌘K palette
└── styles/global.css                  light/dark tokens, article typography
```

## Adding content

- **Project:** `src/content/projects/en/<slug>.mdx` and `fr/<slug>.mdx`. `facts` (3 max) show on the card, `featured: true` makes it the full-width card, `order` sorts the list.
- **Post:** same thing in `src/content/blog/{en,fr}/`.

## For LLMs

`/llms.txt` (format from [llmstxt.org](https://llmstxt.org)) is generated at build time from the same data as the site:
identity, experience, certifications, projects and posts. Every project and post also has a plain Markdown version at
its URL plus `.md` (`/projects/fissure.md`, `/fr/blog/cks.md`…). The code is in `src/lib/llms.ts`.

## Deploy

`.github/workflows/deploy.yml` builds, syncs `dist/` to S3 (hashed assets cached as immutable, HTML always revalidated) and invalidates CloudFront, with an AWS role assumed over OIDC. It is skipped until these repository variables exist: `AWS_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`.

## Still to do

- Globe regions are examples (`src/components/lab/Globe.tsx`).
- Demo code blocks in the Fissure write-up, flagged in the post itself.
- Reread the English project pages and posts (translations).
