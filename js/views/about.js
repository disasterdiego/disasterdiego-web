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

export function mountAbout(root) {
  let mode = 'orbit', off = null;
  try { mode = sessionStorage.getItem('about-mode') === 'sheets' ? 'sheets' : 'orbit'; } catch {}
  const slot = setBarSlot(`
    <div class="switch" role="group" aria-label="Versión de About">
      <button type="button" data-mode="sheets" data-cursor-ui>Hojas</button>
      <button type="button" data-mode="orbit" data-cursor-ui>Órbita</button>
    </div>`);
  const buttons = [...slot.querySelectorAll('[data-mode]')];
  const show = m => {
    mode = m;
    try { sessionStorage.setItem('about-mode', m); } catch {}
    buttons.forEach(b => {
      b.classList.toggle('is-active', b.dataset.mode === m);
      b.setAttribute('aria-pressed', b.dataset.mode === m);
    });
    off?.();
    root.scrollTop = 0;
    root.classList.toggle('about--orbit', m === 'orbit');
    off = m === 'orbit' ? mountOrbit(root) : mountSheets(root);
  };
  buttons.forEach(b => b.addEventListener('click', () => { if (b.dataset.mode !== mode) show(b.dataset.mode); }));
  show(mode);
  return () => off?.();
}
