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
  state.villagers = (level.villagers || []).map((v, i) => {
    if (!play) return { def: VILLAGER, x: v.x, y: v.y };
    // ON A BOARD THAT LETS THEM MOVE, each carries what it is doing. See PLAYS.
    const b = play.before[i] || {};
    return { def: VILLAGER, x: v.x, y: v.y, live: true, n: i, side: b.side || 'front',
             act: b.act || null, hidden: !!b.hidden, pose: 'standing', flip: !!b.flip,
             mode: 'idle', path: null, leg: 0, greetUntil: -1 };
  });
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
  // One shared box for every pose, so a change of pose never moves the figure: every
  // drawing stands on a ground shadow centred at (258, 305) on the 512 canvas — all
  // but the two drinking ones, which the artist drew 14px further right, mug and all.
  // `foot` is where each pose's shadow is when it is not (258, 305), and the game
  // stands that point on the villager's anchor, so the drinker does not slide when
  // he lifts the mug and does not stand 3 px off his painted spot.
  trim: [200, 176, 110, 142],
  foot: [258, 305],
  feet: { drinking_1: [272, 305], drinking_2: [272, 305],
          pipe_1: [257, 305], pipe_2: [257, 305],
          // Stage 4's plank carriers are ONE drawing of TWO villagers and their plank,
          // stood on the back-end man's shadow; the front-end man's is PAIR further on.
          carry: [124.5, 341.5], throw: [124.5, 341.5] },
  // And the poses whose drawing does not fit the shared box.
  trims: { pipe_1: [200, 176, 140, 142], pipe_2: [200, 176, 140, 142],
           carry: [85, 155, 340, 200], throw: [85, 155, 340, 200] },
  // The greeting hand, which waves: a circle round it on the 512 canvas, and the
  // shoulder it swings from.
  hand: { x: 227, y: 249, r: 11, px: 241, py: 256 }
};

// Where the front-end carrier stands against the back-end one, in game px — the two
// shadows in the carrying drawing, (124.5, 341.5) and (386.5, 268.5), at SCALE.
export const PAIR = [(386.5 - 124.5) * SCALE, (268.5 - 341.5) * SCALE];
// Where the plank is in the carrying drawing (its middle), and in its own drawing.
export const PLANK_HELD = [265, 241];
export const PLANK_MID = [256, 255];

// WHAT A VILLAGER DOES WHILE STANDING, each on their own beat: `pose` for `for`
// seconds in every `every`, and `rest` the rest of the time.
//   greet  — now and then (stage 1, before the first wave).
//   greets — standing and greeting by turns (stage 2).
//   pray   — the long part is the praying, thirteen seconds in eighteen, so they are
//            not forever bobbing up between prayers.
//   drink  — the mug held, then tipped up; no standing drawing at all. Four seconds
//            holding and two and a half drinking.
// Both were half as long again as this until the owner asked for them to last
// longer.
const ACTS = {
  greet:  { rest: 'standing',   pose: 'greeting',   every: 8,  for: 1.6 },
  greets: { rest: 'standing',   pose: 'greeting',   every: 5,  for: 2 },
  pray:   { rest: 'standing',   pose: 'praying',    every: 18, for: 13 },
  drink:  { rest: 'drinking_1', pose: 'drinking_2', every: 6.5, for: 2.5 }
};

// A board's script, villager by villager in the level's order. `before` is how each
// stands until the first enemy of the first wave appears — which way they face, what
// they do, and whether they are out of sight — and `after` is the same from then on.
// At that moment `run` sends some of them off along a path of points (from `from`,
// if they were out of sight), each `delay` seconds after it. `hops` is who hops and
// lands, twice, one after another, each time `every` more enemies have fallen.
// `flip` mirrors a villager, facing right instead of left, in everything they do —
// the greeting a tap asks for included. `cries` is which of the village's two shouts
// the board has: "runnn" as the first runner sets off, "nooo" as a star is lost.
const front = act => ({ side: 'front', act }), back = act => ({ side: 'back', act });
const mirrored = act => ({ side: 'front', act, flip: true });
const PLAYS = {
  oakhaven: {
    before: [front('greet'), back('greet'), back('greet'), front('greet'), front('greet')],
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
    after: [back('pray'), back('pray'), back('pray'), front('pray'), front('pray')],
    hops: [{ every: 10, who: [2, 3, 4] }, { every: 12, who: [0, 1] }],
    cries: { runnn: true, nooo: true }
  },
  // STAGE 2, Oakhaven Outskirts, left to right: 1 at the well, 2 by the tavern wall,
  // 3 with his mug by the tavern steps and 4 beside him — who, before the first
  // wave, is inside the tavern and cannot be seen.
  outskirts: {
    // Villager 1 faces the player, mirrored, at the owner's word.
    before: [mirrored('greets'), front('greets'), front('drink'), { side: 'front', hidden: true }],
    // VILLAGER 4 RUNS OUT OF THE TAVERN, out of the door in its right-hand wall and
    // down over the stepping stones to stand beside villager 3.
    run: [
      { who: 3, delay: 0.4, from: [716, 260], path: [[734, 272], [760, 283], [780, 276]] }
    ],
    after: [mirrored('pray'), front('pray'), front('drink'), front('pray')],
    hops: [{ every: 10, who: [0, 1] }, { every: 12, who: [3] }],
    cries: { runnn: false, nooo: true }
  },
  // STAGE 3, Winchester Entrance, left to right: 1 and 2 on the statue's plaza, 3 on
  // the green below it, 4 between the two bottom-right houses, 5 at the top behind
  // the barricade.
  winchester: {
    before: [front('greets'), front('greets'), back('greets'), back('greets'), front('greets')],
    run: [
      // VILLAGER 3 GOES UP ONTO THE PLAZA, over its front corner, to stand beside
      // villager 2 by the statue — turning to face the player.
      { who: 2, delay: 0, path: [[490, 352], [462, 322], [447, 305]] },
      // VILLAGER 5 GOES WIDE ROUND THE BARRICADE'S RIGHT-HAND END, along the owner's
      // arrow: over the top of it, out past its end — clear of the wall, so he never
      // seems to walk through it, and behind a tower on the plot there, which is
      // drawn over him — then down and back in on its near side, in front of the wall,
      // to stand in its shade.
      { who: 4, delay: 0.25, path: [[800, 128], [835, 134], [856, 153], [857, 176], [842, 192], [818, 191]] }
    ],
    after: [front('pray'), front('pray'), front('pray'), back('pray'), front('pray')],
    hops: [{ every: 10, who: [0, 1, 3] }, { every: 12, who: [2, 4] }],
    cries: { runnn: false, nooo: true }
  },
  // STAGE 4, the lumber yard: villagers AT WORK, who take no notice of the waves at
  // all — no greeting, praying or hopping. See work() below.
  lumberyard: {
    work: true,
    // The smith at the forge, pushing a steel pipe into the fire and drawing it
    // back: pipe_1 (drawn back) and pipe_2 (in the fire) by turns. He stands `at`,
    // up to the fire and behind the workbench, rather than where he was painted.
    smith: { who: 0, at: [578, 431], back: 3.2, in: 2 },
    // The two plank carriers, `lead` the back end (whose feet the carrying drawing
    // stands on) and `mate` the front end.
    crew: {
      lead: 2, mate: 1,
      // They carry the plank up to the stack, stopping in front of it...
      stack: [476, 452],
      // ...throw it, and it lands on the top of the stack...
      landing: [508, 384],
      // ...then walk off, each on their own, towards the cut trees at the bottom and
      // off the board between them — the back end left of the middle stump gap, the
      // front end right of it...
      away: { lead: [[470, 490], [480, 570]], mate: [[522, 478], [522, 570]] },
      // ...and after `gone` seconds come back, carrying the next plank, from where
      // they left: the back end's feet from here.
      enter: [480, 582],
      gone: 3
    },
    before: [], after: [], run: [], hops: [],
    cries: { runnn: false, nooo: true }
  }
};

const WORK_WALK = 11;         // px a second, carrying or not — "slowly"
const THROW_FOR = 0.9;        // how long the throwing drawing shows
const PLANK_AT = 0.12;        // into the throw when the plank leaves their hands
const PLANK_FLIGHT = 0.75;    // and how long it is in the air
const PLANK_LOB = 22;         // how high it rises above the straight line

// Along a list of points at `speed`, from wherever `v` is. True when there.
function walkTo(v, pts, speed, dt) {
  let step = speed * dt;
  while (step > 0 && v.leg < pts.length) {
    const [tx, ty] = pts[v.leg];
    const dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy);
    if (d <= step) { v.x = tx; v.y = ty; v.leg++; step -= d; continue; }
    v.x += dx / d * step; v.y += dy / d * step; step = 0;
  }
  return v.leg >= pts.length;
}

// THE WORK LOOP, from the first frame to the last, whatever the waves are doing.
//   carry — the pair walks the plank up to the stack (from the painted spot the
//           first time, from off the bottom of the board every time after);
//   throw — they heave it, and it flies in a lob onto the stack and is gone;
//   away  — the two walk off separately, standing, towards the cut trees and off
//           the board;
//   gone  — out of sight for `gone` seconds, and round again.
function work(state, vp, dt) {
  const { smith, crew } = vp.plan;

  // THE SMITH: drawn back, then in the fire; the fire flares while the pipe is in.
  const s = state.villagers[smith.who];
  if (s) {
    const k = vp.t % (smith.back + smith.in);
    const inFire = k >= smith.back;
    s.pose = inFire ? 'pipe_2' : 'pipe_1';
    [s.x, s.y] = smith.at;
    // THE FIRE FOLLOWS THE PIPE: small while it is drawn back, roaring while it is
    // in. Quick to flare and slower to die down, so it swells rather than blinks.
    const target = inFire ? 1 : 0;
    const rate = inFire ? 6 : 3;
    vp.heat = (vp.heat || 0) + (target - (vp.heat || 0)) * Math.min(1, rate * dt);
  }

  const lead = state.villagers[crew.lead], mate = state.villagers[crew.mate];
  if (!lead || !mate) return;
  const c = vp.crew || (vp.crew = { phase: 'carry', at: vp.t, planks: [] });
  vp.planks = c.planks;
  const stick = () => { mate.x = lead.x + PAIR[0]; mate.y = lead.y + PAIR[1]; };

  if (c.phase === 'carry') {
    lead.hidden = mate.hidden = false;
    mate.ride = true;
    lead.pose = 'carry';
    lead.leg = lead.leg || 0;
    if (walkTo(lead, [crew.stack], WORK_WALK, dt)) { c.phase = 'throw'; c.at = vp.t; c.thrown = false; }
    stick();
    lead.walking = c.phase === 'carry';
  } else if (c.phase === 'throw') {
    lead.pose = 'throw'; lead.walking = false;
    stick();
    const k = vp.t - c.at;
    if (!c.thrown && k >= PLANK_AT) {
      c.thrown = true;
      const k0 = SCALE;
      c.planks.push({ x0: lead.x + (PLANK_HELD[0] - VILLAGER_POSE.feet.carry[0]) * k0,
                      y0: lead.y + (PLANK_HELD[1] - VILLAGER_POSE.feet.carry[1]) * k0,
                      x1: crew.landing[0], y1: crew.landing[1], at: vp.t, depth: lead.y });
    }
    if (k >= THROW_FOR) {
      c.phase = 'away'; c.at = vp.t;
      mate.ride = false;
      lead.leg = mate.leg = 0;
      lead.pose = mate.pose = 'standing';
      lead.side = mate.side = 'front';
    }
  } else if (c.phase === 'away') {
    lead.walking = mate.walking = true;
    const a = walkTo(lead, crew.away.lead, WORK_WALK, dt);
    const b = walkTo(mate, crew.away.mate, WORK_WALK, dt);
    if (a && b) {
      c.phase = 'gone'; c.at = vp.t;
      lead.hidden = mate.hidden = true;
      lead.walking = mate.walking = false;
    }
  } else if (c.phase === 'gone' && vp.t - c.at >= crew.gone) {
    // BACK FROM WHERE THEY LEFT, with the next plank.
    [lead.x, lead.y] = crew.enter;
    lead.leg = 0;
    c.phase = 'carry'; c.at = vp.t;
    stick();
  }

  // THE PLANKS IN THE AIR: a lob from the carriers' hands to the top of the stack,
  // gone the moment it lands.
  for (const p of c.planks) {
    const q = (vp.t - p.at) / PLANK_FLIGHT;
    p.q = q;
    p.x = p.x0 + (p.x1 - p.x0) * q;
    p.y = p.y0 + (p.y1 - p.y0) * q - PLANK_LOB * 4 * q * (1 - q);
    p.rot = -0.5 * q;
  }
  c.planks = c.planks.filter(p => p.q < 1);
  vp.planks = c.planks;
}

const RUN_SPEED = 46;         // px a second
const RUN_UP = 0.05;          // how steeply up a runner must go to show their back
const HOP_GAP = 0.16;         // seconds between one villager's hop and the next's
const HOP_UP = 0.3, HOP_DOWN = 0.2;   // how long the hopping and landing drawings show
const HOPS = 2;                       // hops each time, one straight after the other
export const GREET_SECONDS = 1;       // how long a tapped villager greets the player

// A TAP ON A VILLAGER, from src/input.js. One facing the player stops what they are
// doing and greets for a second; one with their back to the player turns round to
// do it. A runner stops mid-stride and then carries on.
export function greetVillager(state, v) {
  const vp = state.villagerPlay;
  if (!vp || !v || !v.live || v.hidden) return;
  // At work they carry on working; the tap still opens the card and plays the sound.
  if (vp.plan.work) return;
  v.greetUntil = vp.t + GREET_SECONDS;
}

export function updateVillagers(state, dt) {
  const vp = state.villagerPlay;
  if (!vp) return;
  vp.t += dt;
  const { plan } = vp;

  // A STAR LOST — lives dropping below 18 and again below 10 on stage 1's 20 — and
  // the village cries "nooo". Asked of the same rating the result screen uses, so it
  // is exactly the moment a star goes; not at zero, which the lost sound answers.
  const stars = starsFor(state.lives, vp.startLives);
  if (plan.cries.nooo && vp.stars !== null && stars < vp.stars && state.lives > 0) solo(VILLAGER_NOOO, true, true, true);
  vp.stars = stars;

  if (plan.work) { work(state, vp, dt); return; }

  // THE FIRST ENEMY OF THE FIRST WAVE sends the runners off, and turns everyone to
  // face the way they will watch from now on.
  if (!vp.started && state.enemies.length) {
    vp.started = true;
    for (const v of state.villagers) {
      const a = plan.after[v.n];
      if (v.live && a) { v.side = a.side; v.act = a.act; v.flip = !!a.flip; }
    }
    for (const r of plan.run) {
      const v = state.villagers[r.who];
      if (!v) continue;
      v.from = r.from || null;
      v.mode = 'wait';
      v.leaveAt = vp.t + r.delay;
      v.path = r.path;
      v.leg = 0;
    }
  }

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
      // OUT OF SIGHT UNTIL NOW: they step out where `from` says — a doorway.
      if (v.from) { [v.x, v.y] = v.from; v.hidden = false; }
      // "RUNNN", once, as the first of them sets off.
      if (plan.cries.runnn && !vp.shouted) { vp.shouted = true; solo(VILLAGER_RUN, true, true, true); }
    }
    if (v.hidden) continue;

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
          const a = plan.after[v.n];
          if (a) { v.side = a.side; v.act = a.act; }
          v.flip = !!(a && a.flip);
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
    const act = ACTS[v.act];
    if (act && v.mode === 'idle') {
      pose = (vp.t + v.n * 2.3) % act.every < act.for ? act.pose : act.rest;
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
  // The work drawings have no front and back: one each.
  if (WORK_ART[v.pose]) return WORK_ART[v.pose];
  const side = v.greetSide || (v.mode === 'run' ? v.runSide || 'front' : v.side);
  return `vill_${side}_${v.pose}`;
}
const WORK_ART = { carry: 'vill_carrying_wood_plank', throw: 'vill_throwing_wood_plank',
                   pipe_1: 'vill_holding_steel_pipe_1', pipe_2: 'vill_holding_steel_pipe_2' };
