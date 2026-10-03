// Hero background crossfade. Self-starts on `[data-ca-hero]`.
//
//   <div data-ca-hero [data-ca-hero-interval="6000"]>
//     <img data-ca-hero-img class="is-on" …> <img data-ca-hero-img …> …
//   </div>
//
// Only one image carries `is-on`; CSS owns the crossfade (opacity transition). Not a carousel:
// nothing to operate. It runs only while the hero is on screen and the tab is visible, and it
// stays still for visitors who prefer reduced motion (the first image stays shown).

const ON = 'is-on';
const DEFAULT_INTERVAL_MS = 6000;
const VISIBLE_RATIO = 0.15;

const initHero = (hero: HTMLElement) => {
  const imgs = [...hero.querySelectorAll<HTMLElement>('[data-ca-hero-img]')];
  if (imgs.length < 2) return;

  // The first image is shown before any script runs; make sure exactly one is on.
  let current = Math.max(
    0,
    imgs.findIndex((img) => img.classList.contains(ON))
  );
  imgs.forEach((img, i) => img.classList.toggle(ON, i === current));

  const interval = Number(hero.dataset.caHeroInterval) || DEFAULT_INTERVAL_MS;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer = 0;
  let onScreen = false;

  const tick = () => {
    imgs[current].classList.remove(ON);
    current = (current + 1) % imgs.length;
    imgs[current].classList.add(ON);
  };

  const sync = () => {
    const shouldRun = onScreen && !document.hidden && !reduced.matches;
    if (shouldRun && !timer) timer = window.setInterval(tick, interval);
    if (!shouldRun && timer) {
      window.clearInterval(timer);
      timer = 0;
    }
  };

  new IntersectionObserver(
    (entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      sync();
    },
    { threshold: VISIBLE_RATIO }
  ).observe(hero);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
};

export const startHeroRotators = () => {
  document.querySelectorAll<HTMLElement>('[data-ca-hero]').forEach(initHero);
};
