// WHAT IS HAPPENING TO A FIGURE, as opposed to what it is.
//
// A status is a timed thing done to somebody: burning, poisoned, and — when they
// arrive — stunned and slowed. It is the first mechanic in this game that belongs
// to BOTH armies. Everything else is one side's: a tower's ability, an enemy's
// throw, a soldier's blow. A status is applied by whoever applies it and worn by
// whoever wears it, so a cannon burns a thug and a plague doctor poisons a
// spearman through exactly the same three lines of code.
//
// ONE TABLE, and it is the whole of what a status IS. The rules for wearing one
// live in src/status.js and the drawing lives in render.js, but what statuses
// exist, what each is called and what each looks like is here — so adding
// "stunned" is a row plus a file, and the tick, the draw, the encyclopedia and
// the checks all pick it up without being edited.
//
// WHY THE PICTURE IS DATA RATHER THAN A BRANCH. A status is information the
// player reads at a glance over a 12px man in a fight; it has to be the same mark
// every time, and it has to be findable. Naming the file here means the mark and
// the rule cannot drift apart, and it means tools/status.mjs can check that every
// status the game can apply has something to show for it.
//
// THE FIELDS
//
//   `icon`   the sprite key, in assets/status. See src/assets.js.
//   `name`   what it is called, for the encyclopedia and for the tools.
//   `hurts`  true if wearing it costs health every second. Both of the first two
//            do; a stun or a slow would not, and the tick reads this rather than
//            assuming that every status is damage — which is the assumption that
//            would have to be unpicked the day the third one lands.
//
// The magnitude is NOT here, and that is deliberate. How much a burn hurts is a
// property of the CANNONBALL that started it, not of burning: a fiercer shot
// should burn harder without a second status existing. So `dps` and `seconds` are
// carried by whatever applies the status — see `fieryBall` in data/abilities.js
// and `flask` in data/waves.js — and this table says only what the thing is.
export const STATUS = {
  burnt: {
    icon: 'status_burnt',
    name: 'Burnt',
    hurts: true
  },
  poisoned: {
    icon: 'status_poisoned',
    name: 'Poisoned',
    hurts: true
  },
  // THE THIRD, AND THE FIRST THAT DOES NOT HURT — which is what the note above
  // said a slow would be, two abilities before there was one. It arrived with the
  // Judgement Temple's Slowed Pulse.
  //
  // `hurts: false` is not a formality. `tick` reads it before touching health, so
  // a slow's magnitude never goes near the damage arithmetic; `harmed` reads it
  // too, so a slowed soldier still regenerates, which he should — being held up is
  // not being wounded. Both of those were written for this row before it existed.
  //
  // AND ITS MAGNITUDE IS A DIFFERENT KIND OF NUMBER. A burn carries `dps`; this
  // carries `slow`, a multiplier on everything the figure does with time — how
  // fast it walks and how often it swings. `apply` picks which field to write by
  // asking `hurts`, so the one call site covers both without a branch of its own.
  // Where it comes FROM is still the thing that applied it: the monk's shot, in
  // data/abilities.js.
  //
  // AND IT IS THE ONE STATUS ANYTHING IN THE GAME RESISTS. A boss feels half of
  // whatever slow is put on him — see BOSS_SLOW_SHARE at the foot of this file.
  // That belongs to the boss rather than to this row, which is why the row is
  // still just three fields.
  slowed: {
    icon: 'status_slowed',
    name: 'Slowed',
    hurts: false
  },
  // THE FOURTH, AND THE FIRST THAT IS GOOD FOR THE FIGURE WEARING IT. The Dark
  // Priest's, and the only thing in this game that puts health back on an enemy.
  //
  // `mends` rather than a second meaning for `hurts`, because three states cannot
  // be spelled with one boolean and the day something both hurt and slowed would
  // have needed a third field anyway. The three are read separately: `hurts` says
  // this costs health, `mends` says it gives health, and anything with neither
  // carries a multiplier instead. See `apply` and `tick` in src/status.js.
  //
  // IT IS THE SAME MECHANISM POINTED THE OTHER WAY, which is what the note at the
  // top of this file promised the day a burn and a poison were the whole list: a
  // status is applied by whoever applies it and worn by whoever wears it. A
  // cannon burns a thug, a plague doctor poisons a spearman, and a dark priest
  // mends a giant, through one clock.
  //
  // AND ITS MAGNITUDE REFRESHES RATHER THAN STACKS, which is not a detail — it is
  // what keeps a wave finishable. `apply` replaces the rate on a figure already
  // wearing a status instead of adding a second one, so two priests working on
  // the same giant mend him at the same 2 health a second as one does. That
  // ceiling is below the weakest soldier in the game — a tier 1 spearman does
  // 3.16 — so a pinned enemy still loses the fight he is in, however many priests
  // are behind him. tools/plague.mjs checks that against the real numbers.
  healing: {
    icon: 'status_healing',
    name: 'Dark Healing',
    hurts: false,
    mends: true
  }
};

// The ids, in the order they are drawn when a figure wears more than one. Fixed
// rather than insertion-ordered so two men wearing the same pair show the same
// pair in the same order — a mark that moves about under a health bar reads as
// two different marks.
export const STATUS_ORDER = Object.keys(STATUS);

// The mark's drawn BOX, in game px, and its gap from the health bar. A box rather
// than a height since the slowed mark arrived: the first two are taller than they
// are wide and are drawn to this as a height, and the slowed chevrons are wider
// than they are tall and are fitted inside it. See the entries in data/ui.js.
//
// 11 IS THE LARGEST IT CAN BE AND STAY SHARP, and the number is set by the
// smallest file rather than chosen: the poisoned droplets are 34 source px tall,
// and 11 drawn at the 3x device-pixel cap wants 33. The flame has 42 and could go
// bigger; a row of marks at two different heights could not.
//
// IT HAS BEEN 10, THEN 9, AND IS 11, and every one of those was a measurement
// rather than a taste. The first pair were 38 and 30 source px; the artist redrew
// them with black outlines and they came in at 34 and 27, which took the ceiling
// down; the second redraw came back at 42 and 34, which takes it up past where it
// started. Raise it beyond what the smallest file can carry and tools/trim.mjs
// reports that mark as SOFT.
//
// It is nearly three times the health bar's 4px depth, which is the point — a bar
// is a quantity you read the length of and a status is a thing you recognise the
// shape of, so it has to be big enough to tell a flame from a droplet at a glance
// in a fight.
export const STATUS_H = 11;
export const STATUS_GAP = 2;

// HOW MUCH OF A SLOW A BOSS ACTUALLY FEELS, at the owner's ask: "only 50% of the
// slow effect affects bosses".
//
// A SHARE OF THE EFFECT, NOT OF THE MULTIPLIER, and the difference is the whole
// reason this is a function rather than a number multiplied at the call site. A
// slow is written down as `times` — 0.70, what the figure is left doing — so the
// EFFECT is the 0.30 taken off it. Halving the effect is
//
//   1 - (1 - 0.70) x 0.5 = 0.85
//
// which is the 15% the owner asked for. Halving the multiplier instead would be
// 0.35, a boss walking at a third speed: the same words and the opposite result.
//
// WHY IT LIVES HERE. It is a fact about what a BOSS is, not about the monk's
// shot — the day a second thing in the game slows something, a boss should shrug
// half of that off too without anybody remembering to write this line again. So
// the rule is applied where a slow is put ON somebody (`slow` in
// src/projectiles.js) rather than inside Slowed Pulse's ammunition, and the
// magnitude on that ammunition stays the honest 0.70 the card prints for
// everything else on the road.
//
// AND IT IS ASKED OF THE DEF rather than of the stage. An Enraged Captain Thug is
// the same boss with a different armour plate; nothing about being enraged should
// change how much a temple can hold him up.
export const BOSS_SLOW_SHARE = 0.5;

// The multiplier a slow of this size actually lands on this figure. 1 is unslowed,
// and the number returned is what `slowOf` will read back off the status — see
// src/status.js.
export const slowOn = (v, times) =>
  v && v.def && v.def.boss ? 1 - (1 - times) * BOSS_SLOW_SHARE : times;
