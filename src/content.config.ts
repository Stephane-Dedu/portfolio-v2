import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    status: z.enum(['live', 'wip']).default('live'),
    // Where it runs: a lab, real users, or a side project for friends
    scope: z.enum(['lab', 'prod', 'side']),
    year: z.number(),
    order: z.number(),
    featured: z.boolean().default(false),
    // Two or three verifiable facts shown on the card
    facts: z.array(z.string()).max(3),
    tags: z.array(z.string()),
    links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    post: z.string().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()),
  }),
});

export const collections = { projects, blog };
