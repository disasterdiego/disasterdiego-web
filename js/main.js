import { SOCIALS, WORLDS, PROJECTS, DESIGN, CONTENT, findProject } from './data.js';
import { ticker, lerp, damp, finePointer, reduced, opt, esc } from './lib.js';
import { initFx, fxHide } from './fx.js';
import { initScan } from './scan.js';
import { sound } from './sound.js';
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
  document.title = route.title ? `${route.title} — disasterdiego` : 'disasterdiego — art direction, design, content';
  const active = route.name === 'project' ? 'advertising' : route.name;
  document.querySelectorAll('[data-world]').forEach(n => n.classList.toggle('is-active', n.dataset.world === active));
  destroy = MOUNT[route.name](view, route);
  currentKey = route.key;
}

const wait = ms => new Promise(r => setTimeout(r, reduced ? 20 : ms));

// Transición directa: la página se va por el borde de la lente (desenfoque y color
// separado) y la nueva entra enfocando. Sin pantallas intermedias.
const lens = $('lens');
async function navigate() {
  const route = parse();
  if (route.key === currentKey) return;
  if (busy) { queued = true; return; }
  busy = true;
  sound.swish();
  view.classList.add('is-leaving');
  lens.classList.remove('is-on');
  void lens.offsetWidth;
  lens.classList.add('is-on');
  await wait(200);
  try { swap(route); } catch (err) { console.error(err); }
  view.classList.remove('is-leaving');
  view.classList.add('is-entering');
  setTimeout(() => view.classList.remove('is-entering'), 650);
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
