# Status marks

What is happening TO a figure, drawn as a small mark over its health bar. Four
so far; stunned and whatever else follows goes here.

| file                 | who wears it                          | what it does           |
|----------------------|---------------------------------------|------------------------|
| `Burnt_Status.png`   | anything a Fiery Shot ball catches    | 10 damage a second for 5s |
| `Poisoned_Status.png`| any soldier a flask or its spill catches | 5 damage a second for 4s |
| `Slowed_Status.png`  | anything a Slowed Pulse blast hits    | 30% off its speed and its swing, for 5s |
| `Dark_Healing_Status.png` | any enemy a Dark Priest has cast on | 10 health a second for 5s |

**Dark Healing is the first one that is GOOD for the figure wearing it**, and it
is a row in the table on the same terms as the rest: `mends: true` in
`src/data/status.js` sends its magnitude through the same clock a burn uses, with
the sign the other way round. `tick` hands back a negative number and the caller
puts the health on and clamps to the ceiling — see `src/status.js`.

**Its rate is a ceiling, not a rate per priest.** `apply` refreshes a status on a
figure already wearing it rather than adding a second, so two priests mend the
same giant at the same 10 a second as one does — a healer topping somebody up,
rather than a rate that climbs with the size of the crowd.

**50 health a cast out-heals every soldier but the assassin**, and that is the
owner's decision rather than an oversight: a squad can be held on a creature it
can no longer kill. It is a stall and not a lock — the wave loop hands over when
the field has not cleared in the time an unimpeded walk plus `STALL_GRACE` would
have taken. See `stallClock` in `src/waves.js` and the run at the foot of
`tools/plague.mjs`.

**Slowed is the first one that does no damage at all**, and that is a row in the
table rather than a special case: `hurts: false` in `src/data/status.js` keeps its
magnitude out of the damage arithmetic and lets a slowed soldier go on healing.
Its number is a multiplier on time rather than health — how fast the figure walks
and how often it swings, out of one value.

A status belongs to BOTH armies. A cannon burns a thug and a plague doctor
poisons a spearman through one mechanism that does not know which side it is
looking at — see `src/status.js`.

## Uploading a new one

Three steps, and none of them is in this folder:

1. Drop the PNG here. **512 x 512, transparent background**, like every other
   sprite in the game.
2. Add a row to `STATUS` in `src/data/status.js` — an id, the sprite key, a name,
   and whether wearing it costs health.
3. Wire the key to this file in `src/assets.js`, and give it a trim in
   `src/data/ui.js` (run `node tools/trim.mjs` for the numbers).

Then `node tools/status.mjs`. It checks the whole chain — id to key to box to
file — and will tell you which link is missing. It also checks the mark stays
sharp at its drawn size.

## Draw it BIG inside the 512

This is the one constraint worth knowing before you start, because it is the one
that cannot be fixed in code.

A mark is drawn inside an 11 game px box (`STATUS_H`), and the game may rasterise
at 3x on a phone — so it needs **at least 33 source px on its longest side** or it
goes soft. The flame has 42, the droplets 34 and the chevrons 34. Anything smaller
will be reported as SOFT by `node tools/trim.mjs`, and the fix is to redraw it
larger on the same canvas rather than to change any number.

The 11 is itself a ceiling rather than a choice: it is the largest a mark can be
drawn while the SMALLEST file stays sharp. It has been 10, then 9, and is 11 — the
first pair were 38 and 30 source px, the outlined redraw came in at 34 and 27 and
took it down, and the two that ship are 42 and 34. **Whichever file is smallest
sets the size of all of them**, so a new mark drawn small pulls the existing ones
down with it.

**A BOX rather than a height, and it matters if you draw a wide one.** A mark
taller than it is wide is drawn to that 11 as a HEIGHT — the flame and the
droplets both are. The slowed chevrons are 34 x 24, wider than tall, and are
fitted inside the box instead, so they come out 11 x 7.8 rather than 15.6 x 11.
Drawn to the height they would be half again the width of their neighbours AND
would want 47 source px where there are 34. Which of the two an entry gets is `h`
or `fit` in `src/data/ui.js`; `node tools/status.mjs` measures whichever it is.

Rule of thumb: give it **40+ source px** on its longest side and it will never be
the one holding the others back.

## Give it a black outline

This is the other thing that cannot be fixed in code, and it is the reason the
first pair were redrawn.

The original poisoned droplet was `rgb(92,127,73)` and the grass this game is
played on is about `rgb(90,110,70)` — the same hue at almost the same brightness.
Drawn on the board it disappeared: the first screenshot of a poisoned spearman
was a health bar with nothing above it, while the flame beside it was perfectly
clear. One of two statuses working is exactly what makes that hard to notice.

There was a cream chip behind the marks for one build to fix it. The artist's own
answer is better and it is what ships: a black border on the drawing. It travels
with the picture, it costs no furniture on the board, and a line of men wearing
statuses reads as a fight rather than as a row of labels.

So a new mark can be any colour, as long as it carries **its own dark edge**. It
has to hold up on grass, on sand and on grey stone, at 11px.
