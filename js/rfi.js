/* RFI top sheet controller — "Request more information".
 *
 * Opens from the Request information CTAs (utility bar + mobile action bar),
 * as a bottom sheet on mobile / right-aligned modal on desktop, mirroring the
 * Apply sheet in js/sheet.js.
 *
 * Design: FormBottomSheetModal Figma, section `formTopSheetModal` (34:8023).
 * Two steps: 1 picks a programme, 2 collects contact details. Figma's
 * `step=1..10` variants are prototype interaction frames, not extra pages.
 *
 * ⚠️ PROTOTYPE ONLY. There is deliberately NO submit, NO endpoint and NO
 * persistence — submitting swaps in a confirmation panel so the flow can be
 * walked end to end, and the entered values never leave this module.
 *
 * Degree/area/programme options come from js/programs.js so this form, the
 * megamenu and the hero finder cannot drift apart.
 */

import { MEGA_PROGRAMS } from './programs.js';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

/* MEGA_PROGRAMS is keyed `area-bachelors` etc.; the form's first dropdown
   offers the same levels in the same order as the megamenu. */
const DEGREE_LEVELS = [
  ['area-bachelors', "Bachelor's"],
  ['area-masters', "Master's"],
  ['area-doctoral', 'Doctoral'],
  ['area-certificates', 'Certificates'],
];

const VALIDATORS = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v),
  phone: (v) => v.replace(/\D/g, '').length === 10,
  zip: (v) => /^\d{5}$/.test(v),
};

/* Per-field messages, verbatim from the ErrorStep1 / ErrorStep2 frames
   (1:19866 / 1:20089). The design gives one message per field rather than a
   generic string, and has no separate copy for a malformed-but-present value,
   so the same message covers both empty and invalid. */
const ERROR_TEXT = {
  degree: 'Please select a degree level',
  area: 'Please select an area of study',
  program: 'Please select a program of interest',
  'first-name': 'Please enter your first name',
  'last-name': 'Please enter your last name',
  email: 'Please enter your email address',
  phone: 'Please enter your phone number',
  zip: 'Please enter your ZIP code',
};

function isValid(name, value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const check = VALIDATORS[name];
  return check ? check(trimmed) : true;
}

function initRfi() {
  const rfi = document.querySelector('[data-rfi]');
  if (!rfi) return;

  const panel = rfi.querySelector('[data-rfi-panel]');
  const scrim = rfi.querySelector('[data-rfi-scrim]');
  const dismiss = rfi.querySelector('[data-rfi-close]');
  const body = rfi.querySelector('[data-rfi-body]');
  const steps = Array.from(rfi.querySelectorAll('[data-rfi-step]'));
  const form = rfi.querySelector('[data-rfi-form]');
  const degree = rfi.querySelector('#rfi-degree');
  const area = rfi.querySelector('#rfi-area');
  const program = rfi.querySelector('#rfi-program');

  let lastFocused = null;
  /* Set once the form validates and submits, so closing after a completed
     form never fires the "not into forms?" nudge. */
  let completed = false;

  /* ---- Dropdowns, cascading level → area → programme ------------------- */

  function fill(select, pairs, placeholder) {
    select.innerHTML = '';
    const blank = new Option(placeholder, '');
    blank.disabled = true;
    blank.selected = true;
    select.append(blank);
    pairs.forEach(([value, label]) => select.append(new Option(label, value)));
  }

  function resetAreas() {
    const areas = MEGA_PROGRAMS[degree.value] || {};
    const names = Object.keys(areas);
    fill(
      area,
      names.map((n) => [n, n]),
      '*Area of study'
    );
    area.disabled = names.length === 0;
    fill(program, [], '*Program of interest');
    program.disabled = true;
  }

  fill(degree, DEGREE_LEVELS, '*Degree level');
  fill(area, [], '*Area of study');
  fill(program, [], '*Program of interest');
  area.disabled = true;
  program.disabled = true;

  degree.addEventListener('change', () => {
    resetAreas();
    clearError(degree);
  });

  area.addEventListener('change', () => {
    const list = (MEGA_PROGRAMS[degree.value] || {})[area.value] || [];
    fill(
      program,
      list.map((p) => [p, p]),
      '*Program of interest'
    );
    program.disabled = list.length === 0;
    clearError(area);
  });

  /* ---- Validation ------------------------------------------------------ */

  function fieldOf(control) {
    return control.closest('.rfi__field');
  }

  function clearError(control) {
    fieldOf(control)?.classList.remove('is-invalid');
  }

  function markInvalid(control, message) {
    const field = fieldOf(control);
    if (!field) return;
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');
    /* Write to the text span, not the <p> — the <p> also holds the
       circle-exclamation icon, which textContent on the parent would wipe. */
    const error = field.querySelector('.rfi__error-text');
    if (error && message) error.textContent = message;
  }

  function markValid(control) {
    const field = fieldOf(control);
    if (!field) return;
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
  }

  rfi.querySelectorAll('.rfi__input').forEach((input) => {
    input.addEventListener('input', () => {
      if (!input.value.trim()) {
        fieldOf(input)?.classList.remove('is-valid', 'is-invalid');
        return;
      }
      if (isValid(input.name, input.value)) markValid(input);
      else fieldOf(input)?.classList.remove('is-valid');
    });
    input.addEventListener('blur', () => {
      if (!input.value.trim()) return;
      if (isValid(input.name, input.value)) markValid(input);
      else markInvalid(input, ERROR_TEXT[input.name] || 'This field is required.');
    });
  });

  function validateStep(index) {
    const step = steps[index];
    const controls = Array.from(
      step.querySelectorAll('select, input[type="text"], input[type="email"], input[type="tel"]')
    );
    let firstBad = null;

    controls.forEach((control) => {
      if (isValid(control.name, control.value)) {
        markValid(control);
      } else {
        markInvalid(control, ERROR_TEXT[control.name] || 'This field is required.');
        if (!firstBad) firstBad = control;
      }
    });

    step.querySelectorAll('.rfi__radios').forEach((group) => {
      const chosen = group.querySelector('input:checked');
      group.classList.toggle('is-invalid', !chosen);
      if (!chosen && !firstBad) firstBad = group.querySelector('input');
    });

    if (firstBad) {
      firstBad.focus();
      return false;
    }
    return true;
  }

  /* ---- Steps ----------------------------------------------------------- */

  function showStep(index) {
    steps.forEach((step, i) => {
      step.hidden = i !== index;
    });
    body.scrollTop = 0;
  }

  rfi.querySelectorAll('[data-rfi-next]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (validateStep(0)) showStep(1);
    })
  );

  rfi.querySelectorAll('[data-rfi-back]').forEach((btn) =>
    btn.addEventListener('click', () => showStep(0))
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateStep(1)) return;
    completed = true;
    /* The design has no post-submit state — step 10 (the filled step 2) is where
       the Figma flow ends, and there is no endpoint here to submit to. So the
       sheet just closes once the form validates. Do NOT invent a confirmation
       panel: the only designed follow-up state in the file is the `incomplete`
       toast (DTincomplete / `incomplete- toast popUp`), which is an abandonment
       nudge, not an acknowledgement. */
    close();
  });

  /* ---- Open / close ---------------------------------------------------- */

  function open(trigger) {
    lastFocused = trigger || document.activeElement;
    scrim.hidden = false;
    panel.hidden = false;
    /* Force a reflow so the browser registers the un-hidden start state before
       the class flips the transform — otherwise the sheet jumps into place with
       no transition. Deliberately NOT requestAnimationFrame: rAF is throttled in
       background tabs, which leaves the sheet stuck closed. */
    void panel.offsetHeight;
    rfi.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    /* ⚠️ Lock the SCROLLING ELEMENT (<html>), not <body> — see the same note in
       js/sheet.js. `overflow: hidden` on <body> makes it a scroll container and
       re-parents the sticky nav to it, which jumps the nav up the page by the
       current scroll offset the moment the sheet opens. */
    document.documentElement.style.overflow = 'hidden';
    showStep(0);
    panel.querySelector(FOCUSABLE)?.focus();
  }

  /* ---- Incomplete toast ------------------------------------------------ */
  /* Shown when the sheet is closed with the form unfinished. Once per page
     view: nudging repeatedly on every close would be nagging, not helpful. */

  const toast = document.querySelector('[data-rfi-toast]');
  const toastBar = toast?.querySelector('[data-rfi-toast-bar]');
  const TOAST_LIFE_MS = 10000;
  let toastShown = false;
  let toastTimer = null;

  function hideToast() {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.classList.remove('is-visible', 'is-counting');
    const done = () => {
      toast.hidden = true;
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) done();
    else setTimeout(done, 200); /* --duration-fast */
  }

  function showToast() {
    if (!toast || toastShown) return;
    toastShown = true;
    toast.hidden = false;
    toast.style.setProperty('--rfi-toast-life', `${TOAST_LIFE_MS}ms`);
    /* Reset the countdown bar to full, then start it — same forced-reflow
       reason as the sheet: without it the bar has no start state to move from. */
    if (toastBar) toastBar.style.transform = '';
    void toast.offsetHeight;
    toast.classList.add('is-visible', 'is-counting');
    toastTimer = setTimeout(hideToast, TOAST_LIFE_MS);
  }

  toast?.querySelector('[data-rfi-toast-close]')?.addEventListener('click', hideToast);

  function close() {
    /* Closing an unfinished form is what the nudge responds to. */
    const abandoned = !completed;
    rfi.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    lastFocused?.focus();
    const done = () => {
      scrim.hidden = true;
      panel.hidden = true;
      /* Nudge only after the sheet is out of the way, so the two do not
         animate over each other. */
      if (abandoned) showToast();
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) done();
    else setTimeout(done, 450); /* --duration-med */
  }

  document.querySelectorAll('[data-rfi-open]').forEach((trigger) =>
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      open(trigger);
    })
  );

  dismiss.addEventListener('click', close);
  scrim.addEventListener('click', close);

  document.addEventListener('keydown', (event) => {
    if (!rfi.classList.contains('is-open')) return;

    if (event.key === 'Escape') {
      close();
      return;
    }

    if (event.key !== 'Tab') return;
    const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

document.addEventListener('DOMContentLoaded', initRfi);
