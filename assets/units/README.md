# Figures

Every man in the game lives here — whichever family he belongs to. The archer on
his deck, the spearman on the road and the crewman behind his catapult are all
figures, so they are all in this one folder; `assets/towers` holds buildings and
nothing else.

## Two drawings per fighting man

| man                | Default                            | Attack                            |
|--------------------|------------------------------------|-----------------------------------|
| Novice Archer      | `Soldier_Novice_Archer_Default`    | `Soldier_Novice_Archer_Attack`    |
| Combat Archer      | `Soldiers_Combat_Archer_Default`   | `Soldiers_Combat_Archer_Attack`   |
| Elite Archer       | `Soldiers_Elite_Archer_Default`    | `Soldiers_Elite_Archer_Attack`    |
| Spearman           | `Soldiers_Spearman_Default`        | `Soldiers_Spearman_Attack`        |
| Pikeman            | `Soldiers_Pikeman_Default`         | `Soldiers_Pikeman_Attack`         |
| Swordsman          | `Soldiers_Swordsman_Default`       | `Soldiers_Swordsman_Attack`       |
| Priest             | `Soldiers_Priest_Default`          | `Soldiers_Priest_Attack`          |
| Bishop             | `Soldiers_Bishop_Default`          | `Soldiers_Bishop_Attack`          |
| Cardinal           | `Soldiers_Cardinal_Default`        | `Soldiers_Cardinal_Attack`        |
| Musketeer          | `Musketeer_Default`                | `Musketeer_Attack`                |
| Paladin            | `Paladin_Default`                  | `Paladin_Attack`                  |

An artillery crewman is the exception to the two-pose rule: he is drawn into all
three of his machine's frames already, so his file is a PORTRAIT with no Attack
beside it — `Artillery_Man_T1/2/3` and, for the Ballista Turret, `Ballista_Engineer`.
The info box and the encyclopedia are the only things that ever draw them.

### And a third drawing where an ability needs one

Three men carry an extra pose that only appears if the player has bought the
ability it belongs to. They are figures like any other — same 512 canvas, same
shadow, measured by the same tools — and they are listed apart only because
nothing shows them until 150 gold has been spent.

| pose                    | file                     | shown while                          |
|-------------------------|--------------------------|--------------------------------------|
| Musketeer, Deadeye      | `Musketeer_Deadeye`      | the heavy ball leaves, and 1s after  |
| Paladin, Holy Light     | `Paladin_Holy_Light`     | he kneels and heals, 2s              |
| Paladin, Holy Slash     | `Paladin_Holy_Slash`     | the tenth blow lands, and 1s after   |

**Burst Fire has none, deliberately.** The artist asked for it to use the pictures
the Musketeer Post already has, so it holds his ordinary Attack pose and fires his
ordinary ball.

All three register on their own man's shadow to **0.0 source px** — `node
tools/shadow.mjs` checks each of them — which matters more here than on an ordinary
Attack pose: these are held for a whole second or two at a time, so an anchor half
a pixel out would read as the man shuffling every time the ability fired.

`Paladin_Holy_Slash` comes back in the Attack pose's box **exactly**,
`[135, 212, 178, 116]`, because it is the same swing re-lit rather than a second
drawing. That is a measured finding, not a copy: both are measured per file and
came back equal. `Paladin_Holy_Light` is the widest spread of any of his poses —
133 x 193 against his resting 123 x 140 — because the glow rises well above his
head.

**Default is the man at rest**, and it is the drawing used almost everywhere: he
walks in it, stands in his slot in it, and it is the picture the encyclopedia and
the in-game description box show. An archer's Default has an arrow **nocked**.

**Attack is the blow itself** — the spear levelled, the sword swung, the bow
**empty** with the string snapped back. It is shown for a quarter of a second
each time he lands a hit, and for the archer that is the instant after the arrow
has gone, which is why his bow has nothing on it: the arrow is on the board now.

**A churchman's Default has his staff upright** beside him and his Attack has it
swung down and out in front, which is the moment the arcane missile leaves it.
His Default is the tallest figure in the game at 154 source px — an archer's is
120 — and it is the staff that does it, not the man.

**The musketeer's Attack is his Default plus SMOKE.** He is the one man in the
game whose two drawings are the same figure in the same place: the musket stays
levelled and a puff appears at the muzzle, which is the moment the ball becomes a
projectile on the board. His two shadows measure to the same source pixel exactly —
not within a pixel, the same one — so the swap cannot move him. He is also the only
figure named without a family prefix, because the artist uploaded him that way and
the file is named for the man the game calls him. The paladin is named the same
way, and both for the same reason: a tier 4 is a named tower with a named man in
it rather than a rung with a number.

**The paladin rests with his sword UPRIGHT** over his shoulder and swings it down
and level, so his box changes shape in both directions between the two poses —
123 x 140 standing, 178 x 116 striking. That is the biggest difference between any
man's two drawings in the game and it is the reason each pose carries its own trim:
a single box covering both would be mostly empty for both. His two shadows are on
the same source pixel, which is what actually holds the swap still.

The three artillery engineers have one drawing each. They are never seen
fighting — the crewman is painted into all three frames of his machine, and the
file here exists only so the info box and the book have a portrait.

**Watch where a figure's own gear crosses his shadow.** All three churchmen plant
the staff through the middle of theirs, which splits the ellipse into two blobs;
`tools/shadow.mjs` puts those back together, but only across a seam of a few
pixels between pieces sitting side by side at the same height. Anything wider
than a shaft — a boot, a hem, a club resting on the ground — has to stay OFF the
shadow, or the anchor for that figure will be measured somewhere it does not
stand. See the note in `assets/towers/README.md`.

## What must line up between the two poses

**The shadow, and only the shadow.** The ellipse a figure stands on is his
anchor, so a Default and an Attack drawn with their shadows on the same source
pixel will swap without the man moving. Everything else may differ freely: the
two boxes are trimmed and anchored separately, so a spear that reaches 39px
further forward costs nothing.

`node tools/shadow.mjs` checks every pair and fails if one drifts more than 6
source px. All six are currently inside 0.7.

The shadow is dark brown, exactly `54,36,7`, and the tool matches the colour
exactly — a recolour is reported as NO SHADOW COLOUR FOUND rather than measured
as something else.

## Sizing

Every figure is exported on a 512 x 512 canvas and drawn at the shared `SCALE`,
so how big a man appears is decided by how big you draw him, not by any number in
the code. The six fighting men and the three engineers currently stand 21.5 to
23.2 game px tall measured from the shadow to the top of the head — that spread
is the artwork agreeing with itself, and it is what "one scale for everything"
means in practice. The Giant Thug at 30px is the only figure meant to break it.

## After uploading

1. `node tools/trim.mjs` — paste each pose's rect in as `spriteTrim` /
   `gunnerTrim` for the Default and `attack.trim` for the Attack.
2. `node tools/shadow.mjs` — paste the fraction it prints as `pivot` /
   `gunnerPivot` and `attack.pivot`.

Both live in `src/data/towers.js`. A soldier's collision radius is derived from
his Default trim, so check the printed radius is still 6 after a redraw: it feeds
the formation and the blocking, and a redraw can move it without anyone deciding
to.

## A new pose for a family that has none

Add `attack: { sprite, trim, pivot }` to that figure's def and nothing else. The
renderer falls through to the Default for any def without one, so the enemies can
keep their single drawing until the artist gets to them.
