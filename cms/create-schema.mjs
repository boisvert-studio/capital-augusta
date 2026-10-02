// Create the Q04 collections and fields. Idempotent: existing collections and fields are left
// alone, missing ones are added. Run with --dry to print the plan without writing.
// node cms/create-schema.mjs [--dry]
import { api, collectionsBySlug, SITE_ID } from './lib.mjs';
import { COLLECTIONS } from './schema.mjs';

const DRY = process.argv.includes('--dry');
const existing = await collectionsBySlug();
const ids = Object.fromEntries(Object.entries(existing).map(([slug, c]) => [slug, c.id]));

function toApiField(f) {
  const { ref, ...rest } = f;
  const field = { isRequired: false, ...rest };
  if (ref) {
    if (!ids[ref] && !DRY) throw new Error(`${f.slug}: referenced collection ${ref} not created yet`);
    field.metadata = { collectionId: ids[ref] ?? `<${ref}>` };
  }
  return field;
}

for (const c of COLLECTIONS) {
  if (!existing[c.slug]) {
    console.log(`+ collection ${c.slug} (${c.fields.length} fields)`);
    if (DRY) { ids[c.slug] = `<${c.slug}>`; continue; }
    const created = await api('POST', `/sites/${SITE_ID}/collections`, {
      displayName: c.displayName, singularName: c.singularName, slug: c.slug,
      fields: c.fields.map(toApiField),
    });
    ids[c.slug] = created.id;
    continue;
  }
  const full = await api('GET', `/collections/${existing[c.slug].id}`);
  const have = new Set(full.fields.map((f) => f.slug));
  for (const f of c.fields.filter((f) => !have.has(f.slug))) {
    console.log(`+ field ${c.slug}.${f.slug}`);
    if (!DRY) await api('POST', `/collections/${full.id}/fields`, toApiField(f));
  }
}
console.log(DRY ? 'dry run, nothing written' : 'schema in place', ids);
