const FALLBACK_NAV_PX = 72;

// The pinned nav's height: `--ca-nav-h` on <html>, else `[data-ca-nav]`, else 72px.
export const navHeight = () => {
  const fromCss = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--ca-nav-h')
  );
  if (fromCss > 0) return fromCss;
  const nav = document.querySelector<HTMLElement>('[data-ca-nav]');
  return nav?.offsetHeight || FALLBACK_NAV_PX;
};
