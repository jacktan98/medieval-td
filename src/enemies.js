import { level, remaining } from './level.js';
import { at as pointOn, laneOf, randomLane, nearestOn } from './route.js';
import { enemyTypes } from './data/waves.js';
import { dropCorpse } from './corpses.js';
import { unhook, hidden } from './units.js';
import { inRange } from './ground.js';
import { SCALE } from './data/towers.js';
import { solo, play, CUE, FIRING, DEFEND, HEAL,
         BOSS_ENTERS, BOSS_HURT, BOSS_HEALED, BOSS_DYING, BOSS_FALLEN } from './audio.js';
// Only the tick. An enemy that dies is dropped from the array on the same frame,
// so there is nothing left to clear anything off — where a soldier musters again
// and has to be given back clean.
import { tick as tickStatus, slowOf, apply as applyStatus } from './status.js';
import { typeOf, pierceOf, stageOf, timesOf } from './data/armour.js';

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
    halted: false,
    // SECONDS OF SHIELD LEFT, and only the Blocker Thug ever has any. Set by a
    // projectile landing on him — see `raiseGuard` below — refreshed by every one
    // after it, and counted down in updateEnemies.
    //
    // On every enemy rather than only on the one that uses it, the same rule
    // `tcd` follows two fields up: the shape of an enemy is written down in one
    // place, so nothing has to test whether the field exists before reading it.
    // `wornBy` and `enemyStance` both read it, and both would need a guard of
    // their own if it could be undefined.
    guard: 0,
    // SECONDS OF CAST LEFT, and only the Dark Priest ever has any. He stands still
    // for the whole of it and the mend lands when it reaches zero. On every enemy
    // for the reason `tcd` and `guard` are: one shape, so nothing has to test
    // whether the field is there before reading it.
    cast: 0,
    // Who the cast is FOR, held across the two seconds it takes. A reference to
    // the live figure, so a target that dies mid-cast is caught by its own `hp`
    // rather than by an index into a list that has moved.
    mending: null,
    // SECONDS BEFORE ANY PRIEST MAY MEND THIS ONE AGAIN, and it is on the man
    // rather than on the healer.
    //
    // IT WAS THE PRIEST'S OWN MEMORY — a list of who he had just worked on — which
    // is the more literal reading of "he goes back to the same unit after 30
    // seconds" and let two priests standing together tag-team one giant, each
    // inside the other's gap. The owner asked for the other one: the cooldown
    // belongs to the man, so a crowd of priests is a crowd covering more ground
    // rather than a crowd keeping one creature permanently topped up.
    //
    // ONE NUMBER RATHER THAN A LIST, which is the whole of what the move bought.
    // The list held references to live enemies and had to drain itself to avoid
    // keeping a dead thug reachable; this cannot outlive its own figure, because
    // it IS its figure. And `e.mendCd > 0` is false on a hand-built enemy that has
    // no such field, so it needs no guard where the list did — see the four tools
    // that stand enemies up without spawn().
    mendCd: 0,
    // --- THE BOSS'S FIVE, and they are on every enemy for the reason the four
    // above are: the shape of an enemy is written down in one place, so `wornBy`,
    // `enemyStance` and `striking` can read them without asking first whether the
    // field exists. Every one of them is 0, null or 1 for the whole roster.
    //
    // WHICH HALF OF HIS FIGHT HE IS IN. 1 until he drops below a quarter and heals,
    // 2 for the rest of his life, and there is no way back — which is what makes
    // the owner's "for the first time" enforceable without a second flag to get out
    // of step with this one. See `rage` on captain_thug in data/waves.js.
    stage: 1,
    // THE SCRIPTED BEAT HE IS LOCKED INTO, or null. One of 'pause', 'mend', 'fall'
    // or 'rest' — the four moments where he stands still and the game plays out a
    // drawing on a clock. It is deliberately NOT where the reload and the shot
    // live: those two are poses he strikes while walking, and folding them in here
    // would make "is he locked" and "which picture" the same question when they
    // are not.
    act: null,
    actT: 0,          // seconds left in it
    // NOCKING AN ARROW. Half a second in which he is committed to the shot but
    // nothing has left the bow, and the only wind-up drawing in the game.
    nock: 0,
    // AND HOLDING THE LOOSE. Half a second of the shooting pose after it, timed
    // rather than decayed — `thrust` fades over a quarter second and drags a lunge
    // with it, and the owner asked for two equal half-second beats with no lurch.
    shot: 0,
    // HAS HE ALREADY CRIED OUT AT A THIRD HEALTH. The owner asked for that line
    // once and once only, and it is a DIFFERENT threshold from the transformation
    // — 30% against 25% — so it cannot be inferred from the stage. It is a warning
    // shot: you hear him falter about a second before he throws the shield away.
    cried: false,
    // AND HOW MANY MEN HE HAS PUT DOWN, for the line he gives every fifth one.
    // Counted on the killer rather than on the game, so two bosses on one board
    // would each keep their own tally.
    kills: 0,
    // What is being done to him, and the same field a soldier carries: an enemy
    // can be burnt where a soldier can be poisoned, through one mechanism that
    // does not know which army it is looking at. See src/status.js.
    statuses: []
  });

  // HE ANNOUNCES HIMSELF. Category A, so it ducks whatever else is playing: the
  // boss walking on is the loudest thing that happens in a run and it should not
  // have to share the moment with an arrow.
  //
  // On the SPAWN rather than on the first frame of his update, because a wave can
  // send him while the player is looking somewhere else and the cry is what turns
  // them round.
  if (def.boss) solo(BOSS_ENTERS);
}

// IS THIS FIGURE PLAYING OUT ITS DEATH? True for the four seconds a boss spends
// losing, and false for everything else in the game on every frame of its life.
//
// He is still in `state.enemies` for the whole of it — that is the entire point,
// and it is what the owner asked for: "after this 2 seconds, then only the game
// can end". A wave clears when the field is empty, so staying on the field is how
// a boss holds the run open while he falls over.
//
// But being on the field is all he does. Nothing may aim at him, no soldier may
// take hold of him, he does not walk, shoot, swing or take damage, and his health
// bar comes off. Every one of those is a caller asking this.
//
// EXPORTED because it is a RULE, the same argument enemyStance and guardSlow are
// exported on: four files need the same answer and a rule nothing can ask is a
// rule nobody can check. tools/facing.mjs asks it.
export const downed = e => !!e && (e.act === 'fall' || e.act === 'rest' || e.act === 'gone');

// HOW MUCH OF HIS WALK A RAISED SHIELD COSTS HIM, as a multiplier, and 1 for
// everything in the game that has no shield.
//
// Exported for the same reason enemyStance is: it is a RULE, and tools/facing.mjs
// checks rules rather than trusting them.
export function guardSlow(e) {
  const now = stageOf(e);
  return e.guard > 0 && now.guard ? (now.guard.slow || 1) : 1;
}

// SOMETHING HIT HIM FROM A DISTANCE, so the shield goes up — and stays up for
// five seconds after the LAST thing that hit him rather than the first.
//
// Called from projectiles.js, on the line where a shot lands, and from nowhere
// else. That is the definition the owner asked for: "when he takes in 1st
// projectile damage". A burn ticking on him is not a projectile and does not
// count, which is right twice over — it is not something he can see coming, and a
// status that kept the shield up would make Fiery Shot the worst possible answer
// to him rather than merely a poor one.
//
// A no-op on everything else in the game, so the call site does not have to ask
// what it just hit.
export function raiseGuard(fig) {
  if (!fig || !fig.def) return;
  // OF THE STAGE HE IS IN. The Captain throws his shield away at a quarter
  // health and the owner's rule is that he then "no longer defends himself when
  // projectiles hit him" — which is not a test here but an absence in the data:
  // `rage` declares no `guard`, so there is nothing to raise. Same for his bow
  // and his nocking pose. See stageOf in data/armour.js.
  const now = stageOf(fig);
  if (!now.guard) return;
  // ON THE WAY UP ONLY. This runs for every projectile that lands on him — that is
  // the whole point of it, since each one refreshes the five seconds — so playing
  // the clip here unconditionally would make a Blocker under steady fire the
  // loudest thing on the board. What the player needs to hear is the shield
  // GOING UP, which is the moment the drawing changes.
  if (fig.guard <= 0) play(DEFEND);
  fig.guard = now.guard.seconds;
}

// --- THE BOSS'S SCRIPT ----------------------------------------------------------
//
// Four beats, each a drawing held for a fixed number of seconds while he stands
// still and does nothing else. Two of them are the second stage arriving and two
// are him dying, and they are one mechanism because they are the same shape: a
// pose, a clock, and what happens when the clock runs out.
//
// REAL SECONDS, not scaled by slowOf. A monk's pulse makes a figure slower at
// what it is DOING; these are not things he is doing, they are things happening
// to him on a script the player is watching. Slowing them would make a monk's
// aura lengthen a boss's death animation, which is nonsense twice over.
const BEATS = {
  // He stops, throws the shield and bow away, and channels. Hittable throughout,
  // and this is the window.
  pause: { next: 'mend',   at: d => d.rage.pause.seconds },
  // He mends, behind high plate. What he gets is granted when it FINISHES rather
  // than trickled, so a player who kills him inside the three seconds gets the
  // whole of that reward — see `land` below.
  mend:  { next: null,     at: d => d.rage.mend.seconds },
  // Beaten and standing, sword dropped.
  fall:  { next: 'rest',   at: d => d.finale.fall.seconds },
  // And on the ground. When this runs out he leaves the enemy list and a corpse
  // takes his place, which is a handover the player cannot see: the body on the
  // ground is the same drawing either side of it.
  rest:  { next: 'gone',   at: d => d.finale.rest }
};

// THE ONE ACT THAT IS NOT A BEAT. 'gone' means the script has finished and the
// sweep at the bottom of updateEnemies should take him off the board — it is a
// message from the clock to the sweep, not a drawing.
//
// It exists so that finishing the script and being REMOVED are two different
// moments. Without it, 'rest' running out would leave him with `hp <= 0` and no
// act at all, and the ordinary death path would pay his bounty a second time.
const GONE = 'gone';

// WHAT EACH BEAT SOUNDS LIKE STARTING, or nothing. Beside BEATS rather than
// inside it so that the table stays about timing: one says how long a beat runs
// and the other says what it sounds like, and a beat with no cue is simply absent
// here rather than carrying a null.
//
// The pause has none on purpose. He has just cried out at 30% — see the warning in
// bossBeat — and a second line a moment later would tread on it; what covers the
// channelling is his silence, which is the tell.
const BEAT_CUE = { mend: HEAL, fall: BOSS_DYING, rest: BOSS_FALLEN };

// Start a beat.
function begin(e, act) {
  e.act = act;
  e.actT = BEATS[act].at(e.def);
  // ON THE FRAME THE POSE COMES UP, not the frame it finishes, which is the rule
  // the Dark Priest's cast already follows: the sound covers the beat rather than
  // marking its end. Category B for the mend, because it is the shared enemy heal
  // and two creatures could be casting; Category A for the two death beats.
  const cue = BEAT_CUE[act];
  if (cue) (act === 'mend' ? play : solo)(cue);
  // Everything he was doing stops. A shot half-nocked is lost rather than banked,
  // on the rule the Dark Priest's interrupted cast follows: a moment that gets
  // taken off you should cost you the moment.
  e.nock = 0;
  e.shot = 0;
  e.halted = true;
}

// A beat has finished. What that means depends on which one it was.
function land(state, e) {
  const done = e.act;
  const after = BEATS[done].next;

  if (done === 'mend') {
    // HALF HIS MAXIMUM, at the owner's word, and capped at the bar. A flat share
    // rather than a status: nothing can refresh it, nothing can stack with it, and
    // a Dark Priest's dark healing running on him at the same time is a separate
    // number through a separate mechanism, which is correct — they are two
    // different creatures mending him.
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.def.rage.mend.share);
    // AND HE SAYS SO. The owner's cue is "when his health is fully recovered after
    // the 3 seconds" — this line, not the start of the mend, which has its own
    // sound above. Category A: it is the moment the player learns the fight is not
    // over, and it should cut through whatever they are doing about it.
    solo(BOSS_HEALED);
    // AND HE IS THE OTHER CREATURE NOW. Set here rather than when the pause began,
    // so the whole five seconds of the transition are fought against the armour he
    // is transitioning IN — medium for the pause, high for the mend — and the low
    // plate arrives with the enraged drawing rather than before it.
    e.stage = 2;
  }

  // THROUGH begin() rather than by assignment, so every beat is entered the one
  // way: its clock set, whatever he was doing cleared, and its sound played. It
  // was two lines of assignment here, and the cost was exactly what you would
  // expect — the beats reached from this function were the silent ones.
  //
  // GONE is not a beat and has no entry in BEATS, so it is set plainly. It is a
  // message to the sweep, not something he does.
  if (after && BEATS[after]) {
    begin(e, after);
  } else {
    e.act = after;
    e.actT = 0;
    // Back on his feet, which only happens at the end of the mend: the other chain
    // ends at GONE and he never walks again.
    if (!after) e.halted = false;
  }
}

// One frame of the script. Returns true when it has owned the frame, which is
// every frame he is in a beat: a boss standing still does not walk, shoot, swing,
// guard or heal, and returning true is how this file says so exactly once instead
// of guarding five blocks below.
function bossBeat(state, e, dt) {
  const d = e.def;

  // Finished, and waiting for the sweep. Nothing left to tick.
  if (e.act === GONE) return true;

  if (e.act) {
    e.actT -= dt;
    if (e.actT <= 0) land(state, e);
    return true;
  }

  // A THIRD OF THE WAY DOWN HE FALTERS, once, and it is deliberately NOT the same
  // number as the transformation. 30% is a warning and 25% is the thing it warns
  // about, so a player hears him break about a second before the shield comes off
  // — long enough to change what they are doing and not long enough to relax.
  //
  // `cried` rather than a health comparison, because health goes back UP: he heals
  // to 50% and would otherwise cross 30 a second time on the way down.
  if (d.rage && !e.cried && e.hp > 0 && e.hp < e.maxHp * 0.3) {
    e.cried = true;
    solo(BOSS_HURT);
  }

  // THE SECOND STAGE, at a quarter health and once. `e.stage` is its own guard:
  // this can only fire in stage 1 and `land` leaves him in stage 2 forever, so
  // "for the first time" needs no separate flag.
  //
  // ALIVE, which is not redundant. A blow that takes him from 30% straight past
  // zero should kill him rather than trigger a transformation he cannot finish —
  // the finale below owns that frame, and this must not race it.
  if (d.rage && e.stage === 1 && e.hp > 0 && e.hp < e.maxHp * d.rage.at) {
    begin(e, 'pause');
    return true;
  }
  return false;
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
  // AND A SLOWED MAN IS LEAD LESS FAR. The march below walks at `speed * slowOf`,
  // so a lead that used the tier's own number would throw a rock in front of
  // anything a monk had hold of — which is the one enemy a catapult is most likely
  // to be aimed at, since a slowed man is one the towers have already found.
  // THREE WAYS TO STAND STILL now — the third is a boss in one of his scripted
  // beats, which is `halted` too: `begin` sets it, so nothing here has to know
  // what a boss is.
  const ahead = e.foe || e.halted ? 0 : e.def.speed * timesOf(e) * slowOf(e) * t;
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
    // WHAT THIS CREATURE IS ON THIS FRAME, and for everything but the boss that is
    // its def — see stageOf in data/armour.js. Read once at the top because half
    // the loop below asks it: his shield, his bow, his nocking pose and his plate
    // all belong to the stage rather than to the def.
    //
    // That one word is also what DISARMS him. `rage` declares no `guard`, no
    // `ranged` and no `reload`, so an enraged Captain has no shield to raise and no
    // bow to draw — he threw both away in the pause, which is exactly what the
    // drawing shows. Written as an absence in the data rather than as a stage test
    // at each site, so the picture and the behaviour cannot come apart.
    const now = stageOf(e);

    // Decays wherever the enemy is, so a swing that lands just as its holder
    // dies still plays out instead of freezing mid-lunge. Same rate as the
    // soldiers' thrust, so the two sides of a fight move at the same tempo.
    e.thrust = Math.max(0, e.thrust - dt * 4);

    // THE SHIELD COMES DOWN when nothing has hit him for five seconds. Ticked
    // here, at the top, so it runs wherever he is — held, halted or walking — and
    // a Blocker who was shot and then pinned still lowers it on schedule instead
    // of freezing mid-stance for the rest of the fight.
    //
    // Real seconds, NOT scaled by slowOf. A monk's pulse slows what a figure DOES;
    // it does not make him hold a shield up for longer.
    if (e.guard > 0) e.guard = Math.max(0, e.guard - dt);

    // AND HOW LONG BEFORE ANYBODY MAY MEND HIM AGAIN. Real seconds too, and for
    // the same reason: a monk's pulse slows what a figure DOES, and this is not
    // something this figure is doing — it is something being counted about him.
    if (e.mendCd > 0) e.mendCd = Math.max(0, e.mendCd - dt);

    // THE LOOSING POSE COMES DOWN. Ticked up here with the other clocks rather
    // than inside the shooting block, so it runs out on schedule even on the frame
    // a soldier takes hold of him — otherwise a boss caught mid-shot would be left
    // holding a drawn bow for the rest of the fight.
    if (e.shot > 0) e.shot = Math.max(0, e.shot - dt * slowOf(e));

    // THE BOSS'S SCRIPT, and it comes before everything else because a figure
    // standing still on a clock is not doing any of it. See bossBeat above.
    if ((e.def.rage || e.def.finale) && bossBeat(state, e, dt)) continue;

    // AND THE SHIELD GOES BEHIND HIS BACK when a man comes into view, which is the
    // owner's rule and the Captain's alone: "whenever Captain Thug sees a soldier
    // nearby, he puts his shield behind his back and stops defending".
    //
    // A Blocker Thug guards whatever else is happening, because the shield is all
    // he has. The Captain would rather shoot, so a soldier inside `sheathe` takes
    // it straight back down and keeps it down while they are there. It is written
    // as taking the timer to zero rather than as a test inside `wornBy` and
    // `enemyStance` so that ONE thing decides it — the two of them read `guard`,
    // and a shield that was down in the picture and up in the plate is the exact
    // bug the Blocker nearly shipped.
    if (e.guard > 0 && now.sheathe && nearestUnit(state, e.x, e.y, now.sheathe)) {
      e.guard = 0;
    }

    // THE HEALER, and he is the first thing on the road that helps somebody.
    //
    // BEFORE THE THROWER AND BEFORE THE MARCH, because mending is what he would
    // rather be doing: a priest with a wounded giant beside him stops and works on
    // it instead of walking on or throwing a missile. That order is the owner's —
    // "he then continues healing others or walk/attack" puts healing first and the
    // other two after it.
    //
    // NOT WHILE SOMEBODY HAS HOLD OF HIM, on exactly the rule the throwers follow
    // one block down: a man in a melee fights with what is in his hands. A cast
    // already running is ABANDONED rather than paused — see below.
    if (e.def.heal) {
      if (e.foe) {
        // Caught mid-cast. The two seconds are lost, not banked: a spell
        // interrupted by a spear in the ribs should cost him the spell, and
        // banking it would make pinning him at 1.9 seconds worth nothing.
        e.cast = 0;
        e.mending = null;
      } else if (e.cast > 0) {
        // STANDING STILL AND WORKING. `halted` is what tells leadPoint and the
        // march that this figure is not going anywhere, the same flag a thrower
        // sets when he stops to shoot.
        e.halted = true;
        // Scaled by slowOf, like every other clock an enemy runs: a monk's pulse
        // makes him slower at casting exactly as it makes him slower at swinging.
        e.cast -= dt * slowOf(e);
        if (e.mending) turnTo(e, e.mending.x);
        if (e.cast <= 0) {
          const mark = e.mending;
          e.cast = 0;
          e.mending = null;
          // THE TARGET MAY HAVE DIED while he was casting, which is the ordinary
          // outcome of standing still for two seconds in front of a tower. The
          // spell is simply spent.
          if (mark && mark.hp > 0) {
            // Health a second, straight off the def — the shape every status
            // magnitude takes, and the shape the owner stated it in.
            //
            // `apply` REFRESHES rather than stacking, so a second priest working
            // the same man restarts his five seconds instead of doubling the rate.
            // That is still the right call now that re-casting on one man is
            // allowed: refreshing is a healer topping somebody up, and stacking
            // would be a rate that climbs with the size of the crowd.
            applyStatus(mark, 'healing', e.def.heal.hps, e.def.heal.seconds, null);
            // AND THE MAN CARRIES THE COOLDOWN. Thirty seconds before anybody may
            // work on him again, which sends this priest to the next wounded one,
            // or to a soldier, or back down the road — and stops a second priest
            // filling the gap. Set only on a mend that actually landed.
            mark.mendCd = e.def.heal.again;
          }
        }
        // Nothing else this frame: he is not throwing and he is not walking.
        continue;
      } else {
        const mark = woundedNear(state, e, e.def.heal.range);
        if (mark) {
          e.cast = e.def.heal.cast;
          e.mending = mark;
          e.halted = true;
          turnTo(e, mark.x);
          // ON THE FRAME THE POSE COMES UP, not on the one the mend lands. The
          // clip runs 2.53s against a two-second cast, so it is written to cover
          // the casting rather than to mark the moment it finishes — and the
          // player's cue to shoot him is him standing still, which is now.
          //
          // A cast interrupted by a spear has therefore already made its noise,
          // which is right: the spell was cast and then spoiled.
          play(HEAL);
          continue;
        }
      }
    }

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
    // AND A HELD BOSS LOSES THE ARROW HE WAS NOCKING. The `!e.foe` guard below
    // stops him STARTING one, and this is the other half: a wind-up already
    // running is abandoned rather than frozen, on the rule the Dark Priest's
    // interrupted cast follows.
    if (e.foe && e.nock > 0) e.nock = 0;

    if (now.ranged && !e.foe) {
      const mark = nearestUnit(state, e.x, e.y, now.ranged.range);
      // SLOWED SLOWS THE THROWING TOO, at the owner's ask: a quarter off how often
      // he swings covers the flask and the arrow as well as the club. The clock is
      // ticked slower rather than the cooldown lengthened, so a man slowed halfway
      // through a wind-up loses the rest of it rather than the whole thing.
      e.tcd -= dt * slowOf(e);

      // TWO BEATS RATHER THAN ONE, for the boss and nothing else. He nocks for
      // half a second and then holds the loose for half a second, which is the
      // owner's rhythm and the reason his bow has a wind-up drawing at all.
      //
      // Every other thrower in the game goes from standing to struck on one frame
      // and shows its Attack pose for the quarter second `thrust` takes to fade.
      // That is still what the `else` below does; a def with a `reload` block gets
      // the slower, more readable version, and a player watching him can see the
      // shot coming.
      //
      // THE ARROW LEAVES AT THE END OF THE NOCK, and it is re-aimed at whoever is
      // nearest THEN rather than at whoever was nearest when he started — half a
      // second is long enough for a soldier to die or for a nearer one to arrive,
      // and a boss loosing at a man who is no longer there would read as a bug.
      // Nobody in reach when it finishes and the arrow is simply not fired; the
      // cooldown still resets, so he does not get a free instant shot afterwards.
      if (now.reload) {
        if (e.nock > 0) {
          e.nock -= dt * slowOf(e);
          if (e.nock <= 0) {
            e.nock = 0;
            if (mark) {
              loose(state, e, mark);
              e.shot = now.ranged.hold;
            }
            e.tcd = now.ranged.cd;
          }
        } else if (mark && e.tcd <= 0) {
          e.nock = now.reload.seconds;
        }
      } else if (mark && e.tcd <= 0) {
        loose(state, e, mark);
        e.tcd = now.ranged.cd;
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
    // rule. He used to carry a budget — `standoff` seconds of not advancing,
    // spent once, and then he walked in whatever was in front of him — because a
    // wave only ends when the field is clear and a figure that will not advance
    // can hang a game up forever. The halt had already been taken off him twice
    // for exactly that, once as a finite basket and once as a rule about being
    // screened by other enemies.
    //
    // AND NOTHING COMES OUT TO HIM ANY MORE. For one build the bound lived in
    // the other army: a soldier with nothing better to do walked out to a
    // thrower who would not come to him, on the symmetry that anyone near enough
    // to be thrown at is near enough to walk at. The owner has since ruled that
    // a squad holds its rally point and takes it — see "there is no pass 4" in
    // units.js — so that argument is gone and it is not coming back.
    //
    // SO A THROWER CAN HOLD A WAVE OPEN, and this is the honest statement of it:
    // one who halts where no tower reaches him is killed by nothing, advances
    // never, and leaks never. The old comment here promised that every thrower
    // dies or reaches the exit. It is not true and it was the wave loop that was
    // relying on it.
    //
    // WHICH IS WHY THE WAVE LOOP STOPPED RELYING ON IT. updateWaves times a wave
    // out rather than waiting on a promise this file cannot keep: once the last
    // enemy has spawned it works out how long the stragglers would need to walk
    // the rest of the road unimpeded, adds a grace, and moves the game on when
    // that passes. Liveness belongs to the clock now, not to an argument spread
    // across two files that a rule change could quietly invalidate — which is
    // exactly what happened to the last one.
    const road = laneOf(level.routes[e.route], e.lane);

    // AND ONE SHOOTER DOES NOT STOP AT ALL. `onTheMove` is the Captain's, and it
    // is the one place the boss refuses to copy the Archer Thug he is partly made
    // of. The owner has accepted that an archer standing at his own reach can hold
    // a wave open until the stall clock fires — it is a creature you can leave and
    // come back to. A BOSS doing it is not a hard fight, it is a wait: the wave is
    // built around him, so a Captain planted at 200px shooting forever is the game
    // stopping rather than the game being difficult.
    //
    // He therefore fires as he walks and can never stall a wave at all, which also
    // means the stall clock never has to save this creature from itself.
    e.halted = !!now.ranged && !now.ranged.onTheMove && screened(state, e, road);
    if (e.halted) continue;

    // One number forward along the road, then the position is looked up. The
    // old loop walked from waypoint to waypoint consuming the frame's movement,
    // which cannot express a lane: an offset has to be measured perpendicular
    // to the road, and there is no perpendicular to "somewhere near vertex 7".
    // The lane's own road, not the centreline. Walking the centreline and
    // drawing the figure offset from it makes speed depend on which way the
    // road is bending — see route.js.
    // WHATEVER IS BEING DONE TO HIM SCALES THIS, and today that is exactly one
    // thing: a monk's Slowed Pulse, at 0.75. One multiplier rather than a subtracted
    // speed, so it stays a quarter of whatever a thug's speed is retuned to — and it
    // is the same number that slows his swing, out of slowOf in src/status.js.
    //
    // AND WHAT HE IS DOING TO HIMSELF, which is the second factor and the newer
    // one: a Blocker behind his shield shuffles at half pace. MULTIPLIED with the
    // slow rather than replacing it, so a monk's pulse on a guarding Blocker is
    // worth what it is worth on anything else — 0.75 x 0.5 — instead of one of the
    // two silently winning.
    // AND A THIRD FACTOR, which is the only one that can make a figure FASTER:
    // the Captain's second stage walks at 1.2x, out of timesOf in data/armour.js.
    // Multiplied in with the other two rather than replacing them, so an enraged
    // boss under a monk's pulse is still slowed by exactly a quarter.
    e.s += e.def.speed * timesOf(e) * slowOf(e) * guardSlow(e) * dt;

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
    //
    // AND THE BOSS SHOOTS ON THE MOVE, which is what made this a THREE-part test
    // rather than a two-part one. `thrust` covers every other figure: it is up for
    // the quarter second an Attack drawing is on screen and the road may not touch
    // the heading while it is. The Captain never sets it — his two beats are timed,
    // not decayed — so without `nock` and `shot` here the road turned him straight
    // back down the lane on the very next line and he loosed arrows out of his own
    // back. tools/facing.mjs caught exactly that, on the soldier standing BEHIND
    // him: he faced the man, and then the road un-faced him in the same frame.
    //
    // He therefore twists to shoot and the road has him again the moment the arrow
    // is away, which is what a man loosing over his shoulder while marching looks
    // like.
    // WRITTEN AS `!e.nock` RATHER THAN `e.nock <= 0`, and that is not style. Four
    // tools stand enemies up by hand without going through spawn(), so these fields
    // can be undefined — and `undefined <= 0` is FALSE, which turned the guard
    // permanently on and stopped the road setting any heading at all. It is the
    // same trap `mendCd` avoids by being tested with `> 0`; tools/facing.mjs caught
    // this one on an empty road.
    if (p.tx && e.thrust <= 0 && !e.nock && !e.shot) e.face = p.tx > 0 ? 1 : -1;
    e.x = p.x;
    e.y = p.y;

    if (e.s >= road.total) e.leaked = true;
  }

  // WHATEVER IS BEING DONE TO THEM, and this is the half of the status system that
  // did not exist until the Cannon Outpost. A soldier could be poisoned from the
  // day the plague doctor arrived; nothing could be done to an ENEMY over time at
  // all, because every tower in the game hit once and was finished.
  //
  // Fiery Shot is the first thing that keeps hurting after it has landed. The tick
  // is the same one units.js runs, on the same list, through src/status.js — so
  // burning a thug and poisoning a spearman are the same mechanic pointed the
  // other way, and there is one clock rather than two that agree today.
  //
  // BEFORE the leak and the death sweep below, so a burn that finishes somebody
  // pays its bounty and plays its kill line on the same frame it lands, exactly as
  // a blow would.
  for (const e of state.enemies) {
    // NOT ON A BODY. A boss playing out his four seconds takes nothing from
    // anything, and a burn still ticking on him is the one thing that could still
    // move his health bar — which would be a corpse visibly dying twice.
    if (downed(e)) continue;
    // NEGATIVE MEANS MENDING, which is the Dark Priest's dark healing coming back
    // through the same number a burn comes back through. Clamped to the ceiling
    // here rather than in status.js, because what a full health bar means belongs
    // to the army that owns the figure — see the note over tick().
    const hurt = tickStatus(e, dt);
    if (hurt) e.hp = Math.min(e.maxHp, e.hp - hurt);
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
    // THE BOSS FALLS OVER SLOWLY, and this is the whole of the owner's rule that
    // "after this 2 seconds, then only the game can end".
    //
    // A `finale` def out of health does not leave the list — it starts a script
    // and STAYS, so the field is not clear, the wave cannot bank, and a run on its
    // last wave cannot be won for four more seconds. Everything else about him is
    // settled on this frame: the gold is paid, the kill cry plays, and any soldier
    // holding him is let go. What is left is a drawing on a clock.
    //
    // BEFORE the leak test above? No — deliberately after it, so a boss who is
    // killed on the exact frame he reaches the exit leaks like anything else. He
    // cannot do both: `leaked` returns first.
    // THE SCRIPT HAS FINISHED. He goes now, and the body he was already drawing is
    // handed to corpses.js in the same drawing at the same anchor — so what the
    // player sees does not change across the handover, only what the rest of the
    // game thinks is on the board. Nothing is paid here: the gold, the cry and the
    // release all happened four seconds ago, when he actually died.
    if (e.act === GONE) {
      dropCorpse(state, e.def, e.x, e.y, e.struckFrom || e.face);
      return false;
    }

    if (e.hp <= 0 && e.def.finale && !downed(e)) {
      state.gold += e.def.bounty;
      state.hits.push({ x: e.x, y: e.y, life: 0.25 });
      // NO KILL LINE. Every other death in this game answers with a cry keyed to
      // the weapon that landed it — see the ladder below — and a boss answers with
      // his own, played by `begin` on the frame the falling beat starts. Both are
      // Category A, so playing the generic one here would duck the boss's own
      // death and then be ducked by it a line later.
      // LET GO OF HIM. Every other death drops out of the array on this frame and
      // `unhook` is what releases the man who was holding it; a boss who stays has
      // to be released explicitly or a soldier would go on swinging at a corpse.
      unhook(e);
      e.foe = null;
      begin(e, 'fall');
      return true;
    }

    // AND NOTHING BELOW TOUCHES A FIGURE ALREADY PLAYING OUT ITS DEATH. He has
    // `hp <= 0` for the whole of his four seconds, so the ordinary death path
    // caught him on the very next frame: it paid his 250 a SECOND time, dropped
    // his body four seconds early, and took him off the board — which is exactly
    // the wave-holding the finale exists to do. Measured, not guessed: a run gave
    // 500 gold for one boss and a finale that lasted 0.02s.
    if (downed(e)) return true;

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
         // A cannonball, which is the Cannon Outpost's and nothing else's. The
         // artillery ladder is the third with two kill lines on it: its three
         // lower tiers throw rocks and share `rockKill` above, and each of its
         // two fourth rungs answers for itself.
         : e.killedBy === 'cannonball' ? CUE.cannonKill
         // A quarrel, which is the Crossbow Sentry's and nothing else's. The
         // archery ladder is the first with two kill lines on it: its three lower
         // tiers loose arrows and share the generic one, the Musketeer Post has
         // its own, and so does the Sentry.
         : e.killedBy === 'quarrel' ? CUE.crossbowKill
         // The pope's missile, and only his. The three tiers under him have no
         // kill line of their own and fall through to the generic one below, the
         // same way every melee weapon but the paladin's does.
         : e.killedBy === 'pope' ? CUE.popeKill
         // And the monastery's OTHER tier 4. Both fourth rungs of that ladder have
         // a cry now and the three tiers under them still share the generic one —
         // the same split archery, the barracks and artillery all carry.
         : e.killedBy === 'monk' ? CUE.monkKill
         : e.killedBy === 'bullet' || e.killedBy === 'deadeye' ? CUE.musketKill
         : e.killedBy === 'paladin' ? CUE.paladinKill
         // And the barracks' OTHER tier 4 man. Two of the four men a barracks
         // musters have a cry of their own now; the spearman, the pikeman and
         // the swordsman still share the generic one below.
         // Both of his: the blade and the thrown knife. `killedBy` is the man's
         // `blow` for a melee kill and the AMMUNITION's `kind` for a shot, so an
         // assassin arrives here under two words — and a man killed by an assassin
         // is a man killed by an assassin whichever hand did it, which is the same
         // reading that sends Deadeye's ball to the musket's line.
         : e.killedBy === 'assassin' || e.killedBy === 'knife' ? CUE.assassinKill
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

// SOMEBODY WORTH MENDING, within reach of this priest. The worst wounded of them,
// so a giant on his last legs is served before a thug with a scratch.
//
// TWO THINGS ARE SKIPPED and neither is arbitrary:
//
//   HIMSELF. He is an enemy and he is in the list, and a priest who could mend
//   himself at 10 a second would be unkillable by most of this game. Two priests
//   still mend EACH OTHER, which is the interesting version of the same idea and
//   costs each of them the two-second cast.
//
//   THE DEAD, who are dropped from the list on the frame they die but may still
//   be in it on the frame a blow lands.
//
// AND ANYONE MENDED IN THE LAST THIRTY SECONDS. That is the owner's rule — "only
// go back to healing the same unit after 30 seconds, it goes to heal other units
// first or attack soldiers etc" — and it is what turns a healer from something
// that parks on one creature into something that works a crowd.
//
// THE COOLDOWN IS ON THE MAN, not in the priest's head, and that is the owner's
// second call on the same rule. As a per-priest memory it read more literally —
// HE goes back to the same unit — but it left two priests standing together able
// to tag-team one giant, each casting inside the other's gap, which is the
// behaviour the rule exists to stop. On the man it holds however many of them
// turn up.
//
// WHEN EVERYONE IN REACH IS ON COOLDOWN he finds nobody, falls through to the
// throwing block below and then to the march, and gets on with the wave. That
// fall-through IS the "or attack soldiers etc" half of the rule; there is no
// second branch for it.
//
// AND IT DOES NOT SKIP A PINNED ENEMY. Mending the man a soldier is holding is
// exactly what a healer should do; it also means a squad can be held on a
// creature it can no longer out-damage, which the owner has accepted and the wave
// loop's stall clock catches. See dark_priest in data/waves.js.
function woundedNear(state, healer, range) {
  let best = null, worst = 1;
  for (const e of state.enemies) {
    if (e === healer || e.hp <= 0 || e.hp >= e.maxHp) continue;
    if (e.mendCd > 0) continue;
    if (!inRange(healer.x, healer.y, e.x, e.y, range)) continue;
    const share = e.hp / e.maxHp;
    if (share < worst) { worst = share; best = e; }
  }
  return best;
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
    // AND A MAN HE CANNOT SEE IS NOT A REASON TO STOP. An assassin standing in
    // the road is not screening it as far as this thrower knows — see hidden()
    // in units.js. He walks on into them, which is the point of them.
    if (hidden(u)) continue;
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
    // Nothing may aim at a man it cannot see, which is the other half of the
    // same rule the standoff above obeys. See hidden() in units.js.
    if (hidden(u)) continue;
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
  // OF THE STAGE, like everything else about what a figure is carrying. It makes
  // no difference today — nothing in this game changes stage while it still has a
  // bow — and it is one word rather than a second rule to keep in step.
  const now = stageOf(e);
  const ammo = now.ranged.ammo;
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  // A LOB HAS A FLIGHT TIME AND A STEERED SHOT DOES NOT. `flight` and `lift` are
  // what make projectiles.js run the arc; leaving them off is what makes a shot
  // home on its man and die with him. See fly() and land() there.
  // `lob` rather than `arc`, matching shoot() in towers.js: whether a shot is
  // committed to a patch of ground is a different question from how high it goes,
  // and one weapon in the game now answers them differently.
  const flight = ammo.lob ? dist / ammo.speed : undefined;

  state.shots.push({
    x: from.x,
    y: from.y,
    angle: Math.atan2(to.y - from.y, to.x - from.x),
    fromX: e.x,
    // Whose side it is on, and the only thing projectiles.js needs to know to
    // point the same landing code at the other army. Absent on every tower's
    // shot, which reads as the player's side.
    side: 'enemy',
    // AND WHO LOOSED IT. Carried only so that a boss's tally counts the men his
    // arrows kill as well as the men his sword does — see the death sweep in
    // units.js. A reference rather than an id, because the shooter may be dead by
    // the time the arrow lands and a dead reference is simply a counter nobody
    // reads, where a stale id could be reused.
    by: e,
    target: mark,
    // WHAT IT HITS FOR, off the enemy rather than off the ammunition, because two
    // enemies could loose the same arrow for different damage — the same reason a
    // tower's shot carries its own number. A flask does none: what it does is on
    // the ground it leaves, and `damage` on a poisoned shot is never read.
    damage: now.ranged.damage || 0,
    // The thrower's own kind of blow, carried on the shot exactly as a tower's is
    // — see shoot() in src/towers.js. It is what makes the plague thug's flask
    // MAGIC and so the one enemy attack a paladin's plate does not turn.
    type: typeOf(now),
    pierce: pierceOf(now),
    splash: ammo.splash || 0,
    ammo,
    speed: ammo.speed,
    from,
    to,
    flight,
    t: 0,
    lift: ammo.lob ? dist * ammo.arc : 0
  });

  // Category B, on the release, and only for ammunition that says it makes a
  // noise leaving. An arrow does — it is the same `arrow_shot` every bow in the
  // game uses, which is what the owner asked for and what the shared drawing
  // already implied. A flask does not: it announces itself by breaking.
  //
  // THROUGH THE SAME TABLE THE TOWERS USE, which it was not: this line said
  // `play(SHOT)` and so every thrower in the game made a BOW noise whatever it
  // was throwing. Nothing showed it, because the only thrower with `fireSound`
  // was the archer and a bow is what he wanted. The Dark Priest is the second,
  // and he throws magic. See FIRING in src/audio.js, which moved there from
  // towers.js so that both armies could read one table.
  if (ammo.fireSound) play(FIRING[ammo.kind], ammo.fireGain);
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
    // NOTHING AIMS AT A BOSS WHO IS ALREADY LOSING. He is on the board for four
    // seconds after he runs out of health — that is what holds the wave open — and
    // for every one of them he is a drawing rather than a target. Towers that went
    // on shooting him would spend the end of the fight firing at a corpse while
    // live enemies walked past.
    //
    // The FIRST test on purpose, before the reach: it is the cheapest and it is
    // the only one that can be true of something already dead.
    if (downed(e)) continue;
    // Measured from the enemy's ground anchor — its shadow — because that is
    // where the figure IS. Its head is drawn well above that and never counts.
    if (!inRange(x, y, e.x, e.y, range)) continue;
    if (min && inRange(x, y, e.x, e.y, min)) continue;
    const left = remaining(laneOf(level.routes[e.route], e.lane), e.s);
    // Lower wins. Negated hp for mode 1 so "most health" sorts the same
    // direction as everything else; `ranged` is a 0/1 flag for mode 2, which
    // makes the whole preference a single comparable number in every mode.
    const rank = mode === 1 ? -e.hp
               // OF THE STAGE: an enraged Captain has thrown his bow away, so a
               // tower set to prefer throwers stops preferring him.
               : mode === 2 ? (stageOf(e).ranged ? 0 : 1)
               : 0;
    if (rank < bestRank || (rank === bestRank && left < least)) {
      bestRank = rank;
      least = left;
      best = e;
    }
  }
  return best;
}
