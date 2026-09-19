// The Bomb Thug's two explosions, and the fuse that connects them.
//
// He is the only creature in this game that cannot be traded with. Everything
// else on the road walks up to a soldier and starts a fight you can win or lose
// over several seconds; this one walks up to a soldier and is over. So there is
// no attack drawing on his def and no swing in his code — the blow and the death
// are the same event, and both of them are this file.
//
// TWO WAYS HE GOES OFF, at the owner's brief:
//
//   HE REACHES A MAN. He sets it off himself, everything inside the blast takes
//   the full 120, and he VANISHES — no body and no blood, "as the explosion is
//   too strong". See `detonate` below and the bomb branch in src/units.js.
//
//   HE IS SHOT FIRST. The bomb was never triggered, so it lies where he fell
//   with the fuse still burning and bursts 2 seconds later for exactly the same
//   numbers. He leaves an ordinary body, because that death was an ordinary one.
//   See `dropBomb`, and the `bomb` line beside dropCorpse in src/enemies.js.
//
// ONE BURST FOR BOTH, which is the reason this is a file rather than two hooks.
// The owner gave the second explosion by naming the first — "Same AOE 100,
// physical damage 120, pierce physical damage: 1 rank" — and the way to keep two
// numbers identical is not to type them twice.
//
// NOT THE CAPTAIN'S `sweep`. src/units.js already has an area melee, and it very
// nearly fits: same radius test, same armour, same pierce. It is not used here
// because it is a SWING — it skips the man being blocked, who has already taken
// the blow on the line above it, and it needs a living enemy to read the damage
// off. A bomb has no blocked man and, half the time, nobody left to swing it.

import { splat } from './blood.js';
import { inRange } from './ground.js';
import { play, BOMB } from './audio.js';
import { impact } from './impacts.js';
import { taken, typeOf, pierceOf, wornBy } from './data/armour.js';
// The one number that turns source px into game px, for `DROP` below.
import { SCALE } from './data/towers.js';
// The throw every body in the game takes from the blow that killed it. Read
// rather than repeated, so the bomb lands beside the body and not beside where
// the body used to be if that number ever changes.
import { KNOCKBACK } from './corpses.js';
import { swing } from './status.js';
// `fixture` is the one thing this file borrows from units.js, and it puts the
// pair in a cycle — the same one enemies.js and units.js have had since they were
// split. Safe for the same reason: nothing here is called while the modules are
// still evaluating, only later, from a frame.
import { fixture } from './units.js';

// How long a dropped bomb lies there, in GAME seconds — so the dashboard's 2x
// halves the real wait, exactly as it halves a corpse's. The owner's number.
//
// It is the same 2 seconds a body stays for, and that is worth knowing rather
// than being a coincidence to tidy up: the two are drawn as one picture at the
// moment he falls, so a fuse that outlived the body would leave the bomb sitting
// on bare road, and one that went first would leave the body reaching for
// nothing. They are independent numbers that happen to agree today; if either
// moves, what changes is which half of the drawing is left over.
export const FUSE = 2;

// How long the burst is on screen, and it goes through the impact system like
// every other picture of something that has just happened — see src/impacts.js.
//
// 0.2 -> 0.3 at the owner's second look, and the longer number is the one that
// works: it is the first mark in the game that outlasts IMPACT_FADE, so it is
// drawn solid for its first 0.05s and fades over the rest. At 0.2 it could never
// once be solid — the renderer's opacity is life over fade — and it read as a
// puff rather than a bang. See the note beside `bomb_blast` in src/impacts.js.
export const FLASH = 0.3;

// WHERE THE BOMB LIES RELATIVE TO THE BODY, in SOURCE px, measured off the
// composite the artist drew rather than chosen.
//
// Enemies_Bomb_Thug_Dead.png is the body and the bomb in one frame, and the
// artist then split it into Enemies_Bomb_Thug_Self.png and
// Enemies_Bomb_Thug_Bomb.png without moving either. So the gap between them is a
// fact about the drawing: the body's own ground shadow is centred at source
// (195.0, 282.5), and the bomb's trim box [280, 231, 70, 64] has its bottom
// middle at (315.0, 295.0). The difference is these two numbers, and drawing the
// pair at that offset reproduces the composite to the pixel.
//
// THE BOMB'S ANCHOR IS THE BOTTOM MIDDLE OF ITS BOX because it is the one part
// of this creature with no ground shadow to read — the artist drew a bomb, not a
// bomb standing somewhere. Any anchor would do so long as the offset matches it;
// this one is the one that needs no explanation on the page it is used.
export const BOMB_TRIM = [280, 231, 70, 64];
export const BOMB_PIVOT = [0.5, 1];
const DROP = [120.0, 12.5];

// A LIVE BOMB ON THE GROUND. `x, y, face` are the ones dropCorpse was handed —
// the spot he was killed on and the side the blow came from — so the two pictures
// are placed from the same three numbers and cannot drift apart.
//
// IT LANDS WHERE THE BODY COMES TO REST, not where the body was killed. A corpse
// is thrown one KNOCKBACK back from the killing blow and slides there over about
// a fifth of a second; the bomb does not move at all. Laying it at the resting
// place means the pair is lined up for the whole of the 2 seconds that matter and
// out by 10px for the sixth of a second the body is still travelling, which is the
// right way round — nobody is looking at a bomb on the frame it appears.
//
// `mirror` IS NOT IMPORTED. The corpse's drawing flips when `face` is not the
// side the art was drawn from, and the bomb has to flip with it or it would be
// standing on the wrong side of the body half the time. That test is
// `face === def.spriteFaces`, and it is written out here rather than imported
// from towers.js because this file has no other business with sprites.
export function dropBomb(state, def, x, y, face) {
  const flip = face === def.spriteFaces ? 1 : -1;
  // `bombs` is made on demand. Every fixture in tools/ builds its own little
  // world by hand and none of them list a field that did not exist when they
  // were written, so a bomb dropped in a check would otherwise take the whole
  // check down with it.
  (state.bombs ||= []).push({
    def,
    x: x - face * KNOCKBACK + flip * DROP[0] * SCALE,
    y: y + DROP[1] * SCALE,
    face,
    fuse: FUSE
  });
}

// THE BURST ITSELF, and it is the same arithmetic every blow in this game goes
// through: the attacker's damage, the attacker's kind, the defender's armour and
// the attacker's pierce, in that order. `def` is the Bomb Thug's own def whether
// he is holding the bomb or lying beside it, which is what makes the two
// explosions identical without either of them naming a number.
//
// EVERYBODY IN REACH, including the man who was blocking him. That is the one
// place this differs from every other area attack in the game, and it is what the
// creature is: there is no "the one he hit" and "the ones nearby", there is a
// radius.
//
// Through `inRange` like every reach in the game, because the board is drawn in
// perspective and a plain radius would catch men further up the screen than down.
//
// `by` IS THE THUG IF HE IS STILL THERE. It goes on the men he kills, which is
// what the boss's kill tally reads — see the death sweep in src/units.js. A
// dropped bomb passes nothing, and that is correct rather than a gap: the thug
// who was carrying it has been dead for two seconds and did not kill anybody.
export function burst(state, def, x, y, damage, by = null) {
  for (const u of state.units) {
    if (u.hp <= 0 || u.respawn > 0 || fixture(u)) continue;
    if (!inRange(x, y, u.x, u.y, def.splash)) continue;
    u.hp -= taken(damage, typeOf(def), wornBy(u), pierceOf(def));
    splat(state, u.x, u.y - u.def.r, u.y);
    u.struckFrom = x >= u.x ? 1 : -1;
    u.killer = by;
  }
  // Category B, at the owner's word — see BOMB in src/audio.js for why that is
  // also the right side of the line for this one.
  play(BOMB);
  impact(state, x, y, 'bomb_blast', FLASH);
}

// HE SETS IT OFF HIMSELF. Called from the counter-attack in src/units.js, on the
// frame a soldier first has hold of him, in place of the swing every other
// creature makes there.
//
// `blown` IS WHAT THE DEATH PATH READS. Taking his health to nothing is not
// enough on its own: the ordinary death in src/enemies.js pays a bounty, plays a
// kill line and lays a body down, and none of those three is right for a man who
// was not killed. One flag, tested in one place — see the `blown` branch beside
// dropCorpse there.
//
// THROUGH `swing`, so a Rally Thug standing over him is worth half again on the
// blast exactly as it is worth half again on a knife. He is a physical striker
// and the aura's rule is every physical striker; the blast is the only blow he
// has, so this is the only place it can land.
export function detonate(state, e) {
  e.hp = 0;
  e.blown = true;
  burst(state, e.def, e.x, e.y, swing(e, e.def.damage), e);
}

export function updateBombs(state, dt) {
  if (!state.bombs || !state.bombs.length) return;
  for (const b of state.bombs) {
    b.fuse -= dt;
    // NO CARRIER, so no rally boost. The Bomb Thug's own blow goes through
    // `swing` like every other physical attack and can be worth half again with a
    // Rally Thug standing over him; this one cannot, because there is nobody left
    // for an aura to be over. See rallyAura in src/enemies.js: it walks the living.
    if (b.fuse <= 0) burst(state, b.def, b.x, b.y, b.def.damage);
  }
  state.bombs = state.bombs.filter(b => b.fuse > 0);
}
