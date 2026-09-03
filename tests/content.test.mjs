// What the site is allowed to say. The old site shipped a fictional employer,
// a placeholder school and an address that did not exist; nothing like that
// can reach this one. Every number names its method, every project has a
// public repository, and every lens ranks its projects without a tie.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PLACEHOLDERS, RANKED, SITE } from '../src/lib/site.ts';

const ROOT = resolve('.');
const DIST = resolve('dist');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const projectFiles = readdirSync('src/content/projects').filter((f) => f.endsWith('.json'));
const projects = projectFiles.map((f) => ({ id: f.replace(/\.json$/, ''), ...JSON.parse(readFileSync(join('src/content/projects', f), 'utf8')) }));
const profile = JSON.parse(readFileSync('src/content/profile.json', 'utf8'));
const studies = readdirSync('src/content/case-studies').filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));

test('no placeholder from the old site appears in the source or the build', () => {
  const files = [
    ...walk('src').filter((f) => !f.endsWith('src/lib/site.ts')),
    ...walk(DIST).filter((f) => /\.(html|xml|txt|css|js)$/.test(f)),
    'README.md',
  ];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const word of PLACEHOLDERS) {
      assert.ok(!text.includes(word), `${file} contains "${word}"`);
    }
  }
});

test('no email address reaches the build', () => {
  for (const file of walk(DIST).filter((f) => /\.(html|xml|txt)$/.test(f))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /[\w.-]+@[\w.-]+\.(com|org|net|io|dev)\b/, `${file} contains an address`);
  }
});

test('every project has a repository under the author’s account, and is public or reachable', () => {
  for (const p of projects) {
    assert.match(p.repo, new RegExp(`^${SITE.github.replace(/\./g, '\\.')}/[\\w.-]+$`), `${p.id}: ${p.repo}`);
    assert.ok(['public', 'private', undefined].includes(p.visibility), `${p.id}: visibility ${p.visibility}`);
  }
});

test('no page links to a private repository, and every mention of one says so', () => {
  const pages = walk(DIST).filter((f) => f.endsWith('.html'));
  for (const p of projects.filter((x) => x.visibility === 'private')) {
    for (const file of pages) {
      const html = readFileSync(file, 'utf8');
      assert.ok(!html.includes(p.repo), `${file} mentions the private repo ${p.repo}`);
      if (html.includes(`>${p.name}<`)) assert.ok(html.includes('private repo'), `${file} names ${p.name} without marking it private`);
    }
  }
});

test('every number names the method that produced it', () => {
  for (const p of projects) {
    assert.ok(p.metrics.length >= 1, `${p.id} has no metrics`);
    for (const m of p.metrics) {
      assert.ok(Number.isInteger(m.value) && m.value >= 0, `${p.id}: ${m.label} is not a count`);
      assert.ok(typeof m.how === 'string' && m.how.length >= 12, `${p.id}: ${m.label} has no method`);
    }
    assert.match(p.verifiedOn, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('every lens ranks its projects without a tie', () => {
  for (const lens of RANKED) {
    const ranks = projects.filter((p) => p.lens[lens]).map((p) => p.lens[lens].rank);
    assert.ok(ranks.length >= 2, `lens ${lens} ranks fewer than two projects`);
    assert.equal(new Set(ranks).size, ranks.length, `lens ${lens} has tied ranks: ${ranks.join(', ')}`);
  }
  for (const p of projects) {
    assert.ok(Object.keys(p.lens).length >= 1, `${p.id} is in no lens`);
  }
});

test('every flagship has a case study, a social card, and images that exist', () => {
  for (const p of projects.filter((x) => x.tier === 'flagship')) {
    assert.ok(studies.includes(p.id), `${p.id} has no case study`);
    assert.ok(existsSync(join(DIST, 'projects', p.id, 'index.html')), `${p.id}: case study not built`);
    assert.ok(existsSync(join(DIST, 'og', `${p.id}.png`)), `${p.id}: no social card`);
    for (const img of p.images ?? []) {
      assert.ok(existsSync(join('public/projects', p.id, img.file)), `${p.id}: image ${img.file} missing`);
    }
  }
  for (const s of studies) assert.ok(projects.some((p) => p.id === s), `case study ${s} names no project`);
});

test('every ranked element in the build says which lenses it is in', () => {
  for (const file of walk(DIST).filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8');
    for (const [tag] of html.matchAll(/<[a-z]+\b[^>]*class="[^"]*\blensed\b[^"]*"[^>]*>/g)) {
      assert.match(tag, /\sdata-lens="[^"]*"/, `${file}: a lensed element without data-lens: ${tag.slice(0, 80)}`);
      assert.match(tag, /--o-(swe|data|ml):\d+/, `${file}: a lensed element without an order: ${tag.slice(0, 80)}`);
    }
  }
});

test('every GitHub link in the build points at something the content declares', () => {
  const declared = new Set([SITE.github, SITE.source, profile.links.github]);
  for (const p of projects) {
    if (p.visibility !== 'private') declared.add(p.repo);
    for (const m of p.metrics) if (m.href) declared.add(m.href);
    for (const c of p.channels ?? []) declared.add(c.href);
  }
  const ok = (href) => [...declared].some((d) => href === d || href.startsWith(`${d}/`) || href.startsWith(`${d}#`));
  for (const file of walk(DIST).filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8');
    for (const [, href] of html.matchAll(/href="(https:\/\/github\.com\/SophanaSok[^"]*)"/g)) {
      assert.ok(ok(href), `${file} links to ${href}, which no content record declares`);
    }
  }
});

test('the profile states only what was agreed', () => {
  assert.equal(profile.name, SITE.name);
  assert.ok(profile.description.length >= 50 && profile.description.length <= 160);
  assert.deepEqual(Object.keys(profile.links).sort(), ['github', 'linkedin']);
  assert.ok(!('email' in profile), 'the profile carries an email');
  assert.match(profile.now, /Data Specialist/);
  assert.match(profile.now, /WGU/);
  assert.ok(!/GPA|Inc\.|LLC/.test(JSON.stringify(profile)), 'the profile names a grade or an employer');
});

test('no version literal is pinned outside the content records', () => {
  const files = [...walk('src').filter((f) => !f.includes('/content/')), ...walk('tests'), 'astro.config.mjs'];
  for (const file of files) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        for (const word of line.split(/[^0-9.]/)) {
          assert.ok(!/^\d+\.\d+\.\d+$/.test(word), `${file}:${i + 1} pins a version, ${word}`);
        }
      });
  }
  assert.ok(ROOT);
});
