// Create the Q04 collections and fields. Idempotent: existing collections and fields are left
// alone, missing ones are added. Run with --dry to print the plan without writing.
// node cms/create-schema.mjs [--dry]
import { api, collectionsBySlug, SITE_ID } from './lib.mjs';
import { COLLECTIONS } from './schema.mjs';

const DRY = process.argv.includes('--dry');
const existing = await collectionsBySlug();
const ids = Object.fromEntries(Object.entries(existing).map(([slug, c]) => [slug, c.id]));

function toApiField(f) {
  const { ref, deferred, ...rest } = f;
  const field = { isRequired: false, ...rest };
  if (ref) {
    if (!ids[ref] && !DRY) throw new Error(`${f.slug}: referenced collection ${ref} not created yet`);
    field.metadata = { collectionId: ids[ref] ?? `<${ref}>` };
  }
  return field;
}

// Pass 1: create missing collections with their backward-pointing fields only.
for (const c of COLLECTIONS.filter((c) => !existing[c.slug])) {
  const fields = c.fields.filter((f) => !f.deferred);
  console.log(`+ collection ${c.slug} (${fields.length} fields)`);
  if (DRY) { ids[c.slug] = `<${c.slug}>`; continue; }
  const created = await api('POST', `/sites/${SITE_ID}/collections`, {
    displayName: c.displayName, singularName: c.singularName, slug: c.slug,
    fields: fields.map(toApiField),
  });
  ids[c.slug] = created.id;
}
// Pass 2: every collection now exists, so add whatever is still missing, deferred
// (forward-reference) fields included.
for (const c of COLLECTIONS) {
  if (DRY && !existing[c.slug]) {
    for (const f of c.fields.filter((f) => f.deferred)) console.log(`+ field ${c.slug}.${f.slug} (deferred)`);
    continue;
  }
  const full = await api('GET', `/collections/${ids[c.slug]}`);
  const have = new Set(full.fields.map((f) => f.slug));
  for (const f of c.fields.filter((f) => !have.has(f.slug))) {
    console.log(`+ field ${c.slug}.${f.slug}`);
    if (DRY) continue;
    const made = await api('POST', `/collections/${full.id}/fields`, toApiField(f));
    // Webflow derives the slug from the display name and ignores ours: flag a mismatch so
    // schema.mjs can be corrected, or the next run would try to add the field again.
    if (made.slug !== f.slug) console.warn(`  ! Webflow named it ${made.slug}, not ${f.slug}: fix schema.mjs`);
  }
}
console.log(DRY ? 'dry run, nothing written' : 'schema in place', ids);
