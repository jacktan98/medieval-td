# Enemy artwork

One file per entry in `enemyTypes` in `src/data/waves.js`:

| file                    | type key    | notes                                    |
|-------------------------|-------------|------------------------------------------|
| `Enemies_Man_T1.png`    | `light_inf` | the militia, in all 8 waves              |
| `Enemies_Man_T2.png`    | `heavy_inf` | the heavy, waves 4-8, in growing packs   |

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

`Enemies_Man_T1.png` draws 20 x 23 game px and `Enemies_Man_T2.png` draws
33 x 28, against a spearman's 35 x 27. That reads correctly: a lighter troop and
a heavier one either side of your own soldier.

## Attacking is not a drawing

An enemy that has been stopped by a spearman lunges 4 game px toward him on each
swing and settles back, in code. There is no attack frame to draw, and adding
one would mean replacing that movement with a frame system. The same is true of
the walk — enemies bob as they move rather than cycling through poses.

## After uploading

The PNG is used with a trim rect rather than being cropped: `spriteTrim` in
`src/data/waves.js` is an `[x, y, w, h]` window into the source image, so your
export is never modified. Run `node tools/trim.mjs` to print the rect straight
from the alpha channel — do not type it by hand, a few pixels out shifts the
sprite and the error looks like a bad pivot rather than a bad number.

`pivot` is `[across, down]` as a fraction of the trim, and the convention is
**feet on the anchor, standing axis of the legs across** — not the middle of
the bounding box, which a weapon pulls off-centre.

Because it is a fraction of the trim rather than a pixel count, a pivot survives
a re-export at a different canvas size untouched. The trim rect does not — that
is absolute source pixels, and it is the one thing that has to be re-pasted.

Re-exporting also moves the foot points that `assets/dead/` is drawn against, so
if you redraw one of these, the matching death pose has to be checked with
`corpse-test.html`.
