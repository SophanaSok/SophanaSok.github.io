// The site's own routes, in the order the header lists them.
//
// One table, so the nav, the sitemap and the tests cannot drift apart. Case
// studies are not here: they are enumerated from the content collection by
// the sitemap and the tests alike. Erasable TypeScript, like `site.ts`.

export interface Page {
  /** Path under the site root, without `base`, e.g. `projects/`. */
  path: string;
  label: string;
  /** Shown in the header. Every page here is in the sitemap either way. */
  nav: boolean;
  /** The OG card's slug under `/og/`. */
  og: string;
}

export const PAGES: Page[] = [
  { path: '', label: 'Home', nav: false, og: 'home' },
  { path: 'projects/', label: 'Projects', nav: true, og: 'projects' },
];
