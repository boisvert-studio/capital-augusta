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

// Webflow renders CMS dates with English month names whatever the site locale.
// `[data-ca-date]` elements are re-read ("December 5, 2026" or "5 December 2026") and
// written back in the page language: « 5 décembre 2026 ».
const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const parseEnglishDate = (text: string) => {
  const t = text.trim().toLowerCase().replace(',', '');
  const m = t.match(/^([a-z]+) (\d{1,2}) (\d{4})$/) ?? t.match(/^(\d{1,2}) ([a-z]+) (\d{4})$/);
  if (!m) return null;
  const [month, day] = /^\d/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]];
  const mi = MONTHS.indexOf(month);
  return mi < 0 ? null : new Date(Date.UTC(Number(m[3]), mi, Number(day)));
};

export const formatDates = () => {
  const lang = document.documentElement.lang || 'fr-CA';
  const fmt = new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  document.querySelectorAll<HTMLElement>('[data-ca-date]').forEach((el) => {
    const date = parseEnglishDate(el.textContent ?? '');
    if (date) el.textContent = fmt.format(date);
  });
};
