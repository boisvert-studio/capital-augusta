// English pass for the parts of an /en page that Webflow's localization can't reach.
//
// Webflow localizes native text elements, CMS fields and page links. Three things slip through:
//   1. Text in custom DOM elements (labels, buttons, filter options, card labels). Swapped from
//      the EN map in i18n-en.ts, keyed by the published French text.
//   2. Internal links written as URLs ("/contact", component link props, links built by
//      scripts). Given the /en prefix so a visitor stays in English.
//   3. Prices. French puts the dollar after the number ("1 450 $"); English puts it first.
//
// Runs once as soon as the bundle loads (before first paint of most of the page), then watches
// for nodes that scripts add later (Finsweet chips, contact routing notes, FAQ items).
// A no-op on French pages.

import { EN } from './i18n-en';

const PREFIX = '/en';

const isEnglish = () => (document.documentElement.lang || 'fr').toLowerCase().startsWith('en');

// ’ and ' both match, no-break and narrow spaces count as spaces, runs of space collapse.
const norm = (s: string) =>
  s
    .replace(/[’‘]/g, "'")
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const MAP = new Map(Object.entries(EN).map(([fr, en]) => [norm(fr), en]));

// Never touch text that a script or filter reads as data. Filter selects carry fs-list-field
// too, but Finsweet reads their option `value`, so their option labels can be translated.
const SKIP =
  'script,style,noscript,textarea,[fs-list-field]:not(select),[data-ca-key-field],[data-ca-i18n-skip]';

const ATTRS = ['aria-label', 'alt', 'title', 'placeholder', 'data-wait'];

const translateText = (node: Text) => {
  const raw = node.nodeValue;
  if (!raw || !raw.trim()) return;
  const en = MAP.get(norm(raw));
  if (en === undefined) return;
  // An option without a value attribute submits its label: translating it would change the value.
  const option = node.parentElement?.closest('option');
  if (option && !option.hasAttribute('value')) return;
  const lead = raw.match(/^\s*/)?.[0] ?? '';
  const trail = raw.match(/\s*$/)?.[0] ?? '';
  node.nodeValue = lead + en + trail;
};

const translateAttrs = (el: Element) => {
  ATTRS.forEach((name) => {
    const v = el.getAttribute(name);
    if (!v) return;
    const en = MAP.get(norm(v));
    if (en !== undefined) el.setAttribute(name, en);
  });
  // Submit buttons carry their label in `value`.
  if (el instanceof HTMLInputElement && el.type === 'submit') {
    const en = MAP.get(norm(el.value));
    if (en !== undefined) el.value = en;
  }
};

const localizeHref = (a: HTMLAnchorElement) => {
  const href = a.getAttribute('href');
  if (!href || !href.startsWith('/') || href.startsWith('//')) return;
  if (href === PREFIX || href.startsWith(PREFIX + '/') || href.startsWith(PREFIX + '?')) return;
  a.setAttribute('href', href === '/' ? PREFIX : PREFIX + href);
};

const walk = (root: Node) => {
  if (root.nodeType === Node.TEXT_NODE) {
    const parent = root.parentElement;
    if (parent && !parent.closest(SKIP)) translateText(root as Text);
    return;
  }
  if (!(root instanceof Element) || root.closest(SKIP)) return;

  const elements = [root, ...root.querySelectorAll('*')];
  elements.forEach((el) => {
    if (el.closest(SKIP)) return;
    translateAttrs(el);
    if (el instanceof HTMLAnchorElement) localizeHref(el);
  });

  const texts = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement && !n.parentElement.closest(SKIP)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  for (let n = texts.nextNode(); n; n = texts.nextNode()) translateText(n as Text);
};

// "1,450" followed by " $" or " $ / month" becomes "$1,450" followed by " / month".
// Runs after formatNumbers(), which writes the grouped number into [data-ca-num].
export const moveCurrency = () => {
  if (!isEnglish()) return;
  document.querySelectorAll<HTMLElement>('[data-ca-num]').forEach((num) => {
    const next = num.nextSibling;
    if (!next || num.dataset.caCur) return;
    const text = next.textContent ?? '';
    const m = text.match(/^[\s\u00a0\u202f]*\$/);
    if (!m) return;
    next.textContent = text.slice(m[0].length);
    num.textContent = '$' + (num.textContent ?? '').trim();
    num.dataset.caCur = '1';
  });
};

export const startI18n = () => {
  if (!isEnglish() || !document.body) return;
  walk(document.body);

  new MutationObserver((records) => {
    records.forEach((r) => {
      if (r.type === 'attributes') {
        const el = r.target as Element;
        if (r.attributeName === 'href' && el instanceof HTMLAnchorElement) localizeHref(el);
        else translateAttrs(el);
        return;
      }
      r.addedNodes.forEach(walk);
    });
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['href', ...ATTRS],
  });
};
