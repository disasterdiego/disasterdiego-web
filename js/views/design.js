// DESIGN · Arco: las portadas de los proyectos en un arco 3D en forma de S que no se
// acaba nunca (después del último vuelve el primero). El proyecto del centro se endereza
// y abre su post en vertical: arrastrando o con scroll vertical se pasan sus fotos;
// en horizontal se pasa de proyecto. Tocar una foto abre el carrusel a pantalla completa.
import { DESIGN } from '../data.js';
import { createIndex } from '../index-list.js';
import { openLightbox, closeLightbox } from '../lightbox.js';
import { ticker, damp, clamp, mod, wrap, opt, bindDrag, isNarrow, finePointer } from '../lib.js';

const isVideo = u => u.endsWith('.mp4') || u.includes('/video/upload/');
const thumb = (u, w = 520) => (isVideo(u) ? u.replace(/\.mp4$/i, '.jpg') : opt(u, w));
const pad = n => String(n).padStart(2, '0');
const N = DESIGN.length;

// El carrusel se abre siempre desde la primera foto; al final, el siguiente proyecto
function openProject(i, from = null) {
  const d = DESIGN[i], j = (i + 1) % N;
  const im = from?.tagName === 'IMG' ? from : from?.querySelector?.('img');
  openLightbox({
    n: pad(i + 1), title: d.title, desc: d.desc, items: d.slides, start: 0, from: im || from,
    fromSrc: im && im.dataset.k === '0' ? (im.currentSrc || im.src) : undefined,
    next: { label: `${pad(j + 1)} ${DESIGN[j].title}`, open: () => openProject(j, null) },
  });
}

export function mountDesign(root) {
  root.insertAdjacentHTML('beforeend', `<div class="ar" id="ar">
      <div class="ar__stage">${DESIGN.map((d, i) => `
        <div class="ar__p" data-i="${i}">${d.slides.map((src, k) => `<button type="button" class="ar__s" data-k="${k}"><img src="${thumb(src, k ? 520 : 760)}" data-k="${k}" alt="" draggable="false"></button>`).join('')}</div>`).join('')}
      </div>
      <div class="ar__info" aria-live="polite">
        <p class="ar__pills"><span class="ar__pill is-ink" id="ar-n"></span><span class="ar__pill" id="ar-tag"></span><span class="ar__pill" id="ar-k"></span></p>
        <h2 id="ar-t"></h2><p class="ar__d" id="ar-d"></p>
      </div>
      <p class="dhint">${isNarrow() ? '↔ proyectos · ↕ fotos · toca para ampliar' : 'Arrastra ↔ proyectos · scroll ↕ fotos · clic amplía'}</p>
    </div>`);
  const ar = root.querySelector('#ar'), $ = s => root.querySelector(s);
  const ps = [...ar.querySelectorAll('.ar__p')].map((el, i) => ({ el, i, ss: [...el.children], open: 0, v: 0, tv: 0 }));
  let p = 0, tp = 0, cur = -1, mx = 0, my = 0, tmx = 0, tmy = 0, settle = 0;
  const go = i => { tp += wrap(i - mod(tp, N), N); };
  const index = createIndex(root, DESIGN, { onPick: go });

  const info = () => {
    const d = DESIGN[cur], o = ps[cur];
    const k = mod(Math.round(o.tv), d.slides.length);
    $('#ar-n').textContent = `${pad(cur + 1)}/${pad(N)}`;
    $('#ar-tag').textContent = d.tag || 'Post';
    $('#ar-k').textContent = `Foto ${pad(k + 1)}/${pad(d.slides.length)}`;
    $('#ar-t').textContent = d.title;
    $('#ar-d').textContent = d.desc || '';
  };
  const setCur = i => {
    if (cur >= 0) ps[cur].tv = Math.round(ps[cur].tv);
    cur = i;
    index.setActive(i);
    info();
  };
  const size = () => {
    const narrow = isNarrow(), H = ar.clientHeight;
    const cw = narrow ? Math.min(ar.clientWidth * .56, H * .34) : Math.min(H * .4, 360);
    ar.style.setProperty('--cw', `${cw}px`);
    ar.style.setProperty('--sp', `${narrow ? cw * .95 : cw * 1.1}px`);
  };
  size();
  addEventListener('resize', size);

  // Gestos: horizontal = proyectos; vertical = fotos del post centrado
  let axis = null;
  const step = () => ar.clientWidth * (isNarrow() ? .45 : .28);
  const offDrag = bindDrag(ar, {
    onStart: () => { axis = null; },
    onMove: (dx, dy, e, tx, ty) => {
      if (!axis) axis = Math.abs(tx) > Math.abs(ty) ? 'x' : 'y';
      if (axis === 'x') tp -= dx / step();
      else if (cur >= 0) ps[cur].tv -= dy / (ar.clientHeight * .22);
    },
    onEnd: () => { tp = Math.round(tp); if (cur >= 0) ps[cur].tv = Math.round(ps[cur].tv); },
    onTap: e => {
      const s = e.target.closest('.ar__s');
      if (!s) return;
      const i = +s.closest('.ar__p').dataset.i;
      if (i !== cur) { go(i); return; }
      if (Math.abs(p - tp) < .08) openProject(cur, s.querySelector('img'));
    },
  });
  // Rueda: vertical pasa fotos; horizontal (o con Mayús) pasa proyectos
  let lockY = 0;
  const onWheel = e => {
    e.preventDefault();
    const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
    if (horiz) {
      tp += (e.deltaX || e.deltaY) * .0028;
      clearTimeout(onWheel.t); onWheel.t = setTimeout(() => { tp = Math.round(tp); }, 140);
    } else if (cur >= 0) {
      const now = performance.now();
      if (Math.abs(e.deltaY) > 6 && now > lockY) { ps[cur].tv = Math.round(ps[cur].tv) + Math.sign(e.deltaY); lockY = now + 260; }
    }
  };
  ar.addEventListener('wheel', onWheel, { passive: false });
  const onMove = e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; };
  addEventListener('pointermove', onMove, { passive: true });
  const onKey = e => {
    if (e.key === 'ArrowRight') tp = Math.round(tp) + 1;
    if (e.key === 'ArrowLeft') tp = Math.round(tp) - 1;
    if (e.key === 'ArrowDown' && cur >= 0) ps[cur].tv = Math.round(ps[cur].tv) + 1;
    if (e.key === 'ArrowUp' && cur >= 0) ps[cur].tv = Math.round(ps[cur].tv) - 1;
  };
  addEventListener('keydown', onKey);

  let lastK = -1;
  const stop = ticker.add(dt => {
    p = damp(p, tp, 6, dt);
    mx = damp(mx, finePointer ? tmx : 0, 4, dt); my = damp(my, finePointer ? tmy : 0, 4, dt);
    const a = mod(Math.round(p), N);
    if (a !== cur) setCur(a);
    settle = Math.abs(tp - p) < .04 ? settle + dt : 0;
    const cw = parseFloat(ar.style.getPropertyValue('--cw')) || 300, ch = cw * 1.25;
    for (const o of ps) {
      const d = wrap(o.i - p, N), ad = Math.abs(d), vis = ad < 2.7;
      o.el.style.visibility = vis ? '' : 'hidden';
      if (!vis) continue;
      // S: los de la izquierda suben y los de la derecha bajan, girados hacia fuera
      const x = `calc(${d.toFixed(3)} * var(--sp) + ${(mx * -30).toFixed(1)}px)`;
      const y = `${(-Math.sin(d * .7) * 9 + my * -8).toFixed(2)}vh`;
      o.el.style.transform = `translate(-50%,-50%) translate3d(${x},${y},${(-ad * 120).toFixed(0)}px) rotateZ(${(d * 13).toFixed(2)}deg) rotateY(${(-d * 16 + mx * 10).toFixed(2)}deg) rotateX(${(my * -8).toFixed(2)}deg) scale(${(1 - Math.min(ad, 2) * .1).toFixed(3)})`;
      const blur = Math.max(0, ad - .35) * 5;
      o.el.style.filter = blur > .2 ? `blur(${blur.toFixed(1)}px)` : 'none';
      o.el.style.zIndex = String(50 - Math.round(ad * 10));
      o.el.classList.toggle('is-cur', o.i === cur);
      // El post se abre en vertical cuando el arco se para; sus fotos pasan como un carrete sin fin
      const want = o.i === cur && settle > .1 ? 1 : 0;
      o.open = damp(o.open, want, want ? 7 : 12, dt);
      if (!want) o.tv = Math.round(o.tv);
      o.v = damp(o.v, o.tv, 9, dt);
      const n = o.ss.length;
      o.ss.forEach((s, k) => {
        const dk = wrap(k - o.v, n), adk = Math.abs(dk);
        const near = Math.min(adk, 1), far = Math.max(adk - 1, 0);
        const yk = Math.sign(dk) * (near * (ch * .81 + 12) + far * (ch * .62 + 10)) * o.open;
        const sc = 1 - Math.min(adk, 1) * .38;
        const op = adk < .5 ? 1 : o.open * clamp(2.6 - adk, 0, 1);
        s.style.transform = `translate3d(0,${yk.toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
        s.style.opacity = op.toFixed(3);
        s.style.zIndex = String(10 - Math.round(adk));
        s.style.pointerEvents = op > .3 ? 'auto' : 'none';
        s.classList.toggle('is-c', adk < .5);
      });
    }
    if (cur >= 0) { const k = mod(Math.round(ps[cur].tv), DESIGN[cur].slides.length); if (k !== lastK) { lastK = k; info(); } }
  });
  return () => { stop(); offDrag(); closeLightbox(); ar.removeEventListener('wheel', onWheel); removeEventListener('pointermove', onMove); removeEventListener('keydown', onKey); removeEventListener('resize', size); };
}
