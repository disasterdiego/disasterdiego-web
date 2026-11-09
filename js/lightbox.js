// Visor a pantalla completa, común a Design y Content.
// Se abre desde la pieza tocada como una lente que se ensancha; se pasa en horizontal
// (dedo, flechas, rueda) y se cierra con ×, Esc o deslizando hacia abajo.
import { opt, esc, reduced } from './lib.js';

const isVideo = u => u.endsWith('.mp4') || u.includes('/video/upload/');
const pad = n => String(n).padStart(2, '0');
const EASE = 'cubic-bezier(.76,0,.24,1)';

let el = null;
const build = () => {
  el = document.createElement('div');
  el.className = 'lb';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <header class="lb__top"><p class="lb__name"><b></b><span></span></p><span class="lb__c"></span>
      <button type="button" class="lb__x" data-cursor-ui aria-label="Cerrar">×</button></header>
    <div class="lb__track"></div>
    <button type="button" class="lb__arrow lb__arrow--l" data-cursor-ui aria-label="Anterior">←</button>
    <button type="button" class="lb__arrow lb__arrow--r" data-cursor-ui aria-label="Siguiente">→</button>
    <footer class="lb__bottom"><p class="lb__desc"></p><div class="lb__dots"></div></footer>`;
  document.body.append(el);
};

const clipOf = r => `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 8px)`;

// open({ n, title, desc, items: [src], start, from: Element, sound, next: { label, open() } })
export function openLightbox(o) {
  if (!el) build();
  const track = el.querySelector('.lb__track'), dots = el.querySelector('.lb__dots'), c = el.querySelector('.lb__c');
  el.querySelector('.lb__name b').textContent = o.n || '';
  el.querySelector('.lb__name span').textContent = o.title || '';
  el.querySelector('.lb__desc').textContent = o.desc || '';
  track.innerHTML = o.items.map(src => `<figure class="lb__slide">${isVideo(src)
    ? `<video src="${src}" ${o.sound ? 'controls' : 'muted'} loop playsinline preload="metadata"></video>`
    : `<img src="${opt(src, 1600)}" alt="" draggable="false">`}</figure>`).join('')
    + (o.next ? `<button type="button" class="lb__next" data-cursor-ui><small>Siguiente</small><b>${esc(o.next.label)}</b><span>→</span></button>` : '');
  dots.innerHTML = o.items.length > 1 ? o.items.map(() => '<i></i>').join('') : '';
  el.querySelector('.lb__arrow--l').hidden = el.querySelector('.lb__arrow--r').hidden = o.items.length < 2 && !o.next;
  el.hidden = false;
  document.body.classList.add('lb-open');
  const W = () => Math.max(1, track.clientWidth);
  track.scrollLeft = (o.start || 0) * W();
  const vids = [...track.querySelectorAll('video')];
  const sync = () => {
    const k = Math.round(track.scrollLeft / W());
    c.textContent = k < o.items.length ? `${pad(k + 1)}/${pad(o.items.length)}` : '→';
    [...dots.children].forEach((d, j) => d.classList.toggle('is-on', j === k));
    track.querySelectorAll('.lb__slide').forEach((s, j) => {
      const v = s.querySelector('video');
      if (!v) return;
      if (j === k) v.play().catch(() => {}); else v.pause();
    });
  };
  sync();
  const step = d => track.scrollTo({ left: (Math.round(track.scrollLeft / W()) + d) * W(), behavior: reduced ? 'auto' : 'smooth' });

  let open = true, sy = null;
  const close = () => {
    if (!open) return;
    open = false;
    document.body.classList.remove('lb-open');
    off();
    const done = () => { el.hidden = true; vids.forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); }); track.innerHTML = ''; };
    const r = o.from?.isConnected && o.from.getBoundingClientRect();
    if (reduced || !r || !r.width) { done(); return; }
    el.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: clipOf(r) }], { duration: 460, easing: EASE }).onfinish = done;
  };
  const onClick = e => {
    if (e.target.closest('.lb__x')) close();
    else if (e.target.closest('.lb__arrow--l')) step(-1);
    else if (e.target.closest('.lb__arrow--r')) step(1);
    else if (e.target.closest('.lb__next')) { const nx = o.next; open = false; off(); nx.open(); }
  };
  const onKey = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
  const onStart = e => { sy = e.touches[0].clientY; };
  const onMove = e => { if (sy === null) return; const dy = e.touches[0].clientY - sy; if (dy > 0) track.style.transform = `translateY(${dy * .5}px) scale(${1 - Math.min(dy, 300) / 1500})`; };
  const onEnd = e => { const dy = (e.changedTouches[0]?.clientY ?? 0) - (sy ?? 0); sy = null; track.style.transform = ''; if (dy > 110) close(); };
  const onWheel = e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); clearTimeout(onWheel.t); onWheel.t = setTimeout(() => step(Math.sign(e.deltaY)), 40); } };
  track.addEventListener('scroll', sync, { passive: true });
  el.addEventListener('click', onClick);
  addEventListener('keydown', onKey);
  el.addEventListener('touchstart', onStart, { passive: true });
  el.addEventListener('touchmove', onMove, { passive: true });
  el.addEventListener('touchend', onEnd);
  el.addEventListener('wheel', onWheel, { passive: false });
  function off() {
    track.removeEventListener('scroll', sync);
    el.removeEventListener('click', onClick);
    removeEventListener('keydown', onKey);
    el.removeEventListener('touchstart', onStart);
    el.removeEventListener('touchmove', onMove);
    el.removeEventListener('touchend', onEnd);
    el.removeEventListener('wheel', onWheel);
  }
  if (!reduced && o.from) {
    const r = o.from.getBoundingClientRect();
    el.animate([{ clipPath: clipOf(r) }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], { duration: 640, easing: EASE });
    track.animate([{ transform: 'scale(.92)', filter: 'blur(8px)' }, { transform: 'none', filter: 'none' }], { duration: 640, easing: EASE });
  }
  return { close };
}

// Cierra el visor si está abierto (al cambiar de página)
export function closeLightbox() {
  if (el && !el.hidden) el.querySelector('.lb__x').click();
}
