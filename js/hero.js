/* Hero program finder.
 *
 * Mirrors capella.edu's hero interaction, measured 2026-08-13:
 *   1. Click a degree chip  → the chip goes #3a0007 (dark red) and an
 *                             "Select area of study" label + <select> appear.
 *                             The hero grows 562 → 677 at desktop.
 *   2. Choose an area       → a second "Select specialization" <select> appears,
 *                             populated with that degree+area's programmes.
 *   3. Choose a specialization → an "Explore my program" CTA appears.
 *
 * ⚠️ Step 3 is easy to miss. I originally checked for a CTA after step 2, found
 * none, and wrote "there is no submit button" into DESIGN.md as fact — it only
 * appears once a specialization is picked. Changing the degree or the area
 * hides it again, since the choice it would act on no longer exists.
 *
 * The catalogue comes from ./programs.js, the same map that drives the desktop
 * megamenu's third level and the mobile nav tree, so the hero cannot drift out
 * of sync with the menu.
 */

import { MEGA_PROGRAMS } from './programs.js';

// The chips carry `data-degree`, matching the live markup's own attribute. These
// map onto MEGA_PROGRAMS' keys.
const DEGREE_KEYS = {
  bachelors: 'area-bachelors',
  masters: 'area-masters',
  doctoral: 'area-doctoral',
  certificate: 'area-certificates',
};

function initHeroFinder() {
  const finder = document.querySelector('.hero__finder');
  if (!finder) return;

  const chips = [...document.querySelectorAll('.hero__chips [data-degree]')];
  const areaField = finder.querySelector('.hero__field--area');
  const areaSelect = finder.querySelector('#hero-area');
  const specField = finder.querySelector('.hero__field--spec');
  const specSelect = finder.querySelector('#hero-spec');
  const cta = finder.querySelector('.hero__cta');
  if (!chips.length || !areaSelect || !specSelect) return;

  const fill = (select, placeholder, items) => {
    select.replaceChildren();
    // DOM APIs rather than innerHTML: several programme names contain "&" and a
    // curly apostrophe.
    const first = document.createElement('option');
    first.value = '';
    first.textContent = placeholder;
    select.appendChild(first);
    items.forEach((name) => {
      const o = document.createElement('option');
      o.value = name;
      o.textContent = name;
      select.appendChild(o);
    });
  };

  function selectDegree(chip) {
    chips.forEach((c) => {
      const on = c === chip;
      c.classList.toggle('is-selected', on);
      c.setAttribute('aria-pressed', String(on));
    });

    const map = MEGA_PROGRAMS[DEGREE_KEYS[chip.dataset.degree]] || {};
    fill(areaSelect, 'Select area of study', Object.keys(map));
    areaField.hidden = false;
    // Opens up the 60px of breathing room the live hero has below the selects.
    // Class-gated rather than unconditional so the CLOSED hero stays 562px.
    finder.classList.add('is-open');
    // Steps 2 and 3 always reset when the degree changes — the previous area and
    // specialization belonged to the level you just left.
    specField.hidden = true;
    specSelect.value = '';
    if (cta) cta.hidden = true;
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      selectDegree(chip);
    });
  });

  areaSelect.addEventListener('change', () => {
    // Changing the area invalidates any specialization already chosen, so step 3
    // goes away until a new one is picked.
    if (cta) cta.hidden = true;
    const chip = chips.find((c) => c.classList.contains('is-selected'));
    const map = chip ? MEGA_PROGRAMS[DEGREE_KEYS[chip.dataset.degree]] || {} : {};
    const programs = map[areaSelect.value];
    if (!programs || !programs.length) {
      specField.hidden = true;
      return;
    }
    fill(specSelect, 'Select specialization', programs);
    specField.hidden = false;
  });

  // Step 3: the CTA only exists once there is a specialization for it to act on.
  specSelect.addEventListener('change', () => {
    if (cta) cta.hidden = !specSelect.value;
  });
}

document.addEventListener('DOMContentLoaded', initHeroFinder);
