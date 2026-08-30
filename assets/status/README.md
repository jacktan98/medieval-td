# Status marks

What is happening TO a figure, drawn as a small mark over its health bar. Burnt
and Poisoned are the first two; stunned, slowed and whatever else follows go
here.

| file                 | who wears it                          | what it does           |
|----------------------|---------------------------------------|------------------------|
| `Burnt_Status.png`   | anything a Fiery Shot ball catches    | 10 damage a second for 5s |
| `Poisoned_Status.png`| any soldier a flask or its spill catches | 5 damage a second for 4s |

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

A mark is drawn 11 game px tall (`STATUS_H`), and the game may rasterise at 3x on
a phone — so it needs **at least 33 source px on its longest side** or it goes
soft. The flame has 42 and the droplets 34. Anything smaller will be reported as
SOFT by `node tools/trim.mjs`, and the fix is to redraw it larger on the same
canvas rather than to change any number.

The 11 is itself a ceiling rather than a choice: it is the largest a mark can be
drawn while the SMALLEST file stays sharp, and every mark is drawn at one height
so a row of them lines up. It has been 10, then 9, and is 11 — the first pair
were 38 and 30 source px, the outlined redraw came in at 34 and 27 and took it
down, and the pair that ships are 42 and 34. **Whichever file is smallest sets
the size of all of them**, so a new mark drawn small pulls the existing ones down
with it.

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
has to hold up on grass, on sand and on grey stone, at 9px.
