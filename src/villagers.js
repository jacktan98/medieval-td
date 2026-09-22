// THE PEOPLE WHO LIVE ON THE BOARD, and the first thing in this game that is alive
// without being part of the fight.
//
// At the owner's ask: "if a player clicks each of them, that unit will run off to
// the nearest house with an obvious door... and vanishes."
//
// WHAT A VILLAGER IS NOT, which is most of what this file is. He is not a unit and
// not an enemy, and the temptation to make him one is strong because both lists
// already have movement, drawing, selection and removal written for them. Every one
// of those would have brought a question he has no answer to:
//
//   a UNIT has health, armour, a tower he musters from, a station in a formation, a
//   respawn timer and a rally point, and updateUnits asks about all of them;
//   an ENEMY has a route, a lane, a distance walked, a bounty and a number of lives
//   it takes off the player when it leaks.
//
// He has none of it. He stands where the artist painted him, and if he is tapped he
// walks to a door and is gone. A third list is four fields and forty lines; putting
// him in either of the other two would have been a `villager` test threaded through
// two of the busiest loops in the game, forever.
//
// AND NOTHING HE DOES CAN CHANGE THE FIGHT. No enemy sees him, no tower shoots him,
// he blocks nobody and he costs nothing. That is worth saying plainly because it is
// what makes him safe: every check in this project that asks whether the board is
// fair can ignore this file entirely.
import { art } from './assets.js';
import { SCALE } from './data/towers.js';

// HOW FAST HE GOES, in game px a second.
//
// 110, which is faster than anything else on the board walks — a thug does 60 and
// the quickest soldier 95. That is the point rather than an oversight: the owner's
// word is "run off", and a man who ambles to his door while a wave is coming reads
// as a man who has not understood the situation.
const SPEED = 110;

// HOW CLOSE TO THE DOORWAY COUNTS AS THROUGH IT. Two pixels: near enough that the
// last step is not visible as a step, far enough that a frame's movement at SPEED
// cannot overshoot and leave him circling the threshold forever.
const ARRIVED = 2;

// THE MAN HIMSELF, as a def, because that is the shape everything else in the game
// expects a figure to be — `pickFigure` reads `def.r` and `def.spriteTrim`, the info
// panel reads `def.name` and `def.sprite`, and the draw reads the trim and pivot. A
// villager with a def is a figure those three can already handle; a villager with
// four loose fields would need each of them taught about him.
//
// Trim and pivot measured by tools/trim.mjs and tools/shadow.mjs, on the shared 512
// canvas, like every other figure. The pivot is the centre of his ground shadow, so
// "where a villager is" means the same thing it means for a soldier.
export const VILLAGER = {
  name: 'Villager',
  sprite: 'villager',
  spriteTrim: [213, 198, 86, 116],
  pivot: [0.581, 0.905],
  // WHICH WAY THE ARTIST DREW HIM, on the same convention as every soldier: -1
  // means the drawing faces left, so it is mirrored when he is going right. It
  // matters here more than usual — he is a cut-out of a figure that is still
  // painted on every OTHER board, so getting it wrong would show up as stage 1's
  // villagers facing the opposite way from stage 5's.
  spriteFaces: -1,
  // His body radius, for the tap box only. Nothing collides with him.
  r: 9
};

// HOW BIG A TAP BOX HE GETS, added either side of his radius. Bigger than a
// soldier's because he is smaller than one and, unlike a soldier, tapping him is the
// ONLY thing he is for — a miss costs the player the whole interaction rather than
// just a card they can open another way.
export const TAP_PAD = 10;

// --- the list ------------------------------------------------------------------

// Built from the level, once, at the start of a game. A board with no `villagers`
// gets an empty list and nothing anywhere else has to ask whether it has any.
//
// `door` is an INDEX into the level's `doors` rather than a point copied onto each
// man, so the three who share a doorway share it in the data as well. A villager
// whose index is out of range keeps no door and simply cannot be sent, which is the
// quiet failure rather than a crash on a board somebody is still drawing.
export function makeVillagers(state, level) {
  state.villagers = (level.villagers || []).map(v => {
    const door = (level.doors || [])[v.door];
    return {
      def: VILLAGER,
      x: v.x,
      y: v.y,
      // WHERE HE IS GOING, resolved now rather than looked up every frame. It also
      // means the level's tables are read exactly once a game.
      door: door ? { x: door.x, y: door.y } : null,
      // NOT YET. He stands still until he is tapped.
      going: false,
      // +1 drawn facing right, -1 left, on the soldiers' convention. He starts
      // facing the way the artist drew him and turns when he sets off.
      face: -1
    };
  });
}

// TAPPED. Nothing happens to a villager who is already running, so a second tap on
// a man in motion is not a second start — it re-selects him and that is all.
export function sendVillager(v) {
  if (v.going || !v.door) return;
  v.going = true;
  v.face = v.door.x >= v.x ? 1 : -1;
}

// Straight at the door, and through it.
//
// A STRAIGHT LINE AND NOT A PATH, which is a decision rather than a shortcut. There
// is nothing on this board for him to walk around: the houses he crosses are drawn
// BEHIND him or in front of him by the same depth sort every figure uses, so a man
// who cuts the corner of a wall passes behind it and looks like a man passing behind
// it. Pathfinding would buy nothing that the artist's own layering does not already
// give for free.
export function updateVillagers(state, dt) {
  const list = state.villagers;
  if (!list || !list.length) return;

  for (let i = list.length - 1; i >= 0; i--) {
    const v = list[i];
    if (!v.going) continue;

    const dx = v.door.x - v.x, dy = v.door.y - v.y;
    const d = Math.hypot(dx, dy);
    if (d <= ARRIVED) {
      // THROUGH THE DOOR AND GONE. Removed from the list rather than hidden, so
      // `validate` in src/select.js drops a selection on him on the next frame
      // without anything here knowing that the panel exists.
      list.splice(i, 1);
      continue;
    }

    const step = Math.min(SPEED * dt, d);
    v.x += (dx / d) * step;
    v.y += (dy / d) * step;
  }
}

// --- drawing -------------------------------------------------------------------

// One villager, at his own anchor, mirrored by the way he is going.
//
// Called from the depth pass in src/render.js with his `y` as the sort key, so he
// goes behind a house he is above and in front of one he is below — the same rule
// every soldier and every thug on the board is sorted by.
export function drawVillager(ctx, v) {
  const img = art[VILLAGER.sprite];
  if (!img) return;

  const [sx, sy, sw, sh] = VILLAGER.spriteTrim;
  const dw = sw * SCALE, dh = sh * SCALE;

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.scale(v.face === VILLAGER.spriteFaces ? 1 : -1, 1);
  ctx.drawImage(img, sx, sy, sw, sh,
    -VILLAGER.pivot[0] * dw, -VILLAGER.pivot[1] * dh, dw, dh);
  ctx.restore();
}
