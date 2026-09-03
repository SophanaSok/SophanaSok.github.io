// The site's fixed facts, in one place.
//
// Erasable TypeScript: the tests import this file under Node's type stripping,
// so it holds interfaces and constants and nothing that compiles to code.

export const SITE = {
  name: 'Sophana Sok',
  handle: 'sophana.sok',
  github: 'https://github.com/SophanaSok',
  /** The repository this site is built from. */
  source: 'https://github.com/SophanaSok/SophanaSok.github.io',
} as const;

export type LensId = 'all' | 'swe' | 'data' | 'ml';

export interface Lens {
  id: LensId;
  /** The key that selects it, shown in the hero's footer. */
  key: string;
  label: string;
  /** How the contact line names the role. */
  role: string;
}

/** The four ways the page can be read, in the order the control lists them. */
export const LENSES: Lens[] = [
  { id: 'all', key: '0', label: 'All', role: 'Software, Data and AI/ML engineering' },
  { id: 'swe', key: '1', label: 'SWE', role: 'Software Engineering' },
  { id: 'data', key: '2', label: 'Data', role: 'Data Engineering' },
  { id: 'ml', key: '3', label: 'AI/ML', role: 'AI / ML Engineering' },
];

/** The lenses a project can rank itself under, i.e. every lens but `all`. */
export const RANKED: Exclude<LensId, 'all'>[] = ['swe', 'data', 'ml'];

/**
 * Strings the old site shipped as stand-ins for facts. None may appear in the
 * source or the build; `tests/content.test.mjs` greps for them.
 */
export const PLACEHOLDERS = [
  'TechCorp',
  'State University',
  'email.com',
  'example.com',
  'lorem',
  'TODO',
  'TBD',
  'mailto:',
] as const;
