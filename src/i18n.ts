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

// The service-request portal has an English side; nav, footer and FAQ links all point at French.
const FRESHDESK_FR = 'serviceaugustacapital.freshdesk.com/fr/';
const FRESHDESK_EN = 'serviceaugustacapital.freshdesk.com/en/';

// The city retired its collection tool for one page with no English version. The building
// template's English link is a locale override the API can't reach, so it is corrected here.
const OLD_COLLECTES = 'servicesenligne2.ville.montreal.qc.ca/sel/infocollectes';

const localizeHref = (a: HTMLAnchorElement) => {
  const href = a.getAttribute('href');
  if (href?.includes(FRESHDESK_FR)) {
    a.setAttribute('href', href.replace(FRESHDESK_FR, FRESHDESK_EN));
    return;
  }
  if (href?.includes(OLD_COLLECTES)) {
    a.setAttribute('href', 'https://montreal.ca/info-collectes');
    return;
  }
  if (!href || !href.startsWith('/') || href.startsWith('//')) return;
  // Locale switcher links (and any explicit alternate) already point at their own language.
  if (a.hasAttribute('hreflang')) return;
  if (href === PREFIX || href.startsWith(PREFIX + '/') || href.startsWith(PREFIX + '?')) return;
  a.setAttribute('href', href === '/' ? PREFIX : PREFIX + href);
};

// A mailto subject is part of the href, so the text pass never sees it.
const localizeMailto = (a: HTMLAnchorElement) => {
  const href = a.getAttribute('href');
  if (!href?.startsWith('mailto:')) return;
  const m = href.match(/([?&]subject=)([^&]*)/);
  if (!m) return;
  const en = MAP.get(norm(decodeURIComponent(m[2])));
  if (en !== undefined) a.setAttribute('href', href.replace(m[0], m[1] + encodeURIComponent(en)));
};

// The CMS floor value follows a « · floor » label, which reads « · floor Ground » in English.
// Ground and basement take the word order English uses; numbered floors stay « · floor 2 ».
const FLOOR_PHRASES: Record<string, string> = { Ground: 'ground floor', Basement: 'basement' };

const phraseFloors = (root: Element) => {
  const sel = '[data-cc="etage"],[data-cs="etage"]';
  const els = root.matches(sel) ? [root] : [...root.querySelectorAll(sel)];
  els.forEach((el) => {
    const phrase = FLOOR_PHRASES[norm(el.textContent ?? '')];
    const label = el.previousSibling;
    if (!phrase || !label || !/floor$/.test(norm(label.textContent ?? ''))) return;
    label.textContent = (label.textContent ?? '').replace(/floor\s*$/, '');
    el.textContent = phrase;
  });
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
    if (el instanceof HTMLAnchorElement) {
      localizeHref(el);
      localizeMailto(el);
    }
  });

  const texts = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement && !n.parentElement.closest(SKIP)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  for (let n = texts.nextNode(); n; n = texts.nextNode()) translateText(n as Text);
  phraseFloors(root);
};

// Breadcrumb structured data is one static block per template, so /en pages carried French names
// and French URLs. Rewritten here: names from the EN map, URLs given the /en prefix.
const enUrl = (value: string) => {
  try {
    const url = new URL(value, location.origin);
    if (url.pathname === PREFIX || url.pathname.startsWith(PREFIX + '/')) return value;
    url.pathname = url.pathname === '/' ? PREFIX : PREFIX + url.pathname;
    return url.href;
  } catch {
    return value;
  }
};

const CRUMBS: Record<string, string> = {
  Accueil: 'Home',
  Immeubles: 'Buildings',
  'À propos': 'About',
  Emplois: 'Careers',
  Locataires: 'Resident hub',
  'Politique de confidentialité': 'Privacy policy',
};

type Crumb = { name?: string; item?: string | { '@id'?: string } };

const localizeJsonLd = () => {
  document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    try {
      const data = JSON.parse(script.textContent ?? '');
      if (data['@type'] !== 'BreadcrumbList' || !Array.isArray(data.itemListElement)) return;
      data.itemListElement.forEach((crumb: Crumb) => {
        if (crumb.name) crumb.name = CRUMBS[crumb.name] ?? MAP.get(norm(crumb.name)) ?? crumb.name;
        if (typeof crumb.item === 'string') crumb.item = enUrl(crumb.item);
        else if (crumb.item?.['@id']) crumb.item['@id'] = enUrl(crumb.item['@id']);
      });
      script.textContent = JSON.stringify(data);
    } catch {
      // A block that isn't valid JSON is left as published.
    }
  });
};

// "1,450" followed by " $" or " $ / month" becomes "$1,450" followed by " / month".
// Runs after formatNumbers(), which writes the grouped number into [data-ca-num], and again after
// the commercial fiche, for its rates. Those must wait: the fiche reads them as plain numbers.
export const moveCurrency = (selector = '[data-ca-num],[data-cc-money]') => {
  if (!isEnglish()) return;
  document.querySelectorAll<HTMLElement>(selector).forEach((num) => {
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
  localizeJsonLd();

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
