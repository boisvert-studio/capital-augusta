# Data-attribute contracts

Every attribute the bundle reads or writes, per module. The Designer builder applies these in Webflow (Element settings > Custom attributes). All modules start from `src/index.ts` inside `Webflow.push` and do nothing when their attributes are absent. Page language comes from `<html lang>`: `en*` is English, anything else French.

Codes (`CODE` below) are the building code from the CMS, matched case-insensitively and trimmed. Bind the same CMS field everywhere a code appears.

## format.ts

| Attribute | On | Effect |
|---|---|---|
| `data-ca-num` | any text element holding an integer | Regroups thousands for the page language (`1 380` / `1,380`). Numbers in filter values must not carry this. |
| `data-ca-date` | any text element holding a Webflow-printed date | Rewrites an English-month date in the page language (`5 décembre 2026`). |

## map/

| Attribute | On | Effect |
|---|---|---|
| `data-ca-map` | map container (empty block with a height) | Starts the map. Hidden with class `is-map-fallback` if Mapbox, the token or the style fails. |
| `data-ca-map-counts` | the same container | Optional: `unit` or `space`. Source of the pin counts (see counts.ts). Default: `unit` when `[data-ca-unit]` exists on the page, else no counts. |
| `data-ca-map-item` | one per building in the rendered list, value `CODE` (a link, or a wrapper holding one) | One pin per item. The link is the pin's destination. |
| `data-lat`, `data-lng` | the same item | Coordinates (decimal comma tolerated). Items without both are skipped. |
| `data-name` | the same item | Pin label (falls back to the item's text). |
| `data-count` | the same item | Read, written by counts.ts. Shown in the pin; `0` makes a hollow ring and an "aucun logement disponible" label. |

Config: `window.CA_CONFIG.mapboxToken` in site head code. The map dims a pin when its item is hidden (display none, `hidden`, removed), so any filter library works.

**Space mode** (`data-ca-map-counts="space"`, the commercial page): the building items can sit in a hidden list. A pin is shown while at least one shown `[data-ca-comm-space]` carries its item key, so it follows the filtered space cards. Labels count spaces (« 1 local disponible », « aucun local disponible »). Each pin carries `data-key` (the item key) and takes class `is-active` for card-hover highlighting.

## counts.ts

Available units per building. Count source: `data-ca-unit`. Archived units are not rendered, so they do not count. Items are counted by presence in the DOM, hidden or not.

| Attribute | On | Effect |
|---|---|---|
| `data-ca-unit` | one per rendered unit, value `CODE` of its building | Counted. On a building page, where the list is already filtered to that building, the value may be empty. The list may sit in a hidden wrapper. |
| `data-ca-count-for` | a badge element, value `CODE` (empty = all `data-ca-unit` on the page) | Text becomes `N disponibles` / `1 disponible` / `Aucun libre` (EN: `N available` / `None available`). Writes `data-count`, class `is-avail` (N above 0) or `is-none` (0). |
| `data-ca-count-format` | the same badge | `number`: write the bare number (for the building-page section badge). |
| `data-ca-map-item` + `data-count` | see map/ | Written for every map item from the count of its `CODE`, including 0. |

Availability from a date, evaluated at view time.

| Attribute | On | Effect |
|---|---|---|
| `data-ca-avail` | a text element holding the available-from date (Webflow date binding, English text) | Text becomes `Libre maintenant` (date past or under 7 days away) or `Libre dans N j`; EN `Available now` / `Available in N days`. Writes `data-days`, class `is-now` or `is-later`; `is-undated` if the date does not parse (text left alone). |
| `data-date` | the same element | Optional ISO date (`2026-12-05`, or a full timestamp: its calendar date is used). Preferred over the text when you bind the date to an attribute. |

Commercial stats.

| Attribute | On | Effect |
|---|---|---|
| `data-ca-comm-building` | one per commercial building in the rendered list | Counted for `comm-buildings`. |
| `data-count` | the same item | That building's commercial unit count (bind the CMS field); summed for `comm-total`. |
| `data-ca-comm-space` | one per available commercial space; value `CODE` of its building if it feeds map counts (`data-ca-map-counts="space"`) | Counted for `comm-available`. |
| `data-ca-stat` | a stat number element | Value `comm-total`, `comm-available` or `comm-buildings`. Writes the number, grouped for the language. |
| `data-ca-stat-label` | the stat's label element | Same three values. Writes the singular or plural word (FR singular for 0 and 1; EN for 1 only): `local commercial` / `locaux commerciaux`, `disponible` / `disponibles`, `immeuble` / `immeubles`. |

The module recounts when items are added to or removed from the list that holds them (Finsweet pagination or load more).

## filters-bar.ts

Styles: `docs/filters-bar.css` (lives in Webflow; read it for the classes and the state the script publishes).

| Attribute | On | Effect |
|---|---|---|
| `data-ca-bar` | the bar, `position: fixed` | Script writes inline `top`, `--m`, `--cta`, `--meta` and class `is-docked`. One bar per page. |
| `data-ca-bar-slot` | empty block in the hero | Reserves the pill's resting place; the bar follows it until it docks. Its height must equal the pill's. |
| `data-ca-bar-target` | the discovery section | Docking is tied to this section reaching the nav. Also the CTA's scroll destination. Without it, docking follows the slot. |
| `data-ca-bar-cta` | inside the bar | Click scrolls to the target (smooth unless reduced motion). Gets `inert` when faded out. |
| `data-ca-bar-meta` | inside the bar | Count and chips; gets `inert` until it fades in. |
| `data-ca-nav` | the pinned nav | Optional: its height is the dock offset when `--ca-nav-h` is not set on `:root` (fallback 72px). |

Snaps (no easing) under 900px or with `prefers-reduced-motion`.

## hero-rotator.ts

| Attribute | On | Effect |
|---|---|---|
| `data-ca-hero` | the hero background container | Starts the crossfade when it holds 2+ images. |
| `data-ca-hero-img` | each image inside it | Exactly one carries class `is-on` (put it on the first in the Designer so no-JS shows it; the script adds it if missing). CSS owns the fade (opacity transition on `is-on`). |
| `data-ca-hero-interval` | the container | Optional milliseconds per image (default 6000). |

Runs only while the hero is at least 15% visible and the tab is visible; still under reduced motion.

## keys.ts

Filter keys that cannot come from a nested list (Webflow allows two nested lists per page; the building cards use both for amenities). A flat hidden list provides them instead.

| Attribute | On | Effect |
|---|---|---|
| `data-ca-key-for` | one item per key in a flat hidden collection list, value `CODE` | Its text is copied into the matching card as `<span fs-list-field="FIELD">value</span>`. |
| `data-ca-key-field` | the same item | The Finsweet field name, e.g. `type`. |
| `data-ca-keys` | hidden container inside each card, value `CODE` | Receives one span per field with the values joined by spaces (`1½ 3½`): Finsweet reads only the first element of a field outside a nested list, so the matching select needs `fs-list-operator="contain"`. If Finsweet has already started, its list module is restarted. |
