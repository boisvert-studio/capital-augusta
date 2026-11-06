import type { Map as MapboxMap } from 'mapbox-gl';

import { PHONE_QUERY } from '../mobile-map';

// The card a tap on a pin opens on a touch screen, so a tap never leaves the map by surprise. It
// docks at the bottom of the map's visible part and the whole card opens the building.
//
// Everything it shows is read from the building's own card on the page: the same translation,
// the same live count, the same photo. Commercial items have no photo on the page, so their
// card is text only.
//
// It lives on <body> rather than inside the map: on a phone the list sheet sits above the map.
// That is also why a tap beside the card or a page scroll has to close it from here.

export type PinCardItem = { key: string; name: string; href: string; el: HTMLElement };

type Options = {
  map: MapboxMap;
  container: HTMLElement;
  fr: boolean;
  linkLabel: (item: PinCardItem) => string;
  // The text block, built from the building's card.
  facts: (item: PinCardItem) => HTMLElement;
  pinOf: (key: string) => HTMLElement | undefined;
  onSelect: (key: string | null) => void;
};

const CSS = `
.ca-pcard{position:fixed;z-index:45;box-sizing:border-box;overflow:hidden;border-radius:14px;background:#fff;color:#161C32;
  box-shadow:0 10px 30px rgba(22,28,50,.38);animation:ca-pcard-in .22s cubic-bezier(.22,1,.36,1)}
.ca-pcard[hidden]{display:none}
.ca-pcard a.ca-pcard_link,.ca-pcard a.ca-pcard_link:hover{display:flex;align-items:stretch;color:inherit;text-decoration:none;
  font:400 13px/1.35 Manrope,system-ui,sans-serif}
.ca-pcard a.ca-pcard_link:active{background:#F6F4EE}
.ca-pcard a.ca-pcard_link:focus-visible{outline:2px solid #D1AA41;outline-offset:-2px;border-radius:14px}
.ca-pcard_photo{position:relative;flex:0 0 104px;background:#E3E5EC}
.ca-pcard_photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ca-pcard_text{flex:1;min-width:0;padding:11px 14px 12px}
.ca-pcard_text .ca-tip_title{padding-right:22px;font-size:16px}
.ca-pcard_text .ca-tip_foot{flex-wrap:wrap;gap:0 10px;margin-top:5px;padding-top:5px}
.ca-pcard_go{display:block;margin-top:5px;font-weight:700}
.ca-pcard_close{position:absolute;top:0;right:0;width:44px;height:44px;padding:0;border:0;background:none;color:#5A6074;
  font:400 22px/1 Manrope,system-ui,sans-serif;cursor:pointer}
.ca-pcard_close:focus-visible{outline:2px solid #D1AA41;outline-offset:-4px;border-radius:50%}
[data-ca-map].ca-pcard-on .mapboxgl-ctrl-bottom-left,[data-ca-map].ca-pcard-on .mapboxgl-ctrl-bottom-right{bottom:max(var(--ca-sheet-peek,0px),var(--ca-pcard-lift))!important}
@keyframes ca-pcard-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.ca-pcard{animation:none}}
`;

const EDGE_PX = 12;
const MAX_WIDTH_PX = 420;
// Clear space kept between the selected pin and the card.
const PIN_CLEARANCE_PX = 14;
// A page scroll past this closes the card. Less than this is a finger settling, not a scroll.
const SCROLL_TOLERANCE_PX = 24;
const RESTORE_DELAY_MS = 200;

export const createPinCard = ({
  map,
  container,
  fr,
  linkLabel,
  facts,
  pinOf,
  onSelect,
}: Options) => {
  document.head.append(Object.assign(document.createElement('style'), { textContent: CSS }));

  const card = document.createElement('div');
  card.className = 'ca-pcard';
  card.hidden = true;
  card.setAttribute('role', 'group');
  card.setAttribute('data-ca-i18n-skip', '');

  const link = document.createElement('a');
  link.className = 'ca-pcard_link';
  const photo = document.createElement('span');
  photo.className = 'ca-pcard_photo';
  const text = document.createElement('span');
  text.className = 'ca-pcard_text';
  link.append(photo, text);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'ca-pcard_close';
  closeButton.setAttribute('aria-label', fr ? 'Fermer' : 'Close');
  closeButton.textContent = '×';
  card.append(link, closeButton);
  document.body.append(card);

  let selected: string | null = null;
  let current: PinCardItem | null = null;
  let leftWith: PinCardItem | null = null;
  let scrollAtOpen = 0;
  let widthAtOpen = 0;

  const close = (returnFocus = false) => {
    if (selected === null) return;
    const key = selected;
    selected = null;
    card.hidden = true;
    container.classList.remove('ca-pcard-on');
    onSelect(null);
    if (returnFocus) pinOf(key)?.focus({ preventScroll: true });
  };

  // On a phone, at the bottom of the screen: in landscape the map is a short strip above the list
  // and a card on it would leave no map to see. Elsewhere, inside the part of the map on screen.
  const place = () => {
    const box = container.getBoundingClientRect();
    card.style.left = `${box.left + EDGE_PX}px`;
    card.style.width = `${Math.min(box.width - EDGE_PX * 2, MAX_WIDTH_PX)}px`;
    const phone = window.matchMedia(PHONE_QUERY).matches;
    const below = phone ? 0 : Math.max(0, window.innerHeight - box.bottom);
    card.style.bottom = `calc(${below + EDGE_PX}px + env(safe-area-inset-bottom, 0px))`;
  };

  const fill = (item: PinCardItem) => {
    const block = facts(item);
    block.removeAttribute('aria-hidden');
    const go = document.createElement('span');
    go.className = 'ca-pcard_go';
    go.textContent = `${linkLabel(item)} →`;
    block.append(go);
    if (text.textContent !== block.textContent) text.replaceChildren(block);
  };

  const showPhoto = (item: PinCardItem) => {
    const source = item.el.querySelector('img');
    const src = source?.currentSrc || source?.src || '';
    photo.hidden = !src;
    if (!src) return photo.replaceChildren();
    // A new element each time: reusing one keeps the last building's photo up until this one loads.
    const img = new Image();
    img.alt = '';
    img.src = src;
    photo.replaceChildren(img);
  };

  // The Mapbox logo and credits have to stay visible, so they move above the card.
  const liftCredits = () => {
    const lift = container.getBoundingClientRect().bottom - card.getBoundingClientRect().top;
    container.style.setProperty('--ca-pcard-lift', `${Math.round(lift) + 4}px`);
    container.classList.add('ca-pcard-on');
  };

  // The tapped pin has to stay visible, so the map moves just enough if the card landed on it,
  // and never so far that the pin leaves the top of the map.
  const keepPinClear = (key: string) => {
    const pin = pinOf(key);
    if (!pin) return;
    const at = pin.getBoundingClientRect();
    const bar = document.querySelector('[data-ca-bar]')?.getBoundingClientRect().bottom ?? 0;
    const top = Math.max(container.getBoundingClientRect().top, bar);
    const wanted = at.bottom + PIN_CLEARANCE_PX - card.getBoundingClientRect().top;
    const push = Math.min(wanted, at.top - top - PIN_CLEARANCE_PX);
    if (push <= 0) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.panBy([0, push], { duration: still ? 0 : 260 });
  };

  const open = (item: PinCardItem) => {
    if (selected === item.key) return;
    const swap = selected !== null;
    selected = item.key;
    current = item;
    onSelect(item.key);
    link.href = item.href;
    card.setAttribute('aria-label', item.name);
    fill(item);
    showPhoto(item);
    if (!swap) {
      scrollAtOpen = window.scrollY;
      widthAtOpen = window.innerWidth;
    }
    place();
    card.hidden = false;
    liftCredits();
    keepPinClear(item.key);
    link.focus({ preventScroll: true });
  };

  // A count can arrive after the card opened.
  const refresh = (item: PinCardItem) => {
    if (selected === item.key) fill(item);
  };

  closeButton.addEventListener('click', () => close(true));
  // Back from the building. Restoring the page scrolls it, which closes the card, so it opens
  // again once that has settled. Only for a page kept in the browser's cache: a page that reloads
  // starts over.
  link.addEventListener('click', () => {
    leftWith = current;
  });
  window.addEventListener('pageshow', (e) => {
    const item = leftWith;
    leftWith = null;
    if (!e.persisted || !item) return;
    window.setTimeout(() => {
      close();
      open(item);
    }, RESTORE_DELAY_MS);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close(true);
  });
  // A move the visitor made carries an originalEvent; the nudge in keepPinClear doesn't.
  map.on('movestart', (e: { originalEvent?: Event }) => {
    if (e.originalEvent) close();
  });
  window.addEventListener(
    'scroll',
    () => {
      if (Math.abs(window.scrollY - scrollAtOpen) > SCROLL_TOLERANCE_PX) close();
    },
    { passive: true }
  );
  window.addEventListener('resize', () => {
    if (selected === null) return;
    if (window.innerWidth !== widthAtOpen) return close();
    place();
    liftCredits();
  });
  // Filters, the sheet, the menu. A tap inside the map is the map's own to decide.
  document.addEventListener(
    'click',
    (e) => {
      if (!(e.target instanceof Node)) return;
      if (!card.contains(e.target) && !container.contains(e.target)) close();
    },
    true
  );

  return { open, close, refresh };
};
