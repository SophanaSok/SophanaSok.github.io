import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

/* What the site is allowed to say, and in what shape.
 *
 * Every number on the page comes from a `metric`, and every metric names the
 * method that produced it. A project without a public repository or a live
 * URL cannot be entered at all: `repo` is required. */

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const lensEntry = z.object({ rank: z.number().int().min(1), angle: z.string().max(200) });

const metric = z.object({
  /** "tests", "lines", "commits", "releases", "sources" */
  label: z.string(),
  value: z.number().int().nonnegative(),
  /** The command or method that produced the value. */
  how: z.string().min(12),
  /** Where the value can be recounted, when a page exists for it. */
  href: z.url().optional(),
});

const channel = z.object({
  name: z.string(),
  kind: z.enum(['registry', 'tap', 'bucket', 'release-asset', 'live', 'pending']),
  href: z.url(),
});

const image = z.object({
  /** Under `public/projects/<slug>/`. */
  file: z.string(),
  alt: z.string().min(20),
  label: z.string().optional(),
});

const projects = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/projects' }),
  schema: z.object({
    name: z.string(),
    tagline: z.string().max(120),
    summary: z.string().min(80),
    tier: z.enum(['flagship', 'secondary']),
    language: z.string(),
    stack: z.array(z.string()).min(1),
    version: z.string().optional(),
    verifiedOn: date,
    repo: z.url(),
    /** Private repositories are marked and never linked. */
    visibility: z.enum(['public', 'private']).default('public'),
    live: z.url().optional(),
    site: z.url().optional(),
    license: z.string().optional(),
    /** The first metric is the headline the hero and the cards lead with. */
    metrics: z.array(metric).min(1),
    channels: z.array(channel).default([]),
    /** Lower rank sorts first under that lens; the sentence is what the lens says about it. */
    lens: z.object({ swe: lensEntry.optional(), data: lensEntry.optional(), ml: lensEntry.optional() }),
    highlights: z.array(z.string()).min(2).max(6),
    images: z.array(image).default([]),
  }),
});

const caseStudies = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/case-studies' }),
  schema: z.object({
    /** The project id this page is about; must exist in `projects`. */
    project: z.string(),
    description: z.string().min(50).max(160),
    updated: date,
  }),
});


export const collections = { projects, caseStudies };
