import type { StyleSpecification } from 'mapbox-gl';

import { EXTRA_LAYERS, METRO_SOURCE } from './layers';

const NAVY = '#161C32';

// Navy basemap drawn from Mapbox Streets v8. Streets come in three tiers (minor, mid, major)
// so the hierarchy reads at a glance; all of them stay quieter than the building pins.
export const MAP_STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
  sources: {
    mb: { type: 'vector', url: 'mapbox://mapbox.mapbox-streets-v8' },
    metro: METRO_SOURCE,
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': NAVY } },
    {
      id: 'park',
      type: 'fill',
      source: 'mb',
      'source-layer': 'landuse',
      filter: [
        'match',
        ['get', 'class'],
        ['park', 'grass', 'cemetery', 'wood', 'scrub'],
        true,
        false,
      ],
      paint: { 'fill-color': '#1B2340', 'fill-opacity': 0.7 },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'mb',
      'source-layer': 'water',
      paint: { 'fill-color': '#0E1226' },
    },
    {
      id: 'road-path',
      type: 'line',
      source: 'mb',
      'source-layer': 'road',
      filter: ['match', ['get', 'class'], ['path', 'pedestrian'], true, false],
      paint: {
        'line-color': 'rgba(255,255,255,0.05)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.3, 17, 1.2],
      },
    },
    {
      id: 'road-minor',
      type: 'line',
      source: 'mb',
      'source-layer': 'road',
      filter: ['match', ['get', 'class'], ['street', 'street_limited', 'service'], true, false],
      paint: {
        'line-color': 'rgba(110,139,214,0.34)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.35, 16, 2.2],
      },
    },
    {
      id: 'road-mid',
      type: 'line',
      source: 'mb',
      'source-layer': 'road',
      filter: ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary'], true, false],
      paint: {
        'line-color': 'rgba(232,200,106,0.42)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.7, 16, 3.2],
      },
    },
    {
      id: 'road-major',
      type: 'line',
      source: 'mb',
      'source-layer': 'road',
      filter: ['match', ['get', 'class'], ['motorway', 'trunk'], true, false],
      paint: {
        'line-color': 'rgba(209,170,65,0.62)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.1, 16, 4.4],
      },
    },
    // The road layer also names sidewalks and crossings, so labels need an explicit class
    // allow-list or each street name prints two or three times along its own pavement.
    {
      id: 'road-labels',
      type: 'symbol',
      source: 'mb',
      'source-layer': 'road',
      minzoom: 12.5,
      filter: [
        'all',
        ['has', 'name'],
        [
          'match',
          ['get', 'class'],
          ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'street', 'street_limited'],
          true,
          false,
        ],
      ],
      layout: {
        'text-field': ['get', 'name'],
        'symbol-placement': 'line',
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 13, 9.5, 17, 12.5],
        'text-letter-spacing': 0.04,
        'text-max-angle': 38,
        'symbol-spacing': 260,
        'text-padding': 2,
      },
      paint: {
        'text-color': 'rgba(255,255,255,0.58)',
        'text-halo-color': NAVY,
        'text-halo-width': 1.4,
      },
    },
    ...EXTRA_LAYERS,
    {
      id: 'place-labels',
      type: 'symbol',
      source: 'mb',
      'source-layer': 'place_label',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, 9.5, 14, 13],
        'text-letter-spacing': 0.14,
        'text-transform': 'uppercase',
        'text-max-width': 7,
      },
      paint: {
        'text-color': 'rgba(255,255,255,0.46)',
        'text-halo-color': NAVY,
        'text-halo-width': 1.2,
      },
    },
  ],
};
