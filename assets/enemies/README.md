# Enemy artwork

**Two drawings per enemy**, exactly like the soldiers they fight — a Default
they walk in and an Attack for the blow — plus a death pose in `assets/dead/`:

| Default                            | Attack                            | type key     | notes                                  |
|------------------------------------|-----------------------------------|--------------|----------------------------------------|
| `Enemies_Thug_Default.png`         | `Enemies_Thug_Attack.png`         | `light_inf`  | the militia, in all 8 waves            |
| `Enemies_Tough_Thug_Default.png`   | `Enemies_Tough_Thug_Attack.png`   | `tough_inf`  | the same man in low plate, 200 health  |
| `Enemies_Giant_Thug_Default.png`   | `Enemies_Giant_Thug_Attack.png`   | `heavy_inf`  | the heavy, waves 4-8, in growing packs |
| `Enemies_Shadow_Thug_Default.png`  | `Enemies_Shadow_Thug_Attack.png`  | `shadow_inf` | masked, sword up at rest and thrust out swinging; invisible unless a soldier has hold of him |
| `Enemies_Rally_Thug_Default.png`   | `Enemies_Rally_Thug_Attack.png`   | `rally_inf`  | helmeted, sword and a banner on his back; adds half again to the blows of everything physical within 150px |

**The Tough Thug is drawn in the Thug's box** — 96 wide against 96, 119 tall
against 116 — and his shadow sits at source (260.0, 304.5) in both poses. He is
the same creature with harder numbers, so he costs the encyclopedia's figure
scale nothing and stands in a lane exactly as his smaller cousin does.

**The Shadow Thug is the tallest ordinary enemy**, at 159 source px against the
Thug's 116, and all of the difference is the blade held overhead — his body is the
Thug's own 59px round blob, so he stands in a lane the same way. His shadow sits at
source (265.0, 324.0) in both poses.

**He is drawn at half alpha whenever no soldier has hold of him**, which is the
same cloak an assassin wears, so the drawing has to read at 50% over sand and over
grass. Nothing about that is in the file — it is what the game does to it — but it
is what the contrast in the drawing has to survive.

**The Rally Thug is the widest enemy on the road**, at 164 source px against the
Thug's 96, and the banner is all of it — his body is the same round blob. His
shadow sits at source (252.0, 321.5) in both poses. Everything standing inside a
hundred game pixels of him wears `Health_Boost_Status.png`, so his own drawing has
to be findable in a crowd that is all wearing the same mark.

## The Bomb Thug has no Attack, and four drawings that are all endings

He is the one enemy in the game with no Attack pose, and it is not a file anybody
forgot: he has no attack. He walks up to a soldier and explodes, so the blow and
the death are the same event and the Default is what he is showing right up to
the frame he is not there.

| file                                | key          | what it is                                        |
|-------------------------------------|--------------|---------------------------------------------------|
| `Enemies_Bomb_Thug_Default.png`     | `bomb`       | the walk, the portrait and the encyclopedia card  |
| `Enemies_Bomb_Thug_Explode.png`     | `bomb_blast` | the burst, on screen for 0.2s, both ways he goes off |
| `Enemies_Bomb_Thug_Self.png`        | `bomb_dead`  | his body, when a projectile got him first         |
| `Enemies_Bomb_Thug_Bomb.png`        | `bomb_live`  | the bomb lying beside it, fuse still burning      |
| `Enemies_Bomb_Thug_Dead.png`        | *(not loaded)* | the two of them together — the reference the offset is measured off |

**His corpse is in this folder, not in `assets/dead/`.** Every other body in the
game is over there and this one is not, because the rule in that folder's README
is the one that decides: *"assets.js is where a name and a key meet, and it is
changed to suit each upload rather than the files being renamed."* Five drawings
of one creature arrived in one upload into one folder, which is the sane way to
send them; moving four of them would only mean moving them again next time.

**`_Dead` is `_Self` plus `_Bomb`, and the game loads the halves.** The composite
is never drawn — the bomb in it is still live and runs on its own two-second
clock, so it cannot be part of a corpse. What the composite is for is the GAP
between the two: the body's ground shadow is centred at source (195.0, 282.5) and
the bomb's trim box has its bottom middle at (315.0, 295.0), and `DROP` in
`src/bombs.js` is that difference. Redraw the pair and that constant has to be
re-measured, or the bomb will lie somewhere the artist did not put it.

**So the two halves must not move relative to each other** across a re-export. It
is the one thing about this creature that cannot be checked by looking at either
file on its own.

**The bomb has no ground shadow and is not meant to have one.** Every figure in
this game stands on a flat brown ellipse and is anchored by its centre; this one
is an object lying on the road, anchored by the bottom middle of its own box.
`tools/shadow.mjs` is not given a row for it for that reason.

**His body is the Thug's**, at 92 source px wide against 96 and the same 116
tall, so he stands in a lane exactly as the rest of them do — the bomb he carries
is held in front of him and adds nothing to his footprint. His shadow sits at
source (267.0, 303.0).

## The Dark Crow flies, and his shadow is on the ground

He is the first creature drawn in the air. Three of his drawings are the wingbeat,
with the bird well above a brown shadow on the ground — and the shadow is on the
SAME PIXEL in all three, source (257.5, 323.3), which is what keeps the ground under
him still while the wings move. That shadow is where he is: every reach, lane and
tap box measures him from it, exactly as a man is measured from his feet.

| file                              | key            | what it is                                        |
|-----------------------------------|----------------|---------------------------------------------------|
| `Enemies_Dark_Crow_Default.png`   | `crow`         | the portrait, the card, and the first beat of flight |
| `Enemies_Dark_Crow_Flying_1.png`  | `crow_flap1`   | wings level — the second and fourth beats         |
| `Enemies_Dark_Crow_Flying_2.png`  | `crow_flap2`   | wings down — the third beat                       |
| `Enemies_Dark_Crow_Falling.png`   | `crow_falling` | half a second of dropping, once he is shot        |

The body is `Enemies_Dark_Crow_Dead.png` in `assets/dead/`, lying on its own
shadow like every other corpse.

**The wingbeat is Default, Flying 1, Flying 2, Flying 1** and round again, one
frame per 9px flown, so the wings never jump from fully down to fully up.

**The Falling drawing has no shadow, and must not get one.** While he drops, the
game cuts the shadow out of the Default drawing — `flying.shadow` on his def,
`[236, 316, 43, 16]` — and leaves it on the ground where he was, and the bird falls
onto it. If the Default is redrawn with the shadow somewhere else, that rect has to
be re-measured.

**How high the bird is above his shadow** is `lift` on each flight frame, in source
px: 113, 104 and 86, from the middle of the body. Arrows are steered there rather
than at the shadow. The fall ends 10 source px above the shadow, which is where the
Dead drawing has his body — `rest` on the def.

**He has no Attack drawing** because he has no attack.

## Two enemies fight at both distances, and they carry two pairs

An enemy that shoots and also gets caught needs a drawing for each. The suffixes
say which is which, and the code reads them as one rule: the **ranged** pair is
what he walks and works in, the **melee** pair is shown the moment a soldier has
hold of him — `e.foe`, not "he is nearby".

| Ranged Default                            | Ranged Attack                            | Melee Default                            | Melee Attack                            | type key     |
|-------------------------------------------|------------------------------------------|------------------------------------------|-----------------------------------------|--------------|
| `Enemies_Archer_Thug_Ranged_Default.png`  | `Enemies_Archer_Thug_Ranged_Attack.png`  | `Enemies_Archer_Thug_Melee_Default.png`  | `Enemies_Archer_Thug_Melee_Attack.png`  | `archer_inf` |
| `Enemies_Dark_Priest_Default.png`         | `Enemies_Dark_Priest_Ranged_Attack.png`  | *(shares the one Default)*               | `Enemies_Dark_Priest_Melee_Attack.png`  | `dark_priest` |
| `Enemies_Plague_Thug_Default.png`         | `Enemies_Plague_Thug_Ranged_Attack.png`  | *(shares the one Default)*               | `Enemies_Plague_Thug_Melee_Attack.png`  | `plague_inf` |

## One enemy has a third drawing, and it is a STANCE

The Blocker Thug carries a **Defend** pose on top of his Default and Attack. It
is not a third thing he does to anybody — it is what he looks like while he is
being shot at, which is why it replaces the STANDING half of his pair and leaves
his swing alone.

| Default                             | Attack                             | Defend                             | type key      |
|-------------------------------------|------------------------------------|------------------------------------|---------------|
| `Enemies_Blocker_Thug_Default.png`  | `Enemies_Blocker_Thug_Attack.png`  | `Enemies_Blocker_Thug_Defend.png`  | `blocker_inf` |

**A projectile puts the shield up for five seconds**, refreshed by every one
after it, and while it is up he wears high plate on BOTH axes and walks at half
pace. A soldier getting hold of him takes it straight back down — he cannot hold
a shield and swing — and drops him below the plate he walks in. See `guard` and
`fightArmour` on `blocker_inf` in `src/data/waves.js`, `wornBy` in
`src/data/armour.js` for what he takes, and `enemyStance` in `src/render.js` for
what he shows. Those last two read the same three states in the same order on
purpose: a man drawn behind a shield while taking damage as though it were down
is the one bug this enemy could plausibly ship with, and `tools/facing.mjs`
checks the two against each other.

**His shadow moves 2.5 source px between poses** — (265.5, 305.8) walking
against (265.5, 303.3) swinging and guarding — where every other figure in the
game holds its shadow to the pixel. It is kept as measured rather than levelled,
so he settles half a game pixel as the shield comes up. Worth knowing before the
next re-export; not worth papering over.

## And the Dark Priest has FIVE, which is the most anything in this game has

Four of them are the pairs above — the walk, the missile, the club. The fifth is
`Enemies_Dark_Priest_Heal.png`, and it is a **stance** on exactly the terms the
Blocker's shield is: casting is something he does to a friend rather than to you,
so it replaces the STANDING half of his pair and leaves his swing alone.

| Heal stance                        | type key      |
|------------------------------------|---------------|
| `Enemies_Dark_Priest_Heal.png`     | `dark_priest` |

**He holds it for two seconds and stands still for all of them**, then the enemy
he cast on wears `Dark_Healing_Status.png` and gets 10 health a second for 5
seconds — 50 a cast. Being pinned mid-cast loses him the spell rather than
pausing it. See `heal` on `dark_priest` in `src/data/waves.js`, `enemyStance` in
`src/render.js` for which drawing is shown when, and `woundedNear` in
`src/enemies.js` for who he picks: the worst wounded within reach, himself
excepted, and **nobody mended in the last 30 seconds** — so he works a crowd
rather than parking on one creature, and falls through to throwing and walking
when everyone in reach is on cooldown. The clock sits on the MAN (`mendCd`), not
in the healer's head, so a second priest cannot fill the gap.

**All four of his living poses share one shadow**, source (261.0, 322.5) to the
pixel. He swaps between them more than any other figure in the game, so he is
where a pivot out by two would be most obvious.

**The melee Default is optional and the doctor does without one.** He stands the
same way whichever he is about to do, so one drawing serves both stances; the
archer holds a drawn bow one way and a club another, so he has two. A def takes
only the halves it has — see `melee` in `src/data/waves.js` and `enemyStance` in
`src/render.js`.

**Nothing leaves his hand while he is held.** A pinned thrower fights with what
he is carrying — the doctor swings the flask, the archer swings the bow — so no
arrow and no flask appears while the melee pair is on screen. That is why the
close-quarters damage is worth drawing properly: it is the whole of what he does
in that state.

**All four poses must share one ground point.** He swaps between them mid-fight,
so a pivot out by two pixels makes him hop the instant a soldier reaches him.
`node tools/shadow.mjs` checks every one of them against its own grey blob, and
`node tools/facing.mjs` checks that each state resolves to the drawing it should.

One thing to watch when redrawing: the **taller** of the two Defaults decides
where the health bar floats and how big the tap box is, in both stances — a bar
that jumped up his body when he was caught would be a bar that moves for a reason
other than health.

**The tiers are gone from these names.** They were `Enemies_Man_T1a` and `T1b`,
from an upload that numbered them; each is now named after what it is, and the
`art` keys in `src/assets.js` followed. The type keys above did not, because
what these enemies DO did not change and `heavy_inf` is what the rules call it.

Adding a new enemy means adding both the files and the `enemyTypes` entry, so
tell me the intended hp / speed / bounty when you upload one and I will wire it
and re-run `tools/sim.mjs` to see what it does to the balance. Expect that to
move other numbers — adding the plague doctor did.

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

The thug draws 20 x 24 game px, the archer 33 x 25 with the bow drawn, the
plague doctor 27 x 27 and the giant 37 x 37, against a spearman's 34 x 24. That reads correctly: a lighter troop, an oddity,
and a heavier one around your own soldier.

The giant's Default was redrawn shorter after the first animated upload held his
club straight up and made the box 212 source px tall against a body of about
160. It cost two things that are worth knowing about because they will happen
again to the next tall pose: his health bar hung above the club rather than his
head, and every figure in the encyclopedia had to shrink 4% to keep him inside a
card. **A weapon raised above the head is charged for twice.**

The heavy was redrawn 1.16x bigger, and its collision radius went 12 -> 14 with
it rather than being left behind — the hitbox is meant to match the body you can
see. That was checked before the change, not after: the whole sim comes out
identical either way, so it is a picture change and not a balance one. Do not
assume the next size change is free; run `node tools/sim.mjs` and look.

## The two poses

The Attack drawing shows for a quarter of a second each time the enemy lands a
blow, on top of the 6px lunge it already had — the movement and the pose are one
gesture. On the plague doctor the same field is set by a flask leaving his hand,
so he lunges into his throw.

**Only the shadow has to line up between the two.** Everything else may differ
freely, because each pose carries its own trim and its own pivot; the Giant
Thug's box goes from 148 wide to 232 between them and nothing has to be padded
to match. `node tools/shadow.mjs` checks every pair and fails if one drifts more
than 6 source px.

**Keep the resting pose no taller than the figure.** `artHeight` in render.js
and select.js reads the Default's trim to place the health bar and the tap box,
and the encyclopedia sizes every figure on the page so that the tallest still
fits a 60px card. A pose that sticks a weapon up in the air pays for it in both
places — see the giant's `spriteTrim` note in `src/data/waves.js`. The Attack
pose has no such limit: reach as wide as you like.

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
