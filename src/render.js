import { plots } from './data/level01.js';
import { waves } from './data/waves.js';
import { SCALE, arrow } from './data/towers.js';
import { art } from './assets.js';
import { towerBox, mountPoint, muzzlePoint, facing, mirror } from './towers.js';
import { BTN_R, CANCEL_R, canUse } from './menu.js';

const PLOT_R = 30;

// Draws a red dot at each tower's firing origin. Off by default; add ?muzzle
// to the URL to switch it on, so offsets can be checked on a phone without
// editing a file and redeploying.
// Guarded so this module can be imported by the node tools, which need ROAD_W
// and have no `location`. Duplicating that constant in a tool is how it drifts.
const DEBUG_MUZZLE = typeof location !== 'undefined' &&
  new URLSearchParams(location.search).has('muzzle');

export function draw(ctx, state) {
  ctx.clearRect(0, 0, 960, 540);

  drawGround(ctx);
  drawPlots(ctx, state);
  drawTowers(ctx, state);
  drawEnemies(ctx, state);
  drawUnits(ctx, state);
  drawShots(ctx, state);
  drawHits(ctx, state);
  drawHud(ctx, state);
  drawMenu(ctx, state);

  if (state.result) drawResult(ctx, state);
}

// The painted board. The road, the ground and the plot markers all live in this
// one image now, so nothing here draws them.
//
// It is stretched to the full 960x540 rather than letter-boxed: the artwork is
// authored at exactly 16:9 against this coordinate space, so any mismatch is a
// bug in the export rather than something to paper over at draw time. If the
// image is missing, fall back to flat ground — the game stays playable and the
// console says which file did not load.
function drawGround(ctx) {
  const img = art.map01;
  if (img) {
    ctx.drawImage(img, 0, 0, 960, 540);
    return;
  }
  ctx.fillStyle = '#4A5744';
  ctx.fillRect(0, 0, 960, 540);
}

// Width of the painted road, measured off the artwork rather than chosen: the
// map was rasterised and this is twice the largest distance from any road pixel
// to the grass, so it is the true width of the widest part of the band.
//
// Nothing draws a road with it any more. It survives because tools/formation.mjs
// uses it to check the barracks squad stands on the road rather than beside it.
export const ROAD_W = 125;

// NOTHING ON THE GROUND IS DRAWN IN CODE. The grass, the road, the rocks and
// the grass tufts are all in the artwork now, so the vector trees, rocks and
// keep that used to stand in for them are deleted rather than switched off —
// two sources for the same object is how a map ends up with a code rock sitting
// on a painted one.
//
// The keep is not in the artwork yet, so for now there is simply nothing at the
// end of the road; enemies walk off the right-hand edge. Nothing in the rules
// depended on it — a leak is triggered by running out of path, not by touching
// a building — so it left no hole in the game, only in the picture.
//
// The one exception is the plot marker below, and it is an exception for a
// reason: it has to be able to disappear.

// The artist's plot marker, stamped on every plot that is still empty. Sizes
// come from tools/split-map.mjs, which centres the marker's viewBox on its
// ground ellipse so it can simply be drawn centred here — the signpost sticks
// up out of the top and the padding accounts for it.
//
// Drawing them rather than painting them into the map is the whole point: an
// occupied plot loses its marker, so the signpost stops poking out between a
// watchtower's legs.
// Read the same way as every sprite: a trim rect into the source, drawn at the
// shared SCALE, anchored by a pivot. The pivot is the centre of the ground
// ellipse rather than the middle of the box, because the signpost sticks up out
// of the top — anchoring on the box would bury the ellipse below the plot.
//
// All four numbers come from `node tools/split-map.mjs`, which measures the
// artist's file. It also reports how far off the map's own painted markers this
// draws; at the time of writing, 2.5%.
const MARKER_TRIM = [72, 156, 347, 164];
const MARKER_PIVOT = [0.500, 0.614];
const MARKER_W = MARKER_TRIM[2] * SCALE;
const MARKER_H = MARKER_TRIM[3] * SCALE;

function drawPlots(ctx, state) {
  const img = art.plot_marker;
  if (!img) return;

  const [sx, sy, sw, sh] = MARKER_TRIM;
  for (const p of plots) {
    if (state.towers.some(t => t.plot === p)) continue;
    ctx.drawImage(img, sx, sy, sw, sh,
      p.x - MARKER_PIVOT[0] * MARKER_W, p.y - MARKER_PIVOT[1] * MARKER_H,
      MARKER_W, MARKER_H);
  }
}

// How much a circle lying on the ground is squashed by the viewing angle.
// Anything drawn flat on the ground uses this, so the tower shadows, the range
// rings and anything added later all agree on where the ground plane is.
const SQUASH = 0.62;

function drawTowers(ctx, state) {
  for (const t of state.towers) {
    if (state.menu && state.menu.tower === t) drawRangeDisc(ctx, t);

    const box = towerBox(t);
    drawBuilding(ctx, t, box);
    if (t.def.gunner) drawGunner(ctx, t);
    drawTierStars(ctx, t, box);

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

// The tower's reach, drawn lying on the ground rather than standing up facing
// the camera: same SQUASH as the build plots, a translucent fill so you can see
// which stretch of road it covers, a shadowed rim below and a lit rim on top.
//
// CAVEAT: pickTarget uses a true circle, so the ring under-reads by SQUASH
// straight up and down — an enemy 118px due north of an archery tower is in
// range but outside the drawn ellipse. This is the same trade the plots already
// make (elliptical art, circular tap target). Squashing the target test too
// would cut a tower's covered area by 38% and rebalance the whole game, so the
// picture bends and the rules do not.
function drawRangeDisc(ctx, t) {
  const rx = t.def.range;
  const ry = rx * SQUASH;
  const next = t.fam.tiers[t.def.tier];

  // The reach the upgrade would buy, as a dotted ring outside the solid one.
  //
  // Shown whenever the menu is open, NOT on hover: there is no hover on a
  // phone, and this game is played with a thumb. Anything that only appears
  // under a mouse pointer is invisible to most of the people playing it, so the
  // trigger is "you are looking at this tower's menu" instead.
  //
  // Drawn first so the current range's rim stays the crisper of the two.
  if (next && next.range > t.def.range) {
    const gx = next.range;
    ctx.save();
    ctx.fillStyle = 'rgba(200,240,255,0.07)';
    ctx.beginPath();
    ctx.ellipse(t.x, t.y, gx, gx * SQUASH, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = 'rgba(24,26,20,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(t.x, t.y + 3, gx, gx * SQUASH, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(150,225,255,0.90)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(t.x, t.y, gx, gx * SQUASH, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(240,230,210,0.10)';
  ctx.beginPath();
  ctx.ellipse(t.x, t.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(24,26,20,0.40)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 3, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,247,228,0.72)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(t.x, t.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
}

// Tiers are all drawn at the same size — the art's scale is fixed by the
// export and must not be stretched — so the upgrade reads as stars over the
// roof instead of a bigger building.
function drawTierStars(ctx, t, box) {
  const n = t.def.tier;
  const cx = box.left + box.w / 2;
  const y = box.top - 7;
  const gap = 9;

  for (let i = 0; i < n; i++) star(ctx, cx + (i - (n - 1) / 2) * gap, y, 4);
}

function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#F2C64B';
  ctx.fill();
  ctx.strokeStyle = '#5A4415';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

const OUTLINE = '#22201C';
const DECK_H = 7;      // thickness of the platform slab the gunner stands on

// Lighten (positive) or darken (negative) a #rrggbb by a fraction of full
// range. Saves carrying three shades of every tower colour in the data.
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + 255 * amt)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Real artwork if the tier has any, otherwise the vector building. Families
// get wired up one tier at a time as art arrives, and a PNG that fails to
// load falls back to something drawn rather than to an empty plot.
function drawBuilding(ctx, t, box) {
  const img = t.def.sprite && art[t.def.sprite];
  if (img) {
    const [sx, sy, sw, sh] = t.def.spriteTrim;
    ctx.drawImage(img, sx, sy, sw, sh, box.left, box.top, box.w, box.h);
    return;
  }
  if (t.def.shape === 'camp') drawCamp(ctx, t, box);
  else drawStoneTower(ctx, t, box);
}

// Fallback archery tower, drawn only when the sprite fails to load. Side
// elevation rather than top-down, so it will not match a rotating gunner —
// it exists so a failed image leaves a building rather than bare ground.
function drawStoneTower(ctx, t, box) {
  const stone = t.def.colour;
  const deckTop = box.top + box.h * 0.15;
  const deckBottom = deckTop + DECK_H;
  const bottom = box.top + box.h;

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  // Shaft, wider at the base so it reads as load-bearing.
  const topIn = box.w * 0.13;
  const baseIn = box.w * 0.05;
  ctx.fillStyle = shade(stone, -0.06);
  ctx.beginPath();
  ctx.moveTo(box.left + topIn, deckBottom);
  ctx.lineTo(box.left + box.w - topIn, deckBottom);
  ctx.lineTo(box.left + box.w - baseIn, bottom);
  ctx.lineTo(box.left + baseIn, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Arrow slit, centred on the shaft.
  const slitH = Math.min(14, (bottom - deckBottom) * 0.3);
  ctx.fillStyle = '#3E3E46';
  ctx.fillRect(box.left + box.w / 2 - 2, deckBottom + 9, 4, slitH);

  // Door at the foot.
  ctx.fillStyle = '#3E3E46';
  ctx.fillRect(box.left + box.w / 2 - 6, bottom - 13, 12, 13);
  ctx.strokeRect(box.left + box.w / 2 - 6, bottom - 13, 12, 13);

  // Platform slab, overhanging the shaft on both sides.
  ctx.fillStyle = shade(stone, 0.1);
  ctx.fillRect(box.left, deckTop, box.w, DECK_H);
  ctx.strokeRect(box.left, deckTop, box.w, DECK_H);

  // Merlons at the ends only. The gunner stands in the gap between them, feet
  // on the slab, which is the whole point of drawing the deck at all.
  const mw = box.w * 0.27;
  const mh = box.h * 0.15;
  ctx.fillStyle = stone;
  ctx.fillRect(box.left, deckTop - mh, mw, mh);
  ctx.strokeRect(box.left, deckTop - mh, mw, mh);
  ctx.fillRect(box.left + box.w - mw, deckTop - mh, mw, mh);
  ctx.strokeRect(box.left + box.w - mw, deckTop - mh, mw, mh);
}

// Barracks: a timber hall under a pitched roof. No gunner, so nothing has to
// line up with the roofline.
function drawCamp(ctx, t, box) {
  const wall = t.def.colour;
  const bottom = box.top + box.h;
  const eaves = box.top + box.h * 0.46;

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  // Walls.
  ctx.fillStyle = shade(wall, 0.04);
  ctx.fillRect(box.left + 4, eaves, box.w - 8, bottom - eaves);
  ctx.strokeRect(box.left + 4, eaves, box.w - 8, bottom - eaves);

  // Roof, overhanging the walls at the eaves.
  ctx.fillStyle = shade(wall, -0.2);
  ctx.beginPath();
  ctx.moveTo(box.left, eaves);
  ctx.lineTo(box.left + box.w / 2, box.top + 3);
  ctx.lineTo(box.left + box.w, eaves);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Doorway.
  const dw = 13;
  const dh = (bottom - eaves) * 0.66;
  ctx.fillStyle = '#3E3E46';
  ctx.fillRect(box.left + box.w / 2 - dw / 2, bottom - dh, dw, dh);
  ctx.strokeRect(box.left + box.w / 2 - dw / 2, bottom - dh, dw, dh);

  // A banner from tier 2, so the upgrade is visible at a glance.
  if (t.def.tier < 2) return;
  const px = box.left + box.w - 7;
  ctx.strokeStyle = OUTLINE;
  ctx.beginPath();
  ctx.moveTo(px, eaves + 2);
  ctx.lineTo(px, box.top - 12);
  ctx.stroke();
  ctx.fillStyle = t.def.tier === 3 ? '#C4A574' : '#8C4A3C';
  ctx.beginPath();
  ctx.moveTo(px, box.top - 12);
  ctx.lineTo(px + 14, box.top - 8);
  ctx.lineTo(px, box.top - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Gunners stay upright and only mirror. The art is drawn standing, so rotating
// it to the aim angle lays the figure on its side; a left/right flip is the
// only orientation that reads correctly for a standing sprite.
//
// The drawn size comes from gunnerR, so the body reads at a known radius
// whatever the source art's proportions are, and it mirrors about the body
// rather than the middle of a box that a bow pulls off-centre.
function drawGunner(ctx, t) {
  const d = t.def;
  const m = mountPoint(t);
  const img = art[d.gunner];

  if (!img) {
    ctx.fillStyle = '#E0D6C2';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }

  const [sx, sy, sw, sh] = d.gunnerTrim;
  const dw = sw * SCALE;
  const dh = sh * SCALE;

  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.scale(mirror(d, facing(t)), 1);
  ctx.translate(-t.recoil * 3, 0);   // kicks backward, opposite the shot
  ctx.drawImage(img, sx, sy, sw, sh, -d.gunnerPivot[0] * dw, -d.gunnerPivot[1] * dh, dw, dh);
  ctx.restore();
}

// Enemies stay upright and only mirror, same rule as the gunners and soldiers.
// They face the way they are walking, which is the direction of the segment
// they are on, so a column marching left is drawn facing left.
function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    const bob = Math.sin(e.t * 9) * 2;
    const img = e.def.sprite && art[e.def.sprite];

    if (!img) {
      ctx.fillStyle = e.def.colour;
      ctx.beginPath();
      ctx.arc(e.x, e.y + bob, e.def.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#22201C';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      const [sx, sy, sw, sh] = e.def.spriteTrim;
      const dw = sw * SCALE;
      const dh = sh * SCALE;
      const dir = e.face;

      ctx.save();
      ctx.translate(e.x, e.y + bob);
      ctx.scale(mirror(e.def, dir), 1);
      ctx.drawImage(img, sx, sy, sw, sh, -e.def.pivot[0] * dw, -e.def.pivot[1] * dh, dw, dh);
      ctx.restore();
    }

    healthBar(ctx, e.x, e.y - e.def.r - 6 + bob, e.def.r, e.hp / e.maxHp);
  }
}

// Sized to the thing it belongs to, and hidden at full health. Fixed-width bars
// over 12px soldiers read as a wall of stripes and hide the fight underneath.
function healthBar(ctx, x, y, r, pct) {
  if (pct >= 1) return;
  const w = Math.max(14, r * 2.6);
  ctx.fillStyle = 'rgba(34,32,28,0.85)';
  ctx.fillRect(x - w / 2, y, w, 4);
  ctx.fillStyle = pct > 0.5 ? '#6BBF59' : '#D4453A';
  ctx.fillRect(x - w / 2 + 1, y + 1, (w - 2) * Math.max(0, pct), 2);
}

// Soldiers stay upright and only mirror, same as the gunners — the art is
// drawn standing, and a standing figure rotated to face north-east is a
// standing figure lying down.
//
// The drawn size comes from the soldier's own radius via bodyFrac, so the
// sprite's body always matches the radius the formation layout and
// tools/formation.mjs use.
function drawSoldier(ctx, u) {
  const s = u.def;
  const img = s.sprite && art[s.sprite];

  if (!img) {
    ctx.fillStyle = s.colour;
    ctx.beginPath();
    ctx.arc(u.x, u.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  const [sx, sy, sw, sh] = s.spriteTrim;
  const dw = sw * SCALE;
  const dh = sh * SCALE;
  const dir = Math.cos(u.face) >= 0 ? 1 : -1;

  ctx.save();
  // Lunge toward the foe on the swing, so a spear thrust reads as a thrust.
  ctx.translate(u.x + dir * u.thrust * s.lunge, u.y);
  ctx.scale(mirror(s, dir), 1);
  ctx.drawImage(img, sx, sy, sw, sh, -s.pivot[0] * dw, -s.pivot[1] * dh, dw, dh);
  ctx.restore();
}

// Countdown ring for a soldier that is dead and coming back, floating off the
// barracks' top-right corner rather than centred on the building.
//
// Centred, the rings sat behind the roof and read as part of the building. Out
// in the air beside it they read as status. They are anchored to the drawn box
// rather than to tower.x/y so they follow the roofline of whatever art a tier
// has, and they hug the corner tightly: at the highest plot the box top is only
// 51px down, and the 40px HUD is waiting just above it.
function musterRing(ctx, u) {
  const box = towerBox(u.tower);
  const cx = box.left + box.w + 2;
  const cy = box.top + 8;
  const r = 4 + u.slot * 3;      // one ring per slot, nested, so three read as three
  const done = 1 - u.respawn / u.def.respawn;

  ctx.strokeStyle = 'rgba(20,22,16,0.30)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(240,230,210,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2);
  ctx.stroke();
}

// Barracks soldiers, plus a muster ring on the barracks for any that are dead.
function drawUnits(ctx, state) {
  for (const u of state.units) {
    if (u.respawn > 0) {
      musterRing(ctx, u);
      continue;
    }

    drawSoldier(ctx, u);
    healthBar(ctx, u.x, u.y - u.def.r - 8, u.def.r, u.hp / u.maxHp);
  }
}

// Arrows are the only sprite that rotates: a projectile has no upright, and it
// has to point where it is flying. The art is drawn pointing left, so the
// rotation is the heading plus a half turn.
function drawShots(ctx, state) {
  const img = art[arrow.sprite];
  const [sx, sy, sw, sh] = arrow.trim;
  const dw = sw * SCALE;
  const dh = sh * SCALE;
  const flip = arrow.faces < 0 ? Math.PI : 0;

  for (const s of state.shots) {
    const a = s.angle || 0;

    if (!img) {
      ctx.strokeStyle = '#F0E6D2';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - Math.cos(a) * 10, s.y - Math.sin(a) * 10);
      ctx.stroke();
      continue;
    }

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(a + flip);
    // Anchored at the head, so the point sits on the target rather than the
    // shaft ending there.
    ctx.drawImage(img, sx, sy, sw, sh, -dw * 0.08, -dh / 2, dw, dh);
    ctx.restore();
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
  // The map artwork paints its own header strip across the top, 50px deep, so
  // the HUD does not paint one. Drawing both left a seam: the translucent bar
  // stopped at 40 and the painted strip carried on to 50 in a warmer brown.
  //
  // Still drawn when the map is missing, because then the text would be sitting
  // on the flat-green fallback with nothing behind it.
  if (!art.map01) {
    ctx.fillStyle = 'rgba(34,32,28,0.75)';
    ctx.fillRect(0, 0, 960, 40);
  }

  // A drop shadow, not decoration. Two things sit behind this text and neither
  // is under our control: the artist's header strip, whose colour changes when
  // the map is redrawn, and the top of any tower built on a high plot, because
  // the HUD draws after the towers. The shadow means neither can make a number
  // unreadable. tools/hud-clear.mjs checks the second case has not got silly.
  ctx.save();
  ctx.shadowColor = 'rgba(12,14,10,0.85)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = '#F0E6D2';
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  ctx.fillText(`Gold ${state.gold}`, 16, 21);
  ctx.fillText(`Lives ${state.lives}`, 150, 21);
  ctx.fillText(`Wave ${Math.min(state.waveIndex + 1, waves.length)} / ${waves.length}`, 280, 21);

  const hint = state.menu
    ? (state.menu.tower ? 'Upgrade or sell' : 'Pick a tower')
    : 'Tap a plot to build';
  // Lifted from #C4A574 to #E8D5B0: the tan was chosen against a near-black
  // strip and only reached about 3:1 on the blue one, which is under the line
  // for text this size.
  ctx.fillStyle = '#E8D5B0';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(hint, 470, 21);
  ctx.restore();
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

  ctx.fillStyle = on ? 'rgba(34,32,28,0.94)' : 'rgba(34,32,28,0.62)';
  ctx.beginPath();
  ctx.arc(it.x, it.y, BTN_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = on ? '#C4A574' : '#5A5348';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.translate(it.x, it.y - 13);
  ctx.strokeStyle = ctx.fillStyle = on ? '#F0E6D2' : '#6E665A';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawGlyph(ctx, it.glyph);
  ctx.restore();

  // Name and price stack INSIDE the circle. Anything hung outside overlapped
  // the neighbouring button and the ground behind it.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = on ? '#F0E6D2' : '#8A8478';
  ctx.font = '700 9px system-ui, sans-serif';
  ctx.fillText(fit(ctx, it.label, BTN_R * 1.85), it.x, it.y + 6);

  const caption = it.gain !== null ? `+${it.gain}g`
                : !it.available ? 'soon'
                : it.cost !== null ? `T${it.tier} ${it.cost}g`
                : '';
  if (caption) {
    ctx.fillStyle = it.gain !== null ? '#6BBF59' : (on ? '#C4A574' : '#6E665A');
    ctx.font = '600 9px system-ui, sans-serif';
    ctx.fillText(caption, it.x, it.y + 18);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
}

// Shrinks a label until it fits the given width, so a longer family name added
// later cannot silently spill out of its button.
function fit(ctx, text, max) {
  if (!text) return '';
  let size = 9;
  while (size > 6 && ctx.measureText(text).width > max) {
    size -= 0.5;
    ctx.font = `700 ${size}px system-ui, sans-serif`;
  }
  return text;
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
