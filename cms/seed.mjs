// Upsert seed data into the CMS, matched by key (`code` field where the collection has one,
// otherwise the item name). Existing items are updated with the seed's fields only; nothing is
// deleted. Items are staged (not draft): they go live with the next site publish.
// The seed file is client data and lives outside this public repo.
// node cms/seed.mjs <path/to/seed.json> [--dry]
import fs from 'node:fs';
import { api, collectionsBySlug, allItems } from './lib.mjs';

const [file] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const DRY = process.argv.includes('--dry');
const seed = JSON.parse(fs.readFileSync(file, 'utf8'));
const cols = await collectionsBySlug();
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ref = {};      // seed key → Webflow item id, per collection slug
const options = {};  // collection slug → field slug → option name → option id

async function prepare(slug) {
  const full = await api('GET', `/collections/${cols[slug].id}`);
  options[slug] = Object.fromEntries(full.fields.filter((f) => f.type === 'Option')
    .map((f) => [f.slug, Object.fromEntries(f.validations.options.map((o) => [o.name, o.id]))]));
  return Object.fromEntries((await allItems(cols[slug].id))
    .map((it) => [it.fieldData.code ?? it.fieldData.name, it]));
}

async function upsert(slug, rows, keyOf, toFields) {
  const existing = await prepare(slug);
  ref[slug] = {};
  for (const row of rows) {
    const key = keyOf(row);
    const fieldData = { ...toFields(row), name: row.name, slug: slugify(row.slug ?? row.name) };
    const found = existing[row.code ?? row.name];
    if (DRY) { console.log(found ? '~' : '+', slug, key); ref[slug][key] = `<${key}>`; continue; }
    const item = found
      ? await api('PATCH', `/collections/${cols[slug].id}/items/${found.id}`, { fieldData })
      : await api('POST', `/collections/${cols[slug].id}/items`, { isArchived: false, isDraft: false, fieldData });
    console.log(found ? '~' : '+', slug, key);
    ref[slug][key] = item.id;
  }
}

const opt = (slug, field, name) => options[slug][field]?.[name];
const ids = (slug, keys) => (keys ?? []).map((k) => ref[slug][k]).filter(Boolean);

await upsert('commodites', seed.commodites, (r) => r.key, (r) => ({
  icone: r.icone, categorie: opt('commodites', 'categorie', r.categorie) }));
await upsert('equipe', seed.equipe, (r) => r.key, (r) => ({ role: r.role, courriel: r.courriel }));
await upsert('conciergerie', seed.conciergerie, (r) => r.key, (r) => ({ telephone: r.telephone }));
await upsert('promotions', seed.promotions, (r) => r.key, (r) => ({
  texte: r.texte, lien: r.lien || undefined, active: r.active, portee: opt('promotions', 'portee', r.portee) }));
await upsert('immeubles', seed.immeubles, (r) => r.code, (r) => {
  const f = {
    code: r.code, secteur: opt('immeubles', 'secteur', r.secteur), latitude: r.latitude, longitude: r.longitude,
    'nombre-de-logements': r['nombre-de-logements'], 'loyer-a-partir-de': r['loyer-a-partir-de'],
    inclus: ids('commodites', r.inclus), 'en-option-payant': ids('commodites', r['en-option']),
    gestionnaire: ref.equipe[r.gestionnaire], concierge: ref.conciergerie[r.concierge],
    'concierge-a-venir': r['concierge-a-venir'], promotion: ref.promotions[r.promotion],
    galerie: r.galerie, 'lignes-d-autobus': r['lignes-autobus'],
    'titre-seo': r['titre-seo'], 'description-seo': r['description-seo'],
  };
  r.metro.forEach((m, i) => Object.assign(f, {
    [`metro-${i + 1}----station`]: m.station, [`metro-${i + 1}----minutes-a-pied`]: m.minutes, [`metro-${i + 1}----metres`]: m.metres }));
  return f;
});
await upsert('types-de-logement', seed.types, (r) => r.key, (r) => ({
  immeuble: ref.immeubles[r.immeuble], type: opt('types-de-logement', 'type', r.type), designation: r.designation,
  'superficie-min-pi2': r['superficie-min'], 'superficie-max-pi2': r['superficie-max'],
  'loyer-a-partir-de': r['loyer-a-partir-de'], ...(r.plan ? { plan: { url: r.plan, alt: r.name } } : {}) }));
await upsert('logements', seed.logements, (r) => r.code, (r) => ({
  code: r.code, immeuble: ref.immeubles[r.immeuble], 'type-de-logement': ref['types-de-logement'][r.type],
  numero: r.numero, etage: r.etage, loyer: r.loyer, 'disponible-le': r['disponible-le'], 'superficie-pi2': r.superficie }));
console.log(DRY ? 'dry run, nothing written' : 'seed done');
