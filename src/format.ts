// Number formatting the Webflow binding can't do: it offers decimals only, no thousands
// separator. `[data-ca-num]` elements get their integer regrouped for the page language,
// so French shows "1 380" (narrow no-break space) and English "1,380".

export const formatNumbers = () => {
  const lang = document.documentElement.lang || 'fr-CA';
  const fmt = new Intl.NumberFormat(lang, { maximumFractionDigits: 0 });
  document.querySelectorAll<HTMLElement>('[data-ca-num]').forEach((el) => {
    const raw = el.textContent?.replace(/[\s,]/g, '') ?? '';
    if (!/^-?\d+(\.\d+)?$/.test(raw)) return;
    el.textContent = fmt.format(Number(raw));
  });
};
