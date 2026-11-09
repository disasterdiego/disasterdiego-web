// DESIGN: cinco maneras de ver los carruseles (para probar; se cambia arriba).
//  1 Mesa de luz  — todas las piezas sobre una mesa enorme que se arrastra; el proyecto
//                   que miras se enfoca y una lupa amplía la pieza.
//  2 Ruleta       — cada proyecto es un carrusel circular de diapositivas que gira con
//                   el scroll; a los lados cambias de cartucho (proyecto).
//  3 Cuarto oscuro— todo en negativo; la luz roja revela lo que alumbras y, si te quedas,
//                   la foto termina de revelarse.
//  4 Fotomatón    — mosaico infinito en movimiento; el cursor es una lente que amplía la
//                   pieza y aparta a las vecinas.
//  5 Zapping      — una pieza cada vez, a pantalla completa, con tirón de foco al pasar.
// En todas, tocar una pieza la abre a pantalla completa.
import { DESIGN } from '../data.js';
import { setBarSlot } from '../main.js';
import { sound } from '../sound.js';
import { openLightbox, closeLightbox } from '../lightbox.js';
import { ticker, damp, clamp, mod, opt, esc, bindDrag, isNarrow, reduced, finePointer } from '../lib.js';

const isVideo = u => u.endsWith('.mp4') || u.includes('/video/upload/');
const thumb = (u, w = 520) => (isVideo(u) ? u.replace(/\.mp4$/i, '.jpg') : opt(u, w));
const pad = n => String(n).padStart(2, '0');
const N = DESIGN.length;
const ITEMS = DESIGN.flatMap((d, i) => d.slides.map((src, k) => ({ i, k, src })));

const MODES = [
  { id: 'mesa', label: 'Mesa de luz', mount: mountTable },
  { id: 'ruleta', label: 'Ruleta', mount: mountCarousel },
  { id: 'oscuro', label: 'Cuarto oscuro', mount: mountDark },
  { id: 'fotomaton', label: 'Fotomatón', mount: mountBooth },
  { id: 'zapping', label: 'Zapping', mount: mountZap },
];

function openProject(i, k = 0, from = null) {
  const d = DESIGN[i], j = (i + 1) % N;
  openLightbox({
    n: pad(i + 1), title: d.title, desc: d.desc, items: d.slides, start: k, from,
    next: { label: `${pad(j + 1)} ${DESIGN[j].title}`, open: () => openProject(j, 0, null) },
  });
}

export function mountDesign(root) {
  let mode = 'mesa';
  try { const v = sessionStorage.getItem('design-v5'); if (MODES.some(m => m.id === v)) mode = v; } catch {}
  const slot = setBarSlot(`<div class="switch switch--3" role="group" aria-label="Versión">${MODES.map((m, i) =>
    `<button type="button" data-v="${m.id}" data-cursor-ui><span>${i + 1}</span> ${m.label}</button>`).join('')}</div>`);
  const btns = [...slot.querySelectorAll('[data-v]')];
  let off = null;
  const show = id => {
    mode = id;
    try { sessionStorage.setItem('design-v5', id); } catch {}
    btns.forEach(b => { b.classList.toggle('is-active', b.dataset.v === id); b.setAttribute('aria-pressed', b.dataset.v === id); });
    off?.();
    root.innerHTML = '';
    root.className = `view view--design dv-${id}`;
    root.scrollTop = 0;
    off = MODES.find(m => m.id === id).mount(root);
  };
  btns.forEach(b => b.addEventListener('click', () => { if (b.dataset.v !== mode) show(b.dataset.v); }));
  show(mode);
  return () => { off?.(); closeLightbox(); };
}

// Etiqueta común abajo a la izquierda: proyecto y pieza
const caption = root => {
  root.insertAdjacentHTML('beforeend', '<p class="dcap"><b></b><span></span></p>');
  const el = root.querySelector('.dcap');
  let last = '';
  return (i, extra = '') => {
    const t = i < 0 ? '' : `${i}|${extra}`;
    if (t === last) return;
    last = t;
    el.classList.toggle('is-on', i >= 0);
    if (i < 0) return;
    el.firstChild.textContent = `${pad(i + 1)} ${DESIGN[i].title}`;
    el.lastChild.textContent = extra || `${DESIGN[i].tag || ''} · ${pad(DESIGN[i].slides.length)} piezas`;
  };
};

// ---------------------------------------------------------------- 1 · MESA DE LUZ
function mountTable(root) {
  const narrow = isNarrow(), S = narrow ? 120 : 190, gap = narrow ? 14 : 22;
  const cols = narrow ? 2 : 3;
  // Cada proyecto es un grupo de diapositivas; los grupos se reparten en una rejilla
  let html = '', bw = 0, bh = 0;
  const gw = 3 * (S + gap) + 80, gh = Math.ceil(7 / 3) * (S * 1.25 + gap) + 140;
  DESIGN.forEach((d, i) => {
    const gx = (i % cols) * gw + 120, gy = Math.floor(i / cols) * gh + 140;
    html += `<p class="ml__label" style="left:${gx}px;top:${gy - 46}px"><b>${pad(i + 1)}</b> ${esc(d.title)} <span>${pad(d.slides.length)}</span></p>`;
    d.slides.forEach((src, k) => {
      const x = gx + (k % 3) * (S + gap) + (Math.random() - .5) * 18, y = gy + Math.floor(k / 3) * (S * 1.25 + gap) + (Math.random() - .5) * 18;
      html += `<button type="button" class="ml__p" data-i="${i}" data-k="${k}" style="left:${x}px;top:${y}px;width:${S}px;--r:${((Math.random() - .5) * 6).toFixed(1)}deg"><img src="${thumb(src)}" alt="" draggable="false" loading="lazy"></button>`;
    });
    bw = Math.max(bw, gx + gw); bh = Math.max(bh, gy + gh);
  });
  root.insertAdjacentHTML('beforeend', `<div class="ml" id="ml"><div class="ml__board" style="width:${bw}px;height:${bh}px">${html}</div>
    <p class="dhint">${narrow ? 'Arrastra para moverte · toca para ampliar' : 'Arrastra o haz scroll para moverte · clic amplía'}</p>
    <div class="dc__loupe" aria-hidden="true"><i></i><span>×2.6</span></div></div>`);
  const ml = root.querySelector('#ml'), board = ml.firstElementChild, cap = caption(root);
  const loupe = ml.querySelector('.dc__loupe'), lens = loupe.firstElementChild;
  let x = 0, y = 0, tx = 0, ty = 0, vx = 0, vy = 0, dragging = false;
  const W = () => ml.clientWidth, H = () => ml.clientHeight;
  const lim = () => { tx = clamp(tx, Math.min(0, W() - bw), 0); ty = clamp(ty, Math.min(0, H() - bh), 0); };
  tx = (W() - Math.min(bw, W() * 1.4)) / 2; ty = 0; lim(); x = tx; y = ty;
  const offDrag = bindDrag(ml, {
    onStart: () => { dragging = true; vx = vy = 0; loupe.classList.remove('is-on'); },
    onMove: (dx, dy) => { tx += dx; ty += dy; vx = dx; vy = dy; lim(); },
    onEnd: () => { dragging = false; tx += vx * 12; ty += vy * 12; lim(); },
    onTap: e => { dragging = false; const p = e.target.closest('.ml__p'); if (p) openProject(+p.dataset.i, +p.dataset.k, p); },
  });
  const onWheel = e => { e.preventDefault(); tx -= e.deltaX; ty -= e.deltaY; lim(); };
  ml.addEventListener('wheel', onWheel, { passive: false });
  let hot = -1;
  const onMove = e => {
    const p = e.target.closest?.('.ml__p');
    const i = p ? +p.dataset.i : -1;
    if (i !== hot) { hot = i; ml.classList.toggle('has-hot', i >= 0); ml.querySelectorAll('.ml__p').forEach(el => el.classList.toggle('is-hot', +el.dataset.i === i)); cap(i); }
    if (!p || e.pointerType !== 'mouse' || dragging) { loupe.classList.remove('is-on'); return; }
    const r = p.getBoundingClientRect(), img = p.firstElementChild, Z = 2.6, L = 220;
    lens.style.backgroundImage = `url('${img.currentSrc || img.src}')`;
    lens.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`;
    lens.style.backgroundPosition = `${L / 2 - (e.clientX - r.left) * Z}px ${L / 2 - (e.clientY - r.top) * Z}px`;
    loupe.style.transform = `translate3d(${e.clientX - L / 2}px,${e.clientY - L / 2}px,0)`;
    loupe.classList.add('is-on');
  };
  ml.addEventListener('pointermove', onMove, { passive: true });
  const stop = ticker.add(dt => {
    x = damp(x, tx, dragging ? 30 : 7, dt); y = damp(y, ty, dragging ? 30 : 7, dt);
    board.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
  });
  return () => { stop(); offDrag(); ml.removeEventListener('wheel', onWheel); };
}

// ---------------------------------------------------------------- 2 · RULETA
function mountCarousel(root) {
  root.insertAdjacentHTML('beforeend', `<div class="rl" id="rl">
      <div class="rl__stage"><div class="rl__ring" id="rl-ring"></div></div>
      <div class="rl__carts">${DESIGN.map((d, i) => `<button type="button" class="rl__cart" data-i="${i}" data-cursor-ui><b>${pad(i + 1)}</b><span>${esc(d.title)}</span></button>`).join('')}</div>
      <p class="dhint">${isNarrow() ? 'Desliza ↕ gira · ↔ cambia de carrete · toca para ampliar' : 'Scroll gira · ← → cambia de carrete · clic amplía'}</p>
    </div>`);
  const rl = root.querySelector('#rl'), ring = root.querySelector('#rl-ring'), carts = [...root.querySelectorAll('.rl__cart')], cap = caption(root);
  let cur = -1, a = 0, ta = 0, slides = [], n = 1, R = 300;
  const load = i => {
    cur = (i + N) % N;
    const d = DESIGN[cur];
    n = d.slides.length;
    const w = isNarrow() ? innerWidth * .52 : Math.min(300, innerHeight * .34);
    R = Math.max(w * .75, (w + 30) / (2 * Math.tan(Math.PI / Math.max(n, 3))));
    ring.style.setProperty('--w', `${w}px`);
    ring.innerHTML = d.slides.map((src, k) => `<button type="button" class="rl__s" data-k="${k}"><img src="${thumb(src, 700)}" alt="" draggable="false"></button>`).join('');
    slides = [...ring.children];
    a = ta = 0;
    carts.forEach((c, j) => c.classList.toggle('is-on', j === cur));
    ring.animate?.([{ opacity: 0, transform: 'translateZ(-400px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.16,1,.3,1)' });
    sound.click();
  };
  load(0);
  const front = () => mod(Math.round(-ta / (360 / n)), n);
  let ax = 0, ay = 0;
  const offDrag = bindDrag(rl, {
    onStart: () => { ax = ay = 0; },
    onMove: (dx, dy) => { ax += dx; ay += dy; if (Math.abs(ay) > Math.abs(ax)) ta += dy * .35; },
    onEnd: () => { if (Math.abs(ax) > 60 && Math.abs(ax) > Math.abs(ay)) load(cur + (ax < 0 ? 1 : -1)); ta = Math.round(ta / (360 / n)) * (360 / n); },
    onTap: e => {
      const s = e.target.closest('.rl__s');
      if (s) { if (+s.dataset.k === front()) openProject(cur, +s.dataset.k, s); else ta = -(+s.dataset.k) * (360 / n); }
      const c = e.target.closest('.rl__cart');
      if (c) load(+c.dataset.i);
    },
  });
  let wt = 0;
  const onWheel = e => {
    e.preventDefault();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20 && performance.now() > wt) { load(cur + Math.sign(e.deltaX)); wt = performance.now() + 700; return; }
    ta -= e.deltaY * .25;
    clearTimeout(onWheel.t); onWheel.t = setTimeout(() => { ta = Math.round(ta / (360 / n)) * (360 / n); }, 120);
  };
  rl.addEventListener('wheel', onWheel, { passive: false });
  const onKey = e => { if (e.key === 'ArrowRight') load(cur + 1); if (e.key === 'ArrowLeft') load(cur - 1); if (e.key === 'ArrowDown') ta -= 360 / n; if (e.key === 'ArrowUp') ta += 360 / n; };
  addEventListener('keydown', onKey);
  let lastF = -1;
  const stop = ticker.add(dt => {
    a = damp(a, ta, 8, dt);
    slides.forEach((s, k) => {
      const ang = k * (360 / n) + a;
      const d = Math.abs(((ang % 360) + 540) % 360 - 180) / 180; // 0 delante, 1 detrás
      s.style.transform = `rotateY(${ang}deg) translateZ(${R}px)`;
      s.style.filter = d > .04 ? `blur(${(d * 8).toFixed(1)}px)` : 'none';
      s.style.opacity = (1 - d * .7).toFixed(2);
    });
    const f = front();
    if (f !== lastF) { lastF = f; cap(cur, `${pad(f + 1)}/${pad(n)}`); sound.tick(); }
  });
  return () => { stop(); offDrag(); rl.removeEventListener('wheel', onWheel); removeEventListener('keydown', onKey); };
}

// ---------------------------------------------------------------- 3 · CUARTO OSCURO
function mountDark(root) {
  root.classList.add('is-scroll');
  const grid = cls => `<div class="dr__grid ${cls}">${ITEMS.map((it, n) => `<button type="button" class="dr__p" data-n="${n}" tabindex="${cls === 'dr__pos' ? -1 : 0}"><img src="${thumb(it.src)}" alt="" draggable="false" loading="lazy"></button>`).join('')}</div>`;
  root.insertAdjacentHTML('beforeend', `<div class="dr" id="dr">
      <header class="dr__head"><p>02 — Design · Cuarto oscuro</p><h1>Revela con la luz</h1><p>${ITEMS.length} piezas · ${pad(N)} proyectos · ${finePointer ? 'quédate quieto sobre una para revelarla' : 'lo que pasa por el centro se revela'}</p></header>
      <div class="dr__wrap">${grid('dr__neg')}${grid('dr__pos')}</div>
    </div><i class="dr__light" aria-hidden="true"></i>`);
  const dr = root.querySelector('#dr'), wrap = dr.querySelector('.dr__wrap'), pos = dr.querySelector('.dr__pos'), light = root.querySelector('.dr__light'), cap = caption(root);
  const negs = [...dr.querySelectorAll('.dr__neg .dr__p')], poss = [...pos.children];
  let mx = innerWidth / 2, my = innerHeight / 2, still = 0, under = -1, lmx = mx, lmy = my;
  const onMove = e => { if (e.pointerType === 'mouse') { mx = e.clientX; my = e.clientY; } };
  addEventListener('pointermove', onMove, { passive: true });
  const onClick = e => { const p = e.target.closest('.dr__neg .dr__p'); if (p) { const it = ITEMS[+p.dataset.n]; openProject(it.i, it.k, p); } };
  dr.addEventListener('click', onClick);
  const R = isNarrow() ? 120 : 170;
  const stop = ticker.add(dt => {
    if (!finePointer) { mx = innerWidth / 2; my = innerHeight * .45; }
    const r = wrap.getBoundingClientRect();
    wrap.style.setProperty('--mx', `${(mx - r.left).toFixed(0)}px`);
    wrap.style.setProperty('--my', `${(my - r.top).toFixed(0)}px`);
    wrap.style.setProperty('--r', `${R}px`);
    light.style.transform = `translate3d(${mx - 260}px,${my - 260}px,0)`;
    // Revelado: la pieza bajo la luz, si la luz se queda quieta, pasa a positivo para siempre
    const moved = Math.hypot(mx - lmx, my - lmy); lmx = mx; lmy = my;
    const el = document.elementFromPoint(mx, my)?.closest?.('.dr__neg .dr__p');
    const n = el ? +el.dataset.n : -1;
    if (n !== under) { under = n; still = 0; cap(n >= 0 ? ITEMS[n].i : -1, n >= 0 ? `pieza ${pad(ITEMS[n].k + 1)}` : ''); }
    still = moved < 2 || !finePointer ? still + dt : Math.max(0, still - dt * 2);
    if (under >= 0 && still > (finePointer ? 1.1 : 1.6) && !negs[under].classList.contains('is-dev')) { negs[under].classList.add('is-dev'); poss[under].classList.add('is-dev'); sound.copier(); }
  });
  return () => { stop(); removeEventListener('pointermove', onMove); dr.removeEventListener('click', onClick); root.classList.remove('is-scroll'); };
}

// ---------------------------------------------------------------- 4 · FOTOMATÓN
function mountBooth(root) {
  const narrow = isNarrow(), C = narrow ? 4 : 7;
  root.insertAdjacentHTML('beforeend', `<div class="fm" id="fm"><div class="fm__in"></div><p class="dhint">${narrow ? 'Arrastra · toca para ampliar' : 'Pasa la lente · clic amplía'}</p></div>`);
  const fm = root.querySelector('#fm'), inn = fm.firstElementChild, cap = caption(root);
  let tiles = [], cw = 0, ch = 0, rows = 0;
  const build = () => {
    cw = fm.clientWidth / C; ch = cw * 1.25;
    rows = Math.ceil(fm.clientHeight / ch) + 2;
    const list = [];
    for (let c = 0; c < C; c++) for (let r = 0; r < rows; r++) list.push({ c, r, it: ITEMS[(c * 5 + r * 3) % ITEMS.length] });
    inn.innerHTML = list.map((t, j) => `<button type="button" class="fm__t" data-j="${j}" style="width:${cw}px;height:${ch}px"><img src="${thumb(t.it.src, 360)}" alt="" draggable="false"></button>`).join('');
    tiles = list.map((t, j) => ({ ...t, el: inn.children[j], s: 1, ox: 0, oy: 0, target: 1 }));
  };
  build();
  addEventListener('resize', build);
  const off = Array.from({ length: C }, () => 0), spd = Array.from({ length: C }, (_, c) => (c % 2 ? -1 : 1) * (14 + (c % 3) * 6));
  let mx = -1e4, my = -1e4, drag = 0;
  const onMove = e => { const r = fm.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; };
  const onLeave = () => { mx = my = -1e4; };
  fm.addEventListener('pointermove', onMove, { passive: true });
  fm.addEventListener('pointerleave', onLeave);
  const offDrag = bindDrag(fm, {
    onMove: (dx, dy) => { for (let c = 0; c < C; c++) off[c] += dy * (c % 2 ? -1 : 1); drag = .6; },
    onEnd: () => { if (!finePointer) onLeave(); },
    onTap: e => { const t = e.target.closest('.fm__t'); if (t) { const it = tiles[+t.dataset.j].it; openProject(it.i, it.k, t); } },
  });
  const stop = ticker.add(dt => {
    const paused = document.body.classList.contains('lb-open');
    drag = Math.max(0, drag - dt);
    if (!paused && !reduced && !drag) for (let c = 0; c < C; c++) off[c] += spd[c] * dt;
    const R = cw * 2.2, total = rows * ch;
    let best = null, bd = 1e9;
    for (const t of tiles) {
      t.bx = t.c * cw; t.by = mod(t.r * ch + off[t.c], total) - ch;
      const dx = t.bx + cw / 2 - mx, dy = t.by + ch / 2 - my, d = Math.hypot(dx, dy);
      // La lente amplía la pieza de debajo y empuja a las vecinas hacia fuera
      const f = Math.max(0, 1 - d / R), push = f * f * cw * .55;
      t.ox = damp(t.ox, d > 1 ? (dx / d) * push : 0, 10, dt); t.oy = damp(t.oy, d > 1 ? (dy / d) * push : 0, 10, dt);
      t.target = 1 - f * .18;
      if (d < bd) { bd = d; best = t; }
    }
    const on = best && bd < cw * .7;
    for (const t of tiles) {
      const hot = on && t === best;
      t.s = damp(t.s, hot ? 1.7 : t.target, 10, dt);
      t.el.style.transform = `translate3d(${(t.bx + t.ox).toFixed(1)}px,${(t.by + t.oy).toFixed(1)}px,0) scale(${t.s.toFixed(3)})`;
      t.el.style.zIndex = hot ? 5 : 1;
      if (t.hot !== hot) { t.hot = hot; t.el.classList.toggle('is-hot', hot); }
    }
    cap(on ? best.it.i : -1, on ? `pieza ${pad(best.it.k + 1)}` : '');
  });
  return () => { stop(); offDrag(); removeEventListener('resize', build); };
}

// ---------------------------------------------------------------- 5 · ZAPPING
function mountZap(root) {
  root.insertAdjacentHTML('beforeend', `<div class="zp" id="zp">
      <div class="zp__stage" id="zp-stage"><img class="zp__img" alt="" draggable="false"><img class="zp__img" alt="" draggable="false"></div>
      <div class="zp__strip" id="zp-strip">${ITEMS.map((it, n) => `<button type="button" class="zp__t${it.k === 0 && n ? ' is-first' : ''}" data-n="${n}" data-cursor-ui><img src="${thumb(it.src, 120)}" alt="" loading="lazy"></button>`).join('')}</div>
      <p class="dhint">${isNarrow() ? 'Desliza ↕ · toca para ampliar' : 'Scroll ↕ o ← → · clic amplía'}</p>
    </div>`);
  const zp = root.querySelector('#zp'), stage = root.querySelector('#zp-stage'), [A, B] = stage.children, strip = root.querySelector('#zp-strip'), cap = caption(root);
  const thumbs = [...strip.children];
  let cur = -1, front = A;
  const go = (n, dir = 1) => {
    n = mod(n, ITEMS.length);
    if (n === cur) return;
    const it = ITEMS[n], back = front === A ? B : A, prev = front;
    back.onload = null;
    back.src = thumb(it.src, 1400);
    const run = () => {
      if (!reduced) {
        prev.animate([{ filter: 'blur(0)', transform: 'scale(1)', opacity: 1 }, { filter: 'blur(18px)', transform: `scale(${dir > 0 ? 1.12 : .9})`, opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
        back.animate([{ filter: 'blur(18px)', transform: `scale(${dir > 0 ? .9 : 1.12})`, opacity: 0 }, { filter: 'blur(0)', transform: 'scale(1)', opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
      } else { prev.style.opacity = 0; back.style.opacity = 1; }
    };
    front = back;
    if (back.complete && back.naturalWidth) run(); else back.onload = run;
    cur = n;
    thumbs.forEach((t, j) => t.classList.toggle('is-on', j === n));
    strip.scrollTo({ left: thumbs[n].offsetLeft - strip.clientWidth / 2 + thumbs[n].offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
    cap(it.i, `${pad(it.k + 1)}/${pad(DESIGN[it.i].slides.length)}`);
    sound.tick();
  };
  go(0);
  let lock = 0;
  const step = d => { const now = performance.now(); if (now < lock) return; lock = now + 420; go(cur + d, d); };
  const onWheel = e => { e.preventDefault(); const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (Math.abs(d) > 8) step(Math.sign(d)); };
  zp.addEventListener('wheel', onWheel, { passive: false });
  let ay = 0, ax = 0;
  const offDrag = bindDrag(stage, {
    onStart: () => { ax = ay = 0; },
    onMove: (dx, dy) => { ax += dx; ay += dy; },
    onEnd: () => { const d = Math.abs(ay) > Math.abs(ax) ? ay : ax; if (Math.abs(d) > 40) go(cur + (d < 0 ? 1 : -1), d < 0 ? 1 : -1); },
    onTap: () => { const it = ITEMS[cur]; openProject(it.i, it.k, front); },
  });
  const onStrip = e => { const t = e.target.closest('.zp__t'); if (t) go(+t.dataset.n, +t.dataset.n > cur ? 1 : -1); };
  strip.addEventListener('click', onStrip);
  const onKey = e => { if (['ArrowDown', 'ArrowRight'].includes(e.key)) step(1); if (['ArrowUp', 'ArrowLeft'].includes(e.key)) step(-1); };
  addEventListener('keydown', onKey);
  return () => { offDrag(); zp.removeEventListener('wheel', onWheel); removeEventListener('keydown', onKey); };
}
