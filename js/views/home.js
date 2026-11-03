// HOME: tu retrato encima y, debajo, la versión tatuada. Una gota de agua (la misma
// del resto de la web) sigue al cursor y deja ver la capa de abajo. La cabeza gira un poco en 3D.
import { HOME_IMAGE, HOME_UNDER, WORLDS, PROJECTS, DESIGN, CONTENT, ABOUT } from '../data.js';
import { ticker, damp, opt, esc, reduced, isNarrow, finePointer } from '../lib.js';

const isVideo = u => u.endsWith('.mp4') || u.includes('/video/upload/');
const poster = u => (isVideo(u) ? u.replace(/\.mp4$/i, '.jpg') : opt(u, 420));

// Mini resumen de cada sección: solo lo más importante
const PEEK = {
  advertising: PROJECTS.advertising.slice(0, 4).map(p => ({ src: opt(p.cover, 420), title: p.title, href: `#/p/${p.id}` })),
  design: DESIGN.slice(0, 4).map(d => ({ src: poster(d.slides[0]), title: d.title, href: '#/design' })),
  content: CONTENT.slice(0, 4).map(c => ({ src: poster(c.src), title: c.title, href: '#/content' })),
};
const COUNT = { advertising: PROJECTS.advertising.length, design: DESIGN.length, content: CONTENT.length };

const peekHTML = id => {
  const w = WORLDS.find(x => x.id === id);
  const head = `<header><b class="display">${esc(w.label)}</b><span>${COUNT[id] ? `${COUNT[id]} proyectos` : 'Bio, marcas, recorrido'}</span></header>`;
  if (id === 'about') return `${head}<p class="peek__bio">${esc(ABOUT.bio)}</p><ul class="peek__brands">${ABOUT.brands.map(b => `<li>${esc(b)}</li>`).join('')}</ul>`;
  return `${head}<div class="peek__grid">${PEEK[id].map((p, i) => `<a href="${p.href}" style="--i:${i}" data-cursor-ui><span><img src="${p.src}" alt="" loading="lazy"></span><small>${esc(p.title)}</small></a>`).join('')}</div>`;
};

export function mountHome(root) {
  root.innerHTML = `
    <div class="hz" id="hz">
      <div class="hz__tilt" id="tilt">
        <img class="hz__top" src="${HOME_IMAGE}" alt="Retrato de Diego" fetchpriority="high" draggable="false">
        <div class="hz__under" id="under">
          ${HOME_UNDER
            ? `<img src="${HOME_UNDER}" alt="" draggable="false">`
            : `<img class="hz__xerox" src="${HOME_IMAGE}" alt="" draggable="false"><i class="hz__ink"></i>`}
        </div>
      </div>
      <i class="hz__ring hz__ring--r" id="rr"></i><i class="hz__ring hz__ring--b" id="rb"></i>
    </div>
    <h1 class="sr">disasterdiego</h1>
    <nav class="home__pillars" id="pillars" aria-label="Secciones">${WORLDS.map(w => `
      <a href="#/${w.id}" data-id="${w.id}" data-cursor-ui><i>×</i><span>${w.label}</span><small>${COUNT[w.id] ?? ''}</small></a>`).join('')}
    </nav>
    <aside class="peek" id="peek" aria-hidden="true"></aside>`;

  const $ = s => root.querySelector(s);
  const tilt = $('#tilt'), under = $('#under'), rr = $('#rr'), rb = $('#rb'), peek = $('#peek'), pillars = $('#pillars');

  // Resumen a la derecha: se queda abierto al pasar del pilar al panel
  let shown = null, closeT = 0;
  const open = id => {
    clearTimeout(closeT);
    if (id !== shown) {
      shown = id;
      peek.innerHTML = peekHTML(id);
      peek.classList.remove('is-in');
      void peek.offsetWidth;
    }
    peek.classList.add('is-in');
    pillars.querySelectorAll('a').forEach(a => a.classList.toggle('is-active', a.dataset.id === id));
  };
  const close = () => {
    closeT = setTimeout(() => {
      peek.classList.remove('is-in');
      pillars.querySelectorAll('a').forEach(a => a.classList.remove('is-active'));
      shown = null;
    }, 260);
  };
  const onOver = e => { const a = e.target.closest('a'); if (a && e.pointerType === 'mouse') open(a.dataset.id); };
  pillars.addEventListener('pointerover', onOver);
  pillars.addEventListener('pointerleave', close);
  peek.addEventListener('pointerenter', () => clearTimeout(closeT));
  peek.addEventListener('pointerleave', close);

  // La gota: una cabeza y dos estelas que van con retraso, para que el borde sea líquido
  const SCALE = 1.05;
  let W = root.clientWidth, H = root.clientHeight;
  const onResize = () => { W = root.clientWidth; H = root.clientHeight; };
  addEventListener('resize', onResize, { passive: true });

  let tx = W / 2, ty = H * .42, touched = 0, idle = 0;
  const a = { x: tx, y: ty }, b = { x: tx, y: ty }, c = { x: tx, y: ty };
  let rx = 0, ry = 0, rad = 0;
  const onMove = e => { tx = e.clientX; ty = e.clientY; touched = 3; };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onMove, { passive: true });

  const stop = ticker.add((dt, t) => {
    touched = Math.max(0, touched - dt);
    if (!touched && !reduced) {
      // Sin cursor, la gota recorre sola la cara
      idle += dt;
      tx = W / 2 + Math.sin(idle * .55) * Math.min(W, H) * .13;
      ty = H * .4 + Math.sin(idle * .83 + 1) * H * .09;
    }
    a.x = damp(a.x, tx, 10, dt); a.y = damp(a.y, ty, 10, dt);
    b.x = damp(b.x, tx, 5, dt); b.y = damp(b.y, ty, 5, dt);
    c.x = damp(c.x, tx, 2.8, dt); c.y = damp(c.y, ty, 2.8, dt);

    const base = Math.min(W, H) * (isNarrow() ? .25 : .21) * (shown ? 1.3 : 1);
    rad = damp(rad || base, base, 4, dt);
    const r = rad * (1 + Math.sin(t * 1.3) * .025);
    const speed = Math.min(1, Math.hypot(a.x - c.x, a.y - c.y) / 260);

    // Coordenadas de la capa, que está algo ampliada respecto a la pantalla
    const lx = v => (v - W / 2) / SCALE + W / 2, ly = v => (v - H / 2) / SCALE + H / 2;
    const g = (p, q) => `radial-gradient(circle ${q.toFixed(1)}px at ${lx(p.x).toFixed(1)}px ${ly(p.y).toFixed(1)}px,#000 97%,transparent 100%)`;
    const mask = `${g(a, r)},${g(b, r * .8)},${g(c, r * .55)}`;
    under.style.webkitMaskImage = mask;
    under.style.maskImage = mask;

    // Filo con aberración: dos líneas finas que se separan al moverte
    const off = 1.5 + speed * 7;
    rr.style.cssText = `width:${r * 2}px;height:${r * 2}px;transform:translate3d(${a.x - r - off}px,${a.y - r}px,0)`;
    rb.style.cssText = `width:${r * 2}px;height:${r * 2}px;transform:translate3d(${a.x - r + off}px,${a.y - r}px,0)`;

    // Giro de cabeza
    const mx = finePointer && touched ? (tx / W - .5) : Math.sin(t * .3) * .25;
    const my = finePointer && touched ? (ty / H - .5) : Math.sin(t * .4) * .2;
    rx = damp(rx, reduced ? 0 : -my * 5, 3.5, dt);
    ry = damp(ry, reduced ? 0 : mx * 8, 3.5, dt);
    tilt.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${SCALE})`;
  });

  return () => {
    stop();
    clearTimeout(closeT);
    removeEventListener('resize', onResize);
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerdown', onMove);
  };
}
