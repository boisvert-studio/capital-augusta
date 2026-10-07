import type { LayerSpecification, SourceSpecification } from 'mapbox-gl';

// Métro stations and épiceries, as the prototype draws them. The client narrowed the extra
// layers to street names, métro and épiceries (R2 point 6), so parks and museums stay off.
//
//   métro     68 stations, baked here (Mapbox's transit layer also returns bus stops, Bixi
//             docks and unnamed entrances). Drawn with the STM pictogram.
//   épicerie  Mapbox Streets `poi_label`, maki=grocery, from z13.5. Drawn as a sand cart badge.
//
// The style declares no sprite, so both icons are registered as images when the map asks for
// them (`styleimagemissing`), drawn on a canvas at 3× so they stay sharp on retina screens.

const NAVY = '#161C32';
const STM_BLUE = '#0061A8';
const SAND = '#C8C2B2';
const STM_SQUARE = 'M4 0H20A4 4 0 0 1 24 4V20A4 4 0 0 1 20 24H4A4 4 0 0 1 0 20V4A4 4 0 0 1 4 0Z';
const STM_ARROW = 'M10.3 6.2H13.7V11.4H15.6L12 16.6L8.4 11.4H10.3Z';
const CART_HANDLE = 'M4.6 7.4H6.6L7.4 10.2';
const CART_BASKET = 'M7.4 10.2H19.4L17.9 15.6H8.9Z';
const CART_WHEELS: [number, number][] = [
  [10.6, 17.9],
  [16.3, 17.9],
];
const CART_WR = 1.35;

const METRO: [string, number, number][] = [
  ['Acadie', -73.62375, 45.52322],
  ['Angrignon', -73.60365, 45.44618],
  ['Assomption', -73.54673, 45.56939],
  ['Atwater', -73.58631, 45.48968],
  ['Beaubien', -73.60495, 45.53518],
  ['Beaudry', -73.55717, 45.51955],
  ['Berri-UQAM', -73.56107, 45.51511],
  ['Bonaventure', -73.56695, 45.49819],
  ['Cadillac', -73.5467, 45.57684],
  ['Cartier', -73.68179, 45.56023],
  ['Champ-de-Mars', -73.55649, 45.51014],
  ['Charlevoix', -73.56937, 45.47825],
  ['Crémazie', -73.63884, 45.54615],
  ['Côte-Sainte-Catherine', -73.63286, 45.49237],
  ['Côte-Vertu', -73.68329, 45.51429],
  ['Côte-des-Neiges', -73.62349, 45.49665],
  ['De Castelnau', -73.6201, 45.53527],
  ['De La Savane', -73.6616, 45.50038],
  ['De la Concorde', -73.70974, 45.56086],
  ['De l’Église', -73.56701, 45.46269],
  ['Du Collège', -73.67283, 45.50846],
  ['D’Iberville', -73.6027, 45.5526],
  ['Fabre', -73.6078, 45.54676],
  ['Frontenac', -73.55221, 45.53315],
  ['Georges-Vanier', -73.57646, 45.48895],
  ['Guy-Concordia', -73.57984, 45.49538],
  ['Henri-Bourassa', -73.66825, 45.55452],
  ['Honoré-Beaugrand', -73.53543, 45.59641],
  ['Jarry', -73.6286, 45.54322],
  ['Jean-Drapeau', -73.53312, 45.51244],
  ['Jean-Talon', -73.61342, 45.53918],
  ['Jolicoeur', -73.58199, 45.45686],
  ['Joliette', -73.55101, 45.54694],
  ['LaSalle', -73.56613, 45.47082],
  ['Langelier', -73.54316, 45.58273],
  ['Laurier', -73.58838, 45.52808],
  ['Lionel-Groulx', -73.58047, 45.48231],
  ['Longueuil–Université-de-Sherbrooke', -73.52192, 45.52492],
  ['Lucien-L’Allier', -73.57094, 45.49501],
  ['McGill', -73.57157, 45.50408],
  ['Monk', -73.59321, 45.45105],
  ['Mont-Royal', -73.58165, 45.5246],
  ['Montmorency', -73.72151, 45.55835],
  ['Namur', -73.65291, 45.49493],
  ['Outremont', -73.61489, 45.52011],
  ['Papineau', -73.55217, 45.52374],
  ['Parc', -73.62452, 45.53042],
  ['Peel', -73.57509, 45.50061],
  ['Pie IX', -73.55154, 45.55419],
  ['Place Saint-Henri', -73.58637, 45.47739],
  ['Place d’Armes', -73.5596, 45.50608],
  ['Place-des-Arts', -73.56832, 45.50803],
  ['Plamondon', -73.63793, 45.49437],
  ['Préfontaine', -73.55424, 45.54173],
  ['Radisson', -73.53979, 45.58965],
  ['Rosemont', -73.59734, 45.53149],
  ['Saint-Laurent', -73.56481, 45.51088],
  ['Saint-Michel', -73.59997, 45.55975],
  ['Sauvé', -73.65651, 45.5511],
  ['Sherbrooke', -73.56806, 45.51872],
  ['Snowdon', -73.62835, 45.48567],
  ['Square-Victoria-OACI', -73.56311, 45.50209],
  ['Université-de-Montréal', -73.61758, 45.50344],
  ['Vendôme', -73.60383, 45.47389],
  ['Verdun', -73.57201, 45.45929],
  ['Viau', -73.54731, 45.56111],
  ['Villa-Maria', -73.61976, 45.47975],
  ['Édouard-Montpetit', -73.61253, 45.51013],
];

export const METRO_SOURCE: SourceSpecification = {
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: METRO.map(([name, lng, lat]) => ({
      type: 'Feature',
      properties: { name },
      geometry: { type: 'Point', coordinates: [lng, lat] },
    })),
  },
};

const FONT = ['DIN Pro Medium', 'Arial Unicode MS Regular'];

// Under the building pins in weight at every zoom: buildings → métro → épicerie.
export const EXTRA_LAYERS: LayerSpecification[] = [
  {
    id: 'grocery-dot',
    type: 'symbol',
    source: 'mb',
    'source-layer': 'poi_label',
    minzoom: 13.5,
    filter: ['==', ['get', 'maki'], 'grocery'],
    layout: {
      'icon-image': 'ca-grocery',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-size': ['interpolate', ['linear'], ['zoom'], 13.5, 0.4, 15, 0.52, 17, 0.68],
    },
  },
  {
    id: 'grocery-label',
    type: 'symbol',
    source: 'mb',
    'source-layer': 'poi_label',
    minzoom: 14.5,
    filter: ['==', ['get', 'maki'], 'grocery'],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONT,
      'text-size': ['interpolate', ['linear'], ['zoom'], 15, 9, 17, 11],
      'text-offset': [0, 1.05],
      'text-anchor': 'top',
      'text-max-width': 9,
      'text-optional': true,
    },
    paint: {
      'text-color': 'rgba(185,180,166,0.85)',
      'text-halo-color': NAVY,
      'text-halo-width': 1.2,
    },
  },
  {
    id: 'metro-dot',
    type: 'symbol',
    source: 'metro',
    layout: {
      'icon-image': 'stm-metro',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.34, 13, 0.55, 16, 0.82],
    },
  },
  // Station names from z13 only: 68 names at the opening zoom would out-shout the pins.
  {
    id: 'metro-label',
    type: 'symbol',
    source: 'metro',
    minzoom: 13,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONT,
      'text-size': ['interpolate', ['linear'], ['zoom'], 13, 9.5, 16, 12],
      'text-offset': [0, 1.15],
      'text-anchor': 'top',
      'text-max-width': 8,
      'text-optional': true,
    },
    paint: {
      'text-color': 'rgba(190,210,255,0.92)',
      'text-halo-color': NAVY,
      'text-halo-width': 1.4,
    },
  },
];

// -- Icons --------------------------------------------------------------------------------

const RATIO = 3;

const canvas24 = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 24 * RATIO;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  x.scale(RATIO, RATIO);
  return x;
};

const image = (x: CanvasRenderingContext2D) => x.getImageData(0, 0, 24 * RATIO, 24 * RATIO);

const metroImage = () => {
  const x = canvas24();
  x.fillStyle = STM_BLUE;
  x.fill(new Path2D(STM_SQUARE));
  x.fillStyle = '#fff';
  x.beginPath();
  x.arc(12, 12, 8.2, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = STM_BLUE;
  x.fill(new Path2D(STM_ARROW));
  return image(x);
};

const groceryImage = () => {
  const x = canvas24();
  x.fillStyle = SAND;
  x.beginPath();
  x.arc(12, 12, 11.5, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = NAVY;
  x.lineWidth = 1.7;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.stroke(new Path2D(CART_HANDLE));
  x.fillStyle = NAVY;
  x.fill(new Path2D(CART_BASKET));
  CART_WHEELS.forEach(([cx, cy]) => {
    x.beginPath();
    x.arc(cx, cy, CART_WR, 0, Math.PI * 2);
    x.fill();
  });
  return image(x);
};

export const ICONS: Record<string, () => ImageData> = {
  'stm-metro': metroImage,
  'ca-grocery': groceryImage,
};

// The same two marks as inline SVG, for the legend.
export const metroMark = (s: number) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
  `<path d="${STM_SQUARE}" fill="${STM_BLUE}"/><circle cx="12" cy="12" r="8.2" fill="#fff"/>` +
  `<path d="${STM_ARROW}" fill="${STM_BLUE}"/></svg>`;

export const groceryMark = (s: number) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
  `<circle cx="12" cy="12" r="11.5" fill="${SAND}"/>` +
  `<path d="${CART_HANDLE}" stroke="${NAVY}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
  `<path d="${CART_BASKET}" fill="${NAVY}"/>` +
  CART_WHEELS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${CART_WR}" fill="${NAVY}"/>`).join(
    ''
  ) +
  '</svg>';
