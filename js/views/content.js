// CONTENT: sala de montaje. Un solo vídeo a la vez en su formato real.
// La línea de tiempo y el índice muestran siempre todo lo que hay.
import { CONTENT } from '../data.js';
import { setCursorLabel } from '../main.js';
import { createIndex } from '../index-list.js';
import { ticker, damp, wrap, mod, clamp, opt, esc, isNarrow, bindDrag, reduced } from '../lib.js';

const isVideo = u => u.endsWith('.mp4') || u.includes('/video/upload/');
const ratioOf = r => { const [a, b] = r.split('/').map(Number); return a / b; };
const pad = n => String(n).padStart(2, '0');
const label = r => r.replace('/', ':');
const poster = u => (isVideo(u) ? u.replace(/\.mp4$/i, '.jpg') : opt(u, 240));

export function mountContent(root) {
  const n = CONTENT.length;
  root.innerHTML = `
    <div class="room" id="room">
      <div class="room__stage" id="stage">
        ${CONTENT.map(c => `<figure class="vclip" style="aspect-ratio:${c.ratio}">${isVideo(c.src)
          ? `<video data-src="${c.src}" crossorigin="anonymous" muted loop playsinline preload="none"></video>`
          : `<img src="${opt(c.src, 1200)}" alt="" loading="lazy" draggable="false">`}</figure>`).join('')}
      </div>
      <div class="timeline" id="timeline" role="group" aria-label="Línea de tiempo">
        ${CONTENT.map((c, i) => `<button class="tl" type="button" style="--g:${ratioOf(c.ratio).toFixed(2)};background-image:url('${poster(c.src)}')" data-i="${i}" aria-label="${esc(c.title)}" data-cursor-ui><i></i><span><b>${pad(i + 1)}</b> ${esc(c.title)}</span></button>`).join('')}
      </div>
    </div>
    <aside class="meta" id="meta" aria-live="polite">
      <span class="meta__n" id="m-n"></span>
      <h2 class="meta__t display" id="m-t"></h2>
      <dl class="meta__dl"><div><dt>Format</dt><dd id="m-f"></dd></div><div><dt>Type</dt><dd id="m-k"></dd></div></dl>
      <button class="meta__btn" type="button" id="m-s" data-cursor-ui>Sound off</button>
    </aside>`;

  const clips = [...root.querySelectorAll('.vclip')].map((el, i) => ({ el, i, v: el.querySelector('video') }));
  const ticks = [...root.querySelectorAll('.tl')];
  const stage = root.querySelector('#stage');
  const $ = id => root.querySelector(id);
  const soundBtn = $('#m-s');
  let muted = true, cur = -1, p = 0, tp = 0, snapT = 0, dir = 1;

  const go = i => { tp += wrap(i - mod(tp, n), n); };
  const index = createIndex(root, CONTENT, { onEnter: go, onPick: go });

  const fit = () => {
    const b = stage.getBoundingClientRect();
    clips.forEach((c, i) => {
      const r = ratioOf(CONTENT[i].ratio);
      const w = Math.min(b.width, b.height * r);
      c.el.style.width = `${w}px`;
    });
  };
  fit();
  addEventListener('resize', fit, { passive: true });

  const setCurrent = i => {
    cur = i;
    const c = CONTENT[i];
    $('#m-n').textContent = `${pad(i + 1)} / ${pad(n)}`;
    $('#m-t').textContent = c.title;
    $('#m-f').textContent = label(c.ratio);
    $('#m-k').textContent = ratioOf(c.ratio) < 1 ? 'Vertical' : 'Horizontal';
    ticks.forEach((t, k) => t.classList.toggle('is-active', k === i));
    if (isNarrow()) ticks[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    index.setActive(i);
    soundBtn.style.visibility = clips[i].v ? '' : 'hidden';
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
    soundBtn.textContent = muted ? 'Sound off' : 'Sound on';
    soundBtn.classList.toggle('is-on', !muted);
    setCursorLabel(clips[cur]?.v ? (muted ? 'Sound on' : 'Sound off') : '');
  };
  soundBtn.addEventListener('click', toggleSound);
  root.querySelector('#timeline').addEventListener('click', e => {
    const b = e.target.closest('.tl');
    if (b) go(+b.dataset.i);
  });

  const snap = () => { tp = dir > 0 ? Math.ceil(tp - .12) : Math.floor(tp + .12); };
  const offDrag = bindDrag(stage, {
    onMove: (dx, dy) => {
      const d = Math.abs(dx) > Math.abs(dy) ? -dx : -dy;
      tp += d * .0034;
      if (d) dir = Math.sign(d);
    },
    onEnd: snap,
    onTap: toggleSound,
  });
  stage.addEventListener('dragstart', e => e.preventDefault());
  const onWheel = e => {
    e.preventDefault();
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    tp += d * .0028;
    if (d) dir = Math.sign(d);
    snapT = .2;
  };
  root.addEventListener('wheel', onWheel, { passive: false });
  const onKey = e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { dir = 1; tp = Math.round(tp) + 1; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { dir = -1; tp = Math.round(tp) - 1; }
  };
  addEventListener('keydown', onKey);
  const onHover = e => { if (e.pointerType === 'mouse') setCursorLabel(clips[cur]?.v ? (muted ? 'Sound on' : 'Sound off') : ''); };
  stage.addEventListener('pointermove', onHover, { passive: true });
  stage.addEventListener('pointerleave', () => setCursorLabel(''));

  const stop = ticker.add(dt => {
    if (snapT > 0) { snapT -= dt; if (snapT <= 0) snap(); }
    p = damp(p, tp, 6, dt);
    if (Math.abs(tp - p) < .0005) p = tp;
    const a = mod(Math.round(p), n);
    if (a !== cur) setCurrent(a);

    // Cambio de plano en 3D: el clip gira, pierde foco y deja paso al siguiente
    for (const c of clips) {
      const d = wrap(c.i - p, n), ad = Math.abs(d), show = ad < .75;
      c.el.style.visibility = show ? '' : 'hidden';
      c.el.style.pointerEvents = ad < .5 ? 'auto' : 'none';
      if (!show) continue;
      const rot = reduced ? 0 : d * -48;
      c.el.style.transform = `translate(-50%,-50%) translate3d(${d * 38}%,0,${-ad * 240}px) rotateY(${rot}deg)`;
      c.el.style.opacity = clamp(1 - ad * 1.7, 0, 1);
      const blur = Math.round(ad * 26);
      if (blur !== c.blur) { c.blur = blur; c.el.style.filter = blur ? `blur(${blur}px)` : 'none'; }
    }

    // Cabezal de reproducción dentro del clip activo
    const v = clips[cur]?.v;
    const prog = v && v.duration ? v.currentTime / v.duration : 0;
    ticks.forEach((t, k) => t.style.setProperty('--p', k === cur ? prog : 0));
  });

  return () => {
    stop();
    offDrag();
    root.removeEventListener('wheel', onWheel);
    setCursorLabel('');
    clips.forEach(c => { if (c.v) { c.v.pause(); c.v.removeAttribute('src'); c.v.load(); } });
    removeEventListener('resize', fit);
    removeEventListener('keydown', onKey);
  };
}
