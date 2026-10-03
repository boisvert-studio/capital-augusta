// Upsert seed data into the CMS, matched by key (`code` field where the collection has one,
// otherwise the item name). Existing items are updated with the seed's fields only; nothing is
// deleted. Items are staged (not draft): they go live with the next site publish.
// The seed file is client data and lives outside this public repo.
// node cms/seed.mjs <path/to/seed.json> [--dry]
//
// Archive state (Q12): a unit is created archived or not exactly as the seed says (`isArchived`
// per row). On update the archive state is NEVER sent: after launch the client owns it (rented =
// archive, free again = unarchive), so a re-run must not republish a rented unit or hide a free one.
//
// Images: seed rows carry `{ path, url?, alt }`. Only images with a `url` are sent (Webflow fetches
// it); rows that only have a local `path` are skipped until the photos are uploaded, and an empty
// list never overwrites a gallery already in place.
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
const tally = {};    // collection slug → { new, update }
let skippedImages = 0;

async function prepare(slug) {
  const full = await api('GET', `/collections/${cols[slug].id}`);
  options[slug] = Object.fromEntries(full.fields.filter((f) => f.type === 'Option')
    .map((f) => [f.slug, Object.fromEntries(f.validations.options.map((o) => [o.name, o.id]))]));
  return Object.fromEntries((await allItems(cols[slug].id))
    .map((it) => [it.fieldData.code ?? it.fieldData.name, it]));
}

// Drop empty values so a missing seed value never blanks a field (or trips the API's validation).
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) =>
  v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)));

async function upsert(slug, rows, keyOf, toFields) {
  const existing = await prepare(slug);
  ref[slug] = {};
  tally[slug] = { new: 0, update: 0 };
  for (const row of rows ?? []) {
    const key = keyOf(row);
    const fieldData = clean({ ...toFields(row), name: row.name, slug: slugify(row.slug ?? row.name) });
    const found = existing[row.code ?? row.name];
    tally[slug][found ? 'update' : 'new']++;
    if (DRY) { console.log(found ? '~' : '+', slug, key); ref[slug][key] = `<${key}>`; continue; }
    const item = found
      // Update: fieldData only. No isArchived here, on purpose (see the header).
      ? await api('PATCH', `/collections/${cols[slug].id}/items/${found.id}`, { fieldData })
      // Create: archive state as the seed gives it (units: occupied archived, Q12); default live.
      : await api('POST', `/collections/${cols[slug].id}/items`, { isArchived: row.isArchived ?? false, isDraft: false, fieldData });
    console.log(found ? '~' : '+', slug, key);
    ref[slug][key] = item.id;
  }
}

const opt = (slug, field, name) => options[slug][field]?.[name];
const ids = (slug, keys) => (keys ?? []).map((k) => ref[slug][k]).filter(Boolean);
const img = (x) => (x?.url ? { url: x.url, alt: x.alt } : (x?.path && skippedImages++, undefined));
const imgs = (list) => (list ?? []).map(img).filter(Boolean);

await upsert('commodites', seed.commodites, (r) => r.key, (r) => ({
  icone: r.icone, categorie: opt('commodites', 'categorie', r.categorie) }));
await upsert('equipe', seed.equipe, (r) => r.key, (r) => ({ role: r.role, courriel: r.courriel }));
await upsert('conciergerie', seed.conciergerie, (r) => r.key, (r) => ({ telephone: r.telephone }));
await upsert('promotions', seed.promotions, (r) => r.key, (r) => ({
  texte: r.texte, lien: r.lien || undefined, active: r.active, portee: opt('promotions', 'portee', r.portee) }));
await upsert('immeuble', seed.immeubles, (r) => r.code, (r) => {
  const f = {
    code: r.code, secteur: opt('immeuble', 'secteur', r.secteur), latitude: r.latitude, longitude: r.longitude,
    'nombre-de-logements': r['nombre-de-logements'], 'loyer-a-partir-de': r['loyer-a-partir-de'],
    inclus: ids('commodites', r.inclus), 'en-option-payant': ids('commodites', r['en-option']),
    gestionnaire: ref.equipe[r.gestionnaire], concierge: ref.conciergerie[r.concierge],
    'concierge-a-venir': r['concierge-a-venir'], promotion: ref.promotions[r.promotion],
    galerie: imgs(r.galerie), 'lignes-d-autobus': r['lignes-autobus'],
    'titre-seo': r['titre-seo'], 'description-seo': r['description-seo'],
  };
  (r.metro ?? []).forEach((m, i) => Object.assign(f, {
    [`metro-${i + 1}----station`]: m.station, [`metro-${i + 1}----minutes-a-pied`]: m.minutes, [`metro-${i + 1}----metres`]: m.metres }));
  return f;
});
await upsert('types-de-logement', seed.types, (r) => r.key, (r) => ({
  immeuble: ref.immeuble[r.immeuble], type: opt('types-de-logement', 'type', r.type), designation: r.designation,
  'superficie-min-pi2': r['superficie-min'], 'superficie-max-pi2': r['superficie-max'],
  'loyer-a-partir-de': r['loyer-a-partir-de'], plan: img(typeof r.plan === 'string' ? { url: r.plan, alt: r.name } : r.plan),
  photos: imgs(r.photos) }));

// Immeubles → Types offerts (plan §2): a forward reference, so it can only be written once the
// types exist. A second, fields-only pass over the buildings.
tally['immeuble · types-offerts'] = { new: 0, update: 0 };
for (const r of seed.immeubles ?? []) {
  const types = ids('types-de-logement', r['types-offerts']);
  if (!types.length) continue;
  tally['immeuble · types-offerts'].update++;
  if (DRY) { console.log('~', 'immeuble', r.code, `types-offerts (${types.length})`); continue; }
  await api('PATCH', `/collections/${cols.immeuble.id}/items/${ref.immeuble[r.code]}`, { fieldData: { 'types-offerts': types } });
  console.log('~', 'immeuble', r.code, `types-offerts (${types.length})`);
}

await upsert('logement', seed.logements, (r) => r.code, (r) => ({
  code: r.code, immeuble: ref.immeuble[r.immeuble], 'type-de-logement': ref['types-de-logement'][r.type],
  numero: r.numero, etage: r.etage, 'etage-affiche': r['etage-affiche'], loyer: r.loyer,
  'disponible-le': r['disponible-le'], 'superficie-pi2': r.superficie }));
await upsert('local-commercial', seed['immeubles-commerciaux'], (r) => r.key, (r) => ({
  immeuble: ref.immeuble[r.immeuble], 'nombre-de-locaux': r['nombre-de-locaux'] }));
await upsert('locaux-commerciaux', seed['locaux-commerciaux'], (r) => r.key, (r) => ({
  'immeuble-commercial': ref['local-commercial'][r['immeuble-commercial']], 'adresse-civique': r['adresse-civique'],
  secteur: opt('locaux-commerciaux', 'secteur', r.secteur), usage: opt('locaux-commerciaux', 'usage', r.usage),
  'superficie-pi2': r.superficie, etage: r.etage, 'loyer-pi2': r['loyer-pi2'],
  'frais-additionnels-pi2': r['frais-additionnels-pi2'], description: r.description, 'disponible-le': r['disponible-le'] }));

console.log('\ncollection                  new  update');
for (const [slug, t] of Object.entries(tally)) console.log(`${slug.padEnd(26)} ${String(t.new).padStart(4)} ${String(t.update).padStart(7)}`);
const archived = (seed.logements ?? []).filter((u) => u.isArchived).length;
console.log(`units in seed: ${archived} archived, ${(seed.logements ?? []).length - archived} live; applied on create only, existing units keep their state`);
if (skippedImages) console.log(`${skippedImages} images skipped: local path only, upload them first`);
console.log(DRY ? 'dry run, nothing written' : 'seed done');
