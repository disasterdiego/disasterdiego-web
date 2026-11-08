// Hover común de la web: una gota de agua sigue al cursor y refracta la imagen,
// con aberración cromática solo en su borde. Un único canvas para todas las imágenes.
import { getGL, program, fullscreenQuad, VS_FULL, ticker, damp, finePointer, reduced } from './lib.js';

const FS = `precision highp float;
varying vec2 vUv; uniform sampler2D uTex;
uniform vec2 uMouse, uCover, uSize; uniform float uAmt, uT;
void main(){
  vec2 uv = vec2(vUv.x,1.-vUv.y);
  vec2 p = (uv-uMouse)*vec2(uSize.x/uSize.y,1.);
  float d = length(p);
  float R = .4;
  float f = uAmt*smoothstep(R,0.,d);
  float wob = sin(d*26.-uT*2.2)*.0035*f;
  // Ojo de pez: amplía en el centro y curva hacia el borde de la gota
  vec2 q = uv-(uv-uMouse)*(f*.34+wob);
  q = .5+(q-.5)/(1.+.035*uAmt);
  vec2 t = (q-.5)*uCover+.5;
  // Filo con dispersión de lente: rojo fuera, amarillo en medio, azul dentro
  float ring = f*(1.-f)*4.;
  vec2 dir = (p/(d+.001))*ring*.022*uAmt;
  dir.x /= uSize.x/uSize.y;
  vec2 dc = dir*uCover;
  vec3 c = vec3(0.);
  // Desenfoque suave en el filo: cinco tomas por canal
  for(int k=-2;k<=2;k++){
    vec2 o = vec2(-dir.y,dir.x)*uCover*float(k)*.35;
    c += vec3(texture2D(uTex,t+dc+o).r, texture2D(uTex,t+dc*.45+o).g, texture2D(uTex,t-dc*.7+o).b);
  }
  c /= 5.;
  c += ring*.05;
  gl_FragColor = vec4(c,1.)*smoothstep(0.,.3,uAmt);
}`;

const TARGETS = '.m, .vclip, .vslide, .panel__thumb';
const cache = new Map();
let active = null, hideNow = () => {};

export const fxHide = () => hideNow();

export function initFx(canvas) {
  if (!finePointer || reduced) return;
  const gl = getGL(canvas, { powerPreference: 'default' });
  if (!gl) return;
  const prog = program(gl, VS_FULL, FS);
  gl.useProgram(prog.p);
  fullscreenQuad(gl, prog);
  const U = prog.u;

  const newTex = () => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    return t;
  };

  const loadTex = src => {
    if (cache.has(src)) return cache.get(src);
    const e = { tex: null, w: 1, h: 1 };
    cache.set(src, e);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      e.tex = newTex();
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      e.w = img.naturalWidth; e.h = img.naturalHeight;
    };
    img.src = src;
    return e;
  };

  let mx = .5, my = .5, tx = .5, ty = .5, amt = 0, target = 0, vTex = null;

  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const box = e.target.closest?.(TARGETS);
    if (!box) { target = 0; return; }
    const media = box.querySelector('img,video');
    if (!media || media.closest('.m__yt') || box.querySelector('iframe')) { target = 0; return; }
    if (box === active?.box) { target = 1; return; }
    const isV = media.tagName === 'VIDEO';
    if (isV && media.crossOrigin !== 'anonymous') { target = 0; return; }
    const r = box.getBoundingClientRect();
    tx = mx = (e.clientX - r.left) / r.width;
    ty = my = (e.clientY - r.top) / r.height;
    active = { box, media, isV, entry: isV ? null : loadTex(media.currentSrc || media.src) };
    amt = 0;
    target = 1;
  });
  addEventListener('pointermove', e => {
    if (!active) return;
    const r = active.box.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width;
    ty = (e.clientY - r.top) / r.height;
  }, { passive: true });

  hideNow = () => { active = null; target = 0; amt = 0; canvas.style.display = 'none'; };

  ticker.add((dt, t) => {
    if (!active) return;
    amt = damp(amt, target, 5, dt);
    if (target === 0 && amt < .01) { hideNow(); return; }
    // Si la pieza ya no es la actual (scroll en visor o sala), la gota desaparece
    if (!active.box.isConnected || active.box.style.pointerEvents === 'none') { hideNow(); return; }
    mx = damp(mx, tx, 9, dt);
    my = damp(my, ty, 9, dt);

    let w, h;
    if (active.isV) {
      const v = active.media;
      if (v.readyState < 2) return;
      vTex ||= newTex();
      gl.bindTexture(gl.TEXTURE_2D, vTex);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v); } catch { hideNow(); return; }
      w = v.videoWidth; h = v.videoHeight;
    } else {
      if (!active.entry.tex) return;
      gl.bindTexture(gl.TEXTURE_2D, active.entry.tex);
      w = active.entry.w; h = active.entry.h;
    }

    const r = active.box.getBoundingClientRect();
    if (canvas.style.display !== 'block') canvas.style.display = 'block';
    canvas.style.transform = `translate3d(${r.left}px,${r.top}px,0)`;
    canvas.style.width = `${r.width}px`;
    canvas.style.height = `${r.height}px`;
    canvas.style.borderRadius = getComputedStyle(active.box).borderRadius;
    const dp = Math.min(devicePixelRatio || 1, 1.5);
    const cw = Math.max(2, Math.round(r.width * dp)), ch = Math.max(2, Math.round(r.height * dp));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; gl.viewport(0, 0, cw, ch); }

    const br = r.width / r.height, ir = w / h;
    gl.uniform2f(U.uCover, ir > br ? br / ir : 1, ir > br ? 1 : ir / br);
    gl.uniform2f(U.uMouse, mx, my);
    gl.uniform2f(U.uSize, r.width, r.height);
    gl.uniform1f(U.uAmt, amt);
    gl.uniform1f(U.uT, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
}
