// Índice de nombres: muestra siempre todo el material de la sección.
// En desktop es una lista a la izquierda. En móvil es una regla de números arriba:
// cada proyecto es un número y el activo se abre con su nombre.
import { esc, isNarrow } from './lib.js';

const pad = n => String(n).padStart(2, '0');

export function createIndex(root, items, { href, onEnter, onLeave, onPick } = {}) {
  const nav = document.createElement('nav');
  nav.className = 'side';
  nav.setAttribute('aria-label', 'Índice');
  nav.innerHTML = items.map((it, i) => {
    const inner = `<span class="side__n">${pad(i + 1)}</span><span class="side__t">${esc(it.title)}</span>`;
    return href
      ? `<a class="side__item" href="${href(it)}" data-i="${i}" data-cursor-ui>${inner}</a>`
      : `<button class="side__item" type="button" data-i="${i}" data-cursor-ui>${inner}</button>`;
  }).join('') + `<span class="side__count">${pad(items.length)}</span>`;
  root.append(nav);
  const els = [...nav.querySelectorAll('.side__item')];
  let cur = -1;

  const idx = e => { const a = e.target.closest?.('.side__item'); return a ? +a.dataset.i : -1; };
  nav.addEventListener('pointerover', e => { const i = idx(e); if (i >= 0 && e.pointerType === 'mouse') onEnter?.(i); });
  nav.addEventListener('pointerleave', () => onLeave?.());
  nav.addEventListener('focusin', e => { const i = idx(e); if (i >= 0) onEnter?.(i); });
  nav.addEventListener('focusout', () => onLeave?.());
  nav.addEventListener('click', e => {
    const i = idx(e);
    if (i < 0) return;
    // En móvil, el primer toque solo abre el nombre; el segundo entra
    if (href && isNarrow() && i !== cur) { e.preventDefault(); onEnter?.(i); return; }
    onPick?.(i);
  });

  return {
    setActive(i) {
      if (i === cur) return;
      cur = i;
      els.forEach((n, k) => n.classList.toggle('is-active', k === i));
      if (i >= 0 && isNarrow()) nav.scrollTo({ left: els[i].offsetLeft - nav.clientWidth / 2 + 40, behavior: 'smooth' });
    },
  };
}
