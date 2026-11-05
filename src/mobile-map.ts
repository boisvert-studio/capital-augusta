import { navHeight } from './nav-height';

// Phone layout of the discovery pages (Home and Commercial). Self-starts on `[data-ca-bar]`.
//
// The map stays pinned under the docked strip and the list slides over it as a sheet. The sheet
// moves with the page's own scroll, so there is no drag code to fight the browser. The filters
// open in a tray from a « Filtres » button on the strip. Tablet and desktop are untouched: every
// element made here is hidden above PHONE_QUERY, and the layout itself lives in the site head so
// it is right at first paint (see docs/mobile-map.css). Filtering stays Finsweet's job; the tray
// only shows the real form.

export const PHONE_QUERY = '(max-width: 767px)';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
// Keep both in step with --ca-strip-h and --ca-sheet-peek in docs/mobile-map.css.
const STRIP_PX = 54;
export const SHEET_PEEK_PX = 86;
// How much map stays visible above the raised sheet.
const RAISED_GAP_PX = 12;
// Past the raised position, how far before the « Carte » button appears.
const FAB_AFTER_PX = 160;
const RAISED_TOLERANCE_PX = 40;

const phone = () => window.matchMedia(PHONE_QUERY).matches;
const behavior = (): ScrollBehavior =>
  window.matchMedia(REDUCED_QUERY).matches ? 'auto' : 'smooth';

// Where the map first sits flush under the strip. The strip's own height leaves the target within
// the bar's docking distance (filters-bar.ts), so the bar stays docked at this exact position.
const mapRestY = (grid: HTMLElement) =>
  grid.getBoundingClientRect().top + window.scrollY - navHeight() - STRIP_PX;

const goTo = (top: number) => window.scrollTo({ top, behavior: behavior() });

// For the bar's « Voir sur la carte ». False when the phone layout isn't in play.
export const scrollToPhoneMap = () => {
  const grid = document.querySelector<HTMLElement>('.discovery_grid');
  if (!phone() || !grid) return false;
  goTo(mapRestY(grid));
  return true;
};

const make = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
  const el = document.createElement(tag);
  el.className = className;
  // Text here is already in the page's language.
  el.setAttribute('data-ca-i18n-skip', '');
  if (el instanceof HTMLButtonElement) el.type = 'button';
  return el;
};

export const startMobileMap = () => {
  const bar = document.querySelector<HTMLElement>('[data-ca-bar]');
  const row = bar?.querySelector<HTMLElement>('.bar_row');
  const tray = bar?.querySelector<HTMLElement>('.bar_form-block');
  const grid = document.querySelector<HTMLElement>('.discovery_grid');
  const list = document.querySelector<HTMLElement>('.discovery_list');
  const map = document.querySelector<HTMLElement>('.discovery_map');
  if (!bar || !row || !tray || !grid || !list || !map) return;

  const fr = !(document.documentElement.lang || 'fr').toLowerCase().startsWith('en');
  const t = fr
    ? { filters: 'Filtres', close: 'Fermer', clear: 'Tout effacer', show: 'Voir', map: 'Carte' }
    : { filters: 'Filters', close: 'Close', clear: 'Clear all', show: 'Show', map: 'Map' };
  const selects = [...bar.querySelectorAll<HTMLSelectElement>('select[fs-list-field]')];
  const count = bar.querySelector<HTMLElement>('.bar_count');

  // -- Tray -------------------------------------------------------------------------------

  const openBtn = make('button', 'ca-fbtn');
  openBtn.setAttribute('aria-haspopup', 'dialog');
  openBtn.setAttribute('aria-expanded', 'false');
  row.prepend(openBtn);

  const scrim = make('div', 'ca-scrim');
  bar.append(scrim);

  const top = make('div', 'ca-traytop');
  top.textContent = t.filters;
  const closeBtn = make('button', 'ca-trayclose');
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', t.close);
  top.append(closeBtn);
  tray.prepend(top);

  const foot = make('div', 'ca-trayfoot');
  const clearBtn = make('button', 'ca-clear');
  clearBtn.textContent = t.clear;
  const goBtn = make('button', 'ca-go');
  foot.append(clearBtn, goBtn);
  tray.append(foot);

  const setOpen = (open: boolean) => {
    if (bar.classList.contains('ca-open') === open) return;
    bar.classList.toggle('ca-open', open);
    document.documentElement.classList.toggle('ca-tray-open', open);
    openBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      tray.setAttribute('role', 'dialog');
      tray.setAttribute('aria-modal', 'true');
      tray.setAttribute('aria-label', t.filters);
      closeBtn.focus({ preventScroll: true });
    } else {
      tray.removeAttribute('role');
      tray.removeAttribute('aria-modal');
      tray.removeAttribute('aria-label');
      openBtn.focus({ preventScroll: true });
    }
  };

  openBtn.addEventListener('click', () => setOpen(true));
  scrim.addEventListener('click', () => setOpen(false));
  closeBtn.addEventListener('click', () => setOpen(false));
  // Crossing into the tablet layout would strand an open tray.
  window.matchMedia(PHONE_QUERY).addEventListener('change', () => setOpen(false));

  tray.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key !== 'Tab' || !bar.classList.contains('ca-open')) return;
    const stops = [closeBtn, ...selects, clearBtn, goBtn];
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  clearBtn.addEventListener('click', () => {
    // Finsweet's own button when it is on the page, since it also clears the map-area filter.
    const real =
      bar.querySelector<HTMLElement>('[fs-list-element="clear"]') ??
      bar.querySelector<HTMLElement>('[data-ca-area-tags] .chip:not([data-ca-area-chip])');
    real?.click();
  });

  // -- Sheet ------------------------------------------------------------------------------

  const handle = make('button', 'ca-shead');
  handle.append(document.createElement('i'), document.createElement('span'));
  list.prepend(handle);

  const fab = make('button', 'ca-fab');
  fab.textContent = t.map;
  document.body.append(fab);

  const raisedY = () => mapRestY(grid) + map.offsetHeight - SHEET_PEEK_PX - RAISED_GAP_PX;
  const isRaised = () => window.scrollY >= raisedY() - RAISED_TOLERANCE_PX;

  handle.addEventListener('click', () => goTo(isRaised() ? mapRestY(grid) : raisedY()));
  fab.addEventListener('click', () => goTo(mapRestY(grid)));

  goBtn.addEventListener('click', () => {
    setOpen(false);
    // Deep in the list, a shorter result would leave the visitor looking at nothing.
    if (window.scrollY > raisedY()) goTo(raisedY());
  });

  let queued = false;
  const onScroll = () => {
    queued = false;
    if (!phone()) return;
    handle.setAttribute('aria-expanded', String(isRaised()));
    const past = window.scrollY > raisedY() + FAB_AFTER_PX;
    fab.classList.toggle('is-on', past && grid.getBoundingClientRect().bottom > window.innerHeight);
  };
  const queueScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(onScroll);
  };
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll, { passive: true });
  onScroll();

  // -- Labels ------------------------------------------------------------------------------

  // The bar's own count and word: right in both languages and for « local / locaux ».
  const sync = () => {
    const text = (count?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const label = handle.querySelector('span');
    if (label) label.textContent = text;
    goBtn.textContent = text ? `${t.show} ${text}` : t.show;
    const active = selects.filter((s) => s.value).length;
    openBtn.textContent = t.filters;
    if (active) {
      const badge = document.createElement('b');
      badge.textContent = String(active);
      openBtn.append(badge);
    }
  };
  sync();
  if (count) {
    new MutationObserver(sync).observe(count, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
  // Finsweet resets selects without a change event when its clear button runs.
  bar.addEventListener('change', sync);
  bar.addEventListener('input', sync);
  clearBtn.addEventListener('click', () => requestAnimationFrame(sync));
};
