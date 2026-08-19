# The birthday game

A small, separate tower defence for one family, hidden inside medieval-td. Four
towers, three maps, and a house to keep the thugs out of.

**It is its own game.** Its own page, its own loop, its own rules, its own
drawing. Nothing in `../src` imports anything from this folder, so nothing in
here can break the big game — and the whole of the big game's involvement is
three lines on the admin keypad.

## How to get in

Open medieval-td, press the small button in the bottom-right of the title
screen, and type **2208** on the keypad instead of the dashboard's own code. The
browser's Back button is the way out.

`1349` still opens the dashboard. The two codes are `PIN` and `PARTY_PIN` at the
top of `../src/admin.js`.

## What is borrowed and what is not

Two things come from the big game, both read-only, both because they were asked
for:

- **The three maps** — the roads, the plots and the wave tables, exactly as the
  big game has them. `birthday/src/data.js` imports the level files; nothing is
  copied, so a redrawn map arrives here too.
- **The three thugs** — the same stats and the same artwork.

Plus `../src/route.js`, which is pure geometry: how long a road is and where you
are along it. The maps are the big game's roads, so they are measured with the
big game's ruler.

**Everything else is this folder's.** The four characters, the fight, the
screens, the drawing. None of the rules match medieval-td's, and they are not
meant to.

## The four of them

| | what they are | where they work |
|---|---|---|
| **Papa** | two swords, blocks one thug and cuts it down | on the road |
| **Mommy** | a shotgun; blocks, and the blast catches two more behind | on the road |
| **Olivia** | throws slime; little damage, but it halves their speed | from her plot |
| **Rei Rei** | stinks; everything inside the smell loses health, all at once | from his plot |

Three levels each, the same person with better numbers. Any of them can be built
on any number of plots — the wave tables are the big game's, and they were
written for a board that gets stronger over eight waves.

### The numbers, and where they came from

They started as a reasoned guess and were then **tuned with the sim below**, which
is the only reason they are any good. They are all on one screen in `src/data.js`
— change one, reload, see.

The thugs are the big game's and are not being retuned: a Thug is 80 health at
70px/s hitting for 10 a second, a Giant Thug 1000 at 52 hitting for 30, a Plague
Thug 150 at 60 that throws from a distance. The reference points are the towers
those thugs were balanced against — a Watchtower is 70 gold for 10 damage a
second, a Crossbow Tower 140 for 31.3, a Militia Camp 70 for three men of 100
health doing 9.5 between them.

So the shape is: about a Watchtower's output per 100 gold at level 1, roughly
tripling by level 3, and the two road characters carrying most of their value in
**health** rather than damage — because a blocker's job is to stop things, and
stopping ignores how hard the thing hits.

| | cost | health | damage | every | reach | per second |
|---|---|---|---|---|---|---|
| Papa Lv1 | 180 | 320 | 12 | 0.55s | 190 | 21.8 |
| Papa Lv2 | +170 | 460 | 18 | 0.50s | 205 | 36.0 |
| Papa Lv3 | +230 | 650 | 26 | 0.45s | 220 | 57.8 |
| Mommy Lv1 | 150 | 250 | 11 (up to x3) | 0.95s | 190 | 11.6 |
| Mommy Lv2 | +140 | 360 | 16 (up to x3) | 0.90s | 205 | 17.8 |
| Mommy Lv3 | +200 | 500 | 23 (up to x3) | 0.85s | 220 | 27.1 |
| Olivia Lv1 | 110 | — | 11 + slow | 0.85s | 210 | 12.9 |
| Olivia Lv2 | +110 | — | 18 + slow | 0.75s | 225 | 24.0 |
| Olivia Lv3 | +160 | — | 27 + slow | 0.68s | 240 | 39.7 |
| Rei Rei Lv1 | 120 | — | 13, to everything in reach | — | 150 | 13.0 |
| Rei Rei Lv2 | +110 | — | 22, to everything in reach | — | 168 | 22.0 |
| Rei Rei Lv3 | +170 | — | 35, to everything in reach | — | 186 | 35.0 |

Olivia's slime leaves a thug at 55% speed for 2 seconds. Mommy's blast reaches
80px from her target and catches up to 2 more. Papa is dearest and hits hardest;
Mommy is the cheaper blocker who is worth more the busier the road is.

The purse starts at **300** and a cleared wave pays **85 + 22 per wave** on top of
the bounties.

### They were tuned with the sim, not by eye

`node birthday/tools/sim.mjs` plays all three maps with eight different
compositions, five runs each, and prints what happened. It exists because the
first guess was badly wrong in a way nobody would notice by playing once: Papa
won every map on his own and the mixed build lost every map, which would have
made three of the family decoration.

Where it stands now:

- one of each **wins The Bend and The Fork comfortably** and loses Two Rivers,
  which is the hardest map in the big game too
- each of the four wins one or two maps alone — nobody carries it
- every pairing holds at least one map, so nobody is dead weight

**What to change first.** The wave bonus in `src/rules.js` is the lever that moves
the whole game without changing who is worth building — turn that before touching
anybody's damage. If one character starts winning everything after the family have
played it, change their **cost**: that shifts who is worth building without making
the game harder or easier.

The tool asserts only one thing — that one of each wins most maps — and prints the
rest for a person to read. The big game holds a real invariant with twenty seeds
and an exhaustive sweep; this is a birthday present, and a check that flips
between runs is worse than a number on a page.

## The art that is still to come

Nothing in `birthday/assets/` exists yet. Every family member draws as a
**coloured disc with their initial on it**, which is deliberately plain — a
placeholder that looked finished is a placeholder nobody replaces.

Drop a file in with the name below and it appears, with no other change:

| file | what it is |
|---|---|
| `assets/family/Papa_Default.png` | Papa standing |
| `assets/family/Papa_Attack.png` | Papa swinging |
| `assets/family/Mommy_Default.png` | Mommy standing |
| `assets/family/Mommy_Attack.png` | Mommy firing |
| `assets/family/Olivia_Default.png` | Olivia on her tower |
| `assets/family/Rei_Default.png` | Rei Rei on his tower |
| `assets/family/Olivia_Slime.png` | the slime in the air |
| `assets/family/House.png` | the house being defended |

Export them 512 x 512 with a transparent background, the figure standing on the
bottom of the frame — that is where the code puts their feet. When one lands,
take its key out of `COMING` in `src/assets.js` so a typo in the next filename is
reported instead of swallowed.

Sound is not wired at all yet. When the voices and effects exist, the smallest
thing that works is a `<audio>`-free copy of the big game's approach; ask for it
then rather than building it now.

## What it does not have

No sound, no upgrade previews, no standing orders, no encyclopedia, no stars, no
difficulty, no admin, no corpses and no blood. It is a birthday present that will
probably be played a few times and then left alone, and it is built accordingly.
