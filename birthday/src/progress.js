// WHAT HAS BEEN EARNED, and what that opens.
//
// The game is a short story now rather than three maps in a row: it starts with
// one map and two people, and the other two of each are earned. This file owns
// the whole of that — the stars, the ladder, and the one line of storage that
// remembers it between visits. Nothing else needs to know how any of it is kept.
//
// --- the ladder ------------------------------------------------------------------
//
//   at the start        The Bend, with Mommy and Ella
//   2 stars on map 1    unlocks PAPA and The Fork
//   2 stars on map 2    unlocks REI and Two Rivers
//   2 stars on all 3    the certificate
//
// TWO STARS RATHER THAN THREE at every gate, deliberately. Three stars means
// finishing with at least 18 of 20 lives, which is close to perfect; a five-year
// -old should not be locked out of half the game by two thugs getting through.
// Two stars is "you clearly won", which is the right bar for a door.
//
// --- storage ----------------------------------------------------------------------
//
// One localStorage key holding one small object. Every read and write is wrapped,
// because localStorage throws rather than returning null in a few real situations
// — private browsing on old iOS, a full quota, a browser with storage disabled —
// and a birthday game that will not start because it cannot remember anything is
// worse than one that forgets. If storage is unavailable the game is simply
// played from the beginning each time, which still works.

const KEY = 'birthday-progress';

// How many stars a finished map is worth, from the lives left out of START_LIVES.
// The owner's numbers: below 10 is one, below 18 is two, 18 and over is three.
export const starsFor = lives =>
  lives >= 18 ? 3 : lives >= 10 ? 2 : 1;

// The bar every door in the game is set at.
export const PASS = 2;

// WHAT EACH MAP OPENS when it is passed, keyed by the map's index. Written as data
// rather than as three branches, so the screens can ask "what does finishing this
// open" without knowing the story.
export const OPENS = [
  { map: 1, member: 'papa' },
  { map: 2, member: 'rei' },
  { map: null, member: null }
];

// Who and what is available from the very first visit.
const START_MAPS = [0];
const START_MEMBERS = ['mommy', 'ella'];

// THE ADMIN WAY IN, on the map screen. The owner asked for it in as many words:
// if Ella cannot finish the game, he wants to be able to open everything so the
// certificate can still be printed. Same code as the big game's dashboard, so
// there is one number to remember rather than three.
export const UNLOCK_PIN = '1349';

const blank = () => ({ stars: [0, 0, 0], all: false });

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const got = JSON.parse(raw);
    const stars = Array.isArray(got.stars) ? got.stars : [];
    // Rebuilt field by field rather than trusted: this object survives across
    // versions of the game, and a table that grew a map should not be read back
    // as three undefineds.
    return { stars: [0, 1, 2].map(i => +stars[i] || 0), all: !!got.all };
  } catch { return blank(); }
}

function write(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* not kept */ }
}

// The live copy. Read once at load and written through on every change, so a
// screen asking twice in one frame does not touch storage twice.
let state = read();

export const stars = i => state.stars[i] || 0;
export const everything = () => state.all;

// Keep the BEST result, never the latest. Somebody who has three-starred The Bend
// and then plays it again for fun must not lose the map they opened.
export function record(mapIndex, got) {
  if (got <= stars(mapIndex)) return false;
  state.stars[mapIndex] = got;
  write(state);
  return true;
}

export function unlockAll() {
  state.all = true;
  write(state);
}

// Wipe everything and start the story again. Nothing in the game calls this — it
// is here for the console, because the one thing that is genuinely hard to test
// by hand is the first visit.
export function forget() {
  state = blank();
  write(state);
}

export const mapOpen = i =>
  state.all || START_MAPS.includes(i) || OPENS.some((o, n) => o.map === i && stars(n) >= PASS);

export const memberOpen = id =>
  state.all || START_MEMBERS.includes(id) || OPENS.some((o, n) => o.member === id && stars(n) >= PASS);

// WHICH MAP OPENS A LOCKED THING, as a sentence the panels can print. This is the
// only place the story is put into words, so the map screen and the family panel
// cannot tell the player two different things.
export function howToOpen(id, mapNames) {
  const at = OPENS.findIndex(o => o.member === id);
  if (at < 0) return null;
  return `Earn ${PASS} stars on ${mapNames[at]} to unlock`;
}

// What finishing THIS map has just opened, or null. Asked by the result screen
// after `record`, which is why it takes the stars rather than reading them back:
// replaying a map you have already passed should not announce the same unlock a
// second time.
export function opened(mapIndex, got, before) {
  const o = OPENS[mapIndex];
  if (!o || !o.member) return null;
  if (got < PASS || before >= PASS) return null;
  return o;
}

// Every map passed. The certificate's one condition — and the admin code counts,
// which is the whole reason the admin code exists. The owner's words for it were
// "in case Ella cannot complete the game to earn the certificate"; an override
// that opened the maps but still withheld the certificate would answer everything
// about that sentence except the point of it.
export const finished = () => state.all || [0, 1, 2].every(i => stars(i) >= PASS);
