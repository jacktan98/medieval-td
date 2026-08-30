import { level } from './level.js';
import { at as pointOn, nearestOn } from './route.js';
import { dropCorpse } from './corpses.js';
import { splat } from './blood.js';
import { clampToRange, inRange } from './ground.js';
import { solo, play, CUE, blowCue, abilityCue } from './audio.js';
import { boost } from './towers.js';
import { SCALE } from './data/towers.js';
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

// HOW LONG A BLOW LASTS, and it is one number rather than two so that nothing
// can drift out of step with it.
//
// `thrust` is set to 1 the instant a man strikes and falls back to 0 at
// THRUST_DECAY a second, so a swing takes a quarter second. Two things are that
// quarter second and both read it from here: the lunge render.js draws, and the
// pose a thrown knife holds. Writing 0.25 next to either would be the same number
// typed twice.
//
// IT USED TO BE THREE. An assassin's reveal was on this clock too, which is what
// made him wink in and out between knives — see `exposed` in updateUnits for what
// replaced it.
const THRUST_DECAY = 4;
const LUNGE = 1 / THRUST_DECAY;

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

// How far the furthest station is from the rally point, derived from the wedge
// above rather than typed: 24 back down the road for the point man, or 13 forward
// and 20 across for the rear pair. It is the margin the leash in updateUnits adds
// to the tower's ring, so a squad posted at the edge of that ring is not leashed
// tighter than it is posted. Re-derived if the wedge is ever widened.
const WEDGE = Math.ceil(Math.max(...FORMATION.map(([a, c]) => Math.hypot(a, c))));

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

// IS THIS MAN HIDDEN RIGHT NOW, which is the whole of the assassin.
//
// ONE PREDICATE, FOUR READERS, and that is deliberate: what the enemy can aim
// at, what makes an enemy stop, what the screen draws, and what re-arms a Sneak
// Attack all have to agree, or the player watches a flask sail into a man who is
// not there — or a bonus land on a man nothing was hiding.
//
//   enemies.js nearestUnit   a thrower cannot pick him as a mark
//   enemies.js screened      and does not stand off from him either
//   render.js  drawSoldier   he is drawn at UNSEEN, and his health bar with him
//   units.js   updateUnits   his Sneak Attack comes back
//
// ONE FIELD, SET ONCE A FRAME. `exposed` is worked out in updateUnits, where the
// board is in hand, and the note beside it is where the rule lives: he is seen
// while something is close enough for him to attack, and unseen the moment
// nothing is — walking included, because a man on the move is by definition not
// yet in reach of what he is walking to.
//
// IT WAS A PAIR OF TESTS HERE, `!u.foe && u.thrust <= 0`, and the owner overruled
// that: a quarter second of reveal per throw against eight tenths of reload meant
// he winked out between knives and re-armed his Sneak Attack every time, which is
// how the pair reached 150 damage a second. Now a volley reveals him for as long
// as it lasts.
//
// THE SECOND READER IS THE INTERESTING ONE. Leaving `screened` out would have a
// thrower halt in front of men he cannot see and then throw nothing, which reads
// as a bug and hangs on the wave clock. Taking him out of it instead means the
// thrower walks on into a squad he has no idea is there, which is what an ambush
// IS — and it makes the assassin the one answer in the game to an enemy that
// stands off out of reach.
//
// A DEAD OR MUSTERING MAN IS NOT HIDDEN, he is absent; every caller already skips
// him on `respawn` and `hp`, so this does not repeat that.
export const hidden = u => !!u.def.hidden && !u.exposed;

// Where each man in the squad should be standing, given the tower's rally.
//
// Split out from makeUnits because moving the rally must not create anybody:
// the standing orders change, the men do not. See moveUnits.
function stations(tower) {
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
  return stationsOn(tower, nearestOnPath(held.x, held.y));
}

// The squad's stations around one point of one road, given as a {route, s} the
// way nearestOnPath returns it. Split out of stations() so the two-road fallback
// at the bottom can start again on the other road without repeating any of this.
//
// TWO QUESTIONS, TWO FUNCTIONS, and the split is what fixed a bug the owner
// reported as "my assassins cannot rally to my selected rally point". WHICH POINT
// OF THE ROAD the squad gathers on is not the same question as WHERE THE THREE
// MEN STAND around it — and only the first one has an answer the FLAG needs. The
// flag used to be drawn at the raw drag, clamped to the ring; on a stretch that
// runs away from the tower that lands off the road and up to 288px from anywhere
// the men can stand, so the player plants a bright flag, the squad walks
// somewhere else, and the tower looks broken. Now both read postOn.
function stationsOn(tower, base) {
  return layoutOn(tower, postOn(tower, base));
}

// Where each man stands, given a point along a road.
function layoutOn(tower, post) {
  const s = tower.def.soldier;
  const road = level.routes[post.route];
  const out = [];
  for (let i = 0; i < s.count; i++) {
    const [along, across, splay] = FORMATION[i % FORMATION.length];
    // `along` follows the road's curve; `across` steps off the tangent there.
    // Walking by arc length keeps a squad on a bending road: offsetting along
    // one segment's straight tangent puts a man 24px "forward" onto the grass
    // on the outside of a bend, far enough that enemies pass outside ENGAGE
    // without ever being blocked.
    const at = pointOn(road, post.s + along);
    out.push({
      rx: at.x - at.ty * across,
      ry: at.y + at.tx * across,
      // At rest a soldier watches the way the enemies come from, which is back
      // along the segment they walk. Only the left/right of this is drawn.
      faceIdle: Math.atan2(-at.ty, -at.tx) + splay * Math.PI / 180
    });
  }
  return out;
}

// WHICH POINT OF WHICH ROAD, as a {route, s}. Everything below this line used to
// live inside stationsOn and decided the same thing; the only change is that it
// now returns the answer instead of laying men out on it.
function postOn(tower, base) {
  const road = level.routes[base.route];

  // AND THEN BACK OFF ALONG THE ROAD UNTIL THE RALLY ITSELF IS INSIDE THE RING.
  //
  // The clamp above is not enough on its own. It pulls the rally onto the ellipse
  // and then the road is found again from there — so on a stretch that runs away
  // from the tower, the snapped point lands back OUTSIDE the ellipse, and the men
  // are posted somewhere the player was never allowed to drag to.
  //
  // THE RALLY, NOT THE WHOLE WEDGE, and the difference is worth a paragraph
  // because it shipped the other way round for a few hours and was reported
  // within the day. Requiring all three men inside sounds stricter and better; what
  // it actually does is stop the squad 20 to 56px SHORT of the flag on every plot
  // of map 3, because the formation is 24px deep and the flag is at the edge. The
  // flag is a promise — the men go where it is — so what has to be inside the ring
  // is the flag, and the wedge is allowed to spread the width of itself past it,
  // exactly as it always did. The leash in updateUnits carries the same margin.
  //
  // A LINEAR WALK RATHER THAN A BISECTION, for the same reason: a road bends, so
  // "inside the ring" is not one contiguous stretch of it, and bisecting between
  // two ends of a broken interval lands wherever the halving happens to fall.
  // Stepping back from the point the player asked for takes the first spot that
  // works, which is the nearest one to the flag they dropped.
  //
  // If no part of this road is in reach the walk finds nothing, and the two blocks
  // at the bottom say what happens then.
  const fits = at0 => {
    const q = pointOn(road, at0);
    return inRange(q.x, q.y, tower.x, tower.y, tower.def.range);
  };

  if (fits(base.s)) return { route: base.route, s: base.s };

  const back = nearestOn([road], tower.x, tower.y).s;
  const step = base.s > back ? -4 : 4;
  for (let at0 = base.s + step; (at0 - back) * step < 0; at0 += step) {
    if (fits(at0)) return { route: base.route, s: at0 };
  }
  if (fits(back)) return { route: base.route, s: back };

  // NOTHING ON THIS ROAD IS IN REACH, which on a map with two of them is not the
  // dead-plot case at all: the player dragged toward the other road, the clamp
  // landed nearest to it, and the whole of it is out of the tower's ring. Fall
  // back to the road the TOWER is nearest — where an un-rallied squad stands —
  // rather than to a point on a road it cannot reach. Map 3 is the only map that
  // can produce this, and it did: two rallies in 352 posted a Paladin Keep's men
  // 1.19 ring-radii out.
  const own = nearestOnPath(tower.x, tower.y);
  if (own.route !== base.route) return postOn(tower, own);

  // AND IF NO PART OF ANY ROAD IS IN REACH, the squad stands on the piece nearest
  // the tower. That plot cannot post a squad in range at all — map 1's plot 5 is
  // 146px from the road, which is inside a 165 circle and OUTSIDE the 165 ellipse,
  // because reach is squashed to 0.79 vertically and that road runs above it — so
  // there is no right answer, only a stable one. It used to keep whatever the drag
  // snapped to, which put the men 345px away on a tower that reaches 210: the
  // further the player dragged, the further from the tower they went, on a plot
  // where every direction is equally out of range.
  return { route: base.route, s: back };
}

// WHERE A FLAG DROPPED HERE WILL ACTUALLY PUT THE SQUAD, as a point on the board.
//
// The same three steps stations() takes — find the road, hold it inside the ring,
// find the road again — and then the walk back along it that postOn does. It is
// exported for the two places that draw or store a flag, so that the picture the
// player is given and the order the men obey are one answer rather than two.
//
// IDEMPOTENT, which is what lets input.js store the result as `tower.rally`: the
// point that comes back is on the road and inside the ring, so running stations()
// on it finds it fits on the first test and posts the squad exactly there.
export function rallyPoint(tower, x, y) {
  const near = nearestOnPath(x, y);
  const held = clampToRange(tower.x, tower.y, near.x, near.y, tower.def.range);
  const post = postOn(tower, nearestOnPath(held.x, held.y));
  return pointOn(level.routes[post.route], post.s);
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
      // Whether his next blow is a Sneak Attack. TRUE FROM BIRTH, and that is the
      // right answer rather than a convenience: an assassin musters unseen, so he
      // is already armed by the time anybody could be looking at him. Every other
      // soldier carries it and never reads it. See the arming line in updateUnits.
      sneak: true,
      // Whether anything is close enough for him to attack right now — see the
      // note beside the line that sets it. FALSE from birth: a man mustering
      // behind a barracks has nothing in reach, which is also the answer that
      // leaves him hidden on the frame before his first update.
      exposed: false,
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

// --- what a soldier throws ------------------------------------------------------

// The nearest live enemy within reach of a man standing still, or null.
//
// THROUGH inRange LIKE EVERY OTHER REACH IN THE GAME, because the board is drawn
// in perspective and a round patch of ground is drawn squashed. A soldier using a
// plain radius would throw further up the screen than down it, and the ring
// render.js draws would be a lie about which men he can hit.
//
// It does NOT ask about the leash. `range` on a barracks tier is the circle the
// men may be POSTED inside — where their feet may go — and a knife is not his
// feet. He throws 200px from wherever he is standing, and the one thing that
// stops him is running out of enemies.
function nearestFoe(state, u, reach) {
  let best = null;
  let least = Infinity;
  for (const e of state.enemies) {
    if (e.hp <= 0 || e.leaked) continue;
    if (!inRange(u.x, u.y, e.x, e.y, reach)) continue;
    const d = Math.hypot(e.x - u.x, e.y - u.y);
    if (d < least) { least = d; best = e; }
  }
  return best;
}

// A knife leaves a soldier's hand, at an enemy.
//
// THE SOLDIERS' HALF OF loose() IN enemies.js, and deliberately the same shape:
// the hand is derived from the man's own drawing rather than typed, so nothing
// needs re-measuring when the artist redraws him, and the DAMAGE is passed in
// rather than read off the ammunition — the caller has already folded in the half
// and the Sneak Attack double, exactly as a tower's shot carries the number its
// abilities worked out rather than the one on the arrow.
//
// NO `side`, which is the whole of what makes this the player's. projectiles.js
// reads an absent `side` as "looks for enemies", exactly as it does for every
// arrow a tower has ever fired, so a man throwing needed no branch there at all.
function fling(state, u, mark, damage, ammo) {
  const up = u.def.spriteTrim[3] * u.def.pivot[1] * SCALE * 0.55;
  const from = { x: u.x, y: u.y - up };

  state.shots.push({
    x: from.x,
    y: from.y,
    angle: Math.atan2(mark.y - from.y, mark.x - from.x),
    // Where it was thrown FROM, so the body ends up facing the blow. The
    // projectile's own x is no use: by the time it lands it is on top of the man.
    fromX: u.x,
    target: mark,
    damage,
    splash: 0,
    // WHICH KNIFE, passed in rather than looked up, because the caller is the only
    // thing that knows whether this one is a Sneak Attack — and the picture in the
    // air is the only place on the board that difference shows.
    ammo,
    speed: ammo.speed
  });
}

export function updateUnits(state, dt) {
  // DIVINE FORTITUDE, and it is applied here rather than at muster.
  //
  // A man's maximum health is his def's times whatever the map's auras say, read
  // fresh every frame. That one line covers every case a hook would have had to:
  // the ability bought mid-wave reaches men already standing on the road, the
  // temple sold takes it back off them, a man who musters afterwards gets it
  // without anything telling him, and two temples do not stack — see auras() in
  // src/towers.js. Nothing has to remember to call anything.
  //
  // ONCE PER FRAME, not once per man: the lookup walks the tower list, and doing
  // that for thirty-three men sixty times a second is work for no answer that
  // could differ.
  const wall = boost(state, 'hp', 'barracks');

  for (const u of state.units) {
    // A WOUNDED MAN STAYS AS WOUNDED AS HE WAS. Raising the ceiling under him
    // without moving his health would heal nobody and quietly make him weaker as
    // a share of it; scaling both keeps the bar where the player last saw it and
    // is the only reading under which selling the temple cannot kill anybody.
    const max = u.def.hp * wall;
    if (u.maxHp !== max) {
      u.hp = max * (u.hp / u.maxHp);
      u.maxHp = max;
    }

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
        // BACK TO EXACTLY ZERO, not to the small negative the subtraction lands
        // on. The clock had been left at about -0.016 for the rest of the game,
        // which is not wrong for anything that COMPARES it — everything here
        // asks `> 0` or `<= 0` — but it made "has he mustered again" a question
        // whose honest answer was falsy for one value and truthy for the one it
        // actually held. projectiles.js asked it the short way and stopped
        // applying a flask's blow to any man who had ever died. That reader is
        // fixed too; this is the half that stops the next one being caught.
        u.respawn = 0;
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
    //
    // PLUS THE WIDTH OF THE WEDGE, and that margin is not slack. The rally is
    // inside the ring and the formation is laid out around it — see stations() —
    // so a man posted at the far edge stands a little outside it himself. Leashed
    // to the bare ring he could not help with a fight happening at his own feet,
    // which is the one place he certainly should. WEDGE is the furthest a station
    // sits from the flag, so the leash reaches exactly as far as the squad does.
    const home = u.tower;
    const leashed = (x, y) => inRange(x, y, home.x, home.y, home.def.range + WEDGE);

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

    // 1b. Give up on a target that is nobody's fight any more, and go back to
    //     the post. The only place a soldier drops a target without a fight
    //     ending: he was helping with a block and the man who had hold of it is
    //     dead, so there is no fight to help with.
    //
    //     Three things have to be true together, and each rules out a case this
    //     must not touch: he does not HOLD his target, so a block is never
    //     dropped; nobody else holds it either, so he is not walking away from a
    //     fight still going on; and it is not standing off. After pass 1 rather
    //     than before it, or it would release the assistant that pass is about
    //     to promote.
    //
    //     THE HALTED TERM IS NOW ALWAYS TRUE and is kept as a statement of the
    //     rule rather than as a test: nothing gives a soldier a halted thrower
    //     for a target any more — see "there is no pass 4" below — and a thrower
    //     somebody has hold of is not halted. It costs a comparison and it is
    //     what this line means.
    if (u.foe && !u.holds && !u.foe.foe && !u.foe.halted) release(u);

    // 1c. Come home. He is helping with a fight that is outside his tower's ring,
    //     or standing over one that drifted out of it, and helping is the part of
    //     his job the leash takes away first.
    //
    //     Three conditions, and each rules out a case this must not touch. He does
    //     not HOLD his foe, so the wall is never dropped — a blocker who took an
    //     enemy at the edge of the ring keeps it, because the enemy came to him and
    //     letting go would open the road. It is not a halted thrower, which is
    //     vacuous now for the reason 1b gives and kept for the same reason. And
    //     the fight really is outside, measured against the same ellipse the
    //     player was shown.
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

    // THERE IS NO PASS 4. A soldier never walks out to a thrower, and the
    //    absence is deliberate enough to be worth a heading of its own.
    //
    //    There WAS one. A plague doctor stops out at 130 and an archer at 200,
    //    both further than anything above, so a squad had no answer to either —
    //    and the fourth pass sent one man out to close the distance, on the
    //    reasoning that reach is symmetric: if he is near enough to throw at
    //    this man, this man is near enough to walk at him.
    //
    //    THE OWNER'S RULE IS SIMPLER AND IT WINS. "Soldiers should stay within
    //    their rally point. It is okay if they are attacked from afar and cannot
    //    do anything." A rally flag is an order, and a squad that abandons the
    //    ground it was posted to hold the moment somebody shoots at it is not
    //    obeying it — it is being led away, which is the same thing a thrower
    //    would do on purpose if he could.
    //
    //    WHAT IT COSTS is that a thrower who stops outside every tower's reach
    //    is nobody's problem: he works on the line and nothing goes out to stop
    //    him. That is the answer a bow already gives a man out of range, and it
    //    is the player's to solve — move the rally, or put something where it
    //    can see him.
    //
    //    AND IT COSTS THE BOARD ITS LIVENESS ARGUMENT, which mattered more and
    //    is why the wave loop changed with this. This pass was what guaranteed
    //    every thrower eventually died or reached the exit, and a wave only ends
    //    when the field is clear — so without it a halted thrower can hold a
    //    wave open forever. updateWaves no longer takes that promise on trust:
    //    it times the wave out. See the stall clock there.

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
      // A SHARE OF HIS OWN MAXIMUM rather than a number of points, so the heal
      // follows the man it is healing: 220 on a paladin's 275, and 264 under a
      // Divine Fortitude that raised him to 330. Read off `maxHp` rather than off
      // the def for exactly that reason — the aura is already in it.
      u.healing = (light.healFrac * u.maxHp) / light.seconds;
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

    // WHO HE WOULD THROW AT THIS FRAME, worked out ONCE and used twice: it is what
    // he turns to face and it is what he throws at. Two separate answers would be
    // a man who turns to one enemy and puts a knife in another.
    //
    // Only for a man at his post whose tower has bought the knife, so the scan
    // costs every other soldier in the game one `owns` check on a short array.
    const throwing = !u.foe && d <= SETTLE ? ability(u, 'knife') : null;
    const mark = throwing ? nearestFoe(state, u, throwing.reach) : null;

    // A MAN COMMITTED TO A POSE DOES NOT TURN, and this is the first branch
    // because it outranks every reason to look somewhere else. `hold` is a swing
    // he is in the middle of — a Sneak Attack, a Holy Slash, a knife leaving his
    // hand, a paladin kneeling in the light — and a figure that pivots half way
    // through one is a figure whose drawing and heading have come apart.
    //
    // THE BUG IT FIXES was reported on the assassin and was never his alone. A
    // Sneak Attack holds its pose for 0.80s, and if the blow KILLS its man the
    // release below clears `foe` on the very next frame — so he spent the rest of
    // the second lunging with a dagger while turned to face his post. Measured at
    // 2851 of 3456 posed frames pointing the wrong way. Holy Light has carried the
    // same fault since it shipped, for three seconds at a time.
    if (u.hold > 0) { /* keep the heading he struck with */ }
    else if (u.foe) u.face = Math.atan2(u.foe.y - u.y, u.foe.x - u.x);
    // A MAN FACES WHAT HE IS THROWING AT, for as long as there is somebody in
    // reach — not for the quarter second of the throw, which is what this was and
    // what made him spin.
    //
    // THE BUG THAT WAS: the reveal is a quarter second and the reload is eight
    // tenths, so a `thrust > 0` test turned him toward his mark, then let the
    // branch below snap him back to his post's heading for the remaining half
    // second, then turned him again for the next knife. An enemy standing on his
    // off side made that a flip twice a knife — the owner's "they flip left and
    // right after throwing knife". Holding the mark's heading for as long as the
    // mark exists is one turn per enemy instead of two per throw.
    //
    // It ranks under `foe` because somebody with hold of him outranks a mark out
    // in the road, exactly as it does for a thrower in enemies.js.
    else if (mark) u.face = Math.atan2(mark.y - u.y, mark.x - u.x);
    else if (d > SETTLE) u.face = Math.atan2(ty - u.y, tx - u.x);
    else u.face = u.faceIdle;

    // --- IS HE GIVING HIMSELF AWAY THIS FRAME --------------------------------
    //
    // "Anytime there is no enemy in range or if they start walking, they turn
    // invisible" — the owner's rule, and this line is the whole of it. Set here,
    // read by hidden(), because it is the one question about an assassin that
    // needs the BOARD and not just the man: whether anything is standing close
    // enough for him to hurt.
    //
    // TWO WAYS TO BE SEEN, and they are the two ways he attacks:
    //
    //   a foe inside REACH   he is swinging, and stays visible for the whole
    //                        fight rather than flashing once a blow
    //   a mark in reach      he is throwing, and stays visible for the whole
    //                        volley rather than once a knife
    //
    // AND THE GAP BETWEEN THEM IS DELIBERATE. REACH is 20 and a soldier takes his
    // foe at ENGAGE's 30, so for the eighth of a second it takes him to close that
    // last ten pixels he is attacking nothing by either test and DROPS OUT OF
    // SIGHT. It was reported as a bug and it is not one: it is the stalk. He fades
    // as he steps in, re-arms while he is gone — see the arming line below — and
    // the blow he arrives with is a Sneak Attack. Taking it out cost him his
    // opening strike on anything that walked into knife range first, which is why
    // it is back.
    //
    // WALKING NEEDS NO CLAUSE OF ITS OWN. A man closing on a foe is further off
    // than REACH by definition, and `mark` is only looked for once he has settled
    // — so marching to a rally point and stalking toward an enemy both fall out of
    // this as invisible, which is what was asked for.
    //
    // AND IT IS WHY SNEAK ATTACK IS NOT ABSURD. It re-arms only while hidden, so
    // this decides how often: it used to flash off between knives — a quarter
    // second of reveal against eight tenths of reload — which made EVERY knife a
    // sneak and the pair worth 150 damage a second. Now a volley opens with one
    // and the rest are ordinary, and he re-arms when the road in front of him is
    // clear — or for the moment he spends stepping in from ENGAGE to REACH.
    u.exposed = !!((u.foe && d <= REACH) || mark);

    if (d > SETTLE && u.hold <= 0) {
      const step = Math.min(u.def.speed * dt, d);
      u.x += ((tx - u.x) / d) * step;
      u.y += ((ty - u.y) / d) * step;
    }

    u.cd -= dt;
    u.thrust = Math.max(0, u.thrust - dt * THRUST_DECAY);

    // SNEAK ATTACK COMES BACK BY HIDING, and this one line is the whole of the
    // "only resets when they become invisible and visible again" rule. It is
    // AFTER the thrust decay above and BEFORE the two attacks below, so the frame
    // a man's lunge finishes is the frame he is armed again — the same frame the
    // screen starts drawing him faint.
    //
    // hidden() is false for everybody who is not an assassin, so this costs every
    // other soldier in the game one property read.
    if (hidden(u)) u.sneak = true;

    if (u.foe && d <= REACH) {
      // Each side spatters the one it HITS, so a melee throws blood both ways
      // and you can see which of the two is currently landing blows.
      // `u.hold` is the second half of the guard, and it is what a held pose
      // actually costs. Holy Slash's hold is now the man's OWN swing — see below —
      // so the two clocks run out on the same frame and the strike costs him
      // nothing; Holy Light's three seconds are three seconds of not swinging, and
      // are meant to be.
      if (u.cd <= 0 && u.hold <= 0) {
        // HOLY SLASH: the fourth blow, and only the fourth. `blows` counts this
        // one, so `every: 4` means three ordinary swings and then the strike — read
        // the field as the length of the cycle, exactly as the musketeer's is.
        const slash = ability(u, 'slash');
        const special = slash && (u.blows + 1) % slash.every === 0 ? slash : null;

        // SNEAK ATTACK: whatever this blow was going to be, doubled, because he
        // was not there a moment ago. Asked in that order — `u.sneak` first, the
        // ability second — so a spearman never touches the ability table: the flag
        // is armed for every soldier in the game and only an assassin's tower has
        // anything to spend it on.
        //
        // It STACKS onto the special rather than replacing it, which costs nothing
        // to write and is the only answer that stays right: Holy Slash and this
        // belong to different towers today, but a barracks tier 4 that had both
        // would want an opening strike worth five AND double, not a rule about
        // which one wins.
        const sneak = u.sneak ? ability(u, 'sneak') : null;

        // A MULTIPLE OF HIS OWN BLOW, the same shape shoot() reads on a tower: a
        // magnitude here is a multiplier of the stat it changes, so it survives the
        // next retune of that stat. `damage` is still honoured for an ability that
        // really means an absolute number.
        u.foe.hp -= (special
          ? (special.times ? u.def.damage * special.times : special.damage)
          : u.def.damage) * (sneak ? sneak.times : 1);
        // SPENT, whether or not anything was bought. The flag means "his next blow
        // is the one he lands on showing himself", and that is true of every man
        // here; the ability is what turns it into damage. Re-armed by hiding, and
        // by nothing else — see the line above the melee block.
        u.sneak = false;
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
        } else if (sneak) {
          // NO CLIP OF ITS OWN. Sneak Attack is his own blade, harder — so it is
          // the same recording played louder rather than a fourth take of a
          // dagger, which is the artist's ask and the pope's trick from `fireGain`
          // used on a man. See `loud` on the ability for why 1.8 and not 2.
          u.hold = sneak.hold ?? u.def.cd;
          u.holdArt = sneak.pose;
          play(blowCue(u.def), sneak.loud);
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
    } else if (!u.foe && d <= SETTLE && u.cd <= 0 && u.hold <= 0) {
      // --- KNIFE THROW ---------------------------------------------------------
      //
      // AT HIS POST AND WITH NOBODY ON HIM, which is exactly the state this
      // ability exists to make useful. Before it, a settled soldier with no foe
      // did nothing whatsoever, and against an enemy that stands off and throws he
      // went on doing nothing until the wave clock gave up — see the note on
      // hidden() above and check 5 in tools/plague.mjs.
      //
      // `d <= SETTLE` is "he has arrived", the same test the step above uses to
      // stop him walking. A man still marching does not throw: `hold` freezes him
      // for a quarter second each time, and a squad flicking knives across the map
      // would crawl to a rally point it was ordered to run to.
      //
      // THE SAME CLOCK AS A SWING. `cd` is his attack cooldown and this branch is
      // the else of the melee one, so he throws at his own rate and can never
      // throw and strike in the same beat — a knife is what he does INSTEAD of a
      // blow, not as well as.
      if (mark) {
        // HALF A BLOW, DOUBLED IF HE WAS UNSEEN — and both are multiples of his
        // own damage, so the knife follows him through any retune of the 20. See
        // both entries in data/abilities.js for why it is the first knife of a
        // volley and not every one of them.
        const sneak = u.sneak ? ability(u, 'sneak') : null;
        // `thrownTimes ?? times` is where "the blade is worth more than the knife"
        // lives. A sneaked BLOW takes the ability's ordinary multiple; a sneaked
        // THROW takes the smaller one it names for the purpose, because getting to
        // arm's length is a risk and flicking a knife from 100px is not. An
        // ability with no opinion about the difference names one number and gets
        // it in both places.
        //
        // Rounded, so a health bar never has to show a fraction of a point —
        // the same rounding shoot() does on every tower's shot. And a sneaked
        // knife is a DIFFERENT DRAWING, so a squad throwing two numbers is
        // visibly throwing two things: the ability names its own ammunition and
        // this picks it, the same way shoot() prefers a special's ammo on a tower.
        fling(state, u, mark,
          Math.round(u.def.damage * throwing.times *
            (sneak ? (sneak.thrownTimes ?? sneak.times) : 1)),
          (sneak && sneak.ammo) || throwing.ammo);
        u.sneak = false;
        u.cd = u.def.cd;
        // MID-THROW FOR THE LENGTH OF A LUNGE. The reveal is no longer one of
        // these — it belongs to `exposed` above and lasts as long as the volley —
        // so what this pair still buys is the drawing and the heading, which hold
        // together and expire together.
        u.thrust = 1;
        u.hold = LUNGE;
        u.holdArt = throwing.pose;
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
