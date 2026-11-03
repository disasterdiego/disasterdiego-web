// Microsonidos sintetizados (sin archivos). Solo suenan tras el primer gesto del usuario.
let ctx = null, on = true, last = 0;
try { on = localStorage.getItem('sound') !== 'off'; } catch {}

const unlock = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
};
addEventListener('pointerdown', unlock, { passive: true });
addEventListener('keydown', unlock);

function tone(freq, dur, gain) {
  if (!on || !ctx || ctx.state !== 'running') return;
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

function noise(dur, gain, from, to) {
  if (!on || !ctx || ctx.state !== 'running') return;
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
};
