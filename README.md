# sophanasok.github.io

Sophana Sok's portfolio: shipped software, with numbers you can recount.

Built with [Astro](https://astro.build) as a static site with no runtime
dependencies, no trackers, no CDN, and a Content Security Policy that lets
nothing load from anywhere but its own origin. Deployed to GitHub Pages from
`.github/workflows/pages.yml`.

## What is on it

- A home page with a hero drawn in HTML and CSS from the project records, a
  proof ledger where every number names the command that produced it, and a
  **role lens** (SWE · Data · AI/ML) that re-ranks and re-words the page. The
  lens is CSS state on four radios; the only script mirrors it into the URL
  hash so `/#data` is a link you can send.
- One case study per flagship project, under `/projects/<slug>/`.
- A social card per page, rendered at build time from the same records.

## Content rules

Everything the site says is checked by `npm run check`:

- Every project has a repository under the author's account. A private one is
  marked `visibility: private`, rendered with a chip, and never linked. Nothing
  without a repository or a live URL appears.
- Every metric carries a `how`: the command that produced it, at the tag
  named. `npm run stats` recounts them from the sibling checkouts.
- No email address, no employer name, no placeholder text of any kind.
- Both palettes hold every text colour to WCAG AA on every ground.

Records live in `src/content/projects/*.json` and case studies in
`src/content/case-studies/*.md`; the schema is `src/content.config.ts`.

## Develop

```bash
npm ci
npm run dev        # http://localhost:4321/
npm run verify     # build, type-check, and run every test
npm run stats      # recount the metrics from ../../<project> checkouts
```

Node 22.12 or later. The fonts under `public/fonts/` are Instrument Serif and
JetBrains Mono, both under the SIL Open Font License, which sits beside them.

## Licence

MIT. See `LICENSE`.
