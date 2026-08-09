# Tower artwork

| file                       | canvas | drawn as     | used by                        |
|----------------------------|--------|--------------|--------------------------------|
| `Archers_Tower_T1.png`     | 1024   | 100 x 123 px | Watchtower (tier 1)            |
| `Archers_Tower_T2.png`     | 1024   | 88 x 153 px  | Archer Post (2), Crossbow Tower (3) |
| `Barracks_Tower_T1.png`    | 1024   | 125 x 108 px | Militia Camp (tier 1)          |
| `Barracks_Tower_T2.png`    | 1024   | 128 x 129 px | Guard Post (2), Knight's Hall (3) |

The barracks hut is the biggest building in the game, which is why the plot
marker was redrawn bigger to hold it.

## These are on a 1024 canvas and every figure is still on 512

That is not a mistake and the code needs no special case for it. A trim is
absolute source pixels into whatever image it names, and the shared `SCALE`
turns source pixels into game px, so a drawing on a bigger canvas simply draws
bigger. Which is the point: the last redraw made the buildings about 1.4x the
size they were.

The thing that proves 1024-at-`SCALE` is the right reading, rather than the
towers needing half of it, is **the plot marker**. It is on 1024 too, and its
true game size is independently known — the same marker is painted into
`Map.svg`, which is authored at the board's own scale, so there is no
ambiguity about how big it is meant to be. At the shared `SCALE` the 1024 file
lands within 2.5% of the painted one. `node tools/split-map.mjs` prints that
comparison every run; it is the check that the two canvases still agree.

One thing this costs: **a tower's trim can no longer be eyeballed against a
figure's.** 490 wide for tier 1 and 144 wide for the archer are not the same
units any more. Compare drawn sizes, never trims.

**The figures are still undersized against these buildings, and it is now
visible on the deck.** The buildings grew and the men did not: a militiaman is
1/5 of a tier 1 tower's height and 1/4.3 of the barracks tent, where he used to
be 1/4 and 1/2.6. On the archery deck the archer reads as a doll rather than a
man — the drawing is right, the ratio is not. Two ways out, and neither has been
taken yet:

1. Redraw the ten figure files on a 1024 canvas the way the buildings were. No
   code changes at all; every trim gets re-pasted, every anchor is a fraction
   and survives.
2. Split `SCALE` into a building factor and a figure factor, about 1.4x on the
   figures. One line, but **not free**: a soldier's collision radius is derived
   from his drawn width, so it moves the balance and `tools/sim.mjs` has to be
   re-run and probably an hp pass with it.

The men who stand on these are in `assets/units`; their numbers live in the same
`src/data/towers.js` and are re-measured the same way. **All three tiers now have
their own man in both families** — plate armour at tier 3, a knight with a sword
where the lower tiers carry a spear.

**The BUILDINGS are still shared: tier 3 borrows tier 2's drawing, not tier 1's,**
in both families. A tier is an upgrade, so it must never look like less than the
tier below it; until tier 3 has a building of its own the safe reuse is the
nearest tier that does.

Note what the tier 3 knight cost to wire up, because it is the general case: his
box is 114 source px wide against the spearmen's 172 and 166, since a sword held
across the chest reaches nowhere near as far as a spear. Every anchor is a
fraction of that box, so not one of them could be carried across — the same
fraction on a box that lost a third of its width describes a different man.
`bodyFrac` especially: it feeds the collision radius, and all three tiers happen
to come out at r = 6, which is worth checking rather than assuming every time.

Within a family, tiers 2 and 3 are the same size because they are the same
drawing — a tier reads as an upgrade from the artwork and the stars over its
roof. **Across families they are not**, and that is deliberate now: the barracks
hut is wider than the tallest tower and the marker was resized for it.

The `.svg` files beside the PNGs are the originals. Nothing loads them; they are
here because they are the only place the tower's parts exist as separate
objects, which is what made the front layer below measurable at all. Only the two
archery towers have one — the barracks huts are PNG-only, which is fine because
neither has a gunner to be in front of.

## Where a building stands: the shadow, not the bounding box

Every one of these has a ground shadow under it, in exactly `55,66,47` — dark
green, because a building stands on grass. **That ellipse's centre is the
building's position**, and it lands on the plot point, the same point the plot
marker's own dirt ellipse lands on, so a building stands precisely where the
marker it replaced was standing.

| file                     | shadow centre  | as a fraction of the trim |
|--------------------------|----------------|---------------------------|
| `Archers_Tower_T1.png`   | (507.3, 735.6) | `[0.490, 0.871]`          |
| `Archers_Tower_T2.png`   | (545.3, 802.5) | `[0.578, 0.890]`          |
| `Barracks_Tower_T1.png`  | (521.0, 605.4) | `[0.515, 0.678]`          |
| `Barracks_Tower_T2.png`  | (503.8, 696.9) | `[0.487, 0.793]`          |

**The same rule applies to every figure**, not just buildings — `pivot`,
`gunnerPivot` and `deadPivot` are all the centre of that figure's own shadow.
A figure's shadow is a different colour, `54,36,7`, because it is painted on
whatever the figure is standing on rather than on grass. `node tools/shadow.mjs`
measures all fourteen sprites and checks the anchors the data files hold still
land on them.

**Both colours changed in the last upload** — every shadow used to be flat grey
`150,150,150`, and that grey is still all over the set as spear metal and stone
footings. The tool matches the colour exactly and says NO SHADOW COLOUR FOUND
rather than guessing, which is what you want: the alternative is it measuring a
spearhead and reporting a number that looks fine.

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

**A building's shadow is measured by fitting the whole ellipse**, not by reading
its edges, and the reason is worth keeping. The tent stands on the top of its own
shadow; the tier 1 tower has a log lying across the left of its one and a ladder
planted on the right, so the left tip and the right tip are hidden at different
heights. Any rule that reads extremes gets a different answer depending on which
bit happens to be covered — reading the tips put the tier 1 tower 9px above its
own plot. The tool fits an axis-aligned ellipse to the outline instead and
re-fits a few times, dropping the worst points each round; occluded outline lies
inside the true ellipse, so it falls out and the surviving arc decides.

That fit is checkable, and it checks out: the tier 1 tower's shadow is a single
`<path>` in the `.svg`, describing an ellipse centred at (507.9, 736.1). The fit
reads (507.3, 735.6) out of the PNG without being shown the SVG.

**Figures are measured the other way round, by their tips.** Their shadows are
58px across and 14px tall with the figure standing on the middle, so the visible
arc is nearly flat and a fit happily runs a much taller ellipse through it — 13px
out on the tier 1 archer. The tip rule is exact on all ten figures and the fit is
exact on all four buildings; neither is exact on the other's job.

## The tower can stand in front of its own archer

From tier 2 the tower has a roof, and a post on the deck's nearest corner. Both
are between the archer and the camera, so both have to be drawn **over** him —
otherwise he floats through the roof and stands in front of a post he is behind.

There is no second "front" PNG to draw. `frontTrims` in `src/data/towers.js`
lists rects of the SAME image, re-drawn after the gunner:

| tier | rect                   | what it is                              |
|------|------------------------|-----------------------------------------|
| 1    | `[547, 397, 15, 60]`   | the post on the deck's nearest corner   |
| 2    | `[583, 392, 15, 130]`  | the post on the deck's nearest corner   |

Tier 2's is more than twice as tall because its near post runs the whole height
of the tower, from the roof down through the deck, so it is in front of the
archer from over his helmet to under his feet. Tier 1's post starts at the deck.

**The near railing needs a polygon, not a rect,** and that is `frontPolys`
beside them. It runs diagonally along the deck's near-left edge, from the left
corner down to the near corner, so any rectangle around it contains the deck
behind it as well — and painting that over the archer erases his legs. The
renderer clips the canvas to the polygon and redraws the sprite through it: four
points instead of a staircase of a dozen rects, and exact rather than
approximate.

| tier | polygon                                             |
|------|-----------------------------------------------------|
| 1    | `[352,419] [560,462] [558,480] [350,438]`           |
| 2    | `[387,487] [594,530] [592,548] [385,506]`           |

**There is only ONE rail per tower, not two.** The deck's near-RIGHT edge has no
rail on either tier — that is the side the ladder comes up — and an earlier pass
put a polygon there anyway, tracing the deck's edge board. It was harmless
because that board sits below the archer's feet, but it was not a rail.

The polygons are traced from the rail outlines in the `.svg` and padded 5px,
because the PNG draws a black stroke around a shape the SVG stores without one.

**The rails were lowered in the last redraw to give the archer more room**, and
it shows in how little of him they now cross: tier 1's rail is in front of him
from x=438 to about x=484 and only across his shins, and past that it passes
below his feet entirely. Expect the overlap to be subtle. It is still needed —
without it he stands in front of a rail he is behind.

**The roof does not need a rect.** On tier 2 the roof's lowest pixel is y=400 and
the archer's head starts at y=396, so they overlap by four rows at the very edges
of both — nothing you can see. An older tier 2 needed three rects for the roof
alone; the headroom in the redraws is what removed them.

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

Both tiers stand in the **middle of the deck**: tier 1 at source (506.5, 438.6),
tier 2 at (541.2, 505.2), on their 1024 canvases.

Those points are measured, not eyeballed, and the method is the thing to keep.
The bounding box is no help — the ladder and the flagpole hang off opposite
sides and drag its centre away from the deck. **The four corner posts are what
fix the deck**, as a parallelogram, and the mount is where its diagonals cross.
The corners are the tops of the four legs, read out of the `.svg`:

| tier | leg tops (x, y)                                    | mount          |
|------|----------------------------------------------------|----------------|
| 1    | (356, 460) (466, 382) (651.5, 418) (554, 505)      | (506.5, 438.6) |
| 2    | (391, 526) (501, 449) (687, 485) (589, 572)        | (541.2, 505.2) |

**Use the leg tops, never the rails.** Tier 1's four legs have not moved across
two redraws while its rails have changed height in both of them, which is exactly
why the deck is defined by the legs: a rail is furniture and a leg is structure.

The answer is checkable against the deck planks, which are their own shape in the
`.svg`: tier 1's plank group is x 349..658, y 378..498, whose centre is
(503.5, 438) — 3px from the diagonals' crossing on a 1024 canvas, well under one
game pixel.

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
   from the shadow ellipses, and fails if one has drifted off its shadow.
6. `node tools/hud-clear.mjs` if the tower got taller — it says which plots push
   a building into the HUD text or off the top of the board, and by how much. A
   taller tower moves that ceiling down for every plot at once.
