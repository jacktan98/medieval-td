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
| **Ella** | throws slime; little damage, but it halves their speed | from her plot |
| **Rei** | stinks; everything inside the smell loses health, all at once | from his plot |

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
| Ella Lv1 | 110 | — | 11 + slow | 0.85s | 210 | 12.9 |
| Ella Lv2 | +110 | — | 18 + slow | 0.75s | 225 | 24.0 |
| Ella Lv3 | +160 | — | 27 + slow | 0.68s | 240 | 39.7 |
| Rei Lv1 | 120 | — | 13, to everything in reach | — | 150 | 13.0 |
| Rei Lv2 | +110 | — | 22, to everything in reach | — | 168 | 22.0 |
| Rei Lv3 | +170 | — | 35, to everything in reach | — | 186 | 35.0 |

Ella's slime leaves a thug at 55% speed for 2 seconds. Mommy's blast reaches
80px from her target and catches up to 2 more. Papa is dearest and hits hardest;
Mommy is the cheaper blocker who is worth more the busier the road is.

The purse starts at **300** and a cleared wave pays **85 + 22 per wave** on top of
the bounties. Calling a wave early pays **7 gold a second** of the wait given up —
up to 84 for the long look before the first wave and up to 70 for a rest. It is a
trade rather than free money: the gold arrives now and so do the thugs.

The sim below never presses that button, so every number it reports is for
somebody who takes the full rest. A player who rushes has more gold and less time
to spend it.

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

## The art

All of it is in `birthday/assets/family/`, drawn for this game and used nowhere
else. Fourteen files, 512 x 512, transparent:

| file | what it is |
|---|---|
| `Papa_Default.png` / `Papa_Attack.png` | Papa standing, Papa swinging |
| `Mommy_Default.png` / `Mommy_Attack.png` | Mommy standing, Mommy firing |
| `Ella_Default.png` / `Ella_Attack.png` | Ella holding a slime, Ella having thrown it |
| `Rei_Default.png` / `Rei_Attack.png` | Rei sitting, Rei stinking |
| `*_Plot.png` (four) | the nameplate on each plot |
| `Ella_Slime.png` | the slime in the air |
| `Rei_Smell.png` | the stink where it lands on the road |

**Everything is measured, not guessed.** `node birthday/tools/art.mjs` prints
each file's trim box and its **pivot** — the centre of the flat brown ellipse the
artist paints under a figure, which is where they stand. Anchoring to the bottom
of the box instead would make Papa bob every time he swung, because his box is
26px shorter with his swords out. The numbers in `src/data.js` are pasted from
that tool; re-export a drawing, re-run it, re-paste.

Everything is drawn at **105/512** of source, the big game's own scale — the thugs
on this board *are* the big game's thugs, so anything standing next to one has to
be measured with the same ruler. The tool also reports whether each file has the
source pixels to stay crisp at the 3x device cap. They all do.

Two of the four never turn: Papa and Mommy are drawn facing left and are mirrored
when they walk the other way, Ella and Rei face the camera from their plots. That
is the `faces` field, and its absence.

The **nameplate** is what makes both halves of the game read the same way. Ella
and Rei stand on theirs; Papa and Mommy walk off theirs and it stays behind saying
whose plot it is. Drawing them on the plot as well put two of each of them on the
board, which was the first thing wrong with the first build.

Rei's smell goes **on the road**, not around him — the ring already shows his
reach, and what the stink marks say is the thing the ring does not: that a plot
beside a bend is worth more than one beside a straight. Four of them at most,
80px apart, placed once when he is built (see `smellSpots` in `src/rules.js`).

If a file ever goes missing the game still plays: every drawing falls back to a
coloured disc with an initial on it.

Sound is not wired at all yet. When the voices and effects exist, the smallest
thing that works is a `<audio>`-free copy of the big game's approach; ask for it
then rather than building it now.

## The controls

Along the top, right of the gold and lives — which are the big game's own coin
and heart icons, read straight out of `../../src/data/ui.js` so a redraw arrives
here too:

- **The Family** — reopens the four descriptions at any time, for anyone who
  pressed Start too fast. It stops the clock while it is up, because reading is
  not playing.
- **Pause** — stops the fight and puts **Resume / Restart / Quit** under the
  dashboard. No veil over the board: the reason to pause this game is to look at
  what is happening. Restart replays this map from the beginning; Quit goes back
  to the three maps.
- **Wave now** — calls the next wave early and says what it pays. Dead while a
  wave is walking.

A finished game offers **Play again** on the same map and **Another map**. Neither
Restart nor Play again makes you sit through the family introduction a second
time; choosing a map from the picker still shows it.

Tapping a plot that somebody is already on puts their **numbers in the top right**
— name, level, health, damage and reach, with the big game's heart and sword
standing in for the words. An empty plot shows nothing there on purpose: four
build buttons are open at once and a panel can only describe one of them, which
is what The Family button is for.

## What it does not have

No sound, no standing orders, no encyclopedia, no stars, no difficulty, no admin,
no corpses and no blood. It is a birthday present that will
probably be played a few times and then left alone, and it is built accordingly.
