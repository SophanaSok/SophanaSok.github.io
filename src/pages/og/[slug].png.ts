// One social card per page, rendered at build time from the same records the
// page is. `home` and `projects` are the two fixed pages; every case study
// gets its own, named by its slug.

import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { renderCard, wrap, type Card } from '../../lib/og';
import { compact, formatNumber } from '../../lib/format';
import { SITE } from '../../lib/site';
import profile from '../../content/profile.json';

const FOOT = 'sophanasok.github.io';

export async function getStaticPaths() {
  const all = await getCollection('projects');
  const flagships = all
    .filter((p) => p.data.tier === 'flagship')
    .sort((a, b) => (a.data.lens.swe?.rank ?? 99) - (b.data.lens.swe?.rank ?? 99));
  const studies = await getCollection('caseStudies');

  const home: Card = {
    kicker: 'PORTFOLIO',
    title: SITE.name,
    lines: wrap(profile.roles.all.replace(/^\w/, (c) => c.toUpperCase()), 52, 2),
    tiles: flagships.map((p) => [formatNumber(p.data.metrics[0].value), `${p.data.name} · ${p.data.metrics[0].label}`]),
    footer: `${FOOT} · ${profile.now}`,
  };

  const projects: Card = {
    kicker: 'PROJECTS',
    title: `${all.length} public projects`,
    lines: wrap('Rust, TypeScript, Python, C++ and Lua. Every number names the command that counted it.', 52, 2),
    tiles: flagships.map((p) => [p.data.language, p.data.name]),
    footer: `${FOOT}/projects/`,
  };

  const perStudy = await Promise.all(
    studies.map(async (s) => {
      const p = (await getEntry('projects', s.data.project))!;
      const tiles: [string, string][] = p.data.metrics.slice(0, 4).map((m) => [
        m.label.startsWith('lines') ? compact(m.value) : formatNumber(m.value),
        m.label,
      ]);
      const card: Card = {
        kicker: 'CASE STUDY',
        title: p.data.name,
        lines: wrap(p.data.tagline, 52, 3),
        tiles,
        footer: `${FOOT}/projects/${s.id}/ · ${p.data.language}${p.data.version ? ` v${p.data.version}` : ''}`,
      };
      return { params: { slug: s.id }, props: { card } };
    }),
  );

  return [
    { params: { slug: 'home' }, props: { card: home } },
    { params: { slug: 'projects' }, props: { card: projects } },
    ...perStudy,
  ];
}

export const GET: APIRoute = async ({ props }) => {
  const png = await renderCard(props.card as Card);
  return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png' } });
};
