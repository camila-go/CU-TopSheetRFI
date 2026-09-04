/* Edge-case suite for the homepage prototype.
 *
 * HOW TO RUN
 *   Open the homepage, then paste this whole file into the browser console and
 *   call `__edgeCases()`. It returns { total, failing, failures, all }.
 *   Or load it after the app's own modules:
 *       <script src="/tools/edge-cases.js"></script>
 *   and call `__edgeCases()` from the console.
 *
 * WHY IT IS SYNCHRONOUS
 * ⚠️ Deliberately no `await`, no `setTimeout`, no `requestAnimationFrame`. The
 * Browser pane this was developed against degrades over a long session: synthetic
 * clicks stop being delivered, then rAF stops firing, then timers do. A suite
 * built on any of those silently hangs instead of failing. Everything here drives
 * the app through direct `dispatchEvent` and reads state back in the same tick, so
 * it runs even in a stalled pane. The cost is that it cannot assert on anything
 * animated — see NOT COVERED at the bottom.
 *
 * It also neutralises transitions and force-opens the sheet rather than waiting on
 * the double-rAF in `open()`, for the same reason.
 */
(function () {
  const D = document;

  function run() {
    const R = [];
    const t = (name, got, want) =>
      R.push({ name, got, want, pass: JSON.stringify(got) === JSON.stringify(want) });
    const ok = (name, cond, detail) => R.push({ name, got: detail, want: 'truthy', pass: !!cond });

    const sheet = D.getElementById('application-sheet');
    const scrim = D.querySelector('[data-sheet-scrim]');
    if (!sheet || !scrim) return { error: 'application sheet not found — is this the homepage?' };

    // Kill transitions so state can be read in the same tick.
    sheet.style.transition = 'none';
    scrim.style.transition = 'none';

    const force = () => {
      scrim.hidden = false;
      sheet.hidden = false;
      sheet.classList.add('is-open');
    };
    const hardClose = () => {
      sheet.classList.remove('is-open');
      sheet.hidden = true;
      scrim.classList.remove('is-open');
      scrim.hidden = true;
      D.body.style.overflow = '';
    };
    const goTo = (n) => window.__sheetGoTo(n);
    const step = () => +[...sheet.querySelectorAll('.sheet__step')].find((s) => !s.hidden).dataset.step;
    const next = () => D.querySelector('[data-sheet-next]').click();
    const set = (id, v) => {
      const el = D.getElementById(id);
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return el;
    };
    const invalid = (id) => D.getElementById(id).getAttribute('aria-invalid') === 'true';
    const errText = (id) => D.querySelector('#' + id + '-error')?.textContent.trim() || '';
    const click = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    /* ---- 1. Required fields ------------------------------------------------ */
    force();
    goTo(1);
    set('app-first', '   ');
    set('app-last', '   ');
    next();
    // ⚠️ Whitespace is the classic hole in a presence check.
    t('whitespace-only name is rejected', invalid('app-first'), true);
    t('rejected step does not advance', step(), 1);

    /* ---- 2. Date of birth -------------------------------------------------- */
    // ⚠️ The shape MM/DD/YYYY is not enough — 02/31 matches the pattern and is
    // not a date. The rule builds a Date and checks it didn't roll over.
    const dobCase = (v) => {
      goTo(3);
      set('app-dob', v);
      next();
      return step() === 3 ? 'rejected' : 'accepted';
    };
    t('DOB leap day 02/29/2024', dobCase('02/29/2024'), 'accepted');
    t('DOB 02/29/2023 (not a leap year)', dobCase('02/29/2023'), 'rejected');
    t('DOB 02/31/1990 (rolls over)', dobCase('02/31/1990'), 'rejected');
    t('DOB 13/01/1990 (month 13)', dobCase('13/01/1990'), 'rejected');
    t('DOB 00/00/0000', dobCase('00/00/0000'), 'rejected');
    t('DOB 12/31/2099 (future)', dobCase('12/31/2099'), 'rejected');
    t('DOB 1/1/1990 (unpadded)', dobCase('1/1/1990'), 'rejected');
    t('DOB 1990-01-02 (wrong separator)', dobCase('1990-01-02'), 'rejected');
    t('DOB surrounded by spaces', dobCase(' 05/12/1990 '), 'accepted');

    /* ---- 3. SSN last four -------------------------------------------------- */
    const ssnCase = (v) => {
      goTo(5);
      const cb = D.querySelector('[data-no-ssn]');
      if (cb.checked) { cb.checked = false; cb.dispatchEvent(new Event('change', { bubbles: true })); }
      set('app-ssn', v);
      next();
      const s = step();
      return s === 5 ? 'rejected' : 'accepted';
    };
    t('SSN 0000 is a legitimate four digits', ssnCase('0000'), 'accepted');
    t('SSN 12 (too short)', ssnCase('12'), 'rejected');
    t('SSN 12345 (too long)', ssnCase('12345'), 'rejected');
    t('SSN 12a4 (not digits)', ssnCase('12a4'), 'rejected');

    /* ---- 4. The "no SSN" alternative path ---------------------------------- */
    goTo(5);
    const cb = D.querySelector('[data-no-ssn]');
    set('app-ssn', '');
    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    next();
    const advancedOnCheckbox = step() !== 5;
    goTo(5);
    t('ticking "no SSN" satisfies the step', advancedOnCheckbox, true);
    t('ticking disables the SSN field', D.getElementById('app-ssn').disabled, true);
    // ⚠️ The round trip matters: unticking has to restore the requirement.
    cb.checked = false;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    next();
    t('unticking re-requires the SSN', step(), 5);
    t('unticking re-enables the field', D.getElementById('app-ssn').disabled, false);

    /* ---- 5. Email ---------------------------------------------------------- */
    const emailCase = (v) => {
      goTo(7);
      set('app-email', v);
      next();
      const s = step();
      return s === 7 ? 'rejected' : 'accepted';
    };
    t('email a@b.co', emailCase('a@b.co'), 'accepted');
    t('email a@b.c (single-char TLD)', emailCase('a@b.c'), 'rejected');
    t('email with an interior space', emailCase('a b@c.co'), 'rejected');
    t('email a@@b.co', emailCase('a@@b.co'), 'rejected');
    t('email with no @', emailCase('nope'), 'rejected');

    /* ---- 6. Password boundaries -------------------------------------------- */
    const pwCase = (v) => {
      goTo(9);
      set('app-password', v);
      next();
      const s = step();
      return s === 9 ? 'rejected' : 'accepted';
    };
    t('password at the 8-char floor', pwCase('Aa1!aaaa'), 'accepted');
    t('password at the 15-char ceiling', pwCase('Aa1!aaaaaaaaaaa'), 'accepted');
    t('password 16 chars (over)', pwCase('Aa1!aaaaaaaaaaaa'), 'rejected');
    t('password 7 chars (under)', pwCase('Aa1!aaa'), 'rejected');
    t('password with no uppercase', pwCase('aa1!aaaa'), 'rejected');
    t('password with no digit', pwCase('Aa!!aaaa'), 'rejected');
    t('password with no special char', pwCase('Aa11aaaa'), 'rejected');
    goTo(9);
    set('app-password', 'aaaaaaaa');
    next();
    const pwMsg = errText('app-password');
    ok('password message names the unmet rules',
      /uppercase/.test(pwMsg) && /number/.test(pwMsg) && /special/.test(pwMsg), pwMsg);

    /* ---- 7. Errors clear as the user fixes them --------------------------- */
    goTo(7);
    set('app-email', 'nope');
    next();
    const wasInvalid = invalid('app-email');
    set('app-email', 'a@b.co');
    t('error clears on input, not on blur', { wasInvalid, nowInvalid: invalid('app-email') },
      { wasInvalid: true, nowInvalid: false });

    /* ---- 8. Value echo between steps -------------------------------------- */
    goTo(1);
    set('app-first', 'Camila');
    goTo(2);
    t('greeting echoes the entered name',
      sheet.querySelector('[data-step="2"] [data-first-name]').textContent, 'Camila');
    goTo(1);
    set('app-first', 'Bo');
    goTo(2);
    t('greeting re-echoes after an edit',
      sheet.querySelector('[data-step="2"] [data-first-name]').textContent, 'Bo');
    goTo(1);
    set('app-first', '');
    goTo(2);
    t('empty name falls back to "there"',
      sheet.querySelector('[data-step="2"] [data-first-name]').textContent, 'there');

    /* ---- 9. Untrusted input ----------------------------------------------- */
    // ⚠️ The echo must go in as text. If it were ever switched to innerHTML this
    // is the case that catches it.
    goTo(1);
    set('app-first', '<img src=x onerror=alert(1)>');
    goTo(2);
    const host = sheet.querySelector('[data-step="2"] [data-first-name]');
    t('markup in a name is inserted as text, not parsed',
      { imgs: host.querySelectorAll('img').length, firstChildIsText: host.childNodes[0]?.nodeType === 3 },
      { imgs: 0, firstChildIsText: true });

    /* ---- 10. Overflow ----------------------------------------------------- */
    goTo(1);
    set('app-first', 'Wolfeschlegelsteinhausenbergerdorff'.repeat(3));
    goTo(2);
    ok('a very long name does not widen the sheet',
      Math.round(sheet.scrollWidth) <= Math.ceil(sheet.getBoundingClientRect().width) + 1,
      { scrollWidth: sheet.scrollWidth, width: Math.round(sheet.getBoundingClientRect().width) });
    ok('a very long name does not scroll the page sideways',
      D.documentElement.scrollWidth <= window.innerWidth,
      { docScrollWidth: D.documentElement.scrollWidth, innerWidth: window.innerWidth });

    /* ---- 11. Reopening ---------------------------------------------------- */
    goTo(1);
    set('app-first', 'Camila');
    goTo(7);
    sheet.querySelector('[data-sheet-close]').click();
    click(D.querySelector('.main-nav__apply'));
    sheet.classList.add('is-open');
    t('reopening returns to step 1', step(), 1);
    // ⚠️ Values persist across a close, so the floating labels must be re-synced
    // on render — assigning `.value` in code fires no events of its own.
    t('reopening keeps floated labels in sync',
      D.getElementById('app-first').closest('.sheet__field').classList.contains('is-floating'), true);

    /* ---- 12. Review-hook guards ------------------------------------------- */
    t('__sheetGoTo(99) refused', goTo(99), false);
    t('__sheetGoTo(0) refused', goTo(0), false);
    t('__sheetGoTo("abc") refused', goTo('abc'), false);
    t('__sheetGoTo(2.5) refused', goTo(2.5), false);
    t('__sheetGoTo("7") accepted', goTo('7'), true);

    /* ---- 13. Dismissal ---------------------------------------------------- */
    hardClose();
    click(D.querySelector('.main-nav__apply'));
    sheet.classList.add('is-open');
    t('body scroll is locked while open', D.body.style.overflow, 'hidden');
    D.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    t('Escape closes', sheet.classList.contains('is-open'), false);
    t('body scroll is released on close', D.body.style.overflow, '');

    click(D.querySelector('.main-nav__apply'));
    sheet.classList.add('is-open');
    click(scrim);
    t('scrim click closes', sheet.classList.contains('is-open'), false);

    click(D.querySelector('.main-nav__apply'));
    sheet.classList.add('is-open');
    click(sheet.querySelector('.sheet__body'));
    t('a click inside the sheet does not close it', sheet.classList.contains('is-open'), true);

    /* ---- 14. Focus trap --------------------------------------------------- */
    const focusables = [...sheet.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    )].filter((el) => !el.hidden && !el.closest('[hidden]'));
    ok('the sheet has focusable content', focusables.length > 1, focusables.length);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    last.focus();
    sheet.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    t('Tab wraps from the last control to the first', D.activeElement === first, true);
    first.focus();
    sheet.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    t('Shift+Tab wraps from the first control to the last', D.activeElement === last, true);
    hardClose();

    /* ---- 15. Every apply affordance opens the sheet ------------------------ */
    // ⚠️ Counted from the attribute, not from the label text: the "Apply" tile in
    // the Make your move band is not called "Apply now" and was missed for
    // exactly that reason.
    const triggers = [...D.querySelectorAll('[data-sheet-open]')];
    ok('all five apply triggers are marked', triggers.length === 5, triggers.length);
    const unmarked = [...D.querySelectorAll('a, button, [role=button]')]
      .filter((el) => /\bapply\b/i.test(el.textContent || ''))
      .filter((el) => !el.closest('#application-sheet'))
      .filter((el) => !el.hasAttribute('data-sheet-open'));
    t('no apply-labelled control is left unwired', unmarked.length, 0);
    triggers.forEach((trigger, i) => {
      hardClose();
      goTo(9);
      hardClose();
      click(trigger);
      const label = (trigger.className || 'mobile-menu footer link').toString().split(/\s+/)[0];
      ok(`trigger ${i + 1} (${label}) opens the sheet at step 1`,
        !sheet.hidden && step() === 1, { hidden: sheet.hidden, step: step() });
    });
    hardClose();

    /* ---- 16. Hero program finder ------------------------------------------ */
    const chip = (re) => [...D.querySelectorAll('.chip-red')].find((a) => re.test(a.textContent));
    const area = D.getElementById('hero-area');
    const spec = D.getElementById('hero-spec');
    const cta = D.querySelector('.hero__cta');
    const shown = (el) => !!el && !el.hidden && !el.closest('[hidden]');
    const pick = (sel, re) => {
      const o = [...sel.options].find((x) => re.test(x.textContent));
      sel.value = o.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    };

    chip(/Master/).click();
    t('picking a degree reveals the area select', shown(area), true);
    t('the specialisation stays hidden', shown(spec), false);
    pick(area, /Nursing/);
    t('picking an area reveals the specialisation', shown(spec), true);
    t('the CTA stays hidden until a specialisation is picked', shown(cta), false);
    pick(spec, /MSN/);
    t('picking a specialisation reveals the CTA', shown(cta), true);

    // ⚠️ Switching a step backwards must not leave a stale downstream choice.
    pick(area, /Business/);
    ok('switching area clears the stale specialisation and hides the CTA',
      !spec.value && !shown(cta), { specValue: spec.value, ctaVisible: shown(cta) });
    pick(area, /Business/);
    pick(spec, /MBA|MS in/);
    chip(/Doctoral/).click();
    ok('switching degree level clears area and specialisation',
      !area.value && !spec.value && !shown(spec) && !shown(cta),
      { areaValue: area.value, specValue: spec.value });
    t('exactly one degree chip reads as selected',
      D.querySelectorAll('.chip-red.is-selected').length, 1);

    /* ---- 17. Select overflow --------------------------------------------- */
    // ⚠️ Labels are far longer than the 212px box — 17 specialisations overrun the
    // text area, worst by ~304px. Without ellipsis they clip mid-word into the
    // chevron, which is the bug this guards.
    const sc = getComputedStyle(area);
    t('selects ellipsize rather than clip',
      { textOverflow: sc.textOverflow, whiteSpace: sc.whiteSpace },
      { textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
    // The chevron sits 24px in and is 12px wide, so its left edge is 36px from the
    // right edge. padding-right must reach it or the text prints over the arrow.
    ok('text area stops at or before the chevron',
      parseFloat(sc.paddingRight) >= 36,
      { paddingRight: sc.paddingRight, chevronLeftEdgeFromRight: 36 });

    return {
      total: R.length,
      failing: R.filter((r) => !r.pass).length,
      failures: R.filter((r) => !r.pass),
      all: R.map((r) => (r.pass ? 'PASS ' : 'FAIL ') + r.name),
    };
  }

  window.__edgeCases = run;
  console.info('Edge-case suite loaded. Call __edgeCases() to run it.');
})();

/* NOT COVERED — needs a healthy browser, do these by hand
 * ------------------------------------------------------------------
 * - The slide-in and slide-out animations, and that `transitionend` actually
 *   fires so the sheet ends up `hidden` (this suite disables transitions).
 * - Real pointer input: the suite dispatches events, so it cannot catch a control
 *   that is covered by another element and unclickable in practice.
 * - `:hover` and `:focus-visible` appearance. `:focus` does not even match while
 *   the pane is not the active window, so focus rings must be eyeballed.
 * - Resizing across the 768px breakpoint *while the sheet is open*, where the
 *   transform swaps from translateY to translateX.
 * - Touch: dragging the sheet by its handle is not implemented; the handle is
 *   decorative, which is itself worth revisiting.
 * - Screen-reader announcement order. The aria wiring is asserted structurally
 *   here, but only a real screen reader shows what a user hears.
 */
