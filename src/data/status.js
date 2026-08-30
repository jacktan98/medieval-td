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
  }
};

// The ids, in the order they are drawn when a figure wears more than one. Fixed
// rather than insertion-ordered so two men wearing the same pair show the same
// pair in the same order — a mark that moves about under a health bar reads as
// two different marks.
export const STATUS_ORDER = Object.keys(STATUS);

// The mark's drawn height, in game px, and its gap from the health bar.
//
// 10 is the largest it can be and stay sharp: the smaller of the two files is 30
// source px tall, and 10 drawn at the 3x device-pixel cap wants exactly 30. See
// tools/trim.mjs, which measures both.
//
// It is a little over twice the health bar's 4px depth, which is the point — a
// bar is a quantity you read the length of and a status is a thing you recognise
// the shape of, so it has to be big enough to tell a flame from a droplet at a
// glance in a fight.
export const STATUS_H = 10;
export const STATUS_GAP = 2;
