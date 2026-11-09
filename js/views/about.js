// ABOUT: una sola página que se lee como una lente enfocando. Cada sección es una
// distancia del anillo de enfoque (∞ → 0,7 m): cuanto más bajas, más cerca de mí.
// 01 Enfoque: la bio se lee a través de una lente que amplía las palabras.
// 02 Marcas: cada marca se gira y enseña los proyectos hechos con ella.
// 03 Recorrido: un anillo que se arrastra; lo que queda en el centro está enfocado.
// 04 Premios. 05 Contacto.
import { ABOUT, PROJECTS, SOCIALS } from '../data.js';
import { esc, ticker, damp, clamp, isNarrow, reduced, finePointer, getGL, program, fullscreenQuad, VS_FULL, texture, loadImage } from '../lib.js';

const IMG = 'assets/id/inverted.webp';
const pad = n => String(n).padStart(2, '0');
const SECTIONS = [
  { id: 'enfoque', name: 'Enfoque', dist: '∞' },
  { id: 'marcas', name: 'Marcas', dist: '10 m' },
  { id: 'recorrido', name: 'Recorrido', dist: '3 m' },
  { id: 'premios', name: 'Premios', dist: '1 m' },
  { id: 'contacto', name: 'Contacto', dist: '0,7 m' },
];

const FS = `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uMouse, uFit;
uniform float uAspect, uR, uAmt;
float M(vec2 uv){ return smoothstep(uR, uR*.86, length((uv-uMouse)*vec2(uAspect,1.))); }
void main(){
  vec2 uv = vec2(vUv.x, 1.-vUv.y);
  float m = M(uv);
  vec2 e = vec2(.003);
  vec2 g = vec2(M(uv+vec2(e.x,0.))-M(uv-vec2(e.x,0.)), M(uv+vec2(0.,e.y))-M(uv-vec2(0.,e.y)));
  float rim = clamp(1.-abs(m*2.2-1.1),0.,1.);
  vec2 q = uv - (uv-uMouse)*m*.18*uAmt - g*.05*rim*uAmt;
  vec2 d = g*.06*rim*uAmt + (uv-uMouse)*m*.012*uAmt;
  vec2 f = (q-.5)*uFit+.5, fd = d*uFit;
  vec3 c = vec3(texture2D(uTex,f+fd).r, texture2D(uTex,f+fd*.45).g, texture2D(uTex,f-fd*.7).b);
  c += rim*.05*uAmt + m*.025*uAmt;
  gl_FragColor = vec4(c,1.);
}`;

// Proyectos de cada marca, buscados en el portfolio
const KEYS = { "McDonald's": 'mcdonald', Monopoly: 'monopoly', Doritos: 'doritos', PepsiCo: 'doritos|cheetos', 'Formula 1': 'f1', Cheetos: 'cheetos', Marvel: 'avengers', ARRI: 'arri', Higgsfield: 'higgsfield' };
const workFor = b => {
  const re = new RegExp(KEYS[b] || b.toLowerCase(), 'i');
  return PROJECTS.advertising.filter(p => re.test(`${p.title} ${p.headerTitle || ''} ${p.client || ''} ${p.id}`));
};

const head = (i, extra = '') => `<header class="ap__head"><span class="ap__n">${pad(i + 1)}</span><h2>${SECTIONS[i].name}</h2><span class="ap__d">◎ ${SECTIONS[i].dist}</span>${extra}</header>`;

export function mountAbout(root) {
  const words = ABOUT.bio.split(/\s+/).map((w, i) => `<span class="ap__w" style="--k:${i}">${esc(w)}</span>`).join(' ');
  const brands = ABOUT.brands.map((b, i) => {
    const work = workFor(b);
    const face = ABOUT.logos?.[b] ? `<img src="${ABOUT.logos[b]}" alt="" draggable="false">` : `<b>${esc(b)}</b>`;
    return `<li class="ap__brand" style="--i:${i}">
      <button type="button" data-cursor-ui aria-expanded="false" aria-label="${esc(b)}: ${work.length} proyectos">
        <span class="ap__front">${face}<small>${esc(b)}</small></span>
        <span class="ap__back"><small>${pad(work.length)} ${work.length === 1 ? 'proyecto' : 'proyectos'}</small>${work.length
          ? work.map(p => `<a href="#/p/${p.id}" data-cursor-ui>${esc(p.title)} →</a>`).join('')
          : '<em>Próximamente</em>'}</span>
      </button></li>`;
  }).join('');
  const career = ABOUT.career.map((r, i) => `<li class="ap__stop" data-i="${i}"><span>${esc(r.when)}</span><b>${esc(r.what)}</b><em>${esc(r.where)}</em></li>`).join('');
  const awards = ABOUT.awards.map((r, i) => `<li><span class="ap__an">${pad(i + 1)}</span><b>${esc(r.what)}</b><span>${esc(r.where)}</span><span>${esc(r.when)}</span></li>`).join('');
  const mail = SOCIALS.find(s => s.key === 'mail');
  const nets = SOCIALS.filter(s => s.key !== 'mail').map(s => `<a href="${s.href}" target="_blank" rel="noopener noreferrer" data-cursor-ui>${esc(s.label)} ↗</a>`).join('');

  root.innerHTML = `
    <div class="ap">
      <aside class="ap__ring" id="ap-ring" aria-label="Secciones">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56"/><g id="ap-ticks">${Array.from({ length: 48 }, (_, i) => `<path transform="rotate(${i * 7.5} 60 60)" d="M60 4v${i % 4 ? 4 : 8}"/>`).join('')}</g></svg>
        <span class="ap__dist" id="ap-dist">∞</span>
        <ol>${SECTIONS.map((s, i) => `<li><a href="#a-${s.id}" data-s="${i}" data-cursor-ui><span>${pad(i + 1)}</span>${s.name}</a></li>`).join('')}</ol>
      </aside>

      <section class="ap__s ap__hero" id="a-enfoque" data-s="0">
        ${head(0)}
        <div class="ap__heroin">
          <h1 class="ap__bio" id="ap-bio">${words}</h1>
          <figure class="ap__eye" id="fig"><canvas id="agl" aria-hidden="true"></canvas><img class="ap__flat" src="${IMG}" alt="Diego" hidden><i class="ap__cross" aria-hidden="true"></i></figure>
        </div>
        <div class="ap__row">
          <p class="ap__now"><span>Ahora</span><b>${esc(ABOUT.now.what)}</b><em>${esc(ABOUT.now.where)}</em></p>
          <p class="ap__short">${esc(ABOUT.short)}</p>
          <p class="ap__more">Baja para enfocar ↓</p>
        </div>
      </section>

      <section class="ap__s" id="a-marcas" data-s="1">
        ${head(1, `<p class="ap__tip">${finePointer ? 'Pasa por una marca' : 'Toca una marca'} para ver qué hicimos juntos</p>`)}
        <ul class="ap__brands" id="ap-brands">${brands}</ul>
      </section>

      <section class="ap__s" id="a-recorrido" data-s="2">
        ${head(2, '<p class="ap__tip">Arrastra el anillo ↔</p>')}
        <div class="ap__dial" id="ap-dial">
          <div class="ap__scale" aria-hidden="true"></div>
          <ol class="ap__track" id="ap-track">${career}</ol>
          <i class="ap__mark" aria-hidden="true"></i>
        </div>
      </section>

      <section class="ap__s" id="a-premios" data-s="3">
        ${head(3)}
        <ol class="ap__awards">${awards}</ol>
      </section>

      <section class="ap__s ap__contact" id="a-contacto" data-s="4">
        ${head(4)}
        <a class="ap__mail" href="${mail?.href || '#'}" data-cursor-ui><span>¿Hablamos?</span><small>${esc((mail?.href || '').replace('mailto:', ''))} →</small></a>
        <p class="ap__nets">${nets}</p>
      </section>
    </div>`;

  const $ = s => root.querySelector(s);
  const offs = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); offs.push(() => el.removeEventListener(ev, fn, o)); };

  // ---------- Índice en anillo: gira con el scroll y dice a qué distancia estás ----------
  const secs = [...root.querySelectorAll('.ap__s')], ringLinks = [...root.querySelectorAll('#ap-ring a')];
  const ticks = $('#ap-ticks'), dist = $('#ap-dist');
  let active = -1;
  on(root.querySelector('#ap-ring'), 'click', e => {
    const a = e.target.closest('a[data-s]');
    if (!a) return;
    e.preventDefault();
    secs[+a.dataset.s].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const i = +e.target.dataset.s;
    e.target.classList.add('is-seen');
    if (i === active) return;
    active = i;
    ringLinks.forEach((a, k) => a.classList.toggle('is-on', k === i));
    dist.textContent = SECTIONS[i].dist;
    dist.animate?.([{ filter: 'blur(4px)', opacity: .2 }, { filter: 'none', opacity: 1 }], 420);
  }), { root, rootMargin: '-45% 0px -45% 0px' });
  secs.forEach(s => io.observe(s));

  // ---------- 02 Marcas: se giran ----------
  on($('#ap-brands'), 'click', e => {
    if (e.target.closest('a')) return;
    const b = e.target.closest('.ap__brand button');
    if (!b) return;
    const was = b.getAttribute('aria-expanded') === 'true';
    root.querySelectorAll('.ap__brand button[aria-expanded="true"]').forEach(x => x.setAttribute('aria-expanded', 'false'));
    b.setAttribute('aria-expanded', String(!was));
  });
  if (finePointer) {
    on($('#ap-brands'), 'pointerover', e => {
      const b = e.target.closest('.ap__brand button');
      root.querySelectorAll('.ap__brand button').forEach(x => x.setAttribute('aria-expanded', String(x === b)));
    });
    on($('#ap-brands'), 'pointerleave', () => root.querySelectorAll('.ap__brand button').forEach(x => x.setAttribute('aria-expanded', 'false')));
  }

  // ---------- 03 Recorrido: anillo arrastrable ----------
  const dial = $('#ap-dial'), track = $('#ap-track'), stops = [...track.children];
  let pos = 0, tpos = 0, drag = null;
  const maxPos = () => Math.max(0, stops.length - 1);
  on(dial, 'pointerdown', e => { drag = { x: e.clientX, p: tpos }; dial.setPointerCapture?.(e.pointerId); dial.classList.add('is-drag'); });
  on(dial, 'pointermove', e => { if (drag) tpos = clamp(drag.p - (e.clientX - drag.x) / (stops[0]?.offsetWidth || 240), -.3, maxPos() + .3); });
  const release = () => { if (!drag) return; drag = null; tpos = clamp(Math.round(tpos), 0, maxPos()); dial.classList.remove('is-drag'); };
  on(dial, 'pointerup', release); on(dial, 'pointercancel', release);
  on(dial, 'click', e => { const s = e.target.closest('.ap__stop'); if (s && Math.abs(tpos - Math.round(tpos)) < .05) tpos = +s.dataset.i; });
  on(dial, 'wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); tpos = clamp(tpos + e.deltaX / 300, 0, maxPos()); clearTimeout(dial._t); dial._t = setTimeout(() => { tpos = Math.round(tpos); }, 140); } }, { passive: false });

  // ---------- 01 Enfoque: lente sobre las palabras ----------
  const bio = $('#ap-bio'), wordEls = [...bio.children];
  let wc = [];
  const measure = () => { wc = wordEls.map(w => { const r = w.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); };
  let px = -1e4, py = -1e4, lx = -1e4, ly = -1e4, pointerT = 0;
  on(root, 'pointermove', e => { if (e.pointerType === 'mouse') { px = e.clientX; py = e.clientY; pointerT = 2; } }, { passive: true });
  on(root, 'scroll', () => { measure(); }, { passive: true });
  on(window, 'resize', measure, { passive: true });
  requestAnimationFrame(measure);
  addEventListener('fontchange', measure, { once: true });

  // ---------- Retrato con cristal líquido ----------
  const fig = $('#fig'), canvas = $('#agl');
  const gl = getGL(canvas);
  let drawLens = () => {};
  let glSize = () => {};
  if (!gl) { canvas.remove(); root.querySelector('.ap__flat').hidden = false; }
  else {
    const prog = program(gl, VS_FULL, FS);
    gl.useProgram(prog.p);
    fullscreenQuad(gl, prog);
    const U = prog.u;
    gl.uniform1i(U.uTex, 0);
    let tex = null, ir = 3 / 4;
    loadImage(IMG).then(img => { if (!root.isConnected) return; gl.activeTexture(gl.TEXTURE0); tex = texture(gl, img, { mips: true }); ir = img.naturalWidth / img.naturalHeight; glSize(); }).catch(() => {});
    glSize = () => {
      const W = fig.clientWidth, H = fig.clientHeight, r = Math.min(devicePixelRatio || 1, 2);
      canvas.width = W * r; canvas.height = H * r;
      gl.viewport(0, 0, canvas.width, canvas.height);
      const sr = W / H;
      gl.uniform2f(U.uFit, ...(ir > sr ? [sr / ir, 1] : [1, ir / sr]));
      gl.uniform1f(U.uAspect, sr);
    };
    glSize();
    let x = .5, y = .45;
    drawLens = (tx, ty, dt) => {
      x = damp(x, tx, 8, dt); y = damp(y, ty, 8, dt);
      if (!tex) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform2f(U.uMouse, x, y);
      gl.uniform1f(U.uR, .26);
      gl.uniform1f(U.uAmt, 1.4);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
  }
  on(window, 'resize', () => glSize(), { passive: true });

  let t = 0;
  const stop = ticker.add(dt => {
    t += dt;
    pointerT = Math.max(0, pointerT - dt);
    // Sin ratón (o quieto), la lente recorre la bio sola
    const bb = bio.getBoundingClientRect();
    if (!pointerT && !reduced) {
      px = bb.left + bb.width * (.5 + Math.sin(t * .45) * .45);
      py = bb.top + bb.height * (.5 + Math.sin(t * .9 + 1) * .4);
    }
    lx = damp(lx < -1e3 ? px : lx, px, 9, dt); ly = damp(ly < -1e3 ? py : ly, py, 9, dt);
    const R = Math.max(110, bb.width * .22);
    wordEls.forEach((w, i) => {
      const c = wc[i];
      if (!c) return;
      const f = clamp(1 - Math.hypot(c[0] - lx, c[1] - ly) / R, 0, 1);
      const v = f * f * (3 - 2 * f);
      if (Math.abs((w._v || 0) - v) > .004) { w._v = v; w.style.setProperty('--f', v.toFixed(3)); }
    });
    // El retrato mira hacia donde está la lente de las palabras
    const fb = fig.getBoundingClientRect();
    drawLens(clamp((lx - fb.left) / Math.max(1, fb.width), .15, .85), clamp((ly - fb.top) / Math.max(1, fb.height), .2, .8), dt);

    pos = damp(pos, tpos, drag ? 30 : 9, dt);
    const sw = stops[0]?.offsetWidth || 240;
    track.style.transform = `translate3d(${(-pos * sw).toFixed(1)}px,0,0)`;
    stops.forEach((s, i) => { const d = Math.abs(i - pos); s.style.setProperty('--d', Math.min(d, 2).toFixed(3)); });
    dial.style.setProperty('--rot', `${(-pos * 24).toFixed(1)}deg`);
    ticks.setAttribute('transform', `rotate(${(root.scrollTop / Math.max(1, root.scrollHeight - root.clientHeight)) * 200} 60 60)`);
  });

  return () => {
    stop();
    io.disconnect();
    offs.forEach(f => f());
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  };
}
