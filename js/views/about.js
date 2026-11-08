// ABOUT: todo legible. Tu imagen en el centro, con la misma lente de cristal líquido
// de la home; alrededor, la bio, las marcas, el recorrido y los premios.
// El control + − da más o menos cristal a la lente.
import { ABOUT } from '../data.js';
import { esc, ticker, damp, clamp, isNarrow, reduced, getGL, program, fullscreenQuad, VS_FULL, texture, loadImage } from '../lib.js';

const IMG = 'assets/id/inverted.webp';
const rows = list => `<ul class="ledger">${list.map(r => `<li><span>${esc(r.when)}</span><b>${esc(r.what)}</b><span>${esc(r.where)}</span></li>`).join('')}</ul>`;
const block = (code, title, body, cls = '') => `
  <section class="ab ${cls}">
    <header class="ab__marks"><span>]*[</span><span>${code}</span><span>// ${title}</span></header>
    ${body}
  </section>`;

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
  // Cristal: dentro amplía, en el filo curva la imagen y separa rojo, verde y azul
  vec2 q = uv - (uv-uMouse)*m*.18*uAmt - g*.05*rim*uAmt;
  vec2 d = g*.06*rim*uAmt + (uv-uMouse)*m*.012*uAmt;
  vec2 f = (q-.5)*uFit+.5, fd = d*uFit;
  vec3 c = vec3(texture2D(uTex,f+fd).r, texture2D(uTex,f+fd*.45).g, texture2D(uTex,f-fd*.7).b);
  c += rim*.05*uAmt + m*.025*uAmt;
  gl_FragColor = vec4(c,1.);
}`;

export function mountAbout(root) {
  const logos = ABOUT.brands.map(b => `<li title="${esc(b)}">${ABOUT.logos?.[b] ? `<img src="${ABOUT.logos[b]}" alt="${esc(b)}" draggable="false">` : `<span>${esc(b)}</span>`}</li>`).join('');
  root.innerHTML = `
    <div class="about2">
      <div class="about2__l">
        ${block('INDENTITY', 'Bio', `<h1 class="ab__bio">${esc(ABOUT.bio)}</h1>`)}
        ${block('NOW', 'Ahora', `<p class="ab__now"><b>${esc(ABOUT.now.what)}</b><span>${esc(ABOUT.now.where)}</span></p>`)}
      </div>
      <figure class="about2__img" id="fig">
        <canvas id="agl" aria-hidden="true"></canvas>
        <img class="about2__flat" src="${IMG}" alt="disasterIDego" hidden>
        <div class="about2__zoom" role="group" aria-label="Cantidad de cristal">
          <button type="button" data-z="-1" data-cursor-ui aria-label="Menos cristal">−</button>
          <span id="zv">Cristal 3</span>
          <button type="button" data-z="1" data-cursor-ui aria-label="Más cristal">+</button>
        </div>
      </figure>
      <div class="about2__r">
        ${block('BRANDS', `${ABOUT.brands.length} marcas`, `<ul class="ab__logos">${logos}</ul>`)}
        ${block('CAREER', 'Recorrido', rows(ABOUT.career))}
        ${block('RECOGNITION', 'Premios', rows(ABOUT.awards))}
      </div>
    </div>`;

  const fig = root.querySelector('#fig'), canvas = root.querySelector('#agl'), zv = root.querySelector('#zv');
  let lvl = 3;
  const setLvl = v => { lvl = clamp(v, 1, 5); zv.textContent = `Cristal ${lvl}`; };
  root.querySelector('.about2__zoom').addEventListener('click', e => {
    const b = e.target.closest('[data-z]');
    if (b) setLvl(lvl + +b.dataset.z);
  });

  const gl = getGL(canvas);
  if (!gl) { canvas.remove(); root.querySelector('.about2__flat').hidden = false; return () => {}; }
  const prog = program(gl, VS_FULL, FS);
  gl.useProgram(prog.p);
  fullscreenQuad(gl, prog);
  const U = prog.u;
  gl.uniform1i(U.uTex, 0);
  let tex = null, ir = 3 / 4, alive = true, W = 1, H = 1;
  loadImage(IMG).then(img => { if (!alive) return; gl.activeTexture(gl.TEXTURE0); tex = texture(gl, img, { mips: true }); ir = img.naturalWidth / img.naturalHeight; size(); }).catch(() => {});
  const size = () => {
    W = fig.clientWidth; H = fig.clientHeight;
    const r = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * r; canvas.height = H * r;
    gl.viewport(0, 0, canvas.width, canvas.height);
    const sr = W / H;
    gl.uniform2f(U.uFit, ...(ir > sr ? [sr / ir, 1] : [1, ir / sr]));
    gl.uniform1f(U.uAspect, sr);
  };
  size();
  addEventListener('resize', size, { passive: true });

  let tx = .5, ty = .45, x = tx, y = ty, touched = 0, idle = 0, R = .2, A = 1;
  const onMove = e => {
    const b = fig.getBoundingClientRect();
    tx = (e.clientX - b.left) / b.width; ty = (e.clientY - b.top) / b.height; touched = 2.5;
  };
  fig.addEventListener('pointermove', onMove, { passive: true });
  fig.addEventListener('pointerdown', onMove, { passive: true });

  const stop = ticker.add(dt => {
    touched = Math.max(0, touched - dt);
    if (!touched && !reduced) {
      idle += dt;
      tx = .5 + Math.sin(idle * .5) * .22;
      ty = .45 + Math.sin(idle * .67 + 1) * .2;
    }
    x = damp(x, tx, 10, dt); y = damp(y, ty, 10, dt);
    // Más cristal = lente más grande y que curva más
    R = damp(R, .1 + lvl * .045, 6, dt);
    A = damp(A, .4 + lvl * .3, 6, dt);
    if (!tex) return;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform2f(U.uMouse, x, y);
    gl.uniform1f(U.uR, R * (isNarrow() ? 1.3 : 1));
    gl.uniform1f(U.uAmt, A);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
  return () => {
    alive = false;
    stop();
    removeEventListener('resize', size);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}
