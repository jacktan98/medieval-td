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
import { solo, VILLAGER_RUN, VILLAGER_NOOO } from './audio.js';
import { starsFor } from './score.js';

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
    ...(play ? { live: true, n: i, side: play.before[i] || 'front', pose: 'standing',
                 flip: false, mode: 'idle', path: null, leg: 0, greetUntil: -1 } : {})
  }));
  state.villagerPlay = play ? { plan: play, started: false, t: 0, hops: play.hops.map(() => ({ n: 0, at: null })),
    startLives: level.startLives, stars: null, shouted: false } : null;
}

// --- villagers who move ----------------------------------------------------------
//
// ON THE BOARDS THAT SET `villagerPlay`, and only there: the painted villagers are
// cut out of the artwork (tools/split-map.mjs) and drawn by the game from the
// owner's drawings in assets/villagers — six poses, each facing the player
// ("front") or turned away ("back"). Every drawing faces LEFT, like every figure in
// the game; one facing right is the same drawing mirrored.
export const VILLAGER_POSE = {
  // One shared box for every pose, so a change of pose never moves the figure: all
  // twelve stand on the same ground shadow, centred at (258, 305) on the 512 canvas.
  trim: [206, 176, 96, 142],
  pivot: [(258 - 206) / 96, (305 - 176) / 142],
  // The greeting hand, which waves: a circle round it on the 512 canvas, and the
  // shoulder it swings from.
  hand: { x: 227, y: 249, r: 11, px: 241, py: 256 }
};

// A board's script. `before` is which way each villager faces until the first enemy
// of the first wave appears. Then `run` sends some of them off along a path of
// points, and `after` is which way each faces from then on. `hops` is who hops and
// lands, one after another, each time `every` more enemies have fallen.
const PLAYS = {
  oakhaven: {
    before: ['front', 'back', 'back', 'front', 'front'],
    // VILLAGERS 1 AND 2 RUN TO THE ROAD, to the grass just under it beside the
    // exit flag, at the owner's word: down past the log, along the bottom of the
    // village below both houses and the plot, then up to the road's edge.
    //
    // ROUND THE ROCK, not over it: the grey boulder by the plot at the left
    // (about x 270-297, y 455-471) is passed underneath by both, the first a
    // dozen pixels below it and the second further out. Grass tufts they step over.
    run: [
      { who: 0, delay: 0,
        path: [[205, 400], [238, 448], [262, 478], [300, 486], [330, 492], [430, 497], [525, 514], [630, 512],
               [790, 498], [840, 482], [872, 468]] },
      { who: 1, delay: 0.35,
        path: [[190, 432], [228, 475], [270, 494], [330, 503], [430, 505], [530, 520], [630, 518],
               [790, 506], [850, 490], [895, 478]] }
    ],
    // The road is above them all but villagers 4 and 5, who have it below.
    after: ['back', 'back', 'back', 'front', 'front'],
    hops: [{ every: 10, who: [2, 3, 4] }, { every: 12, who: [0, 1] }]
  }
};

const RUN_SPEED = 46;         // px a second
const RUN_UP = 0.05;          // how steeply up a runner must go to show their back
const HOP_GAP = 0.16;         // seconds between one villager's hop and the next's
const HOP_UP = 0.3, HOP_DOWN = 0.2;   // how long the hopping and landing drawings show
const HOPS = 2;                       // hops each time, one straight after the other
export const GREET_SECONDS = 1;       // how long a tapped villager greets the player

// NOW AND THEN, not all the time, and each villager on their own beat: before the
// first wave they greet (GREET_FOR in every GREET_CYCLE seconds); once it has come
// they pray (PRAY_FOR in every PRAY_CYCLE).
const GREET_CYCLE = 8, GREET_FOR = 1.6;
// Praying is the long part — nine seconds of every twelve — so they are not
// forever bobbing up between prayers.
const PRAY_CYCLE = 12, PRAY_FOR = 9;

// A TAP ON A VILLAGER, from src/input.js. One facing the player stops what they are
// doing and greets for a second; one with their back to the player turns round to
// do it. A runner stops mid-stride and then carries on.
export function greetVillager(state, v) {
  const vp = state.villagerPlay;
  if (!vp || !v || !v.live) return;
  v.greetUntil = vp.t + GREET_SECONDS;
}

export function updateVillagers(state, dt) {
  const vp = state.villagerPlay;
  if (!vp) return;
  vp.t += dt;
  const { plan } = vp;

  // THE FIRST ENEMY OF THE FIRST WAVE sends the runners off, and turns everyone to
  // face the way they will watch from now on.
  if (!vp.started && state.enemies.length) {
    vp.started = true;
    for (const v of state.villagers) if (v.live) v.side = plan.after[v.n] || v.side;
    for (const r of plan.run) {
      const v = state.villagers[r.who];
      if (!v) continue;
      v.mode = 'wait';
      v.leaveAt = vp.t + r.delay;
      v.path = r.path;
      v.leg = 0;
    }
  }

  // A STAR LOST — lives dropping below 18 and again below 10 on stage 1's 20 — and
  // the village cries "nooo". Asked of the same rating the result screen uses, so it
  // is exactly the moment a star goes; not at zero, which the lost sound answers.
  const stars = starsFor(state.lives, vp.startLives);
  if (vp.stars !== null && stars < vp.stars && state.lives > 0) solo(VILLAGER_NOOO, true, true, true);
  vp.stars = stars;

  // THE HOPS, each group on its own count of the fallen.
  plan.hops.forEach((h, k) => {
    const n = Math.floor((state.slain || 0) / h.every);
    if (n > vp.hops[k].n) { vp.hops[k].n = n; vp.hops[k].at = vp.t; }
  });

  for (const v of state.villagers) {
    if (!v.live) continue;
    const greeting = vp.t < v.greetUntil;

    if (v.mode === 'wait' && vp.t >= v.leaveAt) {
      v.mode = 'run';
      // "RUNNN", once, as the first of them sets off.
      if (!vp.shouted) { vp.shouted = true; solo(VILLAGER_RUN, true, true, true); }
    }

    if (v.mode === 'run') {
      if (greeting) { v.pose = 'greeting'; v.greetSide = 'front'; continue; }
      const [tx, ty] = v.path[v.leg];
      const dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy);
      const stepLen = RUN_SPEED * dt;
      if (d <= stepLen) {
        v.x = tx; v.y = ty;
        v.leg++;
        if (v.leg >= v.path.length) {
          v.mode = 'idle';
          v.side = plan.after[v.n] || v.side;
          v.flip = false;
        }
      } else {
        v.x += dx / d * stepLen;
        v.y += dy / d * stepLen;
        v.flip = dx > 0;                     // the drawings face left
        // HEADING UP THE SCREEN, THEIR BACKS TO THE PLAYER: once past the lower
        // houses the runners climb towards the flag, and a villager running away
        // from the camera shows their back. Going down or level, their front. Read
        // off the direction of travel, with a little slack so a leg that is level
        // but for a pixel or two does not turn them round.
        v.runSide = dy < -RUN_UP * d ? 'back' : 'front';
      }
      // THE RUNNING DRAWING AND NOTHING ELSE, the whole way.
      if (v.mode === 'run') { v.pose = 'running'; v.greetSide = null; continue; }
    }

    let pose = 'standing';
    if (!vp.started) {
      if ((vp.t + v.n * 2.3) % GREET_CYCLE < GREET_FOR) pose = 'greeting';
    } else if (v.mode === 'idle') {
      if ((vp.t + v.n * 1.9) % PRAY_CYCLE < PRAY_FOR) pose = 'praying';
    }
    plan.hops.forEach((h, k) => {
      const at = vp.hops[k].at;
      const j = h.who.indexOf(v.n);
      if (at === null || j < 0) return;
      // TWICE, hop-land-hop-land, so the player has the time to catch it.
      const t = vp.t - at - j * HOP_GAP;
      if (t < 0 || t >= HOPS * (HOP_UP + HOP_DOWN)) return;
      pose = t % (HOP_UP + HOP_DOWN) < HOP_UP ? 'hopping' : 'landing';
    });
    if (greeting) pose = 'greeting';
    v.pose = pose;
    // A TAPPED villager turns to face the player to greet them.
    v.greetSide = greeting ? 'front' : null;
  }
}

// Which drawing a villager is showing: their own side, or the front while a tap has
// them greeting, or the front while they run.
export function villagerKey(v) {
  const side = v.greetSide || (v.mode === 'run' ? v.runSide || 'front' : v.side);
  return `vill_${side}_${v.pose}`;
}
