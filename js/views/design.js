// DESIGN: ruleta de cartón. Un tambor con todos los proyectos gira detrás de un papel de
// cebolla con una ranura; por la ranura se ve entero, en horizontal, el proyecto actual.
import { DESIGN } from '../data.js';
import { createIndex } from '../index-list.js';
import { ticker, damp, wrap, mod, clamp, opt, esc, bindDrag, isNarrow, reduced } from '../lib.js';

const isVideo = u => u.endsWith('.mp4') || u.includes('/video/upload/');
const pad = n => String(n).padStart(2, '0');
const STEP = 25;

export function mountDesign(root) {
  const n = DESIGN.length;
  const tickSvg = DESIGN.map((_, i) => {
    const a = (i / n) * 360;
    return `<g transform="rotate(${a} 100 100)"><path d="M100 6v14"/><text x="100" y="36" text-anchor="middle">${pad(i + 1)}</text></g>`;
  }).join('');

  root.innerHTML = `
    <div class="wheel" id="wheel">
      <div class="drum" id="drum">
        ${DESIGN.map((d, i) => {
          // Tres copias del carrete: así gira sin fin hacia los dos lados
          const set = d.slides.map(src => `<figure class="vslide">${isVideo(src)
            ? `<video data-src="${src}" crossorigin="anonymous" muted loop playsinline preload="none"></video>`
            : `<img src="${opt(src, 620)}" alt="" loading="lazy" draggable="false">`}</figure>`).join('');
          return `<div class="drow" data-i="${i}"><div class="drow__in">${set}${set}${set}</div></div>`;
        }).join('')}
      </div>
      <div class="onion onion--top"></div>
      <div class="onion onion--bot"></div>
      <div class="slit" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <i class="slot-edge slot-edge--l" aria-hidden="true"></i><i class="slot-edge slot-edge--r" aria-hidden="true"></i>
      <div class="slot-head">
        <h2 class="display" id="d-t"></h2>
        <span id="d-n"></span>
      </div>
      <div class="slot-foot">
        <span id="d-c"></span>
        <span class="slot-foot__bar"><i id="d-b"></i></span>
        <span>F73 — ${isNarrow() ? 'Desliza' : 'Scroll ↕ proyecto · ↔ fotos'}</span>
      </div>
      <svg class="dial" id="dial" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="97"/><circle cx="100" cy="100" r="13"/>${tickSvg}</svg>
    </div>`;

  const wheel = root.querySelector('#wheel');
  const rows = [...root.querySelectorAll('.drow')].map((el, i) => ({
    el, i,
    inner: el.firstElementChild,
    slides: [...el.querySelectorAll('.vslide')],
    videos: [...el.querySelectorAll('video')],
    set: 1, pan: 0, tpan: 0, speed: (i % 2 ? -1 : 1) * (14 + (i % 3) * 5),
  }));
  const $ = id => root.querySelector(id);
  const dial = $('#dial');
  let p = 0, tp = 0, cur = -1, snapT = 0, dir = 1, R = 0, userT = 0;

  const go = i => { tp += wrap(i - mod(tp, n), n); };
  const index = createIndex(root, DESIGN, { onEnter: go, onPick: go });

  const fit = () => {
    const b = wheel.getBoundingClientRect();
    const narrow = isNarrow();
    const bottom = narrow ? 120 : 0;
    const area = root.querySelector('.drum').clientWidth;
    const hMax = narrow ? (b.height - bottom) * .3 : b.height * .4;
    // En escritorio cabe un carrete de cinco fotos; en móvil, tres y más filas a la vista
    const h = Math.round(narrow ? Math.min(hMax, area / (2.8 * .8)) : clamp(area / (5 * .8), 190, hMax));
    wheel.style.setProperty('--h', `${h}px`);
    wheel.style.setProperty('--cy', `${Math.round((b.height - bottom) / 2 + (narrow ? 10 : 0))}px`);
    R = (h + 26) / 2 / Math.tan((STEP * Math.PI) / 360);
    rows.forEach(r => { r.set = Math.max(1, r.inner.scrollWidth / 3); });
  };
  fit();
  addEventListener('resize', fit, { passive: true });
  root.querySelectorAll('img').forEach(i => i.addEventListener('load', fit, { once: true }));

  const setCurrent = i => {
    cur = i;
    const d = DESIGN[i];
    $('#d-t').textContent = d.title;
    $('#d-n').textContent = `${pad(i + 1)} / ${pad(n)}`;
    $('#d-c').textContent = `${d.slides.length} piezas`;
    index.setActive(i);
    rows.forEach((r, k) => {
      r.el.classList.toggle('is-current', k === i);
      r.slides.forEach(s => { s.style.pointerEvents = k === i ? 'auto' : 'none'; });
      r.videos.forEach(v => {
        if (k === i) {
          if (v.dataset.src) { v.src = v.dataset.src; delete v.dataset.src; }
          v.play().catch(() => {});
        } else if (!v.paused) v.pause();
      });
    });
  };

  const snap = () => { tp = dir > 0 ? Math.ceil(tp - .12) : Math.floor(tp + .12); };
  const offDrag = bindDrag(wheel, {
    onMove: (dx, dy) => {
      if (Math.abs(dx) > Math.abs(dy)) { const r = rows[cur]; if (r) r.tpan -= dx * 1.3; userT = 1.5; return; }
      tp -= dy * .005;
      if (dy) dir = -Math.sign(dy);
    },
    onEnd: snap,
  });
  wheel.addEventListener('dragstart', e => e.preventDefault());

  const onWheel = e => {
    e.preventDefault();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { const r = rows[cur]; if (r) r.tpan += e.deltaX; userT = 1.5; return; }
    tp += e.deltaY * .0024;
    if (e.deltaY) dir = Math.sign(e.deltaY);
    snapT = .2;
  };
  root.addEventListener('wheel', onWheel, { passive: false });


  const onKey = e => {
    if (e.key === 'ArrowDown') { dir = 1; tp = Math.round(tp) + 1; }
    if (e.key === 'ArrowUp') { dir = -1; tp = Math.round(tp) - 1; }
    if (e.key === 'ArrowRight' && rows[cur]) { rows[cur].tpan += 240; userT = 1.5; }
    if (e.key === 'ArrowLeft' && rows[cur]) { rows[cur].tpan -= 240; userT = 1.5; }
  };
  addEventListener('keydown', onKey);

  const bar = $('#d-b');
  const stop = ticker.add(dt => {
    if (snapT > 0) { snapT -= dt; if (snapT <= 0) snap(); }
    p = damp(p, tp, 6, dt);
    if (Math.abs(tp - p) < .0005) p = tp;
    const a = mod(Math.round(p), n);
    if (a !== cur) setCurrent(a);

    for (const r of rows) {
      const d = wrap(r.i - p, n), ad = Math.abs(d), show = ad < 3.4;
      r.el.style.visibility = show ? '' : 'hidden';
      if (!show) continue;
      r.el.style.transform = `translateZ(${-R}px) rotateX(${-d * STEP}deg) translateZ(${R}px)`;
      r.el.style.opacity = clamp(1.25 - ad * .3, 0, 1);
      // Cada carrete avanza solo, despacio; tus gestos lo empujan
      if (!reduced) r.tpan += r.speed * dt * (r.i === cur && userT > 0 ? 0 : 1);
      r.pan = damp(r.pan, r.tpan, 7, dt);
      r.inner.style.transform = `translate3d(${(-r.set - mod(r.pan, r.set)).toFixed(1)}px,0,0)`;
    }
    const row = rows[cur];
    userT = Math.max(0, userT - dt);
    bar.style.transform = `scaleX(${row ? mod(row.pan, row.set) / row.set : 0})`;
    dial.style.transform = `translateY(-50%) rotate(${(-p / n) * 360}deg)`;
  });

  return () => {
    stop();
    offDrag();
    root.removeEventListener('wheel', onWheel);
    rows.forEach(r => r.videos.forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); }));
    removeEventListener('resize', fit);
    removeEventListener('keydown', onKey);
  };
}
