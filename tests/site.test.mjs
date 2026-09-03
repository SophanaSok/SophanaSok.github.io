// What the built site says about itself, and whether it can be trusted.
// Run as `npm run check` after `npm run build`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { assetSize } from '../src/lib/text.ts';
import { PAGES } from '../src/lib/pages.ts';
import { SITE } from '../src/lib/site.ts';

const DIST = resolve('dist');
const { default: config } = await import('../astro.config.mjs');
const BASE = (config.base ?? '/').replace(/\/$/, '');

export function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

/** Every built page, and the path it is served at. */
export function builtPages() {
  return walk(DIST)
    .filter((f) => f.endsWith('.html'))
    .map((file) => {
      const rel = file.slice(DIST.length + 1);
      const path = rel === '404.html' ? null : `${BASE}/${rel.replace(/(^|\/)index\.html$/, '$1')}`;
      return { file, rel, path, html: readFileSync(file, 'utf8') };
    });
}

const decode = (text) =>
  text.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e]);
const meta = (html, name) => html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1];
const property = (html, name) => html.match(new RegExp(`<meta property="${name}" content="([^"]*)"`))?.[1];

test('the build ran', () => {
  assert.ok(existsSync(join(DIST, 'index.html')), 'dist/index.html missing: run `npm run build` first');
  assert.ok(builtPages().length >= PAGES.length + 4, 'fewer pages than the two fixed ones plus four case studies');
});

test('every internal link in dist resolves', () => {
  const pages = builtPages();
  const ids = new Map(pages.map((p) => [p.file, new Set([...p.html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]))]));
  let checked = 0;
  for (const { file, html } of pages) {
    for (const [, , url] of html.matchAll(/(href|src)="([^"]+)"/g)) {
      if (/^(https?:|data:)/.test(url)) continue;
      const [path, fragment] = url.split('#');
      let target = file;
      if (path) {
        assert.ok(path === BASE || path.startsWith(`${BASE}/`), `${file}: ${url} lacks the base prefix`);
        const rel = path.slice(BASE.length).replace(/^\//, '');
        const candidates = [join(DIST, rel), join(DIST, rel, 'index.html'), `${join(DIST, rel)}.html`];
        target = candidates.find((c) => existsSync(c) && statSync(c).isFile());
        assert.ok(target, `${file}: ${url} points at nothing in dist`);
      }
      if (fragment && target.endsWith('.html')) {
        assert.ok(ids.get(target)?.has(fragment), `${file}: ${url} names an anchor that is not on the page`);
      }
      checked += 1;
    }
  }
  assert.ok(checked > 30, `only ${checked} internal links found; the crawl is not seeing the site`);
});

test('every indexed page describes itself, and no two the same', () => {
  const seen = new Map();
  for (const { rel, path, html } of builtPages()) {
    if (!path) {
      assert.equal(meta(html, 'description'), undefined, `${rel} is not indexed but still describes itself`);
      continue;
    }
    const description = meta(html, 'description');
    assert.ok(description, `${rel} has no meta description`);
    const text = decode(description);
    assert.ok(text.length >= 50 && text.length <= 160, `${rel}: description is ${text.length} characters: ${text}`);
    assert.ok(!seen.has(text), `${rel} and ${seen.get(text)} ship the same description`);
    seen.set(text, rel);
  }
});

test('every page title is its own and names the author', () => {
  const seen = new Map();
  for (const { rel, html } of builtPages()) {
    const title = decode(html.match(/<title>([^<]*)<\/title>/)[1]);
    assert.ok(title.includes(SITE.name), `${rel}: "${title}" does not name ${SITE.name}`);
    assert.ok(title.length <= 90, `${rel}: title is ${title.length} characters`);
    assert.ok(!seen.has(title), `${rel} and ${seen.get(title)} ship the same title`);
    seen.set(title, rel);
  }
});

test('every indexed page points its canonical at itself, and only those do', () => {
  for (const { rel, path, html } of builtPages()) {
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (!path) {
      assert.equal(canonical, undefined, `${rel} claims a URL it does not have`);
      assert.match(meta(html, 'robots') ?? '', /noindex/, `${rel} is reachable at no URL but is not noindex`);
      continue;
    }
    assert.ok(canonical, `${rel} has no canonical`);
    assert.equal(new URL(canonical).pathname, path, `${rel}: canonical points elsewhere`);
    assert.equal(meta(html, 'robots'), undefined, `${rel} is indexed but carries a robots directive`);
  }
});

test('every page is one document: lang, one h1, sized images with alt text', () => {
  for (const { rel, html } of builtPages()) {
    assert.match(html, /^<!DOCTYPE html><html lang="en">/i, `${rel} does not open with lang="en"`);
    const h1s = [...html.matchAll(/<h1[\s>]/g)].length;
    assert.equal(h1s, 1, `${rel} has ${h1s} h1 elements`);
    for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
      assert.match(tag, /\salt="[^"]+"/, `${rel}: image without alt text: ${tag.slice(0, 80)}`);
      assert.match(tag, /\swidth="\d+"/, `${rel}: image without width: ${tag.slice(0, 80)}`);
      assert.match(tag, /\sheight="\d+"/, `${rel}: image without height: ${tag.slice(0, 80)}`);
    }
  }
});

/* ---- Structured data ----------------------------------------------------- */

test('every indexed page states itself in machine-readable form, without an address', () => {
  for (const { rel, path, html } of builtPages()) {
    const found = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!path) {
      assert.equal(found, null, `${rel} is not indexed but ships structured data`);
      continue;
    }
    assert.ok(found, `${rel}: no JSON-LD`);
    assert.ok(!found[1].includes('</script'), `${rel}: the JSON-LD is not escaped against ending its own element`);
    const graph = JSON.parse(found[1])['@graph'];
    const person = graph.find((node) => node['@type'] === 'Person');
    assert.equal(person.name, SITE.name);
    assert.ok(person.sameAs.includes(SITE.github), `${rel}: the Person does not point at GitHub`);
    assert.doesNotMatch(JSON.stringify(graph), /[\w.-]+@[\w.-]+\.\w+/, `${rel}: an address reached the page`);
    assert.doesNotMatch(JSON.stringify(graph), /aggregateRating|"review"/, `${rel}: invented rating fields`);
  }
});

/* ---- The files a crawler asks for ---------------------------------------- */

test('the sitemap lists every indexed page, and only pages', () => {
  const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname).sort();
  const built = builtPages()
    .map((p) => p.path)
    .filter(Boolean)
    .sort();
  assert.deepEqual(listed, built, 'the sitemap and the built pages disagree');
  assert.ok(!xml.includes('/404'), 'the sitemap lists the 404 page');
  for (const [, lastmod] of xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) assert.match(lastmod, /^\d{4}-\d{2}-\d{2}$/);
});

test('robots.txt names a sitemap that is there', () => {
  const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
  const sitemap = robots.match(/^Sitemap: (\S+)$/m);
  assert.ok(sitemap, 'robots.txt names no sitemap');
  assert.equal(new URL(sitemap[1]).pathname, `${BASE}/sitemap.xml`);
  assert.ok(existsSync(join(DIST, 'sitemap.xml')));
});

/* ---- Social cards ---------------------------------------------------------- */

test('every page offers a social card that exists at the size it claims', () => {
  for (const { rel, html } of builtPages()) {
    const image = property(html, 'og:image');
    assert.ok(image, `${rel} has no og:image`);
    const path = new URL(image).pathname;
    const file = join(DIST, path.slice(BASE.length));
    assert.ok(existsSync(file), `${rel}: ${path} is not in dist`);
    assert.deepEqual(assetSize(DIST, path.slice(BASE.length)), { width: 1200, height: 630 }, `${rel}: ${path} is the wrong size`);
    assert.equal(property(html, 'og:image:width'), '1200');
    assert.equal(property(html, 'og:image:height'), '630');
    assert.ok(property(html, 'og:image:alt'), `${rel} does not describe its social image`);
    assert.ok(statSync(file).size > 5000, `${rel}: ${path} is suspiciously small; did the text render?`);
  }
});

/* ---- Nothing leaves the origin ------------------------------------------------ */

test('no page loads anything from anywhere but this origin, and every script is hashed', () => {
  for (const { rel, html } of builtPages()) {
    for (const [tag] of html.matchAll(/<(?:script|link|img|iframe|object|embed)\b[^>]*>/g)) {
      const src = tag.match(/\s(?:src|href)="([^"]+)"/)?.[1];
      if (!src || tag.startsWith('<link') && /rel="(canonical|alternate)"/.test(tag)) continue;
      assert.ok(!/^(https?:)?\/\//.test(src), `${rel} loads from another origin: ${tag.slice(0, 100)}`);
    }
    assert.ok(!/<iframe|<object|<embed/.test(html), `${rel} embeds foreign content`);
    assert.ok(!/\son[a-z]+="/i.test(html), `${rel} has an inline event handler`);

    const csp = decode(html.match(/<meta http-equiv="content-security-policy" content="([^"]*)"/)?.[1] ?? '');
    assert.ok(csp, `${rel} ships no Content Security Policy`);
    const hashes = new Set([...csp.matchAll(/'sha256-([^']+)'/g)].map((m) => m[1]));
    for (const [, body] of html.matchAll(/<script(?![^>]*type="application\/ld\+json")(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      const hash = createHash('sha256').update(body).digest('base64');
      assert.ok(hashes.has(hash), `${rel}: an inline script is not in the policy: ${body.slice(0, 60)}…`);
    }
  }
});

test('the fonts the stylesheet names are in dist', () => {
  const css = walk(join(DIST, '_astro'))
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
  const fonts = [...css.matchAll(/url\(["']?(\/fonts\/[^"')]+)["']?\)/g)].map((m) => m[1]);
  assert.ok(fonts.length >= 3, `only ${fonts.length} font files referenced`);
  for (const f of new Set(fonts)) assert.ok(existsSync(join(DIST, f)), `${f} is referenced but not in dist`);
});
