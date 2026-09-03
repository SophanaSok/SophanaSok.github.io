// The social card: a terminal frame drawn as SVG and rasterised at build time.
//
// Kept apart from the erasable helpers so `text.ts` stays importable under
// Node's type stripping without dragging a native module in behind it. The
// card is all monospace on purpose: the rasteriser draws with system fonts,
// and a monospace face is the one kind every runner has.

export const OG = { width: 1200, height: 630 } as const;

export interface Card {
  /** The block title on the frame's top border. */
  kicker: string;
  title: string;
  /** Up to three lines under the title. */
  lines: string[];
  /** Up to four `[value, label]` tiles. */
  tiles: [string, string][];
  footer: string;
}

const MONO = "'JetBrains Mono', 'JetBrainsMono Nerd Font', 'DejaVu Sans Mono', 'Liberation Mono', monospace";
const BG = '#0e0d0b';
const PANEL = '#16140f';
const LINE = '#3a342a';
const FG = '#ece7d8';
const MUTED = '#9a927f';
const ACCENT = '#ffb000';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Wrap on spaces to a column, at most `max` lines, the last one clamped. */
export function wrap(text: string, cols: number, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (line && `${line} ${w}`.length > cols) {
      lines.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  if (lines.length > max) {
    const kept = lines.slice(0, max);
    kept[max - 1] = `${kept[max - 1]!.slice(0, cols - 1).trimEnd()}…`;
    return kept;
  }
  return lines;
}

export function svgCard(card: Card): string {
  const { width, height } = OG;
  const pad = 56;
  const titleSize = card.title.length > 22 ? 56 : 72;
  const lineY = 250;
  const lines = card.lines.slice(0, 3);
  const tiles = card.tiles.slice(0, 4);
  const tileW = (width - pad * 2 - 24 * (tiles.length - 1)) / Math.max(tiles.length, 1);
  const tileY = 380;
  const tileH = 150;

  const tileSvg = tiles
    .map(([value, label], i) => {
      const x = pad + i * (tileW + 24);
      const cols = Math.floor((tileW - 44) / 12.6);
      const [l1, l2 = ''] = wrap(label.replace(' · ', ' \u00b7 '), cols, 2);
      return `
  <rect x="${x}" y="${tileY}" width="${tileW}" height="${tileH}" fill="${PANEL}" stroke="${LINE}" />
  <text x="${x + 22}" y="${tileY + 60}" font-family="${MONO}" font-size="44" font-weight="700" fill="${ACCENT}">${esc(value)}</text>
  <text x="${x + 22}" y="${tileY + 96}" font-family="${MONO}" font-size="21" fill="${MUTED}">${esc(l1 ?? '')}</text>
  <text x="${x + 22}" y="${tileY + 124}" font-family="${MONO}" font-size="21" fill="${MUTED}">${esc(l2)}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${BG}" />
  <rect x="${pad / 2}" y="${pad / 2}" width="${width - pad}" height="${height - pad}" fill="none" stroke="${LINE}" stroke-width="2" />
  <rect x="${pad}" y="${pad / 2 - 16}" width="${card.kicker.length * 15.5 + 24}" height="32" fill="${BG}" />
  <text x="${pad + 12}" y="${pad / 2 + 8}" font-family="${MONO}" font-size="24" font-weight="700" fill="${ACCENT}">${esc(card.kicker)}</text>
  <text x="${pad}" y="${170}" font-family="${MONO}" font-size="${titleSize}" font-weight="700" fill="${FG}">${esc(card.title)}<tspan fill="${ACCENT}">▮</tspan></text>
  ${lines
    .map(
      (l, i) =>
        `<text x="${pad}" y="${lineY + i * 40}" font-family="${MONO}" font-size="28" fill="${i === 0 ? FG : MUTED}">${esc(l)}</text>`,
    )
    .join('\n  ')}
  ${tileSvg}
  <text x="${pad}" y="${height - pad + 4}" font-family="${MONO}" font-size="22" fill="${MUTED}">${esc(card.footer)}</text>
</svg>`;
}

export async function renderCard(card: Card): Promise<Buffer> {
  const { default: sharp } = await import('sharp');
  return sharp(Buffer.from(svgCard(card)))
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}
