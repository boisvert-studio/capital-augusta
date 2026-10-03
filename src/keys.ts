// Filter keys that cannot be nested in the card. Webflow allows two nested collection lists
// per page and the cards already use both (amenities: included and paid), so a building's
// unit types come from a flat, hidden Types list instead. Each of its items carries the
// building code and a value; this writes them into that building's card as one Finsweet
// field, then asks Finsweet to re-read the list if it has already started.
//
//   [data-ca-key-for="CODE"][data-ca-key-field="type"]  source item, its text is the value
//   [data-ca-keys="CODE"]                               hidden container inside the card
//
// Finsweet reads only the first element of a field outside a nested list, so the values are
// joined into one element ("1½ 3½ 4½"); the matching select uses fs-list-operator="contain".
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

  // target -> field -> values, in source order, without duplicates
  const keys = new Map<HTMLElement, Map<string, string[]>>();
  sources.forEach((src) => {
    const target = targets.get(norm(src.getAttribute('data-ca-key-for')));
    const field = src.getAttribute('data-ca-key-field');
    const value = src.textContent?.trim();
    if (!target || !field || !value) return;
    const fields = keys.get(target) ?? new Map<string, string[]>();
    const values = fields.get(field) ?? [];
    if (!values.includes(value)) values.push(value);
    fields.set(field, values);
    keys.set(target, fields);
  });

  let changed = false;
  keys.forEach((fields, target) => {
    fields.forEach((values, field) => {
      const text = values.join(' ');
      let el = target.querySelector<HTMLElement>(`[fs-list-field="${field}"]`);
      if (el?.textContent === text) return;
      if (!el) {
        el = document.createElement('span');
        el.setAttribute('fs-list-field', field);
        target.append(el);
      }
      el.textContent = text;
      changed = true;
    });
  });

  // Finsweet may have indexed the list before these keys existed.
  const fs = (window as unknown as { FinsweetAttributes?: FinsweetGlobal }).FinsweetAttributes;
  if (changed && fs?.modules?.list?.restart) fs.modules.list.restart();
};
