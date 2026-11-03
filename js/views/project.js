// PROYECTO: página editorial con carga diferida de todo el vídeo.
import { findProject, PROJECTS } from '../data.js';
import { EMBEDS } from '../embeds.js';
import { opt, esc, ticker, clamp } from '../lib.js';
import { setBarSlot } from '../main.js';
import { createScrollMap } from '../scrollmap.js';

const ytId = u => u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1];
const SOUND_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13 3 3-3 1.4 1.4-3 3 3 3L19 17.8l-3-3-3 3-1.4-1.4 3-3-3-3L13 9l3 3z"/></svg>';
const SOUND_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.8-1-3.3-2.5-4v8c1.500-.7 2.500-2.200 2.500-4zM14 3.200v2.100c2.900.9 5 3.500 5 6.700s-2.100 5.800-5 6.700v2.100c4-.9 7-4.500 7-8.800s-3-7.900-7-8.800z"/></svg>';

function mediaHTML(m, ratio) {
  const url = m.url;
  const r = m.ratio || ratio;
  const style = `${r ? `aspect-ratio:${r};` : ''}${m.width ? `--w:${m.width};` : ''}`;
  const cls = `m${m.width ? ' m--narrow' : ''}`;
  const badge = m.label ? `<span class="m__badge">${esc(m.label)}</span>` : '';
  let inner;
  if (url.startsWith('EMBED:')) {
    inner = `<iframe data-srcdoc="${url.slice(6)}" title="${esc(m.label || 'Interactivo')}" loading="lazy"></iframe>`;
  } else if (/youtu\.?be/.test(url)) {
    const id = ytId(url);
    if (m.loop) {
      inner = `<div class="m__yt" data-yt="${id}" data-start="${m.loop[0]}" data-end="${m.loop[1]}"></div><img class="m__poster" src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy">`;
    } else {
      inner = `<button class="m__play" type="button" data-play="${id}" data-cursor-ui aria-label="Reproducir vídeo"><img src="https://i.ytimg.com/vi/${id}/maxresdefault.jpg" alt="" loading="lazy"><span>Play</span></button>`;
    }
  } else if (url.endsWith('.mp4') || url.includes('/video/upload/')) {
    const cors = url.includes('res.cloudinary.com') ? ' crossorigin="anonymous"' : '';
    inner = `<video data-src="${url}"${cors} muted loop playsinline preload="none"></video>${m.sound ? `<button class="m__sound" type="button" data-cursor-ui>${SOUND_OFF}<span>Sound off</span></button>` : ''}`;
  } else {
    inner = `<img src="${opt(url, m.width ? 900 : 1800)}" alt="${esc(m.label || '')}" loading="lazy" decoding="async" onerror="this.closest('.m').classList.add('is-broken')">`;
  }
  return `<figure class="${cls}" style="${style}" data-reveal>${badge}${inner}</figure>`;
}

function blockHTML(b) {
  switch (b.k) {
    case 'media': return mediaHTML(b);
    case 'grid': return `<div class="g" style="--cols:${b.cols}">${b.items.map(i => mediaHTML(i, b.ratio)).join('')}</div>`;
    case 'heading': return `<h2 class="p__h display" data-reveal>${esc(b.text)}</h2>`;
    case 'text': return `<div class="p__cols" data-reveal><p>${esc(b.a)}</p><p>${esc(b.b)}</p></div>`;
    case 'print': return `<div class="print print--${b.side}">${mediaHTML(b.media)}<div class="print__t" data-reveal><h3 class="display">${esc(b.title)}</h3><p>${esc(b.body)}</p></div></div>`;
    default: return '';
  }
}

export function mountProject(root, route) {
  const p = findProject(route.id);
  const siblings = PROJECTS[p.world];
  const next = siblings[(siblings.indexOf(p) + 1) % siblings.length];

  root.innerHTML = `
    <article class="p">
      <header class="p__head">
        <p class="p__eyebrow"><span>${esc(p.cat)}</span><span>${esc(p.date)}</span></p>
        <div class="p__intro">
          <h1 class="p__title display">${p.headerTitle || esc(p.title)}</h1>
          <p>${esc(p.desc1)}</p>
          <p>${esc(p.desc2 || '')}</p>
          <div class="p__logo">${p.logo ? `<img src="${p.logo}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>
        </div>
      </header>
      ${mediaHTML(p.hero)}
      ${p.info1 ? `
      <div class="p__info" data-reveal>
        <p>${esc(p.info1)}</p>
        <p>${esc(p.info2)}</p>
        <dl>
          <div><dt>Role</dt><dd>${esc(p.role)}</dd></div>
          <div><dt>Date</dt><dd>${esc(p.date)}</dd></div>
          <div><dt>Client</dt><dd>${esc(p.client)}</dd></div>
        </dl>
      </div>` : ''}
      ${p.blocks.map(blockHTML).join('')}
      ${p.foot1 ? `<div class="p__cols p__foot" data-reveal><p>${esc(p.foot1)}</p><p>${esc(p.foot2)}</p></div>` : ''}
    </article>
    <a class="next" id="next" href="#/p/${next.id}" data-cursor-ui>
      <div class="next__in">
        <span class="next__k">Next project — keep scrolling</span>
        <span class="next__t display" style="--len:${Math.max(...next.title.split(' ').map(w => w.length))}">${esc(next.title)}</span>
        <span class="next__bar"><i id="next-bar"></i></span>
      </div>
    </a>`;

  const timers = [];
  const players = [];

  // Entrada de medios y arranque perezoso
  const io = new IntersectionObserver(es => es.forEach(e => {
    const el = e.target;
    if (e.isIntersecting) {
      el.classList.add('is-in');
      const v = el.querySelector('video');
      if (v) {
        if (v.dataset.src) { v.src = v.dataset.src; delete v.dataset.src; }
        v.play().catch(() => {});
      }
      const f = el.querySelector('iframe[data-srcdoc]');
      if (f) { f.srcdoc = EMBEDS[f.dataset.srcdoc]; delete f.dataset.srcdoc; }
      const y = el.querySelector('[data-yt]');
      if (y) startLoop(y, players, timers);
    } else {
      const v = el.querySelector('video');
      if (v && !v.paused) v.pause();
    }
  }), { root, threshold: .08, rootMargin: '0px 0px -4% 0px' });
  root.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

  const onClick = e => {
    const s = e.target.closest('.m__sound');
    if (s) {
      const v = s.parentElement.querySelector('video');
      v.muted = !v.muted;
      s.innerHTML = v.muted ? `${SOUND_OFF}<span>Sound off</span>` : `${SOUND_ON}<span>Sound on</span>`;
      v.play().catch(() => {});
      return;
    }
    const b = e.target.closest('[data-play]');
    if (b) {
      const id = b.dataset.play;
      b.outerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    }
  };
  root.addEventListener('click', onClick);

  // Progreso y salto al siguiente proyecto
  setBarSlot(`<a class="bar__back" href="#/${p.world}" data-cursor-ui>× Close</a>`);
  const map = createScrollMap(root, [...root.querySelectorAll('.p > *:not(.p__head), .next')]);
  const nextEl = root.querySelector('#next');
  const nextBar = root.querySelector('#next-bar');
  let held = 0, armed = false, gone = false;
  const stop = ticker.add(() => {
    const max = root.scrollHeight - root.clientHeight;
    const y = root.scrollTop;
    map.update();
    const start = nextEl.offsetTop - root.clientHeight;
    const q = clamp((y - start) / (nextEl.offsetHeight - root.clientHeight * .0 - 1), 0, 1);
    const pull = clamp((y - start) / Math.max(1, max - start), 0, 1);
    nextBar.style.transform = `scaleX(${pull})`;
    nextEl.classList.toggle('is-near', q > .02);
    if (pull > .3) armed = true;
    if (armed && pull > .985 && !gone) {
      held ||= performance.now();
      if (performance.now() - held > 350) { gone = true; location.hash = nextEl.getAttribute('href'); }
    } else held = 0;
  });

  return () => {
    stop();
    map.destroy();
    io.disconnect();
    timers.forEach(clearInterval);
    players.forEach(pl => { try { pl.destroy(); } catch {} });
    root.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
    root.removeEventListener('click', onClick);
  };
}

// YouTube: la API se carga una sola vez y únicamente si hay un bucle visible
let ytReady;
function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise(res => {
    window.onYouTubeIframeAPIReady = () => res(window.YT);
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.append(s);
  });
  return ytReady;
}

function startLoop(el, players, timers) {
  if (el.dataset.on) return;
  el.dataset.on = '1';
  const start = +el.dataset.start, end = +el.dataset.end;
  loadYT().then(YT => {
    if (!el.isConnected) return;
    const pl = new YT.Player(el, {
      videoId: el.dataset.yt,
      host: 'https://www.youtube-nocookie.com',
      playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, start, iv_load_policy: 3 },
      events: {
        onReady: e => {
          e.target.mute();
          e.target.seekTo(start, true);
          e.target.playVideo();
        },
        onStateChange: e => {
          if (e.data === 1) pl.getIframe()?.parentElement?.classList.add('is-playing');
          if (e.data === 0) { e.target.seekTo(start, true); e.target.playVideo(); }
        },
      },
    });
    players.push(pl);
    timers.push(setInterval(() => {
      if (pl.getCurrentTime && pl.getCurrentTime() >= end) pl.seekTo(start, true);
    }, 200));
  });
}
