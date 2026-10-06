// Dump the text fields of every CMS item in one locale, for the EN pass.
// Usage: node cms/dump-locale.mjs <cmsLocaleId> > out.json
import { api, SITE_ID } from './lib.mjs';
const loc = process.argv[2];
const { collections } = await api('GET', `/sites/${SITE_ID}/collections`);
const out = {};
for (const c of collections) {
  const { fields } = await api('GET', `/collections/${c.id}`);
  const text = fields.filter((f) => ['PlainText', 'RichText'].includes(f.type)).map((f) => ({ slug: f.slug, type: f.type, name: f.displayName }));
  const items = [];
  for (let offset = 0; ; offset += 100) {
    const r = await api('GET', `/collections/${c.id}/items?limit=100&offset=${offset}&cmsLocaleId=${loc}`);
    items.push(...r.items);
    if (offset + 100 >= r.pagination.total) break;
  }
  out[c.slug] = { id: c.id, fields: text, items: items.map((i) => ({ id: i.id, archived: i.isArchived, draft: i.isDraft, data: Object.fromEntries(text.map((f) => [f.slug, i.fieldData[f.slug] ?? null])) })) };
}
console.log(JSON.stringify(out, null, 1));
