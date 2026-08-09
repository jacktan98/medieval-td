# Enemy artwork

One file per entry in `enemyTypes` in `src/data/waves.js`:

| file                    | type key    | notes                                    |
|-------------------------|-------------|------------------------------------------|
| `Enemies_Man_T1a.png`   | `light_inf` | the militia, in all 8 waves              |
| `Enemies_Man_T1b.png`   | `heavy_inf` | the heavy, waves 4-8, in growing packs   |

**T1a and T1b, not T1 and T2**, since the last upload. The heavy is a bigger
militiaman rather than the next rank up, so the tier 2 slot is still empty and
whatever fills it later gets the T2 name. The `art` keys in `src/assets.js`
followed the rename; the type keys above did not, because what these enemies DO
did not change and `heavy_inf` is what the rules call it.

Adding a new enemy means adding both the file and the `enemyTypes` entry, so
tell me the intended hp / speed / bounty when you upload one and I will wire it
and re-run `tools/sim.mjs` to see what it does to the balance. Expect that to
move other numbers: the heavy's hp is the single knob the level's difficulty
invariant is held with, and a third enemy type will take some of that job over.

Their **death poses** live in `assets/dead/`, one per type, and that folder's
README has the drawing rules. They are separate files because a body is a
different drawing, not a different state of this one.

## Export

Same square canvas as everything else: **512 x 512** — see
`assets/map/README.md` for why. Whatever the size, **every asset in the
game must use the same one**, because a single `SCALE` in `src/data/towers.js`
converts all of them to game pixels. Draw an enemy at its true size relative to
a soldier on that shared canvas; never scale one to "look right" on its own.

Draw it **standing upright and facing left or right**, not top-down. Enemies
mirror to face the way they are walking and are never rotated — a standing
figure rotated to face north is a standing figure lying down.

`Enemies_Man_T1a.png` draws 20 x 23 game px and `Enemies_Man_T1b.png` draws
38 x 33, against a spearman's 35 x 24. That reads correctly: a lighter troop and
a heavier one either side of your own soldier.

The heavy was redrawn 1.16x bigger, and its collision radius went 12 -> 14 with
it rather than being left behind — the hitbox is meant to match the body you can
see. That was checked before the change, not after: the whole sim comes out
identical either way, so it is a picture change and not a balance one. Do not
assume the next size change is free; run `node tools/sim.mjs` and look.

## Attacking is not a drawing

An enemy that has been stopped by a spearman lunges 6 game px toward him on each
swing and settles back, in code — the same distance the spearman lunges, so both
sides of a melee move alike. There is no attack frame to draw, and adding one
would mean replacing that movement with a frame system. The same is true of the
walk — enemies bob as they move rather than cycling through poses.

## After uploading

The PNG is used with a trim rect rather than being cropped: `spriteTrim` in
`src/data/waves.js` is an `[x, y, w, h]` window into the source image, so your
export is never modified. Run `node tools/trim.mjs` to print the rect straight
from the alpha channel — do not type it by hand, a few pixels out shifts the
sprite and the error looks like a bad pivot rather than a bad number.

`pivot` is `[across, down]` as a fraction of the trim, and the convention is
**the centre of the figure's ground shadow**. Not his feet, and definitely not
the middle of the bounding box, which a weapon pulls off-centre — the militia's
mace dragged the old box centre 21% of his width off his body.

The shadow is **dark brown, 54,36,7** on a figure and **dark green, 55,66,47**
under a building. It was flat grey on every sprite before the last upload. If a
shadow is recoloured again, `tools/shadow.mjs` has to be told: it matches the
colour exactly, so it will report NO SHADOW COLOUR FOUND rather than quietly
measuring the wrong thing — which is the behaviour you want, because the same
brown is also the club and the boots on some of these figures.

Run `node tools/shadow.mjs` for it. Do not measure it by eye: the artist decides
where a figure stands by drawing the ellipse, and the code reads it.

Because it is a fraction of the trim rather than a pixel count, a pivot survives
a re-export at a different canvas size untouched. The trim rect does not — that
is absolute source pixels, and it is the one thing that has to be re-pasted.

A death pose no longer has to be drawn against this one's foot point — it
carries its own shadow and is measured on its own. Still worth opening
`corpse-test.html` after a redraw, but the two files are independent now.
