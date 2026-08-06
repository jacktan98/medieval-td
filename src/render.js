import { path, plots, keep } from './data/level01.js';
import { waves } from './data/waves.js';
import { art } from './assets.js';
import { towerBox, facing, muzzlePoint } from './towers.js';
import { BTN_R, CANCEL_R, canUse } from './menu.js';

const PLOT_R = 30;

// Draws a red dot at each tower's firing origin. Off by default; add ?muzzle
// to the URL to switch it on, so offsets can be checked on a phone without
// editing a file and redeploying.
const DEBUG_MUZZLE = new URLSearchParams(location.search).has('muzzle');

export function draw(ctx, state) {
  ctx.clearRect(0, 0, 960, 540);

  ctx.fillStyle = '#4A5744';
  ctx.fillRect(0, 0, 960, 540);

  drawPath(ctx);
  drawKeep(ctx);
  drawPlots(ctx, state);
  drawTowers(ctx, state);
  drawEnemies(ctx, state);
  drawShots(ctx, state);
  drawHits(ctx, state);
  drawHud(ctx, state);
  drawMenu(ctx, state);

  if (state.result) drawResult(ctx, state);
}

function drawPath(ctx) {
  ctx.strokeStyle = '#6B5844';
  ctx.lineWidth = 34;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.stroke();
}

function drawKeep(ctx) {
  ctx.fillStyle = '#8A8478';
  ctx.fillRect(keep.x - 22, keep.y - 40, 52, 80);
  ctx.fillStyle = '#3E3E46';
  ctx.fillRect(keep.x - 8, keep.y + 6, 20, 34);
}

function drawPlots(ctx, state) {
  for (const p of plots) {
    const taken = state.towers.some(t => t.plot === p);
    if (taken) continue;
    // The open menu draws its own marker on its plot; two rings read as noise.
    if (state.menu && state.menu.plot === p) continue;
    ctx.strokeStyle = '#C4A574';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLOT_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawTowers(ctx, state) {
  for (const t of state.towers) {
    if (state.menu && state.menu.tower === t) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.def.range, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Placeholder building. Swap for drawImage once tower sprites are cut —
    // the box is already the size the sprite should be drawn at.
    const box = towerBox(t);
    ctx.fillStyle = ['#9C7248', '#7A5230', '#B8B2A4'][t.def.tier - 1];
    ctx.fillRect(box.left, box.top, box.w, box.h);
    ctx.strokeStyle = '#22201C';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.left, box.top, box.w, box.h);

    drawGunner(ctx, t);

    if (DEBUG_MUZZLE) {
      // Drawn from muzzlePoint itself, so the dot marks where arrows really
      // spawn rather than where the sprite transform thinks they should.
      const m = muzzlePoint(t);
      ctx.fillStyle = '#D4453A';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Stands the gunner on its mount point and mirrors it when the tower aims
// left. Never rotates — these are side-elevation sprites, so a rotated archer
// is an archer lying on the floor.
function drawGunner(ctx, t) {
  const box = towerBox(t);
  const [mx, my] = t.def.mount;

  ctx.save();
  ctx.translate(box.left + mx, box.top + my);
  ctx.scale(facing(t), 1);
  ctx.translate(-t.recoil * 3, 0);   // kicks backward, opposite the shot

  const img = art[t.def.gunner];
  if (img) {
    const [sx, sy, sw, sh] = t.def.trim;
    ctx.drawImage(img, sx, sy, sw, sh, -t.def.gw / 2, -t.def.gh, t.def.gw, t.def.gh);
  } else {
    ctx.fillStyle = '#E0D6C2';
    ctx.fillRect(-8, -14, 16, 14);
    ctx.strokeStyle = '#22201C';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -14, 16, 14);
  }

  ctx.restore();
}

function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    const bob = Math.sin(e.t * 9) * 2;

    ctx.fillStyle = e.def.colour;
    ctx.beginPath();
    ctx.arc(e.x, e.y + bob, e.def.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22201C';
    ctx.lineWidth = 2;
    ctx.stroke();

    const pct = e.hp / e.maxHp;
    ctx.fillStyle = '#22201C';
    ctx.fillRect(e.x - 12, e.y - e.def.r - 10 + bob, 24, 5);
    ctx.fillStyle = pct > 0.5 ? '#6BBF59' : '#D4453A';
    ctx.fillRect(e.x - 11, e.y - e.def.r - 9 + bob, 22 * pct, 3);
  }
}

function drawShots(ctx, state) {
  ctx.strokeStyle = '#F0E6D2';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const s of state.shots) {
    const a = s.angle || 0;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - Math.cos(a) * 10, s.y - Math.sin(a) * 10);
    ctx.stroke();
  }
}

function drawHits(ctx, state) {
  for (const h of state.hits) {
    ctx.strokeStyle = `rgba(255,255,255,${h.life * 4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x, h.y, (0.25 - h.life) * 60, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = 'rgba(34,32,28,0.75)';
  ctx.fillRect(0, 0, 960, 40);

  ctx.fillStyle = '#F0E6D2';
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  ctx.fillText(`Gold ${state.gold}`, 16, 21);
  ctx.fillText(`Lives ${state.lives}`, 150, 21);
  ctx.fillText(`Wave ${Math.min(state.waveIndex + 1, waves.length)} / ${waves.length}`, 280, 21);

  const hint = state.menu
    ? (state.menu.tower ? 'Upgrade or sell' : 'Pick a tower')
    : 'Tap a plot to build';
  ctx.fillStyle = '#C4A574';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(hint, 470, 21);
}

function drawMenu(ctx, state) {
  const menu = state.menu;
  if (!menu) return;

  const clamped = menu.cx !== menu.plot.x || menu.cy !== menu.plot.y;

  // Leader first, so the ring and buttons draw over it.
  if (clamped) {
    ctx.strokeStyle = 'rgba(240,230,210,0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(menu.plot.x, menu.plot.y);
    ctx.lineTo(menu.cx, menu.cy);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Marks which plot the menu will act on. A clamped menu puts a button on top
  // of the plot, so use a small dot there instead of the full ring.
  ctx.strokeStyle = '#F0E6D2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (clamped) ctx.arc(menu.plot.x, menu.plot.y, 5, 0, Math.PI * 2);
  else ctx.arc(menu.plot.x, menu.plot.y, PLOT_R, 0, Math.PI * 2);
  ctx.stroke();

  drawCancel(ctx, menu);
  for (const it of menu.items) drawButton(ctx, state, it);
}

function drawCancel(ctx, menu) {
  ctx.fillStyle = 'rgba(34,32,28,0.7)';
  ctx.beginPath();
  ctx.arc(menu.cx, menu.cy, CANCEL_R, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8A8478';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(menu.cx - 5, menu.cy - 5);
  ctx.lineTo(menu.cx + 5, menu.cy + 5);
  ctx.moveTo(menu.cx + 5, menu.cy - 5);
  ctx.lineTo(menu.cx - 5, menu.cy + 5);
  ctx.stroke();
}

function drawButton(ctx, state, it) {
  const on = canUse(state, it);

  ctx.fillStyle = on ? 'rgba(34,32,28,0.92)' : 'rgba(34,32,28,0.55)';
  ctx.beginPath();
  ctx.arc(it.x, it.y, BTN_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = on ? '#C4A574' : '#5A5348';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.translate(it.x, it.y - 5);
  ctx.strokeStyle = ctx.fillStyle = on ? '#F0E6D2' : '#6E665A';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawGlyph(ctx, it.glyph);
  ctx.restore();

  const caption = it.gain !== null ? `+${it.gain}g`
                : it.cost !== null ? `${it.cost}g`
                : it.available ? '' : 'soon';
  if (!caption) return;

  ctx.fillStyle = it.gain !== null ? '#6BBF59' : (on ? '#C4A574' : '#6E665A');
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(caption, it.x, it.y + 14);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
}

// Vector glyphs rather than sprites — UI art is still unspecced, and these
// need to stay legible at 52px on a phone. Each draws centred on the origin
// in roughly a 22px box.
function drawGlyph(ctx, kind) {
  ctx.beginPath();

  if (kind === 'bow') {
    ctx.arc(-3, 0, 9, -Math.PI / 2.2, Math.PI / 2.2);
    ctx.moveTo(3, -8); ctx.lineTo(3, 8);
    ctx.moveTo(-6, 0); ctx.lineTo(9, 0);
    ctx.stroke();
  } else if (kind === 'swords') {
    ctx.moveTo(-8, 8); ctx.lineTo(7, -8);
    ctx.moveTo(8, 8); ctx.lineTo(-7, -8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, 3); ctx.lineTo(-3, 9);
    ctx.moveTo(9, 3); ctx.lineTo(3, 9);
    ctx.stroke();
  } else if (kind === 'catapult') {
    ctx.moveTo(-9, 8); ctx.lineTo(0, -2); ctx.lineTo(9, 8);
    ctx.moveTo(-5, 3); ctx.lineTo(5, 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -2); ctx.lineTo(8, -8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(9, -9, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'cross') {
    ctx.moveTo(0, -9); ctx.lineTo(0, 9);
    ctx.moveTo(-6, -3); ctx.lineTo(6, -3);
    ctx.stroke();
  } else if (kind === 'up') {
    ctx.moveTo(-7, 2); ctx.lineTo(0, -6); ctx.lineTo(7, 2);
    ctx.moveTo(-7, 9); ctx.lineTo(0, 1); ctx.lineTo(7, 9);
    ctx.stroke();
  } else if (kind === 'max') {
    ctx.moveTo(-8, -6); ctx.lineTo(8, -6);
    ctx.moveTo(-7, 2); ctx.lineTo(0, -5); ctx.lineTo(7, 2);
    ctx.moveTo(-7, 9); ctx.lineTo(0, 2); ctx.lineTo(7, 9);
    ctx.stroke();
  } else if (kind === 'coin') {
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawResult(ctx, state) {
  ctx.fillStyle = 'rgba(34,32,28,0.82)';
  ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = '#F0E6D2';
  ctx.font = '700 52px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.result === 'won' ? 'Waves cleared' : 'The keep has fallen', 480, 250);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Tap to play again', 480, 306);
  ctx.textAlign = 'left';
}

export { PLOT_R };
