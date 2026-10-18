# Music

The long pieces of music: whole tracks rather than the short clips in the
other audio folders. Put them here as .mp3.

| File | Where it plays |
|------|----------------|
| `Start_page_music.mp3` | the start page, and only there. It starts with the player's first tap (a browser plays no sound before one) and fades out as Start is tapped and the world map's own sounds come in. |
| `Boss_fight_music.mp3` | a boss fight: from the boss entering the battle (his entrance line) until he falls. Until he can be attacked — his walk out from the camp wall, or down through the citadel — every other sound is hushed but his own lines; after that the battle comes back in under the music. |

Both loop for as long as they are wanted, fade in and out over 1.5 seconds, and
ride the Music slider in the pause menu (with the background sounds), on a bus of their own that is never turned down under the battle's voices. Each is fetched only when it is
first wanted, so neither slows the loading bar. Their levels: TITLE_MUSIC in
src/overview.js and BOSS_MUSIC in src/main.js.

The trailer music is not kept here: the game does not use it, so it would only
make the itch.io upload bigger.

## Before uploading

- **Music that loops** plays over and over, so the end should run into the start
  without a gap or a jump. Trim any silence at either end.
- **About 1 to 3 minutes** is plenty for a looping piece.
- **MP3 at 128 to 192 kbps** keeps a 3 minute track around 3 to 4 MB. The two
  here were uploaded at 256 kbps (about 6 MB each) and re-exported at 128 kbps
  (about 3 MB each), which the ear cannot tell apart in the game. A new upload at a
  higher rate can be re-exported the same way — ask.
