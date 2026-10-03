// Minimal Webflow Data API v2 client for the CMS scripts. Reads WEBFLOW_TOKEN from ../.env.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
try { process.loadEnvFile(path.join(here, '..', '.env')); } catch { /* fall back to the shell env */ }

export const SITE_ID = '6a68c798373d150ef0a68a90';
const BASE = 'https://api.webflow.com/v2';
const TOKEN = process.env.WEBFLOW_TOKEN;
if (!TOKEN) throw new Error('WEBFLOW_TOKEN missing: put it in capital-augusta/.env');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function api(method, url, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(BASE + url, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    // Site publish is limited to one per minute; other endpoints recover in a few seconds.
    if (res.status === 429) { await sleep(Math.max(Number(res.headers.get('retry-after')) || 0, url.endsWith('/publish') ? 20 : 2) * 1000); continue; }
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${text.slice(0, 400)}`);
    return json;
  }
  throw new Error(`${method} ${url} → still rate-limited after 5 tries`);
}

export async function collectionsBySlug() {
  const { collections } = await api('GET', `/sites/${SITE_ID}/collections`);
  return Object.fromEntries(collections.map((c) => [c.slug, c]));
}

export async function allItems(collectionId) {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    const { items, pagination } = await api('GET', `/collections/${collectionId}/items?limit=100&offset=${offset}`);
    out.push(...items);
    if (offset + 100 >= pagination.total) return out;
  }
}
