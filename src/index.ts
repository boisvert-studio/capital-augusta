import { formatDates, formatNumbers } from './format';
import { startMaps } from './map';

window.Webflow ||= [];
window.Webflow.push(() => {
  // Modules start here, each keyed on a data attribute.
  formatNumbers();
  formatDates();
  startMaps();
});
