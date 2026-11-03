// Utilidades compartidas: matemáticas, ticker único, WebGL mínimo, optimización de URLs.

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const mod = (v, m) => ((v % m) + m) % m;
export const wrap = (v, size) => mod(v + size / 2, size) - size / 2;

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(pointer: fine)').matches;
export const isNarrow = () => innerWidth < 820;
export const dpr = () => Math.min(devicePixelRatio || 1, isNarrow() ? 1.5 : 1.75);

// Suavizado independiente del framerate
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

// Un solo requestAnimationFrame para toda la web
const jobs = new Set();
let last = 0, running = false;
function frame(t) {
  const dt = Math.min((t - last) / 1000, 0.05);
  last = t;
  jobs.forEach(fn => fn(dt, t / 1000));
  if (jobs.size) requestAnimationFrame(frame); else running = false;
}
export const ticker = {
  add(fn) {
    jobs.add(fn);
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    return () => jobs.delete(fn);
  },
};

// Pide a Cloudinary/Unsplash el tamaño justo en vez del original
export function opt(url, w = 1600) {
  if (!url) return url;
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    const clean = url.replace('/upload/f_auto,q_auto/', '/upload/');
    if (clean.endsWith('.gif')) return clean;
    return clean.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${w}/`);
  }
  if (url.includes('images.unsplash.com')) {
    return url.replace(/[?&]w=\d+/, '').replace(/&?auto=format/, '').replace(/&?fit=crop/, '') + `&w=${w}&auto=format&fit=crop`;
  }
  return url;
}

export function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// --- WebGL ---
export function getGL(canvas, opts = {}) {
  const o = { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance', ...opts };
  return canvas.getContext('webgl2', o) || canvas.getContext('webgl', o);
}

export function program(gl, vs, fs) {
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(p, i).name;
    u[name] = gl.getUniformLocation(p, name);
  }
  return { p, u };
}

export function texture(gl, source, { mips = false } = {}) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  const gl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips && gl2 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  if (source) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    if (mips && gl2) gl.generateMipmap(gl.TEXTURE_2D);
  }
  return t;
}

export function fullscreenQuad(gl, prog) {
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog.p, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}

export const VS_FULL = `
attribute vec2 aPos; varying vec2 vUv;
void main(){ vUv = aPos*.5+.5; gl_Position = vec4(aPos,0.,1.); }`;

// Ruido multi-octava: el mismo "borde rasgado" en toda la web
export const NOISE = `
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+7.1; a*=.5; } return s; }`;

// Arrastre genérico con ratón y dedo; distingue tap de drag
export function bindDrag(el, { onStart, onMove, onEnd, onTap } = {}) {
  let down = false, sx = 0, sy = 0, lx = 0, ly = 0, moved = false, id = null;
  const dn = e => {
    if (e.button) return;
    down = true; moved = false; sx = lx = e.clientX; sy = ly = e.clientY; id = e.pointerId;
    onStart?.(e);
  };
  const mv = e => {
    if (!down || e.pointerId !== id) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 7) {
      moved = true;
      try { el.setPointerCapture(id); } catch {}
    }
    if (moved) onMove?.(dx, dy, e, e.clientX - sx, e.clientY - sy);
  };
  const up = e => {
    if (!down || e.pointerId !== id) return;
    down = false;
    if (moved) onEnd?.(e); else if (e.type === 'pointerup') onTap?.(e); else onEnd?.(e);
  };
  el.addEventListener('pointerdown', dn);
  addEventListener('pointermove', mv);
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  return () => {
    el.removeEventListener('pointerdown', dn);
    removeEventListener('pointermove', mv);
    removeEventListener('pointerup', up);
    removeEventListener('pointercancel', up);
  };
}
