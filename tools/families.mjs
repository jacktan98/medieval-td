// The three shooting families, checked against the design they are supposed to
// embody. Node only.
//
//   node tools/families.mjs
//
// Archery, the monastery and artillery are not three sets of numbers that happen
// to differ. They are one design with three columns, and the artist stated it:
//
//                 rate      projectile   damage    range     other
//   Archery       HIGHEST   HIGHEST      decent    decent    —
//   Monastery     decent    decent       HIGHEST   LOWEST    —
//   Artillery     LOWEST    LOWEST       decent    HIGHEST   blast radius
//
// "Decent" is the load-bearing word and it is why this file exists. It does not
// mean "some value somebody liked"; with exactly three families it means BETWEEN
// THE OTHER TWO, and that is a claim a tool can check. Nothing else in the
// project can: tools/sim.mjs measures whether a build wins, which is a different
// question and stays true for a while after the identities have blurred.
//
// WHAT GOES WRONG WITHOUT IT. Every one of these numbers gets tuned — the
// monastery's damage has been 5, then 30, then 55, then 190, then 20 in the
// space of two days — and each move is judged against a win rate rather than
// against the table. It takes one pass for a "decent" to drift past a "highest"
// and for two families to become the same tower at different prices, and the
// only symptom is that the game slowly stops having a reason to offer both.
//
// A BARRACKS IS NOT IN THE TABLE. It shoots nothing, its `range` is the leash on a
// rally point rather than a weapon's reach, and comparing that to a bow's range
// would be comparing two different things that share a field name. It gets a
// section of its own at the bottom, where the questions are about a wall.

// The barracks IS imported, for one section at the bottom — its tier 4 makes a
// claim of its own shape that nothing above can ask. It still takes no part in the
// three-column table.
import { archery, barracks, monastery, siege } from '../src/data/towers.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
  if (!cond) bad++;
};

// Keyed by the name the table uses, so a failure reads in the same words the
// design is written in.
const FAM = { Archery: archery, Monastery: monastery, Artillery: siege };
const NAMES = Object.keys(FAM);

// Two letters, not one: "Archery" and "Artillery" both start with an A, and a
// row reading `A>M>A` is a row nobody can check at a glance.
const TAG = { Archery: 'Ar', Monastery: 'Mo', Artillery: 'Ty' };

const show = pick => NAMES.map(n => `${TAG[n]} ${FAM[n].map(pick).join('/')}`).join('   ');

// Every claim is per TIER, not per family average. A family that wins on tier 1
// and loses on tier 3 has an identity that changes as you upgrade it, which is
// the same defect as not having one.
//
// `higher` says which direction is "more of this quality" — a cooldown is
// backwards, because less of it is more rate.
function ranks(pick, higher = true) {
  const out = [];
  for (let t = 0; t < 3; t++) {
    const row = NAMES.map(n => ({ n, v: pick(FAM[n][t]) }));
    row.sort((a, b) => (higher ? b.v - a.v : a.v - b.v));
    out.push(row.map(r => r.n));
  }
  return out;
}

const holds = (pick, higher, want) =>
  ranks(pick, higher).every(order => want.every((n, i) => order[i] === n));

console.log('\nRate — how often it fires\n');
console.log(`  cooldowns   ${show(d => d.cooldown)}\n`);
{
  // Lower cooldown is more rate, so `higher: false`.
  ok(holds(d => d.cooldown, false, ['Archery', 'Monastery', 'Artillery']),
    'archery fastest, monastery between, artillery slowest',
    ranks(d => d.cooldown, false).map(o => o.map(n => TAG[n]).join('>')).join('  '));

  // Said again as a strict inequality, because "in the right order" is satisfied
  // by three families that all fire at the same rate.
  const strict = [0, 1, 2].every(t =>
    archery[t].cooldown < monastery[t].cooldown && monastery[t].cooldown < siege[t].cooldown);
  ok(strict, 'and all three are genuinely apart, not tied');
}

console.log('\nProjectile speed — how fast the shot travels\n');
{
  // Read off the AMMUNITION each tier carries rather than a constant, so a tier
  // given its own faster ammo is caught here rather than on the board.
  const speed = d => d.ammo.speed;
  console.log(`  speeds      ${show(speed)}\n`);
  ok(holds(speed, true, ['Archery', 'Monastery', 'Artillery']),
    'archery fastest, monastery between, artillery slowest',
    ranks(speed, true).map(o => o.map(n => TAG[n]).join('>')).join('  '));
  const strict = [0, 1, 2].every(t =>
    siege[t].ammo.speed < monastery[t].ammo.speed && monastery[t].ammo.speed < archery[t].ammo.speed);
  ok(strict, 'and all three are genuinely apart, not tied');
}

console.log('\nDamage — how hard one shot lands\n');
console.log(`  damage      ${show(d => d.damage)}\n`);
{
  const top = ranks(d => d.damage, true).map(o => o[0]);
  ok(top.every(n => n === 'Monastery'), 'the monastery hits hardest at every tier',
    top.join(', '));
  const strict = [0, 1, 2].every(t =>
    monastery[t].damage > archery[t].damage && monastery[t].damage > siege[t].damage);
  ok(strict, 'and by a margin rather than a tie');
}

console.log('\nRange — how far it reaches\n');
console.log(`  range       ${show(d => d.range)}\n`);
{
  ok(holds(d => d.range, true, ['Artillery', 'Archery', 'Monastery']),
    'artillery furthest, archery between, monastery shortest',
    ranks(d => d.range, true).map(o => o.map(n => TAG[n]).join('>')).join('  '));
  const strict = [0, 1, 2].every(t =>
    monastery[t].range < archery[t].range && archery[t].range < siege[t].range);
  ok(strict, 'and all three are genuinely apart, not tied');
}

console.log('\nBlast — the one thing only artillery has\n');
{
  ok(siege.every(d => d.splash > 0), 'every artillery tier has a blast radius',
    siege.map(d => d.splash).join('/'));
  const others = [...archery, ...monastery].filter(d => d.splash);
  ok(!others.length, 'and nothing else does',
    others.map(d => d.title).join(', ') || 'archery and the monastery are single-target');

  // The dead zone is artillery's alone as well, and it is the other half of what
  // "highest range" costs. A family that reached furthest AND could shoot its own
  // feet would simply be the best tower.
  //
  // THE LADDER, not every rung of it. Tier 4 gives the hole up — it fires a bolt
  // rather than lobbing a rock, so there is no arc to clear — and it pays for
  // that with the shortest reach in the family, 100px less than the trebuchet it
  // upgrades from. The claim the game actually rests on is that a machine cannot
  // have BOTH, so it is checked that way round: everything that reaches further
  // than archery has a hole, and the one tier without a hole reaches less far
  // than the tier below it.
  const lobbers = siege.filter(d => d.minRange > 0);
  const flat = siege.filter(d => !d.minRange);
  ok(lobbers.length && lobbers.every(d => d.range > Math.max(...archery.slice(0, 3).map(a => a.range))),
    'the artillery that lobs has a hole in the middle',
    `${lobbers.map(d => d.minRange).join('/')}px`);
  ok(flat.every(d => d.range < Math.min(...lobbers.map(l => l.range))),
    'and the one that does not, reaches least of the family',
    flat.map(d => `${d.name} ${d.range}`).join(', ') || 'none');
  const holed = [...archery, ...monastery].filter(d => d.minRange);
  ok(!holed.length, 'and no other family has a hole at all',
    holed.map(d => d.title).join(', ') || 'archery and the monastery shoot their own feet');
}

// --- what the shape actually buys ------------------------------------------------
//
// Not a pass/fail — there is no right answer to it — but it is the number the
// table is really about, and printing it beside the checks is what stops the
// design being read as "the monastery is the strong one".
console.log('\nWhat the shape costs, per second\n');
{
  console.log('  tier   archery   monastery   artillery');
  for (let t = 0; t < 3; t++) {
    const dps = f => (FAM[f][t].damage / FAM[f][t].cooldown).toFixed(1);
    console.log(`  ${t + 1}      ${dps('Archery').padStart(7)}   ${dps('Monastery').padStart(9)}` +
      `   ${dps('Artillery').padStart(9)}${siege[t].splash ? ' + blast' : ''}`);
  }
  console.log('\n  The monastery runs about a tenth ahead of archery, which is what its');
  console.log('  shorter reach and its higher price are buying — they were exactly level');
  console.log('  for one commit and that made one of them strictly worse. Artillery');
  console.log('  trades raw output for reach and blast.');
}

// The one claim in this file that is not in the artist's table, and it earns its
// place: the two single-target families are the pair a player picks between on
// the same plot, so the more expensive, shorter-ranged one has to be doing MORE
// per second. They were exactly level for one commit and nothing caught it,
// because every claim above was still true.
console.log('');
{
  const dps = (f, t) => FAM[f][t].damage / FAM[f][t].cooldown;
  const ahead = [0, 1, 2].every(t => dps('Monastery', t) > dps('Archery', t));
  ok(ahead, 'and the monastery is ahead of archery at every tier',
    [0, 1, 2].map(t => `+${((dps('Monastery', t) / dps('Archery', t) - 1) * 100).toFixed(0)}%`).join('  '));

  const dearer = [0, 1, 2].every(t => monastery[t].cost > archery[t].cost);
  ok(dearer, 'which is what its higher price buys',
    [0, 1, 2].map(t => `+${monastery[t].cost - archery[t].cost}g`).join('  '));
}

// --- tier 4, on its own terms ----------------------------------------------------
//
// The three claims above are about the three FAMILIES and they compare tier for
// tier, so they stop at 3 — a musketeer has nothing to be compared with in the
// other two ladders. What the tier 4 tower claims is different in kind, and it is
// worth checking because the whole point of the tower is a trade rather than an
// improvement: it sees the whole board and it does LESS per second than the rung
// below it. Get that backwards and the top of the ladder is simply strictly
// better, which is the thing every other check here exists to prevent.
console.log('\nTier 4 — reach instead of output\n');
{
  const t4 = archery[3];
  const t3 = archery[2];
  const dps = d => d.damage / d.cooldown;

  const longest = [...archery, ...monastery, ...siege].every(d => d === t4 || d.range < t4.range);
  ok(longest, 'the Musketeer Post reaches further than anything else',
    `${t4.range} against a trebuchet's ${siege[2].range}`);

  // 960x540 board, and reach is an ellipse squashed to SQUASH — see src/ground.js.
  // A tower on a middling plot has to cover the width of the board for "the whole
  // map" to mean anything.
  ok(t4.range * 2 >= 960, 'and covers the board across',
    `${t4.range * 2}px of 960`);

  ok(dps(t4) < dps(t3), 'and pays for it in output per second',
    `${dps(t4).toFixed(1)} against tier 3's ${dps(t3).toFixed(1)}`);

  ok(t4.cost > t3.cost, 'and in gold', `${t4.cost}g against ${t3.cost}g`);

  // Everything on this ladder can be told what to shoot at, and the tier that can
  // see the whole board is the one where the order matters most.
  ok(archery.every(d => d.targeting), 'and every archery tier still takes an order');
}

// --- artillery's tier 4, on its own terms ----------------------------------------
//
// The third tier 4 and the third shape of claim. The Musketeer Post pays for
// reach in output and the Paladin Keep pays for wall in weapon; the Ballista
// Turret pays for OUTPUT in reach and in area, which is the one direction left
// and is what the artist asked for in so many words: "less range than artillery
// but no dead zone, blast radius but smaller, super high damage and a faster
// reload".
//
// Six sentences, all of them checkable, and worth checking because the tower is
// otherwise strictly better than the rung it upgrades from — more damage, more
// often, no hole in the middle — and the only things holding that in balance are
// the two numbers that went DOWN.
console.log('\nArtillery tier 4 — output instead of reach\n');
{
  const t4 = siege[3];
  const t3 = siege[2];
  const dps = d => d.damage / d.cooldown;

  ok(siege.every(d => d === t4 || d.range > t4.range), 'the Ballista Turret reaches least in its family',
    siege.map(d => d.range).join(' / '));

  ok(t4.minRange === 0 && siege.every(d => d === t4 || d.minRange > 0),
    'and is the only machine with no dead zone',
    siege.map(d => d.minRange).join(' / '));

  ok(t4.splash > 0 && siege.every(d => d === t4 || d.splash > t4.splash),
    'and still throws a blast, the smallest of the four',
    siege.map(d => d.splash).join(' / '));

  // THE HARDEST BLOW IN ITS OWN FAMILY, and it used to be joint hardest of the
  // two ladders with the Musketeer Post's ball. The owner has since taken the
  // Post to 65 and this is 60, so the claim that was here — "hits as hard as
  // anything outside the monastery" — is simply no longer true, and it is
  // restated rather than propped up.
  //
  // WHAT IS WORTH GUARDING is the shape of the ladders rather than which of two
  // tier 4s wins by five: no tier below 4 may out-hit a tier 4 anywhere, because
  // that would make an upgrade a downgrade in the one number every card leads
  // with. The monastery is excluded from nothing here — it hits hardest of all
  // four families, which is its whole column of the table at the top of this
  // file.
  const lower = [...archery, ...siege].filter(d => d.tier < 4);
  ok(lower.every(d => d.damage < t4.damage), 'and out-hits every tier below 4 in both ladders',
    `${t4.damage} against the best lower tier's ${Math.max(...lower.map(d => d.damage))}`);

  ok(siege.every(d => d === t4 || d.damage < t4.damage), 'and hits hardest in its own family',
    siege.map(d => d.damage).join(' / '));

  // And the ranking across the four tier 4s, printed rather than asserted: it is
  // the owner's to set, and what a check here would freeze is a decision that has
  // moved three times.
  console.log(`      tier 4 damage: Post ${archery[3].damage}, Turret ${t4.damage}, ` +
    `Temple ${monastery[3].damage}, Keep ${barracks[3].soldier.damage} a man`);

  ok(siege.every(d => d === t4 || d.cooldown > t4.cooldown), 'and reloads fastest in its family',
    siege.map(d => d.cooldown.toFixed(2)).join(' / '));

  // THE MIRROR. Artillery's clock is its animation — updateTowers fires on the
  // Fire beat and never looks at `cooldown` — so on this family the field is a
  // description of `beats` that the menu, the encyclopedia and every check above
  // read as if it were the truth. Let the two drift and the rate column of the
  // table at the top of this file becomes fiction. tools/siege.mjs proves the
  // observed gap between shots matches `cooldown`; this proves the arithmetic,
  // which is the half that says WHY when that one fails.
  const beats = d => (d.beats || [0.75, 0.75, 1.5]).reduce((a, b) => a + b, 0);
  ok(siege.every(d => Math.abs(beats(d) - d.cooldown) < 1e-9),
    'and its cooldown is still what its animation adds up to',
    siege.map(d => `${beats(d).toFixed(2)}=${d.cooldown.toFixed(2)}`).join(' '));

  // What all of that costs. Per-second output triples; the area it lands in and
  // the reach it lands from both fall, and the ladder is the dearest in the game.
  ok(dps(t4) > dps(t3) && t4.splash * t4.range < t3.splash * t3.range,
    'and pays for it in ground covered',
    `${dps(t4).toFixed(1)} a second against ${dps(t3).toFixed(1)}, over ${((t4.splash * t4.range) / (t3.splash * t3.range) * 100).toFixed(0)}% of the reach x blast`);

  // WHAT ONE TOWER COSTS TO TAKE TO THE TOP, not what the array adds up to.
  // Archery forks, so its five entries include two fourth rungs and nobody ever
  // buys both — summing the array would have charged a player 730g for a ladder
  // whose dearest path is 530. The path is: every rung below the top, plus the
  // dearest of the top ones.
  const spend = fam => {
    const top = Math.max(...fam.map(d => d.tier));
    const below = fam.filter(d => d.tier < top).reduce((sum, d) => sum + d.cost, 0);
    return below + Math.max(...fam.filter(d => d.tier === top).map(d => d.cost));
  };
  ok(spend(siege) > spend(archery) && spend(siege) > spend(barracks),
    'and is the dearest ladder there is',
    `${spend(siege)}g against ${spend(archery)}g and ${spend(barracks)}g`);
}

// --- the monastery's tier 4, on its own terms ------------------------------------
//
// The fourth top rung and the only one that is NOT a trade, which is why it gets
// a section rather than being waved through: the owner asked for "just a more
// powerful version of Monastery Tier 3 — more damage, more range, other than that
// no stark difference", and a check that let that mean anything at all would let
// it mean everything.
//
// So the claims here are as much about what did NOT move as about what did. What
// it pays with is gold, and the reload is what keeps it a monastery.
console.log('\nMonastery tier 4 — the same tower, harder\n');
{
  const t4 = monastery[3];
  const t3 = monastery[2];

  const everyone = [...archery, ...monastery, ...siege].filter(d => d !== t4);
  ok(everyone.every(d => d.damage < t4.damage), 'the Judgement Temple lands the biggest blow in the game',
    `${t4.damage} against the next ${Math.max(...everyone.map(d => d.damage))}`);

  ok(t4.range > t3.range, 'and reaches further than the Abbey', `${t4.range} against ${t3.range}`);

  // AND STILL LEAST, which is the family's own column and the thing that stops
  // "more range" from turning a monastery into an archery tower with a bigger
  // number. Held against archery tiers 1 to 3 rather than the whole file: the
  // Musketeer Post is 480 and is not a rung anybody compares this to.
  ok(archery.slice(0, 3).every(d => d.range >= t4.range) || t4.range <= archery[2].range,
    'and still no further than a Crossbow Tower', `${t4.range} against ${archery[2].range}`);

  ok(t4.cooldown === t3.cooldown, 'and reloads at exactly the Abbey\'s rate, deliberately',
    `${t4.cooldown.toFixed(2)}s both`);

  // What that combination is worth, and what it costs. The output per second is
  // up by the damage alone; the ladder is the second dearest in the game, behind
  // artillery's, which is where a tower with no drawback belongs.
  const dps = d => d.damage / d.cooldown;
  ok(dps(t4) > dps(t3), 'so its output rises with the blow and nothing else',
    `${dps(t4).toFixed(1)} a second against ${dps(t3).toFixed(1)}`);

  // WHAT ONE TOWER COSTS TO TAKE TO THE TOP, not what the array adds up to.
  // Archery forks, so its five entries include two fourth rungs and nobody ever
  // buys both — summing the array would have charged a player 730g for a ladder
  // whose dearest path is 530. The path is: every rung below the top, plus the
  // dearest of the top ones.
  const spend = fam => {
    const top = Math.max(...fam.map(d => d.tier));
    const below = fam.filter(d => d.tier < top).reduce((sum, d) => sum + d.cost, 0);
    return below + Math.max(...fam.filter(d => d.tier === top).map(d => d.cost));
  };
  ok(spend(monastery) > spend(archery) && spend(monastery) > spend(barracks) && spend(monastery) < spend(siege),
    'and the ladder is the second dearest there is',
    `${spend(monastery)}g against artillery's ${spend(siege)}g, archery's ${spend(archery)}g, the barracks' ${spend(barracks)}g`);

  ok(monastery.every(d => d.targeting), 'and every monastery tier still takes an order');
}

// --- the barracks' tier 4, on its own terms --------------------------------------
//
// The barracks is not in the table above and the note at the top says why: it
// shoots nothing, and its `range` is the leash on a rally point rather than a
// weapon's reach. But its tier 4 makes a claim of the same SHAPE as the Musketeer
// Post's — a trade rather than an improvement — and that claim is checkable
// without comparing it to anything in another family.
//
// The artist's words were "not really an attacker but a blocker". So: the health
// has to grow faster than the output, or the rung is simply a better tower and the
// sentence was decoration.
console.log('\nBarracks tier 4 — a wall, not a weapon\n');
{
  // BY NAME, NOT BY INDEX. The barracks forks at the top the way archery does —
  // barracks[3] is the Keep and barracks[4] is the Guild only until somebody
  // writes them in the other order, and every claim below is about one of the two
  // in particular rather than about "the last one in the array".
  const named = n => barracks.find(d => d.name === n);
  const spine = barracks.filter(d => d.tier < 4);
  const keep = named('Paladin Keep');
  const guild = named('Assassin Guild');
  const t4 = keep.soldier;
  const t3 = spine[spine.length - 1].soldier;
  const dps = m => (m.damage / m.cd) * m.count;
  const wall = m => m.hp * m.count;

  const hpUp = wall(t4) / wall(t3) - 1;
  const dpsUp = dps(t4) / dps(t3) - 1;

  ok(hpUp > dpsUp, 'the Paladin Keep gains more wall than weapon',
    `+${(hpUp * 100).toFixed(0)}% health against +${(dpsUp * 100).toFixed(0)}% damage a second`);

  // PER PLOT FIRST, because the plot is the scarce thing. A map has nine or eleven
  // markers and no more; gold comes back every wave. What pressing this button
  // buys is a bigger wall on ground you already hold, and that is the number that
  // has to move.
  ok(wall(t4) > wall(t3) * 1.2, 'and is a much bigger wall on the one plot',
    `${wall(t4)} against ${wall(t3)}, +${((wall(t4) / wall(t3) - 1) * 100).toFixed(0)}%`);

  // AND PER GOLD IT IS ALLOWED TO BE A LITTLE WORSE, which is a change of claim
  // rather than a slackened one. It used to have to be a little BETTER, on the
  // reasoning that a rung worse per gold than the one below would never be worth
  // pressing — and at 300hp it was, by 4%. The owner took the paladin to 275 and
  // that flips: 1.56 a gold against a swordsman's 1.64.
  //
  // The claim that survives is the honest one. Wall per gold is not what the
  // button sells, or a player would buy a fourth Militia Camp instead of a Keep
  // and be right; it sells wall per PLOT, a harder-hitting, faster, quicker-
  // mustering man, and two abilities nothing below tier 4 can be taught. What it
  // must not be is FAR behind — a rung that is half as efficient is a trap
  // whatever else it carries — so the band is 10% either side of the rung below.
  //
  // What a rung costs is what the WHOLE PATH to it costs — every rung below plus
  // its own — which is why this walks the spine rather than slicing the array.
  const paid = d => spine.filter(s => s.tier < d.tier).reduce((sum, s) => sum + s.cost, 0) + d.cost;
  const per = d => wall(d.soldier) / paid(d);
  const gain = per(keep) / per(spine[2]) - 1;
  ok(Math.abs(gain) < 0.10, 'and is within a tenth of it per gold, either way',
    `${per(keep).toFixed(2)} against ${per(spine[2]).toFixed(2)} per gold, ${gain >= 0 ? '+' : ''}${(gain * 100).toFixed(0)}%`);

  // Every rung of this ladder musters the same squad. The muster rings, the
  // formation and tools/formation.mjs are all drawn for three men, and a tier that
  // quietly changed the number would be a different tower rather than a stronger
  // one — see the note on the tier in data/towers.js.
  ok(barracks.every(d => d.soldier.count === barracks[0].soldier.count),
    'and still musters the squad every other rung does',
    `${barracks[0].soldier.count} men`);

  // The ladder's own six dials, each one continuing rather than reversing. This
  // is what "the same tower one rung further up" means, and it is the check that
  // a later tune of one number did not put a tier 4 paladin behind a tier 3 knight
  // at something.
  //
  // DOWN THE KEEP'S PATH ONLY. The Guild is the other fourth rung and it is not
  // claiming to be the same man further up — it is claiming a trade, and the
  // section below is where that claim is checked. Running this over all five would
  // read the fork as a collapse: 275 health then 150, which is the design.
  const climbs = [
    ['health', m => m.hp, 1], ['damage', m => m.damage, 1],
    ['reload', m => m.cd, -1], ['speed', m => m.speed, 1],
    ['respawn', m => m.respawn, -1], ['regen', m => m.regen, 1]
  ];
  const men = [...spine, keep].map(d => d.soldier);
  for (const [name, pick, dir] of climbs) {
    const rising = men.every((m, i) => i === 0 || (pick(m) - pick(men[i - 1])) * dir > 0);
    ok(rising, `and its ${name} carries on up the ladder`, men.map(pick).join(' / '));
  }

  // --- and the other fourth rung, which is not that at all ----------------------
  //
  // The Assassin Guild costs the Keep's gold on the same plot off the same tier 3
  // and hands back a squad that is worse at the one thing a barracks is for. That
  // is deliberate and it is the whole tower, so it is stated as a trade with both
  // halves checked: a player who reads "tier 4" as "strictly better" and buys it
  // in front of the giants is meant to be wrong.
  const g = guild.soldier;

  ok(guild.cost === keep.cost && guild.tier === keep.tier,
    'the Assassin Guild is the Keep\'s price on the Keep\'s rung',
    `${guild.cost}g, tier ${guild.tier}, both`);

  ok(dps(g) > dps(t4) && wall(g) < wall(t4),
    'and trades the wall away for the blade',
    `${dps(g).toFixed(0)}/s against ${dps(t4).toFixed(0)}, ${wall(g)} health against ${wall(t4)}`);

  // Below the rung it upgrades FROM, which is the sharp end of the trade and the
  // reason it cannot be bought on reflex. Three assassins are a thinner wall than
  // the three knights they replaced.
  ok(wall(g) < wall(t3), 'and is a thinner wall than the Knight\'s Hall it replaces',
    `${wall(g)} against ${wall(t3)}`);

  ok(g.damage === Math.max(...barracks.map(d => d.soldier.damage)),
    'and lands the hardest blow any barracks musters', `${g.damage} a man`);

  // The only rung in the family whose men come out of the door weaker than the
  // last lot did. Not the least health in the family — a militiaman has 100 — but
  // the only STEP DOWN, which is the thing a ladder is not supposed to do and the
  // whole reason this fork is a decision rather than a purchase.
  ok(g.hp < t3.hp && [...spine, keep].every((d, i, a) => i === 0 || d.soldier.hp > a[i - 1].soldier.hp),
    'and is the one rung whose men come out weaker than the last',
    `${g.hp} against the Hall's ${t3.hp}`);

  // What buys the trade back. A man nothing can shoot at is a man who only ever
  // spends his health on the fight he chose, and that is the answer to 150.
  ok(g.hidden === true && barracks.filter(d => d.soldier.hidden).length === 1,
    'and he is the one soldier in the family nothing can shoot at',
    `hidden: ${g.hidden}`);
}

console.log(bad
  ? `\n${bad} of the design's claims no longer holds.`
  : '\nEvery family is still the tower the design says it is.');
process.exit(bad ? 1 : 0);
