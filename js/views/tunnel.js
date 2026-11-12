// DESIGN · Túnel (prueba): todas las fotos de los posts, sueltas, flotando alrededor de
// un túnel infinito. Rueda o pellizco del trackpad = avanzar / retroceder; arrastrar o
// el scroll lateral desplazan la cámara; el ratón la orienta. Tocar una foto abre su post.
import { DESIGN } from '../data.js';
import { setCursorLabel } from '../main.js';
import { ticker, damp, mod, clamp, opt, bindDrag, isNarrow, finePointer } from '../lib.js';

const isVideo = u => u.endsWith('.mp4') || u.includes('/video/upload/');
const thumb = (u, w) => (isVideo(u) ? u.replace(/\.mp4$/i, '.jpg') : opt(u, w));
const pad = n => String(n).padStart(2, '0');

export function mountTunnel(host, { open, index }) {
  // Primero todas las portadas, luego las segundas fotos… así los proyectos se mezclan
  const items = [];
  const max = Math.max(...DESIGN.map(d => d.slides.length));
  for (let k = 0; k < max; k++) DESIGN.forEach((d, i) => { if (d.slides[k]) items.push({ src: d.slides[k], i, k }); });
  const n = items.length;
  host.insertAdjacentHTML('beforeend', `<div class="tn" id="tn" data-gesture="z">
    <div class="tn__space">${items.map((it, j) => `<button type="button" class="tn__i" data-j="${j}"><img src="${thumb(it.src, 420)}" data-k="${it.k}" alt="" draggable="false" loading="lazy"></button>`).join('')}</div>
    <p class="tn__name" id="tn-name"></p>
    <div class="tn__lens" id="tn-lens" aria-hidden="true">${[0, 1].map(() => `<svg viewBox="0 0 120 120"><circle class="tn__ring" cx="60" cy="60" r="56"/><g class="tn__ticks">${Array.from({ length: 36 }, (_, t) => `<line x1="60" y1="${t % 3 ? 8 : 5}" x2="60" y2="13" transform="rotate(${t * 10} 60 60)"/>`).join('')}</g><circle class="tn__iris" cx="60" cy="60" r="30"/><text x="60" y="64" text-anchor="middle"></text></svg>`).join('')}</div>
    <button type="button" class="tn__toggle" id="tn-toggle" data-cursor-ui aria-pressed="true">◎ Lente</button>
    <div class="dguide dguide--tn" aria-hidden="true"><span class="dguide__g is-z"><i><b></b></i><small>${isNarrow() ? 'Desliza para avanzar' : 'Rueda o pellizca para avanzar'}</small></span></div>
  </div>`);
  const tn = host.querySelector('#tn'), name = host.querySelector('#tn-name');
  const els = [...tn.querySelectorAll('.tn__i')];
  const GAP = isNarrow() ? 300 : 340, L = n * GAP, NEAR = 700, FAR = GAP * 10;
  // Cada foto en su sitio alrededor del eje (ángulo áureo, radio con algo de azar fijo)
  const pos = items.map((_, j) => {
    const a = j * 2.39996, r = .72 + ((j * 7919) % 97) / 97 * .45;
    return { a, r, rot: (((j * 31) % 17) - 8) * .9 };
  });
  let z = -GAP * .4, tz = z, ox = 0, oy = 0, tox = 0, toy = 0, mx = 0, my = 0, tmx = 0, tmy = 0, hover = -1;
  const used = () => tn.classList.add('is-used');
  // Micrográficos de lente a los lados: giran con la profundidad; se pueden quitar
  const lens = tn.querySelector('#tn-lens'), toggle = tn.querySelector('#tn-toggle');
  const ticks = [...lens.querySelectorAll('.tn__ticks')], iris = [...lens.querySelectorAll('.tn__iris')], txt = [...lens.querySelectorAll('text')];
  let lensOn = true;
  try { lensOn = localStorage.getItem('dd-tn-lens') !== '0'; } catch {}
  const setLensOn = on => { lensOn = on; lens.hidden = !on; toggle.setAttribute('aria-pressed', on); toggle.classList.toggle('is-off', !on); try { localStorage.setItem('dd-tn-lens', on ? '1' : '0'); } catch {} };
  setLensOn(lensOn);
  toggle.addEventListener('click', () => setLensOn(!lensOn));
  // Ir a un proyecto desde el índice: la cámara vuela hasta su portada
  const go = i => { const d = mod(i * GAP - tz, L); tz += d > L / 2 ? d - L : d; tz -= GAP * .9; };

  const onWheel = e => {
    e.preventDefault();
    used();
    // Pellizco del trackpad llega como rueda con Ctrl: acercar = avanzar
    // Cualquier dirección del trackpad mueve por el túnel (nunca se sale de las fotos)
    if (e.ctrlKey) tz -= e.deltaY * 9;
    else tz += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 1.6;
  };
  tn.addEventListener('wheel', onWheel, { passive: false });
  const offDrag = bindDrag(tn, {
    onMove: (dx, dy) => { used(); tz -= (Math.abs(dy) >= Math.abs(dx) ? dy : -dx) * 3.2; },
    onTap: e => { const b = e.target.closest('.tn__i'); if (b) open(items[+b.dataset.j].i, b.querySelector('img')); },
  });
  const onMove = e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; };
  addEventListener('pointermove', onMove, { passive: true });
  const label = j => `${pad(items[j].i + 1)} ${DESIGN[items[j].i].title}`;
  const onOver = e => {
    const b = e.target.closest('.tn__i');
    hover = b ? +b.dataset.j : -1;
    if (finePointer) setCursorLabel(b ? label(hover) : '');
  };
  tn.addEventListener('pointerover', onOver);
  tn.addEventListener('pointerleave', () => { hover = -1; setCursorLabel(''); });
  const onKey = e => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { tz += (e.key === 'ArrowUp' ? 1 : -1) * GAP; used(); }
  };
  addEventListener('keydown', onKey);

  let near = -1;
  const stop = ticker.add(dt => {
    z = damp(z, tz, 3.2, dt);
    tox = damp(tox, 0, .6, dt); toy = damp(toy, 0, .6, dt);
    mx = damp(mx, finePointer ? tmx : 0, 3, dt); my = damp(my, finePointer ? tmy : 0, 3, dt);
    ox = damp(ox, tox - mx * 160, 5, dt); oy = damp(oy, toy - my * 120, 5, dt);
    const W = innerWidth, H = innerHeight, rx = W * (isNarrow() ? .36 : .42), ry = H * (isNarrow() ? .3 : .38);
    tn.style.setProperty('--rx', `${(my * 6).toFixed(2)}deg`);
    tn.style.setProperty('--ry', `${(mx * -8).toFixed(2)}deg`);
    let best = -1, bd = 1e9;
    for (let j = 0; j < n; j++) {
      const el = els[j];
      // Distancia por delante de la cámara (0 = pegada, sigue sin fin)
      const d = mod(j * GAP - z, L);
      const vis = d < FAR;
      if (el.hidden === vis) el.hidden = !vis;
      if (!vis) continue;
      const p = pos[j];
      const x = Math.cos(p.a) * rx * p.r + ox, y = Math.sin(p.a) * ry * p.r + oy;
      const op = clamp((FAR - d) / (GAP * 4), 0, 1) * clamp((d - 40) / 260, 0, 1);
      el.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${(NEAR - d).toFixed(1)}px) rotate(${p.rot}deg)`;
      el.style.opacity = op.toFixed(3);
      el.style.zIndex = String(Math.round(FAR - d));
      el.style.pointerEvents = op > .08 ? 'auto' : 'none';
      if (d > 260 && d < bd) { bd = d; best = j; }
    }
    // El nombre del proyecto más cercano, discreto, abajo en el centro
    const show = hover >= 0 ? hover : best;
    if (show !== near) { near = show; name.textContent = show >= 0 ? label(show) : ''; if (show >= 0) index?.setActive(items[show].i); }
    if (lensOn) {
      const v = Math.min(Math.abs(tz - z) / 900, 1);
      ticks.forEach((t, q) => t.setAttribute('transform', `rotate(${((q ? -z : z) * .05).toFixed(1)} 60 60)`));
      iris.forEach(c => c.setAttribute('r', (30 - v * 16).toFixed(1)));
      txt.forEach((t, q) => { t.textContent = q ? `${pad(mod(Math.round(z / GAP), n) + 1)}/${n}` : `F/${(1.4 + v * 6).toFixed(1)}`; });
    }
  });

  return { go, off: () => {
    stop(); offDrag(); setCursorLabel('');
    tn.removeEventListener('wheel', onWheel);
    removeEventListener('pointermove', onMove);
    removeEventListener('keydown', onKey);
  } };
}
