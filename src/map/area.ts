import type { LngLatBounds, Map as MapboxMap } from 'mapbox-gl';

// « Rechercher dans cette zone ». After the visitor pans or zooms the map, a button offers to
// limit the list to the buildings inside the current view. The limit runs as a filter step
// inside Finsweet's own pipeline (a `filter` hook on each list instance), so it combines with
// the facet filters, and the results count and the empty state stay right without extra work.
//
// Finsweet only knows its own filters, so the « Zone de la carte » chip is ours: it joins
// Finsweet's chip row when that row exists, and brings its own row (with an « Effacer »
// button) when the area is the only filter. Finsweet's « Effacer » buttons clear the area too.
//
// No URL state, as in the prototype: the area is a view of the map, not a shareable filter.

type ListItem = { element: HTMLElement };
type ListInstance = {
  addHook: (hook: 'filter', cb: (items: ListItem[]) => ListItem[]) => void;
  triggerHook: (hook: 'filter') => Promise<void> | void;
};
type FinsweetQueue = { push: (entry: [string, (instances: ListInstance[]) => void]) => void };

const CSS = `
.ca-area-btn{position:absolute;top:16px;left:50%;z-index:3;display:none;align-items:center;gap:8px;
  padding:8px 16px;border:1px solid rgba(22,28,50,.16);border-radius:22px;background:#fff;color:#161C32;
  font:600 13px/1.2 inherit;font-family:inherit;cursor:pointer;box-shadow:0 6px 18px rgba(22,28,50,.22);
  transform:translate(-50%,-8px);opacity:0;transition:opacity .22s,transform .22s,border-color .15s}
.ca-area-btn.is-on{display:inline-flex;opacity:1;transform:translate(-50%,0)}
.ca-area-btn:hover{border-color:#161C32}
.ca-area-btn:focus-visible{outline:2px solid #D1AA41;outline-offset:2px}
.ca-area-btn svg{width:15px;height:15px;color:#B4842A;flex:none}
@media (prefers-reduced-motion:reduce){.ca-area-btn{transition:none}}
`;

const REFRESH =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>';

type Options = {
  map: MapboxMap;
  container: HTMLElement;
  fr: boolean;
  spaces: boolean;
  // Coordinates of each map item, by key.
  coords: () => Map<string, [number, number]>;
};

export const setupArea = ({ map, container, fr, spaces, coords }: Options) => {
  const queue = (window as unknown as { FinsweetAttributes?: FinsweetQueue }).FinsweetAttributes;
  if (!queue?.push) return { active: () => false };

  document.head.append(Object.assign(document.createElement('style'), { textContent: CSS }));

  const t = {
    search: fr ? 'Rechercher dans cette zone' : 'Search this area',
    chip: fr ? 'Zone de la carte' : 'Map area',
    remove: fr ? 'Retirer ce filtre' : 'Remove this filter',
    clear: fr ? 'Effacer' : 'Clear',
  };

  let bounds: LngLatBounds | null = null;
  let lists: ListInstance[] = [];

  // -- The filter step --------------------------------------------------------------------

  const keyOf = (el: HTMLElement) => {
    if (spaces) {
      const space = el.matches('[data-ca-comm-space]')
        ? el
        : el.querySelector<HTMLElement>('[data-ca-comm-space]');
      return space?.dataset.caCommSpace ?? null;
    }
    const item = el.matches('[data-ca-map-item]')
      ? el
      : el.querySelector<HTMLElement>('[data-ca-map-item]');
    return item?.dataset.caMapItem ?? null;
  };

  // Finsweet takes filtered-out items off the page, so coordinates are remembered rather than
  // read from what is rendered now: an item missing from the page must still be placed.
  const known = new Map<string, [number, number]>();
  const where = (key: string) => {
    if (!known.has(key)) coords().forEach((point, k) => known.set(k, point));
    return known.get(key);
  };

  const inArea = (items: ListItem[]) => {
    if (!bounds) return items;
    const area = bounds;
    return items.filter(({ element }) => {
      const key = keyOf(element);
      const point = key ? where(key) : undefined;
      // An item the map does not place is left to the other filters.
      return point ? area.contains(point) : true;
    });
  };

  const refilter = () => Promise.all(lists.map((list) => list.triggerHook('filter')));

  queue.push([
    'list',
    (instances) => {
      lists = instances;
      coords().forEach((point, k) => known.set(k, point));
      instances.forEach((list) => list.addHook('filter', inArea));
    },
  ]);

  // -- Button -----------------------------------------------------------------------------

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ca-area-btn';
  button.setAttribute('data-ca-i18n-skip', '');
  button.innerHTML = `${REFRESH}<span>${t.search}</span>`;
  container.append(button);

  const showButton = (on: boolean) => button.classList.toggle('is-on', on && lists.length > 0);

  // Only a move the visitor made (drag, wheel, pinch, the zoom buttons) offers the search;
  // the map's own fits after a filter change carry no originalEvent.
  map.on('moveend', (e: { originalEvent?: Event }) => {
    if (e.originalEvent) showButton(true);
  });

  // -- Chip -------------------------------------------------------------------------------

  const meta = document.querySelector<HTMLElement>('[data-ca-bar-meta]');

  const chip = document.createElement('div');
  chip.className = 'chip is-on';
  chip.setAttribute('data-ca-area-chip', '');
  chip.setAttribute('data-ca-i18n-skip', '');
  chip.innerHTML = `<span>${t.chip}</span><button type="button" aria-label="${t.remove}">×</button>`;

  // Our own row, for when the area is the only filter and Finsweet shows none.
  const row = document.createElement('div');
  row.className = 'bar_tags';
  row.setAttribute('data-ca-area-tags', '');
  row.setAttribute('data-ca-i18n-skip', '');
  const ownClear = document.createElement('button');
  ownClear.type = 'button';
  ownClear.className = 'chip';
  ownClear.textContent = t.clear;

  let placing = false;
  const placeChip = () => {
    if (!meta || placing) return;
    placing = true;
    const finsweetRow = meta.querySelector<HTMLElement>('.bar_tags:not([data-ca-area-tags])');
    if (!bounds) {
      chip.remove();
      row.remove();
    } else if (finsweetRow) {
      row.remove();
      const clear = finsweetRow.querySelector('[fs-list-element="clear"]');
      if (chip.parentElement !== finsweetRow || chip.nextElementSibling !== clear)
        finsweetRow.insertBefore(chip, clear);
    } else {
      if (chip.parentElement !== row) row.append(chip, ownClear);
      if (row.parentElement !== meta) meta.append(row);
    }
    placing = false;
  };
  if (meta) new MutationObserver(placeChip).observe(meta, { childList: true, subtree: true });

  // -- State ------------------------------------------------------------------------------

  const apply = (next: LngLatBounds | null) => {
    bounds = next;
    placeChip();
    return refilter();
  };

  button.addEventListener('click', () => {
    showButton(false);
    void apply(map.getBounds());
  });

  const clear = () => {
    if (!bounds) return;
    showButton(false);
    void apply(null);
  };
  chip.querySelector('button')?.addEventListener('click', clear);
  ownClear.addEventListener('click', clear);
  // Finsweet's own « Effacer » buttons (the chip row and the empty state).
  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('[fs-list-element="clear"]')) clear();
  });

  return { active: () => bounds !== null };
};
