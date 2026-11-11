// Snapshot the site for later comparison: every CMS collection (staged and live, FR and EN)
// plus the visible text of every live page (FR and EN, from the sitemap).
// Usage: node cms/snapshot.mjs <out-dir>
// Compare two runs with: diff -ru <old-dir> <new-dir>
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { api, SITE_ID } from './lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('usage: node cms/snapshot.mjs <out-dir>');
const ORIGIN = 'https://www.augustacapital.ca';
const LOCALES = { fr: '6ac00c9b01ac17163d80e378', en: '6ac3efd19908edc4a6d426f2' };

const write = async (rel, data) => {
  const file = path.join(out, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
};

async function items(collectionId, state, cmsLocaleId) {
  const suffix = state === 'live' ? '/live' : '';
  const all = [];
  for (let offset = 0; ; offset += 100) {
    const { items, pagination } = await api('GET', `/collections/${collectionId}/items${suffix}?limit=100&offset=${offset}&cmsLocaleId=${cmsLocaleId}`);
    all.push(...items);
    if (offset + 100 >= pagination.total) break;
  }
  return all.sort((a, b) => a.id.localeCompare(b.id));
}

const summary = { takenAt: new Date().toISOString(), cms: {}, pages: {} };

// CMS
const { collections } = await api('GET', `/sites/${SITE_ID}/collections`);
for (const c of collections) {
  const schema = await api('GET', `/collections/${c.id}`);
  await write(`cms/_schema/${c.slug}.json`, schema);
  for (const state of ['staged', 'live']) {
    for (const [lang, loc] of Object.entries(LOCALES)) {
      const list = await items(c.id, state, loc);
      await write(`cms/${state}/${c.slug}.${lang}.json`, list);
      summary.cms[`${state}/${c.slug}.${lang}`] = list.length;
    }
  }
  console.log('cms', c.slug);
}

// Live pages: visible text only, so diffs show content changes and not asset hashes.
const text = (html) => html
  .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<(br|\/p|\/h[1-6]|\/li|\/div|\/section|\/tr|\/a)\b[^>]*>/gi, '$&\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n') + '\n';

const sitemap = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
const paths = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname))];
const all = [...new Set(paths.flatMap((p) => {
  const base = p.startsWith('/en/') || p === '/en' ? p.replace(/^\/en/, '') || '/' : p;
  return [base, base === '/' ? '/en' : `/en${base}`];
}))].sort();
for (const p of all) {
  const res = await fetch(ORIGIN + p, { redirect: 'manual' });
  const name = (p === '/' ? 'index' : p.slice(1).replace(/\//g, '__')) + '.txt';
  summary.pages[p] = res.status;
  if (res.status === 200) await write(`pages/${name}`, text(await res.text()));
}
console.log('pages', all.length);

await write('summary.json', summary);
