# Audio

Upload sound here, not in with the pictures:

```
assets/audio/sfx/     one-shot sound effects — bows, blades, coins, buttons
assets/audio/voice/   character lines — a spearman answering, a thug dying
```

Music, if it ever happens, gets a third folder next to these. Don't put a
looping track in `sfx/`; a loop and a one-shot are played by different code and
the folder is the only thing that says which is which.

Both folders start with a `.gitkeep` in them, which is a placeholder file with
nothing in it — git cannot track an empty folder, and without it there would be
nowhere to upload to. Leave them; they cost nothing.

## Format: `.mp3`, mono, 44.1 kHz, 96 kbps

One format, no fallbacks. MP3 is the only thing every browser on every phone
decodes without argument — OGG is better on paper and Safari only started
handling it recently, which is exactly the phone this game gets played on. WAV
is gapless but ten times the size for no audible gain on a half-second clip.

**Mono, not stereo.** Nothing here is positioned in the stereo field, and stereo
doubles the bytes to store the same sound twice.

## Four rules that matter more than the recording

1. **Trim the silence off the front.** This is the big one. Every millisecond of
   quiet at the start of the file is a millisecond between the arrow leaving the
   bow and the sound of it, and no amount of code can take it back out. Cut to
   the first sample you can hear.
2. **Normalise the peak to about -3 dBFS.** All of them, the same. Balance is
   done in code with one volume number per category — that only works if the
   files arrive at a consistent level. A file recorded quiet and turned up in
   code brings its noise floor up with it.
3. **Keep them short.** Effects under 0.6s, voice lines under 1.5s. A death cry
   that runs two seconds is still playing when the next man dies.
4. **No spaces in filenames.** Use underscores, like `Arrow_Fire_1.mp3`. The
   `assets/ui` folder has spaces in it and every one of those paths has to be
   written `Gold%20Icon.png` in the code. It works, but there is no reason to
   sign up for it twice.

Budget: **50 KB a file, and about 3 MB for the folder in total.** GitHub Pages
serves all of it over phone data before the game starts.

## Anything heard often needs two or three takes

Same rule as the blood splats: `Blood_1.png` and `Blood_2.png` exist so that no
two hits are the same picture. An arrow fires every 0.8 seconds and a machine
gun of one identical click is the fastest way to make a player mute the game.

Number the variants `_1`, `_2`, `_3` and the code picks one at random. Anything
marked **xN** in the tables below wants that treatment; everything else fires
rarely enough that one take is fine.

## Sound effects

Every row here is a moment the game already fires today, so anything you upload
can be wired straight in. The **core** ones are the ones you would miss; start
there and let the rest come later.

| file | plays when | |
|---|---|---|
| `Arrow_Fire_1..2.mp3` | an archer looses | **core** xN |
| `Arrow_Hit_1..2.mp3` | an arrow lands on an enemy | xN |
| `Melee_Hit_1..3.mp3` | any blow that lands, either side | **core** xN |
| `Enemy_Death_1..2.mp3` | an enemy drops | **core** xN |
| `Soldier_Death_1..2.mp3` | one of yours is cut down | xN |
| `Life_Lost.mp3` | an enemy reaches the keep | **core** |
| `Build.mp3` | a tower goes up | **core** |
| `Upgrade.mp3` | a tower is upgraded | |
| `Sell.mp3` | a tower is sold | |
| `Coin.mp3` | bounty from a kill | |
| `Rally_Set.mp3` | a barracks squad is given a new post | |
| `Menu_Open.mp3` | the ring of buttons opens on a plot | |
| `Menu_Cancel.mp3` | the ring is dismissed | |
| `Denied.mp3` | tapping something you cannot afford | **core** |
| `Wave_Start.mp3` | a wave sets off | **core** |
| `Wave_Clear.mp3` | the last one of a wave falls | |
| `Game_Start.mp3` | the start button | |
| `Victory.mp3` | last wave cleared | |
| `Defeat.mp3` | the keep falls | |

`Coin` is listed apart from `Enemy_Death` on purpose, but the two fire on the
same frame — if the death sound already has a chink of gold in it, skip `Coin`
entirely rather than layering them.

## Character voices

Eight speakers, and the names are the ones already in the game — they are what
the info box prints, so they should be what the files are called.

| speaker | who |
|---|---|
| `Spearman` | barracks tier I |
| `Pikeman` | barracks tier II |
| `Swordsman` | barracks tier III |
| `Archer_T1` `Archer_T2` `Archer_T3` | the three archery tiers |
| `Thug` | the common enemy |
| `Giant_Thug` | the heavy |

Four lines each, named `Speaker_Line_N.mp3` — `Spearman_Select_1.mp3`,
`Giant_Thug_Death_2.mp3`:

| line | plays when | for |
|---|---|---|
| `Select` | the player taps the figure, or its tower | everyone |
| `Move` | a squad is sent to a new rally point | barracks only |
| `Attack` | closing on an enemy | everyone, throttled |
| `Death` | cut down | everyone |

`Death` is the cry; `Soldier_Death` / `Enemy_Death` in `sfx/` is the armour and
the thud. They play together, so record the voice dry and let the effect carry
the weight.

Archers have no `Move` — they never leave the tower. Enemies have `Select`
because the player can tap an enemy to read its health, and it is a good place
for a jeer.

**A throttle is coming, and it is why `Attack` needs variants.** Three spearmen
engage the same thug within a few frames of each other; without a rule, all
three shout at once. The code will hold a short cooldown per speaker so only one
of them speaks, but it still wants two or three takes so it is not the same
shout each wave.

## Nothing is loaded yet

`src/assets.js` loads images only, and there is no audio code in the game at
all. That is deliberate — the loader, the volume controls, the mute button and
the throttle all depend on what the files actually sound like.

There is one thing worth knowing now, because it shapes the design: **phones
refuse to play any sound until the player has touched the screen.** Both iOS and
Android silently ignore audio that starts on its own. This game already has the
one thing that fixes it — the start button — so the sound system unlocks there
and the player never sees the seam. It is also the reason the start button is
worth keeping even after the gold-drain problem it was added for.

**Suggested first upload:** three effects — `Arrow_Fire_1`, `Melee_Hit_1`,
`Life_Lost` — and one full speaker, `Spearman`. That is enough to build the
whole system against and hear it in the game, and you will know within a minute
whether the levels and the lengths are right before you record the other sixty
files.
