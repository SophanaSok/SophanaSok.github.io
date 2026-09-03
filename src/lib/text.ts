// Small text and file helpers shared by the build and the tests.
//
// Erasable TypeScript: imported by `.mjs` tests under Node's type stripping.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function xmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Clamp a sentence to a length, closing on a word and adding an ellipsis. */
export function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${cut.slice(0, at > max / 2 ? at : cut.length).replace(/[,;:]$/, '')}…`;
}

/** Markdown to one line of plain text: no links, code marks, emphasis or headings. */
export function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The intrinsic size of a PNG or SVG on disk, read from its header. */
export function assetSize(dir: string, file: string): { width: number; height: number } {
  const buf = readFileSync(join(dir, file));
  if (buf.subarray(1, 4).toString() === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  const svg = buf.toString('utf8');
  const width = svg.match(/<svg[^>]*\swidth="([\d.]+)"/)?.[1];
  const height = svg.match(/<svg[^>]*\sheight="([\d.]+)"/)?.[1];
  if (width && height) return { width: Number(width), height: Number(height) };
  const box = svg.match(/viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/);
  if (box) return { width: Number(box[1]), height: Number(box[2]) };
  throw new Error(`${file}: not a PNG or a sized SVG`);
}
