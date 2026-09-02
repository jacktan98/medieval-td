// WHAT AN ATTACK IS, AND WHAT IT RUNS INTO. The damage triangle.
//
// Until this file every blow in the game was the same kind of blow, and the only
// question a target could answer was how much health it had. So a Musketeer Post's
// one 65 and a Crossbow Sentry's 30-every-0.8s were the same tower with a
// different rhythm: nothing on the road cared about the SIZE of a hit, only the
// total. Twenty towers were competing on one axis.
//
// Armour is the second axis. A rank divides what lands, so a big single blow and a
// fast small one stop being interchangeable the moment something walks in wearing
// plate — and every tower in the game differentiates without one of them changing
// a number.
//
// THE THREE KINDS OF DAMAGE
//
//   physical   reduced by the target's PHYSICAL armour and by nothing else
//   magic      reduced by the target's MAGIC armour and by nothing else
//   true       reduced by neither, ever
//
// THE PART THAT SURPRISES PEOPLE, and it is the owner's own wording: "if physical
// attacks hit units with high magic armor means the unit take in full damage as
// there is no physical armor". The two armours do not add up and do not stand in
// for each other. A plague thug in medium MAGIC armour takes a Musketeer Post's
// ball in full, and a giant in medium PHYSICAL armour takes a monk's blast in
// full. That is what makes armour a matchup rather than a health bar with a
// multiplier on it.
//
// TRUE DAMAGE is what the two statuses do — a burn and a poison — at the owner's
// word. It is the right call twice over: a fire that a suit of plate turned aside
// would read as broken, and a status is applied by whoever applies it, so making
// it answer to armour would mean the plague doctor's flask needed to know what
// kind of thing it had landed on.

// THE FOUR RANKS, in order, and the order is the whole mechanism: a rank is an
// INDEX, so breaking armour is subtraction and the floor is index 0.
//
// Named rather than numbered in the data because a def reading `physical: 'med'`
// says what it is, where `physical: 2` would need this file open beside it.
export const RANKS = ['none', 'low', 'med', 'high'];

// HOW MUCH GETS THROUGH each rank, at the owner's numbers: a quarter off per step,
// so high armour takes a quarter of what is thrown at it.
//
// EVEN STEPS RATHER THAN A CURVE, and that is worth stating because it is what
// makes `pierce` legible. One rank of break is always worth 25 percentage points
// of the attack, wherever it lands — a Cannon Outpost's x2 against high armour
// takes 25% to 75%, and against low armour it takes 75% to 100%. A player can
// hold "each rank is a quarter" in their head; a geometric ladder they could not.
export const TAKES = [1, 0.75, 0.5, 0.25];

// The rank an attack of this kind actually meets, once the attack's own `pierce`
// has been taken off. Clamped at both ends: nothing goes below `none`, and a def
// with a rank this file does not know reads as `none` rather than throwing.
//
// `armour` is the shape a figure carries — `{ physical: 'med', magic: 'none' }` —
// and it is absent on most things in the game, which reads as no armour at all.
// It lives on the DEF rather than on the live figure, because it is a fact about
// what a spearman IS; the call sites pass `x.def.armour`.
export function rankAgainst(armour, kind, pierce = 0) {
  const worn = RANKS.indexOf((armour && armour[kind]) || 'none');
  return Math.max(0, (worn < 0 ? 0 : worn) - (pierce || 0));
}

// WHAT ACTUALLY LANDS. The one function every blow in this game goes through, and
// the reason it is one function is that there are five separate places damage is
// applied — a tower's shot, a soldier's swing, an enemy's swing, an enemy's throw,
// and a status tick — and five copies of a rounding rule is five chances to round
// differently.
//
// `type` is the ATTACKER's kind of damage and `pierce` its rank-break. `true`
// damage never looks at the target at all, which is why the test is first: a
// status has no attacker to ask.
//
// ROUNDED, like every other damage figure in the game, so a health bar never has
// to show a fraction of a point — and so the number the info box prints is the
// number the enemy loses. See `damage` in shoot() in src/towers.js.
export function taken(damage, type, armour, pierce = 0) {
  if (type === 'true' || !type) return Math.round(damage);
  return Math.round(damage * TAKES[rankAgainst(armour, type, pierce)]);
}

// What a def's blow is, defaulting to physical. Nothing in this game did magic
// damage before the monastery was told to, and a def with no `damageType` at all
// is a physical attacker — which is the right default: it is what a sword, an
// arrow, a bolt and a cannonball all are, and it is what a new tower most likely
// is until somebody says otherwise.
export const typeOf = def => (def && def.damageType) || 'physical';

// And how many ranks it breaks. Always of its OWN kind — a physical attack can
// only break physical armour — which is why this is one number rather than a pair.
// Every `pierce` in data/towers.js sits next to the `damageType` it belongs to.
export const pierceOf = def => (def && def.pierce) || 0;

// FOR PROSE. A rank as the player reads it in a sentence, which is title case with
// `med` spelled out — "Med" is a stat block abbreviation and "Medium" is English,
// and the pop-up's descriptions are English.
export const RANK_NAME = { none: 'None', low: 'Low', med: 'Medium', high: 'High' };

// AND FOR A STAT ROW, where it is a label beside an icon rather than a word in a
// sentence, and where "Medium" does not fit.
//
// The description panel is the binding surface and the number is exact: its text
// column is 118px wide once the portrait and the plate's own border are taken out,
// and the armour row is two icons, two gaps and two words. At 700 10px system-ui
// "Medium physical + None magic" sets at 122.0 — over the edge of the plate, and a
// canvas clips nothing, so it would have drawn onto the parchment and off it.
// "Med" brings the worst row to 106.3 and leaves 11.7px of air.
//
// THE OTHER THREE ARE THE SAME WORD IN BOTH TABLES, which is what makes the split
// legible rather than arbitrary: only the one that does not fit is abbreviated, and
// it is abbreviated everywhere a row prints it — the encyclopedia card has the room
// to spell it out and deliberately does not, because a player comparing a swordsman
// on the page against a giant on the board must be reading one word for one rank.
export const RANK_SHORT = { none: 'None', low: 'Low', med: 'Med', high: 'High' };

// And the damage kinds, for the same two surfaces.
export const TYPE_NAME = { physical: 'Physical', magic: 'Magic', true: 'True' };
