// The palette, held to WCAG AA in both polarities, and the motion rule that
// keeps every animation on the page optional.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrast, tokensIn } from '../src/lib/contrast.ts';

const css = readFileSync('src/styles/tokens.css', 'utf8');

const BLOCKS = {
  'light (system)': ':root {',
  'dark (system)': ":root:not([data-theme='light'])",
  'light (chosen)': ":root[data-theme='light']",
  'dark (chosen)': ":root[data-theme='dark']",
};

for (const [name, selector] of Object.entries(BLOCKS)) {
  test(`${name}: text on ground reaches 4.5:1`, () => {
    const t = tokensIn(css, selector);
    for (const ink of ['fg', 'muted', 'accent']) {
      for (const ground of ['bg', 'surface', 'surface-2']) {
        const ratio = contrast(t[ink], t[ground]);
        assert.ok(ratio >= 4.5, `--${ink} on --${ground} is ${ratio.toFixed(2)}:1 (${t[ink]} on ${t[ground]})`);
      }
    }
    // The badge: accent ink on an accent ground.
    const badge = contrast(t['accent-ink'], t.accent);
    assert.ok(badge >= 4.5, `--accent-ink on --accent is ${badge.toFixed(2)}:1`);
  });
}

test('the chosen palettes are the system palettes', () => {
  const light = tokensIn(css, ':root {');
  const lightChosen = tokensIn(css, ":root[data-theme='light']");
  const dark = tokensIn(css, ":root:not([data-theme='light'])");
  const darkChosen = tokensIn(css, ":root[data-theme='dark']");
  assert.deepEqual(lightChosen, light, 'the light toggle and the light system palette differ');
  assert.deepEqual(darkChosen, dark, 'the dark toggle and the dark system palette differ');
});

test('motion is optional', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation-duration: 0\.01ms !important/);
});
