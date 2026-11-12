// MODO DISASTER: la web entera se puede romper.
// Cada pieza que tocas se despega de la página (un clon exacto encima y el original
// escondido) y pasa a tener física: gravedad, rebotes, giro. Herramientas:
//   Mano: agarrar y lanzar · Martillo: estalla en cristales · Tijeras: corta por una línea
//   Imán: atrae y arranca piezas · Spray: pinta con los cuatro colores
// Gravedad tira todo a la vez. Ordenar devuelve cada trozo a su sitio y la web queda intacta.
// Todo se mueve con transform (GPU); los trozos son el mismo clon recortado con clip-path,
// así que al volver encajan como un puzle.
import { ticker, clamp, damp, isNarrow, finePointer } from './lib.js';
import { sound } from './sound.js';

const ICONS = {
  mano: '<path d="M8 12V6a1.5 1.5 0 0 1 3 0v5m0-6.5a1.5 1.5 0 0 1 3 0V11m0-5a1.5 1.5 0 0 1 3 0v6m0-3.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a6 6 0 0 1-4.9-2.5L4.3 15.6a1.5 1.5 0 0 1 2.3-1.9L8 15"/>',
  martillo: '<path d="M13 3.5l7.5 7.5-2.5 2.5L10.5 6z"/><path d="M12.2 8.8L3.5 17.5l3 3 8.7-8.7"/>',
  tijeras: '<circle cx="6" cy="6.5" r="3"/><circle cx="6" cy="17.5" r="3"/><path d="M8.5 8.3L20 18.5M8.5 15.7L20 5.5"/>',
  iman: '<path d="M5 3h4.5v8.5a2.5 2.5 0 0 0 5 0V3H19v8.5a7 7 0 0 1-14 0z"/><path d="M5 7.5h4.5M14.5 7.5H19"/>',
  spray: '<rect x="6" y="9" width="8.5" height="12" rx="2"/><path d="M8 9V6h4.5v3M17 6h.5M19.5 4h.5M19.5 8h.5M21.5 6h.5"/>',
  gravedad: '<path d="M12 3v13M6.5 10.5L12 16l5.5-5.5M4 20.5h16"/>',
  ordenar: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 3.5v4h4"/>',
  salir: '<path d="M6 6l12 12M18 6L6 18"/>',
  disaster: '<path d="M12 2.5l1.6 5.6 4.9-3.2-2.4 5.3 5.6.6-5 2.6 3.6 4.4-5.5-1.4-.4 5.8L12 16.9l-2.4 5.3-.4-5.8-5.5 1.4 3.6-4.4-5-2.6 5.6-.6-2.4-5.3 4.9 3.2z"/>',
};
const TOOLS = ['mano', 'martillo', 'tijeras', 'iman', 'spray'];
const LABEL = { mano: 'Mano', martillo: 'Martillo', tijeras: 'Tijeras', iman: 'Imán', spray: 'Spray', gravedad: 'Gravedad', ordenar: 'Ordenar', salir: 'Salir' };
const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;
const CA = ['0 110 255', '255 40 40', '0 190 90', '255 205 0'];
const G = 2600, MAX_BODIES = 240;
const PROPS = ['color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'text-shadow', 'white-space',
  'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-radius', 'box-shadow', 'padding', 'display', 'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'gap', 'grid-template-columns', 'grid-template-rows',
  'object-fit', 'object-position', 'opacity', 'filter', 'mix-blend-mode', 'overflow', 'backdrop-filter', '-webkit-backdrop-filter', 'fill', 'stroke'];

let on = false, tool = 'martillo', layer, bodiesEl, hit, paint, pctx, lineEl, cur, bar, toast, btn;
let bodies = [], gone = new Set(), holes = [], ordering = 0;
const byWrap = new WeakMap();
const ptr = { x: 0, y: 0, down: false, vx: 0, vy: 0, t: 0 };
let grab = null, cut = null, spraying = false, magnet = false, magnetT = 0, sprayT = 0;

// ---------- Geometría: polígonos locales (px del elemento original) ----------
const rectPoly = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
// Recorta el polígono y se queda con la parte donde f(p) >= 0 (f lineal)
function clip(poly, f) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
const area = p => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0)) / 2;
const centroid = p => { let x = 0, y = 0; p.forEach(q => { x += q[0]; y += q[1]; }); return [x / p.length, y / p.length]; };
const polyCss = p => `polygon(${p.map(q => `${q[0].toFixed(1)}px ${q[1].toFixed(1)}px`).join(',')})`;
// De pantalla a coordenadas locales del cuerpo (deshace posición y giro)
const toLocal = (b, x, y) => { const c = Math.cos(-b.a), s = Math.sin(-b.a), dx = x - b.x, dy = y - b.y; return [b.px + dx * c - dy * s, b.py + dx * s + dy * c]; };
const toWorld = (b, lx, ly) => { const c = Math.cos(b.a), s = Math.sin(b.a), dx = lx - b.px, dy = ly - b.py; return [b.x + dx * c - dy * s, b.y + dx * s + dy * c]; };

// ---------- Clonar una pieza de la web ----------
function copyCanvases(from, to) {
  const a = [...from.querySelectorAll('canvas')], b = [...to.querySelectorAll('canvas')];
  a.forEach((src, i) => {
    const dst = b[i];
    if (!dst) return;
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    c.className = dst.className;
    c.style.cssText = dst.style.cssText;
    try { c.getContext('2d').drawImage(src, 0, 0); } catch {}
    dst.replaceWith(c);
  });
}
function cloneFor(el, r) {
  const c = el.cloneNode(true);
  const cs = getComputedStyle(el);
  PROPS.forEach(p => { const v = cs.getPropertyValue(p); if (v) c.style.setProperty(p, v); });
  Object.assign(c.style, { position: 'absolute', left: '0', top: '0', margin: '0', width: `${r.width}px`, height: `${r.height}px`, transform: 'none', translate: 'none', rotate: 'none', scale: 'none', boxSizing: 'border-box', visibility: 'visible', animation: 'none', transition: 'none', pointerEvents: 'none', maxWidth: 'none', maxHeight: 'none', inset: 'auto' });
  c.classList.remove('dz-gone');
  [c, ...c.querySelectorAll('[id]')].forEach(n => n.removeAttribute('id'));
  c.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
  // Lienzos: se copia lo que tenían pintado
  const wrap = document.createElement('div');
  wrap.append(c);
  if (el.tagName === 'CANVAS') {
    const k = document.createElement('canvas'); k.width = el.width; k.height = el.height; k.style.cssText = c.style.cssText;
    try { k.getContext('2d').drawImage(el, 0, 0); } catch {}
    c.replaceWith(k);
  } else copyCanvases(el, wrap);
  wrap.querySelectorAll('video').forEach((v, i) => { const o = el.tagName === 'VIDEO' ? el : el.querySelectorAll('video')[i]; v.muted = true; if (o) { v.currentTime = o.currentTime || 0; if (!o.paused) v.play().catch(() => {}); } });
  return wrap.firstChild;
}
function makeBody(src, w, h, poly, px, py, x, y, a, content) {
  const wrap = document.createElement('div');
  wrap.className = 'dz__b';
  wrap.style.width = `${w}px`; wrap.style.height = `${h}px`;
  wrap.style.transformOrigin = `${px}px ${py}px`;
  wrap.append(content);
  const full = poly.length === 4 && poly[0][0] === 0 && poly[0][1] === 0 && poly[2][0] === w && poly[2][1] === h;
  if (!full) wrap.style.clipPath = polyCss(poly);
  bodiesEl.append(wrap);
  const b = { wrap, src, w, h, poly, px, py, x, y, a, vx: 0, vy: 0, va: 0, free: false, wait: 0, home: false, born: performance.now() };
  byWrap.set(wrap, b);
  bodies.push(b);
  draw(b);
  return b;
}
// Lienzos grandes (el wall, la home): se arranca un trozo y queda el hueco
function detachRegion(cv, x, y, w, h) {
  const r = cv.getBoundingClientRect();
  w = Math.min(w, r.width); h = Math.min(h, r.height);
  const left = clamp(x - w / 2, r.left, r.right - w), top = clamp(y - h / 2, r.top, r.bottom - h);
  const k = document.createElement('canvas'), sx = cv.width / r.width, sy = cv.height / r.height;
  k.width = Math.max(1, Math.round(w * sx)); k.height = Math.max(1, Math.round(h * sy));
  try { k.getContext('2d').drawImage(cv, (left - r.left) * sx, (top - r.top) * sy, w * sx, h * sy, 0, 0, k.width, k.height); } catch {}
  Object.assign(k.style, { position: 'absolute', left: '0', top: '0', width: `${w}px`, height: `${h}px` });
  const hole = document.createElement('i');
  hole.className = 'dz__hole';
  Object.assign(hole.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` });
  layer.insertBefore(hole, bodiesEl);
  holes.push(hole);
  return makeBody(hole, w, h, rectPoly(w, h), w / 2, h / 2, left + w / 2, top + h / 2, 0, k);
}
function detach(el) {
  if (el?.canvas) { const s = Math.min(innerWidth, innerHeight); return detachRegion(el.canvas, el.x, el.y, s * (.3 + Math.random() * .12), s * (.24 + Math.random() * .1)); }
  if (!el || gone.has(el)) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 6 || r.height < 6) return null;
  const content = cloneFor(el, r);
  el.classList.add('dz-gone');
  gone.add(el);
  return makeBody(el, r.width, r.height, rectPoly(r.width, r.height), r.width / 2, r.height / 2, r.left + r.width / 2, r.top + r.height / 2, 0, content);
}
const kill = b => { b.wrap.remove(); bodies = bodies.filter(o => o !== b); };
const draw = b => { b.wrap.style.transform = `translate3d(${(b.x - b.px).toFixed(1)}px,${(b.y - b.py).toFixed(1)}px,0) rotate(${b.a.toFixed(4)}rad)`; };

// ---------- Qué hay debajo del dedo ----------
const ours = n => n === document.documentElement || n === document.body || layer.contains(n) || bar.contains(n) || n.closest?.('.cursor,.chint,.dztoast,.loader,.lens');
function bodyAt(x, y) {
  for (const n of document.elementsFromPoint(x, y)) { const b = byWrap.get(n.closest?.('.dz__b')); if (b && !b.home) return b; }
  return null;
}
// La pieza más concreta que tenga un tamaño razonable (ni una letra ni la página entera)
function pageAt(x, y, max = .5) {
  const VA = innerWidth * innerHeight;
  for (const n of document.elementsFromPoint(x, y)) {
    if (ours(n)) continue;
    let e = n instanceof SVGElement && n.ownerSVGElement ? n.ownerSVGElement : n;
    while (e && e !== document.body) {
      const r = e.getBoundingClientRect(), a = r.width * r.height;
      if (a > VA * max) return e.tagName === 'CANVAS' && max >= .5 ? { canvas: e, x, y } : null;
      if (a >= 700) return e;
      e = e.parentElement;
    }
    return null;
  }
  return null;
}

// ---------- Herramientas ----------
function ring(x, y, big = 1) {
  const r = document.createElement('i');
  r.className = 'dz__ring';
  r.style.left = `${x}px`; r.style.top = `${y}px`;
  r.style.setProperty('--k', big);
  layer.append(r);
  r.addEventListener('animationend', () => r.remove());
}
function shake(k = 1) {
  const v = document.querySelector('.view');
  const f = [0, 1, 2, 3, 4].map(i => ({ transform: i === 4 ? 'none' : `translate(${((i % 2 ? 1 : -1) * (7 - i * 1.5) * k).toFixed(1)}px,${((i % 3 ? -1 : 1) * (5 - i) * k).toFixed(1)}px)` }));
  v?.animate(f, { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
  bodiesEl.animate(f, { duration: 320 });
}
function pieceFrom(b, poly, vx, vy) {
  const [cx, cy] = centroid(poly), [wx, wy] = toWorld(b, cx, cy);
  const content = b.wrap.firstChild.cloneNode(true);
  const tmp = document.createElement('div'); tmp.append(content);
  copyCanvases(b.wrap, tmp);
  const p = makeBody(b.src, b.w, b.h, poly, cx, cy, wx, wy, b.a, tmp.firstChild);
  p.free = true; p.vx = vx; p.vy = vy;
  return p;
}
// Martillo: el cristal se parte en cuñas desde el golpe y cada cuña en dos
function shatter(b, x, y) {
  if (bodies.length > MAX_BODIES || area(b.poly) < 900) { knock(b, x, y, 900); return; }
  const [ix, iy] = toLocal(b, x, y);
  const K = area(b.poly) > 60000 ? 7 : 5, off = Math.random() * Math.PI * 2;
  const angs = Array.from({ length: K }, (_, i) => off + (i + .3 + Math.random() * .4) / K * Math.PI * 2);
  const reach = Math.max(b.w, b.h) * .5;
  for (let i = 0; i < K; i++) {
    const a1 = angs[i], a2 = angs[(i + 1) % K] + (i === K - 1 ? Math.PI * 2 : 0);
    const d1 = [Math.cos(a1), Math.sin(a1)], d2 = [Math.cos(a2), Math.sin(a2)];
    let wedge = clip(b.poly, p => d1[0] * (p[1] - iy) - d1[1] * (p[0] - ix));
    wedge = clip(wedge, p => -(d2[0] * (p[1] - iy) - d2[1] * (p[0] - ix)));
    if (wedge.length < 3) continue;
    const m = (a1 + a2) / 2, mx = Math.cos(m), my = Math.sin(m), rr = reach * (.22 + Math.random() * .25);
    const parts = [clip(wedge, p => rr - (mx * (p[0] - ix) + my * (p[1] - iy))), clip(wedge, p => (mx * (p[0] - ix) + my * (p[1] - iy)) - rr)];
    parts.forEach((poly, j) => {
      if (poly.length < 3 || area(poly) < 40) return;
      const sp = (j ? 520 : 300) + Math.random() * 520;
      const [wx, wy] = toWorld(b, ...centroid(poly));
      const dx = wx - x, dy = wy - y, dl = Math.hypot(dx, dy) || 1;
      const p = pieceFrom(b, poly, b.vx + dx / dl * sp, b.vy + dy / dl * sp - 260);
      p.va = (Math.random() - .5) * 12;
    });
  }
  kill(b);
  ring(x, y, 1.2);
  shake(1);
  sound.smash();
}
function knock(b, x, y, f) {
  const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy) || 1;
  b.free = true; b.vx += dx / d * f; b.vy += dy / d * f - 300; b.va += (Math.random() - .5) * 10;
  ring(x, y, .6);
  sound.thud();
}
// Tijeras: lo que cruza la línea se parte en dos y se separa
function doCut(ax, ay, bx, by) {
  const len = Math.hypot(bx - ax, by - ay);
  if (len < 24) return;
  const targets = new Set();
  for (let t = 0; t <= len; t += 18) {
    const x = ax + (bx - ax) * t / len, y = ay + (by - ay) * t / len;
    const b = bodyAt(x, y);
    if (b) targets.add(b);
    else { const e = pageAt(x, y); if (e && targets.size < 8) { const nb = detach(e); if (nb) targets.add(nb); } }
    if (targets.size >= 8) break;
  }
  if (!targets.size) return;
  const nx = -(by - ay) / len, ny = (bx - ax) / len;
  targets.forEach(b => {
    const [la, lb] = [toLocal(b, ax, ay), toLocal(b, bx, by)];
    const f = p => (lb[0] - la[0]) * (p[1] - la[1]) - (lb[1] - la[1]) * (p[0] - la[0]);
    const A = clip(b.poly, f), B = clip(b.poly, p => -f(p));
    if (A.length < 3 || B.length < 3 || area(A) < 60 || area(B) < 60) { b.free = true; return; }
    [A, B].forEach((poly, j) => {
      const s = j ? -1 : 1;
      const p = pieceFrom(b, poly, b.vx + nx * 170 * s, b.vy + ny * 170 * s - 120);
      p.va = (Math.random() - .5) * 3;
    });
    kill(b);
  });
  sound.snip();
}
// Spray: puntos con el color separado en los cuatro tonos
function spray(x, y, dt) {
  const n = Math.round(clamp(dt * 1500, 6, 40)), night = document.documentElement.classList.contains('is-night') || document.body.classList.contains('is-night');
  const d = Math.min(devicePixelRatio || 1, 2);
  pctx.globalCompositeOperation = night ? 'screen' : 'multiply';
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (isNarrow() ? 26 : 34) * (Math.random() < .15 ? 1.6 : 1);
    const px = (x + Math.cos(a) * r) * d, py = (y + Math.sin(a) * r) * d, s = (.6 + Math.random() * 1.8) * d;
    CA.forEach((c, k) => {
      pctx.fillStyle = `rgb(${c} / .5)`;
      pctx.beginPath(); pctx.arc(px + [-1.6, 1.6, 0, 0][k] * d, py + [0, 0, 1.2, -1.2][k] * d, s, 0, 7); pctx.fill();
    });
    pctx.fillStyle = night ? 'rgb(240 238 232 / .55)' : 'rgb(17 17 17 / .55)';
    pctx.beginPath(); pctx.arc(px, py, s * .7, 0, 7); pctx.fill();
  }
}
// Gravedad: se despega todo lo que se ve y cae a la vez
function gravity() {
  const VA = innerWidth * innerHeight, chosen = [];
  const sel = '.view img,.view canvas,.view video,.view h1,.view h2,.view h3,.view p,.view a,.view button,.view li,.view figure,.view .ar__s,.view .tn__i,.nav__brand,.nav__link,.nav__toggle,.social a,.night,.hud,.side__item,.home__side a,.switch,.dzbtn';
  for (const e of document.querySelectorAll(sel)) {
    if (gone.has(e) || ours(e) || chosen.some(c => c.contains(e))) continue;
    const r = e.getBoundingClientRect(), a = r.width * r.height;
    if (a < 300 || a > VA * .6 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || +cs.opacity < .05) continue;
    chosen.push(e);
    if (chosen.length >= 80) break;
  }
  // Los lienzos que ocupan la pantalla se parten en una cuadrícula que cae entera
  document.querySelectorAll('canvas').forEach(cv => {
    const r = cv.getBoundingClientRect();
    if (r.width * r.height <= VA * .6 || ours(cv) || cv.id === 'scan' || cv.id === 'fx' || getComputedStyle(cv).pointerEvents === 'none' || getComputedStyle(cv).visibility === 'hidden') return;
    const cols = isNarrow() ? 3 : 5, rows = isNarrow() ? 5 : 3, w = r.width / cols, h = r.height / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const b = detachRegion(cv, r.left + (i + .5) * w, r.top + (j + .5) * h, w, h);
      b.free = true; b.wait = (rows - j) * .05 + Math.random() * .12;
      b.vx = (Math.random() - .5) * 200; b.va = (Math.random() - .5) * 3;
    }
  });
  chosen.forEach((e, i) => {
    const b = detach(e);
    if (!b) return;
    b.free = true; b.wait = i * .012 + Math.random() * .08;
    b.vx = (Math.random() - .5) * 240; b.vy = -Math.random() * 260; b.va = (Math.random() - .5) * 4;
  });
  bodies.forEach(b => { b.free = true; b.home = false; });
  shake(1.6);
  sound.rumble();
}
// Ordenar: cada trozo vuela a su sitio; cuando todos llegan, la web vuelve a ser la de antes
function order(done) {
  grab = cut = null; magnet = spraying = false;
  if (!bodies.length && !gone.size && !holes.length) { fadePaint(); done?.(); return; }
  ordering = performance.now();
  bodies.forEach((b, i) => { b.home = true; b.wait = Math.min(i * .006, .5); b.a -= Math.round(b.a / (Math.PI * 2)) * Math.PI * 2; });
  order.done = done;
  fadePaint();
  sound.rebuild();
}
function finishOrder() {
  bodies.forEach(b => b.wrap.remove());
  holes.forEach(h => h.remove());
  holes = [];
  bodies = [];
  gone.forEach(e => e.classList.remove('dz-gone'));
  gone.clear();
  ordering = 0;
  const d = order.done; order.done = null; d?.();
}
function fadePaint() {
  if (!paint) return;
  paint.classList.add('is-fade');
  setTimeout(() => { pctx.clearRect(0, 0, paint.width, paint.height); paint.classList.remove('is-fade'); }, 650);
}
function clearNow() {
  bodies.forEach(b => b.wrap.remove());
  holes.forEach(h => h.remove());
  holes = [];
  bodies = [];
  gone.forEach(e => e.classList.remove('dz-gone'));
  gone.clear();
  ordering = 0;
  if (pctx) pctx.clearRect(0, 0, paint.width, paint.height);
}

// ---------- Física ----------
function step(dt) {
  if (!on && !ordering) return;
  dt = Math.min(dt, 1 / 30);
  const W = innerWidth, H = innerHeight, now = performance.now();
  if (magnet) {
    magnetT -= dt;
    if (magnetT <= 0) {
      magnetT = .07;
      const a = Math.random() * 7, r = Math.random() * (isNarrow() ? 90 : 150);
      const e = pageAt(ptr.x + Math.cos(a) * r, ptr.y + Math.sin(a) * r, .12);
      const b = e && bodies.length < MAX_BODIES && detach(e);
      if (b) { b.free = true; sound.tick(); }
    }
  }
  if (spraying) { spray(ptr.x, ptr.y, dt); sprayT -= dt; if (sprayT <= 0) { sprayT = .16; sound.psst(); } }
  let pending = 0;
  for (const b of bodies) {
    if (b.wait > 0) { b.wait -= dt; if (b.home) pending++; continue; }
    if (b.home) {
      const r = b.src.getBoundingClientRect();
      const tx = r.left + b.px, ty = r.top + b.py;
      b.x = damp(b.x, tx, 7, dt); b.y = damp(b.y, ty, 7, dt); b.a = damp(b.a, 0, 7, dt);
      if (Math.abs(b.x - tx) > .5 || Math.abs(b.y - ty) > .5 || Math.abs(b.a) > .003) pending++;
      else { b.x = tx; b.y = ty; b.a = 0; }
      draw(b);
      continue;
    }
    if (b === grab?.b) { draw(b); continue; }
    if (!b.free) continue;
    let g = G;
    if (magnet) {
      const dx = ptr.x - b.x, dy = ptr.y - b.y, d = Math.hypot(dx, dy);
      if (d < 420) {
        const k = 1 - d / 420;
        b.vx += (dx * 16 - dy * 5) * k * dt; b.vy += (dy * 16 + dx * 5) * k * dt;
        b.vx *= 1 - 2.2 * k * dt; b.vy *= 1 - 2.2 * k * dt;
        b.va += (Math.random() - .5) * 8 * k * dt;
        g *= 1 - k;
      }
    }
    b.vy += g * dt;
    b.vx *= 1 - .15 * dt; b.va *= 1 - .4 * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt;
    // Choque con los bordes de la pantalla usando el polígono girado
    const c = Math.cos(b.a), s = Math.sin(b.a);
    let maxY = -1e9, minX = 1e9, maxX = -1e9;
    for (const q of b.poly) {
      const dx = q[0] - b.px, dy = q[1] - b.py;
      const wx = dx * c - dy * s, wy = dx * s + dy * c;
      if (wy > maxY) maxY = wy; if (wx < minX) minX = wx; if (wx > maxX) maxX = wx;
    }
    if (b.y + maxY > H) {
      b.y = H - maxY;
      if (b.vy > 0) { if (b.vy > 600) sound.thud(); b.vy = b.vy > 90 ? -b.vy * .32 : 0; b.vx *= .82; b.va = b.va * .7 + b.vx * .0016; }
      b.vx *= 1 - 3 * dt; b.va *= 1 - 3 * dt;
    }
    if (b.x + minX < 0) { b.x = -minX; b.vx = Math.abs(b.vx) * .4; }
    if (b.x + maxX > W) { b.x = W - maxX; b.vx = -Math.abs(b.vx) * .4; }
    draw(b);
  }
  if (ordering && (!pending || now - ordering > 2600)) finishOrder();
}

// ---------- Interfaz ----------
function build() {
  layer = document.createElement('div');
  layer.className = 'dz';
  layer.hidden = true;
  layer.innerHTML = `<canvas class="dz__paint"></canvas><div class="dz__bodies"></div>
    <svg class="dz__line" aria-hidden="true"><line x1="0" y1="0" x2="0" y2="0"/></svg><div class="dz__hit"></div>
    <div class="dz__cur" aria-hidden="true"></div>`;
  bar = document.createElement('div');
  bar.className = 'dzbar';
  bar.hidden = true;
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Herramientas Disaster');
  bar.innerHTML = `<div class="dzbar__tools">${TOOLS.map(t => `<button type="button" data-tool="${t}" data-cursor-ui aria-label="${LABEL[t]}">${svg(t)}<span>${LABEL[t]}</span></button>`).join('')}</div>
    <i class="dzbar__sep"></i>
    ${['gravedad', 'ordenar', 'salir'].map(a => `<button type="button" data-act="${a}" data-cursor-ui aria-label="${LABEL[a]}" class="dzbar__a${a === 'salir' ? ' is-x' : ''}">${svg(a)}<span>${LABEL[a]}</span></button>`).join('')}`;
  toast = document.createElement('p');
  toast.className = 'dztoast';
  toast.innerHTML = '<b>Modo Disaster</b><span>Rómpelo todo. «Ordenar» lo deja como estaba.</span>';
  document.body.append(layer, bar, toast);
  bodiesEl = layer.querySelector('.dz__bodies');
  hit = layer.querySelector('.dz__hit');
  paint = layer.querySelector('.dz__paint');
  pctx = paint.getContext('2d');
  lineEl = layer.querySelector('.dz__line line');
  cur = layer.querySelector('.dz__cur');
  const size = () => { const d = Math.min(devicePixelRatio || 1, 2); paint.width = innerWidth * d; paint.height = innerHeight * d; };
  size();
  addEventListener('resize', size);

  bar.addEventListener('click', e => {
    const t = e.target.closest('[data-tool]'), a = e.target.closest('[data-act]');
    if (t) setTool(t.dataset.tool);
    if (a?.dataset.act === 'gravedad') gravity();
    if (a?.dataset.act === 'ordenar') order();
    if (a?.dataset.act === 'salir') toggle(false);
  });
  hit.addEventListener('pointerdown', down);
  addEventListener('pointermove', move, { passive: true });
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  hit.addEventListener('wheel', e => e.preventDefault(), { passive: false });
  addEventListener('keydown', e => {
    if (!on || e.target.closest?.('input,textarea')) return;
    const k = { 1: 'mano', 2: 'martillo', 3: 'tijeras', 4: 'iman', 5: 'spray' }[e.key];
    if (k) setTool(k);
    if (e.key === 'g' || e.key === 'G') gravity();
    if (e.key === 'o' || e.key === 'O') order();
    if (e.key === 'Escape') toggle(false);
  });
  addEventListener('hashchange', () => { if (on || ordering) { clearNow(); order.done = null; on = false; freeze(false); layer.hidden = bar.hidden = true; document.body.classList.remove('dz-on'); btn?.classList.remove('is-on'); btn?.setAttribute('aria-pressed', 'false'); } });
  ticker.add(step, { always: true });
}
function setTool(t) {
  tool = t;
  bar.querySelectorAll('[data-tool]').forEach(b => { b.classList.toggle('is-on', b.dataset.tool === t); b.setAttribute('aria-pressed', b.dataset.tool === t); });
  cur.innerHTML = svg(t);
  layer.dataset.tool = t;
  sound.tick();
}
function down(e) {
  if (ordering) return;
  try { hit.setPointerCapture(e.pointerId); } catch {}
  Object.assign(ptr, { x: e.clientX, y: e.clientY, down: true, vx: 0, vy: 0, t: performance.now() });
  const { x, y } = ptr;
  cur.classList.remove('is-hit'); void cur.offsetWidth; cur.classList.add('is-hit');
  if (tool === 'mano') {
    const b = bodyAt(x, y) || detach(pageAt(x, y));
    if (b) { b.free = true; grab = { b, ox: b.x - x, oy: b.y - y }; b.vx = b.vy = 0; b.wrap.classList.add('is-held'); sound.tick(); }
  } else if (tool === 'martillo') {
    const b = bodyAt(x, y) || detach(pageAt(x, y));
    if (b) shatter(b, x, y); else { ring(x, y, .5); shake(.4); sound.thud(); }
  } else if (tool === 'tijeras') {
    cut = { x, y };
    lineEl.setAttribute('x1', x); lineEl.setAttribute('y1', y); lineEl.setAttribute('x2', x); lineEl.setAttribute('y2', y);
    layer.classList.add('is-cutting');
  } else if (tool === 'iman') { magnet = true; magnetT = 0; layer.classList.add('is-magnet'); }
  else if (tool === 'spray') { spraying = true; sprayT = 0; }
}
function move(e) {
  if (!on) return;
  const now = performance.now(), dt = Math.max(now - ptr.t, 1) / 1000;
  const nvx = (e.clientX - ptr.x) / dt, nvy = (e.clientY - ptr.y) / dt;
  ptr.vx = ptr.vx * .6 + nvx * .4; ptr.vy = ptr.vy * .6 + nvy * .4;
  ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = now;
  cur.style.transform = `translate3d(${ptr.x}px,${ptr.y}px,0)`;
  layer.style.setProperty('--mx', `${ptr.x}px`); layer.style.setProperty('--my', `${ptr.y}px`);
  if (grab) { grab.b.x = ptr.x + grab.ox; grab.b.y = ptr.y + grab.oy; grab.b.a = damp(grab.b.a, clamp(ptr.vx * .0004, -.5, .5), 8, dt); }
  if (cut) { lineEl.setAttribute('x2', ptr.x); lineEl.setAttribute('y2', ptr.y); }
}
function up() {
  if (!ptr.down) return;
  ptr.down = false;
  if (grab) { const b = grab.b; b.vx = clamp(ptr.vx, -3500, 3500); b.vy = clamp(ptr.vy, -3500, 3500); b.va = clamp(ptr.vx * .004, -14, 14); b.wrap.classList.remove('is-held'); grab = null; }
  if (cut) { const c = cut; cut = null; layer.classList.remove('is-cutting'); doCut(c.x, c.y, ptr.x, ptr.y); }
  if (magnet) { magnet = false; layer.classList.remove('is-magnet'); }
  spraying = false;
}

// La web se congela tal cual está: lo que rompes es lo que ves, nada se mueve debajo
let paused = [];
function freeze(on) {
  ticker.frozen = on;
  if (on) { paused = [...document.querySelectorAll('.view video, .lb video')].filter(v => !v.paused); paused.forEach(v => v.pause()); }
  else { paused.forEach(v => v.isConnected && v.play().catch(() => {})); paused = []; }
  document.body.classList.toggle('dz-frozen', on);
}
export function toggle(force) {
  const next = force ?? !on;
  if (next === on) return;
  if (!layer) build();
  btn?.setAttribute('aria-pressed', next);
  btn?.classList.toggle('is-on', next);
  if (next) {
    if (document.body.classList.contains('menu-open')) document.getElementById('menu-toggle')?.click();
    on = true;
    freeze(true);
    layer.hidden = bar.hidden = false;
    document.body.classList.add('dz-on', 'dz-enter');
    setTimeout(() => document.body.classList.remove('dz-enter'), 700);
    setTool(isNarrow() || !finePointer ? 'martillo' : tool);
    toast.classList.remove('is-on'); void toast.offsetWidth; toast.classList.add('is-on');
    shake(.8);
    sound.smash();
  } else {
    order(() => {
      on = false;
      freeze(false);
      layer.hidden = bar.hidden = true;
      document.body.classList.remove('dz-on');
    });
    document.body.classList.add('dz-leaving');
    setTimeout(() => document.body.classList.remove('dz-leaving'), 900);
  }
}

// Botón de entrada (main.js lo coloca junto al sol/luna)
export function initDisaster() {
  btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dzbtn';
  btn.id = 'dz-btn';
  btn.setAttribute('data-cursor-ui', '');
  btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('aria-label', 'Modo Disaster');
  btn.innerHTML = `${svg('disaster')}<span>Disaster</span>`;
  btn.addEventListener('click', () => toggle());
  document.body.append(btn);
  return btn;
}
