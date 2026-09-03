import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig } from 'astro/config';

// The one script that has to run before first paint, so the page does not
// flash the system theme at a reader who chose the other one. It is inlined
// verbatim by Base.astro, so its hash is computed from the same bytes here.
const boot = readFileSync(new URL('./src/lib/theme-boot.js', import.meta.url), 'utf8');
const bootHash = `sha256-${createHash('sha256').update(boot).digest('base64')}`;

export default defineConfig({
  // The account's own Pages site, served at the origin root. A domain of its
  // own is a change to `site` and a `public/CNAME`; every link goes through
  // `base`, so nothing else moves.
  site: 'https://sophanasok.github.io',
  base: '/',
  security: {
    // A policy in a <meta>, since Pages sets no headers. Astro hashes the
    // scripts and stylesheets it processes; styles also allow inline because
    // the lens ordering and the hero's stagger write style attributes.
    // Nothing is loaded from anywhere but this origin: fonts, images and
    // scripts are all files in this repository.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self'",
        "font-src 'self'",
        "connect-src 'none'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
      ],
      scriptDirective: { hashes: [bootHash] },
      styleDirective: { resources: ["'self'", "'unsafe-inline'"] },
    },
  },
  markdown: {
    // Both highlighter themes travel as custom properties and the stylesheet
    // picks one, so the explicit light/dark toggle works as well as the
    // system setting. `defaultColor: false` writes no inline colour.
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
});
