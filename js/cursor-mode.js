// Cursores de cristal líquido: el botón de abajo a la izquierda cambia de uno a otro.
// Ahora solo hay uno: una gota de cristal que se estira con el movimiento.
// scale: tamaño de la lente de la home con ese cursor.
export const CURSORS = [
  { id: 'gota', name: 'Gota', w: 34, h: 34, r: 17, scale: 1, glass: 14 },
];
let i = 0;
try { i = Math.max(0, CURSORS.findIndex(c => c.id === localStorage.getItem('dd-cursor3'))); } catch {}
const listeners = new Set();
const apply = () => {
  document.documentElement.dataset.cursor = CURSORS[i].id;
  try { localStorage.setItem('dd-cursor3', CURSORS[i].id); } catch {}
  listeners.forEach(fn => fn(CURSORS[i]));
};
apply();
export const cursorMode = () => CURSORS[i];
export const cursorIndex = () => i;
export const cursorScale = () => CURSORS[i].scale;
export const onCursorChange = fn => { listeners.add(fn); fn(CURSORS[i]); };
export const nextCursor = () => { i = (i + 1) % CURSORS.length; apply(); return CURSORS[i]; };

// Mapa de desplazamiento para un rectángulo redondeado: en el filo la imagen se curva
// hacia dentro (como el borde de una gota) y el centro se amplía un poco.
// Rojo = desplazamiento en X, verde = en Y; 128 es "no mover".
export function glassMap(w, h, r) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const hw = w / 2, hh = h / 2, edge = Math.min(w, h) * .32;
  const sdf = (x, y) => {
    const qx = Math.abs(x) - (hw - r), qy = Math.abs(y) - (hh - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = px + .5 - hw, y = py + .5 - hh;
      const d = sdf(x, y);
      let dx = 0, dy = 0;
      if (d < 0) {
        const nx = sdf(x + 1, y) - sdf(x - 1, y), ny = sdf(x, y + 1) - sdf(x, y - 1);
        const nl = Math.hypot(nx, ny) || 1;
        const t = Math.max(0, 1 - -d / edge), k = t * t * t;
        // Filo: hacia dentro. Centro: ligera ampliación
        dx = -(nx / nl) * k - (x / hw) * .18;
        dy = -(ny / nl) * k - (y / hh) * .18;
      }
      const o = (py * w + px) * 4;
      img.data[o] = 128 + Math.max(-1, Math.min(1, dx)) * 127;
      img.data[o + 1] = 128 + Math.max(-1, Math.min(1, dy)) * 127;
      img.data[o + 2] = 128;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}
