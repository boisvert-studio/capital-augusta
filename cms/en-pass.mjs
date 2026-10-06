// EN pass (2026-10-06): English values for the localized CMS text fields of the en-CA variants.
// Addresses, codes, slugs and names of people stay as they are. Run once; safe to re-run.
// Usage: node cms/en-pass.mjs [--dry]
import { api, collectionsBySlug, SITE_ID } from './lib.mjs';

const EN_LOCALE = '6ac3efd19908edc4a6d426f2';
const dry = process.argv.includes('--dry');

const SECTOR = { 'Le Plateau-Mont-Royal': 'Plateau-Mont-Royal', 'Ville-Marie (centre-ville)': 'Ville-Marie (downtown)' };
const sector = (s) => SECTOR[s] ?? s;
const FLOOR = { RC: 'Ground', SS: 'Basement' };

// field values keyed by the French value of the same field
const BY_VALUE = {
  commodites: {
    name: {
      'Électricité incluse': 'Electricity included', Cuisinière: 'Stove', Réfrigérateur: 'Refrigerator',
      'Eau chaude incluse': 'Hot water included', Ascenseur: 'Elevator', 'Cour intérieure': 'Interior courtyard',
      'Terrasse sur le toit': 'Rooftop terrace', Garage: 'Garage', Sauna: 'Sauna', "Salle d'exercice": 'Gym',
      Piscine: 'Pool', Buanderie: 'Laundry',
    },
  },
  equipe: {
    role: {
      'Responsable — locaux commerciaux': 'Commercial leasing', 'Responsable — Côte-Vertu': 'Manager — Côte-Vertu',
      Coordonnatrice: 'Coordinator', "Gestionnaire d'immeuble": 'Building manager',
    },
  },
  promotions: {
    name: {
      '1 mois offert': '1 month free', 'Bail de 2 ans disponible': '2-year lease available',
      'Offre de la rentrée': 'Fall offer', 'Carte cadeau de 1000 $ offerte': '$1,000 gift card',
    },
    texte: {
      "Jusqu'au 31 octobre, un mois de loyer offert sur une sélection de logements.":
        "Until October 31, one month's rent free on selected apartments.",
    },
  },
  'locaux-commerciaux': {
    etage: FLOOR,
    description: {
      "Idéal pour tout type de commerce. Local commercial à louer en plein cœur du Plateau, situé sur l'avenue du Mont-Royal, coin des Érables. Avenue avec beaucoup de passage, ce qui va permettre d'accroître votre business rapidement. 2000 pi². Disponible à la location immédiatement.":
        'Suited to any kind of business. Commercial space for rent in the heart of the Plateau, on avenue du Mont-Royal at the corner of des Érables. A high-footfall avenue that will help grow your business quickly. 2,000 sq ft. Available for immediate occupancy.',
    },
  },
  logement: { 'etage-affiche': FLOOR },
};

// fields derived by pattern
const DERIVED = {
  immeuble: {
    'titre-seo': (v) => v.replace(/ — (.+?) \| Capital Augusta$/, (_, s) => ` — ${sector(s)} | Capital Augusta`),
    'description-seo': (v) => {
      const m = v.match(/^Appartements à louer au (.+), (.+?)\. (\d+) logements?\.$/);
      return m ? `Apartments for rent at ${m[1]}, ${sector(m[2])}. ${m[3]} unit${m[3] === '1' ? '' : 's'}.` : null;
    },
  },
};

const cols = await collectionsBySlug();
const misses = [];
for (const slug of new Set([...Object.keys(BY_VALUE), ...Object.keys(DERIVED)])) {
  const c = cols[slug];
  const items = [];
  for (let offset = 0; ; offset += 100) {
    const r = await api('GET', `/collections/${c.id}/items?limit=100&offset=${offset}&cmsLocaleId=${EN_LOCALE}`);
    items.push(...r.items);
    if (offset + 100 >= r.pagination.total) break;
  }
  const updates = [];
  for (const it of items) {
    const fieldData = {};
    for (const [field, map] of Object.entries(BY_VALUE[slug] ?? {})) {
      const v = it.fieldData[field];
      if (v && map[v] && map[v] !== v) fieldData[field] = map[v];
      else if (v && !map[v] && !/^\d+$/.test(v) && !Object.values(map).includes(v)) misses.push(`${slug}.${field}: ${v}`);
    }
    for (const [field, fn] of Object.entries(DERIVED[slug] ?? {})) {
      const v = it.fieldData[field];
      if (!v) continue;
      const en = fn(v);
      if (en === null) misses.push(`${slug}.${field}: ${v}`);
      else if (en !== v) fieldData[field] = en;
    }
    if (Object.keys(fieldData).length) updates.push({ id: it.id, cmsLocaleId: EN_LOCALE, fieldData });
  }
  console.log(`${slug}: ${updates.length} of ${items.length} to update`, updates[0] ? JSON.stringify(updates[0].fieldData) : '');
  if (dry) continue;
  for (let i = 0; i < updates.length; i += 100) {
    await api('PATCH', `/collections/${c.id}/items`, { items: updates.slice(i, i + 100) });
  }
}
if (misses.length) console.log('NOT MATCHED:\n  ' + [...new Set(misses)].join('\n  '));
void SITE_ID;
