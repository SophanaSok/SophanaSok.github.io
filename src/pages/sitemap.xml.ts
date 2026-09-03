// The site's own routes, for a crawler. An endpoint rather than a file in
// `public/`, because `<loc>` has to be absolute and only the build knows the
// origin. `PAGES` is the table the header is built from and the case studies
// come from the collection, so a page cannot be added and left out of this.

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { PAGES } from '../lib/pages';
import { xmlEscape } from '../lib/text';
import profile from '../content/profile.json';

export const GET: APIRoute = async ({ site }) => {
  const prefix = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const studies = await getCollection('caseStudies');
  const entries = [
    ...PAGES.map(({ path }) => ({ path, date: profile.verifiedOn })),
    ...studies.map((s) => ({ path: `projects/${s.id}/`, date: s.data.updated })),
  ];
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(
      ({ path, date }) =>
        `  <url><loc>${xmlEscape(new URL(`${prefix}${path}`, site!).href)}</loc><lastmod>${date}</lastmod></url>`,
    ),
    '</urlset>',
    '',
  ].join('\n');
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
