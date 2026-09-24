// THE PEOPLE WHO LIVE ON THE BOARD, and the one figure in this game with no part
// in the fight. Nothing shoots him, he blocks nobody, he costs nothing. Tapping him
// opens his card and that is all he does.
//
// HE IS NOT DRAWN BY THIS FILE, AND THAT IS THE WHOLE DESIGN. He is painted into
// every stage's artwork and stays there — the base the game loads has him in it, in the
// pose the artist drew, exactly, forever. What this file holds is WHERE he is, so a
// tap can find him, and WHO he is, so the panel can say.
//
// IT WAS THE OTHER WAY ROUND FOR ONE BUILD and the owner's verdict was "it's bad".
// He was cut out of the base, drawn live, and would run to a doorway and vanish
// when tapped. The running is gone at his word — "remove the running completely but
// the player can still select each villager... Do not change the villager original
// 'pose'" — and once nothing about him moves, cutting him out is all cost: a second
// copy of a drawing, a mirror that can be the wrong way round, an anchor that can
// drift, and a cutting window that took a log out of the campfire the first time it
// ran. A painted figure has none of those failures available to it.
//
// SO THE LIVE HALF IS A POINT AND A NAME. Four fields and no update loop.
import { SCALE } from './data/towers.js';

// THE MAN HIMSELF, as a def, because that is the shape the rest of the game expects
// a figure to be: `pickFigure` reads `def.r` and `def.spriteTrim`, and the info
// panel reads `def.name` and `def.sprite`. A villager with a def is a figure those
// two already know how to handle.
//
// `sprite` and `spriteTrim` ARE FOR THE CARD AND NOTHING ELSE. The panel draws its
// portrait from the same PNG every other portrait comes from; the board draws him
// from the artwork. There is no third place to keep in step.
//
// Trim and pivot measured by tools/trim.mjs and tools/shadow.mjs on the shared 512
// canvas, like every other figure. The pivot is the centre of his ground shadow, so
// the anchors in the level file mean the same thing they mean for a soldier — which
// is what lets the tap box be built off them.
export const VILLAGER = {
  name: 'Villager',
  sprite: 'villager',
  spriteTrim: [213, 198, 86, 116],
  pivot: [0.581, 0.905],
  // His body radius, for the tap box only. Nothing collides with him.
  r: 9
};

// HOW BIG A TAP BOX HE GETS, added either side of his radius. Bigger than a
// soldier's because he is smaller than one and, unlike a soldier, tapping him is the
// ONLY thing he is for — a miss costs the player the whole interaction rather than
// just a card they can open another way.
export const TAP_PAD = 10;

// AND HOW TALL HIS BOX IS, in game px: his own drawing at the shared scale. Derived
// rather than typed, so a re-export of the PNG moves the box with the picture.
export const VILLAGER_H = VILLAGER.spriteTrim[3] * SCALE;

// Built from the level, once, at the start of a game. A board with no `villagers`
// gets an empty list and nothing anywhere else has to ask whether it has any.
//
// NOTHING BUT A POSITION. No facing, no speed, no destination and no flag — every
// one of those was here a build ago and every one of them was a thing that could be
// wrong about a man who does not move.
export function makeVillagers(state, level) {
  const play = level.villagerPlay && PLAYS[level.villagerPlay];
  state.villagers = (level.villagers || []).map((v, i) => ({
    def: VILLAGER, x: v.x, y: v.y,
    // ON A BOARD THAT LETS THEM MOVE, each carries what it is doing. See PLAYS.
    ...(play ? { live: true, n: i, side: 'front', pose: 'standing', flip: false,
                 mode: 'idle', path: null, leg: 0 } : {})
  }));
  state.villagerPlay = play ? { plan: play, started: false, t: 0, hops: 0, hopAt: null } : null;
}

// --- villagers who move ----------------------------------------------------------
//
// ON THE BOARDS THAT SET `villagerPlay`, and only there: the painted villagers are
// cut out of the artwork (tools/split-map.mjs) and drawn by the game from the
// owner's ten drawings in assets/villagers — five poses, each facing the player
// ("front") or turned away ("back"). Every drawing faces LEFT, like every figure
// in the game; one facing right is the same drawing mirrored.
//
// WHICH WAY A VILLAGER FACES is which way the danger is. On Oakhaven the road runs
// across the top of the village, so the three who gather by the lower houses turn
// their backs to the player to watch it; the two up at the top right have the road
// below them and face the player.
export const VILLAGER_POSE = {
  // One shared box for every pose, so a change of pose never moves the figure: all
  // ten stand on the same ground shadow, centred at (258, 305) on the 512 canvas.
  trim: [206, 176, 96, 142],
  pivot: [(258 - 206) / 96, (305 - 176) / 142]
};

// A board's script. `run` is who runs where when the first enemy of the first wave
// appears: each runner follows its own path of points and ends at `spot`, beside
// `to`. `back` is who turns to face the road then; `watch` is who faces the player
// throughout.
const PLAYS = {
  oakhaven: {
    // Villagers 1 and 2 by the campfire run to villager 3 by the lower houses —
    // DOWN AND ROUND, not straight at the first house: south past the log, along
    // the bottom of the village below the house and the grey rock, then in.
    run: [
      { who: 0, delay: 0,
        path: [[200, 398], [250, 450], [330, 488], [425, 488], [476, 463]] },
      { who: 1, delay: 0.35,
        path: [[190, 432], [245, 470], [330, 496], [425, 494], [457, 465]] }
    ],
    back: [0, 1, 2],
    watch: [3, 4]
  }
};

const RUN_SPEED = 46;         // px a second
const STRIDE = 0.13;          // seconds a running step lasts
const KILLS_PER_HOP = 10;     // the villagers hop together each time this many fall
const HOP_GAP = 0.16;         // seconds between one villager's hop and the next's
const HOP_UP = 0.3, HOP_DOWN = 0.2;   // how long the hopping and landing drawings show

// Three of them praying with their backs to the player, taking turns: each is
// PRAY_BACK seconds standing and PRAY_BACK praying, a little out of step with the
// next. The two who face the player pray now and then: WATCH_PRAY in every
// WATCH_CYCLE seconds.
const PRAY_BACK = 2.2;
const WATCH_CYCLE = 7, WATCH_PRAY = 1.8;

export function updateVillagers(state, dt) {
  const vp = state.villagerPlay;
  if (!vp) return;
  vp.t += dt;
  const { plan } = vp;

  // THE FIRST ENEMY OF THE FIRST WAVE sends the runners off.
  if (!vp.started && state.enemies.length) {
    vp.started = true;
    for (const r of plan.run) {
      const v = state.villagers[r.who];
      if (!v) continue;
      v.mode = 'wait';
      v.leaveAt = vp.t + r.delay;
      v.path = r.path;
      v.leg = 0;
    }
    for (const i of plan.back) {
      const v = state.villagers[i];
      if (v && v.mode === 'idle') v.side = 'back';
    }
  }

  // EVERY TENTH KILL, a hop down the line.
  const hops = Math.floor((state.slain || 0) / KILLS_PER_HOP);
  if (hops > vp.hops) { vp.hops = hops; vp.hopAt = vp.t; }

  for (const v of state.villagers) {
    if (!v.live) continue;

    if (v.mode === 'wait' && vp.t >= v.leaveAt) v.mode = 'run';

    if (v.mode === 'run') {
      const [tx, ty] = v.path[v.leg];
      const dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy);
      const stepLen = RUN_SPEED * dt;
      if (d <= stepLen) {
        v.x = tx; v.y = ty;
        v.leg++;
        if (v.leg >= v.path.length) { v.mode = 'idle'; v.side = 'back'; v.flip = false; }
      } else {
        v.x += dx / d * stepLen;
        v.y += dy / d * stepLen;
        // FRONT while running: they are running down the board, towards the player.
        v.side = 'front';
        v.flip = dx > 0;                     // the drawings face left
      }
      v.pose = v.mode === 'run' && Math.floor(vp.t / STRIDE) % 2 === 0 ? 'running' : 'standing';
      continue;
    }

    // Standing, praying, or hopping.
    let pose = 'standing';
    if (plan.watch.includes(v.n)) {
      const c = (vp.t + v.n * 2.9) % WATCH_CYCLE;
      if (c < WATCH_PRAY) pose = 'praying';
    } else if (vp.started && v.side === 'back') {
      const c = (vp.t + v.n * 0.9) % (PRAY_BACK * 2);
      if (c >= PRAY_BACK) pose = 'praying';
    }
    if (vp.hopAt !== null) {
      const h = vp.t - vp.hopAt - v.n * HOP_GAP;
      if (h >= 0 && h < HOP_UP) pose = 'hopping';
      else if (h >= HOP_UP && h < HOP_UP + HOP_DOWN) pose = 'landing';
    }
    v.pose = pose;
  }
}
