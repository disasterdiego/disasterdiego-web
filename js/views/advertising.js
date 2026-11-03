// ADVERTISING: dos formas de ver lo mismo, con el mismo índice de proyectos.
import { PROJECTS } from '../data.js';
import { setBarSlot } from '../main.js';
import { createIndex } from '../index-list.js';
import { mountWall } from './wall.js';

export function mountAdvertising(root) {
  let mode = 'wall';
  try { mode = sessionStorage.getItem('adv-mode') === 'row' ? 'row' : 'wall'; } catch {}

  root.innerHTML = '<div class="adv-stage" id="adv-stage"></div>';
  const slot = setBarSlot(`
    <div class="switch" role="group" aria-label="Vista">
      <button type="button" data-mode="wall" data-cursor-ui>Wall</button>
      <button type="button" data-mode="row" data-cursor-ui>Row</button>
    </div>`);

  let view = null;
  const index = createIndex(root, PROJECTS.advertising, {
    href: p => `#/p/${p.id}`,
    onEnter: i => view?.focus(i),
    onLeave: () => view?.focus(-1),
  });

  const stage = root.querySelector('#adv-stage');
  const buttons = [...slot.querySelectorAll('[data-mode]')];

  const show = m => {
    mode = m;
    try { sessionStorage.setItem('adv-mode', m); } catch {}
    buttons.forEach(b => {
      b.classList.toggle('is-active', b.dataset.mode === m);
      b.setAttribute('aria-pressed', b.dataset.mode === m);
    });
    view?.destroy();
    stage.innerHTML = '';
    stage.classList.remove('is-in');
    view = mountWall(stage, { row: m === 'row', index });
    requestAnimationFrame(() => stage.classList.add('is-in'));
  };
  buttons.forEach(b => b.addEventListener('click', () => { if (b.dataset.mode !== mode) show(b.dataset.mode); }));
  show(mode);

  return () => view?.destroy();
}
