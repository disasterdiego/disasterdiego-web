// Minigráfico de scroll: una regla en el margen derecho. Las marcas largas son los bloques
// reales de la página; las cercanas a tu posición se alargan. Clic para saltar.
import { clamp } from './lib.js';

const TICKS = 48;

export function createScrollMap(root, sections) {
  const el = document.createElement('nav');
  el.className = 'map';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<span class="map__pct">000</span><div class="map__ticks">${'<i></i>'.repeat(TICKS)}</div>`;
  root.append(el);
  const ticks = [...el.querySelectorAll('i')];
  const pct = el.querySelector('.map__pct');

  const measure = () => {
    const max = root.scrollHeight - root.clientHeight;
    const marks = new Set(sections.map(s => Math.round(clamp(s.offsetTop / Math.max(1, max), 0, 1) * (TICKS - 1))));
    ticks.forEach((t, i) => t.classList.toggle('is-major', marks.has(i)));
  };
  measure();
  const ro = new ResizeObserver(measure);
  ro.observe(root.firstElementChild || root);

  el.addEventListener('click', e => {
    const b = el.querySelector('.map__ticks').getBoundingClientRect();
    const f = clamp((e.clientY - b.top) / b.height, 0, 1);
    root.scrollTo({ top: f * (root.scrollHeight - root.clientHeight), behavior: 'smooth' });
  });

  let lastI = -1, lastP = -1;
  return {
    update() {
      const max = root.scrollHeight - root.clientHeight;
      const p = max > 0 ? clamp(root.scrollTop / max, 0, 1) : 0;
      const pi = Math.round(p * 100);
      if (pi !== lastP) { pct.textContent = String(pi).padStart(3, '0'); lastP = pi; }
      const cur = p * (TICKS - 1), ci = Math.round(cur * 2);
      if (ci === lastI) return;
      lastI = ci;
      ticks.forEach((t, i) => {
        const k = clamp(1 - Math.abs(i - cur) / 4, 0, 1);
        t.style.transform = `scaleX(${1 + k * 1.5})`;
        t.style.opacity = i <= cur ? 1 : .32;
      });
    },
    destroy() { ro.disconnect(); },
  };
}
