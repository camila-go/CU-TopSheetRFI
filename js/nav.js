/* Header behaviour — scrolled state, desktop megamenus, mobile view stack.
   Lifted from CU-Homepage-Test-v2 (commit 0e61516). The ⚠️ comments each
   describe a bug the surrounding code exists to prevent — keep them with it. */

import { MEGA_PROGRAMS } from './programs.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initNavScroll() {
  const nav = document.querySelector('.main-nav');
  if (!nav) return;

  // Hysteresis (enter above 40px, exit below 16px) so hovering near a single
  // threshold — trackpad momentum, rubber-banding — can't flicker the class
  // on/off. The CSS transition on .main-nav / .main-nav__bar smooths the
  // height change itself; this stops it from being retriggered rapidly.
  let ticking = false;
  const update = () => {
    ticking = false;
    const scrolled = nav.classList.contains('main-nav--scrolled');
    if (!scrolled && window.scrollY > 40) {
      nav.classList.add('main-nav--scrolled');
    } else if (scrolled && window.scrollY < 16) {
      nav.classList.remove('main-nav--scrolled');
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// Degree level -> area -> programmes now lives in its own module so the hero's
// program finder can drive itself from the SAME catalogue as this menu.

// Desktop megamenus. Click (not hover) opens, matching how capella.edu's nav
// behaves and avoiding a menu that fires when the pointer merely crosses the
// bar. Only one is open at a time.
function initMegaMenu() {
  const triggers = [...document.querySelectorAll('.main-nav__links a[aria-controls]')];
  if (!triggers.length) return;

  const panelFor = (t) => document.getElementById(t.getAttribute('aria-controls'));

  function close(trigger) {
    const panel = panelFor(trigger);
    trigger.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
  }

  function closeAll(except) {
    triggers.forEach((t) => {
      if (t !== except) close(t);
    });
  }

  // The wide menu starts at the nav CONTAINER's left edge, not under its
  // trigger (the narrow menus do anchor to their trigger). `.main-nav__item` is
  // `relative` for those, so shift this one back by the difference.
  // Measured on every open rather than only on resize: the bar also changes
  // size when `.main-nav--scrolled` kicks in and when webfonts land, either of
  // which would otherwise leave a stale offset and push the panel off-screen.
  function position(panel, trigger) {
    const nav = document.querySelector('.main-nav');
    const bar = document.querySelector('.main-nav__bar');
    if (!panel || !nav || !bar) return;
    const navRect = nav.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();

    // Every panel hangs from the BAR's bottom edge, so they all open at the
    // same height regardless of which trigger you used.
    panel.style.top = `${barRect.bottom - navRect.top}px`;

    // The wide menu starts at the bar's left edge; the narrow ones are
    // LEFT-ALIGNED to their trigger.
    // ⚠️ Not centred. This used to centre them, which is what the prototype's
    // Figma showed, but capella.edu left-aligns: measured at a 1440 viewport,
    // all three list panels' left edges sit exactly on their trigger's left
    // (Capella Experience 539/539, Financing 736/736, Admissions 865/865).
    let anchor;
    if (panel.classList.contains('megamenu--split')) {
      anchor = barRect.left;
    } else {
      const triggerRect = trigger.getBoundingClientRect();
      // offsetWidth is readable here because open() unhides the panel before
      // calling this.
      const panelWidth = panel.offsetWidth;
      anchor = triggerRect.left;
      // Clamp to the viewport — Admissions sits far enough right that a 300px
      // panel would hang off the edge on narrower desktops.
      anchor = Math.min(Math.max(anchor, 0), window.innerWidth - panelWidth);
    }
    panel.style.left = `${anchor - navRect.left}px`;
  }

  function open(trigger) {
    closeAll(trigger);
    const panel = panelFor(trigger);
    trigger.setAttribute('aria-expanded', 'true');
    if (panel) {
      panel.hidden = false;
      // Measured on open, not just on resize: the bar also changes size when
      // `.main-nav--scrolled` kicks in and when webfonts land, either of which
      // would otherwise leave a stale offset.
      position(panel, trigger);
    }
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      if (isOpen) close(trigger);
      else open(trigger);
    });
  });

  // Degree-level rail switches the area panel beside it.
  document.querySelectorAll('.megamenu__level-list').forEach((list) => {
    const tabs = [...list.querySelectorAll('.megamenu__level')];
    tabs.forEach((tab) => {
      const select = () => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', String(on));
          const p = document.getElementById(t.getAttribute('aria-controls'));
          if (p) p.hidden = !on;
        });
      };
      // ⚠️ Click ONLY — deliberately no `mouseenter`. Hover-to-select meant
      // simply moving the pointer across the rail toward the areas column
      // swapped the panel out from under you. The live site requires a click.
      tab.addEventListener('click', select);
    });
  });

  // --- Third level: area of study -> its programs --------------------------
  // capella.edu CASCADES: clicking an area opens a third column beside the
  // areas rather than replacing them, so the trail (level > area) stays
  // visible. Built with DOM APIs, not innerHTML: several program names contain
  // "&" and a curly apostrophe.
  const programCol = document.getElementById('degrees-programs-col');

  function clearPrograms() {
    if (!programCol) return;
    programCol.hidden = true;
    programCol.replaceChildren();
    document
      .querySelectorAll('.megamenu__area-list a[aria-current]')
      .forEach((a) => a.removeAttribute('aria-current'));
  }

  document.querySelectorAll('.megamenu__panel').forEach((panel) => {
    const map = MEGA_PROGRAMS[panel.id];
    if (!map || !programCol) return;

    panel.querySelectorAll('.megamenu__area-list a').forEach((link) => {
      const area = link.textContent.trim();
      const programs = map[area];
      if (!programs) return; // leaf row - nothing deeper to show

      link.addEventListener('click', (e) => {
        e.preventDefault();
        programCol.replaceChildren();

        const heading = document.createElement('h3');
        heading.className = 'megamenu__programs-title';
        heading.textContent = area;
        programCol.appendChild(heading);

        const ul = document.createElement('ul');
        ul.className = 'megamenu__area-list';
        programs.forEach((name) => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = '#';
          a.textContent = name;
          li.appendChild(a);
          ul.appendChild(li);
        });
        programCol.appendChild(ul);
        programCol.hidden = false;

        panel
          .querySelectorAll('.megamenu__area-list a')
          .forEach((x) => x.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'true');
      });
    });
  });

  // Changing degree level drops the third column - it belonged to the level
  // you just left.
  document.querySelectorAll('.megamenu__level').forEach((tab) => {
    tab.addEventListener('click', clearPrograms);
  });

  // Dismissal: click outside, or Escape (which returns focus to the trigger).
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.main-nav__item')) {
      closeAll();
      clearPrograms();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openTrigger = triggers.find((t) => t.getAttribute('aria-expanded') === 'true');
    if (!openTrigger) return;
    close(openTrigger);
    openTrigger.focus();
  });
}

// Mobile navigation: a STACK of full-screen views that slide in from the right,
// each with a "« Back" to pop — mirroring capella.edu's mobile nav. Not an
// accordion: an earlier inline-expand version looked nothing like it and grew
// taller than the viewport. The tree is derived from the megamenu DOM so the
// desktop and mobile navs can't drift apart.
function initMobileMenuTree() {
  const panel = document.getElementById('mobile-nav-panel');
  if (!panel) return;

  // --- Derive the tree from the desktop megamenus -------------------------
  const roots = [];
  document.querySelectorAll('.main-nav__links > .main-nav__item').forEach((item) => {
    const trigger = item.querySelector('a[aria-controls]');
    if (!trigger) return;
    const menu = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!menu) return;
    const label = trigger.textContent.trim();

    if (menu.classList.contains('megamenu--split')) {
      const levels = [...menu.querySelectorAll('.megamenu__level')].map((lvl) => {
        const areaPanel = document.getElementById(lvl.getAttribute('aria-controls'));
        const levelLabel = lvl.textContent.replace('\u203A', '').trim();
        const programs = MEGA_PROGRAMS[areaPanel.id] || {};
        const areas = [...areaPanel.querySelectorAll('.megamenu__area-list a')].map((a) => {
          const areaLabel = a.textContent.trim();
          const list = programs[areaLabel];
          return list
            ? { label: areaLabel, heading: areaLabel, children: list.map((n) => ({ label: n })) }
            : { label: areaLabel };
        });
        return { label: levelLabel, heading: levelLabel, children: areas };
      });
      roots.push({ label, children: levels });
    } else {
      const groups = [...menu.querySelectorAll('.megamenu__group')].map((g) => ({
        heading: g.querySelector('.megamenu__group-title').textContent.trim(),
        items: [...g.querySelectorAll('.megamenu__area-list a')].map((a) => ({
          label: a.textContent.trim(),
        })),
      }));
      roots.push({ label, groups });
    }
  });
  if (!roots.length) return;

  // --- View rendering ------------------------------------------------------
  const viewport = document.createElement('div');
  viewport.className = 'mobile-menu__viewport';

  const footer = document.createElement('div');
  footer.className = 'mobile-menu__footer';
  ['Apply now', 'Request info'].forEach((t) => {
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = t;
    // Apply opens the application sheet. sheet.js listens for this attribute via
    // a delegated handler, so it works even though this link is built here at
    // runtime rather than sitting in the markup.
    if (t === 'Apply now') a.setAttribute('data-sheet-open', '');
    footer.appendChild(a);
  });

  panel.replaceChildren(viewport, footer);

  const stack = [];

  function row(node, opts = {}) {
    // `groups` counts as having children too — the Experience/Financing/
    // Admissions menus are grouped lists, not a flat `children` array, and
    // checking only `children` left them without a chevron or a tap target.
    const hasChildren = !!(
      (node.children && node.children.length) ||
      (node.groups && node.groups.length)
    );
    const el = document.createElement(hasChildren ? 'button' : 'a');
    if (hasChildren) el.type = 'button';
    else el.href = '#';
    el.className = 'mobile-menu__row' + (opts.strong ? ' mobile-menu__row--strong' : '');
    el.append(node.label);

    // Unlike the desktop menu, EVERY mobile row carries a chevron \u2014 including
    // leaf program links, which is what the live mobile nav does (there the
    // chevron reads as "goes somewhere", not "opens a level").
    const chev = document.createElement('span');
    chev.className = 'mobile-menu__chev';
    chev.setAttribute('aria-hidden', 'true');
    chev.textContent = '\u203A';
    el.appendChild(chev);

    if (hasChildren) {
      el.addEventListener('click', () => push(node));
    }
    return el;
  }

  function makeView(node, isRoot) {
    const view = document.createElement('div');
    view.className = 'mobile-menu__view';

    if (!isRoot) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'mobile-menu__back';
      back.textContent = '\u00AB Back';
      back.addEventListener('click', pop);
      view.appendChild(back);
    }

    if (node.heading) {
      const h = document.createElement('p');
      h.className = 'mobile-menu__heading';
      h.textContent = node.heading;
      view.appendChild(h);
    }

    if (node.groups) {
      node.groups.forEach((g) => {
        const h = document.createElement('p');
        h.className = 'mobile-menu__group';
        h.textContent = g.heading;
        view.appendChild(h);
        g.items.forEach((child) => view.appendChild(row(child)));
      });
    } else {
      (node.children || []).forEach((child) => view.appendChild(row(child, { strong: isRoot })));
    }
    return view;
  }

  function push(node) {
    const view = makeView(node, false);
    viewport.appendChild(view);
    // Force a reflow so the browser sees the off-screen start position before
    // the class flips it in — otherwise it jumps rather than slides.
    void view.offsetWidth;
    view.classList.add('is-current');
    stack.push(view);
  }

  function pop() {
    const view = stack.pop();
    if (!view) return;
    view.classList.remove('is-current');
    const done = () => view.remove();
    if (prefersReducedMotion) done();
    else view.addEventListener('transitionend', done, { once: true });
  }

  function reset() {
    while (stack.length) stack.pop().remove();
  }

  const rootView = makeView({ children: roots }, true);
  rootView.classList.add('is-current', 'mobile-menu__view--root');
  viewport.appendChild(rootView);

  // Closing the menu returns it to the top level, so it never reopens deep
  // inside a branch you already left.
  document.querySelector('.main-nav__menu-btn')?.addEventListener('click', () => {
    if (panel.hidden) reset();
  });
}

function initMobileNav() {
  const button = document.querySelector('.main-nav__menu-btn');
  const panel = document.getElementById('mobile-nav-panel');
  if (!button || !panel) return;

  // ⚠️ The panel is `position: fixed` and MUST be a direct child of <body>.
  // Authored inside `.main-nav` it kept collapsing to a 3px sliver once you
  // scrolled: `.main-nav--scrolled` applies (and transitions) `backdrop-filter`,
  // and a backdrop-filter — like transform/filter/will-change/contain — makes
  // the element the CONTAINING BLOCK for fixed descendants. `top/bottom` then
  // resolved against the ~67px header instead of the viewport, so the menu
  // "opened" onto the page below it. Reparenting once, here, makes the panel
  // immune to whatever effects the header picks up later.
  if (panel.parentElement !== document.body) document.body.appendChild(panel);

  // Anchor to the header's real bottom rather than a hardcoded offset: the
  // utility bar and nav are separately sticky and the bar's padding changes in
  // the scrolled state, so the seam moves. Measured on open (and on resize
  // while open) it always meets the nav bar exactly, at any scroll position.
  function anchor() {
    const nav = document.querySelector('.main-nav');
    if (nav) panel.style.top = `${Math.round(nav.getBoundingClientRect().bottom)}px`;
  }

  button.addEventListener('click', () => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!isOpen));
    button.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
    if (!isOpen) anchor();
    panel.hidden = isOpen;
  });

  // The header shrinks as you scroll, so keep the seam honest while open.
  window.addEventListener('resize', () => {
    if (!panel.hidden) anchor();
  });
  window.addEventListener('scroll', () => {
    if (!panel.hidden) anchor();
  }, { passive: true });

  panel.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Open menu');
      panel.hidden = true;
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavScroll();
  initMegaMenu();
  initMobileMenuTree();
  initMobileNav();
});
