// Papel escaneado: grano de tóner, polvo, rayas verticales y bordes quemados.
// Se pinta una sola vez; no consume nada durante el scroll.
import { seeded } from './lib.js';

export function initScan() {
  const rnd = seeded(4217);
  const tile = document.createElement('canvas');
  tile.width = tile.height = 256;
  const t = tile.getContext('2d');
  const img = t.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const dark = rnd() > .5;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = dark ? 0 : 255;
    img.data[i + 3] = rnd() * 22;
  }
  t.putImageData(img, 0, 0);
  document.querySelector('.grain').style.backgroundImage = `url(${tile.toDataURL()})`;

  const c = document.createElement('canvas');
  c.className = 'scan';
  c.setAttribute('aria-hidden', 'true');
  c.width = 1400; c.height = 1000;
  const x = c.getContext('2d');
  // Bordes de la fotocopiadora
  const g = x.createRadialGradient(700, 500, 420, 700, 500, 960);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,.13)');
  x.fillStyle = g;
  x.fillRect(0, 0, 1400, 1000);
  // Rayas verticales del tambor
  for (let i = 0; i < 9; i++) {
    x.fillStyle = `rgba(0,0,0,${.02 + rnd() * .05})`;
    x.fillRect(rnd() * 1400, 0, .6 + rnd() * 1.2, 1000);
  }
  // Polvo y motas
  for (let i = 0; i < 520; i++) {
    x.fillStyle = `rgba(0,0,0,${.05 + rnd() * .3})`;
    x.beginPath();
    x.arc(rnd() * 1400, rnd() * 1000, rnd() * rnd() * 1.7, 0, 7);
    x.fill();
  }
  // Pelos y marcas
  x.lineWidth = .7;
  for (let i = 0; i < 16; i++) {
    const a = rnd() * 1400, b = rnd() * 1000;
    x.strokeStyle = `rgba(0,0,0,${.1 + rnd() * .22})`;
    x.beginPath();
    x.moveTo(a, b);
    x.quadraticCurveTo(a + rnd() * 26 - 13, b + rnd() * 26 - 13, a + rnd() * 34 - 17, b + rnd() * 34 - 17);
    x.stroke();
  }
  document.body.append(c);
}
