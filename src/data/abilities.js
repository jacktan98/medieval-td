// ABILITIES: what a tier 4 tower can be taught, once it is standing.
//
// A ladder ends at tier 4 and the Upgrade button goes dead — so a Musketeer Post
// or a Paladin Keep is a plot with nothing left to spend on, however the game is
// going. An ability is the third thing gold can buy: not a rung and not a second
// tower, but a change to how the one you have fights.
//
// TIER 4 ONLY, and that is the design rather than a limitation of the code. The
// list a tier offers is the `abilities` field on its def, so any tier could carry
// one; nothing below tier 4 does, because an ability is what a topped-out ladder
// spends on and a tier 2 tower has an upgrade to buy instead.
//
// BOUGHT PER TOWER, not per family. Two Musketeer Posts on the same map are two
// separate purchases, and the one you taught Deadeye keeps it while the other does
// not. That is the same rule every other purchase in this game follows — gold buys
// a thing on a plot — and it is what makes two of the same tower worth having.
//
// ONE MECHANISM, FOUR ABILITIES, and it is worth naming the parts because all four
// are built from them:
//
//   `every`      one action in N is the special one. The musketeer's shots and the
//                paladin's blows are both counted, and the count is per figure.
//   `hold`       how long the special POSE stays up afterwards. It blocks the next
//                action as well as showing, which is invisible on the musketeer —
//                his reload is 2.4s and the hold is 1 — and real on the paladin,
//                whose 0.80s swing it delays by a fifth of a second.
//   `pose`       the drawing to show while holding, or nothing to hold the man's
//                own Attack pose. Burst Fire is the one that holds Attack: the
//                artist asked for it to use the pictures the tower already has.
//   `cue`        a Category B sound, played every time the special fires. Three of
//                the four have one; Burst Fire makes the musket's own noise three
//                times, which is what a burst sounds like.
//
// Holy Light is the one that does not fit that shape, and it is not bent to fit:
// it is a reaction to being nearly dead rather than a beat in a rhythm, so it
// carries `below`, `heals`, `seconds` and `refresh` instead of `every`.

// EVERY ONE COSTS THE SAME, at the artist's request, and the number is written
// once here rather than four times below. 150 against a Musketeer Post's own 200
// is three quarters of the tower again on top of the 500 the ladder to it cost —
// so a first ability is roughly the price of a second Crossbow Tower somewhere
// else, which is the comparison a player actually makes.
export const ABILITY_COST = 150;

// The Musketeer's second ball: the same lead going the same speed, drawn four
// times the size with a flame behind it.
//
// A KIND OF ITS OWN rather than a second `bullet`, and that buys two rows in two
// tables: FIRING in src/towers.js gives it its own report, and the kill cue in
// src/enemies.js sends it to the musket's line anyway — a man shot dead is a man
// shot dead, whichever ball did it. Sharing `kind` with the ordinary ball would
// have meant a flag on the ammo instead, and "what does this sound like leaving"
// already has exactly one answer per kind.
//
// `grip` 0.10, measured the same way the ordinary ball's 0.12 was: the column
// where the rounded nose first reaches half its own height, which is 5px into a
// 48px trim here and 2px into a 20px one there. The two anchors are the same
// point on the same nose, drawn at different sizes.
export const deadeyeBall = {
  kind: 'deadeye',
  sprite: 'deadeye_bullet',
  trim: [246, 246, 48, 20],
  faces: -1,
  grip: 0.10,
  speed: 520,
  fireSound: true,
  landSound: false
};

// The three poses the artist drew for these. Each is registered on the SAME source
// pixel as the man's own drawings — `node tools/shadow.mjs` checks all three — so
// swapping to one of them cannot move him sideways.
//
// Holy Slash is drawn in the paladin's Attack box exactly, [135, 212, 178, 116]:
// the artist re-lit the same swing rather than drawing a new one, and the pivot
// comes back identical to three places. That is a finding rather than a copy — it
// is measured per file, like every other anchor in this project.
const DEADEYE_POSE = {
  sprite: 'musketeer_deadeye',
  trim: [168, 194, 164, 124],
  pivot: [0.756, 0.913]
};

const HOLY_LIGHT_POSE = {
  sprite: 'paladin_holy_light',
  trim: [210, 143, 133, 193],
  pivot: [0.504, 0.903]
};

const HOLY_SLASH_POSE = {
  sprite: 'paladin_holy_slash',
  trim: [135, 212, 178, 116],
  pivot: [0.798, 0.905]
};

// How long a special pose stays up. One second, for all four, because that is what
// the artist asked for each of them in turn — so it is one constant rather than
// four fields that happen to agree.
const HOLD = 1;

export const ABILITIES = [
  {
    id: 'burst',
    name: 'Burst Fire',
    // Which tower teaches it. A caption for the encyclopedia, and the only place
    // an ability names its tower — the binding that matters is the other way
    // round, in the `abilities` list on the tier's own def.
    of: 'Musketeer Post',
    icon: 'ability_burst',
    cost: ABILITY_COST,
    // "Shoot 3 times consecutively at a rapid rate every 5 normal shots." Five
    // ordinary shots and then the burst is a cycle of six, which is what `every`
    // counts — the sixth trigger of the tower's reload is the one that fires
    // three balls instead of one.
    every: 6,
    // The three balls, and the gap between them. 0.18s is a fifth of the fastest
    // reload in the game and about as quick as three distinct cracks can be told
    // apart by ear; faster reads as one noise and one muzzle flash.
    shots: 3,
    gap: 0.18,
    hold: HOLD,
    // NO POSE OF ITS OWN and no ammunition of its own, at the artist's request:
    // "use Attack and normal Bullet images". So the man holds the drawing he
    // already fires in and the balls are the balls he already fires.
    lines: ['Every sixth shot is three,', 'fired as fast as he can load.']
  },
  {
    id: 'deadeye',
    name: 'Deadeye',
    of: 'Musketeer Post',
    icon: 'ability_deadeye',
    cost: ABILITY_COST,
    every: 6,
    shots: 1,
    hold: HOLD,
    // 180, AND IT IS THE SAME 180 BURST FIRE ADDS — three ordinary balls at 60
    // each. That is the whole relationship between the two: one cycle in six is
    // worth an extra 180 damage either way, so the choice is about WHERE it lands
    // rather than how much of it there is. Burst Fire spreads it over three
    // targets and Deadeye puts all of it through one, which is the difference
    // between a road full of militia and a giant walking down it.
    //
    // Both take the tower from 25.0 damage a second to 33.3 — five shots at 60
    // plus 180, over six reloads of 2.4s.
    damage: 180,
    ammo: deadeyeBall,
    pose: DEADEYE_POSE,
    // NO `cue`, and it is not silent. Its noise comes from its AMMUNITION, through
    // the FIRING table in src/towers.js that every other projectile's report goes
    // through — `deadeyeBall` is its own kind, so it gets its own row there. An
    // ability that fires something announces itself by firing it; `cue` is for the
    // two that do not, which are the paladin's.
    lines: ['Every sixth shot is one heavy', 'ball: 180 instead of 60.']
  },
  {
    id: 'light',
    name: 'Holy Light',
    of: 'Paladin Keep',
    icon: 'ability_light',
    cost: ABILITY_COST,
    // THE ONE THAT IS NOT A RHYTHM. It has no `every` because it is not a beat in
    // the fight — it is what a paladin does when he is about to die, and the enemy
    // in front of him goes on hitting him the whole time.
    below: 0.30,
    heals: 200,
    seconds: 2,
    // Counted from the moment it STARTS, not from when it ends, so the honest
    // reading of "only refreshes after 20 seconds" is 18 seconds of standing there
    // unable to do it again. Starting the clock at the end would make the gap 20
    // on top of the 2, which is a longer cooldown than the number says.
    refresh: 20,
    pose: HOLY_LIGHT_POSE,
    cue: 'holyLight',
    lines: ['Under 30% health he kneels', 'and heals 200. Every 20s.']
  },
  {
    id: 'slash',
    name: 'Holy Slash',
    of: 'Paladin Keep',
    icon: 'ability_slash',
    cost: ABILITY_COST,
    // "A powerful strike every 10 attacks", so the tenth blow is the strike and
    // nine ordinary ones come before it. Read the field the same way as the
    // musketeer's 6 above: it is the length of the cycle, and the last action of
    // the cycle is the special one.
    every: 10,
    shots: 1,
    damage: 50,
    hold: HOLD,
    pose: HOLY_SLASH_POSE,
    cue: 'holySlash',
    // The artist's number, and it is a big one against a paladin's 7: nine blows
    // at 7 plus one at 50 is 113 where ten blows would be 70. With the second of
    // held pose on top of the 0.80s swing that is 13.8 damage a second against
    // 8.75 — the largest proportional jump any of these four buys, on the man who
    // starts with the least damage in the game. tools/families.mjs prints it.
    lines: ['Every tenth blow lands for 50', 'instead of 7.']
  }
];

export const abilityById = id => ABILITIES.find(a => a.id === id);

// What a tier offers, as ability objects rather than ids. Empty for everything
// below tier 4, which is what makes "does this tower have anything to teach" a
// question about the data instead of a check on the tier number.
export const abilitiesOf = def => (def.abilities || []).map(abilityById);

// Whether a BUILT tower has already bought one. `t.abilities` is the list of ids
// it owns; it is set on the tower when it is built, so nothing has to cope with
// the field being absent.
export const owns = (t, id) => !!t.abilities && t.abilities.includes(id);
