// Cursores: al pulsar la hora (abajo a la izquierda) cambias de óptica.
// Cada uno cambia el tamaño de la lente de la home y el aspecto del cursor.
export const CURSORS = [
  { id: 'lente', name: 'Lente', scale: 1 },
  { id: 'angular', name: 'Gran angular', scale: 1.4 },
  { id: 'macro', name: 'Macro', scale: .7 },
  { id: 'cristal', name: 'Cristal', scale: 1.1 },
  { id: 'prisma', name: 'Prisma', scale: 1.2 },
];
let i = 0;
try { i = Math.max(0, CURSORS.findIndex(c => c.id === localStorage.getItem('dd-cursor'))); } catch {}
const apply = () => {
  document.documentElement.dataset.cursor = CURSORS[i].id;
  try { localStorage.setItem('dd-cursor', CURSORS[i].id); } catch {}
};
apply();
export const cursorMode = () => CURSORS[i];
export const cursorScale = () => CURSORS[i].scale;
export const nextCursor = () => { i = (i + 1) % CURSORS.length; apply(); return CURSORS[i]; };
