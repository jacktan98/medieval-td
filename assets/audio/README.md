# Audio

```
assets/audio/sfx/     Arrow_shot, Attack_1..3, Arrow_hit_enemy,
                      Thug_dies, Soldier_dies
assets/audio/voice/   Archers_1..3, Barracks_1..3, Thug_1
```

Fourteen clips, all wired. `node tools/audio.mjs` measures them; `node
tools/sound.mjs` checks the rules below against the real `src/audio.js`.

## Two categories, and the categories are the design

**Category A is one channel, in the foreground.** These are the things worth
announcing: a voice answering, a man dying, a kill landing. While one is
sounding every other Category A request is dropped — not queued, dropped — and
when it ends nothing else may start for a second.

Dropped rather than queued is the half that matters. A queue would play the
death cry of a man who died four seconds ago, and sound that lies about what is
on the screen is worse than no sound.

**Category B is the battle, underneath.** Arrows leaving bows and blades
landing. Every one of them is a thing you can watch happen, so every one makes
its noise — no gate, no sharing rules, ten towers firing is ten twangs.

It is mixed like background and behaves like it. Category B runs through a bus
of its own that sits about 7dB under Category A, and **drops another 9dB the
moment a Category A clip starts**, coming back up when it finishes. So a death
cry cuts through a battle instead of competing with it, and nothing has to be
silenced to make room — which is the whole reason the swings live down here and
not in the fight for the one channel.

The duck moves the bus, not each sound as it starts, so arrows already in the
air get out of the way too. Ducking only new sources would leave whatever was
already ringing at full volume, which is exactly the noise being ducked.

## Category A also has to share itself out

The gate on its own is first-come-first-served, and that is not a fair contest —
whatever asks most often wins most often, regardless of whether it is worth
hearing. The build where the swing was still in Category A measured **12 swings
out of 16 clips in 90 seconds**, which is not a soundtrack, it is a metronome.
The swing has since moved to Category B, but the rules it forced are what keep
the channel varied now that kills and cries are competing for it.

So a clip earns the channel against what has just been heard, not only against
what else is asking. Two rules, over a memory of the last five plays:

- **never the same clip twice running**
- **never more than twice in the last five**

A clip that fails either is passed over and the gate is left **open**, so the
next thing along takes the slot it gave up. That is the difference between
priority and throttling: nothing is delayed, something else is heard instead.

Measured over 90 seconds of real play, with two archery towers and a barracks:
**7 Category A clips, no clip twice running, and none appearing more than twice
in any five.** Underneath, 131 background plays — 49 arrows and 82 sword swings
split 29/27/26 across the three takes.

Two details worth knowing before changing any of it:

**A cue with several takes will break the share rule rather than fall silent.**
Five remembered plays of three takes can reach `A B A B C` — two at their limit
and the third just heard — and an absolute rule would mute the barracks until
the memory moved on. So a cue with alternatives relaxes it. A **single**-take
cue gets no such relief, and that asymmetry is the point: with nothing to rotate
to, its share rule is the only thing between one clip and the whole channel.

Most cues are single-take now, which makes this the common case rather than the
corner. **A second melee kill straight after the first is silent** — there is
one `Thug_dies` and it may not run twice running. If that reads as a dropped
sound rather than as restraint, a second take of the same event is the fix, and
it needs no code beyond a line in `paths` and the cue.

**The memory is wiped by silence, not by age.** The last five plays are the last
five plays however long they took; if nothing at all has been heard for 20
seconds, the slate clears. An earlier version expired each entry on its own
clock and the share rule quietly stopped working — single-take cues get passed
over often, so plays come further apart (about 4.5s in a measured fight), and
five of them no longer fitted in the window. The rule was still running; it just
never had five plays to look at. `MEMORY_S` in `src/audio.js` is the constant,
and it now means "how long a lull has to be before the game forgets".

## What plays when

| moment | clip |
|---|---|
| an archery tower is selected, built or upgraded | `Archers_1/2/3` |
| a barracks is selected, built or upgraded | `Barracks_1/2/3` |
| a rally point is moved | `Barracks_1/2/3` |
| a barracks man is selected | `Barracks_1/2/3` |
| an enemy is selected | `Thug_1` |
| an arrow kills an enemy | `Arrow_hit_enemy` |
| a barracks man kills an enemy | `Thug_dies` |
| a barracks man dies | `Soldier_dies` |
| **an archer looses** — Category B | `Arrow_shot` |
| **a barracks man swings** — Category B | `Attack_1/2/3` |

Everything above the line is Category A and shares the one channel; the two
below run on the background bus and play every time.

Where a row lists more than one file, one is picked at random each time, so the
same order twice running is not the same voice twice running. Category B gets a
cut-down version of the same courtesy — no share rules, but never the same take
twice running, because a sword making one identical noise forty times a wave is
the machine-gun problem all over again.

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
| `Archers_3` | 2.53s | 3.53s |
| `Barracks_3` | 2.17s | 3.17s |
| `Thug_dies` | 1.34s | 2.34s |
| `Soldier_dies` | 0.70s | 1.70s |

Tapping a thug is the longest silence in the game — no other Category A clip can
be heard for four and a half seconds. The battle plays on underneath throughout,
so it is not silence exactly, but nothing else gets announced. Trimming `Thug_1`
is the cheapest fix if it reads wrong in play; nothing in the code has to
change.

## Format, for the next upload

`.mp3`. Mono where you can — all seven effects are stereo, which is twice the
bytes to store the same sound twice, and nothing here is positioned in the
stereo field. Keep effects short and trim the silence off the front: leading
quiet is dead time between the arrow leaving the bow and the twang, and no code
can take it back out.

Every filename is now a plain URL — no `%20` anywhere, unlike `assets/ui`. Keep
it that way and the paths in `src/audio.js` stay readable.

`node tools/audio.mjs` reports length, size, bitrate and channels for every
file, and flags anything long, heavy or stereo. It parses the MP3 frames itself
— there is no ffmpeg here and no npm to install one, the same constraint that
makes `tools/trim.mjs` decode PNGs by hand.

**`Attack_1` is the odd one of the three swings**: 1.70s and 70kB against 0.51s
and 0.53s for `Attack_2` and `Attack_3` — it is the old `Stab.mp3` under a new
name, byte for byte. Nothing breaks, since Category B lets clips overlap freely,
but one swing in three ringing three times as long as its neighbours is
audible as a pattern. Re-cutting it to match is the fix.

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
