// Filter bar that morphs on scroll. Self-starts on `[data-ca-bar]`.
//
//   [data-ca-bar]          the bar, position:fixed (CSS owns the look; see docs/filters-bar.css)
//   [data-ca-bar-slot]     empty in-flow box in the hero that reserves the resting pill's place
//   [data-ca-bar-target]   the discovery section the bar governs
//   [data-ca-bar-cta]      optional: scrolls to the target; fades out as the bar docks
//   [data-ca-bar-meta]     optional: count and chips; fade in once docked
//
// At rest the bar sits in the slot as a rounded pill and rides up with the page. When the
// target comes within DOCK_ZONE_PX of the nav it unfolds into a full-width strip under the nav.
// The script only publishes state: `top` (px), `--m` (morph 0 to 1), `--cta`, `--meta`, and
// the class `is-docked`. All visuals interpolate in CSS from those values.
//
// Under 900px, or with reduced motion, it snaps between the two states instead of easing.
// The nav height comes from the `--ca-nav-h` custom property on <html>, else from the height
// of `[data-ca-nav]`, else 72px.

const DOCK_ZONE_PX = 110;
const DOCKED_AT = 0.985;
const FALLBACK_NAV_PX = 72;
const SNAP_QUERY = '(max-width: 900px)';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

const navHeight = () => {
  const fromCss = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--ca-nav-h')
  );
  if (fromCss > 0) return fromCss;
  const nav = document.querySelector<HTMLElement>('[data-ca-nav]');
  return nav?.offsetHeight || FALLBACK_NAV_PX;
};

// Controls that are faded out must also leave the tab order.
const setInert = (el: HTMLElement | null, inert: boolean) => {
  if (el && el.inert !== inert) el.inert = inert;
};

const initBar = (
  bar: HTMLElement,
  slot: HTMLElement,
  target: HTMLElement | null,
  cta: HTMLElement | null,
  meta: HTMLElement | null
) => {
  const snapMq = window.matchMedia(SNAP_QUERY);
  const reducedMq = window.matchMedia(REDUCED_QUERY);

  const update = () => {
    const nav = navHeight();
    const rest = slot.getBoundingClientRect().top;
    const gap = (target ? target.getBoundingClientRect().top : rest) - nav;

    let m = clamp01((DOCK_ZONE_PX - gap) / DOCK_ZONE_PX);
    if (snapMq.matches || reducedMq.matches) m = gap <= DOCK_ZONE_PX / 2 ? 1 : 0;

    // Staggered crossfade: the CTA is gone before the count and chips appear.
    const ctaOpacity = Math.max(0, 1 - m / 0.5);
    const metaOpacity = Math.max(0, (m - 0.5) / 0.5);

    bar.style.top = `${Math.max(nav, rest)}px`;
    bar.style.setProperty('--m', m.toFixed(4));
    bar.style.setProperty('--cta', ctaOpacity.toFixed(4));
    bar.style.setProperty('--meta', metaOpacity.toFixed(4));
    bar.classList.toggle('is-docked', m > DOCKED_AT);
    setInert(cta, ctaOpacity === 0);
    setInert(meta, metaOpacity === 0);
  };

  let frame = 0;
  const queue = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  // Images and fonts move the slot after first paint.
  window.addEventListener('load', queue);

  cta?.addEventListener('click', (e) => {
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reducedMq.matches ? 'auto' : 'smooth' });
  });

  update();
};

export const startFiltersBar = () => {
  const bar = document.querySelector<HTMLElement>('[data-ca-bar]');
  const slot = document.querySelector<HTMLElement>('[data-ca-bar-slot]');
  if (!bar || !slot) return;
  initBar(
    bar,
    slot,
    document.querySelector<HTMLElement>('[data-ca-bar-target]'),
    bar.querySelector<HTMLElement>('[data-ca-bar-cta]'),
    bar.querySelector<HTMLElement>('[data-ca-bar-meta]')
  );
};
