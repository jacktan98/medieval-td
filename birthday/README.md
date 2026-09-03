# The birthday game

A small, separate tower defence for one family, hidden inside medieval-td. Four
towers, three maps, a house to keep the thugs out of — and a certificate at the
end of it.

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

**And a third code, inside this game.** The three dots in the bottom-right of the
map screen open a keypad; **0605** opens a small panel of four things:

| | |
|---|---|
| Unlock all characters | all four buildable on every map |
| Unlock all maps | all three playable from the start |
| Allow the certificate | printable without finishing |
| Reset all progress | the stars and the three switches, wiped |

The first three are **toggles** — anything opened here can be closed again, so
showing somebody the last map does not have to end the story. The fourth asks a
second time before it does anything, because it is the only tap in the game that
destroys something that was earned.

The code is `UNLOCK_PIN` and the switches are `SWITCHES` in `src/progress.js`.
It exists for one stated reason: if Ella cannot finish the game, the certificate
should still be printable.

## What is borrowed and what is not

Two things come from the big game, both read-only, both because they were asked
for:

- **The three maps' roads and plots**, exactly as the big game has them.
  `birthday/src/data.js` imports the level files; nothing is copied, so a redrawn
  map arrives here too.
- **The three thugs** — the same stats and the same artwork.

The **wave tables are no longer borrowed**. They cannot be: the story changes what
the player owns on each map, and a table written for four towers of four tiers on
nine plots is the wrong shape for two people whatever it is scaled by. Each map
gets its own, written against the roster it is played with. The level files are
never written back to — each map is a shallow copy with its own waves and purse.

Plus `../src/route.js`, which is pure geometry: how long a road is and where you
are along it. The maps are the big game's roads, so they are measured with the
big game's ruler.

**Everything else is this folder's.** The four characters, the fight, the
screens, the drawing. None of the rules match medieval-td's, and they are not
meant to.

## The story

It is told in **four short pieces** — a chapter before each map and an ending
after the last one is held — and they are all in `src/story.js`, which imports
nothing and is imported by two lines.

| | |
|---|---|
| **Chapter One — The Bend** | the thugs are everywhere, Papa and Rei are missing, and Mommy and Ella are what is left |
| **Chapter Two — The Fork** | Papa fights his way home. He did not find Rei, and there is no time to look |
| **Chapter Three — Two Rivers** | Rei is on his pee pad, furious and unspeakable. The last horde is coming |
| **The house is ours** | it held, and none of the four could have held it alone |

**When a chapter appears**: entering a map **from the picker**, before the family
panel. Play again on the result screen skips it, and so does Restart — choosing a
map is choosing to start it, and going again after losing on wave 8 is not.
Nothing is remembered, so reading the whole thing again is a trip back to the map
screen. The ending comes up when the last map is won, **before** the stars rather
than instead of them.

The game is also not three maps in a row. It starts with **one map and two
people**, and the rest is earned:

| | |
|---|---|
| at the start | **The Bend**, with **Mommy** and **Ella** |
| 2 stars on The Bend | unlocks **Papa** and **The Fork** |
| 2 stars on The Fork | unlocks **Rei** and **Two Rivers** |
| 2 stars on all three | the **certificate** |

**Stars** come from the lives left of twenty: below 10 is one, below 18 is two, 18
and over is three. Every door asks for **two**, not three — three means finishing
with at least 18 of 20, which is close to perfect, and a five-year-old should not
be locked out of half the game by two thugs getting through.

A locked map is a greyed picture with a padlock and the sentence that opens it. A
locked character shows no portrait and no name — the owner asked for Papa and Rei
to be a surprise, and a silhouette with a name under it gives most of that away —
but the card still says exactly what to do. The build ring only ever offers who
you have: two buttons opposite each other on the first map, three on the second,
four on the third.

All of it is in `src/progress.js`, kept in one `localStorage` key, and every read
and write is wrapped — storage throws rather than returning null in real
situations (private browsing on old iOS, a full quota), and a birthday game that
will not start because it cannot remember anything is worse than one that forgets.

## The four of them

| | what they are | where they work |
|---|---|---|
| **Papa** | two swords, blocks one thug and cuts it down | on the road |
| **Mommy** | a shotgun; shoots at short range, and the blast catches two more | on the road |
| **Ella** | throws slime; little damage, but it halves their speed | from her plot |
| **Rei** | stinks; everything inside the smell loses health, all at once | from his plot |

Three levels each, the same person with better numbers. Any of them can be built
on any number of plots.

### The numbers, and where they came from

They started as a reasoned guess and were then **tuned with the sim below**, which
is the only reason they are any good. They are all on one screen in `src/data.js`
— change one, reload, see.

The thugs are the big game's, with **three numbers overridden at the top of
`src/data.js`** and nothing written back: a Thug is 80 health at 70px/s hitting
for 10 a second, a Giant Thug **1500** at 52 hitting for 30, and **those two are
the whole roster** — `ROSTER` in `src/data.js` NAMES them rather than listing
what to leave out, so a creature drawn for the big game cannot arrive here by
being added there. It used to be a blocklist and that is exactly how the Tough
Thug and the Blocker Thug turned up uninvited. Every bounty is **two thirds** of the big
game's, so a thug pays 10 and a giant 27. The reference points are the towers
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
| Rei Lv1 | 90 | — | 8, to everything in reach | — | 150 | 8.0 |
| Rei Lv2 | +85 | — | 13, to everything in reach | — | 168 | 13.0 |
| Rei Lv3 | +130 | — | 20, to everything in reach | — | 186 | 20.0 |

Ella's slime leaves a thug at 55% speed for 2 seconds.

**Mommy shoots.** She stands on the road and stops what walks into her like Papa
does, but she does not wait for it: anything within **130** of her is fired at,
and the blast puts a bullet into up to **2** more thugs within **70** of whatever
she aimed at. Every one of them gets its own pellet drawn, which is the whole
picture of a shotgun — one trigger pull, several things hit. The reach is short
on purpose: she is a woman on the road who fires, not a second tower.

**Rei's damage came down by a third** at the owner's request — 13/22/35 to
9/15/24 — and then by another sixth, to **8/13/20**. Damage a second against *everything* in reach is worth its face value
times however many thugs are in there, and a wave of twenty walking through a
level 3 smell was the best gold in the game by a distance. His **cost** came down
25% with it, which is the other half of the same decision: the nerf was about how
strong he is, and the cost is about whether he is worth a plot. The second cut was
aimed at the last map rather than at him: Two Rivers now sends forty at a time,
and each of those forty multiplies whatever this number is. After all of it, a
board of Ella and Rei is one of the best builds on Two Rivers rather than one of
the worst.

Papa is dearest and hits hardest; Mommy is the cheaper blocker who is worth more
the busier the road is.

Calling a wave early pays **7 gold a second** of the wait given up — up to 84 for
the long look before the first wave and up to 70 for a rest. It is a trade rather
than free money: the gold arrives now and so do the thugs.

The sim below never presses that button, so every number it reports is for
somebody who takes the full rest. A player who rushes has more gold and less time
to spend it.

### They were tuned with the sim, not by eye

`node birthday/tools/sim.mjs` plays each map **with the roster the story actually
gives you there** — two people on The Bend, three on The Fork, four on Two Rivers
— fifteen runs of each plan, and prints what happened. Testing a build made of
Papa on map 1 would be testing a game nobody can play.

Fifteen runs rather than five, because the tuning target became **lives** rather
than won-or-lost. A star is a threshold on lives and lives are far noisier than
the verdict: the same table measured 8 lives on one run and 3 on the next, which
reads as a difficulty change that never happened. The whole file still finishes in
under ten seconds.

**It asserts one thing per map**, and it is the thing the story depends on: the
roster you are given has to be enough to two-star the map it is given on, because
passing it is the only way to get the next one. A map that cannot be passed with
what you own is not hard, it is a dead end — and the certificate is unreachable
behind it. Where it stands: **3 / 2 / 2 stars**, every run a win.

Everything else is reported for a person to read. medieval-td holds a real
invariant — no single family may clear any map — and it costs twenty seeds and an
afternoon every time a number moves. Trying to hold that line here failed for an
honest reason: a plan sitting near half flips its verdict between runs, so the
check reported balance changes that had not happened.

**What to change first.** The map's own purse and starting gold, above. Then a
character's **cost**, which shifts who is worth building without making the game
harder or easier. Damage last.

### The money is per map

| | opens with | a cleared wave pays | waves | plots |
|---|---|---|---|---|
| The Bend | 300 | 95 + 26 per wave | 5 | 9 |
| The Fork | 420 | 105 + 30 per wave | 8 | 9 |
| Two Rivers | **680** | **155 + 46 per wave** | 10 | 11 |

Per map rather than one number for the game, and finding that out was the most
useful thing the sim did. **Two Rivers kept failing however much its waves were
thinned — and thinning them made it worse**, which is the shape of a money problem
rather than a difficulty one: a thug is 10 gold, so cutting thirty of them out of
the back half quietly removes 300 gold from a map that has eleven plots to fill.

Counting where the lives actually went settled it. On Two Rivers, waves 1, 2 and 3
leaked 3.1, 4.3 and 5.3 lives, and **waves 4 to 10 leaked nothing at all**. It was
never an endgame problem — it has two roads, and 300 gold covers one of them while
the first three waves walk down the other. Nearly twice as much to open with fixed
it outright.

The purses went **up again** when the bounty was cut by a third, and The Fork's
and Two Rivers' a **third time** when their finales became walls. Both are the
same decision, and it looks like softening until you count where the lives went:
an opening too expensive to cover leaks two or three of them before the player has
finished their first build, and nothing about that is a decision anybody made.
Two Rivers leaked 2.3 and 3.1 on waves 1 and 2 with 560 to open on; at 680 it
leaks 1.9 and 1.3, and the lives it does lose are lost on **waves 9 and 10**,
where the horde is.

These are the numbers to turn **before** touching anybody's damage: they lift or
drop every build on one map equally, so they do not change who is worth having
there.

### The waves

| | shape |
|---|---|
| **The Bend**, 5 waves | thugs only, 5 up to **50**, **no giants at all** |
| **The Fork**, 8 waves | giants from wave 4, finishing on **44 thugs and 5 giants** |
| **Two Rivers**, 10 waves | hordes, finishing on **50 + 5 giants** and then **60 at 0.4s + 6 giants** |

**Normal, not easy**, which is where the second pass took it: every wave is bigger
or closer together than the first cut, and The Bend's last wave went from 22 thugs
to 50.

**The finales are walls**, asked for by name. The Fork's last wave costs a fully
built board about **3.5 lives** — the largest single thing on that map — and Two
Rivers' last two cost 1.1 and 2.1 between them. That is what "difficult" has to
mean on maps that must still be passable with the people the story has handed
over by then.

**The difficulty is in the back half on purpose.** The first attempt at "harder"
put it in the front half instead and measured worse in every way — with bigger
opening waves The Fork leaked 3.0, 2.4, 1.3 and 2.1 lives in waves 1 to 4 and
nothing at all in waves 5 to 8. That is not a hard map, it is a map decided before
the player has had a turn. So the openings are gentle, the purses cover them, and
the last three waves of each table are where a map is won or lost.

**No giants on The Bend**, deliberately. A Giant Thug is 1500 health here, and against
two people who do about 25 damage a second between them at level 1 it simply walks
through. The answer to a giant in this game is Papa standing in front of it, and
Papa is not unlocked yet; putting one on the tutorial map would teach the player
that the game is unfair rather than that giants are hard.

**Hordes on Two Rivers**, and that is the point of the last map. Rei damages
everything in his reach at once, so his value is exactly the number of thugs
standing in it — a wave of thirty is worth thirty times a wave of one to him and
nothing at all to anybody else. Its counts climb far faster than the big game's
while its giants climb slower.

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

**All four turn.** Every drawing faces left and is mirrored when the person is
looking at something on their right — that is the `faces` field, and all four
carry it now. Ella and Rei used to have none, on the reasoning that they face the
camera from their plots; the owner disagreed, and he is right about Ella at least,
who holds her slime out to one side.

Which way somebody is looking is **remembered between frames** and only changed
when what they are looking at is clearly to one side of them (`face` in
`src/rules.js`, a 10px deadband). Without that, a thug walking down a
north-south stretch of road passes through their column and they spin as it goes
by. Ella turns to whatever she last threw at; Rei, who never aims at anything,
turns to the **middle of whoever is in the smell with him** — one thug on his
right turns him right, a crowd on both sides leaves him alone.

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

A finished game shows its **stars**, and — the first time a map is passed — who
and what that just unlocked, with their portrait. It offers **Play again** on the
same map and **Another map**. Neither Restart nor Play again makes you sit through
the chapter and the family introduction a second time; choosing a map from the
picker shows both.

**The map screen** says who it is for and who it is from — *Happy Birthday,
Mommy!* over *Gift from Papa* in Papa's own blue — with the three maps under
that and *Pick a place to defend!* under **them**, where it reads as a caption on
the row rather than as a subtitle of the birthday message.

**Papa helps.** A Papa with nobody in his hands swings at whatever is within arm's
length even if somebody else has stopped it — 36px against the 22 of his own
reach, because a thug he has stopped stands on top of him and a thug his wife has
stopped is a body's width further away. Two Papas at one post used to mean one
fighting and one watching; measured against a Giant Thug they now do **25 damage a
second between them against 11 for one**.

**Which way they face** is remembered rather than recomputed each frame, and all
four do it now — see the art section. The art is drawn facing left and mirrored to
face right, and that part was always right —
measured over a real fight the mirrored figure agreed with the enemy's side on 349
samples out of 349. What was wrong is that a blocked thug stands almost exactly on
top of whoever stopped it: the median horizontal gap is 5px, and more than half of
all samples were inside 5px, so the facing flipped several times a second and read
as somebody spinning on the spot. It now only changes when the target is clearly
to one side — 2 changes in 30 seconds of fighting, against dozens before.

**Tap anybody to look at them.** A plot with somebody on it, Papa or Mommy
standing on the road, or a thug — each puts a **picture and the numbers in the top
right**: name, level, live health, damage and reach, with the big game's heart and
sword standing in for the words. It is drawn on **the same cream sheet The Family
pop-up uses**, in the same ink: it used to be a near-black panel on a green map,
and the small print at the bottom of it — the line that says what somebody
actually does — was the least readable thing in the game. The health is read off the live object every
frame, so the bar over their head and the number in the panel are the same fact
twice. Building or upgrading selects what you just paid for, so the numbers you
were choosing between are still on screen once you have chosen.

An empty plot shows nothing there on purpose: four build buttons are open at once
and a panel can only describe one of them, which is what The Family button is for.

Sending Papa or Mommy somewhere uses the big game's own **rally flag** — as the
button that gives the order and as the marker showing where it landed, so the
button and the thing it does look like each other. The marker is only up while
that person is selected or being sent.

The two are drawn from **different anchors**, which is the fix for a flag that
looked crooked on its button. Planted on the board it hangs from the foot of its
pole, at 0.111 of the drawing's width, because the pole is the thing marking the
spot; on a round button it is centred, because the button is the thing being
filled. Same picture, one number apart.

**The empty plot markers** are the big game's picture at the big game's size —
99 x 49 rather than the 68 x 40 they were. They used to be drawn as the whole SVG
squeezed into a box, which loses twice: the file has transparent margin around the
mark, so the mark came out smaller than the box, and the box was small to begin
with.

## The certificate

Two stars on all three maps (or the grown-up's code) puts **Print your
certificate** on the map screen. It is an A4 page with the family's name on it,
the three maps and their stars, the four of them along the bottom and a seal —
and it downloads as a real PDF.

**The preview is the file.** The page is drawn once onto an offscreen canvas at
print resolution and the screen shows that canvas scaled down; there is no second
drawing routine, so what is on screen is a promise about what comes out of the
printer.

**The PDF is assembled by hand** in `src/certificate.js`, because this project has
no build step and no libraries and is not getting either for one page of A4. That
sounds worse than it is: a PDF holding a single full-page image is five objects
and a cross-reference table, and the canvas's own JPEG bytes go in unmodified —
`DCTDecode` is a filter every reader has had since 1993. A4 is rendered at 150dpi
(1240 x 1754) and the page box is set in points, so it prints at true size. The
file lands around 130KB.

The cost is that the text is a picture rather than selectable type. For a birthday
certificate that is the right trade: it prints identically everywhere, it cannot
go wrong on a machine without the font, and nobody is going to copy-paste out of
it.

The **name field** is the one piece of HTML in the whole game — a real `<input>`
positioned over the box the renderer draws. A canvas cannot take typing, and the
browser's own field brings a phone's keyboard, a caret, selection and paste for
nothing.

It carries the occasion in gold under the body text — *A Birthday Special, made
just for this occasion — 22 August 2026*. That line is a constant rather than a
date calculation: it is the day the game was made for, and it stays the same on a
certificate printed years later. The date at the foot of the page is whenever it
was printed, which is a different fact and so a different line.

The stars on the certificate are the ones actually **earned**. Allowing the
certificate from the grown-up's panel does not award any, so a page printed that
way shows empty rows — which is the honest thing for it to say, and the screen
says the same: it reads *Your certificate* rather than *You did it* unless all
three maps were really passed.

## What it does not have

No standing orders, no encyclopedia, no difficulty setting, no corpses and no
blood. It is a birthday present that will
probably be played a few times and then left alone, and it is built accordingly.
