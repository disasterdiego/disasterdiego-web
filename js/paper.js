// Transición de toda la web: hojas de papel semitransparente que se superponen.
// Al entrar en un proyecto, su portada se revela sobre la última hoja:
// empieza como lente de ojo de pez, desenfocada y con aberración, y se asienta.
import { getGL, program, fullscreenQuad, VS_FULL, NOISE, ticker, clamp, loadImage, texture, reduced } from './lib.js';

const FS = `precision highp float;
varying vec2 vUv; uniform sampler2D uTex;
uniform float uCover, uOut, uLens, uImgA, uAspect, uT;
uniform vec2 uBox, uFit;
${NOISE}
float edgeD(float p, float seed, float tilt){
  vec2 q = vec2(vUv.x*uAspect, vUv.y);
  float n = (fbm(q*2.1+seed)-.5)*.17;
  return p*1.5-.25-(vUv.y+n+(vUv.x-.5)*tilt);
}
vec4 layer(float i, float tilt, float alpha, vec3 tone){
  float pc = clamp(uCover*1.5-i*.25,0.,1.);
  float po = clamp(uOut*1.5-(2.-i)*.25,0.,1.);
  float dc = edgeD(pc,i*3.1,tilt), dd = edgeD(po,i*5.7+9.,-tilt);
  float a = smoothstep(0.,.012,dc)*(1.-smoothstep(0.,.012,dd));
  vec2 q = vec2(vUv.x*uAspect, vUv.y);
  float fibre = (vnoise(vec2(q.x*8.,q.y*280.))-.5)*.03+(vnoise(vec2(q.x*260.,q.y*8.))-.5)*.022;
  float rim = (1.-smoothstep(0.,.05,dc))*.1+(1.-smoothstep(0.,.05,abs(dd)))*.1;
  vec3 col = tone+fibre-rim;
  float ao = alpha;
  if(i>1.5 && uImgA>0.){
    vec2 c = (vUv-.5)*vec2(uAspect,1.);
    vec2 b = uBox*vec2(uAspect,1.);
    float R = mix(.012,min(b.x,b.y),uLens);
    vec2 d = abs(c)-b+R;
    float m = 1.-smoothstep(-.002,.002,length(max(d,0.))+min(max(d.x,d.y),0.)-R);
    vec2 p = (vUv-.5)/(2.*uBox);
    float r2 = dot(p,p);
    vec2 u = p*(1.+uLens*(r2*2.6-.45));
    vec2 dir = p*uLens*.1;
    vec2 t = vec2(u.x,-u.y)*uFit+.5;
    vec2 ds = vec2(dir.x,-dir.y)*uFit;
    float bias = uLens*6.;
    vec3 im = vec3(texture2D(uTex,t+ds,bias).r,texture2D(uTex,t,bias).g,texture2D(uTex,t-ds,bias).b);
    im += (1.-smoothstep(.0,.3,abs(.5-r2*2.)))*uLens*.05;
    // Se revela como fotocopia y termina nítida
    float tl = smoothstep(.15,.76,dot(im,vec3(.3,.59,.11)))+(vnoise(gl_FragCoord.xy*.9)-.5)*.4;
    im = mix(im,vec3(mix(.05,.93,clamp(tl,0.,1.))),smoothstep(.0,.55,uLens));
    col = mix(col,im,m*uImgA);
  }
  return vec4(col,1.)*a*ao;
}
void main(){
  vec4 o = vec4(0.);
  vec4 s = layer(0.,.14,.62,vec3(.95,.95,.94)); o = s+o*(1.-s.a);
  s = layer(1.,-.1,.68,vec3(.92,.92,.91)); o = s+o*(1.-s.a);
  s = layer(2.,.05,1.,vec3(.933,.933,.922)); o = s+o*(1.-s.a);
  gl_FragColor = o;
}`;

const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const out = t => 1 - Math.pow(1 - t, 3);

export function createPaper(canvas, labelEl) {
  const gl = getGL(canvas, { powerPreference: 'default' });
  const tween = (dur, fn, curve = ease) => new Promise(res => {
    if (reduced) dur = Math.min(dur, .1);
    const t0 = performance.now();
    const stop = ticker.add((dt, t) => {
      const p = clamp((performance.now() - t0) / 1000 / dur, 0, 1);
      fn(curve(p), t);
      if (p >= 1) { stop(); res(); }
    });
  });

  if (!gl) {
    canvas.classList.add('paper--flat');
    return {
      async play({ swap }) {
        canvas.style.display = 'block';
        await tween(.4, p => { canvas.style.opacity = p; });
        await swap();
        await tween(.5, p => { canvas.style.opacity = 1 - p; });
        canvas.style.display = 'none';
      },
    };
  }

  const prog = program(gl, VS_FULL, FS);
  gl.useProgram(prog.p);
  fullscreenQuad(gl, prog);
  const U = prog.u;
  const set = (name, v) => gl.uniform1f(U[name], v);
  let tex = null;

  const size = () => {
    const s = Math.min(devicePixelRatio || 1, 1.25);
    canvas.width = Math.ceil(innerWidth * s);
    canvas.height = Math.ceil(innerHeight * s);
    gl.viewport(0, 0, canvas.width, canvas.height);
    set('uAspect', innerWidth / innerHeight);
  };
  size();
  addEventListener('resize', size, { passive: true });

  let vals = { c: 0, o: 0, l: 0, a: 0 };
  const draw = t => {
    set('uCover', vals.c); set('uOut', vals.o); set('uLens', vals.l); set('uImgA', vals.a); set('uT', t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  return {
    async play({ src, label, swap }) {
      canvas.style.display = 'block';
      vals = { c: 0, o: 0, l: 1, a: 0 };
      let imgReady = null;
      if (src) {
        imgReady = loadImage(src).then(img => {
          if (tex) gl.deleteTexture(tex);
          tex = texture(gl, img, { mips: true });
          const A = innerWidth / innerHeight, boxW = A > 1 ? .3 : .44;
          const boxH = Math.min(.36, (boxW * A) / (16 / 9));
          const fr = (boxW * A) / boxH, ir = img.naturalWidth / img.naturalHeight;
          gl.uniform2f(U.uBox, boxW, boxH);
          gl.uniform2f(U.uFit, ir > fr ? fr / ir : 1, ir > fr ? 1 : ir / fr);
          return true;
        }).catch(() => false);
      }
      await tween(.62, (p, t) => { vals.c = p; draw(t); });
      await swap();
      if (imgReady && await Promise.race([imgReady, new Promise(r => setTimeout(() => r(false), 700))])) {
        labelEl.textContent = label || '';
        labelEl.classList.add('is-on');
        await tween(1, (p, t) => { vals.a = clamp(p * 4, 0, 1); vals.l = 1 - p; draw(t); }, out);
        await new Promise(r => setTimeout(r, reduced ? 0 : 160));
        labelEl.classList.remove('is-on');
      }
      await tween(.85, (p, t) => { vals.o = p; draw(t); });
      canvas.style.display = 'none';
    },
  };
}
