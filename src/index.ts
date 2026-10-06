import { startCounts } from './counts';
import { startFiltersBar } from './filters-bar';
import { formatDates, formatNumbers } from './format';
import { startHeroRotators } from './hero-rotator';
import { moveCurrency, startI18n } from './i18n';
import { startKeys } from './keys';
import { startMaps } from './map';

// English pages: swap interface text now, before Webflow's ready hook, so French doesn't flash.
startI18n();

window.Webflow ||= [];
window.Webflow.push(() => {
  // Modules start here, each keyed on a data attribute and a no-op when it is absent.
  formatNumbers();
  moveCurrency(); // after formatNumbers, so the $ lands in front of the grouped number
  formatDates();
  startKeys(); // filter keys first, so Finsweet sees them
  startCounts(); // before the map, so pins find their data-count on first read
  startMaps();
  startFiltersBar();
  startHeroRotators();
});
