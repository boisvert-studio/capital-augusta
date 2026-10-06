// English for interface text that lives in custom DOM elements (labels, buttons, kickers,
// filter options, card labels). Webflow's localization API only reaches native text elements,
// so these are swapped in the browser on /en pages; see i18n.ts.
//
// Keyed by the French text exactly as published (apostrophes and spaces are normalized, so ’ and '
// both match). Editorial copy does NOT belong here: headings, ledes and paragraphs are native
// elements localized in Webflow, and CMS fields have their own English values.
//
// A French label edited in Webflow simply stops matching and shows in French on /en, which the
// QA sweep for French words catches. Add the new pair here when that happens.

export const EN: Record<string, string> = {
  // Utility bar, nav, footer
  'Espace locataires': 'Resident hub',
  'Demande de service': 'Service request',
  'Photographies des immeubles : Gaëtane Lefranc': 'Building photography: Gaëtane Lefranc',
  'Capital Augusta — accueil': 'Capital Augusta — home',
  'Fil d’Ariane': 'Breadcrumb',
  Langue: 'Language', // locale switcher aria-label (Nav)

  // Home hero and filters
  immeubles: 'buildings',
  immeuble: 'building',
  'logements gérés': 'managed units',
  quartiers: 'neighbourhoods',
  Quartier: 'Neighbourhood',
  Tous: 'All',
  Prix: 'Price',
  Commodité: 'Amenity',
  'Le Plateau-Mont-Royal': 'Plateau-Mont-Royal',
  'Ville-Marie (centre-ville)': 'Ville-Marie (downtown)',
  '≤ 1 000 $': '≤ $1,000',
  '≤ 1 100 $': '≤ $1,100',
  '≤ 1 200 $': '≤ $1,200',
  '≤ 1 300 $': '≤ $1,300',
  Buanderie: 'Laundry',
  Ascenseur: 'Elevator',
  Piscine: 'Pool',
  'Salle d’exercice': 'Gym',
  'Terrasse sur le toit': 'Rooftop terrace',
  'Cour intérieure': 'Interior courtyard',
  'Voir sur la carte →': 'View on map →',
  Filtre: 'Filter',
  Effacer: 'Clear',
  'Retirer ce filtre': 'Remove this filter',
  'Filtrer les immeubles': 'Filter buildings',
  'Carte des immeubles': 'Map of buildings',
  'Explorez le portefeuille': 'Explore the portfolio',

  // Building cards
  logements: 'units',
  Logements: 'Apartments',
  logement: 'unit',
  'Aucun libre': 'None available',
  'À partir de': 'From',

  // Building fiche
  unité: 'unit',
  Unité: 'Unit',
  Superficie: 'Area',
  'pi²': 'sq ft',
  Étage: 'Floor',
  Loyer: 'Rent',
  '/ mois': '/ mo',
  '$ / mois': '$ / month',
  Détails: 'Details',
  'Type de logement': 'Unit type',
  Conciergerie: 'Building care',
  'Questions fréquentes': 'Frequently asked questions',
  'Y a-t-il un stationnement ?': 'Is there parking?',
  'Les animaux de compagnie sont-ils permis ?': 'Are pets allowed?',
  'Quelle est la durée habituelle du bail ?': 'What is the usual lease length?',
  'Comment visiter un logement ou déposer une demande ?': 'How do I book a viewing or apply?',
  'Quels sont les jours de collecte à cette adresse ?':
    'What are the collection days at this address?',
  'Équipe de location': 'Leasing team',
  'Planifier une visite': 'Book a viewing',
  'Planifier une visite →': 'Book a viewing →',
  'Voir les locaux commerciaux →': 'View commercial spaces →',
  'Écrivez à notre équipe de location : la bonne personne vous répondra.':
    'Write to our leasing team: the right person will get back to you.',

  // Unit fiche
  'Inclus dans chaque logement': 'Included in every unit',
  'Plan type': 'Typical floor plan',
  'Plan d’étage à venir': 'Floor plan coming soon',
  'Plan d’étage du logement': 'Unit floor plan',
  'Ce logement m’intéresse': 'I’m interested',
  'Faire une demande pour ce logement →': 'Ask about this unit →',
  'Qu’est-ce qui est inclus dans le loyer ?': 'What’s included in the rent?',
  'Quand ce logement est-il disponible ?': 'When is this unit available?',
  'Libre maintenant.': 'Available now.',
  'Comment visiter ce logement ?': 'How do I view this unit?',

  // Commercial listing and fiche
  'Locaux commerciaux · Montréal': 'Commercial spaces · Montréal',
  'Des locaux commerciaux sur des': 'Commercial spaces on Montréal’s',
  'artères vivantes': 'liveliest streets',
  'Locaux commerciaux': 'Commercial spaces',
  Usage: 'Use',
  'Commerce de détail': 'Retail',
  Bureau: 'Office',
  Restauration: 'Food & beverage',
  'Atelier / entrepôt': 'Workshop / storage',
  'Espace de service': 'Service space',
  'Superficie min.': 'Min. area',
  '500+ pi²': '500+ sq ft',
  '1 000+ pi²': '1,000+ sq ft',
  '1 500+ pi²': '1,500+ sq ft',
  '2 000+ pi²': '2,000+ sq ft',
  locaux: 'spaces',
  local: 'space',
  'Locaux disponibles': 'Available spaces',
  'Filtrez par quartier, usage et superficie — la carte suit.':
    'Filter by neighbourhood, use and area — the map follows.',
  'Prix au pi² et frais additionnels tels que fournis · les frais incluent les taxes d’affaires':
    'Rate per sq ft and additional costs as provided · additional costs include business taxes',
  '· étage': '· floor',
  '/ pi²': '/ sq ft',
  '$ / pi²': '$ / sq ft',
  '$ / pi² · incluant les taxes d’affaires': '$ / sq ft · incl. business taxes',
  'Ce local m’intéresse': 'Enquire about this space',
  'Voir l’immeuble →': 'View building →',
  'Aucun local ne correspond': 'No space matches',
  'Élargissez un filtre. Nos disponibilités commerciales évoluent régulièrement.':
    'Widen a filter. Our commercial availability changes regularly.',
  'Réinitialiser les filtres': 'Reset filters',
  'Filtrer les locaux': 'Filter spaces',
  'Carte des locaux commerciaux': 'Map of commercial spaces',
  'Frais additionnels': 'Additional costs',
  'L’immeuble': 'The building',
  Adresse: 'Address',
  'Aussi dans l’immeuble': 'Also in the building',
  'Aucun local disponible actuellement': 'No space available right now',
  'Location commerciale': 'Commercial leasing',
  'Responsable — locaux commerciaux': 'Commercial leasing',

  // Contact
  'Location d’un logement': 'Renting an apartment',
  'Autre demande (commercial, général)': 'Other request (commercial, general)',
  'Votre recherche': 'What you’re looking for',
  'Les renseignements fournis dans ce formulaire servent uniquement à répondre à votre demande.':
    'The information in this form is used only to answer your request.',
  'Merci ! Votre message a bien été envoyé. Notre équipe vous répondra sous peu.':
    'Thank you! Your message has been sent. Our team will get back to you shortly.',
  'L’envoi n’a pas fonctionné. Réessayez, ou appelez-nous au 514 529-8063.':
    'Sending didn’t work. Try again, or call us at 514 529-8063.',
  'Montréal (Québec) H2H 1K1': 'Montréal QC H2H 1K1',
  '2152, avenue du Mont-Royal Est': '2152 avenue du Mont-Royal Est',
  'Type de demande': 'Request type',
  // Form names (aria-labels only; the submitted form name stays French for the inbox)
  'Demande de location': 'Rental request',
  'Demande de location success': 'Rental request sent',
  'Demande de location failure': 'Rental request not sent',
  'Demande générale': 'General request',
  'Demande générale success': 'General request sent',
  'Demande générale failure': 'General request not sent',
  'Envoyer →': 'Send →',
  'Envoi en cours…': 'Sending…',
  Courriel: 'Email',
  Téléphone: 'Phone',

  // About
  'en affaires depuis': 'in business since',
  'Notre histoire': 'Our story',
  'Notre savoir-faire': 'What we do',
  'Entretien rapide': 'Fast maintenance',
  'Équipe de construction complète': 'Full construction team',
  'Conciergerie 7 jours': 'Superintendents 7 days a week',
  'Une gestion de proximité': 'Hands-on management',
  'Des immeubles de toutes tailles': 'Buildings of every size',
  'Notre approche': 'Our approach',
  'Nos quartiers': 'Our neighbourhoods',
  'Une gestion de proximité, portée par l’expérience': 'Hands-on management, backed by experience',

  // Careers
  'Temps plein · plusieurs quartiers': 'Full-time · several neighbourhoods',
  'Concierge d’immeuble': 'Building superintendent',
  // Apply button's mailto subject (see localizeMailto in i18n.ts)
  'Candidature — Concierge d’immeuble': 'Application — Building superintendent',
  'Volet entretien ménager': 'Housekeeping',
  'Entretien des parties communes : planchers, corridors, escaliers et vestibules.':
    'Upkeep of common areas: floors, corridors, stairwells and vestibules.',
  'Nettoyage des vitres, murs et mains courantes ; entretien des chutes à déchets.':
    'Cleaning windows, walls and handrails; maintaining the refuse chutes.',
  'Sortie des ordures et du recyclage aux jours de collecte ; tri des bacs.':
    'Taking out garbage and recycling on collection days; sorting the bins.',
  'Volet extérieur et maintenance': 'Exterior and maintenance',
  'Ramassage des débris, déneigement et épandage de sel pour des allées sécuritaires.':
    'Clearing debris, snow removal and salting to keep walkways safe.',
  'Inspection des chaufferies et tenue d’un registre à jour.':
    'Inspecting boiler rooms and keeping an up-to-date log.',
  'Réponse aux appels d’urgence hors des heures d’ouverture selon un horaire établi.':
    'Responding to after-hours emergency calls on a set schedule.',
  'Distribution des communications aux locataires ; surveillance continue.':
    'Distributing tenant communications; ongoing watch over the property.',

  // Privacy
  'Responsable de la protection des renseignements personnels':
    'Person in charge of the protection of personal information',
  'Coordonnatrice, Capital Augusta': 'Coordinator, Capital Augusta',

  // English → English: the building and unit template embeds write these in English already.
  // Drop when the embeds' EN branches move into fiche.ts.
  'Who is the concierge for this building?': 'Who is the superintendent for this building?',
  'Apply for this unit →': 'Ask about this unit →',
};
