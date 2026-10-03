// Values derived on the page, which Webflow cannot compute: it counts nothing across
// collections and evaluates dates only when the site is published.
//
//   1. Available units per building, counted from the rendered unit list (archived units are
//      not rendered, so they never count). Fills card badges, the building-page badge and the
//      map pins.
//   2. Availability badge from a date, evaluated when the page is viewed.
//   3. Commercial hero stats, counted from the rendered commercial lists.
//
// Everything is read from the DOM and written back to it. Each part does nothing when its
// attributes are absent. The attribute contract is in docs/contracts.md.

import { parseEnglishDate } from './format';

const english = () => (document.documentElement.lang || 'fr').toLowerCase().startsWith('en');

const norm = (code: string | null | undefined) => (code ?? '').trim().toUpperCase();

const countBy = (selector: string, attr: string) => {
  const counts = new Map<string, number>();
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const code = norm(el.getAttribute(attr));
    counts.set(code, (counts.get(code) ?? 0) + 1);
  });
  return counts;
};

const writeText = (el: HTMLElement, text: string) => {
  if (el.textContent !== text) el.textContent = text;
};

// -- 1. Available units per building ------------------------------------------------------

const badgeText = (n: number) => {
  if (english()) return n === 0 ? 'None available' : `${n} available`;
  if (n === 0) return 'Aucun libre';
  return n === 1 ? '1 disponible' : `${n} disponibles`;
};

// A target with an empty `data-ca-count-for` counts every unit on the page: on a building
// page the unit list is already filtered to that building, so no code is needed.
const fillUnitCounts = () => {
  const counts = countBy('[data-ca-unit]', 'data-ca-unit');
  const total = [...counts.values()].reduce((a, b) => a + b, 0);

  document.querySelectorAll<HTMLElement>('[data-ca-count-for]').forEach((el) => {
    const code = norm(el.dataset.caCountFor);
    const n = code ? (counts.get(code) ?? 0) : total;
    el.dataset.count = String(n);
    el.classList.toggle('is-none', n === 0);
    el.classList.toggle('is-avail', n > 0);
    writeText(el, el.dataset.caCountFormat === 'number' ? String(n) : badgeText(n));
  });
};

// Map pins read `data-count` from their `[data-ca-map-item]`. The source is chosen on the
// map container: `data-ca-map-counts="unit"` (default when units are on the page) or "space".
const fillMapCounts = () => {
  const items = document.querySelectorAll<HTMLElement>('[data-ca-map-item]');
  if (!items.length) return;
  const mode =
    document.querySelector<HTMLElement>('[data-ca-map]')?.dataset.caMapCounts ??
    (document.querySelector('[data-ca-unit]') ? 'unit' : '');
  if (mode !== 'unit' && mode !== 'space') return;
  const counts =
    mode === 'unit'
      ? countBy('[data-ca-unit]', 'data-ca-unit')
      : countBy('[data-ca-comm-space]', 'data-ca-comm-space');
  items.forEach((el) => {
    const n = String(counts.get(norm(el.dataset.caMapItem)) ?? 0);
    if (el.dataset.count !== n) el.dataset.count = n;
  });
};

// -- 2. Availability from a date ----------------------------------------------------------

const NOW_WITHIN_DAYS = 7;
const DAY_MS = 86_400_000;

// "2026-12-05" or "2026-12-05T05:00:00.000Z" (taken as the calendar date), else the English
// text Webflow prints ("December 5, 2026").
const parseDate = (raw: string) => {
  const iso = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  return parseEnglishDate(raw);
};

const availText = (days: number) => {
  const now = days < NOW_WITHIN_DAYS;
  if (english()) return now ? 'Available now' : `Available in ${days} days`;
  return now ? 'Libre maintenant' : `Libre dans ${days} j`;
};

const fillAvailability = () => {
  const d = new Date();
  const today = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  document.querySelectorAll<HTMLElement>('[data-ca-avail]').forEach((el) => {
    // Keep the source: the text is overwritten, and a second run must read the same date.
    const raw = el.dataset.date || el.dataset.caAvailSrc || el.textContent || '';
    if (!el.dataset.date) el.dataset.caAvailSrc = raw;
    const date = parseDate(raw);
    el.classList.toggle('is-undated', !date);
    if (!date) return;
    const days = Math.round((date.getTime() - today) / DAY_MS);
    el.dataset.days = String(days);
    el.classList.toggle('is-now', days < NOW_WITHIN_DAYS);
    el.classList.toggle('is-later', days >= NOW_WITHIN_DAYS);
    writeText(el, availText(days));
  });
};

// -- 3. Commercial hero stats -------------------------------------------------------------

// Words as [French, English]. French takes the singular for 0 and 1.
type Stat = { value: number; one: [string, string]; many: [string, string] };

const fillCommercialStats = () => {
  const buildings = document.querySelectorAll<HTMLElement>('[data-ca-comm-building]');
  const spaces = document.querySelectorAll('[data-ca-comm-space]');
  const total = [...buildings].reduce((sum, el) => sum + (Number(el.dataset.count) || 0), 0);

  const stats: Record<string, Stat> = {
    'comm-total': {
      value: total,
      one: ['local commercial', 'commercial unit'],
      many: ['locaux commerciaux', 'commercial units'],
    },
    'comm-available': {
      value: spaces.length,
      one: ['disponible', 'available'],
      many: ['disponibles', 'available'],
    },
    'comm-buildings': {
      value: buildings.length,
      one: ['immeuble', 'building'],
      many: ['immeubles', 'buildings'],
    },
  };

  const en = english();
  const fmt = new Intl.NumberFormat(document.documentElement.lang || 'fr-CA');
  const word = (stat: Stat) => {
    const singular = en ? stat.value === 1 : stat.value < 2;
    return (singular ? stat.one : stat.many)[en ? 1 : 0];
  };

  document.querySelectorAll<HTMLElement>('[data-ca-stat]').forEach((el) => {
    const stat = stats[el.dataset.caStat ?? ''];
    if (stat) writeText(el, fmt.format(stat.value));
  });
  document.querySelectorAll<HTMLElement>('[data-ca-stat-label]').forEach((el) => {
    const stat = stats[el.dataset.caStatLabel ?? ''];
    if (stat) writeText(el, word(stat));
  });
};

// -- Start --------------------------------------------------------------------------------

const refresh = () => {
  fillUnitCounts();
  fillMapCounts();
  fillCommercialStats();
  fillAvailability();
};

export const startCounts = () => {
  refresh();

  // Lists can be re-rendered after load (Finsweet pagination, load more): recount when the
  // lists that hold counted items gain or lose children.
  const parents = new Set<Element>();
  document
    .querySelectorAll('[data-ca-unit], [data-ca-comm-space], [data-ca-comm-building]')
    .forEach((el) => el.parentElement && parents.add(el.parentElement));
  if (!parents.size) return;
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      refresh();
    });
  });
  parents.forEach((p) => observer.observe(p, { childList: true }));
};
