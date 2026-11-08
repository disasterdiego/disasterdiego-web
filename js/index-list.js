// Índice de nombres: muestra siempre todo el material de la sección.
// En desktop es una lista a la izquierda. En móvil es una pastilla arriba pensada
// para el dedo: flechas para pasar, y al tocar el nombre se despliega la lista entera.
import { esc } from './lib.js';

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

  // Móvil: ‹ 03/08 Nombre ▾ ›
  const pill = document.createElement('div');
  pill.className = 'side__pill';
  pill.innerHTML = `<button type="button" class="side__arrow" data-step="-1" aria-label="Anterior">‹</button>
    <button type="button" class="side__cur" aria-expanded="false" aria-label="Ver todos"><b></b><span></span><i aria-hidden="true">▾</i></button>
    <button type="button" class="side__arrow" data-step="1" aria-label="Siguiente">›</button>`;
  nav.prepend(pill);
  const curBtn = pill.querySelector('.side__cur');
  const setOpen = on => { nav.classList.toggle('is-open', on); curBtn.setAttribute('aria-expanded', on); };
  pill.addEventListener('click', e => {
    e.stopPropagation();
    const step = e.target.closest('[data-step]');
    if (step) { const n = items.length, i = ((cur < 0 ? 0 : cur) + +step.dataset.step + n) % n; setOpen(false); (href ? onEnter : onPick || onEnter)?.(i); return; }
    if (e.target.closest('.side__cur')) setOpen(!nav.classList.contains('is-open'));
  });
  const outside = e => { if (!nav.contains(e.target)) setOpen(false); };
  document.addEventListener('pointerdown', outside);
  new MutationObserver(() => { if (!nav.isConnected) document.removeEventListener('pointerdown', outside); }).observe(root, { childList: true });

  const idx = e => { const a = e.target.closest?.('.side__item'); return a ? +a.dataset.i : -1; };
  nav.addEventListener('pointerover', e => { const i = idx(e); if (i >= 0 && e.pointerType === 'mouse') onEnter?.(i); });
  nav.addEventListener('pointerleave', () => onLeave?.());
  nav.addEventListener('focusin', e => { const i = idx(e); if (i >= 0) onEnter?.(i); });
  nav.addEventListener('focusout', () => onLeave?.());
  nav.addEventListener('click', e => {
    const i = idx(e);
    if (i < 0) return;
    setOpen(false);
    onPick?.(i);
  });

  const api = {
    setActive(i) {
      if (i === cur) return;
      cur = i;
      els.forEach((n, k) => n.classList.toggle('is-active', k === i));
      const k = i < 0 ? 0 : i;
      curBtn.querySelector('b').textContent = `${pad(k + 1)}/${pad(items.length)}`;
      curBtn.querySelector('span').textContent = items[k].title;
    },
  };
  cur = -2; api.setActive(-1);
  return api;
}
