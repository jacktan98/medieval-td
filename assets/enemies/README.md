# Enemy artwork

One file per entry in `enemyTypes` in `src/data/waves.js`. Only one type exists
today:

| file                    | type key    | notes                          |
|-------------------------|-------------|--------------------------------|
| `Enemies_Man_T1.png`    | `light_inf` | the only enemy in all 8 waves  |

Adding a new enemy means adding both the file and the `enemyTypes` entry, so
tell me the intended hp / speed / bounty when you upload one and I will wire it
and re-run `tools/sim.mjs` to see what it does to the balance.

## Export

Same square canvas as everything else — see `assets/map/README.md` for the size
rule and why 200 is currently too small. Whatever the size, **every asset in the
game must use the same one**, because a single `SCALE` in `src/data/towers.js`
converts all of them to game pixels. Draw an enemy at its true size relative to
a soldier on that shared canvas; never scale one to "look right" on its own.

Draw it **standing upright and facing left or right**, not top-down. Enemies
mirror to face the way they are walking and are never rotated — a standing
figure rotated to face north is a standing figure lying down.

`Enemies_Man_T1.png` currently draws 21 x 24 game px against a spearman's
36 x 27, which reads correctly as a lighter troop.

## After uploading

The PNG is used with a trim rect rather than being cropped: `spriteTrim` in
`src/data/waves.js` is an `[x, y, w, h]` window into the source image, so your
export is never modified. Run `node tools/trim.mjs` to print the rect straight
from the alpha channel — do not type it by hand, a few pixels out shifts the
sprite and the error looks like a bad pivot rather than a bad number.

`pivot` is `[across, down]` as a fraction of the trim, and the convention is
**feet on the anchor, standing axis of the legs across** — not the middle of
the bounding box, which a weapon pulls off-centre.
