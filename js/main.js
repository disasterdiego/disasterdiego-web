import { SOCIALS, WORLDS, PROJECTS, DESIGN, CONTENT, findProject } from './data.js';
import { ticker, lerp, damp, finePointer, reduced, esc, opt } from './lib.js';
import { initFx, fxHide } from './fx.js';
import { initScan } from './scan.js';
import { sound } from './sound.js';
import { cursorMode, cursorIndex, nextCursor, onCursorChange, glassMap, CURSORS } from './cursor-mode.js';
import { mountHome } from './views/home.js';
import { mountAdvertising } from './views/advertising.js';
import { mountDesign } from './views/design.js';
import { mountContent } from './views/content.js';
import { mountAbout } from './views/about.js';
import { mountProject } from './views/project.js';

const $ = id => document.getElementById(id);
const view = $('view');
initScan();
const COUNTS = { advertising: PROJECTS.advertising.length, design: DESIGN.length, content: CONTENT.length };

// ---------- Contacto ----------
const external = s => (s.key === 'mail' ? '' : ' target="_blank" rel="noopener noreferrer"');
$('socials').innerHTML = SOCIALS.map(s =>
  `<a href="${s.href}"${external(s)} aria-label="${s.label}" data-cursor-ui><span class="long">${s.label}</span><span class="short">${s.short}</span></a>`).join('')
  + `<button type="button" class="social__sound" id="sound-toggle" data-cursor-ui aria-pressed="true" aria-label="Sonido"><i></i><i></i><i></i></button>`;

const soundBtn = $('sound-toggle');
const syncSound = () => {
  soundBtn.setAttribute('aria-pressed', sound.on);
  soundBtn.classList.toggle('is-off', !sound.on);
};
soundBtn.addEventListener('click', () => { sound.toggle(); syncSound(); });
syncSound();

// ---------- Menú: las cuatro secciones siempre a la vista ----------
$('nav-links').innerHTML = WORLDS.map((w, i) => `
  <a class="nav__link" href="#/${w.id}" data-world="${w.id}" style="--i:${i}" data-cursor-ui>
    <span class="nav__n">0${i + 1}</span><span class="nav__t">${esc(w.label)}</span>${COUNTS[w.id] ? `<sup>${String(COUNTS[w.id]).padStart(2, '0')}</sup>` : ''}
  </a>`).join('');

// Móvil: el menú se despliega abajo, cerca del dedo, y las secciones de arriba se van
const THUMB = { advertising: PROJECTS.advertising[0].cover, design: DESIGN[0].slides[0], content: PROJECTS.advertising[2].cover, about: 'assets/home/top.webp' };
const navPanel = $('nav-panel'), menuBtn = $('menu-toggle');
navPanel.innerHTML = WORLDS.map((w, i) => `
  <a class="nav__row" href="#/${w.id}" data-world="${w.id}" style="--i:${i}">
    <span class="nav__n">0${i + 1}</span><span class="nav__thumb"><img src="${THUMB[w.id].startsWith('http') ? opt(THUMB[w.id], 160) : THUMB[w.id]}" alt="" loading="lazy"></span>
    <span class="nav__big">${esc(w.label)}</span><span class="nav__n">${COUNTS[w.id] ? String(COUNTS[w.id]).padStart(2, '0') : ''}</span>
  </a>`).join('');
const setMenu = open => {
  document.body.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', open);
  navPanel.inert = !open;
  $('menu-label').textContent = open ? 'Close' : 'Menu';
};
menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
navPanel.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('pointerdown', e => { if (document.body.classList.contains('menu-open') && !e.target.closest('#bar')) setMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
addEventListener('hashchange', () => setMenu(false));

// Tipografía única: Syne Mono para todo (títulos, textos y pies)
{
  const fam = "'Syne Mono', 'Space Mono', ui-monospace, monospace";
  document.documentElement.style.setProperty('--pixel', fam);
  document.documentElement.style.setProperty('--mono', fam);
  document.documentElement.style.setProperty('--ds', .7);
  document.documentElement.dataset.font = 'Syne Mono';
  document.fonts?.load("400 20px 'Syne Mono'").then(() => dispatchEvent(new Event('fontchange'))).catch(() => {});
}

// La barra aloja el control de cada página: así no flota nada encima de los textos
export function setBarSlot(html) {
  const slot = $('bar-slot');
  slot.innerHTML = html || '';
  $('bar').classList.toggle('has-slot', !!html);
  return slot;
}

// ---------- Cursor ----------
const cursor = $('cursor');
cursor.innerHTML = '<i class="cursor__deco" aria-hidden="true"><b></b><b></b><b></b><b></b><em></em></i><span class="cursor__label"></span>';
const cLabel = cursor.querySelector('.cursor__label'), cWord = cursor.querySelector('.cursor__deco em');
export function setCursorLabel(html) {
  cLabel.innerHTML = html || '';
  document.body.classList.toggle('cursor-label', !!html);
}
// Lo que se hace en cada página: arrastrar en los dos ejes, scroll vertical, zoom…
// Una zona puede pedir el suyo con data-gesture.
const GESTURE = { advertising: 'xy', design: 'xy', content: 'y', about: 'y', project: 'y' };
const WORD = { x: 'Desliza', y: 'Scroll', xy: 'Arrastra', z: 'Zoom' };
if (finePointer) {
  document.documentElement.classList.add('has-cursor');
  // Cristal líquido: en Chrome refracta de verdad lo que hay debajo (filtro #lg) con el
  // color separado; en el resto de navegadores, cristal saturado con el filo en color
  const liquid = !!window.chrome && CSS.supports('backdrop-filter', 'url(#lg)');
  document.documentElement.classList.toggle('has-liquid', liquid);
  const lgMap = $('lg-map');
  const maps = new Map();
  let cfg = null, lens = '';
  // Mapa de refracción para la forma de la lente (se guarda para no recalcularlo)
  const setLens = (w, h, r, glass) => {
    const key = `${w}x${h}x${r}`;
    if (!liquid || key === lens) return;
    lens = key;
    if (!maps.has(key)) maps.set(key, glassMap(w, h, r));
    lgMap.setAttribute('href', maps.get(key));
    lgMap.setAttribute('width', w); lgMap.setAttribute('height', h);
    document.querySelectorAll('#lg feDisplacementMap').forEach((d, k) => d.setAttribute('scale', (glass * [1, .86, .72][k]).toFixed(1)));
  };
  onCursorChange(c => { cfg = c; setLens(c.w, c.h, c.r, c.glass); });

  let tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty, s = 0, k = 1, cw = 56, ch = 56, cr = 28;
  let ui = null, media = null, text = false, lastUi = null;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  document.addEventListener('pointerover', e => {
    const t = e.target;
    const zone = t.closest?.('[data-gesture]');
    // Dentro de una zona de arrastre, las piezas sin data-cursor-ui son parte del gesto
    let u = t.closest?.('a,button,[data-cursor-ui]') || null;
    if (u && zone && zone.contains(u) && !u.hasAttribute('data-cursor-ui')) u = null;
    ui = u;
    media = !ui ? t.closest?.('img,video,canvas,figure,.ar__s,.tn__i') || null : null;
    text = !ui && !media && !!t.closest?.('p,h1,h2,h3,h4,li,blockquote,dd');
    const g = ui ? '' : zone ? zone.dataset.gesture : GESTURE[document.body.dataset.route] || '';
    cursor.dataset.g = g;
    cWord.textContent = WORD[g] || '';
    document.body.classList.toggle('cursor-ui', !!ui);
    if (ui && ui !== lastUi) sound.tick();
    lastUi = ui;
  });
  addEventListener('pointerdown', () => document.body.classList.add('cursor-down'));
  addEventListener('pointerup', () => document.body.classList.remove('cursor-down'));
  ticker.add(dt => {
    const m = cfg.id, down = document.body.classList.contains('cursor-down');
    let w = cfg.w, h = cfg.h, r = cfg.r, cx = tx, cy = ty, snap = null, caret = false;
    // Imán: se pega al botón y lo abraza. Enfoque: encuadra la foto o el botón como un AF
    const el = m === 'iman' ? ui : m === 'af' ? ui || media : null;
    if (el) {
      const b = el.getBoundingClientRect();
      if (b.width && b.width < innerWidth * .7 && b.height < innerHeight * .8) {
        const p = m === 'iman' ? 7 : 5, mx = b.left + b.width / 2, my = b.top + b.height / 2;
        w = b.width + p * 2; h = b.height + p * 2; r = m === 'iman' ? Math.min(h / 2, 22) : 4;
        cx = mx + (tx - mx) * (m === 'iman' ? .12 : 0); cy = my + (ty - my) * (m === 'iman' ? .12 : 0);
        snap = m;
      }
    }
    // Lupa: grande sobre las fotos, una línea sobre el texto, un punto sobre los botones
    if (m === 'lupa') {
      if (media) { w = h = 132; r = 66; }
      else if (ui) { w = h = 16; r = 8; }
      else if (text) { w = 3; h = 26; r = 2; caret = true; }
    }
    if (m === 'cruz' && ui) { w = h = 38; r = 19; }
    if (!snap) setLens(w, h, Math.min(r, w / 2, h / 2), cfg.glass);
    const f = snap ? 16 : 20;
    x = damp(x, cx, f, dt); y = damp(y, cy, f, dt);
    cw = damp(cw, w, 16, dt); ch = damp(ch, h, 16, dt); cr = damp(cr, r, 16, dt);
    const sp = Math.hypot(tx - x, ty - y);
    s = damp(s, Math.min(sp / 90, 1), 10, dt);
    k = damp(k, down ? .86 : 1, 14, dt);
    cursor.classList.toggle('is-snap', !!snap);
    cursor.classList.toggle('is-caret', caret);
    cursor.style.setProperty('--cw', `${cw.toFixed(1)}px`);
    cursor.style.setProperty('--ch', `${ch.toFixed(1)}px`);
    cursor.style.setProperty('--cr', `${cr.toFixed(1)}px`);
    cursor.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) scale(${k.toFixed(3)})`;
    cursor.style.setProperty('--ca', `${(1.5 + s * 7).toFixed(1)}px`);
  });
}
document.addEventListener('click', e => { if (e.target.closest?.('a,button')) sound.click(); }, true);

// ---------- Router (hash: funciona en cualquier hosting estático) ----------
function parse() {
  const [a, b] = location.hash.replace(/^#\/?/, '').split('/');
  if (a === 'p' && findProject(b)) return { name: 'project', id: b, key: `p/${b}`, title: findProject(b).title, label: findProject(b).title };
  const i = WORLDS.findIndex(w => w.id === a);
  if (i >= 0) return { name: a, key: a, title: WORLDS[i].label, label: `0${i + 1} ${WORLDS[i].label}` };
  return { name: 'home', key: '', title: '', label: 'disasterdiego' };
}

const MOUNT = { home: mountHome, advertising: mountAdvertising, design: mountDesign, content: mountContent, about: mountAbout, project: mountProject };
let destroy = null, currentKey = null, busy = false, queued = false;

function swap(route) {
  destroy?.();
  destroy = null;
  fxHide();
  setCursorLabel('');
  setBarSlot('');
  view.innerHTML = '';
  view.className = `view view--${route.name}`;
  view.scrollTop = 0;
  document.body.dataset.route = route.name;
  hudL.textContent = lensFor(route);
  document.title = route.title ? `${route.title} — disasterdiego` : 'disasterdiego — art direction, design, content';
  const active = route.name === 'project' ? 'advertising' : route.name;
  document.querySelectorAll('[data-world]').forEach(n => n.classList.toggle('is-active', n.dataset.world === active));
  destroy = MOUNT[route.name](view, route);
  currentKey = route.key;
}

const wait = ms => new Promise(r => setTimeout(r, reduced ? 20 : ms));

// Hora y lente: cada sección y cada proyecto tiene su propia óptica
const hudT = $('hud-t'), hudL = $('hud-l');
const LENSES = { home: '50MM · F/1.4', advertising: '35MM · F/2.0', design: '100MM MACRO · F/4', content: '24MM · F/2.8 · 9:16', about: '85MM · F/1.2' };
const lensFor = route => {
  if (route.name !== 'project') return LENSES[route.name];
  let h = 0;
  for (const c of route.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `${[24, 28, 35, 50, 85, 105][h % 6]}MM · F/${['1.4', '2.0', '2.8', '4'][(h >> 3) % 4]}`;
};
const hud = $('hud'), hudC = $('hud-c');
const showCursor = () => { hudC.textContent = `Cursor ${cursorIndex() + 1}/${CURSORS.length} · ${cursorMode().name}`; };
showCursor();
hud.addEventListener('click', () => {
  nextCursor();
  showCursor();
  hud.classList.remove('is-flash'); void hud.offsetWidth; hud.classList.add('is-flash');
  sound.shutter();
});
const clock = () => { hudT.textContent = `MAD ${new Date().toLocaleTimeString('es-ES', { hour12: false, timeZone: 'Europe/Madrid' })}`; };
clock();
setInterval(clock, 1000);

// Modo nocturno: fondo negro y colores suaves; las fotos no se tocan.
// Se abre como un círculo de lente desde la pastilla
const nightBtn = $('night');
let nightOn = false;
try { nightOn = localStorage.getItem('dd-night') === '1'; } catch {}
const setNight = on => {
  nightOn = on;
  document.documentElement.classList.toggle('is-night', on);
  nightBtn.setAttribute('aria-pressed', on);
  document.querySelector('meta[name=theme-color]').content = on ? '#111110' : '#eeeeeb';
  try { localStorage.setItem('dd-night', on ? '1' : '0'); } catch {}
};
setNight(nightOn);
export function toggleNight() {
  const b = nightBtn.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
  sound.copier();
  if (!document.startViewTransition || reduced) { setNight(!nightOn); return; }
  const t = document.startViewTransition(() => setNight(!nightOn));
  t.ready.then(() => {
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.documentElement.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 900, easing: 'cubic-bezier(.76,0,.24,1)', pseudoElement: '::view-transition-new(root)' });
  }).catch(() => {});
}
nightBtn.addEventListener('click', toggleNight);
// En móvil el botón vive junto a las redes
const mqNarrow = matchMedia('(max-width: 819px)');
// y las redes dentro del desplegable: abajo solo queda la pastilla centrada
const placeNight = () => {
  if (mqNarrow.matches) { $('socials').append(nightBtn); $('nav-panel').append($('socials')); }
  else { hud.after(nightBtn); $('bar').after($('socials')); }
};
placeNight();
mqNarrow.addEventListener?.('change', placeNight);
addEventListener('keydown', e => {
  if (e.target.closest?.('input,textarea') || e.metaKey || e.ctrlKey) return;
  if (e.key === 'n' || e.key === 'N') toggleNight();
});

// Transición: la lente se cierra desenfocando de fuera hacia dentro y, al abrirse,
// ya estás en la página nueva
const lens = $('lens');
const ease = p => (p < .5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
const iris = (from, to, dur) => new Promise(done => {
  if (reduced) { done(); return; }
  const t0 = performance.now();
  const stop = ticker.add(() => {
    const p = Math.min(1, (performance.now() - t0) / dur), k = ease(p);
    const c = from + (to - from) * k; // 0 abierta, 1 cerrada
    lens.style.setProperty('--ir', `${(1 - c) * 125 - 15}%`);
    lens.style.setProperty('--lb', `${(c * 22).toFixed(1)}px`);
    lens.style.opacity = c > .001 ? 1 : 0;
    if (p >= 1) { stop(); done(); }
  });
});
async function navigate() {
  const route = parse();
  if (route.key === currentKey) return;
  if (busy) { queued = true; return; }
  busy = true;
  sound.shutter();
  await iris(0, 1, 460);
  try { swap(route); } catch (err) { console.error(err); }
  view.classList.add('is-entering');
  setTimeout(() => view.classList.remove('is-entering'), 700);
  await iris(1, 0, 620);
  view.focus({ preventScroll: true });
  busy = false;
  if (queued) { queued = false; navigate(); }
}
addEventListener('hashchange', navigate);

// ---------- Arranque ----------
// Carga: tu identidad pasando por la fotocopiadora mientras llega todo
async function boot() {
  const count = $('loader-count'), loader = $('loader'), shot = $('loader-shot'), dist = $('loader-dist'), ring = $('loader-ring');
  // Anillo de enfoque con su escala de distancias
  const marks = ['∞', '10', '5', '3', '2', '1.5', '1.2', '1', '.8', '.7'];
  ring.insertAdjacentHTML('beforeend', Array.from({ length: 72 }, (_, i) => {
    const big = i % 4 === 0, a = i * 5;
    return `<g transform="rotate(${a} 100 100)"><path d="M100 ${big ? 4 : 6}v${big ? 9 : 5}"/>${big && i / 4 < marks.length ? `<text x="100" y="24" text-anchor="middle">${marks[i / 4]}</text>` : ''}</g>`;
  }).join(''));
  const shots = ['inverted', 'mask', 'disc', 'tribal', 'tunnel', 'detail'].map(n => `assets/id/${n}.webp`);
  let shown = 0, target = 20, si = 0;
  const flip = setInterval(() => { shot.src = shots[++si % shots.length]; }, 520);
  const stopCount = ticker.add(dt => {
    shown = lerp(shown, target, 1 - Math.exp(-3 * dt));
    const p = shown / 100;
    count.textContent = String(Math.round(shown)).padStart(3, '0');
    dist.textContent = marks[Math.min(marks.length - 1, Math.floor(p * marks.length))];
    loader.style.setProperty('--p', p.toFixed(3));
  });
  const fonts = document.fonts.load("400 20px 'Syne Mono'").catch(() => {});
  setTimeout(() => { target = 55; }, 700);
  await Promise.race([fonts, new Promise(r => setTimeout(r, 1500))]);
  await wait(1500);
  target = 100;
  await wait(1100);
  clearInterval(flip);
  shot.src = shots[0];
  swap(parse());
  initFx($('fx'));
  document.body.classList.remove('is-loading');
  // La lente se abre desde el centro hasta ocupar la pantalla
  const t0 = performance.now(), dur = reduced ? 10 : 1100;
  const R1 = Math.hypot(innerWidth, innerHeight) / 2 + 40;
  await new Promise(done => {
    const stop = ticker.add(() => {
      const p = Math.min(1, (performance.now() - t0) / dur), k = ease(p);
      loader.style.setProperty('--hole', `${(k * R1).toFixed(1)}px`);
      loader.style.setProperty('--open', k.toFixed(3));
      if (p >= 1) { stop(); done(); }
    });
  });
  stopCount();
  loader.remove();
}
boot();
