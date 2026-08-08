# Tower artwork

| file                       | drawn as   | used by                        |
|----------------------------|------------|--------------------------------|
| `Archers_Tower_T1.png`     | 72 x 94 px | Watchtower (tier 1)            |
| `Archers_Tower_T2.png`     | 76 x 96 px | Archer Post (2), Crossbow Tower (3) |
| `Barracks_Tower_T1.png`    | 81 x 70 px | all three barracks tiers       |

512 x 512, transparent, one shared `SCALE` — the same rules as every other
sprite. `assets/map/README.md` has the reasoning behind the export size.

The men who stand on these are in `assets/units`; their numbers live in the same
`src/data/towers.js` and are re-measured the same way. Tiers 2 and 3 share
`Archers_Man_T2.png` and `Barracks_Man_T2.png`.

**Tier 3 borrows tier 2's drawing, not tier 1's.** A tier is an upgrade, so it
must never look like less than the tier below it; until tier 3 has its own art
the safe reuse is the nearest tier that has one. All three are the same size on
purpose — a tier reads as an upgrade from the artwork and the stars over its
roof, never from being bigger.

The `.svg` files beside the PNGs are the originals. Nothing loads them; they are
here because they are the only place the tower's parts exist as separate
objects, which is what made the front layer below measurable at all.

## The tower can stand in front of its own archer

From tier 2 the tower has a roof, and a post on the deck's nearest corner. Both
are between the archer and the camera, so both have to be drawn **over** him —
otherwise he floats through the roof and stands in front of a post he is behind.

There is no second "front" PNG to draw. `frontTrims` in `src/data/towers.js`
lists rects of the SAME image, re-drawn after the gunner:

| rect                  | what it is                                        |
|-----------------------|---------------------------------------------------|
| `[47, 23, 372, 127]`  | down to y=149: the roof, and the post heads still hidden behind it |
| `[200, 150, 67, 20]`  | the roof's front tip, which hangs below that cut  |
| `[244, 150, 23, 120]` | the near post, tight to its outline               |

Re-drawing a rect paints exactly what the artist put there, transparency and
all, so the archer still shows through wherever the tower does not cover him.
The only rule a rect has to obey is that **everything solid inside it really
does belong in front of the archer** — which is why they are tight rather than
generous, and why there are three of them instead of one box around the lot.

Two edges in there are load-bearing:

- The full-width rect stops at **y = 149**, because below that the FAR post and
  the back rails come out from behind the roof, and both of those are behind the
  archer.
- The tip rect stops at **x = 266**. One pixel further and it catches that far
  post and lands a brown patch on the archer's helmet.

Tier 1 gets no front layer and needs none. Its near post is a stub whose top is
below the deck's near corner, well under the archer's feet, so there is nothing
to be in front of.

## Where the archer stands

Both tiers stand in the **middle of the deck**: tier 1 at source (258, 219),
tier 2 at (265.5, 257.5).

Those points are measured, not eyeballed, and the method is the thing to keep.
The bounding box is no help — the ladder and the flagpole hang off opposite
sides and drag its centre away from the deck. **The four corner posts are what
fix the deck**, as a parallelogram, and the mount is where its diagonals cross:

| tier | post centres, x        | planks, y | mount        |
|------|------------------------|-----------|--------------|
| 1    | 133.5, 246.5, 267.5, 385.5 | 152..286 | (258, 219)  |
| 2    | 144, 256, 274, 388     | 190..325  | (265.5, 257.5) |

After a redraw, re-measure the posts and take the centre again rather than
nudging the old fraction — a fraction of a box that changed shape is a different
point.

**Centring the mount is not the same as centring the man**, and that caught us
out. `gunnerPivot` says which point of the archer's own drawing is "him", and it
was set at 0.360 across, 13px left of his body. That drew the whole figure 13px
right of wherever he was mounted, which read exactly as "standing too far right".
It is 0.451 now — the middle of his torso, measured at the rows where the bow arc
separates from the body. If the archer is ever redrawn, that fraction has to move
with him or the same bug comes back.

The same number decides how far he swings when he turns, because a gunner mirrors
about it: 34px of swing at 0.360, 14px at 0.451. Anything off his middle makes
the two facings sit in visibly different places.

What still crosses the tier 2 archer is the near post: the deck's centre is only
10px right of that post's centre, so a man standing there is behind it by
construction. That is the drawing being honest, not a number to fix.

## After a redraw

1. `node tools/trim.mjs` — paste the new `spriteTrim`.
2. Re-measure `frontTrims`. They are absolute source pixels, like every trim in
   this project, so a re-export at a different size invalidates them. The parts
   are separate groups in the SVG; their bounding boxes are what the rects are
   cut from.
3. Re-check `mountFrac`. It is a fraction of the trim, so it survives a resize —
   but a fraction of a box that changed shape is a different point, and the deck
   is the thing it has to land on.
4. Open `tower-test.html`: every tier, both facings, at the size the game draws
   them, with a crosshair on each mount. The archer's feet belong on the cross,
   the cross belongs on the deck, and no part of him may cover the roof or the
   near post.
5. `node tools/hud-clear.mjs` if the tower got taller — it says which plots push
   a building into the HUD text and by how much.
