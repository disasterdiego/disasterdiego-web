// DESIGN: dos maneras de ver los carruseles (se cambia arriba).
//  Arco      — las portadas de los proyectos en un arco 3D en forma de S; el del centro
//              se endereza y por arriba y por abajo salen el resto de fotos del post.
//  Fotomatón — mosaico infinito en movimiento; el cursor es una lente que amplía la
//              pieza y aparta a las vecinas.
// En las dos, tocar una pieza la abre a pantalla completa desde donde estaba.
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
  { id: 'arco', label: 'Arco', mount: mountArc },
  { id: 'fotomaton', label: 'Fotomatón', mount: mountBooth },
];

function openProject(i, k = 0, from = null) {
  const d = DESIGN[i], j = (i + 1) % N;
  const im = from?.tagName === 'IMG' ? from : from?.querySelector?.('img');
  openLightbox({
    n: pad(i + 1), title: d.title, desc: d.desc, items: d.slides, start: k, from: im || from, fromSrc: im?.currentSrc || im?.src,
    next: { label: `${pad(j + 1)} ${DESIGN[j].title}`, open: () => openProject(j, 0, null) },
  });
}

export function mountDesign(root) {
  let mode = 'arco';
  try { const v = sessionStorage.getItem('design-v6'); if (MODES.some(m => m.id === v)) mode = v; } catch {}
  const slot = setBarSlot(`<div class="switch switch--3" role="group" aria-label="Versión">${MODES.map((m, i) =>
    `<button type="button" data-v="${m.id}" data-cursor-ui><span>${i + 1}</span> ${m.label}</button>`).join('')}</div>`);
  const btns = [...slot.querySelectorAll('[data-v]')];
  let off = null;
  const show = id => {
    mode = id;
    try { sessionStorage.setItem('design-v6', id); } catch {}
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

// ---------------------------------------------------------------- ARCO
// Sitio de cada foto del post en la columna: la portada en el centro, las siguientes
// debajo y las últimas encima (como un carrete vertical que da la vuelta)
const slot = (k, n) => {
  if (!k) return '';
  const below = Math.ceil((n - 1) / 2), pos = k <= below ? k : -(n - k);
  return `--s:${Math.sign(pos)};--a:${Math.abs(pos)}`;
};
function mountArc(root) {
  root.insertAdjacentHTML('beforeend', `<div class="ar" id="ar">
      <div class="ar__stage">${DESIGN.map((d, i) => `
        <div class="ar__p" data-i="${i}">
          <div class="ar__col">${d.slides.map((src, k) => `<button type="button" class="ar__s${k ? '' : ' is-cover'}" data-k="${k}" style="${slot(k, d.slides.length)}"><img src="${thumb(src, k ? 420 : 760)}" alt="" draggable="false"></button>`).join('')}</div>
        </div>`).join('')}
      </div>
      <div class="ar__info"><span id="ar-n"></span><h2 id="ar-t"></h2><p id="ar-d"></p></div>
      <p class="dhint">${isNarrow() ? 'Desliza ↔ proyectos · toca para ampliar' : 'Scroll o arrastra ↔ · clic amplía'}</p>
    </div>`);
  const ar = root.querySelector('#ar'), $ = s => root.querySelector(s);
  const ps = [...ar.querySelectorAll('.ar__p')].map((el, i) => ({ el, i, col: el.firstElementChild, ss: [...el.querySelectorAll('.ar__s')], open: 0 }));
  let p = 0, tp = 0, cur = -1, mx = 0, my = 0, tmx = 0, tmy = 0, settle = 0, vx = 0;
  const setCur = i => {
    cur = i;
    $('#ar-n').textContent = `${pad(i + 1)}/${pad(N)} · ${DESIGN[i].tag || ''} · ${pad(DESIGN[i].slides.length)} piezas`;
    $('#ar-t').textContent = DESIGN[i].title;
    $('#ar-d').textContent = DESIGN[i].desc || '';
  };
  const size = () => {
    const narrow = isNarrow();
    const H = ar.clientHeight, cover = narrow ? Math.min(ar.clientWidth * .56, H * .36) : Math.min(H * .42, 380);
    ar.style.setProperty('--cw', `${cover}px`);
    ar.style.setProperty('--sw', `${cover * .62}px`);
    ar.style.setProperty('--sp', `${narrow ? cover * .92 : cover * 1.05}px`);
  };
  size();
  addEventListener('resize', size);
  const offDrag = bindDrag(ar, {
    onMove: dx => { tp = clamp(tp - dx / (ar.clientWidth * (isNarrow() ? .45 : .3)), -.4, N - .6); vx = -dx; },
    onEnd: () => { tp = clamp(Math.round(tp + vx * .02), 0, N - 1); },
    onTap: e => {
      const s = e.target.closest('.ar__s');
      if (!s) return;
      const i = +s.closest('.ar__p').dataset.i;
      if (i === cur && Math.abs(p - tp) < .05) openProject(i, +s.dataset.k, s.querySelector('img'));
      else tp = i;
    },
  });
  const onWheel = e => {
    e.preventDefault();
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    tp = clamp(tp + d * .0028, -.3, N - .7);
    clearTimeout(onWheel.t); onWheel.t = setTimeout(() => { tp = clamp(Math.round(tp), 0, N - 1); }, 140);
  };
  ar.addEventListener('wheel', onWheel, { passive: false });
  const onMove = e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; };
  addEventListener('pointermove', onMove, { passive: true });
  const onKey = e => { if (e.key === 'ArrowRight') tp = clamp(Math.round(tp) + 1, 0, N - 1); if (e.key === 'ArrowLeft') tp = clamp(Math.round(tp) - 1, 0, N - 1); };
  addEventListener('keydown', onKey);
  const stop = ticker.add(dt => {
    p = damp(p, tp, 6, dt);
    mx = damp(mx, finePointer ? tmx : 0, 4, dt); my = damp(my, finePointer ? tmy : 0, 4, dt);
    const a = clamp(Math.round(p), 0, N - 1);
    if (a !== cur) setCur(a);
    // El post se abre (fotos por arriba y por abajo) solo cuando el arco se para
    settle = Math.abs(tp - p) < .04 ? settle + dt : 0;
    for (const o of ps) {
      const d = o.i - p, ad = Math.abs(d);
      const vis = ad < 3.2;
      o.el.style.visibility = vis ? '' : 'hidden';
      if (!vis) continue;
      // S: los de la izquierda suben y los de la derecha bajan, girados hacia fuera
      const x = `calc(${d.toFixed(3)} * var(--sp) + ${(mx * -30).toFixed(1)}px)`;
      const y = `${(-Math.sin(d * .7) * 9 + my * -8).toFixed(2)}vh`;
      o.el.style.transform = `translate(-50%,-50%) translate3d(${x},${y},${(-ad * 120).toFixed(0)}px) rotateZ(${(d * 13).toFixed(2)}deg) rotateY(${(-d * 16 + mx * 10).toFixed(2)}deg) rotateX(${(my * -8).toFixed(2)}deg) scale(${(1 - Math.min(ad, 2) * .1).toFixed(3)})`;
      const blur = Math.max(0, ad - .35) * 5;
      o.el.style.filter = blur > .2 ? `blur(${blur.toFixed(1)}px)` : 'none';
      o.el.style.zIndex = String(50 - Math.round(ad * 10));
      const want = o.i === cur && settle > .12 ? 1 : 0;
      o.open = damp(o.open, want, want ? 7 : 12, dt);
      o.el.style.setProperty('--o', o.open.toFixed(3));
      o.el.classList.toggle('is-cur', o.i === cur);
    }
  });
  return () => { stop(); offDrag(); ar.removeEventListener('wheel', onWheel); removeEventListener('pointermove', onMove); removeEventListener('keydown', onKey); removeEventListener('resize', size); };
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
  let mx = -1e4, my = -1e4, drag = 0, vel = 0;
  const onMove = e => { const r = fm.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; };
  const onLeave = () => { mx = my = -1e4; };
  fm.addEventListener('pointermove', onMove, { passive: true });
  fm.addEventListener('pointerleave', onLeave);
  const offDrag = bindDrag(fm, {
    onMove: (dx, dy) => { for (let c = 0; c < C; c++) off[c] += dy * (c % 2 ? -1 : 1); vel = dy * 60; drag = .4; },
    onEnd: () => { if (!finePointer) onLeave(); },
    onTap: e => { const t = e.target.closest('.fm__t'); if (t) { const it = tiles[+t.dataset.j].it; openProject(it.i, it.k, t.querySelector('img')); } },
  });
  const stop = ticker.add(dt => {
    const paused = document.body.classList.contains('lb-open');
    drag = Math.max(0, drag - dt);
    // Deriva lenta + la inercia de tu gesto, que se apaga poco a poco
    vel = damp(vel, 0, 2.2, dt);
    if (!paused && !reduced) for (let c = 0; c < C; c++) off[c] += (drag ? 0 : spd[c]) * dt + vel * dt * (c % 2 ? -1 : 1);
    const R = cw * 2.2, total = rows * ch;
    let best = null, bd = 1e9;
    for (const t of tiles) {
      t.bx = t.c * cw; t.by = mod(t.r * ch + off[t.c], total) - ch;
      const dx = t.bx + cw / 2 - mx, dy = t.by + ch / 2 - my, d = Math.hypot(dx, dy);
      // La lente amplía la pieza de debajo y empuja a las vecinas hacia fuera
      const f = Math.max(0, 1 - d / R), push = f * f * cw * .55;
      t.ox = damp(t.ox, d > 1 ? (dx / d) * push : 0, 6, dt); t.oy = damp(t.oy, d > 1 ? (dy / d) * push : 0, 6, dt);
      t.target = 1 - f * .18;
      if (d < bd) { bd = d; best = t; }
    }
    const on = best && bd < cw * .7;
    for (const t of tiles) {
      const hot = on && t === best;
      t.s = damp(t.s, hot ? 1.55 : t.target, 7, dt);
      t.el.style.transform = `translate3d(${(t.bx + t.ox).toFixed(1)}px,${(t.by + t.oy).toFixed(1)}px,0) scale(${t.s.toFixed(3)})`;
      t.el.style.zIndex = hot ? 5 : 1;
      if (t.hot !== hot) { t.hot = hot; t.el.classList.toggle('is-hot', hot); }
    }
    cap(on ? best.it.i : -1, on ? `pieza ${pad(best.it.k + 1)}` : '');
  });
  return () => { stop(); offDrag(); removeEventListener('resize', build); };
}

