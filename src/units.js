import { level } from './level.js';
import { at as pointOn, nearestOn } from './route.js';
import { dropCorpse } from './corpses.js';
import { splat } from './blood.js';
import { clampToRange, inRange } from './ground.js';
import { solo, play, CUE, blowCue, abilityCue } from './audio.js';
import { abilityById, owns } from './data/abilities.js';

// Blocking soldiers. A barracks puts a few of these on the path; enemies that
// walk into them stop and trade blows instead of continuing to the keep.
//
// The family is a stall first and a damage source second. Soldiers must be
// strong enough that a pure-archery build cannot win — see tools/sim.mjs — but
// not so strong that a pure-barracks build can. Both ends are checked there;
// soldier damage is the number that breaks it fastest in either direction.

const ENGAGE = 30;   // an enemy this close to a free soldier stops and fights
const REACH  = 20;   // melee lands at this range
const SETTLE = 16;   // stop walking here, so the two stand adjacent not stacked

// How far a soldier will go to join a fight one of his squadmates is already
// in. Bigger than ENGAGE on purpose, and it has to be: the wedge is 37px deep
// and 40px wide, so a rear man is about 42px from the point man before either
// of them takes a step. At ENGAGE's 30 he could not reach a fight happening in
// his own formation, which is why three militiamen used to stand and watch one
// of their own get killed. 70 clears the wedge with room for the enemy to be
// stopped short of it.
//
// This is a reach, not a leash on the block: see the two passes in updateUnits.
// A soldier who is only assisting drops it the instant an unblocked enemy comes
// within ENGAGE of him, so helping never costs the squad its grip on the road.
const ASSIST = 70;

// Formation offsets as [along, across, splay] in path-local units: along is
// the direction enemies travel, across is perpendicular, splay is degrees
// added to the idle facing. The point of the wedge faces upstream, into the
// oncoming enemies, with two behind it.
//
// `across` plus the soldier's radius must stay inside half the road width or
// the squad stands on the grass — tools/formation.mjs checks it against the
// road drawn in render.js. The road was widened to give the squad room, so the
// wedge can now spread properly instead of piling into one smudge.
//
// The splay fans the rear pair outward, which separates three long spears that
// would otherwise all point the same way and merge together.
// Widened when the painted road replaced the drawn one: the road went from 52
// to 125 across, and the old tight wedge read as a huddle in the middle of it.
//
// Spreading them used to be purely cosmetic, on the reasoning that enemies walk
// the centreline exactly so all that mattered was each soldier's distance to
// across=0. THAT IS NO LONGER TRUE: enemies pick one of three lanes at spawn and
// walk 20px either side of the centre. The wedge is now doing real work — the
// two rear men at across=-20 and +20 sit on exactly the two outer lanes — and
// its width is a blocking parameter rather than a look. Widening it further
// would leave a gap up the middle; narrowing it lets the kerb lanes through.
const FORMATION = [[-24, 0, 0], [13, -20, -22], [13, 20, 22]];

// Nearest point on any of the level's roads — the rally point a barracks sends
// its soldiers to.
//
// The measuring lives in route.js now, and across ALL routes rather than one:
// map 2 has two roads in, and a barracks built beside the southern one must not
// send its men to the northern one. Kept as a named export because the tools
// use it to ask how far a plot is from the road.
export function nearestOnPath(x, y) {
  return nearestOn(level.routes, x, y);
}

// Where each man in the squad should be standing, given the tower's rally.
//
// Split out from makeUnits because moving the rally must not create anybody:
// the standing orders change, the men do not. See moveUnits.
function stations(tower) {
  const s = tower.def.soldier;

  // Where the player has sent the squad, or the nearest bit of road if they
  // have not sent it anywhere. The rally is stored as a free point rather than
  // a point on the path, so it survives an upgrade and stays where it was put.
  const want = tower.rally || { x: tower.x, y: tower.y };
  const near = nearestOnPath(want.x, want.y);

  // Keep the rally inside the tower's reach, measured from the TOWER — that
  // reach is what the barracks upgrade buys, and it is drawn as an ellipse
  // around the building, so the clamp goes through the same helper the drawing
  // does rather than through a round distance that would disagree with it.
  const held = clampToRange(tower.x, tower.y, near.x, near.y, tower.def.range);

  // Re-find the rally on the path after the range clamp, so the slots are laid
  // out from a point that is actually on the road.
  const base = nearestOnPath(held.x, held.y);
  const road = level.routes[base.route];

  // Where each man would stand, given a point along that road.
  const layout = at0 => {
    const out = [];
    for (let i = 0; i < s.count; i++) {
      const [along, across, splay] = FORMATION[i % FORMATION.length];
      // `along` follows the road's curve; `across` steps off the tangent there.
      // Walking by arc length keeps a squad on a bending road: offsetting along
      // one segment's straight tangent puts a man 24px "forward" onto the grass
      // on the outside of a bend, far enough that enemies pass outside ENGAGE
      // without ever being blocked.
      const at = pointOn(road, at0 + along);
      out.push({
        rx: at.x - at.ty * across,
        ry: at.y + at.tx * across,
        // At rest a soldier watches the way the enemies come from, which is back
        // along the segment they walk. Only the left/right of this is drawn.
        faceIdle: Math.atan2(-at.ty, -at.tx) + splay * Math.PI / 180
      });
    }
    return out;
  };

  // AND THEN BACK OFF ALONG THE ROAD UNTIL EVERY MAN IS INSIDE THE RING.
  //
  // The clamp above is not enough on its own, and the gap between the two is what
  // the owner was seeing. It pulls the rally onto the ellipse and then the road is
  // found again from there — so on a stretch that runs away from the tower, the
  // snapped point lands back OUTSIDE the ellipse, and the formation is then laid
  // out ±24px along the road from that. Map 1's plot 7 posted its rear man at 1.41
  // ring-radii: a flag drawn inside the ring and a squad standing 80px beyond it.
  //
  // So the road position is bisected between the rally the player asked for and
  // the piece of road nearest the TOWER, for the furthest one whose whole wedge
  // fits. Every man inside, not just the flag — the wedge is what the player sees
  // standing there.
  //
  // If even the nearest piece of road is out of reach the search has nothing to
  // find, and the answer is the old one: a plot too far from the road cannot post
  // a squad on it, and pretending otherwise would put the men somewhere arbitrary
  // instead of somewhere honest. See map 1's plots 2 and 5.
  const fits = at0 => layout(at0).every(m => inRange(m.rx, m.ry, tower.x, tower.y, tower.def.range));

  if (fits(base.s)) return layout(base.s);

  const back = nearestOn([road], tower.x, tower.y).s;
  if (!fits(back)) return layout(base.s);

  let good = back;
  let bad = base.s;
  for (let i = 0; i < 24; i++) {
    const mid = (good + bad) / 2;
    if (fits(mid)) good = mid; else bad = mid;
  }
  return layout(good);
}

export function makeUnits(state, tower) {
  removeUnits(state, tower);

  const s = tower.def.soldier;
  if (!s) return;

  for (const [i, at] of stations(tower).entries()) {
    state.units.push({
      tower,
      def: s,
      slot: i,
      rx: at.rx,
      ry: at.ry,
      x: tower.x,
      y: tower.y,
      faceIdle: at.faceIdle,
      face: at.faceIdle,
      hp: s.hp,
      maxHp: s.hp,
      foe: null,
      holds: false,   // true only if he is the one BLOCKING his foe
      cd: 0,
      thrust: 0,      // 1 on the swing, decays; drives the lunge in render.js
      respawn: 0,
      // --- what an ability leaves on a man -------------------------------------
      //
      // All four fields are set here rather than sprouting on the first paladin
      // who swings, for the same reason `poison` below is: the shape of a unit is
      // written down in one place, and a spearman carries them at zero forever
      // without anything having to ask whether his tower has abilities.
      //
      // The counters are the MAN's, not the tower's, which is the whole difference
      // from the musketeer's. A Keep musters three paladins and each of them is
      // counting his own blows towards his own fifth — three men swinging in step
      // would land three Holy Slashes on the same frame.
      blows: 0,       // how many he has landed, for Holy Slash's fifth
      hold: 0,        // seconds committed to a special pose: no swing, no step
      holdArt: null,  // the drawing to show while holding, or his own Attack pose
      healing: 0,     // health a second while Holy Light is up, 0 the rest of the time
      healCd: 0,      // seconds until Holy Light may be called again
      // { dps, left } while a flask is working on him, null otherwise. Set here
      // rather than left undefined so the shape of a unit is written down in one
      // place — see the same argument for `halted` on an enemy.
      poison: null
    });
  }
}

// A new rally point is a MARCH ORDER, not a new garrison.
//
// This used to call makeUnits, which deletes the squad and posts three fresh
// men at the tower — so moving the flag healed every wound, cancelled every
// respawn timer and made the men you were watching vanish and be replaced. It
// read as the barracks resetting itself as a punishment for using its one
// controllable feature. The men now keep their hp, their fight and their place
// on the board, and simply walk.
//
// They do drop what they are holding, because a move order they will not obey
// until their current fight ends is not a move order. The enemy is free for the
// half second it takes somebody to arrive, which is the cost of the order and
// is visible on the board — the right way round for a decision the player made.
export function moveUnits(state, tower) {
  const squad = state.units.filter(u => u.tower === tower);
  if (!squad.length) { makeUnits(state, tower); return; }

  const at = stations(tower);
  for (const u of squad) {
    const post = at[u.slot % at.length];
    u.rx = post.rx;
    u.ry = post.ry;
    u.faceIdle = post.faceIdle;
    release(u);
  }
}

export function removeUnits(state, tower) {
  for (const u of state.units) {
    if (u.tower === tower) release(u);
  }
  state.units = state.units.filter(u => u.tower !== tower);
}

// Let go of the enemy, from the soldier's side. Only a soldier who is BLOCKING
// clears the enemy's own hook — an assisting soldier never owned it, and
// clearing it would hand the enemy a free walk past the man still fighting it.
function release(u) {
  if (!u.foe) return;
  if (u.holds) u.foe.foe = null;
  u.foe = null;
  u.holds = false;
}

// The same parting, from the enemy's side, for an enemy that has just died or
// leaked. Only its blocker is hooked to it; anyone assisting notices on the next
// tick, when the corpse fails the hp check at the top of updateUnits.
export function unhook(e) {
  if (!e.foe) return;
  e.foe.foe = null;
  e.foe.holds = false;
  e.foe = null;
}

// The ability a soldier's TOWER has bought, by id, or nothing. The tower is where
// abilities are owned — see the note on `abilities` on barracks tier 4 — so this
// is the one hop between the man swinging and the gold that was spent.
//
// Ownership is asked FIRST and the lookup only happens if the answer is yes, which
// matters because this runs twice per soldier per frame: `owns` is a check on a
// short array that is empty for every man in the game except a paladin, so a
// spearman leaves this function without touching the ability table at all.
const ability = (u, id) => (owns(u.tower, id) ? abilityById(id) : null);

export function updateUnits(state, dt) {
  for (const u of state.units) {
    // Holy Light's thirty seconds run whether he is fighting, walking or standing
    // in his slot — and they are HIS thirty seconds. The clock is cleared when he
    // dies, down in the death block, so a paladin who is cut down and musters again
    // comes back able to call the light. It used to survive him.
    //
    // Still ticked before the respawn check below rather than after it, which now
    // only matters for the frame he falls on: `healCd` is zero for the whole of a
    // respawn either way.
    if (u.healCd > 0) u.healCd -= dt;

    if (u.respawn > 0) {
      u.respawn -= dt;
      if (u.respawn <= 0) {
        u.hp = u.maxHp;
        u.x = u.tower.x;
        u.y = u.tower.y;
        u.face = u.faceIdle;
      }
      continue;
    }

    if (u.foe && (u.foe.hp <= 0 || u.foe.leaked)) release(u);

    // THE LEASH, and it is the ring the player can already see: the ellipse the
    // tower draws when it is selected, which is also what the rally point is
    // clamped to. A squad posted inside it should fight inside it.
    //
    // WHAT IT IS FOR. Blocking never took a man far — an enemy has to walk within
    // ENGAGE of him to be blocked, so a blocker is at most 30px from where he
    // stands. The two passes that make him TRAVEL had no limit at all: assisting
    // reaches 70px and fetching a thrower reaches 130, and each fight he joins is a
    // new place to reach from, so a squad could walk itself down the road one
    // helpful step at a time. Measured on map 1 that is 90 to 160px from a man's
    // post, which on a rally placed at the edge of the ring is well outside it.
    //
    // WHY IT SHOWED UP ON PALADINS. It is not the abilities, and it is worth
    // writing that down because it looked exactly like it was: a held pose freezes
    // a man where he stands for up to three seconds — Holy Light kneels for all
    // three — so a paladin who was mid-chase when he struck stops out there in
    // plain sight instead of hurrying back. The abilities made a leash that was
    // never there visible. Every family had it.
    //
    // MEASURED FROM THE TOWER, not from the man's own post, because that is the
    // ring the player drew: they place the rally, the game clamps it into this
    // ellipse, and the men are expected to be somewhere inside it.
    const home = u.tower;
    const leashed = (x, y) => inRange(x, y, home.x, home.y, home.def.range);

    // Four passes, in this order, and the order is the design.
    //
    // BLOCKING is still strictly one soldier per enemy — that is what the whole
    // family does, and three militiamen must stall exactly three enemies. What
    // changed is what a soldier does with the time left over. He used to stand
    // in his slot watching a squadmate fight and die two paces away, because the
    // only enemy nearby was already somebody's and he had no other instruction.
    // Now he goes and helps — and if there is nothing at all to help with, he
    // goes and fetches the thrower standing off poisoning him.
    //
    // ASSISTING OUTRANKS CLOSING, and that was the other way round for one
    // version. Fetching a doctor is the LAST thing a soldier does, after blocking
    // and after helping, and the reason is what happens during a crunch: with it
    // ahead of assisting, a doctor halting 130px short pulled the spare men out of
    // the fight the wave was busy losing, and a squad that breaks formation while
    // three militiamen are on it is a squad that dies. So he stays dangerous
    // exactly while the line is busy — which is his whole character — and gets
    // dealt with in the lull, which every wave has.

    // 1. Take over. His enemy has lost its blocker — the man holding it fell —
    //    so the assistant already standing there becomes the block. Without
    //    this the squad lets go of an enemy at the exact moment it is winning.
    //
    //    ONLY WHAT HE CAN REACH, which used to go without saying and does not any
    //    more. Every soldier with a foe was within ASSIST of it, because the only
    //    way to have one was to block it or to help with it — so "take over" was
    //    always a man standing at the fight. The closing pass below breaks that:
    //    it hands him a target 130px away, and without this radius he would hook
    //    it on the very next frame and stand there "holding" an enemy he has not
    //    reached, ignoring anything that walks past him on the way.
    if (u.foe && !u.foe.foe && Math.hypot(u.foe.x - u.x, u.foe.y - u.y) <= ENGAGE) {
      u.foe.foe = u;
      u.holds = true;
    }

    // 1b. Give up on a thrower who has started walking again, and go back to the
    //     post. The only place a soldier drops a target without a fight ending,
    //     and it is what keeps the closing pass below from becoming a chase
    //     across the map: a doctor un-halts the moment nobody is in front of him,
    //     and a man 130px out with no orders would otherwise trail him the whole
    //     length of the road at 62 against his 60 — permanently off the stretch
    //     he was posted to hold, for an enemy now walking into the line anyway.
    //
    //     Three things have to be true together, and each rules out a case this
    //     must not touch: he does not HOLD his target, so a block is never
    //     dropped; nobody else holds it either, so he is not walking away from a
    //     fight he was helping with; and it is not standing off any more, so the
    //     reason he set out has actually gone. After pass 1 rather than before it,
    //     or it would release the assistant that pass is about to promote.
    if (u.foe && !u.holds && !u.foe.foe && !u.foe.halted) release(u);

    // 1c. Come home. He is helping with a fight that is outside his tower's ring,
    //     or standing over one that drifted out of it, and helping is the part of
    //     his job the leash takes away first.
    //
    //     Three conditions, and each rules out a case this must not touch. He does
    //     not HOLD his foe, so the wall is never dropped — a blocker who took an
    //     enemy at the edge of the ring keeps it, because the enemy came to him and
    //     letting go would open the road. It is not a halted thrower, so the fetch
    //     pass below is not undone one frame after it fires. And the fight really
    //     is outside, measured against the same ellipse the player was shown.
    if (u.foe && !u.holds && !u.foe.halted && !leashed(u.foe.x, u.foe.y)) release(u);

    // 2. Block. Any soldier not currently holding someone — free OR merely
    //    assisting — grabs the nearest unheld enemy inside ENGAGE. Assisting
    //    loses to blocking every time, so piling onto one enemy can never let
    //    the next one walk past: the moment it comes into reach, somebody peels
    //    off to meet it.
    if (!u.holds) {
      let best = null;
      let bestD = ENGAGE;
      for (const e of state.enemies) {
        if (e.foe || e.hp <= 0) continue;
        const d = Math.hypot(e.x - u.x, e.y - u.y);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (best) { release(u); u.foe = best; best.foe = u; u.holds = true; }
    }

    // 3. Assist. Nothing to block, so join the nearest fight within ASSIST. He
    //    fights, but he does not hook the enemy: it stays stopped by its blocker
    //    and stays free to be re-blocked if that man dies.
    //
    //    Not capped. A cap of one helper was tried and dropped: it is worth
    //    almost nothing in balance — 78 winning builds out of 448 against 81
    //    uncapped — and it puts the third man back in his slot watching, which
    //    is the exact thing that was reported. If everyone is free, everyone
    //    goes.
    if (!u.foe) {
      let best = null;
      let bestD = ASSIST;
      for (const e of state.enemies) {
        if (!e.foe || e.hp <= 0) continue;
        // Inside the ring, or it is not his fight. Helping is the optional half of
        // what a soldier does — somebody is already holding this enemy — so it is
        // the first thing the leash takes away.
        if (!leashed(e.x, e.y)) continue;
        const d = Math.hypot(e.x - u.x, e.y - u.y);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (best) { u.foe = best; u.holds = false; }
    }

    // 4. Close on a thrower who will not come to him. A plague doctor stops out
    //    at 130 and works on the line from there, which is further than any of
    //    the numbers above: a squad used to have no answer to him at all, and he
    //    only ever ended up in melee because he ran out of patience and walked
    //    in. That patience is gone — he now stands there as long as men are in
    //    front of him — so this pass is what makes "pin him" a thing a barracks
    //    can actually do, and it is what keeps the board from stalling. See the
    //    standoff block in enemies.js for the full argument.
    //
    //    THE REACH IS HIS, NOT OURS, and that symmetry is the whole rule: if he
    //    is close enough to throw at this man, this man is close enough to walk
    //    at him. Nothing else in the squad reaches this far, and nothing else
    //    needs to — it applies only to an enemy who has STOPPED, so a soldier is
    //    never lured up the road by something that was going to arrive anyway.
    //
    //    He does not hook the enemy here, the same as assisting: the grip is
    //    taken by the block pass above once he is close enough, which is what
    //    keeps "one blocker per enemy" true and lets him drop the walk the
    //    instant a live enemy comes within ENGAGE of him.
    //
    //    ONE MAN PER THROWER, and that cap is what stops this being an exploit.
    //    Without it a single doctor halting 130px short pulls a whole squad off
    //    the road at once and the wave behind him strolls through the gap he
    //    made — he would be bait rather than a target. One man goes, the rest
    //    hold the line, which is also how it reads: you send somebody to deal
    //    with him.
    if (!u.foe) {
      let best = null;
      let bestD = Infinity;
      for (const e of state.enemies) {
        if (e.foe || e.hp <= 0 || !e.halted) continue;
        if (!inRange(e.x, e.y, u.x, u.y, e.def.ranged.range)) continue;
        // AND HE IS LEASHED TOO, which is the change the owner asked for and it is
        // not free — see the note on `leashed` above. A doctor stops at his own
        // throwing distance from the line, so with the rally at the edge of the
        // ring he is usually outside it, and this is the pass that used to walk a
        // man out to him: 1.85 ring-radii on map 1's plot 7, a paladin 378px from
        // a tower that reaches 210.
        //
        // What it costs is that a thrower standing off outside the ring is now
        // nobody's problem: he throws, the men in reach take it, and nothing goes
        // out to stop him. That is the same answer a bow gives a man out of range,
        // and it is the player's to solve — move the rally, or put something else
        // where it can see him. The alternative is a squad that leaves the ground
        // it was posted to hold whenever a doctor asks it to.
        if (!leashed(e.x, e.y)) continue;
        // Somebody is already on his way. An assisting soldier cannot be
        // confused for one: assisting only ever targets an enemy that HAS a
        // blocker, and this enemy has none.
        if (state.units.some(o => o !== u && o.foe === e && !o.holds)) continue;
        const d = Math.hypot(e.x - u.x, e.y - u.y);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (best) { u.foe = best; u.holds = false; }
    }

    // HOLY LIGHT. The one ability in the game that is a REACTION rather than a
    // rhythm: he calls it when he is nearly dead, not on a count.
    //
    // Checked before the swing below and before the step, because for the next two
    // seconds it replaces both. He keeps his grip on the enemy the whole time —
    // `u.holds` is untouched — so the enemy stays stopped and goes on hitting him,
    // which is the artist's own condition and is what stops this being a free
    // reset: 200 health back is only worth having if the road behind you is still
    // being held while you take it.
    const light = ability(u, 'light');
    if (light && u.hold <= 0 && u.healCd <= 0 && u.hp < light.below * u.maxHp) {
      u.hold = light.seconds;
      u.holdArt = light.pose;
      u.healing = light.heals / light.seconds;
      u.healCd = light.refresh;
      // Category B: it is a thing that happens on the board, and three paladins in
      // one squad can be in trouble at once.
      play(abilityCue(light.cue));
    }

    // The swing he is committed to after a strike, and the three seconds of the
    // light. It stops the swing below and the step further down — "he stays in that
    // position" — and it is the same field for both abilities, so a man can only
    // ever be doing one of them.
    if (u.hold > 0) {
      u.hold -= dt;
      if (u.healing) u.hp = Math.min(u.maxHp, u.hp + u.healing * dt);
      if (u.hold <= 0) { u.holdArt = null; u.healing = 0; }
    }

    const tx = u.foe ? u.foe.x : u.rx;
    const ty = u.foe ? u.foe.y : u.ry;
    const d = Math.hypot(tx - u.x, ty - u.y);

    if (u.foe) u.face = Math.atan2(u.foe.y - u.y, u.foe.x - u.x);
    else if (d > SETTLE) u.face = Math.atan2(ty - u.y, tx - u.x);
    else u.face = u.faceIdle;

    if (d > SETTLE && u.hold <= 0) {
      const step = Math.min(u.def.speed * dt, d);
      u.x += ((tx - u.x) / d) * step;
      u.y += ((ty - u.y) / d) * step;
    }

    u.cd -= dt;
    u.thrust = Math.max(0, u.thrust - dt * 4);

    if (u.foe && d <= REACH) {
      // Each side spatters the one it HITS, so a melee throws blood both ways
      // and you can see which of the two is currently landing blows.
      // `u.hold` is the second half of the guard, and it is what a held pose
      // actually costs. Holy Slash's hold is now the man's OWN swing — see below —
      // so the two clocks run out on the same frame and the strike costs him
      // nothing; Holy Light's three seconds are three seconds of not swinging, and
      // are meant to be.
      if (u.cd <= 0 && u.hold <= 0) {
        // HOLY SLASH: the fifth blow, and only the fifth. `blows` counts this one,
        // so `every: 5` means four ordinary swings and then the strike — read the
        // field as the length of the cycle, exactly as the musketeer's 6 is.
        const slash = ability(u, 'slash');
        const special = slash && (u.blows + 1) % slash.every === 0 ? slash : null;

        u.foe.hp -= special ? special.damage : u.def.damage;
        u.blows++;
        u.cd = u.def.cd;
        u.thrust = 1;
        splat(state, u.foe.x, u.foe.y - u.foe.def.r, u.foe.y);
        u.foe.struckFrom = u.x >= u.foe.x ? 1 : -1;
        // Which family gets the credit if this is the blow that kills it.
        // Overwritten by every hit exactly like struckFrom above, and for the
        // same reason: the last blow is the one that counts.
        //
        // `blow` is the man's own sound key and doubles as the kill's: a paladin
        // stamps 'paladin' where everybody else stamps 'melee', and enemies.js
        // sorts the cry out of that one field rather than a second one.
        u.foe.killedBy = u.def.blow || 'melee';
        // Category B: part of the battle bed rather than a thing announced.
        // Every swing lands its own blow, so every swing makes its own noise —
        // it is mixed low and ducks under anything in Category A, which is what
        // lets it fire freely without burying the cries.
        //
        // The fifth blow makes its OWN noise instead of his sword's, and holds the
        // pose the artist drew for it. A kill by that blow still cries as a
        // paladin's — `killedBy` above is the man, not the swing.
        //
        // `?? u.def.cd` is where "held for a normal attack time" lives. An ability
        // with a number keeps its number; one with none is held for exactly as long
        // as the man's own swing, which is the only length that costs him nothing —
        // `hold` and `cd` are set on the same frame and tick down together, so they
        // expire together and the next blow lands on time. It is resolved here
        // rather than in the ability, because the ability does not know whose hand
        // it is in: the same null on a spearman would mean 1.10s.
        if (special) {
          u.hold = special.hold ?? u.def.cd;
          u.holdArt = special.pose;
          play(abilityCue(special.cue));
        } else {
          play(blowCue(u.def));
        }
      }
      // The enemy swings back at the man BLOCKING it and nobody else. It is
      // already committed to him; the others are flanking it. So a squad that
      // gangs up trades three swords for one, which is the whole reward for
      // holding a line rather than three separate duels — and it only happens
      // when there are fewer enemies than soldiers, because blocking outranks
      // assisting. On a busy road every man has his own and nothing changes.
      //
      // It also has to be exactly one soldier ticking this clock. `acd` lives on
      // the enemy, so if every man attacking it decremented the timer, an enemy
      // fighting three would swing three times as often — the counter-attack
      // would speed up in proportion to how outnumbered it is.
      if (u.holds) {
        u.foe.acd -= dt;
        if (u.foe.acd <= 0) {
          u.hp -= u.foe.def.damage;
          u.foe.acd = u.foe.def.atkCd;
          u.foe.thrust = 1;   // the enemy lunges back, so a fight reads two-sided
          splat(state, u.x, u.y - u.def.r, u.y);
          u.struckFrom = u.foe.x >= u.x ? 1 : -1;
        }
      }
    }

    // PLAGUE. A flask leaves no wound and does no damage when it lands; it
    // leaves a patch of ground, and this is where the ground does its work.
    //
    // It suppresses the regen below rather than racing it, and that is the whole
    // reason the numbers are small enough to look harmless. A spearman regrows 4
    // health a second out of combat, so a 6-a-second poison that let him heal
    // through it would be a 2-a-second poison — and the tier 3 knight, at 6
    // regen, would take literally nothing. "Slowly trickling his health" has to
    // mean the trickle is the only thing happening.
    if (u.poison) {
      u.hp -= u.poison.dps * dt;
      u.poison.left -= dt;
      if (u.poison.left <= 0) u.poison = null;
    } else if (!u.foe && u.hp < u.maxHp) {
      // Regen only out of combat, so a barracks recovers between waves without
      // making a soldier unkillable inside one.
      u.hp = Math.min(u.maxHp, u.hp + u.def.regen * dt);
    }

    if (u.hp <= 0) {
      release(u);
      u.respawn = u.def.respawn;
      // The plague dies with him. Without this he musters again at full health
      // with the clock still running and walks straight back out to finish
      // dying of a flask thrown at a man who is already dead.
      u.poison = null;
      // And so does everything an ability left on him, `healCd` INCLUDED. A man
      // who musters again is a new man in every respect: he is not still holding a
      // pose he struck before he died, he is not still being healed, his count
      // towards the next Holy Slash starts over, and his thirty seconds of Holy
      // Light start over too.
      //
      // That last one was the other way round until the artist asked — the reading
      // was that the gold bought a power and the power recharged regardless of who
      // was carrying it. His reading is the one the board shows: the man kneeling
      // in the road is the man with the clock, and when he falls the clock falls
      // with him. See `refresh` in data/abilities.js for what it is worth.
      u.hold = 0;
      u.holdArt = null;
      u.healing = 0;
      u.healCd = 0;
      u.blows = 0;
      state.hits.push({ x: u.x, y: u.y, life: 0.2 });
      solo(CUE.soldierDeath);
      // He falls facing whatever killed him. The fallback is his own facing —
      // a soldier's `face` is an angle, not a side, so it is reduced to a sign
      // the same way drawSoldier reduces it — and it should never be reached,
      // because nothing dies without being hit first.
      dropCorpse(state, u.def, u.x, u.y, u.struckFrom || (Math.cos(u.face) >= 0 ? 1 : -1));
      u.struckFrom = 0;
    }
  }
}
