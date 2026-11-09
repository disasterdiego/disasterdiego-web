// DESIGN en móvil: una ficha por proyecto (número, nombre, una línea y su tira de fotos).
// Al tocar una foto se abre a pantalla completa desde donde estaba y se pasa en horizontal;
// al final del carrete, el siguiente proyecto.
import { DESIGN } from '../data.js';
import { opt, esc, clamp, reduced } from '../lib.js';

const isVideo = u => u.endsWith('.mp4') || u.includes('/video/upload/');
const poster = (u, w) => (isVideo(u) ? u.replace(/\.mp4$/i, '.jpg') : opt(u, w));
const pad = n => String(n).padStart(2, '0');
const EASE = 'cubic-bezier(.76,0,.24,1)';

export function mountDesignMobile(root) {
  const total = DESIGN.reduce((a, d) => a + d.slides.length, 0);
  root.classList.add('is-dm');
  root.innerHTML = `
    <div class="dm">
      <header class="dm__intro">
        <p class="dm__k">02 — Design</p>
        <h1 class="dm__h">Carruseles, <br>pieza a pieza</h1>
        <p class="dm__sub"><span>${pad(DESIGN.length)} proyectos</span><span>${total} piezas</span><span>Toca una foto ↗</span></p>
      </header>
      ${DESIGN.map((d, i) => `
      <article class="dm__card" data-i="${i}" style="--i:${i}">
        <header class="dm__meta">
          <b class="dm__n">${pad(i + 1)}</b>
          <h2 class="dm__t">${esc(d.title)}</h2>
          <span class="dm__tag">${esc(d.tag || '')} · ${pad(d.slides.length)}</span>
        </header>
        ${d.desc ? `<p class="dm__desc">${esc(d.desc)}</p>` : ''}
        <div class="dm__strip">${d.slides.map((src, k) => `
          <button type="button" class="dm__shot" data-k="${k}" aria-label="Ampliar ${esc(d.title)}, pieza ${k + 1}">
            <img src="${poster(src, 520)}" alt="" loading="${i < 2 ? 'eager' : 'lazy'}" draggable="false">${isVideo(src) ? '<i class="dm__play" aria-hidden="true">▶</i>' : ''}
          </button>`).join('')}
        </div>
        <div class="dm__foot"><span class="dm__bar"><i></i></span><span class="dm__c">01/${pad(d.slides.length)}</span></div>
      </article>`).join('')}
      <p class="dm__end">Fin del carrete — <a href="#/content">03 Content →</a></p>
    </div>
    <div class="dv" id="dv" role="dialog" aria-modal="true" aria-label="Proyecto ampliado" hidden>
      <header class="dv__top">
        <p class="dv__name"><b id="dv-n"></b><span id="dv-t"></span></p>
        <span class="dv__c" id="dv-c"></span>
        <button type="button" class="dv__x" id="dv-x" aria-label="Cerrar">×</button>
      </header>
      <div class="dv__track" id="dv-track"></div>
      <footer class="dv__bottom"><p class="dv__desc" id="dv-d"></p><div class="dv__dots" id="dv-dots"></div></footer>
    </div>`;

  const cards = [...root.querySelectorAll('.dm__card')];
  const dv = root.querySelector('#dv'), track = root.querySelector('#dv-track'), dots = root.querySelector('#dv-dots');
  // El visor vive fuera de la vista: así queda por encima del menú
  document.body.append(dv);
  const $ = id => dv.querySelector(id);

  // Tiras: barra de avance y contador al pasar las fotos
  cards.forEach(card => {
    const strip = card.querySelector('.dm__strip'), bar = card.querySelector('.dm__bar i'), c = card.querySelector('.dm__c');
    const n = +DESIGN[card.dataset.i].slides.length;
    const upd = () => {
      const max = Math.max(1, strip.scrollWidth - strip.clientWidth);
      const p = clamp(strip.scrollLeft / max, 0, 1);
      bar.style.transform = `scaleX(${(.12 + p * .88).toFixed(3)})`;
      c.textContent = `${pad(Math.min(n, Math.round(p * (n - 1)) + 1))}/${pad(n)}`;
    };
    strip.addEventListener('scroll', upd, { passive: true });
    upd();
  });

  // La ficha del centro de la pantalla se enfoca; las demás quedan atrás
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-focus', e.isIntersecting)),
    { root, rootMargin: '-38% 0px -38% 0px' });
  cards.forEach(c => io.observe(c));

  // ---------- Visor ----------
  let cur = -1, from = null, open = false;
  const fill = i => {
    cur = i;
    const d = DESIGN[i], next = DESIGN[(i + 1) % DESIGN.length];
    $('#dv-n').textContent = pad(i + 1);
    $('#dv-t').textContent = d.title;
    $('#dv-d').textContent = d.desc || '';
    track.innerHTML = d.slides.map(src => `<figure class="dv__slide">${isVideo(src)
      ? `<video src="${src}" muted loop playsinline autoplay preload="metadata"></video>`
      : `<img src="${opt(src, 1200)}" alt="" draggable="false">`}</figure>`).join('')
      + `<button type="button" class="dv__next" id="dv-next"><small>Siguiente proyecto</small><b>${pad((i + 1) % DESIGN.length + 1)} ${esc(next.title)}</b><span>→</span></button>`;
    dots.innerHTML = d.slides.map(() => '<i></i>').join('');
    track.scrollLeft = 0;
  };
  const sync = () => {
    const n = DESIGN[cur].slides.length;
    const k = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    $('#dv-c').textContent = k < n ? `${pad(k + 1)}/${pad(n)}` : '→';
    [...dots.children].forEach((d, j) => d.classList.toggle('is-on', j === k));
    track.querySelectorAll('video').forEach((v, j) => { if (Math.abs(j - k) > 1) v.pause(); else v.play().catch(() => {}); });
  };
  track.addEventListener('scroll', sync, { passive: true });
  track.addEventListener('click', e => { if (e.target.closest('#dv-next')) { fill((cur + 1) % DESIGN.length); sync(); dv.animate([{ opacity: .3 }, { opacity: 1 }], 400); } });

  // Se abre desde la foto tocada, como una lente que se ensancha
  const clipFrom = r => `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 6px)`;
  const show = (i, k, el) => {
    fill(i);
    dv.hidden = false;
    open = true;
    document.body.classList.add('dv-open');
    track.scrollLeft = k * track.clientWidth;
    sync();
    from = el;
    if (!reduced && el) {
      dv.animate([{ clipPath: clipFrom(el.getBoundingClientRect()) }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], { duration: 620, easing: EASE });
      track.animate([{ transform: 'scale(.92)', filter: 'blur(6px)' }, { transform: 'none', filter: 'none' }], { duration: 620, easing: EASE });
    }
  };
  const hide = () => {
    if (!open) return;
    open = false;
    document.body.classList.remove('dv-open');
    // Vuelve a la foto en la que estás, si es del mismo proyecto
    const k = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    const card = cards[cur], target = card?.querySelectorAll('.dm__shot')[k] || from;
    if (target && card) {
      const strip = card.querySelector('.dm__strip');
      strip.scrollLeft = Math.max(0, target.offsetLeft - 16);
      card.scrollIntoView({ block: 'center' });
    }
    const done = () => { dv.hidden = true; track.querySelectorAll('video').forEach(v => v.pause()); };
    if (reduced || !target) { done(); return; }
    dv.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: clipFrom(target.getBoundingClientRect()) }], { duration: 480, easing: EASE }).onfinish = done;
  };
  root.querySelector('.dm').addEventListener('click', e => {
    const shot = e.target.closest('.dm__shot');
    if (!shot) return;
    show(+shot.closest('.dm__card').dataset.i, +shot.dataset.k, shot);
  });
  $('#dv-x').addEventListener('click', hide);
  const onKey = e => { if (e.key === 'Escape') hide(); };
  addEventListener('keydown', onKey);
  // Deslizar hacia abajo cierra
  let sy = null;
  dv.addEventListener('touchstart', e => { sy = e.touches[0].clientY; }, { passive: true });
  dv.addEventListener('touchmove', e => {
    if (sy === null) return;
    const dy = e.touches[0].clientY - sy;
    if (dy > 0) track.style.transform = `translateY(${dy * .5}px) scale(${1 - Math.min(dy, 300) / 1500})`;
  }, { passive: true });
  dv.addEventListener('touchend', e => {
    const dy = (e.changedTouches[0]?.clientY ?? 0) - (sy ?? 0);
    sy = null;
    track.style.transform = '';
    if (dy > 110) hide();
  });

  return () => {
    io.disconnect();
    removeEventListener('keydown', onKey);
    document.body.classList.remove('dv-open');
    root.classList.remove('is-dm');
    dv.remove();
    track.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
  };
}
