# Tower artwork

| file                       | canvas | drawn as     | used by                        |
|----------------------------|--------|--------------|--------------------------------|
| `Archers_Tower_T1.png`     | 1024   | 100 x 123 px | Watchtower (tier 1)            |
| `Archers_Tower_T2.png`     | 1024   | 87 x 152 px  | Archer Post (2), Crossbow Tower (3) |
| `Barracks_Tower_T1.png`    | 1024   | 125 x 116 px | all three barracks tiers       |

## These are on a 1024 canvas and every figure is still on 512

That is not a mistake and the code needs no special case for it. A trim is
absolute source pixels into whatever image it names, and the shared `SCALE`
turns source pixels into game px, so a drawing on a bigger canvas simply draws
bigger. Which is the point: the last redraw made the buildings about 1.4x the
size they were.

The thing that proves 1024-at-`SCALE` is the right reading, rather than the
towers needing half of it, is **the plot marker**. It is on 1024 too, and its
true game size is independently known — the same marker is painted into
`Map_1.svg`, which is authored at the board's own scale, so there is no
ambiguity about how big it is meant to be. At the shared `SCALE` the 1024 file
lands within 2.5% of the painted one. `node tools/split-map.mjs` prints that
comparison every run; it is the check that the two canvases still agree.

One thing this costs: **a tower's trim can no longer be eyeballed against a
figure's.** 490 wide for tier 1 and 144 wide for the archer are not the same
units any more. Compare drawn sizes, never trims.

**The figures are undersized against these buildings right now.** The buildings
grew and the men did not, so a militiaman went from 1/4 of a tier 1 tower's
height to 1/5, and from 1/2.6 of the barracks tent to 1/4.3. Either the figures
get redrawn on a 1024 canvas the same way, or `SCALE` gets split into one factor
for buildings and one for figures — but note the second is not free: a soldier's
collision radius is derived from his drawn width, so it moves the balance and
`tools/sim.mjs` has to be re-run.

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

## Where a building stands: the grey shadow, not the bounding box

Every one of these has a grey ground shadow under it, in exactly `150,150,150`.
**That ellipse's centre is the building's position**, and it lands on the plot
point — the same point the plot marker's own dirt ellipse lands on, so a
building stands precisely where the marker it replaced was standing.

| file                    | shadow centre | as a fraction of the trim |
|-------------------------|---------------|---------------------------|
| `Archers_Tower_T1.png`  | (508, 744)    | `[0.492, 0.886]`          |
| `Archers_Tower_T2.png`  | (544, 811)    | `[0.575, 0.904]`          |
| `Barracks_Tower_T1.png` | (518.5, 628.5)| `[0.511, 0.705]`          |

**The same rule applies to every figure**, not just buildings — `pivot`,
`gunnerPivot` and `deadPivot` are all the centre of that figure's own shadow now.
`node tools/shadow.mjs` measures all thirteen sprites and checks the anchors the
data files hold still land on them.

It is `groundFrac` in `src/data/towers.js`, and it replaced a rule that centred
the bounding box on the plot and put the bottom of the trim 12px below it. That
rule is wrong for any drawing with something sticking out, and all three of
these have something:

- The **barracks** has stakes planted in front of the tent that hang 68 source
  px BELOW its shadow. Pinning those to the ground stood the whole tent 22px too
  high on its plot. This is the one that was visible.
- **Tier 2's** flagpole leans out one side, so its shadow centre is at 0.581
  across rather than 0.5 — the box rule had it 7px left of where it belongs.
- **Tier 1** was 5px high for the same reason as the barracks, just less of it.

The measurement is not a bounding box of the visible grey either, because the
building stands ON its shadow and hides the top of it — the barracks covers 20px
of its own, which drags a box centre 10px down. An ellipse's leftmost and
rightmost pixels lie exactly on its horizontal axis, and those tips are the part
nothing standing in the middle can cover, so the tips give the centre line.

One wrinkle the tool handles: legs and stakes cut a building's shadow into
pieces — eleven of them on the barracks — so the ellipse has to be reassembled
from all of them before it is measured.

## The tower can stand in front of its own archer

From tier 2 the tower has a roof, and a post on the deck's nearest corner. Both
are between the archer and the camera, so both have to be drawn **over** him —
otherwise he floats through the roof and stands in front of a post he is behind.

There is no second "front" PNG to draw. `frontTrims` in `src/data/towers.js`
lists rects of the SAME image, re-drawn after the gunner:

| tier | rect                   | what it is                              |
|------|------------------------|-----------------------------------------|
| 1    | `[547, 397, 15, 60]`   | the post on the deck's nearest corner   |
| 2    | `[583, 392, 15, 124]`  | the post on the deck's nearest corner   |

**The two near railings need polygons, not rects,** and that is `frontPolys`
beside them. They run diagonally along the deck's near edges — left corner down
to the near corner, near corner up to the right — so any rectangle around one
contains the deck behind it as well, and painting that over the archer erases
his legs. The renderer clips the canvas to the polygon and redraws the sprite
through it: four points instead of a staircase of a dozen rects, and exact
rather than approximate.

The polygons are traced from the rail outlines in the `.svg` and padded 5px,
because the PNG draws a black stroke around a shape the SVG stores without one.
The check that they are tight: rendering with and without them changes **350
pixels on the whole board**, and every one of them is on a rail.

**Tier 1 needs one now and did not before.** The old drawing had a stub whose
top sat below the deck's near corner, so there was nothing to be in front of.
The redraw gave it full corner rails, and the near post crosses the archer's
legs like tier 2's always has.

**The roof no longer needs a rect at all.** On the old tier 2 it took three
rects to keep the roof off the archer; on this one the roof's lowest pixel is
y=395 and the archer's head starts at y=395, so they do not overlap. That is
the extra headroom in the redraw doing its job.

Re-drawing a rect paints exactly what the artist put there, transparency and
all, so the archer still shows through wherever the tower does not cover him.
The only rule a rect has to obey is that **everything solid inside it really
does belong in front of the archer** — which is why they are tight rather than
generous.

**The far corner's post is the trap, on both tiers.** It sits well inside the
archer's span — x 457..474 on tier 1, x 498..515 on tier 2 — and it is BEHIND
him. Any rect wide enough to take the near post and the far one together paints
a brown bar across his chest. Measure each post, do not box the deck.

## Where the archer stands

Both tiers stand in the **middle of the deck**: tier 1 at source (507, 441),
tier 2 at (543, 510), on their 1024 canvases.

Those points are measured, not eyeballed, and the method is the thing to keep.
The bounding box is no help — the ladder and the flagpole hang off opposite
sides and drag its centre away from the deck. **The four corner posts are what
fix the deck**, as a parallelogram, and the mount is where its diagonals cross.
The corners are the tops of the four legs, read out of the `.svg`:

| tier | leg tops (x, y)                                    | mount      |
|------|----------------------------------------------------|------------|
| 1    | (356, 460) (466, 382) (651, 418) (554, 505)        | (507, 441) |
| 2    | (392, 529) (502, 451) (688, 487) (590, 574)        | (543, 510) |

The two diagonals cross about 7 units apart rather than exactly, because a leg
has width and the rail caps differ. The mount is the midpoint of the two
crossings — 1.4 game px of slack on a 1024 canvas, which is below what anyone
can see.

As a fraction of the trim, tier 2's mount barely moved across the redraw
(0.587, 0.503 before; 0.574, 0.498 now). That is the reassuring result: the deck
sits in the same place inside the drawing, the drawing just got bigger. Tier 1's
did move, because that tower was reshaped rather than rescaled.

After a redraw, re-measure the legs and take the centre again rather than
nudging the old fraction — a fraction of a box that changed shape is a different
point.

**Centring the mount is not the same as centring the man.** `gunnerPivot` says
which point of the archer's own drawing is "him", and it is now the centre of his
grey ground shadow — `node tools/shadow.mjs` reads it out of the PNG.

That used to be guesswork dressed up as measurement ("the middle of his torso, at
the rows where the bow arc separates from the body") and it was wrong twice, once
by 13px, which read exactly as "the archer is standing too far right". The shadow
removes the judgement call: the artist decides where he stands by drawing it.

The same number decides how far he swings when he turns, because a gunner mirrors
about it. Anything off his middle makes the two facings sit in visibly different
places, and the shadow's centre is his middle by construction.

What still crosses both archers is the near post: the deck's centre is close to
that post in x, so a man standing dead centre is behind it by construction. That
is the drawing being honest, not a number to fix.

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
5. `node tools/shadow.mjs` — it re-measures `groundFrac` and every figure anchor
   from the grey ellipses, and fails if one has drifted off its shadow.
6. `node tools/hud-clear.mjs` if the tower got taller — it says which plots push
   a building into the HUD text and by how much.
