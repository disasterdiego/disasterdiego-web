// Índice de nombres: muestra siempre todo el material de la sección.
// En desktop va a la izquierda; en móvil es una tira horizontal sobre el menú.
import { esc, isNarrow } from './lib.js';

export function createIndex(root, items, { href, onEnter, onLeave, onPick } = {}) {
  const nav = document.createElement('nav');
  nav.className = 'side';
  nav.setAttribute('aria-label', 'Índice');
  nav.innerHTML = items.map((it, i) => (href
    ? `<a class="side__item" href="${href(it)}" data-i="${i}" data-cursor-ui>${esc(it.title)}</a>`
    : `<button class="side__item" type="button" data-i="${i}" data-cursor-ui>${esc(it.title)}</button>`)).join('');
  root.append(nav);
  const els = [...nav.children];
  let cur = -1;

  const idx = e => { const a = e.target.closest?.('.side__item'); return a ? +a.dataset.i : -1; };
  nav.addEventListener('pointerover', e => { const i = idx(e); if (i >= 0 && e.pointerType === 'mouse') onEnter?.(i); });
  nav.addEventListener('pointerleave', () => onLeave?.());
  nav.addEventListener('focusin', e => { const i = idx(e); if (i >= 0) onEnter?.(i); });
  nav.addEventListener('focusout', () => onLeave?.());
  nav.addEventListener('click', e => { const i = idx(e); if (i >= 0) onPick?.(i); });

  return {
    setActive(i) {
      if (i === cur) return;
      cur = i;
      els.forEach((n, k) => n.classList.toggle('is-active', k === i));
      if (i >= 0 && isNarrow()) nav.scrollTo({ left: els[i].offsetLeft - 10, behavior: 'smooth' });
    },
  };
}
