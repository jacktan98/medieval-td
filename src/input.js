import { plots } from './data/level01.js';
import { archery } from './data/towers.js';
import { PLOT_R } from './render.js';

export function attachInput(canvas, state, restart) {
  canvas.addEventListener('pointerdown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (960 / rect.width);
    const y = (e.clientY - rect.top) * (540 / rect.height);

    if (state.result) { restart(); return; }

    const plot = plots.find(p => Math.hypot(p.x - x, p.y - y) <= PLOT_R + 8);
    if (!plot) { state.selected = null; return; }

    const existing = state.towers.find(t => t.plot === plot);

    if (!existing) {
      const def = archery[0];
      if (state.gold < def.cost) return;
      state.gold -= def.cost;
      state.towers.push({
        plot, def,
        x: plot.x, y: plot.y,
        aim: 0, cd: 0, recoil: 0
      });
      return;
    }

    // First tap selects and shows range, second tap upgrades.
    if (state.selected !== existing) { state.selected = existing; return; }

    const next = archery[existing.def.tier];
    if (!next || state.gold < next.cost) return;
    state.gold -= next.cost;
    existing.def = next;
    existing.cd = 0;
  });
}
