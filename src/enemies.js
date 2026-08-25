import { level, remaining } from './level.js';
import { at as pointOn, laneOf, randomLane, nearestOn } from './route.js';
import { enemyTypes } from './data/waves.js';
import { dropCorpse } from './corpses.js';
import { unhook } from './units.js';
import { inRange } from './ground.js';
import { SCALE } from './data/towers.js';
import { solo, play, CUE, SHOT } from './audio.js';

// Which road, and which side of it. Two decisions made once, on the way in,
// and then kept for the figure's whole life.
//
// The lane is what stops a wave reading as a snake. Enemies used to file down
// the exact centreline one behind another; now each one walks its own side of
// the road, so a column arrives loose and ragged the way a body of men actually
// would. It is three lanes per road — near kerb, middle, far kerb — so a map
// with two roads in has six ways for an enemy to arrive.
export function spawn(state, typeId) {
  const def = enemyTypes[typeId];
  const ri = (Math.random() * level.routes.length) | 0;
  const lane = randomLane();
  const road = laneOf(level.routes[ri], lane);
  const at0 = pointOn(road, 0);

  state.enemies.push({
    def,
    route: ri,
    lane,            // which of the three, as an index into LANES
    s: 0,            // distance walked along that lane's own polyline
    x: at0.x,
    y: at0.y,
    hp: def.hp,
    maxHp: def.hp,
    face: 1,         // +1 walking right, -1 left; only the sign is ever drawn
    foe: null,       // the barracks soldier holding it, if any
    acd: 0,          // melee cooldown, only ticks while held
    thrust: 0,       // 1 on the swing, decays; drives the lunge in render.js
    // A thrower's own clock, set on every enemy rather than only on the ones
    // that throw, so the shape of an enemy is written down in one place.
    tcd: 0,          // seconds until the next flask or arrow
    // Standing off to throw rather than walking on: true only while it is
    // happening, and read by leadPoint, which has to know that this figure is
    // not going anywhere. There is no budget beside it any more — see the
    // standoff block in updateEnemies.
    halted: false
  });
}

// Where an enemy will be `t` seconds from now, if nothing interrupts it.
//
// EXACT, not extrapolated. An enemy's position is one number — how far it has
// walked along a known polyline — so "where will it be" is that number plus its
// speed times the time, looked up on the same road. Extrapolating from its
// current heading instead would be right on the straights and wrong at exactly
// the places that matter: on map 1's hairpin a 1.2s lead runs a good 40px off
// the tarmac, which is where a lobbed rock would land.
//
// A HELD ENEMY IS NOT GOING ANYWHERE, so it leads to itself. Without this a
// catapult throws over the head of every enemy a barracks is holding — which is
// most of the ones worth hitting, since a blocked crowd is the crowd a splash is
// for.
//
// Only artillery asks. Arrows steer, so they never need to know.
export function leadPoint(e, t) {
  const road = laneOf(level.routes[e.route], e.lane);
  // TWO WAYS TO STAND STILL, and both of them have to be here or a catapult
  // throws over the head of the one enemy on the board it can most easily hit.
  // Being held is one. Standing off to throw is the other — see the standoff
  // block in updateEnemies.
  const ahead = e.foe || e.halted ? 0 : e.def.speed * t;
  return pointOn(road, e.s + ahead);
}

// LOOK AT SOMETHING, given only its x. `face` is a sign and nothing else — the
// drawings are mirrored, not rotated — so the y never comes into it.
//
// EXACTLY ON TOP OF HIM IS NOT A DIRECTION, and that is the whole reason this is
// a function rather than a line: a figure standing at the same x as its target
// would flip to +1 on the frame the two crossed, and a man who snaps to face
// right at the moment somebody walks through him reads worse than one who keeps
// looking the way he already was. Holding the last heading through the crossing
// is the right answer, and both callers need it: a mark can walk through a
// thrower, and a soldier who has hold of one stands on him by definition.
function turnTo(e, x) {
  if (x !== e.x) e.face = x > e.x ? 1 : -1;
}

export function updateEnemies(state, dt) {
  for (const e of state.enemies) {
    // Decays wherever the enemy is, so a swing that lands just as its holder
    // dies still plays out instead of freezing mid-lunge. Same rate as the
    // soldiers' thrust, so the two sides of a fight move at the same tempo.
    e.thrust = Math.max(0, e.thrust - dt * 4);

    // THE THROWER, and the basket is bottomless.
    //
    // BUT NOT WHILE SOMEBODY HAS HOLD OF HIM. A pinned thrower fights with what
    // is in his hands — the doctor swings the flask, the archer swings the bow —
    // and nothing leaves either of them, which is the owner's rule and also the
    // one the drawings already tell: `melee.attack` is a man hitting the figure
    // in front of him, and a projectile leaving that pose reads as a bug.
    //
    // IT USED TO BE THE OPPOSITE, deliberately: he threw from inside the melee so
    // that blocking him was not a complete answer. What replaces that is his
    // club — 20 for the doctor and 15 for the archer, where the doctor's used to
    // be 5 — so pinning him is still a fight rather than a switch that turns him
    // off. See `damage` on both in data/waves.js.
    if (e.def.ranged && !e.foe) {
      const mark = nearestUnit(state, e.x, e.y, e.def.ranged.range);
      e.tcd -= dt;
      if (mark && e.tcd <= 0) {
        loose(state, e, mark);
        e.tcd = e.def.ranged.cd;
        // Same field the melee lunge uses, so the Attack drawing shows for the
        // throw exactly as long as it shows for a swing. It is also what makes
        // a doctor in close combat read correctly: he lunges as he throws, and
        // the man holding him lunges back on his own clock.
        e.thrust = 1;
      }

      // AND HE TURNS TO SHOOT. Every other figure in the game already faces what
      // it is fighting — a soldier turns to his foe, and so does an enemy the
      // moment one takes hold of him — and the thrower was the one who did not.
      // He faced the ROAD, because the road is the only thing that had ever set
      // an unheld enemy's heading, and a road is not where the men are:
      //
      //   HALTED, he never reaches the movement below at all, so his heading was
      //   frozen at whatever it was when he stopped walking. He stands off from
      //   men who are ahead of him ALONG HIS LANE, which on a bend is not the
      //   same as ahead of him on the screen — so a thrower stopped on a hairpin
      //   would work on a squad standing behind his own shoulder.
      //
      //   WALKING, the road overwrote his heading every frame, and his range
      //   reaches men he has already passed: nearestUnit asks who is nearest,
      //   not who is in front. An arrow leaving the back of a man walking away
      //   is the version of this that gets noticed.
      //
      // Facing is also the lunge's direction — render.js shifts the figure by
      // `face * thrust` — so getting this wrong threw him away from his mark as
      // well as pointing him the wrong way.
      //
      // It is set from the mark rather than from the shot so that he keeps
      // watching them between arrows, which is the whole of a standoff: he is
      // stopped BECAUSE they are there, and a man standing still with his back
      // to the reason he stopped reads as a bug even when nothing is in the air.
      if (mark) turnTo(e, mark.x);
    }

    // Held in melee by a soldier. Blocked enemies stop dead rather than
    // sliding past — this is the whole point of the barracks family, and the
    // one case where an enemy is not a pure path-follower.
    if (e.foe) {
      e.halted = false;   // stopped by somebody else, which is a different thing
      // Turn to fight whoever is holding it, so the two face each other. A
      // doctor faces his captor rather than his mark: the man with a spear in
      // him is the more pressing of the two — and this runs after the block
      // above, so it wins on a figure that could answer either.
      turnTo(e, e.foe.x);
      continue;
    }

    // THE STANDOFF. He stops rather than walking into the men he is throwing at.
    //
    // This is what the enemy is FOR. A thrower who closes to melee is a thug
    // with a longer reach; a thrower who stands where nothing can reach him and
    // works on the line from there is a problem the barracks family cannot
    // answer on its own, which is the whole reason he exists and the reason
    // archery towers can be told what to aim at.
    //
    // WHAT COUNTS AS A REASON TO STOP is a soldier who is IN FRONT: alive, on
    // the board, inside throwing range, and further down this figure's own lane
    // than he is. Three parts of that matter and each was got wrong once:
    //
    //   ON HIS OWN LANE, projected. Comparing arc lengths on whichever route a
    //   soldier happens to be nearest breaks in both directions — map 2's roads
    //   merge, so a blocker standing in his path can resolve to the OTHER route,
    //   and map 3's never meet, so a squad on the far road is not in his way at
    //   all however close it looks on screen. Projecting onto the lane he is
    //   actually walking answers both with one question.
    //
    //   IN FRONT, not just near. A squad he has already walked past is behind
    //   him and stops nothing; halting for it would leave him standing in the
    //   road with his back to a fight he has won.
    //
    //   AND NOT RESPAWNING. A dead man is a ring over a barracks, not a screen.
    //   This is the same rule nearestUnit uses to pick a mark, and it has to be,
    //   or he would stand off from men he cannot throw at.
    //
    // HE STANDS THERE AS LONG AS THEY DO, and there is no patience beside the
    // rule any more. He used to carry a budget — `standoff` seconds of not
    // advancing, spent once, and then he walked in whatever was in front of him —
    // because a wave only ends when the field is clear (see updateWaves) and a
    // figure that will not advance can hang a game up forever. The halt had
    // already been taken off him twice for exactly that, once as a finite basket
    // and once as a rule about being screened by other enemies.
    //
    // WHAT MAKES IT SAFE NOW IS THE OTHER ARMY, which is where the bound belonged
    // all along. A soldier with nothing better to do WALKS OUT to a thrower who
    // will not come to him — see the closing pass in units.js — so being stood
    // off from is no longer something a squad has to put up with. That closes the
    // loop the budget was papering over:
    //
    //   he halts only while a live soldier is in front of him inside his own
    //   throwing range, and reach is symmetric, so any soldier who can be thrown
    //   at can also walk to him;
    //
    //   the soldiers blocking other enemies are freed in bounded time, because
    //   those enemies are advancing, dying or leaking;
    //
    //   so somebody reaches him, and once he is pinned he is in a fight he loses:
    //   an enemy has no regeneration, so his health only ever goes down.
    //
    // Every thrower therefore dies or reaches the exit, which is the property the
    // wave loop needs — and it is now a consequence of the two armies' rules
    // rather than of a number he carries. tools/plague.mjs runs the case that
    // would hang: three of him against men his poison cannot kill.
    const road = laneOf(level.routes[e.route], e.lane);

    e.halted = !!e.def.ranged && screened(state, e, road);
    if (e.halted) continue;

    // One number forward along the road, then the position is looked up. The
    // old loop walked from waypoint to waypoint consuming the frame's movement,
    // which cannot express a lane: an offset has to be measured perpendicular
    // to the road, and there is no perpendicular to "somewhere near vertex 7".
    // The lane's own road, not the centreline. Walking the centreline and
    // drawing the figure offset from it makes speed depend on which way the
    // road is bending — see route.js.
    e.s += e.def.speed * dt;

    const p = pointOn(road, e.s);
    // A vertical stretch of road says nothing about which way the figure should
    // look, so keep the last horizontal heading rather than snapping to a
    // default.
    //
    // AND THE ROAD DOES NOT GET TO TURN A MAN MID-SHOT. `thrust` is up for the
    // quarter second the Attack drawing is on screen, and for that quarter
    // second the heading belongs to whatever he is shooting at — set above.
    // Without this a thrower who is walking rather than halted would be turned
    // straight back down the road on the very next line, and the turn would only
    // ever be visible on a figure that had stopped.
    if (p.tx && e.thrust <= 0) e.face = p.tx > 0 ? 1 : -1;
    e.x = p.x;
    e.y = p.y;

    if (e.s >= road.total) e.leaked = true;
  }

  for (const e of state.enemies) {
    if (e.leaked) state.lives -= e.def.leak;
  }

  // Bounty is paid here rather than in projectiles.js, so a soldier's kill and
  // an arrow's kill are worth the same and neither can pay out twice.
  state.enemies = state.enemies.filter(e => {
    if (e.leaked) {
      unhook(e);
      return false;
    }
    if (e.hp <= 0) {
      state.gold += e.def.bounty;
      state.hits.push({ x: e.x, y: e.y, life: 0.25 });
      // A kill sounds like whatever landed the last blow, and the two are
      // different sounds because they are different events to watch: an arrow
      // finding its mark across the map, or a man winning the fight he is in.
      // Sorted here for the same reason the bounty is — this is the only place
      // that sees every death.
      //
      // THREE WAYS TO DIE, three clips. An arrow finding one man across the map
      // and a rock coming down on several are different enough events to be
      // worth telling apart with your eyes shut, so the rock stopped borrowing
      // the arrow's line the moment it had one of its own.
      //
      // `killedBy` is the ammunition's `kind` when a shot landed the last blow,
      // and the soldier's own `blow` key when a man did — 'melee' for the three
      // who share the generic swing, 'paladin' for the one who does not.
      solo(e.killedBy === 'arrow' ? CUE.arrowKill
         : e.killedBy === 'rock' ? CUE.rockKill
         // Both balls the Musketeer Post fires answer with the same line. The
         // ordinary one and Deadeye's are separate ammunition — they leave the
         // barrel with different reports — but a man shot dead is a man shot dead,
         // and a second kill cry for the same weapon would be telling the player
         // apart two things that look identical on the board.
         : e.killedBy === 'bolt' ? CUE.ballistaKill
         // The pope's missile, and only his. The three tiers under him have no
         // kill line of their own and fall through to the generic one below, the
         // same way every melee weapon but the paladin's does.
         : e.killedBy === 'judgement' ? CUE.popeKill
         : e.killedBy === 'bullet' || e.killedBy === 'deadeye' ? CUE.musketKill
         : e.killedBy === 'paladin' ? CUE.paladinKill
         : CUE.meleeKill);
      // Falls where it stood, facing whatever killed it rather than facing the
      // way it was walking — see dropCorpse. The fallback is its heading, and
      // nothing should ever reach it: an enemy cannot die without being hit.
      //
      // A leak gets no body on purpose: the body is what you get for a kill.
      dropCorpse(state, e.def, e.x, e.y, e.struckFrom || e.face);
      unhook(e);
      return false;
    }
    return true;
  });
}

// How near a soldier has to be to a thrower's lane to count as standing in his
// way. The road is 34px either side of its centreline at its narrowest and the
// lanes sit 16 off it, so 45 covers a man anywhere on the tarmac and a little
// past the kerb — a squad is clamped to the road by stations() and only leaves
// it to close on somebody. It is NOT a blocking radius: the barracks' own ENGAGE
// is 30 and lives in units.js. This only answers "is that man in the road ahead
// of me", and the answer wants to be yes for a wedge sat slightly wide.
const BLOCK_REACH = 45;

// Is there a live soldier standing in this thrower's way? See the standoff block
// in updateEnemies for what it is for.
//
// `road` is the figure's OWN lane, and everything is measured against that one
// polyline: how far off it a man is standing, and how far along it. That is the
// only comparison that means the same thing on all three maps — see the note at
// the call site about roads that merge and roads that never meet.
function screened(state, e, road) {
  for (const u of state.units) {
    if (u.respawn > 0 || u.hp <= 0) continue;
    // HOW CLOSE HE INSISTS ON GETTING, which is not always how far he can hit.
    // `stopAt` is the archer's: he looses 260 and plants himself at 130, so a
    // squad can still walk out and pin him. Absent — the plague doctor — the two
    // are the same number and nothing changes. See `ranged` in data/waves.js for
    // why an enemy that stops beyond every answer is a hung game rather than a
    // hard one.
    if (!inRange(e.x, e.y, u.x, u.y, e.def.ranged.stopAt ?? e.def.ranged.range)) continue;
    const on = nearestOn([road], u.x, u.y);
    if (on.d <= BLOCK_REACH && on.s > e.s) return true;
  }
  return false;
}

// The nearest soldier a thrower could reach, or null. Respawning men are not on
// the board — they are a muster ring over a barracks — so nothing may aim at
// them, the same rule pickFigure uses for taps.
//
// Through inRange like every other reach in the game, because the board is drawn
// in perspective and a round patch of ground is drawn squashed. A thrower using
// a plain radius would stand off further up the screen than down it, which reads
// as him being nervous of some men and not others.
function nearestUnit(state, x, y, range) {
  let best = null;
  let least = Infinity;

  for (const u of state.units) {
    if (u.respawn > 0 || u.hp <= 0) continue;
    if (!inRange(x, y, u.x, u.y, range)) continue;
    const d = Math.hypot(u.x - x, u.y - y);
    if (d < least) { least = d; best = u; }
  }
  return best;
}

// A flask leaves the doctor's hand and comes down on the ground a soldier is
// standing on.
//
// COMMITTED TO THE GROUND, like a rock and unlike an arrow — see the two kinds
// in projectiles.js. It is thrown at where the man is NOW rather than where he
// will be, and that is a decision rather than an omission: a soldier at his post
// is not going anywhere, and one who has just been pulled into a fight is going
// somewhere a lead could not predict. Throwing at the ground he is on means the
// flask lands where you saw it aimed, and a man who steps out of it has dodged
// something rather than been missed by a bug.
// WHATEVER THIS ENEMY THROWS OR LOOSES, through one function.
//
// It was throwFlask and it knew about the flask: the arc, the speed and the
// picture were all read from that one ammunition. Now the AMMUNITION is on the
// enemy — `ranged.ammo` — and this is the same code asking it, so the archer's
// arrow needed no branch here. An arrow homes and an arc'd flask does not, which
// is the same `arc` flag the towers' own projectiles answer.
function loose(state, e, mark) {
  // The hand, derived from his own drawing rather than typed: the height of the
  // figure above the shadow it stands on, a little over half way up. Nothing to
  // re-measure when the artist redraws him.
  const up = e.def.spriteTrim[3] * e.def.pivot[1] * SCALE * 0.55;
  const from = { x: e.x, y: e.y - up };
  const to = { x: mark.x, y: mark.y };
  const ammo = e.def.ranged.ammo;
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  // A LOB HAS A FLIGHT TIME AND A STEERED SHOT DOES NOT. `flight` and `lift` are
  // what make projectiles.js run the arc; leaving them off is what makes a shot
  // home on its man and die with him. See fly() and land() there.
  const flight = ammo.arc ? dist / ammo.speed : undefined;

  state.shots.push({
    x: from.x,
    y: from.y,
    angle: Math.atan2(to.y - from.y, to.x - from.x),
    fromX: e.x,
    // Whose side it is on, and the only thing projectiles.js needs to know to
    // point the same landing code at the other army. Absent on every tower's
    // shot, which reads as the player's side.
    side: 'enemy',
    target: mark,
    // WHAT IT HITS FOR, off the enemy rather than off the ammunition, because two
    // enemies could loose the same arrow for different damage — the same reason a
    // tower's shot carries its own number. A flask does none: what it does is on
    // the ground it leaves, and `damage` on a poisoned shot is never read.
    damage: e.def.ranged.damage || 0,
    splash: ammo.splash || 0,
    ammo,
    speed: ammo.speed,
    from,
    to,
    flight,
    t: 0,
    lift: ammo.arc ? dist * ammo.arc : 0
  });

  // Category B, on the release, and only for ammunition that says it makes a
  // noise leaving. An arrow does — it is the same `arrow_shot` every bow in the
  // game uses, which is what the owner asked for and what the shared drawing
  // already implied. A flask does not: it announces itself by breaking.
  if (ammo.fireSound) play(SHOT);
}

// Closest to leaking, so towers focus whatever is about to cost a life.
//
// Measured as distance REMAINING rather than distance travelled, which is the
// same ordering on a single road and the only meaningful one on a forked map:
// the two roads into map 2 are not the same length, so "further along" says
// nothing about which enemy is nearer the keep.
//
// `min` is a DEAD ZONE, and only artillery has one: a catapult cannot drop a
// rock on its own feet, so anything close enough walks past untouched. It is the
// price of the longest reach in the game, and it is what makes a siege plot a
// different decision from an archery plot — a machine wants to be BACK from the
// road, where a bow wants to be beside it.
//
// Two ellipses rather than two radii, through the same inRange as everything
// else: the board is drawn in perspective and both edges of an annulus are
// patches of ground. See src/ground.js.
// `mode` is an index into AIM_MODES, and it changes WHICH of the enemies in
// reach is picked without changing what "in reach" means. It is a preference
// with a tiebreak rather than a filter: a tower told to shoot throwers first and
// offered nothing but militia shoots the militia. A mode that could leave a
// tower idle with a target in front of it would be a trap, and the player would
// have to remember to unset it.
//
// Distance-to-the-exit is the tiebreak in every mode, which is what makes mode 0
// fall out as the special case where the preference is flat.
export function pickTarget(enemies, x, y, range, min = 0, mode = 0) {
  let best = null;
  let least = Infinity;
  let bestRank = Infinity;

  for (const e of enemies) {
    // Measured from the enemy's ground anchor — its shadow — because that is
    // where the figure IS. Its head is drawn well above that and never counts.
    if (!inRange(x, y, e.x, e.y, range)) continue;
    if (min && inRange(x, y, e.x, e.y, min)) continue;
    const left = remaining(laneOf(level.routes[e.route], e.lane), e.s);
    // Lower wins. Negated hp for mode 1 so "most health" sorts the same
    // direction as everything else; `ranged` is a 0/1 flag for mode 2, which
    // makes the whole preference a single comparable number in every mode.
    const rank = mode === 1 ? -e.hp
               : mode === 2 ? (e.def.ranged ? 0 : 1)
               : 0;
    if (rank < bestRank || (rank === bestRank && left < least)) {
      bestRank = rank;
      least = left;
      best = e;
    }
  }
  return best;
}
