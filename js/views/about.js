// ABOUT: una sola pieza. Una hoja de contactos con cuatro fotogramas (bio, marcas,
// recorrido y premios) escrita fuera de foco y con el color separado. Solo se lee
// lo que pasa por la lente, que además amplía. De Hojas se queda la marca de
// fotocopia; de Órbita, las marcas en movimiento; de Lente, la lente.
import { ABOUT } from '../data.js';
import { esc, ticker, damp, clamp, isNarrow, reduced } from '../lib.js';

const rows = list => `<ul class="ledger">${list.map(r => `<li><span>${esc(r.when)}</span><b>${esc(r.what)}</b><span>${esc(r.where)}</span></li>`).join('')}</ul>`;
const frame = (n, code, title, body, cls = '') => `
  <section class="aframe ${cls}">
    <header class="aframe__marks"><span>]*[</span><span>${code}</span><span>// ${title}</span><span>F7${n}</span></header>
    ${body}
  </section>`;

export function mountAbout(root) {
  const brandList = ABOUT.brands.map(b => `<li>${ABOUT.logos?.[b] ? `<img src="${ABOUT.logos[b]}" alt="" draggable="false">` : ''}<span>${esc(b)}</span></li>`).join('');
  const body = `
    ${frame(3, 'INDENTITY', 'Bio', `<h1 class="aframe__bio">${esc(ABOUT.bio)}</h1><p class="aframe__now"><span>Ahora</span> ${esc(ABOUT.now.what)} — ${esc(ABOUT.now.where)}</p>`, 'aframe--bio')}
    ${frame(4, 'BRANDS', `${ABOUT.brands.length} marcas`, `<div class="abelt"><ul>${brandList}${brandList}</ul></div>`, 'aframe--brands')}
    ${frame(5, 'CAREER', 'Recorrido', rows(ABOUT.career))}
    ${frame(6, 'RECOGNITION', 'Premios', rows(ABOUT.awards))}`;
  root.innerHTML = `
    <div class="alens" id="alens">
      <div class="alens__layer alens__blur" aria-hidden="true">${body}</div>
      <div class="alens__layer alens__sharp" id="sharp">${body}</div>
      <i class="alens__ring" id="ring" aria-hidden="true"><i class="alens__cross"></i></i>
      <div class="alens__zoom" role="group" aria-label="Tamaño de la lente">
        <button type="button" data-z="-1" data-cursor-ui aria-label="Lente más pequeña">−</button>
        <span id="zv">×1.3</span>
        <button type="button" data-z="1" data-cursor-ui aria-label="Lente más grande">+</button>
      </div>
      <p class="alens__hint">${isNarrow() ? 'Arrastra la lente · pellizca o usa + −' : 'Mueve la lente · rueda: tamaño'}</p>
    </div>`;

  const box = root.querySelector('#alens'), sharp = root.querySelector('#sharp'), ring = root.querySelector('#ring');
  const zv = root.querySelector('#zv');
  const belts = [...root.querySelectorAll('.abelt ul')];
  let W = box.clientWidth, H = box.clientHeight;
  const minR = 60, maxR = isNarrow() ? 190 : 320;
  let tx = W * .3, ty = H * .3, x = tx, y = ty, R = isNarrow() ? 95 : 160, tR = R, touched = 0, idle = 0, belt = 0;
  const size = () => { W = box.clientWidth; H = box.clientHeight; };
  addEventListener('resize', size, { passive: true });

  // Un dedo mueve la lente; dos dedos la abren o la cierran
  const pts = new Map();
  let pinch0 = 0, pinchR = 0;
  const local = e => { const b = box.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  const onDown = e => {
    if (e.target.closest('.alens__zoom')) return;
    pts.set(e.pointerId, local(e));
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); pinchR = tR; }
    onMove(e);
  };
  const onMove = e => {
    if (e.target.closest?.('.alens__zoom')) return;
    const p = local(e);
    if (pts.has(e.pointerId)) pts.set(e.pointerId, p);
    touched = 3;
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      tR = clamp(pinchR * Math.hypot(a[0] - b[0], a[1] - b[1]) / (pinch0 || 1), minR, maxR);
      tx = (a[0] + b[0]) / 2; ty = (a[1] + b[1]) / 2;
      return;
    }
    // En móvil la lente queda un poco por encima del dedo, para que se vea lo que lees
    tx = p[0]; ty = p[1] - (e.pointerType === 'touch' ? R * .6 : 0);
  };
  const onUp = e => pts.delete(e.pointerId);
  box.addEventListener('pointerdown', onDown);
  box.addEventListener('pointermove', onMove, { passive: true });
  box.addEventListener('pointerup', onUp);
  box.addEventListener('pointercancel', onUp);
  const onWheel = e => { e.preventDefault(); tR = clamp(tR - e.deltaY * .4, minR, maxR); };
  box.addEventListener('wheel', onWheel, { passive: false });
  root.querySelector('.alens__zoom').addEventListener('click', e => {
    const b = e.target.closest('[data-z]');
    if (b) tR = clamp(tR + +b.dataset.z * 30, minR, maxR);
  });

  const stop = ticker.add((dt, t) => {
    touched = Math.max(0, touched - dt);
    if (!touched && !reduced) {
      // Sin cursor, la lente recorre la hoja sola
      idle += dt;
      tx = W * (.5 + Math.sin(idle * .35) * .34);
      ty = H * (.45 + Math.sin(idle * .52 + 1) * .3);
    }
    const px = x, py = y;
    x = damp(x, tx, 9, dt); y = damp(y, ty, 9, dt);
    R = damp(R, tR, 8, dt);
    const sp = Math.min(Math.hypot(x - px, y - py) / Math.max(dt, .001) / 1800, 1);
    // La lente amplía: más pequeña, más aumento
    const Z = 1.15 + (1 - (R - minR) / (maxR - minR)) * .45;
    sharp.style.transformOrigin = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    sharp.style.transform = `scale(${Z.toFixed(3)})`;
    const m = `radial-gradient(circle ${(R / Z).toFixed(0)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, #000 70%, transparent 100%)`;
    sharp.style.webkitMaskImage = m;
    sharp.style.maskImage = m;
    ring.style.transform = `translate3d(${(x - R).toFixed(1)}px,${(y - R).toFixed(1)}px,0)`;
    ring.style.width = ring.style.height = `${(R * 2).toFixed(0)}px`;
    ring.style.setProperty('--ca', `${(2 + sp * 10).toFixed(1)}px`);
    zv.textContent = `×${Z.toFixed(1)}`;
    // Marcas en órbita lenta, idénticas en las dos capas
    if (!reduced) belt += dt * 26;
    for (const b of belts) { const w = b.scrollWidth / 2 || 1; b.style.transform = `translate3d(${-(belt % w).toFixed(1)}px,0,0)`; }
  });
  return () => { stop(); removeEventListener('resize', size); };
}
