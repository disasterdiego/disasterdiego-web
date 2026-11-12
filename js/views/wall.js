// Advertising en WebGL. Wall: pared infinita. Row: fila infinita.
// Con la velocidad las imágenes ondulan como tela, se desenfocan y separan color.
import { PROJECTS } from '../data.js';
import { setCursorLabel } from '../main.js';
import { getGL, program, texture, loadImage, ticker, damp, wrap, clamp, dpr, opt, esc, seeded, isNarrow, bindDrag, reduced } from '../lib.js';

const VS = `precision highp float;
attribute vec2 aPos; varying vec2 vUv; varying vec2 vClip; varying float vFold;
uniform vec2 uRes, uCenter, uSize, uTilt; uniform float uRot, uFish, uScale, uVel, uT, uSeed, uVert;
float h2(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5); }
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y); }
void main(){
  vUv = aPos;
  vec2 p = (aPos-.5)*uSize*uScale;
  float z = dot((aPos-.5)*2., uTilt);
  float c = cos(uRot), s = sin(uRot);
  p = vec2(p.x*c-p.y*s, p.x*s+p.y*c) + uCenter;
  float v = abs(uVel);
  // Tela: una ola común que recorre la pared (coherente) y un poco de
  // arruga propia de cada imagen, para que no se repita el mismo patrón
  vec2 q = uVert > .5 ? p.yx : p.xy;
  float ph = uSeed*6.28;
  float wave = sin(q.x*.0065+uT*1.5+ph*.35)*34.+sin(q.x*.019-uT*2.6+ph)*8.;
  float n1 = vn(aPos*vec2(1.6,1.1)+uSeed*37.+vec2(uT*.4,-uT*.25))-.5;
  float amp = .8+fract(uSeed*11.7)*.4;
  float dsp = (wave+n1*30.)*v*amp;
  if(uVert > .5) p.x += dsp; else p.y += dsp;
  z += (sin(aPos.x*6.28+uT*2.+ph)*.15+n1*.25)*uVel;
  vFold = (sin(q.x*.019-uT*2.6+ph)*.7+n1*.8)*v*amp;
  vec2 n = p/(uRes*.5);
  // Ojo de pez del mapa: todo se curva hacia los bordes
  p *= 1. - uFish*.17*dot(n,n);
  vec2 clip = p/(uRes*.5);
  vClip = clip;
  gl_Position = vec4(clip.x,-clip.y,0.,1.+z*.12);
}`;

const FS = `precision highp float;
varying vec2 vUv; varying vec2 vClip; varying float vFold; uniform sampler2D uTex;
uniform vec2 uCover, uSize, uMouse; uniform vec3 uPaper; uniform float uWash, uRadius, uReady, uLens, uIn, uHover, uVel, uVert;
void main(){
  // La misma gota de agua del resto de imágenes (fx.js)
  vec2 mp = (vUv-uMouse)*vec2(uSize.x/uSize.y,1.);
  float md = length(mp), f = uHover*smoothstep(.46,0.,md);
  vec2 t = ((vUv-.5)-(vUv-uMouse)*f*.3)*uCover+.5;
  float r = length(vClip*vec2(1.,.8)), v = abs(uVel);
  // Borde del mapa: desenfoque gaussiano y dispersión de lente (rojo, verde, azul)
  float edge = smoothstep(.42,1.2,r);
  float blur = uLens*(edge*4.2+(1.-uIn)*5.+v*4.5);
  vec2 dir = (normalize(vClip+.0001))*(uLens*edge*.018);
  dir.y = -dir.y;
  float ring = f*(1.-f)*4.;
  dir += (mp/(md+.001))*ring*.03;
  if(uVert > .5) dir.y += uVel*.024*uLens; else dir.x += uVel*.024*uLens;
  vec4 c = texture2D(uTex,t,blur);
  c.r = texture2D(uTex,t+dir,blur).r;
  c.g = texture2D(uTex,t+dir*.45,blur).g;
  c.b = texture2D(uTex,t-dir*.7,blur).b;
  c.rgb += ring*.04;
  c = mix(vec4(uPaper*.92,1.), c, uReady);
  // Tela: pliegues y trama que solo aparecen en movimiento
  c.rgb += vFold*.08*uLens;
  vec2 q = abs(vUv-.5)*uSize - uSize*.5 + uRadius;
  float a = uRadius>0. ? 1.-smoothstep(-.7,.7,length(max(q,0.))+min(max(q.x,q.y),0.)-uRadius) : 1.;
  vec3 paper = uPaper*c.a;
  gl_FragColor = vec4(mix(c.rgb,paper,uWash),c.a)*a;
}`;

export function mountWall(root, { row = false, index } = {}) {
  const list = PROJECTS.advertising;
  // En móvil, Row se recorre hacia abajo
  const vert = row && isNarrow();
  root.innerHTML = '<canvas class="stage" id="wall" aria-hidden="true"></canvas>';

  const canvas = root.querySelector('#wall');
  const gl = getGL(canvas);
  if (!gl) {
    canvas.remove();
    const g = document.createElement('div');
    g.className = 'fallback-grid';
    g.innerHTML = list.map(p => `<a href="#/p/${p.id}"><img src="${opt(p.cover, 900)}" alt="${esc(p.title)}" loading="lazy"><span>${esc(p.title)}</span></a>`).join('');
    root.append(g);
    return { destroy() {}, focus() {} };
  }

  const prog = program(gl, VS, FS);
  gl.useProgram(prog.p);
  const U = prog.u;

  const N = 20, verts = [], idx = [];
  for (let y = 0; y <= N; y++) for (let x = 0; x <= N; x++) verts.push(x / N, y / N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const a = y * (N + 1) + x, b = a + 1, c = a + N + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog.p, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  const blank = texture(gl, null);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([224, 222, 217, 255]));
  const tex = list.map(() => ({ t: blank, ready: 0, inn: 0, ratio: 16 / 9, cap: null }));
  let alive = true;
  list.forEach((p, i) => {
    loadImage(opt(p.cover, row ? 1400 : isNarrow() ? 720 : 1000)).then(img => {
      if (!alive) return;
      tex[i].t = texture(gl, img, { mips: true });
      tex[i].ratio = img.naturalWidth / img.naturalHeight;
      tex[i].ready = 1;
    }).catch(() => {});
  });
  const makeCaption = p => {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 96;
    const x = c.getContext('2d');
    // El pie siempre mide 11 px en pantalla, sea cual sea el tamaño de la tarjeta
    x.font = `400 ${Math.round((11 * 1024) / base)}px ${getComputedStyle(document.documentElement).getPropertyValue('--mono')}`;
    x.fillStyle = '#111';
    x.textBaseline = 'middle';
    x.fillText(p.title, 2, 48);
    x.textAlign = 'right';
    x.fillText(p.date, 1022, 48);
    return texture(gl, c);
  };
  const captions = () => document.fonts.load(`400 24px ${getComputedStyle(document.documentElement).getPropertyValue('--mono')}`).finally(() => {
    if (alive) list.forEach((p, i) => { tex[i].cap = makeCaption(p); });
  });
  captions();
  addEventListener('fontchange', captions);

  const COLS = 6, ROWS = 4;
  const rnd = seeded(1789);
  const cells = [];
  const seedRnd = seeded(733);
  if (row) {
    list.forEach((_, i) => cells.push({ r: 0, c: i, i, size: 1, sx: 0, sy: 0, rot: 0, tiltX: 0, tiltY: 0, scale: 1, wash: 0 }));
  } else {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      cells.push({
        r, c, i: (r * COLS + c) % list.length,
        size: .86 + rnd() * .26, sx: rnd() * 2 - 1, sy: rnd() * 2 - 1,
        rot: (rnd() * 2.4 - 1.2) * Math.PI / 180,
        tiltX: 0, tiltY: 0, scale: 1, wash: 0,
      });
    }
  }
  let W = 0, H = 0, base = 0, cw = 0, ch = 0, wrapX = 0, wrapY = 0;
  const size = () => {
    W = root.clientWidth; H = root.clientHeight;
    const r = dpr();
    canvas.width = W * r; canvas.height = H * r;
    gl.viewport(0, 0, canvas.width, canvas.height);
    const narrow = isNarrow();
    if (vert) {
      base = W * .86;
      ch = base * .5625 + 54;
      wrapX = W * 8; wrapY = list.length * ch;
      cells.forEach(c => { c.x = 0; c.y = c.c * ch; });
    } else if (row) {
      base = Math.min(W * .5, H * 1.05);
      cw = base * 1.14;
      wrapX = list.length * cw; wrapY = H * 8;
      cells.forEach(c => { c.x = c.c * cw; c.y = 0; });
    } else {
      base = narrow ? W * .62 : clamp(W * .21, 260, 460);
      cw = base * (narrow ? 1.28 : 1.62);
      ch = base * .5625 + base * (narrow ? .5 : .62);
      wrapX = COLS * cw; wrapY = ROWS * ch;
      cells.forEach(c => {
        c.x = c.c * cw + c.sx * base * .08;
        c.y = c.r * ch + (c.c % 2 ? ch / 2 : 0) + c.sy * base * .1;
      });
    }
    gl.uniform2f(U.uRes, W, H);
  };
  cells.forEach(c => { c.seed = seedRnd(); });
  size();
  addEventListener('resize', size, { passive: true });

  let tx = 0, ty = 0, cx = 0, cy = 0, fish = 0, fishT = 0, dragging = false, wheelT = 0, vel = 0;
  let vx = 0, vy = 0, lastDrag = 0, mouse = null, hovered = null, sideFocus = -1, dir = -1, snapT = 0;
  const drawn = [];

  const snap = () => {
    if (!row) return;
    if (vert) { const q = ty / ch; ty = (dir < 0 ? Math.floor(q + .1) : Math.ceil(q - .1)) * ch; return; }
    const q = tx / cw;
    tx = (dir < 0 ? Math.floor(q + .1) : Math.ceil(q - .1)) * cw;
  };
  const centerOn = i => {
    let best = null, bd = Infinity;
    cells.filter(c => c.i === i).forEach(c => {
      const x = wrap(c.x + tx, wrapX), y = wrap(c.y + ty, wrapY), d = Math.hypot(x, y);
      if (d < bd) { bd = d; best = { x, y }; }
    });
    if (best) { tx -= best.x; ty -= best.y; }
  };

  const hit = (mx, my) => {
    const b = canvas.getBoundingClientRect();
    const X = mx - b.left - W / 2, Y = my - b.top - H / 2;
    for (let n = drawn.length - 1; n >= 0; n--) {
      const d = drawn[n];
      const dx = X - d.px, dy = Y - d.py;
      const c = Math.cos(-d.c.rot), s = Math.sin(-d.c.rot);
      const lx = dx * c - dy * s, ly = dx * s + dy * c;
      if (Math.abs(lx) < d.w / 2 && Math.abs(ly) < d.h / 2) return { c: d.c, lx: lx / (d.w / 2), ly: ly / (d.h / 2) };
    }
    return null;
  };

  const offDrag = bindDrag(canvas, {
    onStart: () => { fishT = row ? 0 : 1; vx = vy = 0; },
    onMove: (dx, dy) => {
      dragging = true;
      if (vert) { ty += dy * 1.4; vy = dy * 1.4; if (dy) dir = Math.sign(dy); }
      else { tx += dx * 1.4; vx = dx * 1.4; if (dx) dir = Math.sign(dx); }
      if (!row) { ty += dy * 1.4; vy = dy * 1.4; }
      lastDrag = performance.now();
    },
    onEnd: () => {
      dragging = false; fishT = 0;
      if (performance.now() - lastDrag < 80) { tx += vx * 9; ty += vy * 9; }
      snap();
    },
    onTap: e => {
      fishT = 0;
      const h = hit(e.clientX, e.clientY);
      if (h) location.hash = `#/p/${list[h.c.i].id}`;
    },
  });

  const onWheel = e => {
    e.preventDefault();
    if (vert) {
      ty -= e.deltaY * 1.2;
      if (e.deltaY) dir = -Math.sign(e.deltaY);
      snapT = .22;
    } else if (row) {
      const dv = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      tx -= dv * 1.2;
      if (dv) dir = -Math.sign(dv);
      snapT = .22;
    } else {
      tx -= e.deltaX * 1.1; ty -= e.deltaY * 1.1;
      fishT = .6; wheelT = performance.now();
    }
  };
  canvas.addEventListener('wheel', onWheel, { passive: false });
  const onPointer = e => { mouse = e.pointerType === 'mouse' ? { x: e.clientX, y: e.clientY } : null; };
  addEventListener('pointermove', onPointer, { passive: true });
  canvas.addEventListener('pointerleave', () => { mouse = null; });
  const onKey = e => {
    if (!row) return;
    if (e.key === 'ArrowRight') { dir = -1; tx = (Math.round(tx / cw) - 1) * cw; }
    if (e.key === 'ArrowLeft') { dir = 1; tx = (Math.round(tx / cw) + 1) * cw; }
  };
  addEventListener('keydown', onKey);

  const stop = ticker.add((dt, t) => {
    if (wheelT && performance.now() - wheelT > 200) { wheelT = 0; if (!dragging) fishT = 0; }
    if (snapT > 0) { snapT -= dt; if (snapT <= 0) snap(); }
    if (!row && !dragging && !wheelT && !reduced && sideFocus < 0) { const s = hovered ? .1 : 1; tx -= 8 * dt * s; ty -= 16 * dt * s; }
    const px = cx, py = cy;
    cx = damp(cx, tx, row ? 4.5 : 5.5, dt); cy = damp(cy, ty, 5.5, dt);
    fish = damp(fish, fishT, 5, dt);
    const mv = (vert ? cy - py : Math.abs(cx - px) >= Math.abs(cy - py) ? cx - px : cy - py) / Math.max(dt, .001);
    vel = damp(vel, clamp(mv / (row ? 2600 : 3400), -1, 1), 7, dt);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    drawn.length = 0;
    const maxD = Math.max(W, H) * .8;
    let nearest = null, nd = Infinity;
    for (const c of cells) {
      const x = wrap(c.x + cx, wrapX), y = wrap(c.y + cy, wrapY);
      const w0 = base * c.size, h0 = w0 * .5625;
      if (Math.abs(x) > W / 2 + w0 || Math.abs(y) > H / 2 + h0 * 1.5) continue;
      const dist = Math.hypot(x, y), r = dist / maxD;
      if (dist < nd) { nd = dist; nearest = c; }
      const intensity = row ? .4 : isNarrow() ? .22 + fish * .4 : .3 + fish * .6;
      const sc = 1 - r * r * .2 * intensity;
      const k = 1 - intensity * .16 * ((x * x) / (W * W / 4) + (y * y) / (H * H / 4));
      drawn.push({ c, x, y, w: w0 * sc, h: h0 * sc, intensity, px: x * k, py: y * k, dist });
    }
    drawn.sort((a, b) => b.dist - a.dist);

    const h = mouse && !dragging ? hit(mouse.x, mouse.y) : null;
    const next = h ? h.c : null;
    if (next !== hovered) {
      hovered = next;
      setCursorLabel(hovered ? esc(list[hovered.i].cat) : '');
    }
    const focus = hovered ? hovered.i : sideFocus;
    index?.setActive(focus >= 0 ? focus : (row || isNarrow()) && nearest ? nearest.i : -1);

    const night = document.documentElement.classList.contains('is-night');
    gl.uniform1f(U.uVel, reduced ? 0 : vel);
    gl.uniform1f(U.uVert, vert ? 1 : 0);
    gl.uniform1f(U.uT, t);
    for (const d of drawn) {
      const c = d.c, T = tex[c.i], isH = hovered === c;
      c.tiltX = damp(c.tiltX, isH ? h.lx * .5 : 0, 8, dt);
      c.tiltY = damp(c.tiltY, isH ? h.ly * .5 : 0, 8, dt);
      c.scale = damp(c.scale, isH ? 1.03 : 1, 8, dt);
      c.hv = damp(c.hv || 0, isH ? 1 : 0, 5, dt);
      if (isH) { c.mx = h.lx * .5 + .5; c.my = h.ly * .5 + .5; }
      gl.uniform2f(U.uMouse, c.mx ?? .5, c.my ?? .5);
      gl.uniform1f(U.uHover, c.hv);
      c.wash = damp(c.wash, focus >= 0 && c.i !== focus ? .62 : 0, 6, dt);
      if (T.ready) T.inn = Math.min(1, T.inn + dt * .9);

      const fr = 16 / 9, ir = T.ratio;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, T.t);
      gl.uniform2f(U.uCenter, d.x, d.y);
      gl.uniform2f(U.uSize, d.w, d.h);
      gl.uniform1f(U.uRot, c.rot);
      gl.uniform1f(U.uScale, c.scale);
      gl.uniform2f(U.uTilt, c.tiltX, c.tiltY);
      gl.uniform1f(U.uFish, d.intensity);
      gl.uniform2f(U.uCover, ir > fr ? fr / ir : 1, ir > fr ? 1 : ir / fr);
      gl.uniform1f(U.uWash, c.wash);
      if (night) gl.uniform3f(U.uPaper, .075, .075, .072); else gl.uniform3f(U.uPaper, .933, .933, .922);
      gl.uniform1f(U.uRadius, 6);
      gl.uniform1f(U.uSeed, c.seed);
      gl.uniform1f(U.uReady, T.ready);
      gl.uniform1f(U.uLens, 1);
      gl.uniform1f(U.uIn, T.inn);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);

      if (T.cap && !isH) {
        const off = d.h / 2 + 16;
        gl.bindTexture(gl.TEXTURE_2D, T.cap);
        gl.uniform2f(U.uCenter, d.x - Math.sin(c.rot) * off, d.y + Math.cos(c.rot) * off);
        gl.uniform2f(U.uSize, d.w, d.w * 96 / 1024);
        gl.uniform1f(U.uScale, 1);
        gl.uniform2f(U.uTilt, 0, 0);
        gl.uniform2f(U.uCover, 1, 1);
        gl.uniform1f(U.uRadius, 0);
        gl.uniform1f(U.uReady, 1);
        gl.uniform1f(U.uLens, 0);
        gl.uniform1f(U.uHover, 0);
        gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      }
    }
  });

  return {
    focus(i) { sideFocus = i; if (i >= 0) centerOn(i); },
    destroy() {
      alive = false;
      stop();
      offDrag();
      setCursorLabel('');
      removeEventListener('resize', size);
      removeEventListener('pointermove', onPointer);
      removeEventListener('keydown', onKey);
      removeEventListener('fontchange', captions);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
