import { startMaps } from './map';

window.Webflow ||= [];
window.Webflow.push(() => {
  // Modules start here, each keyed on a data attribute.
  startMaps();
});
