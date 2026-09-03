// Number formatting the page and the OG cards share. Erasable TypeScript.

/** 27194 -> "27,194" */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** 27194 -> "27.2k", 532 -> "532" */
export function compact(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 10 ? Math.round(k) : k.toFixed(1)}k`;
}
