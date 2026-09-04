/* Footer partner carousel. Lifted from CU-Homepage-Test-v2 (commit 0e61516). */

// Footer partner carousel. Mirrors the live site: manual arrows only (no
// autoplay), paging by a whole view. `--per-view` lives in CSS so the
// breakpoints own the responsive behaviour and this only has to read it back.
function initFooterPartners() {
  const root = document.querySelector('.footer__partners');
  if (!root) return;

  const track = root.querySelector('.footer__partners-track');
  const items = [...root.querySelectorAll('.footer__partners-item')];
  const prev = root.querySelector('.footer__partners-arrow--prev');
  const next = root.querySelector('.footer__partners-arrow--next');
  if (!track || !items.length || !prev || !next) return;

  let index = 0;

  const perView = () => {
    const raw = parseInt(getComputedStyle(root).getPropertyValue('--per-view'), 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  };
  // Last valid start index — never scroll past the final full view, or the
  // track would leave empty space on the right.
  const maxIndex = () => Math.max(0, items.length - perView());

  function render() {
    index = Math.min(index, maxIndex());
    track.style.transform = `translateX(${(-index * 100) / perView()}%)`;
    // Disabled (not hidden) at the ends so the viewport width never changes.
    prev.disabled = index <= 0;
    next.disabled = index >= maxIndex();
    items.forEach((item, i) => {
      const visible = i >= index && i < index + perView();
      item.setAttribute('aria-hidden', String(!visible));
      const link = item.querySelector('a');
      if (link) link.tabIndex = visible ? 0 : -1;
    });
  }

  prev.addEventListener('click', () => {
    index = Math.max(0, index - perView());
    render();
  });
  next.addEventListener('click', () => {
    index = Math.min(maxIndex(), index + perView());
    render();
  });

  // per-view changes with the breakpoint, so re-clamp on resize.
  let raf = null;
  window.addEventListener('resize', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      render();
    });
  });

  render();
}

document.addEventListener('DOMContentLoaded', initFooterPartners);
