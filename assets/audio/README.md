# Audio

```
assets/audio/sfx/     Arrow_shot, Attack_1..3, Arrow_hit_enemy,
                      Thug_dies, Soldier_dies
assets/audio/voice/   Archers_1..5, Barracks_1..5, Thug_1
```

Eighteen clips, all wired. `node tools/audio.mjs` measures them; `node
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
and the third just heard — and an absolute rule would mute the cue until the
memory moved on. So a cue with alternatives relaxes it. A **single**-take cue
gets no such relief, and that asymmetry is the point: with nothing to rotate to,
its share rule is the only thing between one clip and the whole channel.

**At five takes that can no longer happen at all.** Jamming needs every take but
the last to be at its limit of two, which is eight plays inside a memory of
five. So the two voice cues are now safe by arithmetic rather than by the
relaxation, and only the three-take cues can still reach it.

The single-take cues are where it bites. **A second melee kill straight after
the first is silent** — there is one `Thug_dies` and it may not run twice
running. If that reads as a dropped sound rather than as restraint, a second
take is the fix, and it needs no code beyond a line in `paths` and the cue.

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
| an archery tower is selected, built or upgraded | `Archers_1..5` |
| a barracks is selected, built or upgraded | `Barracks_1..5` |
| a rally point is moved | `Barracks_1..5` |
| a barracks man is selected | `Barracks_1..5` |
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

### The catapult is missing two clips

**Throwing a rock is SILENT**, and deliberately so rather than by oversight. It
is the one action in the game that makes no noise. The obvious stand-in is
`Arrow_shot`, and it is the wrong one: that sample is a bowstring, everybody can
hear that it is a bowstring, and playing it over a swinging timber arm reads as a
bug where silence reads as a gap. It is one flag — `sound: true` on `rock` in
`src/data/towers.js` — the day a clip exists.

What it wants is **Category B**, like the bow: a catapult fires every three
seconds and several of them fire at once, so a shared channel would silence most
of them. A timber creak and a thump, kept quiet, is the shape of it.

**A rock kill borrows `Arrow_hit_enemy`**, which is the better of two wrongs — a
catapult crushing a man in silence while every arrow in the game speaks is worse.
A `Rock_hit_enemy` in **Category A** alongside it would sort that; it is one line
in `CUE` and one branch in `src/enemies.js`, which already knows which kind of
projectile landed the blow.

## What the one-second rule actually costs

The gate holds for as long as the clip is AUDIBLE, plus the second — not for the
length of the file. Skipping the dead air at both ends bought back real time
here, most of a second on some clips:

| clip | file | audible | holds the channel |
|---|---|---|---|
| `Thug_1` | 3.40s | 2.80s | **3.80s** |
| `Archers_3` | 2.53s | 1.94s | 2.94s |
| `Barracks_3` | 2.17s | 1.69s | 2.69s |
| `Thug_dies` | 1.34s | 1.04s | 2.04s |
| `Archers_1` | 1.44s | 0.77s | 1.77s |
| `Soldier_dies` | 0.70s | 0.48s | 1.48s |
| `Arrow_hit_enemy` | 1.05s | 0.30s | 1.30s |

`Arrow_hit_enemy` is the striking one: a 1.05s file with 0.30s of sound in it,
so it used to hold the channel for two seconds to say something that took a
third of one.

Tapping a thug is still the longest hold in the game at 3.8s. The battle plays
on underneath throughout, so it is not silence exactly — nothing else gets
announced. Trimming `Thug_1` would take it under 2s if that ever reads wrong in
play.

## Levelling is automatic — you do not have to normalise

The clips arrived up to **20dB apart**. The voices had never been normalised and
peaked around 0.12; the death effects peaked near 1.0. So `Archers_1` was 9.6dB
under the middle of the pack and `Thug_dies` 10.1dB over it, and no amount of
bus mixing survives that — "the battle sits 7dB under the voices" means nothing
when the clips themselves differ by twenty.

Every clip is now **analysed once at load** and given the gain that brings it to
a common loudness, measured as the RMS of its loudest 300ms. What that does to
the current eighteen — the four newest voices needed it as much as the first
batch:

| clip | adjustment |
|---|---|
| `Archers_5` | **+13.1 dB** |
| `Archers_1` | +11.1 dB |
| `Archers_2` | +10.5 dB |
| `Attack_2` | +7.0 dB |
| `Barracks_4` | +6.6 dB |
| `Archers_3` | +4.4 dB |
| `Archers_4` | +3.7 dB |
| `Barracks_1` | +3.6 dB |
| `Barracks_2/3/5` | left alone |
| `Attack_1` | −3.3 dB |
| `Soldier_dies` | −7.0 dB |
| `Thug_1` | −7.1 dB |
| `Thug_dies` | −8.6 dB |

Measured rather than typed into a table, and that is the point: this project
re-uploads audio constantly, and a hand-tuned table would be silently wrong the
moment a file was re-recorded. The sound would just be off, with nothing to
point at. The analysis costs a few milliseconds for the whole folder and cannot
go stale.

**So do not normalise before uploading, and do not worry if a take comes in
quiet.** The gain is capped at 5x either way, so a clip recorded at almost
nothing will still come up short rather than dragging its own hiss up with it —
that is the one case worth re-recording.

The ceiling was 4 until `Archers_5` arrived needing 4.55x. That is a quiet
recording, not a broken one — it peaks at 0.089 — and a clamp that bites on a
file with nothing wrong with it is set too tight, so it went to 5. If a future
upload reports exactly `+14.0dB` it has hit the new ceiling and is genuinely too
quiet to rescue.

`GAIN` in `src/audio.js` overrides the analysis per clip, and it is for INTENT
— a giant that should be louder than a common thug — not for correction.

## Dead air at the front is skipped, also automatically

Measured lead-in across the uploads: `Thug_1` 299ms, `Attack_3` 275ms,
`Archers_2` 224ms, `Attack_2` 201ms, most others 50–150ms. A sword landing
275ms after the blow is **sixteen frames late**, and it was the single biggest
reason the audio felt loose against the action.

Playback now starts past the silence — the analysis finds the first audible
sample and begins there. Real time removed, not a delay compensated for
elsewhere.

The same measurement gives the clip's **audible** length, and that is what the
Category A gate and the duck use rather than the file's length. Holding the
channel through a clip's trailing silence is time spent saying nothing.

It is still worth trimming in the editor when it is easy — a smaller file
downloads faster — but nothing depends on it any more.

## Format, for the next upload

`.mp3`. Mono where you can — all seven effects are stereo, which is twice the
bytes to store the same sound twice, and nothing here is positioned in the
stereo field. Keep effects short.

Every filename is now a plain URL — no `%20` anywhere, unlike `assets/ui`. Keep
it that way and the paths in `src/audio.js` stay readable.

`node tools/audio.mjs` reports length, size, bitrate and channels for every
file, and flags anything long, heavy or stereo. It parses the MP3 frames itself
— there is no ffmpeg here and no npm to install one, the same constraint that
makes `tools/trim.mjs` decode PNGs by hand.

The three swings are now within reach of each other — `Attack_1` 1.10s,
`Attack_2` 0.84s, `Attack_3` 0.98s — after the first `Attack_1` came in at
1.70s, twice its siblings, and read as a pattern every third swing.

**Two clips still peak at exactly 1.000**, `Thug_1` and `Attack_1`, which
usually means they were clipped or limited on the way in. The automatic
levelling turns them down, but it cannot undo distortion already baked into the
file. Worth a listen at volume; only a re-record fixes it if it is audible.

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
