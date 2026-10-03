// The CMS schema as code: the 9 collections decided in Q04 (2026-09-23), corrected by Q12
// (available count is computed on the page, so no field for it). Métro slots carry minutes +
// metres, as the approved design shows them; Q04's « line » field is not displayed, so dropped.
// Order matters: a collection can only reference collections created before it. A field marked
// `deferred: true` points forward (Immeubles → Types de logement); create-schema adds it in a
// second pass once every collection exists.
// `ref` names the target collection's slug. Collection slugs = URL paths: /immeuble/<item>,
// /local-commercial/<item> (singular, so the static /immeubles and /commercial pages can exist). Field slugs are the ones Webflow derived from the
// display names at creation (verified 2026-10-02): the API ignores a `slug` sent on create and
// can't change it afterwards, so `slug` here records Webflow's value, used as the API key.
const SECTORS = ['Le Plateau-Mont-Royal', 'Villeray', 'Rosemont–La Petite-Patrie',
  'Ville-Marie (centre-ville)', 'Saint-Laurent', 'Outremont / Mile End'];
const TYPES = ['1½', '2½', '3½', '4½', '5½'];
const USAGES = ['Commerce de détail', 'Bureau', 'Restauration', 'Atelier / entrepôt', 'Espace de service'];

const opt = (names) => ({ options: names.map((name) => ({ name })) });
const metro = (n) => [
  { type: 'PlainText', displayName: `Métro ${n} — station`, slug: `metro-${n}----station` },
  { type: 'Number', displayName: `Métro ${n} — minutes à pied`, slug: `metro-${n}----minutes-a-pied` },
  { type: 'Number', displayName: `Métro ${n} — mètres`, slug: `metro-${n}----metres` },
];

export const COLLECTIONS = [
  {
    displayName: 'Commodités', singularName: 'Commodité', slug: 'commodites',
    fields: [
      { type: 'PlainText', displayName: 'Icône', slug: 'icone', helpText: 'Nom de l’icône (laundry, gym, garage…)' },
      { type: 'Option', displayName: 'Catégorie', slug: 'categorie', metadata: opt(['Commodité', 'Service']) },
    ],
  },
  {
    displayName: 'Conciergerie', singularName: 'Concierge', slug: 'conciergerie',
    fields: [{ type: 'Phone', displayName: 'Téléphone', slug: 'telephone' }],
  },
  {
    displayName: 'Équipe', singularName: 'Membre', slug: 'equipe',
    fields: [
      { type: 'PlainText', displayName: 'Rôle', slug: 'role' },
      { type: 'Email', displayName: 'Courriel', slug: 'courriel' },
    ],
  },
  {
    displayName: 'Promotions', singularName: 'Promotion', slug: 'promotions',
    fields: [
      { type: 'PlainText', displayName: 'Texte', slug: 'texte' },
      { type: 'Link', displayName: 'Lien', slug: 'lien' },
      { type: 'Switch', displayName: 'Active', slug: 'active' },
      { type: 'Option', displayName: 'Portée', slug: 'portee', metadata: opt(['Immeuble', 'Site']) },
    ],
  },
  {
    displayName: 'Immeubles', singularName: 'Immeuble', slug: 'immeuble',
    fields: [
      { type: 'PlainText', displayName: 'Code', slug: 'code', isRequired: true, helpText: 'Code du fichier maître, ex. SHE450. Clé d’import, ne pas modifier.' },
      { type: 'Option', displayName: 'Secteur', slug: 'secteur', metadata: opt(SECTORS) },
      { type: 'Number', displayName: 'Latitude', slug: 'latitude' },
      { type: 'Number', displayName: 'Longitude', slug: 'longitude' },
      { type: 'Number', displayName: 'Nombre de logements', slug: 'nombre-de-logements' },
      { type: 'Number', displayName: 'Loyer à partir de', slug: 'loyer-a-partir-de', helpText: 'Votre prix d’appel affiché sur la fiche.' },
      { type: 'MultiReference', displayName: 'Inclus', slug: 'inclus', ref: 'commodites' },
      { type: 'MultiReference', displayName: 'En option (payant)', slug: 'en-option-payant', ref: 'commodites' },
      { type: 'Reference', displayName: 'Gestionnaire', slug: 'gestionnaire', ref: 'equipe' },
      { type: 'Reference', displayName: 'Concierge', slug: 'concierge', ref: 'conciergerie' },
      { type: 'Switch', displayName: 'Concierge à venir', slug: 'concierge-a-venir' },
      { type: 'Reference', displayName: 'Promotion', slug: 'promotion', ref: 'promotions' },
      // Plan §2 (2026-10-02): a forward multi-ref so the Home « Type » filter and the card's
      // « N types » can read the building's types (Webflow nests only forward references).
      // Written by the seed, derived from Types de logement.
      { type: 'MultiReference', displayName: 'Types offerts', slug: 'types-offerts', ref: 'types-de-logement', deferred: true,
        helpText: 'Types de logement de cet immeuble (alimente le filtre « Type »).' },
      { type: 'MultiImage', displayName: 'Galerie', slug: 'galerie' },
      { type: 'Image', displayName: 'Photo principale', slug: 'photo-principale', helpText: 'Photo de la carte et de l’aperçu de partage. Par défaut, la 1re photo de la galerie.' },
      ...metro(1), ...metro(2), ...metro(3),
      { type: 'PlainText', displayName: 'Lignes d’autobus', slug: 'lignes-d-autobus', helpText: 'Séparées par des virgules, ex. 24, 31, 125' },
      { type: 'PlainText', displayName: 'Titre SEO', slug: 'titre-seo' },
      { type: 'PlainText', displayName: 'Description SEO', slug: 'description-seo' },
    ],
  },
  {
    displayName: 'Types de logement', singularName: 'Type de logement', slug: 'types-de-logement',
    fields: [
      { type: 'Reference', displayName: 'Immeuble', slug: 'immeuble', ref: 'immeuble', isRequired: true },
      { type: 'Option', displayName: 'Type', slug: 'type', metadata: opt(TYPES) },
      { type: 'PlainText', displayName: 'Désignation', slug: 'designation', helpText: 'Studio, 1 c.c., 2 c.c. (traduit en anglais)' },
      { type: 'Number', displayName: 'Superficie min (pi²)', slug: 'superficie-min-pi2' },
      { type: 'Number', displayName: 'Superficie max (pi²)', slug: 'superficie-max-pi2' },
      { type: 'Number', displayName: 'Loyer à partir de', slug: 'loyer-a-partir-de' },
      { type: 'Image', displayName: 'Plan', slug: 'plan' },
      { type: 'MultiImage', displayName: 'Photos', slug: 'photos' },
    ],
  },
  {
    displayName: 'Appartements', singularName: 'Appartement', slug: 'logement',
    fields: [
      { type: 'PlainText', displayName: 'Code', slug: 'code', isRequired: true, helpText: 'Code immeuble + numéro, ex. SHE450-115. Clé d’import.' },
      { type: 'Reference', displayName: 'Immeuble', slug: 'immeuble', ref: 'immeuble', isRequired: true },
      { type: 'Reference', displayName: 'Type de logement', slug: 'type-de-logement', ref: 'types-de-logement' },
      { type: 'PlainText', displayName: 'Numéro', slug: 'numero' },
      // `etage` stays numeric for sorting (the seed writes SS = -1, RC = 0). The design prints the
      // floor as the master writes it (« SS », « RC », « 2 »), which a Number can't hold, so the
      // label is its own field (added 2026-10-02).
      { type: 'Number', displayName: 'Étage', slug: 'etage' },
      { type: 'PlainText', displayName: 'Étage affiché', slug: 'etage-affiche', helpText: 'Tel qu’affiché : SS, RC, 1, 2…' },
      { type: 'Number', displayName: 'Loyer', slug: 'loyer' },
      { type: 'DateTime', displayName: 'Disponible le', slug: 'disponible-le' },
      { type: 'Number', displayName: 'Superficie (pi²)', slug: 'superficie-pi2' },
      { type: 'RichText', displayName: 'Description', slug: 'description' },
      { type: 'MultiImage', displayName: 'Photos', slug: 'photos' },
    ],
  },
  {
    displayName: 'Immeubles commerciaux', singularName: 'Immeuble commercial', slug: 'local-commercial',
    fields: [
      { type: 'Reference', displayName: 'Immeuble', slug: 'immeuble', ref: 'immeuble', isRequired: true },
      { type: 'Number', displayName: 'Nombre de locaux', slug: 'nombre-de-locaux' },
    ],
  },
  {
    displayName: 'Locaux commerciaux', singularName: 'Local commercial', slug: 'locaux-commerciaux',
    fields: [
      { type: 'Reference', displayName: 'Immeuble commercial', slug: 'immeuble-commercial', ref: 'local-commercial', isRequired: true },
      { type: 'PlainText', displayName: 'Adresse civique', slug: 'adresse-civique' },
      // Plan §2: copied from the building so the commercial « Quartier » filter and card sub-line
      // can read it on the space itself (the building sits two references away).
      { type: 'Option', displayName: 'Secteur', slug: 'secteur', metadata: opt(SECTORS) },
      { type: 'Option', displayName: 'Usage', slug: 'usage', metadata: opt(USAGES) },
      { type: 'Number', displayName: 'Superficie (pi²)', slug: 'superficie-pi2' },
      { type: 'PlainText', displayName: 'Étage', slug: 'etage' },
      { type: 'Number', displayName: 'Loyer ($/pi²)', slug: 'loyer-pi2' },
      { type: 'Number', displayName: 'Frais additionnels ($/pi²)', slug: 'frais-additionnels-pi2' },
      { type: 'PlainText', displayName: 'Description', slug: 'description' },
      { type: 'DateTime', displayName: 'Disponible le', slug: 'disponible-le' },
    ],
  },
];
