// ABOUT: dos versiones para comparar. Hojas: papel vegetal apilado al hacer scroll.
// Órbita: tú en el centro y las marcas girando a tu alrededor; se arrastran y se pueden abrir.
import { ABOUT, PROJECTS } from '../data.js';
import { setBarSlot } from '../main.js';
import { esc, ticker, damp, bindDrag, isNarrow, reduced } from '../lib.js';
import { createScrollMap } from '../scrollmap.js';

const rows = list => `<ul class="ledger">${list.map(r => `<li><span>${esc(r.when)}</span><b>${esc(r.what)}</b><span>${esc(r.where)}</span></li>`).join('')}</ul>`;
const findBrandProject = b => {
  const k = b.toLowerCase();
  return PROJECTS.advertising.find(p => `${p.title} ${p.client || ''}`.toLowerCase().includes(k));
};
const nowLine = `${esc(ABOUT.now.what)} — ${esc(ABOUT.now.where)}`;

function mountSheets(root) {
  const brands = ABOUT.brands.map(b => `<span>${esc(b)}</span><i>×</i>`).join('');
  const sheet = (i, r, code, title, body) => `
    <section class="sheet sheet--print" style="--r:${r}deg;--i:${i}">
      <header class="sheet__marks"><span>]*[</span><span>${code}</span><span>// ${title}</span><span>0${i + 1}</span><span>]-[</span></header>
      ${body}
      <i class="sheet__tab" aria-hidden="true"><b>F7${i + 3}</b><em>A</em><em>B</em><em>C</em><em>D</em></i>
    </section>`;
  root.innerHTML = `
    <div class="sheets">
      ${sheet(0, -.5, 'INDENTITY', 'NOT A REBRANDING', `
        <h1 class="about__bio display">${esc(ABOUT.bio)}</h1>
        <p class="sheet__now"><span>Ahora</span> ${nowLine}</p>`)}
      ${sheet(1, .6, 'BRANDS', 'He trabajado con', `
        <div class="marquee" aria-label="${esc(ABOUT.brands.join(', '))}"><div class="marquee__in" aria-hidden="true">${brands}${brands}</div></div>
        <ul class="brandlist">${ABOUT.brands.map(b => `<li>${esc(b)}</li>`).join('')}</ul>`)}
      ${sheet(2, -.4, 'CAREER', 'Recorrido', rows(ABOUT.career))}
      ${sheet(3, .5, 'RECOGNITION', 'Premios', rows(ABOUT.awards))}
    </div>`;
  const map = createScrollMap(root, [...root.querySelectorAll('.sheet')]);
  const stop = ticker.add(() => map.update());
  return () => { stop(); map.destroy(); };
}

function mountOrbit(root) {
  const n = ABOUT.brands.length;
  root.innerHTML = `
    <div class="orbit">
      <div class="orbit__stage" id="stage" data-cursor-ui>
        <img class="orbit__me" id="me" src="assets/id/mask.webp" alt="Máscara de disasterIDego" draggable="false">
        ${ABOUT.brands.map((b, i) => {
          const p = findBrandProject(b);
          return `<button class="ocard${p ? ' has-link' : ''}" type="button" data-i="${i}"${p ? ` data-href="#/p/${p.id}"` : ''}><b class="display">${esc(b)}</b></button>`;
        }).join('')}
        <p class="orbit__hint" id="hint">${isNarrow() ? 'Arrastra para girar las marcas' : 'Arrastra para girar. Toca una marca'}</p>
      </div>
      <nav class="orbit__tabs" aria-label="Información">
        <button type="button" data-tab="l" data-cursor-ui>Bio · Ahora</button>
        <button type="button" data-tab="r" data-cursor-ui>Recorrido · Premios</button>
      </nav>
      <aside class="orbit__l" data-panel="l">
        <p class="sheet__k">Bio</p>
        <h1 class="orbit__bio">${esc(ABOUT.bio)}</h1>
        <p class="sheet__k">Ahora</p>
        <p class="orbit__now display">${nowLine}</p>
      </aside>
      <aside class="orbit__r" data-panel="r">
        <p class="sheet__k">Recorrido</p>${rows(ABOUT.career)}
        <p class="sheet__k">Premios</p>${rows(ABOUT.awards)}
      </aside>
    </div>`;

  // En móvil no hay scroll: la información se abre como una hoja sobre la órbita
  const tabs = [...root.querySelectorAll('[data-tab]')], panels = [...root.querySelectorAll('[data-panel]')];
  const onTab = e => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    const on = !b.classList.contains('is-active');
    tabs.forEach(t => t.classList.toggle('is-active', on && t === b));
    panels.forEach(p => p.classList.toggle('is-open', on && p.dataset.panel === b.dataset.tab));
  };
  root.querySelector('.orbit__tabs').addEventListener('click', onTab);
  const stage = root.querySelector('#stage'), me = root.querySelector('#me'), hint = root.querySelector('#hint');
  const cards = [...root.querySelectorAll('.ocard')].map((el, i) => ({ el, i, blur: -1 }));
  let rot = 0, trot = 0, hover = null, W = 0, H = 0, mx = 0, my = 0, tmx = 0, tmy = 0;
  const size = () => { W = stage.clientWidth; H = stage.clientHeight; };
  size();
  addEventListener('resize', size, { passive: true });

  const offDrag = bindDrag(stage, {
    onMove: dx => { trot += dx * .007; },
    onTap: e => {
      const c = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.ocard');
      if (c?.dataset.href) location.hash = c.dataset.href;
    },
  });
  const onOver = e => {
    const c = e.target.closest?.('.ocard');
    hover = c ? +c.dataset.i : null;
    if (e.pointerType === 'mouse') { tmx = (e.clientX / innerWidth - .5); tmy = (e.clientY / innerHeight - .5); }
    const p = c?.dataset.href;
    hint.textContent = c ? (p ? `${ABOUT.brands[hover]}: ver proyecto` : ABOUT.brands[hover]) : (isNarrow() ? 'Arrastra para girar las marcas' : 'Arrastra para girar. Toca una marca');
  };
  stage.addEventListener('pointermove', onOver, { passive: true });
  stage.addEventListener('pointerleave', () => { hover = null; tmx = tmy = 0; });
  const onWheel = e => {
    if (isNarrow()) return;
    e.preventDefault();
    trot += (e.deltaY + e.deltaX) * .0022;
  };
  stage.addEventListener('wheel', onWheel, { passive: false });

  const stop = ticker.add(dt => {
    if (!reduced && hover === null) trot += dt * .14;
    rot = damp(rot, trot, 5, dt);
    mx = damp(mx, tmx, 3, dt); my = damp(my, tmy, 3, dt);
    me.style.transform = `translate(-50%,-50%) perspective(900px) rotateY(${mx * 14}deg) rotateX(${-my * 9}deg)`;
    const rx = W * (isNarrow() ? .4 : .43), ry = H * .34, ty = Math.sin(mx) * .2;
    for (const c of cards) {
      const a = (c.i / n) * Math.PI * 2 + rot;
      const z = Math.sin(a), x = Math.cos(a) * rx, y = z * ry * .55 + Math.cos(a) * rx * .1 + ty * x;
      const k = (z + 1) / 2, on = hover === c.i;
      c.el.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${(.68 + k * .5 + (on ? .1 : 0)).toFixed(3)}) rotate(${(Math.cos(a) * -5).toFixed(2)}deg)`;
      c.el.style.zIndex = z > -.1 ? 4 + Math.round(k * 5) : 1;
      c.el.style.opacity = (.42 + k * .58).toFixed(2);
      const blur = Math.round((1 - k) * 3);
      if (blur !== c.blur) { c.blur = blur; c.el.style.filter = blur ? `blur(${blur}px)` : 'none'; }
    }
  });

  return () => {
    stop();
    offDrag();
    removeEventListener('resize', size);
  };
}

// Lente: todo está escrito, pero fuera de foco y con el color separado.
// Solo se lee lo que pasa por la lente. La rueda (o pellizcar) cambia su tamaño.
function mountLens(root) {
  const brands = ABOUT.brands.map(b => `<span>${esc(b)}</span>`).join('');
  const body = `
    <p class="alens__k">Bio</p>
    <h1 class="alens__bio">${esc(ABOUT.bio)}</h1>
    <p class="alens__now"><span>Ahora</span> ${nowLine}</p>
    <p class="alens__k">Marcas</p>
    <p class="alens__brands">${brands}</p>
    <div class="alens__cols"><div><p class="alens__k">Recorrido</p>${rows(ABOUT.career)}</div><div><p class="alens__k">Premios</p>${rows(ABOUT.awards)}</div></div>`;
  root.innerHTML = `
    <div class="alens" id="alens">
      <div class="alens__layer alens__blur" aria-hidden="true">${body}</div>
      <div class="alens__layer alens__sharp" id="sharp">${body}</div>
      <i class="alens__ring" id="ring" aria-hidden="true"></i>
      <p class="alens__hint" id="hint">${isNarrow() ? 'Arrastra la lente para leer' : 'Mueve la lente para leer · rueda: enfoque'}</p>
    </div>`;
  const box = root.querySelector('#alens'), sharp = root.querySelector('#sharp'), ring = root.querySelector('#ring');
  let W = box.clientWidth, H = box.clientHeight;
  let tx = W * .3, ty = H * .3, x = tx, y = ty, R = isNarrow() ? 110 : 170, tR = R, touched = 0, idle = 0;
  const size = () => { W = box.clientWidth; H = box.clientHeight; };
  addEventListener('resize', size, { passive: true });
  const onMove = e => {
    const b = box.getBoundingClientRect();
    tx = e.clientX - b.left; ty = e.clientY - b.top; touched = 3;
  };
  box.addEventListener('pointermove', onMove, { passive: true });
  box.addEventListener('pointerdown', onMove, { passive: true });
  const onWheel = e => { e.preventDefault(); tR = Math.max(80, Math.min(340, tR - e.deltaY * .4)); };
  box.addEventListener('wheel', onWheel, { passive: false });
  const stop = ticker.add((dt, t) => {
    touched = Math.max(0, touched - dt);
    if (!touched && !reduced) {
      // Sin cursor, la lente recorre el texto sola
      idle += dt;
      tx = W * (.5 + Math.sin(idle * .35) * .34);
      ty = H * (.45 + Math.sin(idle * .52 + 1) * .3);
    }
    const px = x, py = y;
    x = damp(x, tx, 9, dt); y = damp(y, ty, 9, dt);
    R = damp(R, tR, 8, dt);
    const sp = Math.min(Math.hypot(x - px, y - py) / Math.max(dt, .001) / 1800, 1);
    const m = `radial-gradient(circle ${R.toFixed(0)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, #000 62%, transparent 100%)`;
    sharp.style.webkitMaskImage = m;
    sharp.style.maskImage = m;
    ring.style.transform = `translate3d(${x - R}px,${y - R}px,0)`;
    ring.style.width = ring.style.height = `${R * 2}px`;
    ring.style.setProperty('--ca', `${(2 + sp * 10).toFixed(1)}px`);
  });
  return () => { stop(); removeEventListener('resize', size); };
}

export function mountAbout(root) {
  let mode = 'lens', off = null;
  try { mode = ['sheets', 'orbit', 'lens'].find(m => m === sessionStorage.getItem('about-mode2')) || 'lens'; } catch {}
  const slot = setBarSlot(`
    <div class="switch" role="group" aria-label="Versión de About">
      <button type="button" data-mode="sheets" data-cursor-ui>Hojas</button>
      <button type="button" data-mode="orbit" data-cursor-ui>Órbita</button>
      <button type="button" data-mode="lens" data-cursor-ui>Lente</button>
    </div>`);
  const buttons = [...slot.querySelectorAll('[data-mode]')];
  const show = m => {
    mode = m;
    try { sessionStorage.setItem('about-mode2', m); } catch {}
    buttons.forEach(b => {
      b.classList.toggle('is-active', b.dataset.mode === m);
      b.setAttribute('aria-pressed', b.dataset.mode === m);
    });
    off?.();
    root.scrollTop = 0;
    root.classList.toggle('about--orbit', m !== 'sheets');
    off = m === 'orbit' ? mountOrbit(root) : m === 'lens' ? mountLens(root) : mountSheets(root);
  };
  buttons.forEach(b => b.addEventListener('click', () => { if (b.dataset.mode !== mode) show(b.dataset.mode); }));
  show(mode);
  return () => off?.();
}
