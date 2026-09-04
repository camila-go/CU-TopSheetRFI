/* Application sheet controller.
 *
 * Drives the ten-step application ported from apply.capella.edu (captured
 * 2026-08-13) inside a bottom sheet on mobile / right-aligned modal on desktop.
 *
 * ⚠️ PROTOTYPE ONLY. There is deliberately NO submit, NO endpoint and NO
 * persistence — `collect()` exists so the steps can echo entered values back
 * (the live wizard greets you by first name and confirms your email), and its
 * result never leaves this module. Do not add a fetch here without also
 * revisiting the DOB/SSN/password steps, which reproduce the real application's
 * sensitive fields.
 *
 * Step order and labels mirror the live wizard's `.tab-panel` sequence:
 *   1 name → 2 welcome → 3 dob → 4 confirm dob → 5 ssn → 6 existing account
 *   → 7 email → 8 confirm email → 9 password → 10 account created
 *
 * Steps 2, 4, 6 are CONDITIONAL on the live site (`cl-dob-flow-check`,
 * `cl-dob-match`, `cl-ssn-match-login`): they only appear when a record matches.
 * They are all reachable here so the whole flow can be reviewed — step 6 is a
 * terminal branch on live, so it offers "Go to Log In" and does not continue.
 */

// Per-step docked-button label, taken from the live wizard.
const NEXT_LABEL = {
  1: 'Continue',
  2: 'Continue',
  3: 'Continue',
  4: 'Looks good!',
  5: 'Continue',
  6: 'Go to Log In',
  7: 'Agree and Go',
  8: 'Looks good!',
  9: 'Continue',
  10: 'Ok, Got it!',
};

/* Per-field rules, by step. The docked action validates these before advancing,
 * mirroring the live wizard (whose Continue also refuses to move on).
 *
 * ⚠️ Presence alone is not enough: an earlier version only checked that a field
 * was non-empty, so "13/45/99" passed as a date of birth, "12" passed as the last
 * four SSN digits, and "abc" passed as a password. Each field carries its own
 * `test` and its own message.
 *
 * The password rules are the six the live form lists verbatim.
 */
const PASSWORD_RULES = [
  [(v) => v.length >= 8 && v.length <= 15, '8-15 characters'],
  [(v) => /[A-Z]/.test(v), 'one uppercase letter'],
  [(v) => /[a-z]/.test(v), 'one lowercase letter'],
  [(v) => /\d/.test(v), 'one number'],
  [(v) => /[^A-Za-z0-9]/.test(v), 'one special character'],
];

const FIELDS = {
  1: [
    { id: 'app-first', msg: 'Please enter your first name.' },
    { id: 'app-last', msg: 'Please enter your last name.' },
  ],
  3: [
    {
      id: 'app-dob',
      // Real calendar check, not just the shape: 02/31 must fail.
      test: (v) => {
        const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
        if (!m) return false;
        const [, mm, dd, yyyy] = m.map(Number);
        const d = new Date(yyyy, mm - 1, dd);
        return (
          d.getMonth() === mm - 1 &&
          d.getDate() === dd &&
          d.getFullYear() === yyyy &&
          d < new Date()
        );
      },
      msg: 'Please enter a valid date of birth as MM/DD/YYYY.',
    },
  ],
  5: [
    {
      id: 'app-ssn',
      test: (v) => /^\d{4}$/.test(v),
      msg: 'Please enter the last 4 digits of your SSN.',
      // The live wizard treats the checkbox as the alternative to the digits.
      skipIf: (sheet) => sheet.querySelector('[data-no-ssn]')?.checked,
    },
  ],
  7: [
    {
      id: 'app-email',
      test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v),
      msg: 'Please enter a valid email address.',
    },
  ],
  9: [
    {
      id: 'app-password',
      test: (v) => PASSWORD_RULES.every(([fn]) => fn(v)),
      msg: (v) => {
        const missing = PASSWORD_RULES.filter(([fn]) => !fn(v)).map(([, label]) => label);
        return `Your password still needs ${missing.join(', ')}.`;
      },
    },
  ],
};

// The sheet header shows the Capella logo, so these titles are announced to
// assistive tech only (the visually-hidden #sheet-title). They are not displayed.
const STEP_TITLE = {
  1: 'Your name',
  2: 'Welcome',
  3: 'Date of birth',
  4: 'Verify birthdate',
  5: 'Identity check',
  6: 'Existing account',
  7: 'Email address',
  8: 'Confirm email',
  9: 'Password',
  10: 'Account created',
};

function initSheet() {
  const sheet = document.getElementById('application-sheet');
  const scrim = document.querySelector('[data-sheet-scrim]');
  if (!sheet || !scrim) return;

  const steps = [...sheet.querySelectorAll('.sheet__step')];
  const titleEl = sheet.querySelector('#sheet-title');
  const nextBtn = sheet.querySelector('[data-sheet-next]');
  const backBtn = sheet.querySelector('[data-sheet-back]');
  const body = sheet.querySelector('[data-sheet-body]');
  const total = steps.length;

  let current = 1;
  let opener = null;

  const collect = () => ({
    firstName: (sheet.querySelector('#app-first')?.value || '').trim(),
    dob: (sheet.querySelector('#app-dob')?.value || '').trim(),
    email: (sheet.querySelector('#app-email')?.value || '').trim(),
  });

  function render() {
    const data = collect();

    steps.forEach((s) => {
      s.hidden = Number(s.dataset.step) !== current;
    });

    titleEl.textContent = STEP_TITLE[current] || 'Apply to Capella';
    nextBtn.textContent = NEXT_LABEL[current] || 'Continue';
    backBtn.hidden = current === 1;

    // Echo entered values the way the live wizard does.
    sheet.querySelectorAll('[data-first-name]').forEach((el) => {
      el.textContent = data.firstName || 'there';
    });
    const dobConfirm = sheet.querySelector('#app-dob-confirm');
    if (dobConfirm) dobConfirm.value = data.dob;
    const emailConfirm = sheet.querySelector('#app-email-confirm');
    if (emailConfirm) emailConfirm.value = data.email;

    // ⚠️ No "Step n of 10" counter. The live application doesn't show one, and an
    // invented counter also fixes a length the conditional branches don't have —
    // steps 2, 4, 5 and 6 are skipped or terminal depending on the record match,
    // so "of 10" would be wrong for most real paths.

    // render() fills the readonly confirm fields programmatically, and assigning
    // `.value` fires no events — so float them here rather than relying on the
    // listeners below.
    syncAllFloats();

    body.scrollTop = 0;
  }

  /* ---- Floating labels ---------------------------------------------------
   * jvFloat toggles its label purely on the field having a value, bound to
   * `keyup blur change`. Mirrored here on `input change blur`.
   * ⚠️ Deliberately NOT on focus: focusing an empty field leaves the label down
   * and the placeholder showing, which is the live behaviour.
   */
  const inputs = [...sheet.querySelectorAll('.sheet__input')];

  function syncFloat(input) {
    input
      .closest('.sheet__field')
      ?.classList.toggle('is-floating', input.value !== '');
  }

  function syncAllFloats() {
    inputs.forEach(syncFloat);
  }

  inputs.forEach((input) => {
    ['input', 'change', 'blur'].forEach((evt) => {
      input.addEventListener(evt, () => syncFloat(input));
    });
  });

  // ---- Validation -------------------------------------------------------
  const fieldOf = (input) => input.closest('.sheet__field');

  function clearError(input) {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    fieldOf(input)?.classList.remove('is-invalid');
  }

  function showError(input, message) {
    const err = sheet.querySelector('#' + input.id + '-error');
    input.setAttribute('aria-invalid', 'true');
    if (err) {
      // `aria-live` on the message means the text is announced when it changes,
      // so a screen reader hears WHY the step didn't advance.
      if (message) err.textContent = message;
      input.setAttribute('aria-describedby', err.id);
    }
    fieldOf(input)?.classList.add('is-invalid');
  }

  /* Runs a field's own rule. A field with no `test` is presence-only. */
  function checkField(spec) {
    const input = sheet.querySelector('#' + spec.id);
    if (!input) return true;
    if (spec.skipIf && spec.skipIf(sheet)) {
      clearError(input);
      return true;
    }
    const value = input.value.trim();
    const ok = value !== '' && (!spec.test || spec.test(value));
    if (ok) {
      clearError(input);
      return true;
    }
    showError(input, typeof spec.msg === 'function' ? spec.msg(value) : spec.msg);
    return false;
  }

  // Returns true when every field on the step passes; focuses the first failure.
  function validateStep(n) {
    let firstBad = null;
    for (const spec of FIELDS[n] || []) {
      if (!checkField(spec)) {
        if (!firstBad) firstBad = sheet.querySelector('#' + spec.id);
      }
    }
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  // Re-check on input once a field is already in error, so the message clears the
  // moment it becomes valid rather than only on the next Continue.
  sheet.querySelectorAll('.sheet__input').forEach((input) => {
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') !== 'true') return;
      const spec = (FIELDS[current] || []).find((f) => f.id === input.id);
      if (!spec) {
        if (input.value.trim()) clearError(input);
        return;
      }
      const value = input.value.trim();
      if (value !== '' && (!spec.test || spec.test(value))) clearError(input);
    });
  });

  // Ticking "I don't have SSN" clears that field's error and disables it, which
  // is the feedback the live form gives for the alternative path.
  const noSsn = sheet.querySelector('[data-no-ssn]');
  const ssnInput = sheet.querySelector('#app-ssn');
  if (noSsn && ssnInput) {
    noSsn.addEventListener('change', () => {
      ssnInput.disabled = noSsn.checked;
      if (noSsn.checked) {
        ssnInput.value = '';
        clearError(ssnInput);
        syncFloat(ssnInput);
      }
    });
  }

  function open(trigger) {
    opener = trigger || null;
    scrim.hidden = false;
    sheet.hidden = false;
    // Two frames: the element must be laid out at its off-screen transform
    // before the class flips it in, or it jumps instead of sliding.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrim.classList.add('is-open');
        sheet.classList.add('is-open');
      });
    });
    document.body.style.overflow = 'hidden';
    render();
    // Focus the first control so keyboard users land inside the dialog.
    (sheet.querySelector('.sheet__input') || nextBtn).focus();
  }

  function close() {
    scrim.classList.remove('is-open');
    sheet.classList.remove('is-open');
    document.body.style.overflow = '';
    const done = () => {
      sheet.hidden = true;
      scrim.hidden = true;
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) done();
    else sheet.addEventListener('transitionend', done, { once: true });

    /* Return focus to whatever opened the sheet, with fallbacks.
     *
     * ⚠️ `opener.focus()` alone is not enough, and neither is checking whether the
     * opener looks visible first. Three of the five triggers live in containers
     * that are closed or collapsed by the time the sheet is dismissed — the
     * megamenu, the mobile nav panel, and the mobile-only action bar — and
     * `focus()` on an element that is `visibility: hidden` or inside a closed menu
     * is a silent no-op *even though it still reports an `offsetParent`*. The
     * result was focus stranded on an input inside the now-hidden dialog, with
     * nothing to tab from.
     *
     * So: try each candidate and VERIFY it took. The header controls come before
     * a blind sweep of triggers because they are on screen at their respective
     * widths — falling straight through to the first trigger anywhere lands on the
     * "Apply" tile down in band 5 and yanks the viewport to it.
     */
    /* ⚠️ A trigger that lives inside a disclosure is the wrong target even when it
       accepts focus. The megamenu's Apply is still open and focusable at the moment
       the sheet closes, so `focus()` succeeds — and then the panel collapses, the
       focused element becomes `display: none`, and the browser silently drops focus
       to <body>. Return to the control that OWNS the panel instead, which is both
       the standard disclosure pattern and the only target that stays put. */
    let preferred = opener;
    const mega = opener && opener.closest('.megamenu');
    if (mega) {
      preferred =
        mega.closest('.main-nav__item')?.querySelector('a[aria-expanded]') || null;
    } else if (opener && opener.closest('#mobile-nav-panel')) {
      preferred = document.querySelector('.main-nav__menu-btn');
    }

    const candidates = [
      preferred,
      ...document.querySelectorAll('.main-nav__menu-btn'),
      ...document.querySelectorAll('.main-nav__apply'),
      ...document.querySelectorAll('[data-sheet-open]'),
    ].filter(Boolean);
    for (const candidate of candidates) {
      candidate.focus();
      if (document.activeElement === candidate) break;
    }
    // Nothing accepted focus — at least don't leave it inside the hidden dialog.
    if (sheet.contains(document.activeElement)) document.activeElement.blur();
  }

  nextBtn.addEventListener('click', () => {
    // Step 6 is a TERMINAL branch on the live site — it links to log in rather
    // than continuing. Step 10 is the end of the flow.
    if (current === 6 || current === total) {
      close();
      return;
    }
    // Refuse to advance while the step is incomplete, as the live wizard does.
    if (!validateStep(current)) return;
    // ⚠️ 5 → 7, skipping 6. On the live site step 6 ("We meet again!") only
    // appears when the entered SSN matches an existing Capella account, so it is
    // the exception, not the normal route — routing through it by default made
    // the common path dead-end before email/password. With no backend here there
    // is nothing to match against, so the default path skips it and step 6 is
    // reachable for review via `?step=6` or `__sheetGoTo(6)` (see below).
    current = current === 5 ? 7 : current + 1;
    render();
  });

  backBtn.addEventListener('click', () => {
    current = current === 7 ? 5 : Math.max(1, current - 1);
    render();
  });

  sheet.querySelectorAll('[data-sheet-close]').forEach((b) =>
    b.addEventListener('click', close)
  );
  scrim.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (sheet.hidden) return;
    if (e.key === 'Escape') {
      close();
      return;
    }
    // Focus trap: keep Tab inside the dialog while it is open.
    if (e.key !== 'Tab') return;
    const focusables = [...sheet.querySelectorAll(
      'button:not([hidden]), a[href], input:not([disabled]), select, textarea'
    )].filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* Every apply affordance on the page opens the sheet instead of navigating.
   *
   * Keyed on an explicit `data-sheet-open` attribute, and delegated. ⚠️ Both
   * details are fixes for real misses:
   *
   *   - Matching the label text against /^apply now$/i silently skipped the
   *     "Apply" tile in the Make your move band, whose label is just "Apply".
   *     On the live site that tile links to apply.capella.edu like every other
   *     one, so it belongs here — but no amount of care with a text pattern
   *     makes the set auditable. An attribute does.
   *   - Binding with a one-shot querySelectorAll at DOMContentLoaded caught the
   *     mobile menu's "Apply now" only by luck: nav.js builds that panel in a
   *     DOMContentLoaded handler that happens to be registered first. Delegation
   *     drops the ordering dependency, so a trigger built at any later point
   *     still works.
   */
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest?.('[data-sheet-open]');
    if (!trigger) return;
    e.preventDefault();
    current = 1;
    open(trigger);
  });

  // Review hooks. "Validate every step is brought in" needs a way to reach the
  // CONDITIONAL steps (2, 4 and 6 are gated on record matches upstream), without
  // adding fake controls to the UI. `?step=N` opens the sheet there on load, and
  // `__sheetGoTo(n)` jumps while it is open.
  window.__sheetGoTo = (n) => {
    const target = Number(n);
    if (!Number.isInteger(target) || target < 1 || target > total) return false;
    if (sheet.hidden) open(null);
    current = target;
    render();
    return true;
  };

  const requested = Number(new URLSearchParams(location.search).get('step'));
  if (Number.isInteger(requested) && requested >= 1 && requested <= total) {
    window.__sheetGoTo(requested);
  }
}

document.addEventListener('DOMContentLoaded', initSheet);
