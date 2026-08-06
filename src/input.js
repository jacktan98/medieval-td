import { plots } from './data/level01.js';
import { PLOT_R } from './render.js';
import { openMenu, closeMenu, hitMenu, hitCancel, canUse, sellValue } from './menu.js';

export function attachInput(canvas, state, restart) {
  canvas.addEventListener('pointerdown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (960 / rect.width);
    const y = (e.clientY - rect.top) * (540 / rect.height);

    if (state.result) { restart(); return; }

    // A menu button wins over anything underneath it, including the plot ring
    // the menu is anchored to.
    const item = hitMenu(state, x, y);
    if (item) {
      if (canUse(state, item)) run(state, item);
      return;   // an unaffordable button absorbs the tap rather than closing
    }

    if (hitCancel(state, x, y)) { closeMenu(state); return; }

    const plot = plots.find(p => Math.hypot(p.x - x, p.y - y) <= PLOT_R + 8);
    if (!plot) { closeMenu(state); return; }

    openMenu(state, plot, state.towers.find(t => t.plot === plot) || null);
  });
}

function run(state, item) {
  const menu = state.menu;

  if (item.act === 'build') {
    const def = item.family.tiers[0];
    state.gold -= def.cost;
    state.towers.push({
      plot: menu.plot,
      fam: item.family,
      def,
      x: menu.plot.x,
      y: menu.plot.y,
      aim: 0,
      cd: 0,
      recoil: 0,
      spent: def.cost
    });
  }

  if (item.act === 'upgrade') {
    const t = menu.tower;
    const next = t.fam.tiers[t.def.tier];
    state.gold -= next.cost;
    t.def = next;
    t.spent += next.cost;
    t.cd = 0;
  }

  if (item.act === 'sell') {
    const t = menu.tower;
    state.gold += sellValue(t);
    state.towers = state.towers.filter(other => other !== t);
  }

  closeMenu(state);
}
