import { SOCIALS, WORLDS, PROJECTS, DESIGN, CONTENT, findProject } from './data.js';
import { ticker, lerp, damp, finePointer, reduced, opt, esc } from './lib.js';
import { initFx, fxHide } from './fx.js';
import { createPaper } from './paper.js';
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
const paper = createPaper($('paper'), $('paper-label'));
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
  ['VT323', ''], ['Syne Mono', '.9'], ['Big Shoulders Display', '.86'], ['Pirata One', '.92'], ['Major Mono Display', '.72'],
];
const typeBtn = document.createElement('button');
typeBtn.type = 'button';
typeBtn.className = 'panel__type';
typeBtn.setAttribute('data-cursor-ui', '');
panel.append(typeBtn);
let fontI = 0;
try { fontI = Math.max(0, FONTS.findIndex(f => f[0] === localStorage.getItem('dd-font'))); } catch {}
const applyFont = () => {
  const [name, scale] = FONTS[fontI];
  document.documentElement.style.setProperty('--pixel', `'${name}', 'Space Mono', monospace`);
  document.documentElement.style.setProperty('--ds', scale || 1);
  typeBtn.innerHTML = `<span>Tipografía ${fontI + 1}/${FONTS.length}</span><b style="font-family:'${name}'">${name}</b>`;
  try { localStorage.setItem('dd-font', name); } catch {}
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
  // Lupa: el punto sigue al cursor y los anillos rojo y cian se separan al moverte
  const rr = $('cring-r'), rb = $('cring-b');
  let tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty, rx = tx, ry = ty, bx = tx, by = ty;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  ticker.add(dt => {
    x = damp(x, tx, 34, dt); y = damp(y, ty, 34, dt);
    rx = damp(rx, tx, 17, dt); ry = damp(ry, ty, 17, dt);
    bx = damp(bx, tx, 11, dt); by = damp(by, ty, 11, dt);
    cursor.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
    rr.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
    rb.style.transform = `translate3d(${bx}px,${by}px,0) translate(-50%,-50%)`;
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

async function navigate() {
  const route = parse();
  if (route.key === currentKey) return;
  if (busy) { queued = true; return; }
  busy = true;
  sound.swish();
  view.classList.add('is-leaving');
  await paper.play({
    src: route.name === 'project' ? opt(findProject(route.id).cover, 1400) : null,
    label: route.name === 'project' ? `${findProject(route.id).title} — ${findProject(route.id).cat}` : '',
    swap: () => { swap(route); view.classList.remove('is-leaving'); },
  });
  view.focus({ preventScroll: true });
  busy = false;
  if (queued) { queued = false; navigate(); }
}
addEventListener('hashchange', navigate);

// ---------- Arranque ----------
async function boot() {
  const count = $('loader-count');
  let shown = 0, target = 40;
  const stopCount = ticker.add(dt => {
    shown = lerp(shown, target, 1 - Math.exp(-5 * dt));
    count.textContent = String(Math.round(shown)).padStart(3, '0');
  });
  const fonts = Promise.all([
    document.fonts.load('400 20px "Space Mono"'),
    document.fonts.load('40px "VT323"'),
  ]).catch(() => {});
  await Promise.race([fonts, new Promise(r => setTimeout(r, 1500))]);
  target = 100;
  await wait(500);
  swap(parse());
  stopCount();
  initFx($('fx'));
  $('loader').classList.add('is-out');
  document.body.classList.remove('is-loading');
  setTimeout(() => $('loader').remove(), 900);
}
boot();
