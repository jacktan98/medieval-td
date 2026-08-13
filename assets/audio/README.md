# Audio

```
assets/audio/sfx/     Arrow_shot, Attack_1..3, Arrow_kill_enemy,
                      Rock_hit_ground, Rock_kill_enemy,
                      Thug_dies, Soldier_dies
assets/audio/voice/   Archery_1..5, Barracks_1..5, Artillery_1..5, Thug_1
```

Twenty-five clips, all recorded and all wired. `node tools/audio.mjs` measures
them; `node tools/sound.mjs` checks the rules below against the real
`src/audio.js`.

**Wire a cue before the files exist.** The artillery voices were in `paths` and
in `CUE` a commit before they were recorded, and they played the moment they
landed with no code change at all. While a file is missing, list its key in
`AWAITED` in `src/audio.js` — misses there are reported once as a quiet note
instead of one warning per file. **Empty `AWAITED` as recordings arrive**: a key
left in it after its file lands means a genuinely broken upload gets reported as
an expected absence.

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
| an archery tower is **built or upgraded** | `Archery_1..5` |
| a barracks is **built or upgraded** | `Barracks_1..5` |
| an artillery tower is **built or upgraded** | `Artillery_1..5` |
| a rally point is moved | `Barracks_1..5` |
| a barracks man is selected | `Barracks_1..5` |
| an enemy is selected | `Thug_1` |
| an arrow kills an enemy | `Arrow_kill_enemy` |
| a rock kills an enemy | `Rock_kill_enemy` |
| a barracks man kills an enemy | `Thug_dies` |
| a barracks man dies | `Soldier_dies` |
| **an archer looses** — Category B | `Arrow_shot` |
| **a barracks man swings** — Category B | `Attack_1/2/3` |
| **a rock lands** — Category B | `Rock_hit_ground` |

Everything above the line is Category A and shares the one channel; the three
below run on the background bus and play every time.

**SELECTING A TOWER IS SILENT — all three families.** Tapping a building is how
you read its numbers and it is done constantly: every time you weigh an upgrade,
every time you check what is already there. A line on each of those taps is the
same clip several times a minute, which is exactly what the Category A share
rules exist to prevent, and it was slipping past them by being a different event
each time. Only BUILDING and UPGRADING speak, and each of those happens once.

Selecting a FIGURE still speaks — a barracks man, a thug — because that is a
deliberate look at one man rather than a glance at a building you own.

Where a row lists more than one file, one is picked at random each time, so the
same order twice running is not the same voice twice running. Category B gets a
cut-down version of the same courtesy — no share rules, but never the same take
twice running, because a sword making one identical noise forty times a wave is
the machine-gun problem all over again.

**A giant thug answers with the common thug's line**, there being one enemy
voice so far. Silence for the giant would read as a bug rather than as a gap.

### The catapult's noise is where it LANDS

**Throwing a rock is silent, and that is the design rather than a gap.** The
release is not the moment anyone is looking at — the arm swings, and a creak
nobody can place among ten machines is noise. The arrival is the event: it is
where the damage happens and where the eye already is. So the two flags on the
ammunition in `src/data/towers.js` are opposites — an arrow has `fireSound` and
the rock has `landSound`.

**`Rock_hit_ground` is Category B**, like the bow, and for the same reason:
several catapults land rocks at once and one shared channel would silence all but
one of them. It plays on **every** landing, hit or miss — a rock cratering an
empty road is exactly the miss a player needs to hear, given the tower throws
ahead of its target and can be walked out from under.

**`Rock_kill_enemy` is Category A**, and it stopped the rock borrowing the arrow's
line. An arrow finding one man across the map and a rock coming down on several
are different enough events to be worth telling apart with your eyes shut.
`killedBy` on the victim is the ammunition's own `kind`, so a third projectile
would need no branch anywhere.

## What the one-second rule actually costs

The gate holds for as long as the clip is AUDIBLE, plus the second — not for the
length of the file. Skipping the dead air at both ends bought back real time
here, most of a second on some clips:

| clip | file | audible | holds the channel |
|---|---|---|---|
| `Thug_1` | 3.40s | 2.80s | **3.80s** |
| `Archery_3` | 2.53s | 1.94s | 2.94s |
| `Barracks_3` | 2.17s | 1.69s | 2.69s |
| `Thug_dies` | 1.34s | 1.04s | 2.04s |
| `Archery_1` | 1.44s | 0.77s | 1.77s |
| `Soldier_dies` | 0.70s | 0.48s | 1.48s |
| `Arrow_kill_enemy` | 1.05s | 0.30s | 1.30s |

`Arrow_kill_enemy` is the striking one: a 1.05s file with 0.30s of sound in it,
so it used to hold the channel for two seconds to say something that took a
third of one.

Tapping a thug is still the longest hold in the game at 3.8s. The battle plays
on underneath throughout, so it is not silence exactly — nothing else gets
announced. Trimming `Thug_1` would take it under 2s if that ever reads wrong in
play.

## The UI has one sound of its own

`Select_Sound.mp3` — **Category B**, and for a reason that has nothing to do with
the battle: it answers the player's FINGER. A reply that is sometimes dropped is
worse than no reply at all, because a button whose click depends on whether a
thug happens to be shouting reads as a button that sometimes misses the tap. So
it never queues, is never chosen over, and never waits for the voice channel. It
ducks under a voice line like everything else on that bus, which is right — the
line is the more important of the two and the click still comes through under it.

**It plays once, from one place, and only when the tap DID something.** There is
a single `play(SELECT)` in `src/input.js`, on the answer to one question every
branch of the tap handler returns: did this act? The alternative — a call in each
of a dozen branches — is how a control quietly ends up silent, because the branch
added next simply forgets.

The silent half is the useful half. An unaffordable button absorbs its tap
without acting, a paused board refuses everything but its two controls, and bare
ground with nothing selected has nothing to say. Clicking at those would teach
the player that the click means "heard you" rather than "done".

## One thing may interrupt: buying an upgrade

The gate is right about almost everything it holds off. A swing, a death, a
selection are all things the GAME decided to voice, and a busy fight talking over
itself is what the whole category exists to prevent.

**An upgrade is not one of those.** It is the player pressing a button and
spending gold, and the reply has to arrive or the button feels dead. It used to
be dropped like anything else — invisible in a quiet game and constant in a busy
one, which is exactly when an upgrade is most likely to be bought.

So `solo(cue, true)` takes the channel off whatever is speaking, and **two call
sites use it**: building and upgrading, both in `src/input.js`. They are the two
moments a family speaks and both are deliberate purchases — a swing or a death
cry holding either of them off is the channel getting its priorities exactly
backwards. Selection does not, and deliberately: it happens constantly and its
silence is a feature, not a fault.

Two details worth knowing:

- **The clip is faded, not cut.** A buffer source stopped mid-sample is a click,
  and it is louder and more noticeable than the word it interrupted. The stop is
  scheduled 60ms out with a ramp to zero in front of it.
- **Priority is about who gets the channel, not about repeating.** All the share
  rules below still apply, so a single-take cue interrupted into its own repeat
  still declines. A family with five takes rotates as it always did.

`node tools/sound.mjs` checks all of that, including that the interrupting clip
resets the gate to ITS OWN length — a half-second line taking over from a
two-second one must not hold the channel for two seconds of sound nobody is
hearing any more.

## Levelling is automatic — you do not have to normalise

The clips arrived up to **20dB apart**. The voices had never been normalised and
peaked around 0.12; the death effects peaked near 1.0. So `Archery_1` was 9.6dB
under the middle of the pack and `Thug_dies` 10.1dB over it, and no amount of
bus mixing survives that — "the battle sits 7dB under the voices" means nothing
when the clips themselves differ by twenty.

Every clip is now **analysed once at load** and given the gain that brings it to
a common loudness, measured as the RMS of its loudest 300ms. What that does to
the current eighteen — the four newest voices needed it as much as the first
batch:

| clip | adjustment |
|---|---|
| `Archery_5` | **+13.1 dB** |
| `Archery_1` | +11.1 dB |
| `Archery_2` | +10.5 dB |
| `Attack_2` | +7.0 dB |
| `Barracks_4` | +6.6 dB |
| `Archery_3` | +4.4 dB |
| `Archery_4` | +3.7 dB |
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

The ceiling was 4 until `Archery_5` arrived needing 4.55x. That is a quiet
recording, not a broken one — it peaks at 0.089 — and a clamp that bites on a
file with nothing wrong with it is set too tight, so it went to 5. If a future
upload reports exactly `+14.0dB` it has hit the new ceiling and is genuinely too
quiet to rescue.

`GAIN` in `src/audio.js` overrides the analysis per clip, and it is for INTENT
— a giant that should be louder than a common thug — not for correction.

## Dead air at the front is skipped, also automatically

Measured lead-in across the uploads: `Thug_1` 299ms, `Attack_3` 275ms,
`Archery_2` 224ms, `Attack_2` 201ms, most others 50–150ms. A sword landing
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

Every filename is now a plain URL — no `%20` anywhere in the project. Keep
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
