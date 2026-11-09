// CONTENT: reels vistos a través de un visor de cámara. Un vídeo a la vez, se pasa hacia
// abajo; el anterior y el siguiente asoman desenfocados y con el color separado.
// A la derecha, un anillo de enfoque vertical con todos los clips (como el Recorrido del About).
// Al lado, la barra social: me gusta y comentarios.
// OJO: likes y comentarios se guardan solo en el navegador de quien los deja.
// Para que los vea todo el mundo hace falta un servicio externo (ver README de la propuesta).
import { CONTENT } from '../data.js';
import { setCursorLabel } from '../main.js';
import { createIndex } from '../index-list.js';
import { openLightbox, closeLightbox } from '../lightbox.js';
import { ticker, damp, wrap, mod, clamp, opt, esc, isNarrow, bindDrag, reduced } from '../lib.js';

const isVideo = u => u.endsWith('.mp4') || u.includes('/video/upload/');
const ratioOf = r => { const [a, b] = r.split('/').map(Number); return a / b; };
const pad = n => String(n).padStart(2, '0');

const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5 4.6 13.4A4.6 4.6 0 0 1 12 6.9a4.6 4.6 0 0 1 7.4 6.5z"/></svg>';
const BUBBLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>';
const SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/></svg>';

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const key = (i, what) => `dd-${what}-${CONTENT[i].src.slice(-24)}`;

export function mountContent(root) {
  const n = CONTENT.length;
  root.innerHTML = `
    <div class="reels" id="reels">
      <div class="reels__stage" id="stage">
        ${CONTENT.map((c, i) => `<figure class="vclip reel" style="--ar:${ratioOf(c.ratio)}">${isVideo(c.src)
          ? `<video data-src="${c.src}" crossorigin="anonymous" muted loop playsinline preload="none"></video>`
          : `<img src="${opt(c.src, 1000)}" alt="" loading="lazy" draggable="false">`}
          <figcaption><b>${pad(i + 1)}</b> ${esc(c.title)}</figcaption><i class="reel__bar"></i></figure>`).join('')}
      </div>
      <div class="rail" id="rail">
        <button type="button" class="rail__b" id="r-like" data-cursor-ui aria-pressed="false">${HEART}<span id="r-likes">0</span></button>
        <button type="button" class="rail__b" id="r-com" data-cursor-ui>${BUBBLE}<span id="r-coms">0</span></button>
        <button type="button" class="rail__b" id="r-snd" data-cursor-ui>${SOUND}<span>Off</span></button>
        <span class="rail__n" id="r-n"></span>
      </div>
    </div>
    <aside class="cdial" id="cdial" aria-hidden="true" data-cursor-ui>
      <div class="cdial__scale"></div>
      ${CONTENT.map((c, i) => `<div class="cdial__i"><span>${pad(i + 1)}</span><b>${esc(c.title)}</b><em>${c.ratio.replace('/', ':')} · ${ratioOf(c.ratio) < 1 ? 'Vertical' : 'Horizontal'}</em></div>`).join('')}
      <i class="cdial__mark"></i>
      <p class="cdial__hint">Scroll ↕</p>
    </aside>
    <section class="comments" id="comments" aria-label="Comentarios" inert>
      <header><b>Comentarios</b><button type="button" id="c-x" data-cursor-ui>Cerrar</button></header>
      <ul id="c-list"></ul>
      <form id="c-form"><input name="name" maxlength="30" placeholder="Nombre (opcional)" autocomplete="off"><textarea name="text" maxlength="280" rows="2" placeholder="Escribe un comentario" required></textarea><button type="submit" data-cursor-ui>Publicar</button></form>
    </section>`;

  const clips = [...root.querySelectorAll('.reel')].map((el, i) => ({ el, i, v: el.querySelector('video'), bar: el.querySelector('.reel__bar') }));
  const dialItems = [...root.querySelectorAll('.cdial__i')], scale = root.querySelector('.cdial__scale');
  root.querySelector('#cdial').addEventListener('click', e => { const it = e.target.closest('.cdial__i'); if (it) go(dialItems.indexOf(it)); });
  const stage = root.querySelector('#stage');
  const $ = id => root.querySelector(id);
  const comments = $('#comments');
  let muted = true, cur = -1, p = 0, tp = 0, snapT = 0, dir = 1;

  const go = i => { tp += wrap(i - mod(tp, n), n); };
  const index = createIndex(root, CONTENT, { onEnter: go, onPick: go });

  // Cada clip ocupa todo el alto disponible; los horizontales caben por ancho
  const fit = () => {
    const b = stage.getBoundingClientRect();
    clips.forEach((c, i) => {
      const r = ratioOf(CONTENT[i].ratio);
      const w = Math.min(b.width * .96, b.height * .86 * r);
      c.el.style.width = `${w}px`;
      c.el.style.height = `${w / r}px`;
    });
  };
  fit();
  addEventListener('resize', fit, { passive: true });

  const renderSocial = () => {
    const liked = store.get(key(cur, 'like'), false);
    $('#r-like').classList.toggle('is-on', liked);
    $('#r-like').setAttribute('aria-pressed', liked);
    $('#r-likes').textContent = liked ? 1 : 0;
    const list = store.get(key(cur, 'com'), []);
    $('#r-coms').textContent = list.length;
    $('#c-list').innerHTML = list.length
      ? list.map(c => `<li><b>${esc(c.name || 'Anónimo')}</b><p>${esc(c.text)}</p></li>`).join('')
      : '<li class="is-empty">Sé el primero en comentar.</li>';
  };

  const setCurrent = i => {
    cur = i;
    const c = CONTENT[i];
    $('#r-n').textContent = `${pad(i + 1)}/${pad(n)}`;
    index.setActive(i);
    $('#r-snd').style.visibility = clips[i].v ? '' : 'hidden';
    renderSocial();
    clips.forEach((k, j) => {
      if (!k.v) return;
      if (j === i) {
        if (k.v.dataset.src) { k.v.src = k.v.dataset.src; delete k.v.dataset.src; }
        k.v.muted = muted;
        k.v.play().catch(() => {});
      } else if (!k.v.paused) k.v.pause();
    });
  };

  const toggleSound = () => {
    muted = !muted;
    const v = clips[cur]?.v;
    if (v) { v.muted = muted; v.play().catch(() => {}); }
    $('#r-snd').querySelector('span').textContent = muted ? 'Off' : 'On';
    $('#r-snd').classList.toggle('is-on', !muted);
  };
  const setComments = on => {
    comments.classList.toggle('is-open', on);
    comments.inert = !on;
    if (on) setTimeout(() => comments.querySelector('textarea').focus({ preventScroll: true }), 300);
  };
  const onRail = e => {
    const b = e.target.closest('.rail__b');
    if (!b) return;
    if (b.id === 'r-like') { store.set(key(cur, 'like'), !store.get(key(cur, 'like'), false)); renderSocial(); b.classList.add('is-pop'); setTimeout(() => b.classList.remove('is-pop'), 400); }
    if (b.id === 'r-com') setComments(!comments.classList.contains('is-open'));
    if (b.id === 'r-snd') toggleSound();
  };
  $('#rail').addEventListener('click', onRail);
  $('#c-x').addEventListener('click', () => setComments(false));
  $('#c-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const text = String(f.get('text') || '').trim();
    if (!text) return;
    const list = store.get(key(cur, 'com'), []);
    list.push({ name: String(f.get('name') || '').trim(), text });
    store.set(key(cur, 'com'), list);
    e.target.reset();
    renderSocial();
  });

  // Clic en el vídeo: se abre en grande, con sonido; al final, el siguiente clip
  const openClip = i => {
    const c = CONTENT[i], j = (i + 1) % n;
    if (clips[i]?.v) clips[i].v.pause();
    openLightbox({
      n: pad(i + 1), title: c.title, items: [c.src], sound: true, from: i === cur ? clips[i].el : null,
      next: { label: `${pad(j + 1)} ${CONTENT[j].title}`, open: () => { go(j); openClip(j); } },
    });
  };
  const snap = () => { tp = dir > 0 ? Math.ceil(tp - .12) : Math.floor(tp + .12); };
  const offDrag = bindDrag(stage, {
    onMove: (dx, dy) => { tp -= dy * .004; if (dy) dir = -Math.sign(dy); },
    onEnd: snap,
    onTap: () => openClip(cur),
  });
  stage.addEventListener('dragstart', e => e.preventDefault());
  const onWheel = e => {
    if (e.target.closest('.comments')) return;
    e.preventDefault();
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    tp += d * .0026;
    if (d) dir = Math.sign(d);
    snapT = .2;
  };
  root.addEventListener('wheel', onWheel, { passive: false });
  const onKey = e => {
    if (e.target.closest?.('input,textarea')) return;
    if (e.key === 'ArrowDown') { dir = 1; tp = Math.round(tp) + 1; }
    if (e.key === 'ArrowUp') { dir = -1; tp = Math.round(tp) - 1; }
  };
  addEventListener('keydown', onKey);
  const onHover = e => { if (e.pointerType === 'mouse') setCursorLabel('Ampliar ↗'); };
  stage.addEventListener('pointermove', onHover, { passive: true });
  stage.addEventListener('pointerleave', () => setCursorLabel(''));

  const stop = ticker.add(dt => {
    if (snapT > 0) { snapT -= dt; if (snapT <= 0) snap(); }
    p = damp(p, tp, 6.5, dt);
    if (Math.abs(tp - p) < .0005) p = tp;
    const a = mod(Math.round(p), n);
    if (a !== cur) setCurrent(a);

    // El siguiente sube desde abajo; el que se va se aleja y pierde foco por el borde
    dialItems.forEach((el, i) => {
      const d = wrap(i - p, n), ad = Math.abs(d);
      el.style.transform = `translateY(calc(-50% + ${(d * 64).toFixed(1)}px))`;
      el.style.setProperty('--d', Math.min(ad, 3).toFixed(3));
    });
    scale.style.transform = `translateY(${(-p * 64) % 16}px)`;
    for (const c of clips) {
      const d = wrap(c.i - p, n), ad = Math.abs(d), show = ad < 1.6;
      c.el.style.visibility = show ? '' : 'hidden';
      c.el.style.pointerEvents = ad < .5 ? 'auto' : 'none';
      if (!show) continue;
      const k = reduced ? 0 : 1;
      // Los vecinos asoman arriba y abajo, más pequeños, desenfocados y con el color separado
      c.el.style.transform = `translate(-50%,-50%) translate3d(0,${d * 102}%,0) scale(${1 - Math.min(ad, 1) * .3 * k})`;
      c.el.style.opacity = clamp(1.35 - ad * .75, 0, 1);
      const blur = Math.round(Math.min(ad, 1) * 7 * k);
      if (blur !== c.blur) { c.blur = blur; c.el.style.filter = blur ? `blur(${blur}px)` : 'none'; }
      const o = (Math.min(ad, 1) * 14 * k).toFixed(1);
      c.el.style.boxShadow = ad > .02 ? `-${o}px 0 0 rgb(0 110 255 / .5), ${o}px 0 0 rgb(255 40 40 / .5), 0 ${(o * .5).toFixed(1)}px 0 rgb(0 190 90 / .4), 0 -${(o * .5).toFixed(1)}px 0 rgb(255 205 0 / .4)` : 'none';
      c.el.style.zIndex = ad < .5 ? 2 : 1;
    }
    const v = clips[cur]?.v;
    const prog = v && v.duration ? v.currentTime / v.duration : 0;
    if (clips[cur]) clips[cur].bar.style.transform = `scaleX(${prog})`;
  });

  return () => {
    stop();
    offDrag();
    closeLightbox();
    root.removeEventListener('wheel', onWheel);
    setCursorLabel('');
    clips.forEach(c => { if (c.v) { c.v.pause(); c.v.removeAttribute('src'); c.v.load(); } });
    removeEventListener('resize', fit);
    removeEventListener('keydown', onKey);
  };
}
