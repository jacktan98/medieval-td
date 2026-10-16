# Music

The long pieces of music: whole tracks rather than the short clips in the
other audio folders. Put them here as .mp3.

## What goes here

- **Trailer music.** For the trailer video only. The game never loads it, so it is
  left out of the itch.io upload and costs players nothing to download.
- **Boss music.** For the boss fights. It plays over the board in place of the
  stage's own background sounds while a boss is on the road.

## Names

Name a file for what it is, in the same style as the other clips, e.g.
Trailer_music.mp3, Boss_music.mp3, or Boss_music_Captain_Thug.mp3 if each boss is
to have his own.

## Before uploading

- **Boss music loops.** It plays over and over for as long as the fight lasts, so
  the end should run into the start without a gap or a jump. Trim any silence at
  either end.
- **About 1 to 3 minutes** is plenty for a looping piece. Longer only makes the
  game slower to load.
- **MP3 at 128 to 192 kbps** keeps a 2 minute track around 2 to 3 MB.

Nothing here plays in the game until it is wired up in src/audio.js. Say when a
file is in and it will be added.
