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
| **Mommy** | a shotgun; shoots at short range, and the blast catches two more | on the road |
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
| Mommy Lv1 | 150 | 250 | 10 (up to x3) | 1.00s | 190 | 10.0 |
| Mommy Lv2 | +140 | 360 | 15 (up to x3) | 0.95s | 205 | 15.8 |
| Mommy Lv3 | +200 | 500 | 21 (up to x3) | 0.90s | 220 | 23.3 |
| Ella Lv1 | 110 | — | 11 + slow | 0.85s | 210 | 12.9 |
| Ella Lv2 | +110 | — | 18 + slow | 0.75s | 225 | 24.0 |
| Ella Lv3 | +160 | — | 27 + slow | 0.68s | 240 | 39.7 |
| Rei Lv1 | 120 | — | 9, to everything in reach | — | 150 | 9.0 |
| Rei Lv2 | +110 | — | 15, to everything in reach | — | 168 | 15.0 |
| Rei Lv3 | +170 | — | 24, to everything in reach | — | 186 | 24.0 |

Ella's slime leaves a thug at 55% speed for 2 seconds.

**Mommy shoots.** She stands on the road and stops what walks into her like Papa
does, but she does not wait for it: anything within **130** of her is fired at,
and the blast puts a bullet into up to **2** more thugs within **70** of whatever
she aimed at. Every one of them gets its own pellet drawn, which is the whole
picture of a shotgun — one trigger pull, several things hit. The reach is short
on purpose: she is a woman on the road who fires, not a second tower.

**Rei's damage came down by a third** at the owner's request — 13/22/35 to
9/15/24. Damage a second against *everything* in reach is worth its face value
times however many thugs are in there, and a wave of twenty walking through a
level 3 smell was the best gold in the game by a distance.

Papa is dearest and hits hardest; Mommy is the cheaper blocker who is worth more
the busier the road is.

The purse starts at **300** and a cleared wave pays **95 + 26 per wave** on top of
the bounties. That was 85 + 22 and went up with Rei's nerf: it is the lever that
lifts every build equally, so it puts a one-of-each build back where it was
without arguing with the change it is compensating for. Calling a wave early pays **7 gold a second** of the wait given up —
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
else. Fifteen files, 512 x 512, transparent:

| file | what it is |
|---|---|
| `Papa_Default.png` / `Papa_Attack.png` | Papa standing, Papa swinging |
| `Mommy_Default.png` / `Mommy_Attack.png` | Mommy standing, Mommy firing |
| `Ella_Default.png` / `Ella_Attack.png` | Ella holding a slime, Ella having thrown it |
| `Rei_Default.png` / `Rei_Attack.png` | Rei sitting, Rei stinking |
| `*_Plot.png` (four) | the nameplate on each plot |
| `Ella_Slime.png` | the slime in the air |
| `Mommy_Bullet.png` | a shotgun pellet, turned to face wherever it is flying |
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

## The sound

`birthday/src/audio.js` is the big game's design in short form, and it is a
separate file for one dull reason: every path in `../../src/audio.js` is relative
to the page, and this page is one folder down. The two rules are the same ones.

**Category A — one at a time, then a moment of quiet.** The four of them speaking:
a line when they are built, upgraded or tapped, and a line over a thug they just
finished. Papa, Mommy and Ella have **four takes each and two kill lines each**;
**Rei has one line and no kill line at all** — he is a baby, and he never means to
hurt anybody. A cue with alternatives rotates between them under two rules —
never the same clip twice running, never more than twice in the last five — so
building three Papas in a row is three different lines. A single-take cue needs
no special case; it simply comes up less often.

**Category B — every time, however many at once.** The fighting: Papa's swords,
Mommy's shotgun, Ella's throw, Rei's smell, and a thug landing a blow. It runs on
a bus of its own that sits under Category A and ducks further while a line is in
the air, so a voice cuts through the fight instead of competing with it.

Rei is the odd one out: he has no cooldown to hang a noise on, so his sound
repeats on a clock while there is somebody in the smell with him. It **plays its
whole length and then rests** — the clip's own length, asked of the audio rather
than typed here, plus **10 seconds of silence** before he may start again. It is
never interrupted to be restarted, because nothing asks again until it has
finished.

Both halves were needed. The interval was a flat 1.6 seconds until the recording
was measured at 7.7 seconds of audible baby, which meant five copies overlapping
continuously; asking the sound how long it lasts fixed that and stays right the
day a shorter one is recorded. The rest is what stops him being a drone — a
continuous smell playing back to back for a whole wave is the one sound in the
game with no event behind it, and it wears out fastest. 1.6s survives as a floor
for the clip's part, for a take that has not loaded or a future one that is very
short.

**Every clip is levelled by measurement, not by a table.** Each one is analysed
once at load and given the gain that brings it to a common loudness, and anything
moved more than 3dB is named in the console. These are home recordings made on
different days and they arrive about 22dB apart — Papa's takes needed +4.6 to
+9.6dB and Rei's line −12.1dB — and a hand-written table of trims would be
silently wrong the first time one was re-recorded. Nothing in the set reaches
either clamp, and nothing clips once its gain is applied.

**Two clips are moved on top of that, both −6dB**, and both because the leveller
matches the loudest third of a second — the right rule for a bark or a blade and
the wrong one for a sound that is neither. The tap is not in the fight at all,
and Rei's smell is 7.7 continuous seconds where every other Category B clip is an
event over in one: matched by its loudest moment it is correct and still far too
much of the mix.

**The tap.** `Select_Sound.mp3` — the big game's own file, byte for byte — plays
whenever a control does something: a map, a family card, Start, the dashboard
buttons, the pause row, a ring button, picking somebody on the board. It is
Category B, because a reply to the player's finger that is sometimes dropped is
worse than no reply at all.

It is played from **one place**, `attach()` in `input.js`, and only when the tap
acted: every branch of `tap()` returns whether it did anything and the click is
the answer to that. A `play(SELECT)` in each of the fifteen branches is how a
control quietly ends up silent when a sixteenth is added. A tap that does nothing
stays silent — an unaffordable button absorbs its tap, a paused board refuses
everything but its three controls, and bare grass with nothing open has nothing
to say.

It is also the **one exception to the automatic levelling**, at −6dB, and that
came across with the file: the levelling exists so that clips of the *fight*
arrive at a common loudness, and the tap is not in the fight. It answers a finger,
it lands on a quiet board as often as a busy one, and it only has to be heard
rather than noticed.

**There is no music.** Three songs played under all of this for two days and were
then deleted from the repository; the machinery that played them went with them
rather than being left pointing at nothing. If they ever come back it was about
twenty lines — see the note at the top of `src/audio.js`.

Nothing can be heard until the first tap on the page — phones refuse audio that
starts on its own — and `unlock()` runs on *every* tap, because a phone locking or
a call arriving suspends the context again.

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

**Tap anybody to look at them.** A plot with somebody on it, Papa or Mommy
standing on the road, or a thug — each puts a **picture and the numbers in the top
right**: name, level, live health, damage and reach, with the big game's heart and
sword standing in for the words. The health is read off the live object every
frame, so the bar over their head and the number in the panel are the same fact
twice. Building or upgrading selects what you just paid for, so the numbers you
were choosing between are still on screen once you have chosen.

An empty plot shows nothing there on purpose: four build buttons are open at once
and a panel can only describe one of them, which is what The Family button is for.

Sending Papa or Mommy somewhere uses the big game's own **rally flag** — as the
button that gives the order and as the marker showing where it landed, so the
button and the thing it does look like each other. The marker is only up while
that person is selected or being sent.

## What it does not have

No standing orders, no encyclopedia, no stars, no difficulty, no admin, no
corpses and no blood. It is a birthday present that will
probably be played a few times and then left alone, and it is built accordingly.
