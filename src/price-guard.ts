// Building fiche: the header's « À partir de » never reads above the cheapest unit listed under it
// (client rule R6-5; Danny 2026-10-09, to confirm with the client). The client's own figure shows
// whenever no listed unit is cheaper. A unit with no rent is ignored. Runs before formatNumbers,
// on the raw CMS numbers. Cards on Home and Immeubles keep the client's figure (no unit list there).
export const startPriceGuard = () => {
  const from = document.querySelector<HTMLElement>('[data-ca="from"] [data-ca-num]');
  const list = document.querySelector('[data-ca-section="logements"]');
  if (!from || !list) return;
  const num = (t: string | null) => Number((t ?? '').replace(/[^\d]/g, ''));
  const own = num(from.textContent);
  const rents = [...list.querySelectorAll('[data-bb="loyer"]')]
    .map((el) => num(el.textContent))
    .filter((n) => n > 0);
  if (!own || !rents.length) return;
  const low = Math.min(...rents);
  if (low < own) from.textContent = String(low);
};
