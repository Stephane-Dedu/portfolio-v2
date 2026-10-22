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
│   ├── clouds/                        ASCII clouds behind the hero (?clouds=dither for the WebGL version)
│   ├── lab/                           k9s simulator (cluster.ts is the scheduler) and globe
│   └── FissureScrolly.astro           architecture that builds itself on scroll
├── layouts/Base.astro                 head, header, footer, ⌘K palette
└── styles/global.css                  light/dark tokens, article typography
```

## Adding content

- **Project:** `src/content/projects/en/<slug>.mdx` and `fr/<slug>.mdx`. `facts` (3 max) show on the card, `featured: true` makes it the full-width card, `order` sorts the list.
- **Post:** same thing in `src/content/blog/{en,fr}/`.

## Deploy

`.github/workflows/deploy.yml` builds, syncs `dist/` to S3 (hashed assets cached as immutable, HTML always revalidated) and invalidates CloudFront, with an AWS role assumed over OIDC. It is skipped until these repository variables exist: `AWS_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`.

## Still to do

- Globe regions are examples (`src/components/lab/Globe.tsx`).
- Demo code blocks in the Fissure write-up, flagged in the post itself.
- Reread the English project pages and posts (translations).
