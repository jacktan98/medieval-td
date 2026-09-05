# Boss artwork

## Captain Thug — the first boss, in thirteen drawings

Twelve of them are alive and one is a body. Nothing else in this game has more
than five.

**Two of the thirteen are one moment in two layers.** `Pause_Self` and
`Pause_Weapons` are `Pause` taken apart, so the second half of the channelling can
animate: the body holds still while the weapons fade off the ground under it. They
decompose the combined drawing exactly — the weapons share its x extent and its
horizontal anchor to the pixel — which is what lets both be drawn at the figure's
own ground point and land where they do in the single picture.

| file | when it shows | plate |
|------|---------------|-------|
| `Captain_Thug_Default.png` | walking, unshot and unbothered. Also the encyclopedia and the description panel, for stage 1 | med / med |
| `Captain_Thug_Defend.png` | a projectile has hit him and no soldier is near. 5s, refreshed by every hit, half pace | high / high |
| `Captain_Thug_Ranged_Reload.png` | a soldier is inside 150px: shield away, nocking. The long half of a 0.5s shot cycle | med / med |
| `Captain_Thug_Ranged_Attack.png` | the arrow is away. The other sixth of a second of it | med / med |
| `Captain_Thug_Melee_Attack.png` | a soldier has hold of him | med / med |
| `Captain_Thug_Pause.png` | below a quarter health, once: shield and bow thrown away, channelling. The first 2s of a 4s beat | med / med |
| `Captain_Thug_Pause_Self.png` | the last 2s of it — the body, standing unchanged | med / med |
| `Captain_Thug_Pause_Weapons.png` | drawn over it and faded out across those 2s: the weapons on the ground | — |
| `Captain_Thug_Heal.png` | mending, worth three fifths of his maximum. 4s | high / high |
| `Captain_Thug_Enraged_Default.png` | stage 2, walking at 1.2x. Also the description panel from here on | low / low |
| `Captain_Thug_Enraged_Attack.png` | stage 2, swinging at 1.2x — magic now, and the same blow to everyone within 60px | low / low |
| `Captain_Thug_Before_Dying.png` | out of health, sword dropped. 3s, and nothing may touch him | — |
| `Captain_Thug_Dead.png` | on the ground. 2s, and only then may the game end. Becomes his corpse | — |

**All twelve living poses share one ground point — source (263, 333) — to the pixel.**
He swaps between more drawings than anything else in the game, so this is the
figure where a pivot out by two would be most obvious, and the artist got it
exactly right. Six of them show the shadow ellipse edge to edge and five of those
six measure to that point on the nose; the rest hide its tips behind a leg or a bow, which is why every `pivot` in `captain_thug` is derived from the one
measurement rather than read off its own drawing. Re-measure the same way after a
re-export: take the pose that shows the most ellipse, and give the others its
answer.

**His body is in this folder, not `assets/dead/`.** It is the second half of a
two-beat ending — he drops his sword, then he drops — and filing a pair of
drawings that play one after the other into two folders would be filing them by a
rule that has nothing to do with how they are used.

The rules below are what the next boss should be drawn to.

---

## For the next one

## Why a boss gets its own folder

`assets/enemies/` holds the army — creatures that arrive in groups, are named by
their type, and are drawn to a size that reads against a soldier. A boss is none
of those things: it arrives once, it is drawn to be looked at, and it will almost
certainly carry more poses than anything in this game so far. The Dark Priest has
five and that is already the record.

Keeping them apart also keeps a promise the encyclopedia depends on. Every figure
on a page shares one scale, and that scale is the SMALLER of what the layout wants
and what the tallest drawing allows — `BOOK_FIGURE_SCALE` in `src/book.js`. Past a
certain height the tallest figure starts setting it, and every other figure on the
page shrinks to accommodate.

**There is room, measured rather than remembered: the ceiling is 247 source px of
drawn height, and the Giant sits at 180.** So a boss can be drawn up to about 1.37
times the Giant and cost the book nothing; at 248 the whole page starts giving way.
That headroom is recent — it came from spending the encyclopedia's unused sixth
row on bigger cards — so re-measure before trusting this number rather than
assuming it, the way this paragraph originally didn't.

The way to check is to set the height and read which branch binds:

```
node -e "…set spriteTrim[3]…; import BOOK_FIGURE_SCALE; compare to PORTRAIT_SCALE * 0.9"
```

If the two are equal the layout is binding and the art is free. If
`BOOK_FIGURE_SCALE` is lower, the art is binding and every figure in the book has
just been shrunk by a boss.

## Naming

`Bosses_<Name>_<Pose>.png`, matching the `Enemies_` convention next door:

| file | what it is |
|------|------------|
| `Bosses_<Name>_Default.png` | what it walks in, and what the encyclopedia and the description panel show |
| `Bosses_<Name>_Attack.png` | the blow |
| `Bosses_<Name>_<Ability>.png` | one per ability that has a pose of its own — see below |

Its **death pose goes in `assets/dead/`**, named `Bosses_<Name>_Dead.png`, with
that folder's rules. A body is a different drawing, not a different state of this
one.

## Poses, and which kind each one is

There are only two kinds, and the difference decides what the code does with it.

A **pose** is something the boss does TO you. It shows for a moment and gives way
— the Attack drawing is this, held about a quarter of a second per blow.

A **stance** is what the boss looks like WHILE something is true. It replaces the
standing half of the pair and leaves the swing alone: the Blocker's shield while
he is being shot at, the Priest's cast while he is holding a spell. Every ability
that takes time is a stance.

Tell me which each one is when you upload. `enemyStance` in `src/render.js`
resolves them in a fixed order, and a drawing filed as the wrong kind is a boss
that either flickers or gets stuck.

## The two rules that cannot be fixed later

**One shadow across every living pose, to the pixel.** The boss will swap between
more drawings than anything else on the board, so a ground point out by two makes
it hop every time it changes. Draw the ellipse in the same place in all of them.
`node tools/shadow.mjs` measures it — dark brown `54,36,7` on a figure — and
fails a pair that drifts more than 6 source px.

**Keep the resting pose no taller than the figure.** `artHeight` in `src/render.js`
and `src/select.js` reads the Default's trim to float the health bar and size the
tap box. A weapon raised above the head is charged for twice: it lifts the health
bar off the head and it shrinks every figure in the encyclopedia. The Giant was
redrawn once for exactly this. Reach as wide as you like in the Attack pose —
that one has no ceiling.

## Export

**512 x 512**, same square canvas as everything else, because a single `SCALE` in
`src/data/towers.js` converts every asset in the game to game pixels. Draw the
boss at its true size relative to a soldier on that shared canvas; never scale one
to "look right" on its own.

Standing upright, facing left or right. Figures mirror to face the way they walk
and are never rotated.

For scale: a spearman draws 34 x 24 game px, a thug 20 x 24, the Giant 37 x 37.
A boss that reads as a boss probably wants to be the biggest thing on the board,
and the encyclopedia gives you until roughly 1.37 x the Giant before it costs
anything. Tell me the size you are aiming for and I will say what it costs on the
board as well — the collision radius is meant to match the body you can see, and
it does not follow the art on its own.

## After uploading

Nothing is cropped. `spriteTrim` is an `[x, y, w, h]` window into your source
image, so the export is never modified — run `node tools/trim.mjs` to print the
rect straight from the alpha channel rather than typing it, and `node
tools/shadow.mjs` for the pivot. `pivot` is `[across, down]` as a fraction of the
trim and the convention is **the centre of the ground shadow**, not the feet and
not the middle of the box.

## What I need with the art

A boss is not just a bigger thug, so the wiring needs more than the art does:

- **health, damage, damage type, armour on both axes, speed, bounty** — the same
  block every entry in `enemyTypes` carries
- **each ability**: what it does, how long it takes, how often, and what it picks
  as a target
- **where it appears** — which map, which wave, and whether it arrives alone or
  with an escort

Everything the game does to figures already exists to build on: the damage
triangle in `src/data/armour.js`, refreshing statuses in `src/data/status.js`,
the guard/heal stance chain, ranged ammunition with its own sound cue. An ability
that fits one of those is wiring; one that does not is new machinery, and worth
knowing which before you draw it.

Expect a boss to move other numbers. Adding the Plague Doctor did.
