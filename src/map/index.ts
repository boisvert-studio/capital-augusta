import type { Marker } from 'mapbox-gl';
import type mapboxgl from 'mapbox-gl';

import { MAP_STYLE } from './style';

// Map island. Self-starts when the page holds a `[data-ca-map]` container.
//
// Markers come from the CMS list already rendered on the page, never from a separate feed:
//   <a data-ca-map-item="SHE450" data-lat="45.51" data-lng="-73.56" data-name="…" href="/immeuble/…">
// Whatever hides an item (a filter, pagination) dims its pin, so the map follows the list
// without knowing which library did the filtering.
//
// An item may also carry `data-count` (written by counts.ts): the number of available units.
// The pin then shows it, and turns into a hollow ring at zero.
//
// The Mapbox token is read from site settings (`window.CA_CONFIG.mapboxToken`), so rotating
// it never needs a rebuild.

declare global {
  interface Window {
    mapboxgl?: typeof mapboxgl;
    CA_CONFIG?: { mapboxToken?: string };
  }
}

const GL_VERSION = '3.9.0';
const GL_BASE = `https://api.mapbox.com/mapbox-gl-js/v${GL_VERSION}/mapbox-gl`;
const BOOT_TIMEOUT_MS = 8000;

type Item = {
  key: string;
  el: HTMLElement;
  lng: number;
  lat: number;
  name: string;
  href: string;
  count: number | null;
};
type Pin = { marker: Marker; el: HTMLElement };

const CSS = `
.ca-pin{width:22px;height:22px;border-radius:50%;background:#D1AA41;border:2px solid #161C32;
  display:flex;align-items:center;justify-content:center;color:#161C32;font:700 11px/1 sans-serif;
  box-shadow:0 0 0 3px rgba(209,170,65,.28);cursor:pointer;transition:opacity .15s,transform .15s}
.ca-pin:hover,.ca-pin:focus-visible{transform:scale(1.15);outline:none;box-shadow:0 0 0 4px rgba(209,170,65,.5)}
.ca-pin.is-dim{opacity:.25;pointer-events:none}
.ca-pin.is-empty{background:transparent;border-color:#D1AA41}
[data-ca-map] .mapboxgl-ctrl-group{background:rgba(22,28,50,.82);border:1px solid rgba(209,170,65,.28)}
[data-ca-map] .mapboxgl-ctrl-group button span{filter:invert(1) brightness(1.6)}
[data-ca-map] .mapboxgl-ctrl-attrib{background:rgba(22,28,50,.6)}
[data-ca-map] .mapboxgl-ctrl-attrib a{color:rgba(255,255,255,.55)}
`;

const isFrench = () => (document.documentElement.lang || 'fr').toLowerCase().startsWith('fr');

const num = (v: string | undefined) => (v ? Number(v.replace(',', '.').replace(/\s/g, '')) : NaN);

const readCount = (v: string | undefined) => {
  const n = v === undefined || v.trim() === '' ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
};

const readItems = (): Item[] =>
  [...document.querySelectorAll<HTMLElement>('[data-ca-map-item]')].flatMap((el) => {
    const lat = num(el.dataset.lat);
    const lng = num(el.dataset.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const link = el instanceof HTMLAnchorElement ? el : el.querySelector('a');
    return [
      {
        key: el.dataset.caMapItem || `${lat},${lng}`,
        el,
        lat,
        lng,
        name: el.dataset.name || el.textContent?.trim() || '',
        href: link?.href || '',
        count: readCount(el.dataset.count),
      },
    ];
  });

// An item counts as shown if it takes up space: filters hide with display:none or remove it.
const isShown = (el: HTMLElement) => el.isConnected && el.getClientRects().length > 0;

const loadOnce = <T extends HTMLElement>(id: string, make: () => T) =>
  new Promise<void>((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    const el = make();
    el.id = id;
    el.addEventListener('load', () => resolve());
    el.addEventListener('error', () => reject(new Error(`failed to load ${id}`)));
    document.head.append(el);
  });

const loadGl = async () => {
  if (window.mapboxgl) return window.mapboxgl;
  await Promise.all([
    loadOnce('ca-mapbox-css', () =>
      Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${GL_BASE}.css` })
    ),
    loadOnce('ca-mapbox-js', () =>
      Object.assign(document.createElement('script'), { src: `${GL_BASE}.js` })
    ),
  ]);
  if (!window.mapboxgl) throw new Error('mapbox-gl missing');
  return window.mapboxgl;
};

const fail = (container: HTMLElement) => {
  container.classList.add('is-map-fallback');
  container.setAttribute('hidden', '');
};

const pinLabel = (item: Item) => {
  if (item.count === null) return item.name;
  if (isFrench()) {
    const what =
      item.count === 0
        ? 'aucun logement disponible'
        : `${item.count} logement${item.count > 1 ? 's' : ''} disponible${item.count > 1 ? 's' : ''}`;
    return `${item.name} — ${what}`;
  }
  const what = item.count === 0 ? 'no units available' : `${item.count} available`;
  return `${item.name} — ${what}`;
};

// Keeps a pin's count, hollow state and label in step with its item.
const paintPin = (el: HTMLElement, item: Item) => {
  const text = item.count === null || item.count === 0 ? '' : String(item.count);
  if (el.textContent !== text) el.textContent = text;
  el.classList.toggle('is-empty', item.count === 0);
  el.setAttribute('aria-label', pinLabel(item));
};

export const initMap = async (container: HTMLElement) => {
  const token = window.CA_CONFIG?.mapboxToken;
  if (!token) return fail(container);

  let gl: typeof mapboxgl;
  try {
    gl = await loadGl();
  } catch {
    return fail(container);
  }
  if (gl.supported && !gl.supported()) return fail(container);

  document.head.append(Object.assign(document.createElement('style'), { textContent: CSS }));

  gl.accessToken = token;
  const fr = isFrench();
  const map = new gl.Map({
    container,
    style: MAP_STYLE,
    center: [-73.585, 45.53],
    zoom: 11.2,
    cooperativeGestures: true,
    // Off by design: the privacy policy says the map sends no tracking data.
    performanceMetricsCollection: false,
    locale: fr
      ? {
          'ScrollZoomBlocker.CtrlMessage': 'Utilisez Ctrl + défilement pour zoomer',
          'ScrollZoomBlocker.CmdMessage': 'Utilisez ⌘ + défilement pour zoomer',
          'TouchPanBlocker.Message': 'Déplacez la carte avec deux doigts',
        }
      : undefined,
  });
  map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-left');

  const pins = new Map<string, Pin>();
  let loaded = false;
  const timeout = window.setTimeout(() => {
    if (!loaded) {
      map.remove();
      fail(container);
    }
  }, BOOT_TIMEOUT_MS);

  map.on('error', (e) => {
    const status = (e.error as { status?: number } | undefined)?.status;
    if (!loaded && status && [401, 403, 404, 422].includes(status)) {
      window.clearTimeout(timeout);
      map.remove();
      fail(container);
    }
  });

  const addPin = (item: Item) => {
    const el = document.createElement('div');
    el.className = 'ca-pin';
    el.tabIndex = 0;
    el.setAttribute('role', 'link');
    paintPin(el, item);
    const go = () => item.href && window.location.assign(item.href);
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        go();
      }
    });
    const marker = new gl.Marker({ element: el, anchor: 'center' })
      .setLngLat([item.lng, item.lat])
      .addTo(map);
    pins.set(item.key, { marker, el });
  };

  let firstFit = true;
  const sync = () => {
    const items = readItems();
    items.forEach((item) => {
      const pin = pins.get(item.key);
      if (pin) paintPin(pin.el, item);
      else addPin(item);
    });
    const shown = new Set(items.filter((i) => isShown(i.el)).map((i) => i.key));
    pins.forEach(({ el }, key) => {
      const off = !shown.has(key);
      el.classList.toggle('is-dim', off);
      el.tabIndex = off ? -1 : 0;
      el.toggleAttribute('aria-hidden', off);
    });
    const pts = items.filter((i) => shown.has(i.key));
    const fit = pts.length ? pts : items;
    if (!fit.length) return;
    const bounds = new gl.LngLatBounds();
    fit.forEach((i) => bounds.extend([i.lng, i.lat]));
    map.fitBounds(bounds, {
      padding: { top: 64, right: 56, bottom: 56, left: 56 },
      maxZoom: 14.5,
      duration: firstFit ? 0 : 650,
    });
    firstFit = false;
  };

  let queued = false;
  const queueSync = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      sync();
    });
  };

  map.on('load', () => {
    loaded = true;
    window.clearTimeout(timeout);
    sync();
    // Watch the lists that hold the items, wherever they are on the page.
    const roots = new Set(
      readItems().map((i) => i.el.parentElement?.parentElement ?? document.body)
    );
    const observer = new MutationObserver(queueSync);
    roots.forEach((root) =>
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden', 'data-count'],
      })
    );
  });
};

export const startMaps = () => {
  document.querySelectorAll<HTMLElement>('[data-ca-map]').forEach((el) => {
    void initMap(el);
  });
};
