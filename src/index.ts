import { startCounts } from './counts';
import { startFiltersBar } from './filters-bar';
import { formatDates, formatNumbers } from './format';
import { startHeroRotators } from './hero-rotator';
import { startKeys } from './keys';
import { startMaps } from './map';

window.Webflow ||= [];
window.Webflow.push(() => {
  // Modules start here, each keyed on a data attribute and a no-op when it is absent.
  formatNumbers();
  formatDates();
  startKeys(); // filter keys first, so Finsweet sees them
  startCounts(); // before the map, so pins find their data-count on first read
  startMaps();
  startFiltersBar();
  startHeroRotators();
});
