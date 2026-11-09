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


// open({ n, title, desc, items: [src], start, from: Element, sound, next: { label, open() } })
export function openLightbox(o) {
  if (!el) build();
  const track = el.querySelector('.lb__track'), dots = el.querySelector('.lb__dots'), c = el.querySelector('.lb__c');
  el.querySelector('.lb__name b').textContent = o.n || '';
  el.querySelector('.lb__name span').textContent = o.title || '';
  el.querySelector('.lb__desc').textContent = o.desc || '';
  track.innerHTML = o.items.map((src, j) => `<figure class="lb__slide">${isVideo(src)
    ? `<video src="${src}" ${o.sound ? 'controls' : 'muted'} loop playsinline preload="metadata"></video>`
    : `<img src="${j === (o.start || 0) && o.fromSrc ? o.fromSrc : opt(src, 1600)}" data-hi="${opt(src, 1600)}" alt="" draggable="false">`}</figure>`).join('')
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
    const k0 = Math.round(track.scrollLeft / W()), img = track.children[k0]?.querySelector('img, video');
    const r = k0 === (o.start || 0) && o.from?.isConnected && o.from.getBoundingClientRect();
    if (reduced) { done(); return; }
    el.querySelectorAll('.lb__top, .lb__bottom, .lb__arrow').forEach(x => x.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }));
    el.animate([{ backgroundColor: getComputedStyle(el).backgroundColor }, { backgroundColor: 'transparent' }], { duration: 420, fill: 'forwards' }).onfinish = () => { el.getAnimations().forEach(a => a.cancel()); el.querySelectorAll('.lb__top, .lb__bottom, .lb__arrow').forEach(x => x.getAnimations().forEach(a => a.cancel())); done(); };
    if (img && r && r.width) {
      const last = img.getBoundingClientRect(), k = r.width / last.width;
      img.animate([{ transform: 'none' }, { transform: `translate(${r.left + r.width / 2 - (last.left + last.width / 2)}px,${r.top + r.height / 2 - (last.top + last.height / 2)}px) scale(${k})` }], { duration: 420, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    } else if (img) img.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.94)' }], { duration: 300, fill: 'forwards' });
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
  let wl = 0;
  const onWheel = e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); const now = performance.now(); if (now > wl && Math.abs(e.deltaY) > 12) { wl = now + 550; step(Math.sign(e.deltaY)); } } };
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
  // Apertura: el fondo aparece y la foto vuela desde donde estaba hasta su sitio, entera
  const startImg = track.children[o.start || 0]?.querySelector('img');
  const hiRes = () => track.querySelectorAll('img[data-hi]').forEach(im => { if (im.src !== im.dataset.hi) { const pre = new Image(); pre.onload = () => { im.src = im.dataset.hi; }; pre.src = im.dataset.hi; } });
  if (reduced) hiRes();
  else {
    el.animate([{ backgroundColor: 'transparent' }, { backgroundColor: getComputedStyle(el).backgroundColor }], { duration: 420, easing: 'ease-out' });
    el.querySelectorAll('.lb__top, .lb__bottom, .lb__arrow').forEach(x => x.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 200, fill: 'backwards' }));
    const fly = () => {
      const r = o.from?.getBoundingClientRect(), last = startImg?.getBoundingClientRect();
      if (!r || !last || !last.width) { track.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: EASE }); hiRes(); return; }
      const k = r.width / last.width;
      const dx = r.left + r.width / 2 - (last.left + last.width / 2), dy = r.top + r.height / 2 - (last.top + last.height / 2);
      startImg.animate([{ transform: `translate(${dx}px,${dy}px) scale(${k})`, borderRadius: '10px' }, { transform: 'none', borderRadius: '6px' }], { duration: 620, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = hiRes;
    };
    if (startImg && !startImg.complete) startImg.decode?.().then(fly, fly); else fly();
  }
  return { close };
}

// Cierra el visor si está abierto (al cambiar de página)
export function closeLightbox() {
  if (el && !el.hidden) el.querySelector('.lb__x').click();
}
