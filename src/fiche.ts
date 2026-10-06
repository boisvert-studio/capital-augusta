// Detail pages ("fiches"): building, unit and commercial space. Each part keys on its page's
// main attribute and does nothing elsewhere:
//
//   [data-ca-code][data-ca-name]   building fiche (Immeubles template)
//   [data-ca-unit-page]            unit fiche (Appartements template)
//   [data-cf-main]                 commercial fiche (Immeubles commerciaux)
//
// The unit and commercial mains carry data-ca-code too, so the building key needs both.
//
// Moved from the template embeds in v0.4.7, behaviour unchanged. The CSS stays in the
// embeds: injected from here it would land after first paint and the fiches would jump.
// French and English text are both written here, so i18n.ts has nothing to translate.

const isFrench = () => !(document.documentElement.lang || 'fr').toLowerCase().startsWith('en');

const attr = (el: Element | null | undefined, name: string) =>
  (el?.getAttribute(name) ?? '').trim();

const esc = (t: string) =>
  t.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
  );

// -- Photo lightbox (building and commercial galleries) -----------------------------------

const galleryLightbox = (gallery: Element, fr: boolean) => {
  const imgs = [...gallery.querySelectorAll('img')];
  if (!imgs.length) return;
  const d = document;
  const lb = d.createElement('div');
  lb.className = 'fiche_lb';
  lb.hidden = true;
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', fr ? 'Photos de l’immeuble' : 'Building photos');
  lb.innerHTML =
    `<img alt=""><button type="button" class="fiche_lb-close" aria-label="${fr ? 'Fermer' : 'Close'}">×</button>` +
    `<button type="button" class="fiche_lb-prev" aria-label="${fr ? 'Photo précédente' : 'Previous photo'}">‹</button>` +
    `<button type="button" class="fiche_lb-next" aria-label="${fr ? 'Photo suivante' : 'Next photo'}">›</button>` +
    '<div class="fiche_lb-count" aria-live="polite"></div>';
  d.body.appendChild(lb);

  const im = lb.querySelector('img') as HTMLImageElement;
  const count = lb.querySelector('.fiche_lb-count') as HTMLElement;
  const btnClose = lb.querySelector('.fiche_lb-close') as HTMLButtonElement;
  const btnPrev = lb.querySelector('.fiche_lb-prev') as HTMLButtonElement;
  const btnNext = lb.querySelector('.fiche_lb-next') as HTMLButtonElement;
  let i = 0;
  let last: Element | null = null;

  const show = (n: number) => {
    i = (n + imgs.length) % imgs.length;
    im.src = imgs[i].currentSrc || imgs[i].src;
    im.alt = imgs[i].alt || '';
    count.textContent = `${i + 1} / ${imgs.length}`;
  };
  const open = (n: number) => {
    last = d.activeElement;
    show(n);
    lb.hidden = false;
    d.documentElement.style.overflow = 'hidden';
    btnClose.focus();
  };
  const close = () => {
    lb.hidden = true;
    d.documentElement.style.overflow = '';
    if (last instanceof HTMLElement) last.focus();
  };

  imgs.forEach((img, n) => {
    const it = img.closest('.w-dyn-item') || img;
    it.setAttribute('tabindex', '0');
    it.setAttribute('role', 'button');
    it.setAttribute('aria-label', `${fr ? 'Agrandir la photo ' : 'Enlarge photo '}${n + 1}`);
    it.addEventListener('click', () => open(n));
    it.addEventListener('keydown', (e) => {
      const { key } = e as KeyboardEvent;
      if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        open(n);
      }
    });
  });
  if (imgs.length < 2) {
    btnPrev.hidden = true;
    btnNext.hidden = true;
  }
  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', () => show(i - 1));
  btnNext.addEventListener('click', () => show(i + 1));
  lb.addEventListener('click', (e) => {
    if (e.target === lb) close();
  });
  d.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(i - 1);
    else if (e.key === 'ArrowRight') show(i + 1);
    else if (e.key === 'Tab') {
      const f = [...lb.querySelectorAll<HTMLButtonElement>('button:not([hidden])')];
      const k = f.indexOf(d.activeElement as HTMLButtonElement);
      e.preventDefault();
      f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
};

// -- Building fiche -----------------------------------------------------------------------

const STM_MARK =
  '<svg class="fiche_metro-mark" width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 0H20A4 4 0 0 1 24 4V20A4 4 0 0 1 20 24H4A4 4 0 0 1 0 20V4A4 4 0 0 1 4 0Z" fill="#0061A8"/><circle cx="12" cy="12" r="8.2" fill="#fff"/><path d="M10.3 6.2H13.7V11.4H15.6L12 16.6L8.4 11.4H10.3Z" fill="#0061A8"/></svg>';

// Bus lines from `data-ca-bus-lines`; the group hides when the building has none.
const buildBus = () => {
  let any = false;
  document.querySelectorAll<HTMLElement>('[data-ca-bus]').forEach((el) => {
    const lines = attr(el, 'data-ca-bus-lines')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const group = el.closest<HTMLElement>('.fiche_group');
    if (!lines.length) {
      if (group) group.hidden = true;
      return;
    }
    any = true;
    lines.forEach((n) => {
      const s = document.createElement('span');
      s.className = 'fiche_bus-line';
      s.textContent = n;
      el.appendChild(s);
    });
  });
  return any;
};

// Up to three métro stations (`data-s1..3`, minutes `data-d1..3`, metres `data-m1..3`), each a
// walking-directions link from the building's coordinates.
const buildMetro = (fr: boolean) => {
  const box = document.querySelector<HTMLElement>('[data-ca-metro]');
  if (!box) return false;
  const lat = attr(box, 'data-lat').replace(',', '.');
  const lng = attr(box, 'data-lng').replace(',', '.');
  let out = '';
  for (let k = 1; k < 4; k++) {
    const st = attr(box, `data-s${k}`);
    if (!st) continue;
    const mn = attr(box, `data-d${k}`);
    const m = attr(box, `data-m${k}`);
    const dist =
      (mn ? mn + (fr ? ' min à pied' : ' min walk') : '') +
      (mn && m ? ' · ' : '') +
      (m ? `${Number(m).toLocaleString(fr ? 'fr-CA' : 'en-CA')} m` : '');
    const url =
      'https://www.google.com/maps/dir/?api=1' +
      (lat && lng ? `&origin=${lat},${lng}` : '') +
      `&destination=${encodeURIComponent(`station ${st} Montréal`)}&travelmode=walking`;
    const label = (fr ? 'Itinéraire à pied vers la station ' : 'Walking directions to ') + st;
    out +=
      `<a class="fiche_metro" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(label)}">` +
      STM_MARK +
      `<span class="fiche_metro-body"><span class="fiche_metro-name">${esc(st)}</span>` +
      `<span class="fiche_metro-dist">${esc(dist)}</span></span>` +
      '<span class="fiche_metro-ext" aria-hidden="true">↗</span></a>';
  }
  if (out) {
    box.innerHTML = `<div class="fiche_metro-grid">${out}</div>`;
    return true;
  }
  box.hidden = true;
  const note = box.previousElementSibling;
  if (note instanceof HTMLElement && note.classList.contains('fiche_note')) note.hidden = true;
  return false;
};

const startBuilding = (fr: boolean) => {
  const d = document;
  const main = d.querySelector('[data-ca-code][data-ca-name]');
  if (!main) return;
  const code = attr(main, 'data-ca-code');
  const name = attr(main, 'data-ca-name');

  if (code)
    d.querySelectorAll<HTMLAnchorElement>('a[data-ca-contact]').forEach((a) => {
      const visit = a.getAttribute('data-ca-contact') === 'visite' ? '&visite=1' : '';
      a.href = `${fr ? '' : '/en'}/contact?b=${encodeURIComponent(code)}${visit}`;
    });

  if (name) {
    const parking = d.querySelector('[data-ca-q-parking]');
    if (parking)
      parking.textContent = fr
        ? `Y a-t-il un stationnement à ${name} ?`
        : `Is there parking at ${name}?`;
    const collect = d.querySelector('[data-ca-collecte]');
    if (collect?.lastChild?.nodeType === Node.TEXT_NODE)
      collect.lastChild.textContent = fr ? ` pour le ${name}.` : ` for ${name}.`;
  }

  // FAQ items whose CMS answer is empty.
  d.querySelectorAll('[data-ca-faq-a]').forEach((p) => {
    if (!p.textContent?.trim()) p.closest('details')?.remove();
  });

  const hasBus = buildBus();
  const hasMetro = buildMetro(fr);
  if (!hasMetro && !hasBus) {
    const px = d.querySelector<HTMLElement>('[data-ca-section="proximite"]');
    if (px) px.hidden = true;
  }

  // Included services leave the amenity grid and become pills.
  const svc = d.querySelector('[data-ca-services]');
  d.querySelectorAll('[data-ca-cat="Service"]').forEach((it) => {
    if (svc) {
      const s = d.createElement('span');
      s.className = 'fiche_svc-pill';
      s.textContent = it.textContent?.trim() ?? '';
      svc.appendChild(s);
    }
    (it.closest('.w-dyn-item') || it).remove();
  });
  d.querySelectorAll('[data-ca-group="incluses"] .w-dyn-items').forEach((list) => {
    if (!list.children.length) {
      const g = list.closest<HTMLElement>('.fiche_group');
      if (g) g.hidden = true;
    }
  });

  // Building-care card: avatar initial, phone as a tel: link.
  const initial = d.querySelector('[data-ca-initial-src]')?.textContent?.trim() ?? '';
  if (initial)
    d.querySelectorAll('[data-ca-initial]').forEach((el) => {
      el.textContent = initial.charAt(0).toUpperCase();
    });
  d.querySelectorAll('[data-ca-tel]').forEach((el) => {
    const t = el.textContent?.trim();
    if (!t) return;
    const a = d.createElement('a');
    a.href = `tel:${t.replace(/[^0-9+]/g, '')}`;
    a.textContent = t;
    el.textContent = '';
    el.appendChild(a);
  });

  const gallery = d.querySelector('.fiche_gallery');
  if (gallery) galleryLightbox(gallery, fr);

  // The derived FAQ items read the amenity visibility and the service pills built above, so
  // they wait for the page to finish loading.
  if (d.readyState === 'complete') addBuildingFaq(fr);
  else window.addEventListener('load', () => addBuildingFaq(fr));
};

// FAQ questions derived from the building's own data (laundry, inclusions, building care),
// as the prototype has them.
const addBuildingFaq = (fr: boolean) => {
  const d = document;
  const faq = d.querySelector('.fiche_faq');
  if (!faq) return;
  const addr = d.querySelector('h1')?.textContent?.trim() ?? '';

  const item = (q: string, html: string) => {
    const det = d.createElement('details');
    det.className = 'fiche_faq-item';
    det.innerHTML =
      `<summary class="fiche_faq-q"><span></span><span class="fiche_chev"></span></summary>` +
      `<div class="fiche_faq-a"><p class="fiche_faq-p"></p></div>`;
    (det.querySelector('summary span') as HTMLElement).textContent = q;
    (det.querySelector('.fiche_faq-p') as HTMLElement).innerHTML = html;
    return det;
  };
  const items = [...faq.querySelectorAll('.fiche_faq-item')];
  const find = (re: RegExp) => items.find((x) => re.test(x.textContent ?? '')) ?? null;
  const visit = faq.querySelector('[data-ca-contact="visite"]')?.closest('.fiche_faq-item');
  const before = find(/animaux|pets/i) ?? visit ?? faq.firstChild;

  const laundry = [...d.querySelectorAll<HTMLElement>('.fiche_am[data-ca-icon="laundry"]')].some(
    (e) => e.offsetParent !== null || e.closest('.w-dyn-item')
  );
  if (laundry)
    faq.insertBefore(
      fr
        ? item(
            'Y a-t-il une buanderie ?',
            'Oui, une buanderie commune est accessible aux résidents de l’immeuble.'
          )
        : item(
            'Is there a laundry room?',
            'Yes, a shared laundry room is available to building residents.'
          ),
      before
    );

  const svc = [...d.querySelectorAll('.fiche_svc-pill')]
    .map((e) => (e.textContent ?? '').toLowerCase())
    .join('|');
  if (svc) {
    const hot = /eau chaude|hot water/.test(svc);
    const el = /électricité|electricity/.test(svc);
    const fri = /réfrigérateur|refrigerator|fridge/.test(svc);
    const sto = /cuisinière|stove/.test(svc);
    const parts: string[] = [];
    if (fr) {
      if (hot && el) parts.push('Eau chaude et électricité incluses');
      else if (hot) parts.push('Eau chaude incluse');
      else if (el) parts.push('Électricité incluse');
      if (fri && sto) parts.push('réfrigérateur et cuisinière fournis');
      else if (fri) parts.push('réfrigérateur fourni');
      else if (sto) parts.push('cuisinière fournie');
    } else {
      if (hot && el) parts.push('Hot water and electricity included');
      else if (hot) parts.push('Hot water included');
      else if (el) parts.push('Electricity included');
      if (fri && sto) parts.push('refrigerator and stove provided');
      else if (fri) parts.push('refrigerator provided');
      else if (sto) parts.push('stove provided');
    }
    let line = parts.join(fr ? ' ; ' : '; ');
    if (line) {
      line = `${line.charAt(0).toUpperCase()}${line.slice(1)}.`;
      if (!el)
        line += fr
          ? ' L’électricité est au compte du locataire (Hydro-Québec).'
          : ' Electricity is the tenant’s responsibility (Hydro-Québec).';
      faq.insertBefore(
        fr
          ? item(
              'Qu’est-ce qui est inclus dans le loyer ?',
              `${line} Les inclusions exactes sont confirmées au bail.`
            )
          : item(
              'What’s included in the rent?',
              `${line} Exact inclusions are confirmed on the lease.`
            ),
        before
      );
    }
  }

  const care = d.querySelector('.fiche_concierge [data-ca-initial-src]')?.textContent?.trim();
  const phone = d.querySelector('.fiche_concierge [data-ca-tel] a');
  if (care && phone) {
    const collect = faq.querySelector('[data-ca-collecte]')?.closest('.fiche_faq-item') ?? null;
    const tel = `<a href="${phone.getAttribute('href')}">${phone.textContent?.trim()}</a>`;
    faq.insertBefore(
      fr
        ? item(
            'Qui est le concierge de cet immeuble ?',
            `${care} veille à l’entretien du ${addr}. Pour une urgence non vitale liée à l’immeuble, composez le ${tel}.`
          )
        : item(
            'Who is the superintendent for this building?',
            `${care} looks after ${addr}. For a non-life-threatening building emergency, call ${tel}.`
          ),
      collect
    );
  }
};

// -- Unit fiche ---------------------------------------------------------------------------

// Two photos of the building, each opening a one-image lightbox.
const unitPhotos = (box: Element, building: Element, fr: boolean) => {
  const d = document;
  const imgs = [...building.querySelectorAll<HTMLImageElement>('[data-ca-bdata-galerie] img')];
  const pick = imgs.length > 3 ? imgs.slice(2, 4) : imgs.slice(0, 2);
  let lb: HTMLElement | null = null;
  let im: HTMLImageElement | null = null;
  let last: Element | null = null;

  const close = () => {
    if (!lb) return;
    lb.hidden = true;
    d.documentElement.style.overflow = '';
    if (last instanceof HTMLElement) last.focus();
  };
  const open = (src: string, alt: string) => {
    if (!lb) {
      lb = d.createElement('div');
      lb.className = 'unit_lb';
      lb.hidden = true;
      lb.setAttribute('role', 'dialog');
      lb.setAttribute('aria-modal', 'true');
      lb.setAttribute('aria-label', fr ? 'Photo de l’immeuble' : 'Building photo');
      lb.innerHTML = `<img alt=""><button type="button" aria-label="${fr ? 'Fermer' : 'Close'}">×</button>`;
      d.body.appendChild(lb);
      im = lb.querySelector('img');
      const box = lb;
      const btn = lb.querySelector('button') as HTMLButtonElement;
      btn.addEventListener('click', close);
      box.addEventListener('click', (e) => {
        if (e.target === box) close();
      });
      d.addEventListener('keydown', (e) => {
        if (box.hidden) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'Tab') {
          e.preventDefault();
          btn.focus();
        }
      });
    }
    last = d.activeElement;
    if (im) {
      im.src = src;
      im.alt = alt;
    }
    lb.hidden = false;
    d.documentElement.style.overflow = 'hidden';
    lb.querySelector('button')?.focus();
  };

  pick.forEach((src, n) => {
    const b = d.createElement('button');
    b.type = 'button';
    b.className = 'unit_photo';
    const alt = src.alt || building.getAttribute('data-name') || '';
    b.setAttribute('aria-label', `${fr ? 'Agrandir la photo ' : 'Enlarge photo '}${n + 1}`);
    const i = d.createElement('img');
    i.src = src.currentSrc || src.src;
    i.alt = alt;
    i.loading = 'lazy';
    b.appendChild(i);
    b.addEventListener('click', () => open(i.src, alt));
    box.appendChild(b);
  });
};

const startUnit = (fr: boolean) => {
  const d = document;
  const main = d.querySelector('[data-ca-unit-page]');
  if (!main) return;
  const code = attr(main, 'data-ca-code');
  const num = attr(main, 'data-ca-numero');

  if (code)
    d.querySelectorAll<HTMLAnchorElement>('a[data-ca-contact="unit"]').forEach((a) => {
      a.href = `${fr ? '' : '/en'}/contact?b=${encodeURIComponent(code)}${num ? `&u=${encodeURIComponent(num)}` : ''}`;
    });

  // The unit's building, from the hidden building-data list.
  const building = [...d.querySelectorAll('[data-ca-bdata]')].find(
    (el) => attr(el, 'data-ca-bdata') === code
  );

  const promo = d.querySelector('[data-ca-unit-promo]');
  const promoText = building?.querySelector('[data-promo-text]')?.textContent?.trim();
  if (promo && promoText && building?.querySelector('[data-promo-on]')) {
    const slot = promo.querySelector('[data-ca-unit-promo-text]');
    if (slot) slot.textContent = promoText;
    promo.classList.add('is-on');
  }

  const names: string[] = [];
  building?.querySelectorAll('[data-ca-bdata-inclus] [data-cat="Service"]').forEach((s) => {
    const t = s.textContent?.trim();
    if (t) names.push(t);
  });
  const wrap = d.querySelector('[data-ca-unit-svc]');
  const box = d.querySelector('[data-ca-services]');
  if (wrap && box && names.length) {
    names.forEach((n) => {
      const s = d.createElement('span');
      s.className = 'fiche_svc-pill';
      s.textContent = n;
      box.appendChild(s);
    });
    wrap.classList.add('is-on');
  }

  const inc = d.querySelector('[data-ca-unit-inclus]');
  if (inc) {
    const has = (re: RegExp) => names.some((n) => re.test(n));
    const hot = has(/eau chaude|hot water/i);
    const fri = has(/frig/i);
    const sto = has(/cuisini|stove/i);
    const el = has(/lectricit/i);
    let line = '';
    if (hot && fri && sto) {
      if (fr)
        line = el
          ? 'Eau chaude et électricité incluses ; réfrigérateur et cuisinière fournis.'
          : 'Eau chaude incluse ; réfrigérateur et cuisinière fournis. L’électricité est au compte du locataire (Hydro-Québec).';
      else
        line = el
          ? 'Hot water and electricity included; refrigerator and stove provided.'
          : 'Hot water included; refrigerator and stove provided. Electricity is the tenant’s responsibility (Hydro-Québec).';
    } else if (names.length) {
      const list = names.map((n) => {
        const s = fr ? n.replace(/\s+inclu(s|se|ses)$/i, '') : n.replace(/\s+included$/i, '');
        return s.charAt(0).toLowerCase() + s.slice(1);
      });
      line = `${fr ? 'Inclus : ' : 'Included: '}${list.join(', ')}.`;
    }
    if (line) inc.textContent = line;
    else inc.closest('details')?.remove();
  }

  const photos = d.querySelector('[data-ca-unit-photos]');
  if (photos && building) unitPhotos(photos, building, fr);

  // « Quand est-il disponible ? » only while the badge says « libre maintenant ». The badge is
  // set by counts.ts, so this waits for the page to finish loading.
  const avail = () => {
    const badge = d.querySelector('.unit_badge[data-ca-avail]');
    const q = d.querySelector('[data-ca-faq="quand"]');
    if (badge && q && !badge.classList.contains('is-now')) q.remove();
  };
  if (d.readyState === 'complete') setTimeout(avail, 0);
  else window.addEventListener('load', () => setTimeout(avail, 0));
};

// -- Commercial fiche ---------------------------------------------------------------------

const startCommercial = (fr: boolean) => {
  const d = document;
  const main = d.querySelector('[data-cf-main]');
  if (!main) return;
  const code = attr(main, 'data-ca-code');

  d.querySelectorAll<HTMLAnchorElement>('a[data-cf-contact]').forEach((a) => {
    const notify = a.getAttribute('data-cf-contact') === 'notify' ? '&notify=1' : '';
    a.href = `${fr ? '' : '/en'}/contact?comm=1${notify}${code ? `&b=${encodeURIComponent(code)}` : ''}`;
  });

  const total = parseInt(d.querySelector('[data-cf="total"]')?.textContent ?? '', 10);
  const totalWord = d.querySelector('[data-cf="total-word"]');
  if (totalWord)
    totalWord.textContent = fr
      ? total < 2
        ? ' local'
        : ' locaux'
      : total === 1
        ? ' unit'
        : ' units';

  const fmt = (v: number) => v.toLocaleString(fr ? 'fr-CA' : 'en-CA', { maximumFractionDigits: 2 });
  const num = (el: Element) =>
    parseFloat(String(el.textContent).replace(/\s/g, '').replace(',', '.'));

  const rows = [...d.querySelectorAll('[data-cf-space]')];
  const rates: number[] = [];
  rows.forEach((r) => {
    r.querySelectorAll('[data-cf-rate],[data-cf-money]').forEach((el) => {
      const v = num(el);
      if (!Number.isFinite(v)) return;
      if (el.hasAttribute('data-cf-rate')) rates.push(v);
      el.textContent = fmt(v);
    });
    // A space with no civic number of its own: the floor label takes the address's place.
    const civic = r.querySelector('[data-cs="civic"]');
    if (civic && !civic.textContent?.trim() && civic.nextElementSibling) {
      civic.nextElementSibling.textContent = fr ? 'étage' : 'floor';
      civic.remove();
    }
    const desc = r.querySelector('[data-cs="desc"]');
    if (desc && !desc.textContent?.trim()) desc.remove();
  });

  const count = d.querySelector('[data-cf="count"]');
  if (count) count.textContent = String(rows.length);
  const from = d.querySelector('[data-cf="from"]');
  const fromNum = d.querySelector('[data-cf="from-num"]');
  if (from && fromNum && rates.length) {
    fromNum.textContent = fmt(Math.min(...rates));
    from.classList.add('is-on');
  }

  // The gallery is filled from the building's photos in the hidden building-data list.
  const gallery = d.querySelector('[data-cf-gallery]');
  if (!gallery) return;
  const source = code
    ? [...d.querySelectorAll('[data-cf-bdata]')].find((b) => attr(b, 'data-cf-bdata') === code)
    : undefined;
  const alt = d.querySelector('[data-cf="h1"]')?.textContent ?? '';
  source?.querySelectorAll('img').forEach((s) => {
    const u = s.getAttribute('src');
    if (!u) return;
    const it = d.createElement('div');
    it.className = 'w-dyn-item';
    const im = d.createElement('img');
    im.src = u;
    const ss = s.getAttribute('srcset');
    if (ss) {
      im.srcset = ss;
      im.sizes = '(max-width: 767px) 100vw, 50vw';
    }
    im.alt = s.getAttribute('alt') || alt;
    it.appendChild(im);
    gallery.appendChild(it);
  });
  galleryLightbox(gallery, fr);
};

// -- Start --------------------------------------------------------------------------------

export const startFiche = () => {
  const fr = isFrench();
  startBuilding(fr);
  startUnit(fr);
  startCommercial(fr);
};
