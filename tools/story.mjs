// THE STAGE PANEL'S STORY: every board on the road has its few sentences, and
// every one fits the scrap of paper it is printed on.
//
//   node tools/story.mjs
import { STAGES } from '../src/data/overview.js';
import { levels } from '../src/level.js';
import { STORY } from '../src/data/story.js';
import { STORY_CARD, STORY_TEXT, STORY_LEAD, STORY_PAD } from '../src/render.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(54)} ${detail}`);
  if (!cond) bad++;
};

const boards = STAGES.map(s => (s.level === null ? null : levels[s.level])).filter(Boolean);
const missing = boards.filter(lv => !STORY[lv.id]);
ok(missing.length === 0, 'every board on the road has a story', missing.map(lv => lv.name).join(', ') || `${boards.length} boards`);

// THE WRAP IS ESTIMATED, there being no canvas out here: 0.40em a character is the
// widest any of the book's prose sets at in Lobster, measured in the browser, so
// this counts at least as many lines as the panel draws.
const EM = 0.40 * STORY_TEXT;
const width = STORY_CARD.w - 2 * STORY_PAD;
const lines = text => {
  let n = 0, line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length * EM > width) { n++; line = word; } else line = next;
  }
  return n + (line ? 1 : 0);
};
const room = Math.floor((STORY_CARD.h - STORY_PAD) / STORY_LEAD);
const fullest = boards.filter(lv => STORY[lv.id])
  .map(lv => [lv.name, lines(STORY[lv.id])]).sort((a, b) => b[1] - a[1])[0];
ok(fullest[1] <= room, 'and every story fits its paper', `fullest is ${fullest[0]}, ${fullest[1]} of ${room} lines`);

const sentences = t => t.split(/[.!?](?:\s|$)/).filter(x => x.trim()).length;
const long = boards.filter(lv => STORY[lv.id] && sentences(STORY[lv.id]) > 4);
ok(long.length === 0, 'and none runs past 4 sentences', long.map(lv => lv.name).join(', '));

// THE SEAL: one per stage, the hardest setting it has been won at.
{
  const { setStars, sealOf } = await import('../src/score.js');
  const id = boards[0].id;
  const was = s => (s ? s.id : 'none');
  setStars(id, 'normal', 0); setStars(id, 'hard', 0);
  ok(sealOf(id) === null, 'an unwon stage has no seal', was(sealOf(id)));
  setStars(id, 'normal', 2);
  ok(was(sealOf(id)) === 'normal', 'a Normal win stamps Normal', was(sealOf(id)));
  setStars(id, 'hard', 1);
  ok(was(sealOf(id)) === 'hard', 'and a later Hard win replaces it with Hard', was(sealOf(id)));
  setStars(id, 'normal', 3);
  ok(was(sealOf(id)) === 'hard', 'and a Normal win after that leaves Hard alone', was(sealOf(id)));
  ok(sealOf(id).name === 'Hard', 'and the seal reads the setting\'s own name', sealOf(id).name);
}

console.log(bad ? `\n${bad} problem(s) with the story.` : '\nThe story holds together.');
process.exit(bad ? 1 : 0);
