// Measures every clip in assets/audio and reports what the game needs to know.
//
//   node tools/audio.mjs
//
// The same job tools/trim.mjs does for sprites: the artist uploads a file, and
// the code needs a number out of it that nobody can read off the filename. For a
// sprite that is the bounding box. For a clip it is the DURATION, because the
// Category A gate holds the channel for the length of the clip plus a second,
// so a three-second line and a half-second one are very different rules even
// though they are both "one at a time".
//
// It parses the MP3 frame headers itself rather than shelling out to ffprobe.
// There is no ffmpeg in this project and no npm to install one, which is the
// same constraint that made tools/trim.mjs decode PNGs by hand.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../assets/audio/', import.meta.url).pathname;

// MPEG audio frame header tables, Layer III.
//
// BOTH versions, and that is not belt-and-braces. The first cut of this tool
// assumed every file was MPEG 1 and derived MPEG 2 by halving the MPEG 1
// numbers, which is true of the sample rates and NOT of the bitrates — they are
// a different table entirely. The frame lengths came out wrong, the scan
// resynced in the wrong places, and the durations it printed for the 24 kHz
// files were about half of what a decoder plays. Cross-checked against
// Chromium's decodeAudioData now, file by file.
const BITRATES = {
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
};

// Keyed by the header's version bits: 3 = MPEG 1, 2 = MPEG 2, 0 = MPEG 2.5.
const RATES = {
  3: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  0: [11025, 12000, 8000]
};

// What the README asks for. Anything outside these is reported, not rejected —
// the tool's job is to tell you, and whether a 2.4s line is wrong depends on
// what it is a line of.
const MAX_S = { sfx: 0.6, voice: 1.5 };
const MAX_KB = 50;

// A file's playing time, by adding up its frames.
//
// Frame-by-frame rather than the usual size/bitrate shortcut because that
// shortcut is wrong for a variable-bitrate file, and a VBR encoder is exactly
// what a phone recording app reaches for. It also means the ID3 tag and any
// album art are skipped rather than counted as audio, which on a half-second
// clip is the difference between 0.5s and 1.2s.
function measure(buf) {
  let i = 0;

  // Skip an ID3v2 tag. Its size is 4 synchsafe bytes — seven bits each, top bit
  // always clear, so the tag length can never contain a false frame sync.
  if (buf.length > 10 && buf.toString('latin1', 0, 3) === 'ID3') {
    i = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]);
  }

  let seconds = 0, frames = 0, bits = 0;
  let channels = 0, rate = 0;

  while (i + 4 <= buf.length) {
    // Frame sync: eleven set bits.
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) { i++; continue; }

    const verBits = (buf[i + 1] >> 3) & 3;   // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (buf[i + 1] >> 1) & 3;     // 1 = Layer III
    const brIdx = (buf[i + 2] >> 4) & 15;
    const srIdx = (buf[i + 2] >> 2) & 3;
    // Bit 1 of byte 2. It was read as bit 2 here at first, which is one of the
    // sample-rate bits — so the padding byte was taken from the wrong field and
    // half the frame lengths came out one byte short.
    const pad = (buf[i + 2] >> 1) & 1;
    const mode = (buf[i + 3] >> 6) & 3;      // 3 = mono

    if (verBits === 1 || layer !== 1 || brIdx === 0 || brIdx === 15 || srIdx === 3) { i++; continue; }

    const mpeg1 = verBits === 3;
    const sr = RATES[verBits][srIdx];
    const kbps = BITRATES[mpeg1 ? 1 : 2][brIdx];
    // MPEG 1 Layer III carries 1152 samples a frame; MPEG 2 and 2.5 carry 576.
    const samples = mpeg1 ? 1152 : 576;
    const len = Math.floor((samples / 8) * kbps * 1000 / sr) + pad;
    if (len < 4) { i++; continue; }

    seconds += samples / sr;
    bits += kbps;
    frames++;
    channels = mode === 3 ? 1 : 2;
    rate = sr;
    i += len;
  }

  return { seconds, frames, rate, channels, kbps: frames ? Math.round(bits / frames) : 0 };
}

let worst = 0;
let notes = [];

for (const dir of ['sfx', 'voice']) {
  const files = readdirSync(join(ROOT, dir)).filter(f => f.endsWith('.mp3')).sort();
  if (!files.length) continue;

  console.log(`\n${dir}/`);
  console.log('  file                     secs    kB   kbps  ch   rate');

  for (const f of files) {
    const path = join(ROOT, dir, f);
    const kb = statSync(path).size / 1024;
    const m = measure(readFileSync(path));

    const flags = [];
    if (m.seconds > MAX_S[dir]) flags.push(`long (over ${MAX_S[dir]}s)`);
    if (kb > MAX_KB) flags.push(`heavy (over ${MAX_KB}kB)`);
    if (m.channels === 2) flags.push('stereo');
    if (f.includes(' ')) flags.push('space in name');
    if (!m.frames) flags.push('NO FRAMES — not an mp3?');

    worst = Math.max(worst, m.seconds);
    if (flags.length) notes.push(`${dir}/${f}: ${flags.join(', ')}`);

    console.log(
      `  ${f.padEnd(24)}${m.seconds.toFixed(2).padStart(5)}` +
      `${kb.toFixed(0).padStart(6)}${String(m.kbps).padStart(7)}` +
      `${String(m.channels).padStart(4)}${String(m.rate).padStart(8)}`
    );
  }
}

// The number that actually governs how the game sounds. A Category A clip holds
// the channel for its own length plus the one-second rest, so the longest clip
// sets the longest silence the rule can impose.
console.log(`\nLongest clip ${worst.toFixed(2)}s — Category A can hold the channel up to ${(worst + 1).toFixed(2)}s.`);

if (notes.length) {
  console.log('\nWorth a look:');
  for (const n of notes) console.log('  ' + n);
}
