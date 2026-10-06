// Finsweet's filter chips print the selected option's value, not its label: the amenity filter
// showed « laundry » instead of « Buanderie ». Each chip is relabelled with the text of the
// matching option in the filter selects, which i18n.ts has already put in the page language.

const label = (value: string) => {
  for (const option of document.querySelectorAll<HTMLOptionElement>(
    'select[fs-list-field] option'
  )) {
    if (option.value === value && option.value !== '') return option.text.trim();
  }
  return null;
};

const relabel = (el: HTMLElement) => {
  const current = el.textContent?.trim() ?? '';
  // Already relabelled, and Finsweet hasn't written a new value since.
  const done = el.dataset.caChipValue;
  if (done && current === label(done)) return;
  const text = label(current);
  if (!text) return;
  el.dataset.caChipValue = current;
  if (current !== text) el.textContent = text;
};

export const startChips = () => {
  const run = () =>
    document.querySelectorAll<HTMLElement>('[fs-list-element="tag-value"]').forEach(relabel);
  if (!document.querySelector('[fs-list-element="tag"]')) return;
  run();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      run();
    });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
};
