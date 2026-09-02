// Wearing a status: applying one, ticking it, and losing it.
//
// ONE MECHANISM FOR BOTH ARMIES, which is the whole reason this is a file rather
// than a field on a soldier. The plague doctor's poison lived on the unit as
// `u.poison` and was ticked inside updateUnits, because for a long time a soldier
// was the only thing in the game that could have something done to it over time.
// The Cannon Outpost's Fiery Shot broke that: it burns ENEMIES, and a second
// bespoke field ticked in a second place is how two mechanics that should be one
// drift apart — different rounding, different behaviour on death, one of them
// drawn and the other not.
//
// So there is one list, one tick and one draw, and `apply` does not know or care
// which side it is being called on.
//
// THE SHAPE ON A FIGURE:
//
//   v.statuses = [{ id: 'burnt', dps: 10, left: 3.4, by: 'cannonball' }, ...]
//
// An ARRAY rather than an object keyed by id, because the order things were
// applied in is real information and because a figure almost never wears more
// than two — a linear scan of two is not worth a map. Drawing uses STATUS_ORDER
// instead, so what the player sees is stable even though this is not.
//
// `by` is who to credit if the status lands the killing blow. It is the
// ammunition's `kind`, exactly as `killedBy` is everywhere else, so a man who
// burns to death still answers with the cannon's kill line rather than falling
// silent — which is what would happen if the status quietly cleared the field.

import { STATUS } from './data/status.js';

// Put a status on somebody, or refresh one already there.
//
// REFRESHES RATHER THAN STACKS, and it is the rule the flask already had: a
// second dose restarts the clock at the same rate. Stacking reads as a bug the
// first time three doctors delete a squad in a second, and "how long since the
// last one" is a thing the player can see where "how many are on him" is not.
//
// The refresh takes the NEW magnitude as well as the new clock, so a fiercer
// source overwrites a weaker one rather than being ignored for as long as the
// weaker one happens to have left.
//
// `mag` IS WHATEVER THAT STATUS'S MAGNITUDE IS, and the status decides which. A
// burn's is `dps`, damage a second; a slow's is `slow`, the multiplier on how fast
// the figure does everything. Asked of `hurts` rather than of the id, so the next
// row that does not hurt gets the same treatment without a line here — and so the
// two kinds of number can never be read as each other. A slow written into `dps`
// would be three quarters of a point of damage a second, which is a bug that
// would take a wave to notice.
export function apply(v, id, mag, seconds, by) {
  const def = STATUS[id];
  if (!def) return;                        // a typo is silence, so make it nothing
  const key = def.hurts ? 'dps' : 'slow';
  const had = v.statuses && v.statuses.find(s => s.id === id);
  if (had) { had[key] = mag; had.left = seconds; had.by = by; return; }
  if (!v.statuses) v.statuses = [];
  v.statuses.push({ id, [key]: mag, left: seconds, by });
}

export const wearing = (v, id) => !!(v.statuses && v.statuses.some(s => s.id === id));

// Everything a figure is wearing, gone. Called when it dies and when a soldier
// musters again — a man who comes back is a new man, and one who walks out of the
// door still burning from the wave before is a bug that reads as the fire being
// broken rather than as the respawn being.
export function clear(v) {
  if (v.statuses) v.statuses.length = 0;
}

// One frame of every status a figure is wearing. Returns the damage they did, so
// the caller can decide what that means — a soldier's death is not an enemy's.
//
// THE CALLER APPLIES THE DAMAGE, not this. It would be one line shorter to
// subtract it here, and it would put the two armies' death handling inside a file
// that is supposed to not know which army it is looking at. What this owns is the
// clock and the arithmetic; what a death IS belongs to units.js and enemies.js.
//
// `by` is written onto the figure as `killedBy` whenever a status does damage, so
// the last thing to hurt somebody is the thing credited with killing them —
// exactly the rule every blow in the game already follows.
export function tick(v, dt) {
  if (!v.statuses || !v.statuses.length) return 0;

  let hurt = 0;
  for (const s of v.statuses) {
    const def = STATUS[s.id];
    if (def && def.hurts && s.dps) {
      hurt += s.dps * dt;
      if (s.by) v.killedBy = s.by;
    }
    s.left -= dt;
  }
  // Filtered in place rather than reassigned: enemies.js and units.js hold the
  // figure, not the list, and a fresh array here would be a second list nobody
  // is looking at.
  for (let i = v.statuses.length - 1; i >= 0; i--)
    if (v.statuses[i].left <= 0) v.statuses.splice(i, 1);

  return hurt;
}

// HOW FAST THIS FIGURE IS DOING THINGS, as a multiplier: 1 unslowed, 0.7 under a
// monk's Slowed Pulse. Read by enemies.js for the march and the throw clock and by
// units.js for the melee clock, so one number covers "moves slower" and "swings
// slower" — which is what a slow means and what saves the two from drifting apart.
//
// THE STRONGEST WINS RATHER THAN THE PRODUCT, and it is the same instinct `apply`
// follows one status at a time: two sources do not compound into a figure standing
// still. Written as a scan over anything carrying `slow` rather than a lookup of
// 'slowed', so a second slowing status costs nothing here.
export const slowOf = v => {
  let k = 1;
  if (v.statuses) for (const s of v.statuses) if (s.slow && s.slow < k) k = s.slow;
  return k;
};

// Whether anything currently on this figure is doing it harm. Read by units.js,
// where regen is suppressed while a man is being hurt over time rather than
// racing it — see the note there for why the poison numbers are only small enough
// to look harmless because of this.
//
// A SLOW IS NOT HARM, and that falls out of `hurts` rather than needing saying:
// a slowed man heals, because being held up is not being wounded.
export const harmed = v =>
  !!(v.statuses && v.statuses.some(s => s.dps > 0 && (STATUS[s.id] || {}).hurts));
