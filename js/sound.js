// Microsonidos sintetizados (sin archivos). Solo suenan tras el primer gesto del usuario.
let ctx = null, on = true, last = 0;
try { on = localStorage.getItem('sound') !== 'off'; } catch {}

// Safari solo deja arrancar el audio dentro de un toque o clic de verdad (touchend,
// mousedown, click) y además necesita sonar algo en ese momento: un búfer en silencio
const unlock = () => {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state !== 'running') {
      ctx.resume?.();
      const b = ctx.createBuffer(1, 1, 22050), src = ctx.createBufferSource();
      src.buffer = b; src.connect(ctx.destination); src.start(0);
    }
  } catch {}
};
['pointerdown', 'mousedown', 'touchend', 'click', 'keydown'].forEach(ev => addEventListener(ev, unlock, { passive: true, capture: true }));

// Si el contexto aún está despertando, el sonido espera a que arranque
const ready = fn => { if (!on || !ctx) return; if (ctx.state === 'running') fn(); else ctx.resume?.().then(() => { if (ctx.state === 'running') fn(); }).catch(() => {}); };
function tone(freq, dur, gain) { ready(() => toneNow(freq, dur, gain)); }
function toneNow(freq, dur, gain) {
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * .7, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur);
}

function noise(dur, gain, from, to) { ready(() => noiseNow(dur, gain, from, to)); }
function noiseNow(dur, gain, from, to) {
  const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
  s.buffer = buf;
  f.type = 'bandpass';
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * .35);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f).connect(g).connect(ctx.destination);
  s.start(t);
}

export const sound = {
  get on() { return on; },
  toggle() {
    on = !on;
    try { localStorage.setItem('sound', on ? 'on' : 'off'); } catch {}
    if (on) { unlock(); tone(1400, .05, .025); }
  },
  // Roce de papel al pasar por un botón
  tick() {
    const now = performance.now();
    if (now - last < 60) return;
    last = now;
    tone(1900, .025, .012);
  },
  click() { tone(820, .07, .035); },
  swish() { noise(.55, .018, 500, 2600); },
  // Obturador: dos chasquidos secos, cortinilla abre y cierra
  shutter() { noise(.035, .06, 4200, 2600); setTimeout(() => noise(.05, .045, 3000, 1500), 75); },
  // Fotocopiadora: barrido de luz y motor
  // Modo Disaster: cristal que estalla, tijeretazo, spray, golpe sordo y derrumbe
  smash() { noise(.42, .09, 3200, 260); tone(64, .3, .05); setTimeout(() => noise(.25, .03, 5200, 2600), 40); },
  snip() { noise(.035, .06, 7000, 4200); setTimeout(() => noise(.04, .05, 6000, 3000), 70); },
  psst() { noise(.14, .01, 3600, 6400); },
  thud() { tone(92, .1, .025); },
  rumble() { noise(1.1, .05, 180, 60); tone(48, 1, .04); },
  rebuild() { noise(.7, .02, 400, 3600); tone(330, .25, .015); setTimeout(() => tone(495, .3, .015), 180); },
  copier() { noise(.9, .022, 600, 3400); tone(110, .8, .02); },
};
