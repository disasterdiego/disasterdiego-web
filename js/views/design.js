// DESIGN: tres maneras de ver los carruseles, todas desde la lente. Se cambia arriba.
//  1 · Contactos   — hoja de contactos: cada proyecto es una tira de negativos; una lupa
//                    amplía la foto que miras y el resto de filas se desenfoca.
//  2 · Profundidad — los proyectos están uno detrás de otro; el scroll mueve el foco
//                    hacia el fondo: lo enfocado es nítido, lo demás borroso y con color separado.
//  3 · Diafragma   — un proyecto cada vez dentro de un iris; al cambiar, las láminas
//                    se cierran y se abren con el siguiente. Los nombres giran alrededor.
// En las tres, tocar una foto la abre a pantalla completa.
import { DESIGN } from '../data.js';
import { setBarSlot } from '../main.js';
import { createIndex } from '../index-list.js';
import { openLightbox, closeLightbox } from '../lightbox.js';
import { ticker, damp, clamp, opt, esc, bindDrag, isNarrow, reduced, finePointer } from '../lib.js';

const isVideo = u => u.endsWith('.mp4') || u.includes('/video/upload/');
const thumb = (u, w = 620) => (isVideo(u) ? u.replace(/\.mp4$/i, '.jpg') : opt(u, w));
const pad = n => String(n).padStart(2, '0');
const N = DESIGN.length;
const TOTAL = DESIGN.reduce((a, d) => a + d.slides.length, 0);
// La URL va absoluta: dentro de una variable CSS se resolvería desde la carpeta css/
const ca3 = src => `<i class="ca3" aria-hidden="true" style="--bg:url('${new URL(thumb(src), location.href).href}')"><b></b><b></b><b></b></i>`;

const MODES = [
  { id: 'contactos', label: 'Contactos', mount: mountContact },
  { id: 'profundidad', label: 'Profundidad', mount: mountDepth },
  { id: 'diafragma', label: 'Diafragma', mount: mountIris },
];

function openProject(i, k = 0, from = null) {
  const d = DESIGN[i], j = (i + 1) % N;
  openLightbox({
    n: pad(i + 1), title: d.title, desc: d.desc, items: d.slides, start: k, from,
    next: { label: `${pad(j + 1)} ${DESIGN[j].title}`, open: () => openProject(j, 0, null) },
  });
}

export function mountDesign(root) {
  let mode = 'contactos';
  try { mode = MODES.some(m => m.id === sessionStorage.getItem('design-v')) ? sessionStorage.getItem('design-v') : mode; } catch {}
  const slot = setBarSlot(`<div class="switch switch--3" role="group" aria-label="Versión">${MODES.map((m, i) =>
    `<button type="button" data-v="${m.id}" data-cursor-ui><span>${i + 1}</span> ${m.label}</button>`).join('')}</div>`);
  const btns = [...slot.querySelectorAll('[data-v]')];
  let off = null;
  const show = id => {
    mode = id;
    try { sessionStorage.setItem('design-v', id); } catch {}
    btns.forEach(b => { b.classList.toggle('is-active', b.dataset.v === id); b.setAttribute('aria-pressed', b.dataset.v === id); });
    off?.();
    root.innerHTML = '';
    root.classList.toggle('is-scroll', id === 'contactos');
    root.scrollTop = 0;
    off = MODES.find(m => m.id === id).mount(root);
    root.firstElementChild?.animate?.([{ opacity: 0, filter: 'blur(12px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' });
  };
  btns.forEach(b => b.addEventListener('click', () => { if (b.dataset.v !== mode) show(b.dataset.v); }));
  show(mode);
  return () => { off?.(); closeLightbox(); root.classList.remove('is-scroll'); };
}

// ---------------------------------------------------------------- 1 · CONTACTOS
function mountContact(root) {
  root.insertAdjacentHTML('beforeend', `
    <div class="dc">
      <header class="dc__intro">
        <p class="dc__k">02 — Design · Hoja de contactos</p>
        <h1 class="dc__h">Carruseles, <br>fotograma a fotograma</h1>
        <p class="dc__sub"><span>${pad(N)} proyectos</span><span>${TOTAL} piezas</span><span>${finePointer ? 'Pasa la lupa · clic para ampliar' : 'Toca para ampliar'}</span></p>
      </header>
      ${DESIGN.map((d, i) => `
      <section class="dc__row" data-i="${i}">
        <div class="dc__meta">
          <b class="dc__n">${pad(i + 1)}</b>
          <h2 class="dc__t">${esc(d.title)}</h2>
          <span class="dc__tag">${esc(d.tag || '')} · ${pad(d.slides.length)}</span>
          ${d.desc ? `<p class="dc__desc">${esc(d.desc)}</p>` : ''}
        </div>
        <div class="dc__film">${d.slides.map((src, k) => `
          <button type="button" class="dc__f" data-k="${k}" aria-label="Ampliar ${esc(d.title)}, pieza ${k + 1}">
            <img src="${thumb(src, 520)}" data-big="${thumb(src, 1400)}" alt="" loading="${i < 2 ? 'eager' : 'lazy'}" draggable="false">
            <small>${pad(i + 1)}${String.fromCharCode(65 + k)}</small>${isVideo(src) ? '<i class="dc__play">▶</i>' : ''}
          </button>`).join('')}
        </div>
      </section>`).join('')}
      <p class="dc__end">Fin de la hoja — <a href="#/content">03 Content →</a></p>
    </div>
    <div class="dc__loupe" aria-hidden="true"><i></i><span>×2.6</span></div>`);
  const dc = root.querySelector('.dc'), loupe = root.querySelector('.dc__loupe'), lens = loupe.firstElementChild;
  const rows = [...dc.querySelectorAll('.dc__row')];

  const onClick = e => {
    const f = e.target.closest('.dc__f');
    if (f) openProject(+f.closest('.dc__row').dataset.i, +f.dataset.k, f);
  };
  dc.addEventListener('click', onClick);

  // Lupa: amplía la foto que hay bajo el ratón
  const Z = 2.6, L = 220;
  let shownSrc = '';
  const onMove = e => {
    const f = e.target.closest?.('.dc__f');
    if (!f || e.pointerType !== 'mouse') { loupe.classList.remove('is-on'); return; }
    const img = f.querySelector('img'), r = f.getBoundingClientRect();
    const nw = img.naturalWidth || 4, nh = img.naturalHeight || 5;
    const s = Math.max(r.width / nw, r.height / nh), dw = nw * s, dh = nh * s;
    const ox = (r.width - dw) / 2, oy = (r.height - dh) / 2;
    if (shownSrc !== img.dataset.big) { shownSrc = img.dataset.big; lens.style.backgroundImage = `url('${img.dataset.big}'), url('${img.currentSrc || img.src}')`; }
    lens.style.backgroundSize = `${dw * Z}px ${dh * Z}px`;
    lens.style.backgroundPosition = `${L / 2 - (e.clientX - r.left - ox) * Z}px ${L / 2 - (e.clientY - r.top - oy) * Z}px`;
    loupe.style.transform = `translate3d(${e.clientX - L / 2}px,${e.clientY - L / 2}px,0)`;
    loupe.classList.add('is-on');
  };
  const onLeave = () => loupe.classList.remove('is-on');
  if (finePointer) { dc.addEventListener('pointermove', onMove, { passive: true }); dc.addEventListener('pointerleave', onLeave); }

  // En el móvil la fila del centro se enfoca y las demás se desenfocan
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-focus', e.isIntersecting)),
    { root, rootMargin: '-40% 0px -40% 0px' });
  rows.forEach(r => io.observe(r));
  dc.classList.toggle('is-touch', !finePointer);

  return () => { io.disconnect(); dc.removeEventListener('click', onClick); dc.removeEventListener('pointermove', onMove); dc.removeEventListener('pointerleave', onLeave); };
}

// ---------------------------------------------------------------- 2 · PROFUNDIDAD
function mountDepth(root) {
  root.insertAdjacentHTML('beforeend', `
    <div class="dz" id="dz">
      <div class="dz__stage">${DESIGN.map((d, i) => `
        <div class="dz__plane" data-i="${i}"><div class="dz__strip">${d.slides.map((src, k) => `
          <button type="button" class="dz__f" data-k="${k}" aria-label="Ampliar ${esc(d.title)}, pieza ${k + 1}"><img src="${thumb(src)}" alt="" loading="${i < 2 ? 'eager' : 'lazy'}" draggable="false">${ca3(src)}</button>`).join('')}
        </div></div>`).join('')}
      </div>
      <div class="dz__info" aria-live="polite"><span class="dz__n" id="dz-n"></span><h2 class="dz__t" id="dz-t"></h2><p class="dz__d" id="dz-d"></p></div>
      <div class="dz__focus" aria-hidden="true"><span>∞</span><i><b id="dz-ind"></b></i><span>0,7 m</span></div>
      <p class="dz__hint">${isNarrow() ? 'Desliza ↕ proyecto · ↔ fotos' : 'Scroll ↕ enfoca · ↔ fotos · clic amplía'}</p>
    </div>`);
  const dz = root.querySelector('#dz'), planes = [...dz.querySelectorAll('.dz__plane')].map((el, i) => ({ el, i, strip: el.firstElementChild, pan: 0, tpan: 0 }));
  const $ = s => root.querySelector(s);
  let p = 0, tp = 0, cur = -1, snapT = 0;
  const index = createIndex(root, DESIGN, { onEnter: i => { tp = i; }, onPick: i => { tp = i; } });
  const setCur = i => {
    cur = i;
    const d = DESIGN[i];
    $('#dz-n').textContent = `${pad(i + 1)}/${pad(N)} · ${d.tag || ''} · ${pad(d.slides.length)} piezas`;
    $('#dz-t').textContent = d.title;
    $('#dz-d').textContent = d.desc || '';
    index.setActive(i);
    planes.forEach(pl => pl.el.classList.toggle('is-cur', pl.i === i));
  };
  const maxPan = pl => Math.max(0, pl.strip.scrollWidth - dz.clientWidth * (isNarrow() ? .86 : .62));
  const offDrag = bindDrag(dz, {
    onMove: (dx, dy) => {
      if (Math.abs(dx) > Math.abs(dy)) { const pl = planes[cur]; if (pl) pl.tpan = clamp(pl.tpan - dx * 1.2, 0, maxPan(pl)); return; }
      tp = clamp(tp - dy * .006, -.2, N - .8);
    },
    onEnd: () => { tp = clamp(Math.round(tp), 0, N - 1); },
  });
  const onWheel = e => {
    e.preventDefault();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { const pl = planes[cur]; if (pl) pl.tpan = clamp(pl.tpan + e.deltaX, 0, maxPan(pl)); return; }
    tp = clamp(tp + e.deltaY * .0022, -.2, N - .8);
    snapT = .25;
  };
  dz.addEventListener('wheel', onWheel, { passive: false });
  const onClick = e => { const f = e.target.closest('.dz__f'); if (f && +f.closest('.dz__plane').dataset.i === cur) openProject(cur, +f.dataset.k, f); else if (f) tp = +f.closest('.dz__plane').dataset.i; };
  dz.addEventListener('click', onClick);
  const onKey = e => {
    if (e.key === 'ArrowDown') tp = clamp(Math.round(tp) + 1, 0, N - 1);
    if (e.key === 'ArrowUp') tp = clamp(Math.round(tp) - 1, 0, N - 1);
    const pl = planes[cur];
    if (pl && e.key === 'ArrowRight') pl.tpan = clamp(pl.tpan + 300, 0, maxPan(pl));
    if (pl && e.key === 'ArrowLeft') pl.tpan = clamp(pl.tpan - 300, 0, maxPan(pl));
  };
  addEventListener('keydown', onKey);
  const ind = $('#dz-ind');
  const stop = ticker.add(dt => {
    if (snapT > 0) { snapT -= dt; if (snapT <= 0) tp = clamp(Math.round(tp), 0, N - 1); }
    p = damp(p, tp, 5.5, dt);
    const a = clamp(Math.round(p), 0, N - 1);
    if (a !== cur) setCur(a);
    const k = reduced ? .3 : 1;
    for (const pl of planes) {
      const d = pl.i - p, ad = Math.abs(d);
      const show = d > -1.2 && d < 4.5;
      pl.el.style.visibility = show ? '' : 'hidden';
      if (!show) continue;
      // Detrás: más lejos, más pequeño y borroso. Delante: pasa junto a la cámara y se va
      pl.el.style.transform = `translate(-50%,-50%) translate3d(${(d * (isNarrow() ? 3 : 7)).toFixed(2)}vw,${(-d * (isNarrow() ? 11 : 15)).toFixed(2)}vh,${(-d * 650 * k).toFixed(1)}px)`;
      pl.el.style.opacity = d < 0 ? clamp(1 + d * 1.6, 0, 1) : clamp(1 - d * .2, .15, 1);
      const blur = Math.min(ad * 5, 14);
      pl.el.style.filter = blur > .3 ? `blur(${blur.toFixed(1)}px)` : 'none';
      pl.el.style.setProperty('--o', `${Math.min(ad * 9, 22).toFixed(1)}px`);
      pl.el.classList.toggle('is-ca', ad > .12);
      pl.el.style.zIndex = String(100 - Math.round(ad * 10));
      pl.pan = damp(pl.pan, pl.tpan, 8, dt);
      pl.strip.style.transform = `translate3d(${-pl.pan.toFixed(1)}px,0,0)`;
    }
    ind.style.transform = `translateY(${(p / Math.max(1, N - 1)) * 100}%)`;
  });
  return () => { stop(); offDrag(); dz.removeEventListener('wheel', onWheel); removeEventListener('keydown', onKey); };
}

// ---------------------------------------------------------------- 3 · DIAFRAGMA
function mountIris(root) {
  root.insertAdjacentHTML('beforeend', `
    <div class="di" id="di">
      <div class="di__wrap">
        <div class="di__ring" id="di-ring">${DESIGN.map((d, i) => `<button type="button" class="di__name" data-i="${i}" data-cursor-ui><span>${pad(i + 1)}</span>${esc(d.title)}</button>`).join('')}</div>
        <svg class="di__scale" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="99"/>${Array.from({ length: 90 }, (_, i) => `<path transform="rotate(${i * 4} 100 100)" d="M100 1v${i % 5 ? 2.5 : 5}"/>`).join('')}</svg>
        <div class="di__ap" id="di-ap" data-cursor-ui>
          <div class="di__iris" id="di-iris"><div class="di__imgs" id="di-imgs"></div></div>
          <i class="di__cross" aria-hidden="true"></i>
        </div>
        <div class="di__ticks" id="di-ticks" aria-hidden="true"></div>
      </div>
      <div class="di__info" aria-live="polite"><span class="di__n" id="di-n"></span><h2 class="di__t" id="di-t"></h2><p class="di__d" id="di-d"></p><span class="di__c" id="di-c"></span></div>
      <p class="di__hint">${isNarrow() ? 'Desliza ↔ fotos · ↕ proyecto · toca para ampliar' : 'Scroll ↕ proyecto · ← → fotos · clic amplía'}</p>
    </div>`);
  const $ = s => root.querySelector(s);
  const di = $('#di'), ap = $('#di-ap'), iris = $('#di-iris'), imgs = $('#di-imgs'), ticks = $('#di-ticks');
  const names = [...root.querySelectorAll('.di__name')];
  let cur = -1, k = 0, ring = 0, tring = 0, R = 50, rot = 0, busy = false;
  const index = createIndex(root, DESIGN, { onPick: i => go(i) });

  const poly = (r, a) => {
    const pts = [];
    for (let j = 0; j < 8; j++) { const t = a + j * Math.PI / 4; pts.push(`${(50 + r * Math.cos(t)).toFixed(2)}% ${(50 + r * Math.sin(t)).toFixed(2)}%`); }
    return `polygon(${pts.join(',')})`;
  };
  const paintIris = () => { iris.style.clipPath = poly(R, rot); iris.style.webkitClipPath = poly(R, rot); };
  const fill = i => {
    const d = DESIGN[i];
    imgs.innerHTML = d.slides.map((src, j) => `<img src="${thumb(src, 1000)}" alt="" draggable="false" class="${j === 0 ? 'is-on' : ''}">`).join('');
    ticks.innerHTML = d.slides.map((_, j) => `<i style="--a:${(j - (d.slides.length - 1) / 2) * 7}deg"></i>`).join('');
    $('#di-n').textContent = `${pad(i + 1)}/${pad(N)} · ${d.tag || ''}`;
    $('#di-t').textContent = d.title;
    $('#di-d').textContent = d.desc || '';
    k = 0; slide(0, true);
    index.setActive(i);
    names.forEach((n, j) => n.classList.toggle('is-on', j === i));
  };
  const slide = (to, quiet) => {
    const d = DESIGN[cur];
    if (!d) return;
    k = (to + d.slides.length) % d.slides.length;
    [...imgs.children].forEach((im, j) => im.classList.toggle('is-on', j === k));
    [...ticks.children].forEach((t, j) => t.classList.toggle('is-on', j === k));
    $('#di-c').textContent = `${pad(k + 1)}/${pad(d.slides.length)}`;
    if (!quiet && !reduced) imgs.animate([{ filter: 'blur(10px)', transform: 'scale(1.08)' }, { filter: 'blur(0)', transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
  };
  // Cambio de proyecto: las láminas se cierran girando y se abren con el siguiente
  const anim = (from, to, dr, dur) => new Promise(done => {
    const t0 = performance.now(), r0 = rot;
    const stopA = ticker.add(() => {
      const q = Math.min(1, (performance.now() - t0) / dur), e = q < .5 ? 4 * q * q * q : 1 - (-2 * q + 2) ** 3 / 2;
      R = from + (to - from) * e; rot = r0 + dr * e; paintIris();
      if (q >= 1) { stopA(); done(); }
    });
  });
  const go = async i => {
    i = (i + N) % N;
    if (i === cur || busy) return;
    busy = true;
    tring = i;
    if (cur < 0 || reduced) { cur = i; fill(i); R = 75; paintIris(); busy = false; return; }
    await anim(75, 3, .9, 420);
    cur = i; fill(i);
    await anim(3, 75, .9, 640);
    busy = false;
  };
  go(0);

  const onClick = e => {
    const n = e.target.closest('.di__name');
    if (n) { go(+n.dataset.i); return; }
    if (e.target.closest('#di-ap') && !moved) openProject(cur, k, ap);
  };
  di.addEventListener('click', onClick);
  let moved = false, acc = 0;
  const offDrag = bindDrag(ap, {
    onStart: () => { moved = false; acc = 0; },
    onMove: (dx, dy) => { acc += Math.abs(dx) + Math.abs(dy); if (acc > 8) moved = true; ap._dx = (ap._dx || 0) + dx; ap._dy = (ap._dy || 0) + dy; },
    onEnd: () => {
      const dx = ap._dx || 0, dy = ap._dy || 0; ap._dx = ap._dy = 0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) slide(k + (dx < 0 ? 1 : -1));
      else if (Math.abs(dy) > 40) go(cur + (dy < 0 ? 1 : -1));
      setTimeout(() => { moved = false; }, 0);
    },
  });
  let wheelLock = 0;
  const onWheel = e => {
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 12) { slide(k + Math.sign(e.deltaX)); wheelLock = now + 380; }
    else if (Math.abs(e.deltaY) > 12) { go(cur + Math.sign(e.deltaY)); wheelLock = now + 1000; }
  };
  di.addEventListener('wheel', onWheel, { passive: false });
  const onKey = e => {
    if (e.key === 'ArrowRight') slide(k + 1);
    if (e.key === 'ArrowLeft') slide(k - 1);
    if (e.key === 'ArrowDown') go(cur + 1);
    if (e.key === 'ArrowUp') go(cur - 1);
  };
  addEventListener('keydown', onKey);

  // Los nombres giran alrededor del iris; el actual queda arriba
  const stop = ticker.add(dt => {
    let d = tring - ring;
    d = ((d + N / 2) % N + N) % N - N / 2;
    ring += d * (1 - Math.exp(-6 * dt));
    const Rr = ap.offsetWidth / 2 + (isNarrow() ? 26 : 46);
    names.forEach((n, j) => {
      const a = ((j - ring) / N) * Math.PI * 2 - Math.PI / 2;
      let dd = Math.abs(((j - ring) % N + N) % N); dd = Math.min(dd, N - dd);
      n.style.transform = `translate(-50%,-50%) translate(${(Math.cos(a) * Rr).toFixed(1)}px,${(Math.sin(a) * Rr).toFixed(1)}px)`;
      n.style.setProperty('--d', Math.min(dd, 3).toFixed(2));
    });
  });
  return () => { stop(); offDrag(); di.removeEventListener('click', onClick); di.removeEventListener('wheel', onWheel); removeEventListener('keydown', onKey); };
}
