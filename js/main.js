import { SOCIALS, WORLDS, PROJECTS, DESIGN, CONTENT, findProject } from './data.js';
import { ticker, lerp, damp, finePointer, reduced, opt, esc } from './lib.js';
import { initFx, fxHide } from './fx.js';
import { initScan } from './scan.js';
import { sound } from './sound.js';
import { cursorMode, nextCursor } from './cursor-mode.js';
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
const THUMBS = {
  advertising: PROJECTS.advertising[0].cover,
  design: PROJECTS.advertising[1].cover,
  content: PROJECTS.advertising[2].cover,
  about: PROJECTS.advertising[3].cover,
};

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

// ---------- Menú desplegable ----------
const panel = $('panel');
const roll = t => `<span class="roll" data-text="${esc(t)}"><span>${esc(t)}</span></span>`;
panel.innerHTML = WORLDS.map((w, i) => `
  <a class="panel__row" href="#/${w.id}" data-world="${w.id}" style="--i:${i}" data-cursor-ui>
    <span class="panel__n">0${i + 1}</span>
    <span class="panel__thumb"><img src="${opt(THUMBS[w.id], 160)}" alt="" loading="lazy"></span>
    <span class="panel__title display">${roll(w.label)}</span>
    <span class="panel__note">${COUNTS[w.id] ?? ''}</span>
  </a>`).join('');

// Explorador de tipografías (provisional): se elige una y queda guardada
const FONTS = [
  ['Space Mono', .62], ['VT323', 1], ['JetBrains Mono', .64], ['IBM Plex Mono', .64], ['DM Mono', .66],
  ['Martian Mono', .56], ['Syne Mono', .7], ['Fragment Mono', .66], ['Major Mono Display', .56],
];
const typeBtn = document.createElement('button');
typeBtn.type = 'button';
typeBtn.className = 'panel__type';
typeBtn.setAttribute('data-cursor-ui', '');
panel.append(typeBtn);
let fontI = 0;
try { fontI = Math.max(0, FONTS.findIndex(f => f[0] === localStorage.getItem('dd-font2'))); } catch {}
// Una sola familia para todo: títulos, textos y pies de imagen
const applyFont = () => {
  const [name, scale] = FONTS[fontI];
  const fam = `'${name}', 'Space Mono', ui-monospace, monospace`;
  document.documentElement.style.setProperty('--pixel', fam);
  document.documentElement.style.setProperty('--mono', fam);
  document.documentElement.style.setProperty('--ds', scale);
  document.documentElement.dataset.font = name;
  typeBtn.innerHTML = `<span>Tipografía ${fontI + 1}/${FONTS.length}</span><b>${name}</b>`;
  try { localStorage.setItem('dd-font2', name); } catch {}
  dispatchEvent(new Event('fontchange'));
};
typeBtn.addEventListener('click', () => { fontI = (fontI + 1) % FONTS.length; applyFont(); });
applyFont();

// Cuatro maquetas del menú, como el selector de tipografías
const MENUS = [['lista', 'Lista'], ['contactos', 'Hoja de contactos'], ['indice', 'Índice gigante'], ['tira', 'Tira de película']];
const menuBtn = document.createElement('button');
menuBtn.type = 'button';
menuBtn.className = 'panel__type panel__menu';
menuBtn.setAttribute('data-cursor-ui', '');
panel.append(menuBtn);
let menuI = 0;
try { menuI = Math.max(0, MENUS.findIndex(m => m[0] === localStorage.getItem('dd-menu'))); } catch {}
const applyMenu = () => {
  panel.dataset.design = MENUS[menuI][0];
  menuBtn.innerHTML = `<span>Diseño de menú ${menuI + 1}/${MENUS.length}</span><b>${MENUS[menuI][1]}</b>`;
  try { localStorage.setItem('dd-menu', MENUS[menuI][0]); } catch {}
};
menuBtn.addEventListener('click', e => { e.stopPropagation(); menuI = (menuI + 1) % MENUS.length; applyMenu(); });
applyMenu();

const toggle = $('menu-toggle');
const setMenu = open => {
  document.body.classList.toggle('menu-open', open);
  toggle.setAttribute('aria-expanded', open);
  panel.inert = !open;
  $('menu-label').textContent = open ? 'Close' : 'Menu';
};
toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
$('scrim').addEventListener('click', () => setMenu(false));
panel.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

// La barra aloja el control de cada página: así no flota nada encima de los textos
export function setBarSlot(html) {
  const slot = $('bar-slot');
  slot.innerHTML = html || '';
  $('bar').classList.toggle('has-slot', !!html);
  return slot;
}

// ---------- Cursor ----------
const cursor = $('cursor');
export function setCursorLabel(html) {
  cursor.innerHTML = html || '';
  document.body.classList.toggle('cursor-label', !!html);
}
if (finePointer) {
  document.documentElement.classList.add('has-cursor');
  // Lente: un círculo de cristal con el filo separado en rojo, amarillo y azul;
  // al moverte se estira en la dirección del movimiento, como una gota
  let tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty, s = 0, a = 0;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  ticker.add(dt => {
    const px = x, py = y;
    x = damp(x, tx, 20, dt); y = damp(y, ty, 20, dt);
    const vx = (x - px) / Math.max(dt, .001), vy = (y - py) / Math.max(dt, .001);
    const sp = Math.hypot(vx, vy);
    s = damp(s, Math.min(sp / 2600, .55), 10, dt);
    if (sp > 40) a = Math.atan2(vy, vx);
    const label = document.body.classList.contains('cursor-label');
    cursor.style.transform = label
      ? `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`
      : `translate3d(${x}px,${y}px,0) translate(-50%,-50%) rotate(${a}rad) scale(${1 + s},${1 - s * .45})`;
    cursor.style.setProperty('--ca', `${(1.5 + s * 9).toFixed(1)}px`);
  });
  let lastUi = null;
  document.addEventListener('pointerover', e => {
    const ui = e.target.closest?.('a,button,[data-cursor-ui]') || null;
    document.body.classList.toggle('cursor-ui', !!ui);
    if (ui && ui !== lastUi) sound.tick();
    lastUi = ui;
  });
  addEventListener('pointerdown', () => document.body.classList.add('cursor-down'));
  addEventListener('pointerup', () => document.body.classList.remove('cursor-down'));
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
const showCursor = () => { hudC.textContent = cursorMode().name; };
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
  nightBtn.querySelector('b').textContent = on ? 'Noche' : 'Día';
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
  const count = $('loader-count'), loader = $('loader'), shot = $('loader-shot');
  const shots = ['disc', 'mask', 'tribal', 'tunnel', 'inverted', 'detail'].map(n => `assets/id/${n}.webp`);
  let shown = 0, target = 30, si = 0;
  const flip = setInterval(() => { shot.src = shots[si++ % shots.length]; }, 260);
  const stopCount = ticker.add(dt => {
    shown = lerp(shown, target, 1 - Math.exp(-4 * dt));
    count.textContent = String(Math.round(shown)).padStart(3, '0');
    loader.style.setProperty('--p', (shown / 100).toFixed(3));
  });
  const fonts = Promise.all([
    document.fonts.load(`400 20px ${getComputedStyle(document.documentElement).getPropertyValue('--mono')}`),
  ]).catch(() => {});
  setTimeout(() => { target = 70; }, 500);
  await Promise.race([fonts, new Promise(r => setTimeout(r, 1500))]);
  await wait(900);
  target = 100;
  await wait(650);
  swap(parse());
  stopCount();
  clearInterval(flip);
  initFx($('fx'));
  loader.classList.add('is-out');
  document.body.classList.remove('is-loading');
  view.classList.add('is-entering');
  setTimeout(() => { loader.remove(); view.classList.remove('is-entering'); }, 900);
}
boot();
