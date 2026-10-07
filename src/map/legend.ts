import type { Map as MapboxMap } from 'mapbox-gl';

import { groceryMark, metroMark } from './layers';

// Map key, top right. The map carries three unrelated marks (gold building pins, the STM
// pictogram, the épicerie cart) and the cart means nothing without one. The épicerie row only
// shows from the zoom its layer draws at: a key naming something you cannot see is worse than
// none. Hidden below 900 px by decision: on a phone it would cover a third of the map.

const GROCERY_MIN_ZOOM = 13.5;

const CSS = `
.ca-legend{position:absolute;top:16px;right:16px;z-index:2;max-width:200px;padding:12px;
  border:1px solid rgba(209,170,65,.18);border-radius:8px;background:rgba(22,28,50,.72);
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#fff;font-size:12px;line-height:1.3}
.ca-legend-row{display:flex;align-items:center;gap:8px;padding:4px 0;color:rgba(255,255,255,.82)}
.ca-legend-row[hidden]{display:none}
.ca-legend-k{flex:0 0 18px;display:grid;place-items:center}
.ca-legend-fill{width:11px;height:11px;border-radius:50%;background:#D1AA41;border:1.5px solid #161C32}
.ca-legend-hollow{width:10px;height:10px;border-radius:50%;border:1.5px solid #D1AA41}
@media (max-width:899px){.ca-legend{display:none}}
`;

export const addLegend = (map: MapboxMap, container: HTMLElement, fr: boolean, spaces: boolean) => {
  document.head.append(Object.assign(document.createElement('style'), { textContent: CSS }));
  const available = spaces
    ? fr
      ? 'Locaux disponibles'
      : 'Spaces available'
    : fr
      ? 'Logements disponibles'
      : 'Units available';
  const rows: [string, string, number?][] = [
    ['<span class="ca-legend-fill"></span>', available],
    [
      '<span class="ca-legend-hollow"></span>',
      fr ? 'Immeuble (types consultables)' : 'Building (types browsable)',
    ],
    [metroMark(15), fr ? 'Station de métro' : 'Métro station'],
    [groceryMark(15), fr ? 'Épicerie' : 'Grocery', GROCERY_MIN_ZOOM],
  ];
  const legend = document.createElement('div');
  legend.className = 'ca-legend';
  legend.setAttribute('data-ca-i18n-skip', '');
  legend.innerHTML = rows
    .map(
      ([mark, label, min]) =>
        `<div class="ca-legend-row"${min ? ` data-min="${min}"` : ''}><span class="ca-legend-k">${mark}</span>${label}</div>`
    )
    .join('');
  container.append(legend);

  const gated = [...legend.querySelectorAll<HTMLElement>('[data-min]')];
  const sync = () => {
    const z = map.getZoom();
    gated.forEach((row) => {
      row.hidden = z < Number(row.dataset.min);
    });
  };
  sync();
  map.on('zoom', sync);
};
