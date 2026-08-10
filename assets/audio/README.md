# Audio

```
assets/audio/sfx/     Arrow_shot, Arrow_hit_enemy, Stab, Thug_dies,
                      Soldier dies, Soldier_attack
assets/audio/voice/   Archers_1..3, Barracks_1..3, Thug_1
```

Thirteen clips, all wired. `node tools/audio.mjs` measures them; `node
tools/sound.mjs` checks the rules below against the real `src/audio.js`.

## Two categories, and the categories are the design

**Category A is one channel.** While any Category A clip is sounding, every
other Category A request is dropped — not queued, dropped — and when it ends
nothing else may start for a second. Six soldiers swinging, two dying and a
thug jeering all land inside the same half second; without the channel you hear
all nine at once.

Dropped rather than queued is the half that matters. A queue would play the
death cry of a man who died four seconds ago, and sound that lies about what is
on the screen is worse than no sound.

**Category B plays every time.** One clip is in it — `Arrow_shot` — because ten
towers firing is ten things the player can see happen, and the shot you are
watching has to be the shot you hear.

## What plays when

| moment | clip |
|---|---|
| an archery tower is selected, built or upgraded | `Archers_1/2/3` |
| a barracks is selected, built or upgraded | `Barracks_1/2/3` |
| a rally point is moved | `Barracks_1/2/3` |
| a barracks man is selected | `Barracks_1/2/3` |
| an enemy is selected | `Thug_1` |
| an arrow kills an enemy | `Arrow_hit_enemy` |
| a barracks man kills an enemy | `Thug_dies` or `Stab` |
| a barracks man dies | `Soldier dies` or `Stab` |
| a barracks man swings | `Soldier_attack` |
| **an archer looses** — Category B | `Arrow_shot` |

Everything above the line is Category A and shares the one channel.

Where a row lists more than one file, one is picked at random each time, so the
same order twice running is not the same voice twice running. Two rows mix a cry
with a blade: a barracks kill is either the thug's death **or** the sound of the
sword going in, never both, because one channel cannot layer.

**Building a tower counts as selecting it** — the build already fills the info
box with what you just bought, and the voice follows the selection. Say so if
you would rather a new tower stayed quiet; it is one line.

**A giant thug answers with the common thug's line**, there being one enemy
voice so far. Silence for the giant would read as a bug rather than as a gap.

## What the one-second rule actually costs

The gate holds for the clip's own length **plus** the second, so a long clip is
a long silence. Measured:

| clip | length | holds the channel |
|---|---|---|
| `Thug_1` | 3.40s | **4.40s** |
| `Stab` | 1.70s | 2.70s |
| `Archers_3` | 2.53s | 3.53s |
| `Soldier_attack` | 0.66s | 1.66s |

Tapping a thug is the longest silence in the game — nothing else can be heard
for four and a half seconds. Trimming `Thug_1` is the cheapest fix if that reads
wrong in play; nothing in the code has to change.

The other consequence showed up in a 90-second recorded run: **16 Category A
clips, 12 of them `Soldier_attack`.** Swings are the most frequent thing in the
category by a distance, so during a fight they hold the channel most of the
time, and a tap on a tower or a man can come back silent. That is the rule
working as specified, not a fault — but if a silent tap feels broken, the fix is
to let the things the PLAYER does (selecting, rallying) interrupt the channel
while the things the GAME does keep queuing behind each other. Also a small
change, and it is a judgement call rather than a bug.

## Format, for the next upload

`.mp3`. Mono where you can — six of the current thirteen are stereo, which is
twice the bytes to store the same sound twice, and nothing here is positioned in
the stereo field. Keep effects short and trim the silence off the front: leading
quiet is dead time between the arrow leaving the bow and the twang, and no code
can take it back out.

`node tools/audio.mjs` reports length, size, bitrate and channels for every
file, and flags anything long, heavy or stereo. It parses the MP3 frames itself
— there is no ffmpeg here and no npm to install one, the same constraint that
makes `tools/trim.mjs` decode PNGs by hand.

**One file has a space in its name**, `Soldier dies.mp3`, and the code encodes
it as `%20` rather than renaming it — exactly what `assets/ui` does. A rename
here plus a re-upload there leaves two files and no way to tell which one is
playing. Underscores in the next batch save the encoding, but a space costs
nothing now.

## Adding a clip

1. Upload it.
2. Add a line to `paths` in `src/audio.js`.
3. Put its key in a `CUE` list, or make a new one.
4. Call `solo(CUE.whatever)` for Category A, `play(key)` for Category B.
5. `node tools/audio.mjs && node tools/sound.mjs`.

A clip that has not finished loading, or that failed to load, simply does not
play — and a Category A cue with nothing loaded does **not** close the channel
on everything else. That case is tested, because the failure it prevents is a
game that goes quiet for good and never says why.

## Sound is not allowed to hold up the game

`main.js` starts the audio load alongside the art but never waits for it. Half a
megabyte of mp3 must not be the reason a player is looking at a blank screen,
and every call site treats a missing clip as silence.

**Phones refuse to play any sound until the screen has been touched.** The Start
button is that touch, so the player never sees the seam — and `unlock()` runs on
*every* tap, not just the first, because a phone locking, a call arriving or the
tab going to the background all suspend the audio again. Without the repeat, the
game would come back mute and stay that way.

## `src/audio.js` must stay importable in Node

`tools/sim.mjs` runs the real combat modules headless, and they call into the
audio module. So nothing at its top level may touch a browser API: the context
is built lazily inside `loadAudio()` and every entry point returns quietly when
there is none. In Node there never is one, and the balance sim runs in silence
without knowing why. Break this and `sim.mjs`, `sweep.mjs` and `squad.mjs` all
stop working at once.
