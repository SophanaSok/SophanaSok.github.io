// Nothing to keep out. The line that earns this file is the one naming the
// sitemap, and only a crawler at the origin root reads it, which is why the
// site sits at the account's root rather than under a project path.

import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const prefix = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const sitemap = new URL(`${prefix}sitemap.xml`, site!);
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap.href}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
