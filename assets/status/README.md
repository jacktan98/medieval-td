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

A mark is drawn 10 game px tall (`STATUS_H`), and the game may rasterise at 3x on
a phone — so it needs **at least 30 source px on its longest side** or it goes
soft. Both of the first two clear it, but only just: the flame is 38 and the
droplets are exactly 30. Anything smaller than 30 will be reported as SOFT by
`node tools/trim.mjs`, and the fix is to redraw it larger on the same canvas
rather than to change any number.

10px is itself the ceiling rather than a choice: it is the largest a mark can be
drawn while the 30px file stays sharp. Draw bigger and both can grow.

## Colour: anything, because of the chip

The marks sit on a cream chip, and that is not decoration. The poisoned droplet
is `rgb(92,127,73)` and the grass this game is played on is about
`rgb(90,110,70)` — the same hue at almost the same brightness. Drawn straight on
the board it disappeared; the first screenshot of a poisoned spearman was a
health bar with nothing above it, while the flame beside it was perfectly clear.
One status working is exactly what makes that kind of bug hard to see.

So there is a cream ground under every mark, which means a new one can be any
colour you like. Dark reads best on it — the cream is about `rgb(240,230,210)`.
