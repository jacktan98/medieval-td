import { art } from './assets.js';
import { path, plots, keep } from './data/level01.js';
import { waves } from './data/waves.js';

const PLOT_R = 30;
const DEBUG_MUZZLE = true;   // set false once the sprites look right

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
    if (t === state.selected) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.def.range, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Placeholder building. Swap for drawImage once sprites are cut.
    const w = t.def.w * 0.5;
    const h = t.def.h * 0.5;
    ctx.fillStyle = ['#9C7248', '#7A5230', '#B8B2A4'][t.def.tier - 1];
    ctx.fillRect(t.x - w / 2, t.y - h + 12, w, h);
    ctx.strokeStyle = '#22201C';
    ctx.lineWidth = 2;
    ctx.strokeRect(t.x - w / 2, t.y - h + 12, w, h);

    drawGunner(ctx, t);
  }
}

// The rotating element. Draws the gunner sprite if loaded, otherwise the
// grey-box rectangle so a missing file doesn't hide the tower.
function drawGunner(ctx, t) {
  const [mx, my] = t.def.mount;
  const left = t.x - t.def.w / 2;
  const top = t.y - t.def.h + 18;

  ctx.save();
  ctx.translate(left + mx, top + my);
  ctx.rotate(t.aim);
  ctx.translate(-t.recoil * 4, 0);

  const img = art[t.def.gunner];
  if (img) {
    ctx.drawImage(img, -t.def.gw / 2, -t.def.gh / 2, t.def.gw, t.def.gh);
  } else {
    ctx.fillStyle = '#E0D6C2';
    ctx.fillRect(-8, -7, 16, 14);
    ctx.strokeStyle = '#22201C';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -7, 16, 14);
  }

  if (DEBUG_MUZZLE) {
    const [ox, oy] = t.def.muzzle;
    ctx.fillStyle = '#D4453A';
    ctx.beginPath();
    ctx.arc(ox, oy, 3, 0, Math.PI * 2);
    ctx.fill();
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

  const hint = state.selected
    ? (state.selected.def.tier < 3
        ? `Tap again to upgrade — ${nextCost(state.selected)}g`
        : 'Max tier')
    : 'Tap a ring to build — 70g';
  ctx.fillStyle = '#C4A574';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(hint, 470, 21);
}

function nextCost(t) {
  return t.def.tier === 1 ? 90 : 140;
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
