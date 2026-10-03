// Filter keys that cannot be nested in the card. Webflow allows two nested collection lists
// per page and the cards already use both (amenities: included and paid), so a building's
// unit types come from a flat, hidden Types list instead. Each of its items carries the
// building code and a value; this copies the value into that building's card as a Finsweet
// field, then asks Finsweet to re-read the list if it has already started.
//
//   [data-ca-key-for="CODE"][data-ca-key-field="type"]  source item, its text is the value
//   [data-ca-keys="CODE"]                               hidden container inside the card
//
// The contract is in docs/contracts.md.

const norm = (code: string | null | undefined) => (code ?? '').trim().toUpperCase();

type FinsweetGlobal = { modules?: Record<string, { restart?: () => unknown }> };

export const startKeys = () => {
  const sources = document.querySelectorAll<HTMLElement>('[data-ca-key-for][data-ca-key-field]');
  if (!sources.length) return;

  const targets = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>('[data-ca-keys]').forEach((el) => {
    targets.set(norm(el.getAttribute('data-ca-keys')), el);
  });

  let added = 0;
  sources.forEach((src) => {
    const target = targets.get(norm(src.getAttribute('data-ca-key-for')));
    const field = src.getAttribute('data-ca-key-field');
    const value = src.textContent?.trim();
    if (!target || !field || !value) return;
    const exists = [...target.querySelectorAll(`[fs-list-field="${field}"]`)].some(
      (el) => el.textContent?.trim() === value
    );
    if (exists) return;
    const span = document.createElement('span');
    span.setAttribute('fs-list-field', field);
    span.textContent = value;
    target.append(span);
    added += 1;
  });

  // Finsweet may have indexed the list before these keys existed.
  const fs = (window as unknown as { FinsweetAttributes?: FinsweetGlobal }).FinsweetAttributes;
  if (added && fs?.modules?.list?.restart) fs.modules.list.restart();
};
