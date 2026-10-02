// Q04/Q09 first test: does Webflow's native archive work as the unit on/off switch?
// Archives one unit, publishes to the staging subdomain, checks the page 404s and the item keeps
// its slug and fields; then unarchives, republishes, checks the page is back.
// Needs the Appartements template page to exist and the site published once from the Designer.
// node cms/test-archive.mjs [unit-code]   (default SHE450-115)
import { api, collectionsBySlug, allItems, SITE_ID } from './lib.mjs';

const CODE = process.argv[2] ?? 'SHE450-115';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cols = await collectionsBySlug();
const units = cols.logements;
const site = await api('GET', `/sites/${SITE_ID}`);
const host = `https://${site.shortName}.webflow.io`;

const find = async () => (await allItems(units.id)).find((i) => i.fieldData.code === CODE);
async function publish() {
  await api('POST', `/sites/${SITE_ID}/publish`, { publishToWebflowSubdomain: true });
  await sleep(20000); // publishing is asynchronous; the CDN needs a moment
}
async function status(url) {
  const res = await fetch(url, { redirect: 'manual', headers: { 'cache-control': 'no-cache' } });
  return res.status;
}

const before = await find();
if (!before) throw new Error(`${CODE} not found in ${units.slug}`);
const url = `${host}/${units.slug}/${before.fieldData.slug}`;
console.log('unit', CODE, '→', url, '| live status now:', await status(url));

await api('PATCH', `/collections/${units.id}/items/${before.id}`, { isArchived: true });
await publish();
const archived = await find();
const archivedStatus = await status(url);

await api('PATCH', `/collections/${units.id}/items/${before.id}`, { isArchived: false });
await publish();
const after = await find();
const restoredStatus = await status(url);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const report = {
  archivedFlag: archived.isArchived,
  archivedPageStatus: archivedStatus,
  slugKept: archived.fieldData.slug === before.fieldData.slug && after.fieldData.slug === before.fieldData.slug,
  fieldsKept: same(after.fieldData, before.fieldData),
  restoredPageStatus: restoredStatus,
};
console.log(report);
console.log(report.archivedPageStatus === 404 && report.restoredPageStatus === 200 && report.slugKept && report.fieldsKept
  ? 'PASS: archive works as the on/off switch' : 'FAIL: see report');
