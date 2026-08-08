# Tower artwork

| file                       | drawn as   | used by                        |
|----------------------------|------------|--------------------------------|
| `Archers_Tower_T1.png`     | 73 x 94 px | Watchtower (tier 1)            |
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
| `[52, 23, 370, 136]`  | everything above the deck: roof, top plates, post heads |
| `[249, 152, 21, 140]` | the near post, tight to its outline               |

Re-drawing a rect paints exactly what the artist put there, transparency and
all, so the archer still shows through wherever the tower does not cover him.
The only rule a rect has to obey is that **everything solid inside it really
does belong in front of the archer** — which is why they are tight rather than
generous, and why there are two of them instead of one box around both.

Two numbers in there are load-bearing:

- The roof rect stops at **y = 158** because the deck's own topmost pixel is
  y = 159. One row lower and the deck's far corner gets painted across the
  archer's hat.
- The post rect **starts at y = 152**, above that cut, so the roof's front tip —
  which hangs below 158 right where the post is — stays whole where the two
  meet. Checked at 9x: no notch.

Tier 1 gets no front layer and needs none. Its near post is a stub that ends at
the deck, about 3px shy of the archer's feet, so there is nothing to be in front
of. Its SVG could not provide one anyway: the whole tower is a single group of
118 paths, where tier 2's is 19 separate parts.

## Where the archer stands

`mountFrac` on each tier. Tier 2's is `[0.586, 0.438]` — the **middle of the
deck**, source pixel (269, 227) inside the 512 canvas.

That point is measured, not eyeballed. The four corner posts fix the deck as a
parallelogram — far (276.5, 159), right (391.5, 248), near (261.5, 294), left
(146.5, 205) — and the mount is where its diagonals cross. If the tower is ever
redrawn, re-measure the posts and take the centre again rather than nudging the
old fraction.

**The cost of the middle is the roof.** There is only about 120 source px of
covered headroom over this deck, so standing dead centre the roof's near slope
takes the top of the archer's helmet — roughly 30% of him, against about 13% if
he stood a third of the way further forward. That is a real occlusion, not a
placement bug: it is what a low roof does to anyone under it. Moving him forward
is one number if it ever needs trading back.

One thing to know before nudging him sideways: a gunner mirrors about his
**feet**, not his middle, and this archer's feet are 36% across his own art — so
flipping him swings his body 34px sideways, which is wider than the near post.
Any position within about 20px of the post puts it straight down his face in one
of the two facings.

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
