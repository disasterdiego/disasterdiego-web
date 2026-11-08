// HOME: tu foto encima y la capa de debajo. El cursor deja un trazo líquido, pequeño,
// que funciona como una lente: amplía, se desenfoca hacia el borde y separa el color
// en rojo, amarillo y azul. Es la misma lente que usa toda la web.
import { HOME_IMAGE, HOME_UNDER, HOME_SIMULATE, WORLDS, PROJECTS, DESIGN, CONTENT, ABOUT } from '../data.js';
import { getGL, program, fullscreenQuad, VS_FULL, texture, loadImage, ticker, damp, lerp, opt, esc, reduced, isNarrow, finePointer } from '../lib.js';

const FS = `precision highp float;
varying vec2 vUv;
uniform sampler2D uTop, uUnder, uMask, uInk;
uniform vec2 uFitTop, uFitUnder, uMouse, uPx;
uniform float uSim, uT, uAspect, uHead, uHeadA;
float lum(vec3 c){ return dot(c,vec3(.3,.59,.11)); }
vec2 fit(vec2 uv, vec2 f){ return (uv-.5)*f+.5; }
vec3 under(vec2 uv, float bias){
  vec3 c = texture2D(uUnder, fit(uv,uFitUnder), bias).rgb;
  if(uSim > .5){
    // Mientras no haya foto tatuada: fotocopia de tóner y tu tribal encima
    float l = smoothstep(.12,.78,lum(c));
    c = vec3(mix(.04,.95,l));
    vec2 iu = (uv-vec2(.5,.43))*vec2(uAspect*.62,1.)*.95+.5;
    float ink = 1.-lum(texture2D(uInk, iu, bias).rgb);
    c *= 1.-smoothstep(.15,.6,ink)*.85;
  }
  return c;
}
// La cabeza de la lente se calcula aquí, sin píxeles; el rastro viene de la máscara
float M(vec2 uv){
  float d = length((uv-uMouse)*vec2(uAspect,1.));
  float head = smoothstep(uHead, uHead*.5, d)*uHeadA;
  return max(texture2D(uMask, uv).r, head);
}
void main(){
  vec2 uv = vec2(vUv.x, 1.-vUv.y);
  float m = M(uv);
  vec2 e = uPx*2.;
  vec2 g = vec2(M(uv+vec2(e.x,0.))-M(uv-vec2(e.x,0.)), M(uv+vec2(0.,e.y))-M(uv-vec2(0.,e.y)));
  float rim = clamp(1.-abs(m*2.2-1.1),0.,1.);
  // Ojo de pez: dentro del trazo la imagen se amplía; en el filo se curva y se desenfoca
  vec2 lensUv = uv - (uv-uMouse)*m*.08 - g*.04*rim;
  vec2 d = g*.045*rim + (uv-uMouse)*m*.006;
  float bias = rim*2.5;
  vec3 un = vec3(under(lensUv+d,bias).r, under(lensUv+d*.45,bias).g, under(lensUv-d*.7,bias).b);
  vec2 tu = fit(uv - g*.02*rim, uFitTop);
  vec2 td = g*.03*rim*uFitTop;
  vec3 top = vec3(texture2D(uTop,tu+td,bias*.6).r, texture2D(uTop,tu+td*.45,bias*.6).g, texture2D(uTop,tu-td*.7,bias*.6).b);
  float reveal = smoothstep(.4,.62,m);
  vec3 col = mix(top, un, reveal);
  // Brillo de cristal en el filo
  col += rim*.03;
  gl_FragColor = vec4(col,1.);
}`;

const isVideo = u => u.endsWith('.mp4') || u.includes('/video/upload/');
const poster = (u, w = 420) => (isVideo(u) ? u.replace(/\.mp4$/i, '.jpg') : opt(u, w));
const COUNT = { advertising: PROJECTS.advertising.length, design: DESIGN.length, content: CONTENT.length };
const pad = n => String(n).padStart(2, '0');

// Cada sección tiene su propio adelanto, para que se sientan mundos distintos
const PEEK = {
  advertising: () => {
    const row = PROJECTS.advertising.map(p => `<a href="#/p/${p.id}" data-cursor-ui><span><img src="${opt(p.cover, 360)}" alt="" loading="lazy"></span><small>${esc(p.title)}</small></a>`).join('');
    return `<p class="peek__k">Wall infinito de campañas</p><div class="peek__belt"><div>${row}${row}</div></div>`;
  },
  design: () => `<p class="peek__k">Carruseles completos, en la ranura</p>${DESIGN.slice(0, 3).map((d, i) => {
    const s = d.slides.map(src => `<span>${isVideo(src) ? '' : `<img src="${opt(src, 160)}" alt="" loading="lazy">`}</span>`).join('');
    return `<div class="peek__reel${i % 2 ? ' is-rev' : ''}"><b>${pad(i + 1)} ${esc(d.title)}</b><div><div>${s}${s}</div></div></div>`;
  }).join('')}`,
  content: () => {
    // Pared de reels: tres columnas que suben a distinto ritmo
    const col = (k) => { const l = CONTENT.filter((_, i) => i % 3 === k).map(c => `<span><img src="${poster(c.src, 200)}" alt="" loading="lazy"><small>${esc(c.title)}</small></span>`).join(''); return `<div style="--d:${14 + k * 5}s"${k === 1 ? ' class="is-rev"' : ''}><div>${l}${l}</div></div>`; };
    return `<p class="peek__k">Reels, uno a uno, con likes y comentarios</p><div class="peek__wall">${col(0)}${col(1)}${col(2)}</div>`;
  },
  about: () => `<p class="peek__k">Quién está detrás de la lente</p><div class="peek__me"><span class="peek__eye"><img src="assets/id/mask.webp" alt=""></span><div><p class="peek__quote display">La única constante es el fallo.</p><p class="peek__now">Ahora — ${esc(ABOUT.now.where)}</p><p class="peek__now">${ABOUT.brands.length} marcas · ${esc(ABOUT.brands.slice(0, 4).join(', '))}…</p></div></div>`,
};

export function mountHome(root) {
  root.innerHTML = `
    <div class="hz" id="hz">
      <div class="hz__tilt" id="tilt"><canvas class="hz__gl" id="gl"></canvas><img class="hz__flat" src="${HOME_IMAGE}" alt="Retrato de Diego" hidden></div>
    </div>
    <h1 class="sr">disasterdiego</h1>
    <nav class="home__pillars" id="pillars" aria-label="Secciones">${WORLDS.map((w, i) => `
      <a href="#/${w.id}" data-id="${w.id}" style="--i:${i}" data-cursor-ui><i>${pad(i + 1)}</i><span>${w.label}</span><small>${COUNT[w.id] ?? ''}</small></a>`).join('')}
    </nav>
    <aside class="peek" id="peek" aria-hidden="true"></aside>`;

  const $ = s => root.querySelector(s);
  const tilt = $('#tilt'), peek = $('#peek'), pillars = $('#pillars'), canvas = $('#gl');

  // Adelanto a la derecha: se queda abierto al pasar del pilar al panel
  let shown = null, closeT = 0;
  const open = id => {
    clearTimeout(closeT);
    if (id !== shown) {
      shown = id;
      peek.className = `peek peek--${id}`;
      peek.innerHTML = `<header><b class="display">${esc(WORLDS.find(w => w.id === id).label)}</b><span>${COUNT[id] ? `${COUNT[id]} proyectos` : '—'}</span></header>${PEEK[id]()}`;
      void peek.offsetWidth;
    }
    peek.classList.add('is-in');
    pillars.querySelectorAll('a').forEach(a => a.classList.toggle('is-active', a.dataset.id === id));
  };
  const close = () => {
    closeT = setTimeout(() => {
      peek.classList.remove('is-in');
      pillars.querySelectorAll('a').forEach(a => a.classList.remove('is-active'));
      shown = null;
    }, 260);
  };
  pillars.addEventListener('pointerover', e => { const a = e.target.closest('a'); if (a && e.pointerType === 'mouse') open(a.dataset.id); });
  pillars.addEventListener('pointerleave', close);
  peek.addEventListener('pointerenter', () => clearTimeout(closeT));
  peek.addEventListener('pointerleave', close);

  const gl = getGL(canvas);
  if (!gl) { canvas.remove(); root.querySelector('.hz__flat').hidden = false; return () => clearTimeout(closeT); }
  const prog = program(gl, VS_FULL, FS);
  gl.useProgram(prog.p);
  fullscreenQuad(gl, prog);
  const U = prog.u;

  // Texturas: 0 arriba, 1 debajo, 2 máscara del trazo, 3 tinta
  const slot = (unit, name) => { gl.uniform1i(U[name], unit); };
  slot(0, 'uTop'); slot(1, 'uUnder'); slot(2, 'uMask'); slot(3, 'uInk');
  const tex = {};
  const sizes = { top: [16, 9], under: [16, 9] };
  let alive = true;
  const load = (key, unit, src) => loadImage(src).then(img => {
    if (!alive) return;
    gl.activeTexture(gl.TEXTURE0 + unit);
    tex[key] = texture(gl, img, { mips: true });
    sizes[key] = [img.naturalWidth, img.naturalHeight];
    fitAll();
  }).catch(() => {});
  load('top', 0, HOME_IMAGE);
  load('under', 1, HOME_UNDER);
  if (HOME_SIMULATE) load('ink', 3, 'assets/id/tribal.webp');
  gl.uniform1f(U.uSim, HOME_SIMULATE ? 1 : 0);

  const mask = document.createElement('canvas');
  const ctx = mask.getContext('2d');
  gl.activeTexture(gl.TEXTURE2);
  const mtex = texture(gl, null);

  let W = 1, H = 1, k = 1;
  const fitAll = () => {
    const sr = W / H;
    const f = ([w, h]) => { const ir = w / h; return ir > sr ? [sr / ir, 1] : [1, ir / sr]; };
    gl.uniform2f(U.uFitTop, ...f(sizes.top));
    gl.uniform2f(U.uFitUnder, ...f(sizes.under));
  };
  const size = () => {
    W = root.clientWidth; H = root.clientHeight;
    const r = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = W * r; canvas.height = H * r;
    gl.viewport(0, 0, canvas.width, canvas.height);
    k = 640 / W;
    mask.width = 640; mask.height = Math.max(2, Math.round(H * k));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, mask.width, mask.height);
    gl.uniform2f(U.uPx, 1 / mask.width, 1 / mask.height);
    gl.uniform1f(U.uAspect, W / H);
    fitAll();
  };
  size();
  addEventListener('resize', size, { passive: true });

  // Trazo: sellos pequeños a lo largo del recorrido, que se secan en un segundo
  const stamp = (x, y, r, a) => {
    const X = x * k, Y = y * k, R = r * k;
    const g = ctx.createRadialGradient(X, Y, 0, X, Y, R);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(.55, `rgba(255,255,255,${a * .8})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(X, Y, R, 0, 7); ctx.fill();
  };
  const brush = () => Math.min(W, H) * (isNarrow() ? .085 : .07);
  let headA = 0;
  let px = null, py = null, mx = W / 2, my = H * .42, touched = 0, idle = 0, rx = 0, ry = 0;
  const trail = (x, y, power) => {
    if (px === null) { px = x; py = y; }
    const dist = Math.hypot(x - px, y - py);
    const steps = Math.min(Math.ceil(dist / 2.5), 160);
    // Rastro fino detrás de la cabeza; más rápido = más fino
    const r = brush() * (.5 - Math.min(dist / 400, .2));
    for (let i = 1; i <= steps; i++) stamp(lerp(px, x, i / steps), lerp(py, y, i / steps), r, power);
    px = x; py = y;
  };
  const onMove = e => { mx = e.clientX; my = e.clientY; touched = 2.5; trail(mx, my, .5); };
  const onUp = e => { if (e.pointerType !== 'mouse') px = py = null; };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onMove, { passive: true });
  addEventListener('pointerup', onUp, { passive: true });

  const stop = ticker.add((dt, t) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 4.5)})`;
    ctx.fillRect(0, 0, mask.width, mask.height);
    ctx.globalCompositeOperation = 'lighter';
    touched = Math.max(0, touched - dt);
    if (!touched && !reduced) {
      // Sin cursor, un trazo lento recorre la cara
      idle += dt;
      const x = W / 2 + Math.sin(idle * .7) * Math.min(W, H) * .16 + Math.sin(idle * 1.9) * 20;
      const y = H * .42 + Math.sin(idle * 1.13 + 1) * H * .12;
      trail(x, y, .32);
      mx = x; my = y;
    } else if (!touched) px = py = null;

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, mtex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
    for (const [key, unit] of [['top', 0], ['under', 1], ['ink', 3]]) {
      if (!tex[key]) continue;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex[key]);
    }
    if (!tex.top || !tex.under) return;
    gl.uniform2f(U.uMouse, mx / W, my / H);
    headA = damp(headA, 1, 4, dt);
    gl.uniform1f(U.uHead, (brush() * 1.6) / H);
    gl.uniform1f(U.uHeadA, headA);
    gl.uniform1f(U.uT, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Leve giro en 3D hacia el cursor
    const ax = finePointer && touched ? mx / W - .5 : Math.sin(t * .3) * .2;
    const ay = finePointer && touched ? my / H - .5 : Math.sin(t * .4) * .15;
    rx = damp(rx, reduced ? 0 : -ay * 4, 3, dt);
    ry = damp(ry, reduced ? 0 : ax * 6, 3, dt);
    tilt.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(1.04)`;
  });

  return () => {
    alive = false;
    stop();
    clearTimeout(closeT);
    removeEventListener('resize', size);
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerdown', onMove);
    removeEventListener('pointerup', onUp);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}
