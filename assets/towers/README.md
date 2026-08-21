# Tower artwork

**One folder per family, and it holds BUILDINGS only.** Upload a family's
buildings into its own folder; put a new family in a new one. Everything that is
not a building goes in the folder for what it IS, whichever family it belongs to
— figures in `assets/units`, death poses in `assets/dead`, projectiles in
`assets/projectiles`. So the catapult's crewman stands with the archers and the
spearmen, and its rock flies beside the arrow. The paths are written down once,
in `src/assets.js`.

| file                                   | canvas | drawn as     | used by            |
|----------------------------------------|--------|--------------|--------------------|
| `archery/Archery_Tower_T1.png`         | 1024   | 100 x 123 px | Watchtower (1)     |
| `archery/Archery_Tower_T2.png`         | 1024   | 88 x 153 px  | Archer Post (2)    |
| `archery/Archery_Tower_T3.png`         | 1024   | 74 x 153 px  | Crossbow Tower (3) |
| `archery/Musketeer_Post.png`           | 1024   | 74 x 126 px  | Musketeer Post (4) |
| `barracks/Barracks_Tower_T1.png`       | 1024   | 125 x 108 px | Militia Camp (1)   |
| `barracks/Barracks_Tower_T2.png`       | 1024   | 128 x 129 px | Guard Post (2)     |
| `barracks/Barracks_Tower_T3.png`       | 1024   | 128 x 127 px | Knight's Hall (3)  |
| `barracks/Paladin_Keep.png`            | 1024   | 107 x 133 px | Paladin Keep (4)   |
| `artillery/Artillery_Default_T1.png`   | 1024   | 96 x 71 px   | ALL THREE artillery tiers, at rest    |
| `artillery/Artillery_Reload_T1.png`    | 1024   | 96 x 71 px   | ALL THREE artillery tiers, loading    |
| `artillery/Artillery_Fire_T1.png`      | 1024   | 96 x 71 px   | ALL THREE artillery tiers, throwing   |
| `artillery/Ballista_Turret_Tower.png`  | 1024   | 106 x 127 px | Ballista Turret (4), the stone alone  |
| `artillery/Ballista_Turret_Default.png`| 1024   | 70 x 47 px   | its machine, at rest                  |
| `artillery/Ballista_Turret_Reload.png` | 1024   | 62 x 47 px   | its machine, spanning the bow         |
| `artillery/Ballista_Turret_Fire.png`   | 1024   | 63 x 47 px   | its machine, loosing                  |
| `monastery/Monastery_Tower_T1.png`     | 1024   | 111 x 116 px | Wayside Shrine (1) |
| `monastery/Monastery_Tower_T2.png`     | 1024   | 98 x 142 px  | Chapel (2)         |
| `monastery/Monastery_Tower_T3.png`     | 1024   | 96 x 142 px  | Abbey (3)          |

Elsewhere, but artillery's: `units/Artillery_Man_T1.png` (the crewman, for the
info box only — he is drawn into all three frames already) and
`projectiles/Artillery_Rock_T1.png`.

Elsewhere, but the monastery's: `units/Soldiers_Priest_Default.png` and
`_Attack` (and the Bishop's and the Cardinal's), and
`projectiles/Soldiers_Priest_Arcane_Missle.png` for each of the three.

Elsewhere, but the Musketeer Post's: `units/Musketeer_Default.png` and
`_Attack`, `projectiles/Musketeer_Bullet.png`, `ui/Musketeer_Post_Icon.png` (the
one upgrade button in the game that shows what it buys rather than an arrow), and
four clips — `audio/sfx/Musketeer_shot.mp3`, `audio/sfx/Musketeer_kill_enemy.mp3`
and two voice lines. Plus its two abilities: `units/Musketeer_Deadeye.png`,
`projectiles/Musketeer_Deadeye_Bullet.png`, `audio/sfx/Musketeer_Deadeye.mp3`,
`effects/Musketeer_Target_Locked.png` (the crosshair Deadeye paints over its man a
second before it fires) and the two button faces
`ui/Musketeer_Burst_Fire_Icon.png` and `ui/Musketeer_Deadeye_Icon.png`.

Elsewhere, but the Ballista Turret's: `units/Ballista_Engineer.png` (the man, for
the info box and the encyclopedia — he is drawn into all three machine frames
already), `projectiles/Ballista_Turret_Bolt.png`, `ui/Ballista_Turret_Icon.png`,
and five clips — `audio/sfx/Ballista_Bolt_shot.mp3`,
`audio/sfx/Ballista_kill_enemy.mp3` and three voice lines. It has no abilities
yet.

**IT IS THE FIRST BUILDING DRAWN IN TWO PIECES**, and the reason is worth
keeping. Every other artillery tier is one drawing per beat with the machine, the
crew and the ground in it, and the WHOLE picture mirrors when the crew swing
round. A turret cannot do that — a mirrored turret is lit from the wrong side and
its stonework recedes the wrong way — so the stone is a still drawing that never
flips and the machine is a second one that animates and turns on top of it.

Four numbers hold them together, all in `src/data/towers.js`. `mountFrac` is
where the machine stands on the roof and the machine's own `pivot` is the point
of its drawing that lands there; `mirror` is the line the drawing FLIPS about,
and `nose` is where the bolt leaves.

**It mirrors about the middle of its drawing, not about its post.** The post is
near one end of the machine and the engineer is 175 source px from it at the
other, so flipping about the post swings the whole thing that far across the
roof — whichever way it turned it sat too far to one side, which is what the
first build did and what the owner sent back. Flipping about the middle keeps the
same footprint both ways: the post and the engineer simply swap ends of it.

With the footprint fixed, the mount is just "where does that footprint sit", and
source (440, 379) is where all four ground points — post and engineer, each way
round — sit furthest inside the deck quad: 24.7 to 44.9 source px of clearance,
against the 16.2 the best post-mirrored placement could manage.

**And `nose` is a point of the drawing, not an offset from the post**, for the
same reason `pivot` is: it goes through the same mirror the picture does. It was
an offset first, taken from the loaded bolt — which is drawn well behind the bow
— and the shot came out of the BACK of the machine in both directions. It is THE
MOUTH now, source (412, 566): where the rail crosses the bow, which is the point
the artist drew every bolt leaving from.

**`nose` is where the BACK of the bolt sits**, not the front, and `clear` on the
ammunition is what makes that true. A projectile is anchored by its HEAD, because
the head is what has to land on the man — and a bolt is 42.5 drawn px long, more
than half the ballista's own width, so a head at the mouth leaves the shaft lying
back across the whole machine. `clear` pushes the head one bolt-length forward
along the line the shot is taking, which puts the tail on the mouth and the
drawing outside the machine, rotated to wherever the enemy is.

It is clamped to the range in `shoot()`: at anything closer than a bolt-length
the shot simply spans the gap, tail at the mouth and head on the target, rather
than starting past the man it is aimed at.

**The encyclopedia shows both halves too.** A card draws the machine over the
stone, and so does the pop-up a tapped card opens — that one showed the bare
turret to begin with, which is not the tower: half of a Ballista Turret is the
ballista, and the pop-up is the only place in the game its engineer is drawn big
enough to look at.

The battlement block at the deck's NEAREST corner is a `frontPolys` entry, so the
machine's foot passes behind it exactly as the Musketeer Post's boots pass behind
its merlon. `tower-test.html?siege` draws the whole ladder facing both ways,
which is the page to open after any re-export.

Elsewhere, but the Paladin Keep's: `units/Paladin_Default.png` and `_Attack`,
`dead/Paladin_Dead.png`, `ui/Paladin_Keep_Icon.png`, and four clips —
`audio/sfx/Paladin_attack.mp3`, `audio/sfx/Paladin_kill_enemy.mp3` and two voice
lines. It has no projectile: it is a barracks, and its men do the fighting. Plus
its two abilities: `units/Paladin_Holy_Light.png`, `units/Paladin_Holy_Slash.png`,
`audio/sfx/Paladin_Holy_Light.mp3`, `audio/sfx/Paladin_Holy_Slash.mp3` and the two
button faces `ui/Paladin_Holy_Light_Icon.png` and `ui/Paladin_Holy_Slash_Icon.png`.

**ONLY A TIER 4 HAS ABILITIES**, and that is what the tier is for once its ladder
is finished: the Upgrade button goes dead and 150 gold buys a change to how the
tower fights instead of a rung. The rules and the numbers are in
`src/data/abilities.js`, a tier names only the ids it offers, and
`node tools/abilities.mjs` drives all four through the real fight code.

**A TIER 4 FILE IS NAMED FOR THE TOWER, NOT THE RUNG.** `Musketeer_Post.png` sits
in the archery folder with `Archery_Tower_T1..T3` and `Paladin_Keep.png` with
`Barracks_Tower_T1..T3`, because that is the family each belongs to, and the code
reaches them as `archery[3].sprite` and `barracks[3].sprite` either way. Keep
uploading whichever name the tower actually has; `src/assets.js` is where the two
meet.

**The keep is the first barracks building that grew UPWARDS.** 107 x 133 against
the hall's 128 x 127 — narrower and taller, which is what a keep is next to a
hall, and it means the plot marker drawn to hold a 128-wide hut still holds it.

**Archery, barracks and the monastery have their own building per tier.**
Artillery does not yet — one machine draws all three — which is why it is the
only family in the game that wears TIER STARS. See below.

**The monastery was redrawn, and it is a different building now.** The old family
was a walled cell that grew a roof; the new one is an open timber deck on legs with
a rail round it — archery's shape in the monastery's materials — with a cross on a
post at tier 1, a roof at tier 2 and the whole platform rebuilt in stone at tier 3.
The old folder was deleted and the set re-uploaded, so every trim, mount and shadow
anchor in `src/data/towers.js` was measured again from these files and none of the
old numbers carried across.

Two things came out of that redraw and both are recorded in the code: the deck is
the SAME polygon on all three tiers, 31945 square source px to the pixel, and the
roof no longer needs drawing over the priest — the eaves clear the top of his staff
by 33px, where on the old art they cut through it and needed a traced polygon.

## The catapult is three drawings, and they share ONE trim

It is the only building in the game that moves. The machine cycles
Default → Reload → Fire while it has something to shoot at, and the beats are
**0.75s, 0.75s and 1.5s** — the Fire pose holds double, because a rock is a real
lob with a real flight time and the arm has to still be up when it lands. Total
three seconds, and the cooldown is derived from those beats rather than chosen
next to them. At rest the machine sits on Default with the clock stopped.

**Shortening the Fire beat breaks the projectile.** The longest throw in the game
— tier 3's reach of 360 at 300px/s — is 1.20s, leaving about a quarter second in
hand. `node tools/siege.mjs` checks that margin and checks that rocks really do
land while the pose is up. It has already earned its keep: the range increase to
360 put the flight at exactly 1.50s against a 1.50s pose, and the rock's speed
went from 240 to 300 to buy the margin back.

`spriteTrim` for it is the **union** of the three frames' own boxes,
`[267, 328, 466, 346]`, and it is the one trim in the project that
`node tools/trim.mjs` will not print for any single file:

| frame   | its own trim         |
|---------|----------------------|
| Default | `[267, 350, 466, 324]` |
| Reload  | `[291, 350, 442, 324]` |
| Fire    | `[291, 328, 442, 346]` — the arm is up, so it reaches 22px higher |

All three are on the same 1024 canvas, so drawing the same source rect out of
each registers them pixel-for-pixel and only what the artist actually moved
appears to move. Give each frame its own tight box instead and the machine hops
sideways and upwards every second.

`node tools/trim.mjs` checks the union property directly, and it is not a
formality: a frame reaching outside the shared box is silently **cropped**, and
on this drawing the part that would go is the top of the raised arm — so a redraw
that swung it a little higher would saw the bucket off at the moment of firing
and nothing would say so.

**After redrawing any frame**, re-run `node tools/trim.mjs`, take the union of
the three printed rects by hand, and paste it as `CATAPULT_TRIM`.

`node tools/shadow.mjs` checks all three frames against the SAME `groundFrac`,
which is the other half of the same question: if the three shadows are not in one
place the catapult hops on its plot. Fire reads about 2 source px high — half a
game pixel — because the raised arm covers a different part of the ellipse.

**The rock leaves the sling bucket at the top of the raised arm**, source
`(434.0, 363.5)`, which only exists in the Fire frame. It is measured rather than
eyeballed: the bucket is painted in `54,36,7` and is the only blob of that colour
above the deck line. It is held as `mountFrac` with a zero `muzzle`, because
there is no gunner to measure an offset from — on this machine the building *is*
the man.

## The catapult is the one building that MIRRORS

Buildings in this game do not flip — an isometric drawing reversed is lit from
the wrong side and its ground plane recedes the wrong way — and only the figures
standing on them do. Artillery is the exception, because it is the only building
that visibly POINTS: a machine hurling away from the enemy reads as broken in a
way a symmetrical tent or tower never could. The perspective cost is real and it
is worth paying here and nowhere else.

`buildingFaces: 1` says the machine is drawn throwing up and to the **RIGHT**, so
a target on the right is the unmirrored case and only a target on the left flips
it. It is a different field from `spriteFaces`, which every archery tier also
carries and which is about the man on the deck.

**That direction is measured, and it was got backwards once.** The arm's RESTING
position is on the left of the frame, which reads as "this machine throws left"
and is exactly wrong: where the arm sits says nothing, where it SWINGS is the
answer. The sling is the only blob of `54,36,7` above the deck line in each
frame, and between Default and Fire its centre travels
`(373.5, 482.0) -> (434.0, 363.5)` — 60.5px to the right and 118.5px up.

The wrong sign was invisible in code review: every mechanism worked, both
directions got used, the latch held, and the machine threw away from the enemy on
every shot. So `tools/siege.mjs` names the two cases rather than checking for "a
flip" — a test that only asserts "the far side mirrors" passes either way round,
because either way round has a far side.

**Mirrored about the point it stands on**, not about the middle of its box. The
two are not the same — the ground shadow sits 0.582 across rather than 0.5 — and
mirroring about the box centre would slide the machine 8px sideways off its own
plot every time it turned.

**The muzzle mirrors with the picture.** `mountPoint` applies the same reflection,
because a machine that swings its arm right while the rock leaves a sling still
drawn on the left reads as a broken projectile rather than an incomplete
transform.

**The facing is latched once per cycle, on the LOADING beat**, and held through
the throw and back to rest. Facing whatever the current target happens to be
looks wrong in two ways that a still image cannot show: `pickTarget` re-chooses
every frame, so a machine with enemies on both sides snaps back and forth several
times a second, and it can turn BETWEEN the reload and the throw — loading one
way and loosing the other. Latching at the load is also the honest reading of the
animation: a crew winds a machine pointing somewhere and does not swivel it
mid-swing. `node tools/siege.mjs` walks a target across a machine and fails if
the facing ever changes on any other beat.

The tier stars are drawn OUTSIDE the mirror and centred on the plot point, so a
machine turning round does not swing its own stars about.

## Artillery reaches furthest and has a hole in the middle

`minRange` is a dead zone: anything within **130px** of the machine is too close
to drop a rock on and walks past untouched. It is the price of the longest reach
in the game (300/330/360 against archery's 190/210/230) and it is what stops
artillery being archery-but-better — the two families want different PLOTS now,
not the same plot at a different price. A bow wants to be beside the road; a
machine wants to be back from it.

It is the same 130 at every tier on purpose. A bigger engine really would have a
longer minimum, but modelling that would make an upgrade take something away —
the annulus would shift outward and a Trebuchet would stop covering road its
Catapult did.

130 is measured rather than picked, and `node tools/siege.mjs` prints the table:
sampled along every lane of every route on both maps, it costs each plot between
0 and 15% of the road it could otherwise reach, and no plot falls below 16%. The
tool fails if any plot drops under a tenth, which is the failure mode that
matters — a dead zone big enough to make a plot a trap the game never warns you
about.

The reach draws as an **annulus**: pale wash between the two ellipses, a solid
rim outside and a dashed amber rim inside. The wash means "this tower shoots
here", so washing over the dead ground would promise reach the tower has not got.

## The tier stars took themselves away, exactly as designed

Artillery had one machine for three tiers, so nothing on the board told a
Trebuchet from a Catapult and the tier stars came back for that family alone:
one, two or three small gold stars over the building.

**They are gone again, and nobody deleted them.** `tierMarks` in `src/render.js`
marks a tower only when another tier in its family shares its sprite key. Tier 2
and tier 3 arrived with three frames each and their own keys, and the stars
stopped being drawn on the same commit — as did the headroom `tools/hud-clear.mjs`
allows for them, because it reads the same function.

That is the pattern worth copying for the monastery when it lands: a stand-in
that removes itself when the thing it stands in for arrives beats one that has to
be remembered.

(The info box does not say "Barracks Tier II" either — it names the MAN, so it
reads "Spearman", "Combat Archer", "Trebuchet Engineer". The tier titles moved to
the encyclopedia, which is where a tier is compared against the tier above it.
See `unit` in `src/data/towers.js`.)

## All three machines, and which way they throw

Nine frames now: Catapult, Mangonel, Trebuchet, each with Default, Reload and
Fire, each three registered against **one union trim** for the same reason tier 1
always was — the same source rect out of every frame is what stops the machine
jumping when the animation advances.

The unions are much taller than the resting drawings, and that is the Fire frame
doing it. A trebuchet's arm at the top of its swing reaches 227 source px above
where the machine rests, so its box is 626 tall against the 399 the resting frame
would ask for. That is not slack: the box has to hold the tallest frame.

| tier | union trim              | drawn     |
|------|-------------------------|-----------|
| 1    | `[267, 328, 466, 346]`  | 96 x 71   |
| 2    | `[263, 228, 498, 452]`  | 102 x 93  |
| 3    | `[161, 107, 664, 626]`  | 136 x 128 |

**All three throw RIGHT**, so all three keep `buildingFaces: 1` and mirror only
for a target on the left. That was measured rather than assumed, because the
direction is invisible in a still and was got backwards once on tier 1 — where
the arm SITS says nothing, where the payload TRAVELS is the answer:

| machine   | payload | rest → Fire                        |         |
|-----------|---------|------------------------------------|---------|
| Catapult  | sling   | (373.5, 482.0) → (434.0, 363.5)    | +60.5   |
| Mangonel  | cup     | (395, 365) → (474.5, 258.4)        | +79.5   |
| Trebuchet | pouch   | (240, 480) → (600.9, 136.9)        | +360.9  |

`node tools/siege.mjs` pins all three, and checks that no two tiers share a
frame, a shadow anchor or a release point — an anchor pasted down from the tier
below is the classic error here and it is invisible, because the machine simply
stands a few pixels off its plot.

**The rock grows with the machine** — 12 x 10 game px, then 15 x 15, then
18 x 18 — and **the flight does not**. Same speed, same arc, same lead, because
1.5s of Fire pose was chosen against that flight and a heavier rock that also
flew slower would put the longest throw back over it. What a bigger rock does is
the damage number beside it.

**Nothing is left to draw for this family.** `Artillery_Icon.png` filled the last
vector glyph on a family that has tiers; only the monastery's cross and the `max`
chevrons are still drawn in code.

The barracks hall is the biggest building in the game, which is why the plot
marker was redrawn bigger to hold it. Tier 3 is 128 x 127 against tier 2's
128 x 129, so the ceiling did not move; `node tools/hud-clear.mjs` confirms every
plot is as clear as it was.

Tier 3 archery is the same 153px tall as tier 2 and 14px NARROWER, because a
stone keep has no splayed legs. Same height means the HUD ceiling is unchanged
there too.

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
`src/data/towers.js` and are re-measured the same way. **All three tiers have
their own man in both families** — plate armour at tier 3, a knight with a sword
where the lower tiers carry a spear.

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
objects, which is what made the front layer below measurable at all. Only the
three archery towers have one — the barracks huts are PNG-only, which is fine
because none of them has a gunner to be in front of.

The SVGs carry no ids or labels, so the parts are identified by geometry and fill
colour after composing the transform stack: `#969696` is stone, `#735a31` is
structural timber, `#74592e` is roof, `#37422f` is the ground shadow. On tier 3
that picks out the deck face, the four 13x191 posts, the three beams between them
and the ladder without any guessing about which shape is which.

## Where a building stands: the shadow, not the bounding box

Every one of these has a ground shadow under it, in exactly `55,66,47` — dark
green, because a building stands on grass. **That ellipse's centre is the
building's position**, and it lands on the plot point, the same point the plot
marker's own dirt ellipse lands on, so a building stands precisely where the
marker it replaced was standing.

| file                     | shadow centre  | as a fraction of the trim |
|--------------------------|----------------|---------------------------|
| `archery/Archery_Tower_T1.png`   | (507.3, 735.6) | `[0.490, 0.871]`   |
| `archery/Archery_Tower_T2.png` | (545.3, 802.5) | `[0.578, 0.890]`          |
| `archery/Archery_Tower_T3.png` | (512.3, 802.4) | `[0.501, 0.890]`          |
| `barracks/Barracks_Tower_T1.png` | (521.0, 605.4) | `[0.515, 0.678]`          |
| `barracks/Barracks_Tower_T2.png` | (503.8, 696.9) | `[0.487, 0.793]`          |
| `barracks/Barracks_Tower_T3.png` | (504.2, 701.8) | `[0.487, 0.806]`          |
| `artillery/Artillery_*_T1.png`   | (538.0, 593.1) | `[0.582, 0.766]` — all three frames |

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

That fit is checkable, and it checks out twice now. The tier 1 tower's shadow is a
single `<path>` in the `.svg` describing an ellipse centred at (507.9, 736.1), and
the fit reads (507.3, 735.6) out of the PNG without being shown the SVG. Tier 3's
shadow path spans x 335.6..689.9 and y 724.4..881.5, centre (512.75, 802.95); the
fit reads (512.3, 802.4). Under a pixel each time, on two different drawings.

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
| 3    | `[547, 370, 18, 197]`  | the post on the deck's nearest corner   |

Tier 2's is more than twice as tall because its near post runs the whole height
of the tower, from the roof down through the deck, so it is in front of the
archer from over his helmet to under his feet. Tier 1's post starts at the deck.
Tier 3's is taller again — the SVG has it as a single 13x191 timber from
(549.4, 373.0) to (562.8, 563.8), padded 2px for the stroke — but for a different
reason: its deck is the top of a stone keep, so the post stands entirely ON the
deck and it is the POSTS that are tall, not the run below them.

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
| 3    | none — see below                                    |

**Tier 3 has no `frontPolys` at all, and that is measured rather than skipped.**
It does have a near-left timber, `(358.4,492.2) (556.1,534.7) (554.3,543.4)
(356.5,500.9)` in the SVG, and it looks exactly like tiers 1 and 2's rail. It is
not one. The archer stands at y=502 and the beam runs at y=525..534 directly
under him; across his whole 141px span the beam's top edge never rises above
y=510, which is below his feet at every x he occupies. It is the deck's near edge
board — the same thing an earlier pass wrongly gave tier 1 a polygon for. The
rails got lower with each redraw and on tier 3 they have gone under the floor.

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

Tier 3 clears by the same hair, and it is worth writing the sum down because it
is the one that decides. The roof's near fascia runs from (343.5, 362.0) to
(580.1, 400.1), so at the archer's x=509 its lowest pixel is y=389. His head top
is `0.910 x 25 / SCALE = 111` source px above the mount at y=502, which is y=391.
Two pixels, in his favour. Anything that lowers that roof or raises that deck
needs a rect over the helmet.

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

| tier | deck corners (x, y)                                | mount          |
|------|----------------------------------------------------|----------------|
| 1    | (356, 460) (466, 382) (651.5, 418) (554, 505)      | (506.5, 438.6) |
| 2    | (391, 526) (501, 449) (687, 485) (589, 572)        | (541.2, 505.2) |
| 3    | (467.3, 445.1) (659.9, 474.7) (555.9, 564.9) (350.6, 517.6) | (509.5, 502.0) |

**Use the leg tops, never the rails.** Tier 1's four legs have not moved across
two redraws while its rails have changed height in both of them, which is exactly
why the deck is defined by the legs: a rail is furniture and a leg is structure.

**Tier 3 is the one case where the corners are not leg tops, and the centre rule
changes with them.** Its deck is the top face of a stone keep — one `<path>` in
the SVG, the four points above — and the four roof posts stand on its corners
rather than holding it up. So the face is read directly, and the check is that
the posts land on it: the left post's foot is (350.6, 517.6) and the right's is
(660.5, 474.9), both within a pixel of the corners.

That face is NOT a parallelogram. Its two diagonals cross 10.9px apart at their
midpoints, so "where the diagonals cross" is not well defined on it and gives
(505.1, 496.2), 7px from the answer. The mount is the polygon's **area centroid**
instead, (509.5, 502.0), which is the same point on tiers 1 and 2 and the right
one here. If tier 4 is another drawn face rather than four legs, use the centroid
again.

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

1. `node tools/trim.mjs` — paste the new `spriteTrim`. For an ANIMATED building
   take the union of its frames' rects; see the catapult section above.
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
6. `node tools/siege.mjs` if you touched artillery — it checks the beat loop is
   three one-second beats in that order, that the rock leaves only on the beat
   the arm is drawn coming over, and that the splash is an ellipse.
7. `node tools/hud-clear.mjs` if the tower got taller — it says which plots push
   a building into the HUD text or off the top of the board, and by how much. A
   taller tower moves that ceiling down for every plot at once.
8. `node tools/roof.mjs` if you touched a BARRACKS — paste the new `roofFrac`.
   The muster rings sit on the roof, so where the roof is drawn is a number the
   game reads.
9. `node tools/book.mjs` if you added or removed a TIER — the encyclopedia flows
   its ladders into four columns of six, and fourteen tiers sit in them.

## The muster rings sit on the roof, so the roof is a measurement

A barracks draws a small countdown ring for each of its men who is dead and
walking back. They stack in the air directly over the building: the COLUMN is the
tower's own x — the centre of the shadow it stands on, because that is what
`groundFrac` anchors a building by — and the ROW is `roofFrac`, the topmost ink in
the band the stack covers.

`roofFrac` is measured rather than taken from the top of the sprite's box, and the
tent is why: it flies its pennant from a pole standing to one side, so the box top
is 20 game px above the tent's own ridge and rings hung there float in empty sky.
The keep is the other end of the spread at 0.002 — a battlement has nothing
sticking up beside it. `node tools/roof.mjs` finds the row by ALPHA, which is the
one thing in a drawing that cannot be recoloured, and checks the fraction each def
is holding still lands on it.

That is the fourth place these rings have been, and the first that is the same
place on every tier. They were centred ON the building (read as artwork), then
floating off its top-LEFT corner (read as status, but map 3's plot 0 clipped them
on the canvas edge), then hung under the PENNANT — measured off the cloth's flat
blue, which put them beside the tent's pole, on the huts' ridge, and down on the
front wall of the Paladin Keep, whose heraldry is a banner in that same blue rather
than a pennant. Three tiers agreeing was luck; the fourth did not. `flagFrac` and
`tools/flag.mjs` went with that change and are in the history if a flag anchor is
ever wanted again.

Re-run `node tools/hud-clear.mjs` with it: the stack is ink ABOVE the roof, so it
counts against the plots nearest the HUD, and the tool measures it through
`ringLift` in render.js.

## The monastery is archery again, structurally

A timber deck on legs with a man standing on it, a roof from tier 2, stone from
tier 3. Every anchor is measured the same way an archery tower's is and the
renderer needed nothing new: `mountFrac` is the middle of the deck, `groundFrac`
is the centre of the shadow ellipse, `frontTrims` is the near corner post, and
the priest is a Default and an Attack registered on one shadow.

Three things about it are worth knowing before the next redraw.

**The deck is not a parallelogram on any tier.** Tiers 1 and 2 archery find their
mount where the diagonals of the four leg-tops cross; that is not defined on a
face whose diagonals miss each other, and on the shrine they miss by 10.4px. All
three monastery mounts are the AREA CENTROID of the deck polygon, which is the
same point on a true parallelogram and the right one here. Tier 3 archery already
had to do this.

**The priest's shadow is cut in two by his own staff.** He plants it through the
middle of the ellipse, so `tools/shadow.mjs` finds two brown blobs rather than
one, and either half on its own puts the anchor 7.5px out. The tool now puts a
split shadow back together — but only when the two pieces are SIDE BY SIDE across
a seam of at most 4px and lie in the same height band. That narrowness is
load-bearing: a thug's robe is the same brown as his shadow and sits directly
above it, and a looser rule swallowed the whole figure and moved two anchors.

**The near post barely reaches him.** He is 80 source px wide against an archer's
162, so the post at the deck's near corner only crosses him when he is mirrored
to face right. The rect is there anyway, tight to the post, because a building
part in front of a man is in front of him at every facing.

## The roof has to be drawn over the priest

He is the tallest figure in the game — 154 source px, and it is the staff rather
than the man — so on both roofed tiers the top of that staff rises past the near
eave and stands in front of a roof it is physically under. It reads as the staff
growing through the tiles.

A rect cannot fix it: the roof is a slanted plane, so any box around it takes the
sky beside it and the deck below it, and painting the deck over the priest erases
his legs. So it is a POLYGON in `frontPolys`, the same mechanism the archery
rails use — clip the canvas to the shape and redraw the sprite through it, which
paints exactly what the artist put there, transparency included.

It is traced from THREE shapes in the SVG rather than one, because the roof is
drawn as a plane and two edge boards. Tiers 2 and 3 share the constant, because
they share the roof to the pixel. **If a redraw moves the roof, re-trace all
three shapes and take their union again** — the plane alone leaves the fascia
sticking out under the staff.

## The three shooting families are one design with three columns

|           | rate    | projectile | damage  | range   | other |
|-----------|---------|------------|---------|---------|-------|
| Archery   | HIGHEST | HIGHEST    | decent  | decent  | — |
| Monastery | decent  | decent     | HIGHEST | LOWEST  | — |
| Artillery | LOWEST  | LOWEST     | decent  | HIGHEST | blast radius |

**"Decent" means BETWEEN THE OTHER TWO.** With exactly three families that is a
claim rather than a vibe, and `node tools/families.mjs` checks all nine of them,
per tier, and fails if one stops holding.

Run it after touching any of the nine numbers. Nothing else in the project can
catch this: `tools/sim.mjs` measures whether a build wins, and a game whose three
towers have quietly become the same tower at different prices goes on being
winnable for a long time afterwards. The monastery's damage has been 5, 30, 55,
190 and 20 inside two days — every one of those moves was judged against a win
rate, and the table is the thing that says whether the family still exists.

The monastery does about **ten per cent more damage per second than archery** —
11.0, 18.3, 34.5 against 10.0, 16.7, 31.3 — and that margin is deliberate. The
two were exactly level for one commit, which was pleasing and wrong: a monastery
costs 10 to 20 more per tier and reaches 30px less, so it cannot also do the same
work. Two towers where one is strictly worse is not a choice.

Everything else between them is shape. One lands its output in many small pieces
with more reach, the other in half as many, twice as big, from closer in. A big
lump is worth more against a giant with 1000 health and worth less against a
militiaman with 80, who wastes the rest.

**The monastery used to be a slow**, and the artwork is unchanged by two swaps
since: same buildings, same churchmen, same missile, same voice. What changed is
what arriving means. The pale blue ring that used to mark a slowed enemy is gone
with the mechanic — there is nothing left for it to say.
