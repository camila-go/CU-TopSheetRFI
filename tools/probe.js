/* Computed-style probe. Paste-evaluate in the browser console on BOTH
 * capella.edu and this build at the same viewport width, then diff the two
 * dumps. See DESIGN.md § The sweep.
 *
 * Each entry names a component and gives the selector for whichever page it is
 * running on. Returns computed values for a fixed property set plus geometry, so
 * the two dumps can be diffed offline. Replaces spot-checking: the point is to
 * compare what the browser actually renders, not what a stylesheet claims.
 */
(() => {
  const SIDE = window.__SIDE__; // 'live' | 'ours'

  // [component, liveSelector, oursSelector]
  const MAP = [
    ['hero band',            '.hero-basic', '.hero'],
    ['hero h1',              '.hero-basic h1', '.hero__title'],
    ['hero body',            '.hero-basic p', '.hero__body'],
    ['hero chip',            'button[data-degree]', '.chip-red'],
    ['formats h2',           null, '.formats__title'],
    ['format card body',     '.image-text-cta__content', '.format-card'],
    ['format card link',     '.image-text-cta__link', '.format-card__link'],
    ['stat value',           '.facts-number', '.stat__value'],
    ['stat label',           '.facts-text', '.stat__label'],
    ['programme card',       '.secondary-fill-btn', '.program-card'],
    ['move tile',            '.quick-links .white-fill-btn', '.move-tile'],
    ['move h2',              '.quick-links__title', '.move__title'],
    ['utility bar',          '.header-utility-bar', '.utility-bar'],
    ['nav bar',              '.navbar.mobile-navbar', '.main-nav__bar'],
    ['nav link',             '.level-0.nav-link', '.main-nav__item > a'],
    ['footer link',          'footer .nav-link', '.footer__column a'],
  ];

  const PROPS = [
    'color', 'backgroundColor', 'borderRadius',
    'borderTopWidth', 'borderTopColor', 'borderTopStyle',
    'boxShadow', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight',
    'letterSpacing', 'textTransform', 'textAlign',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginBottom', 'gap', 'display', 'flexDirection',
    'gridTemplateColumns', 'minHeight', 'opacity',
  ];

  const first = (sel) => {
    if (!sel) return null;
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;   // skip hidden duplicates
    }
    return null;
  };

  const out = {};
  for (const [name, liveSel, oursSel] of MAP) {
    const sel = SIDE === 'live' ? liveSel : oursSel;
    const el = first(sel);
    if (!el) { out[name] = { missing: sel }; continue; }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const rec = { _w: Math.round(r.width), _h: Math.round(r.height) };
    for (const p of PROPS) rec[p] = cs[p];
    // Normalise the two sites' different font stacks to just the first family.
    rec.fontFamily = rec.fontFamily.split(',')[0].replace(/["']/g, '');
    out[name] = rec;
  }
  return { side: SIDE, viewport: [innerWidth, innerHeight], data: out };
})()
