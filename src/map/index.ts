import type { Marker } from 'mapbox-gl';
import type mapboxgl from 'mapbox-gl';

import { setupArea } from './area';
import { ICONS } from './layers';
import { addLegend } from './legend';
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
// Commercial page (`data-ca-map-counts="space"` on the container): the building items sit in a
// hidden list and the visible list holds the spaces (`data-ca-comm-space="<item key>"`). A pin
// is then shown while one of its spaces is shown, and its label counts spaces, not units.
//
// Hovering a pin highlights its card(s) and brings them into view; hovering a card highlights
// its pin. On the commercial page the cards are the spaces of that building.
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
type Pin = { marker: Marker; box: HTMLElement; el: HTMLElement };

// Mapbox positions a marker with an inline transform on the element it is given. Anything
// that scales that element (a hover `scale`, a `transform`) also scales its translation, so
// the pin jumps away from the cursor and back. The marker is therefore a fixed box, and every
// visual state lives on the pin inside it.
const CSS = `
[data-ca-map] .mapboxgl-ctrl-top-left,[data-ca-map] .mapboxgl-ctrl-top-right{top:var(--ca-map-inset,0px)}
.ca-marker{width:22px;height:22px}
.ca-marker:hover,.ca-marker.is-active{z-index:5}
.ca-marker.is-dim{pointer-events:none}
.ca-pin{width:22px;height:22px;box-sizing:border-box;border-radius:50%;background:#D1AA41;border:2px solid #161C32;
  display:flex;align-items:center;justify-content:center;color:#161C32;font:700 11px/1 sans-serif;
  box-shadow:0 0 0 3px rgba(209,170,65,.28);cursor:pointer;transition:opacity .15s,scale .2s,background-color .2s}
.ca-pin:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(209,170,65,.5)}
.ca-pin.is-dim{opacity:.25;pointer-events:none}
.ca-pin.is-active{scale:1.12;background:#fff}
.ca-pin.is-empty{background:transparent;border-color:#D1AA41}
.ca-pin.is-empty.is-active{background:#fff}
[data-ca-map-item].is-hot,[data-ca-comm-space].is-hot{border-color:#D1AA41;
  box-shadow:0 0 0 2px #D1AA41,0 12px 28px rgba(22,28,50,.16);transform:translateY(-2px);position:relative;z-index:1}
@media (prefers-reduced-motion:reduce){.ca-pin{transition:none}[data-ca-map-item].is-hot,[data-ca-comm-space].is-hot{transform:none}}
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

const spaceShown = (key: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-ca-comm-space]')].some(
    (el) => el.dataset.caCommSpace === key && isShown(el)
  );

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

const pinLabel = (item: Item, spaces: boolean) => {
  if (item.count === null) return item.name;
  if (spaces) {
    const n = item.count;
    const what = isFrench()
      ? n === 0
        ? 'aucun local disponible'
        : `${n} ${n > 1 ? 'locaux disponibles' : 'local disponible'}`
      : n === 0
        ? 'no space available'
        : `${n} available`;
    return `${item.name} — ${what}`;
  }
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
const paintPin = (el: HTMLElement, item: Item, spaces: boolean) => {
  const text = item.count === null || item.count === 0 ? '' : String(item.count);
  if (el.textContent !== text) el.textContent = text;
  el.classList.toggle('is-empty', item.count === 0);
  el.setAttribute('aria-label', pinLabel(item, spaces));
};

// The docked filter bar can cover the top of the map: on a short list (Commercial, one result)
// the map has no room to stay sticky and scrolls under it. The covered height is published as
// `--ca-map-inset`, and everything pinned to the map's top edge (zoom buttons, legend, area
// button) sits below it.
const keepClearOfBar = (container: HTMLElement) => {
  const bar = document.querySelector<HTMLElement>('[data-ca-bar]');
  if (!bar) return;
  let queued = false;
  const measure = () => {
    queued = false;
    const covered = Math.max(
      0,
      Math.round(bar.getBoundingClientRect().bottom - container.getBoundingClientRect().top)
    );
    const inset = `${Math.min(covered, container.offsetHeight / 2)}px`;
    if (container.style.getPropertyValue('--ca-map-inset') !== inset)
      container.style.setProperty('--ca-map-inset', inset);
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measure);
  };
  measure();
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
};

export const initMap = async (container: HTMLElement) => {
  const token = window.CA_CONFIG?.mapboxToken;
  if (!token) return fail(container);
  const spaces = container.dataset.caMapCounts === 'space';

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
  // The style has no sprite: the métro and épicerie icons are drawn when first asked for.
  map.on('styleimagemissing', (e: { id: string }) => {
    const make = ICONS[e.id];
    if (make && !map.hasImage(e.id)) map.addImage(e.id, make(), { pixelRatio: 3 });
  });

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

  // -- Pin ⇄ card highlight ------------------------------------------------------------

  const cardsFor = (key: string) =>
    spaces
      ? [...document.querySelectorAll<HTMLElement>('[data-ca-comm-space]')].filter(
          (el) => el.dataset.caCommSpace === key && isShown(el)
        )
      : [...document.querySelectorAll<HTMLElement>('[data-ca-map-item]')].filter(
          (el) => el.dataset.caMapItem === key && isShown(el)
        );

  const highlight = (key: string, on: boolean) => {
    const pin = pins.get(key);
    pin?.el.classList.toggle('is-active', on);
    pin?.box.classList.toggle('is-active', on);
    cardsFor(key).forEach((card) => card.classList.toggle('is-hot', on));
  };

  // Brings the hovered pin's card into view. Debounced, so sweeping the cursor across a
  // cluster scrolls once, for the pin it settles on. Only when the card is entirely out of
  // view: a card half under the sticky header is already found, and scrolling for it would
  // pull the map out from under the cursor.
  let scrollTimer = 0;
  // While the page scrolls for a pin, the map can slide under a still cursor (it is sticky
  // only inside its section). That is not the visitor leaving the pin, so the highlight holds
  // until the mouse actually moves.
  let scrolling = false;
  let heldKey: string | null = null;
  let settle = 0;
  const holdWhileScrolling = () => {
    scrolling = true;
    const done = () => {
      scrolling = false;
      window.removeEventListener('scroll', onScroll);
    };
    const onScroll = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(done, 200);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    settle = window.setTimeout(done, 400); // no scroll at all (already in place)
  };
  const revealCard = (key: string) => {
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      const card = cardsFor(key)[0];
      if (!card || !pins.get(key)?.el.classList.contains('is-active')) return;
      const r = card.getBoundingClientRect();
      const { top } = container.getBoundingClientRect();
      if (r.bottom > Math.max(top, 0) && r.top < window.innerHeight) return;
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      holdWhileScrolling();
      card.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
    }, 140);
  };
  document.addEventListener('mousemove', (e) => {
    if (!heldKey || scrolling) return;
    const pin = pins.get(heldKey)?.el;
    if (pin && pin.contains(e.target as Node)) return;
    highlight(heldKey, false);
    heldKey = null;
  });

  const addPin = (item: Item) => {
    const box = document.createElement('div');
    box.className = 'ca-marker';
    const el = document.createElement('div');
    el.className = 'ca-pin';
    el.tabIndex = 0;
    el.setAttribute('role', 'link');
    el.dataset.key = item.key;
    box.append(el);
    paintPin(el, item, spaces);
    const go = () => item.href && window.location.assign(item.href);
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        go();
      }
    });
    const on = () => {
      highlight(item.key, true);
      revealCard(item.key);
    };
    const off = () => highlight(item.key, false);
    el.addEventListener('mouseenter', () => {
      if (heldKey && heldKey !== item.key) highlight(heldKey, false);
      heldKey = null;
      on();
    });
    el.addEventListener('mouseleave', () => {
      if (scrolling) heldKey = item.key;
      else off();
    });
    el.addEventListener('focus', on);
    el.addEventListener('blur', off);
    const marker = new gl.Marker({ element: box, anchor: 'center' })
      .setLngLat([item.lng, item.lat])
      .addTo(map);
    pins.set(item.key, { marker, box, el });
  };

  // Card → pin, delegated so cards that a filter re-renders keep working.
  const cardKey = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;
    const card = spaces
      ? target.closest<HTMLElement>('[data-ca-comm-space]')
      : target.closest<HTMLElement>('[data-ca-map-item]');
    if (!card) return null;
    return { card, key: (spaces ? card.dataset.caCommSpace : card.dataset.caMapItem) ?? '' };
  };
  document.addEventListener('mouseover', (e) => {
    const hit = cardKey(e.target);
    if (!hit || hit.card.contains(e.relatedTarget as Node | null)) return;
    highlight(hit.key, true);
  });
  document.addEventListener('mouseout', (e) => {
    const hit = cardKey(e.target);
    if (!hit || hit.card.contains(e.relatedTarget as Node | null)) return;
    highlight(hit.key, false);
  });

  // « Rechercher dans cette zone »: while an area is set, the map keeps the visitor's view.
  let area = { active: () => false };

  let firstFit = true;
  const sync = () => {
    const items = readItems();
    items.forEach((item) => {
      const pin = pins.get(item.key);
      if (pin) paintPin(pin.el, item, spaces);
      else addPin(item);
    });
    const shown = new Set(
      items.filter((i) => (spaces ? spaceShown(i.key) : isShown(i.el))).map((i) => i.key)
    );
    pins.forEach(({ el, box }, key) => {
      const off = !shown.has(key);
      el.classList.toggle('is-dim', off);
      box.classList.toggle('is-dim', off);
      el.tabIndex = off ? -1 : 0;
      el.toggleAttribute('aria-hidden', off);
    });
    if (area.active()) return;
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
    keepClearOfBar(container);
    addLegend(map, container, fr, spaces);
    area = setupArea({
      map,
      container,
      fr,
      spaces,
      coords: () => new Map(readItems().map((i) => [i.key, [i.lng, i.lat]])),
    });
    sync();
    // Watch the lists that hold the items, wherever they are on the page.
    const watched = [
      ...readItems().map((i) => i.el),
      ...(spaces ? [...document.querySelectorAll<HTMLElement>('[data-ca-comm-space]')] : []),
    ];
    const roots = new Set(watched.map((el) => el.parentElement?.parentElement ?? document.body));
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

// Mapbox bills one map load per map started, so the map only starts when it is worth it:
//   · not for crawlers and automated browsers, which would each count as a load;
//   · not before it comes within START_MARGIN of the screen, so a visit that ends in the
//     hero costs nothing. The map sits only 30–440 px below the fold (2026-10-06), so the
//     margin stays small; on large screens the map is already in view and starts at once.
const START_MARGIN = '0px 0px 100px 0px';
const BOT =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headlesschrome|lighthouse|prerender|semrush|ahrefs|petalsearch|bytespider/i;

const whenNear = (el: HTMLElement, start: () => void) => {
  if (!('IntersectionObserver' in window)) return start();
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      start();
    },
    { rootMargin: START_MARGIN }
  );
  io.observe(el);
};

export const startMaps = () => {
  const bot = BOT.test(navigator.userAgent);
  document.querySelectorAll<HTMLElement>('[data-ca-map]').forEach((el) => {
    if (bot) return fail(el);
    whenNear(el, () => void initMap(el));
  });
};
