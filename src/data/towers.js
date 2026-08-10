// Archery and barracks families. Tier 1 is built on an empty plot; tapping an
// existing tower upgrades it. Costs are cumulative spend, not refundable.
//
// Every figure in this file is drawn standing upright and is never rotated.
// Aiming mirrors it left or right and nothing else: rotating a standing figure
// to point at a target lays it on its side, which is the whole reason the
// archers looked wrong to begin with. Arrows are the exception — a projectile
// has no upright, so it rotates to point where it is flying.
//
// ONE SCALE FOR EVERYTHING. Every asset is exported on the same square canvas,
// and the artist sized them against each other on it — a soldier is small next
// to a tower because that is how tall a soldier is. So a single factor converts
// source pixels to game pixels for all of them, and no sprite is ever sized on
// its own. Change SCALE to resize the whole game's art together.
//
// Derived from the export size rather than typed, so re-exporting the same
// artwork bigger or smaller changes ONE number and every drawn size stays put.
// The exports have been 1000x1000, then 200x200, and are 512x512 now.
//
// 512 is the size that makes the art sharp on a phone. The tallest sprite is
// drawn 97px and the canvas backing store goes to 3x device pixels, so it needs
// 291 source pixels; at 200px it had 185 and was upscaled 1.57x, which is why it
// looked soft on a phone and crisp on a laptop (a laptop asks for 1x). Every
// sprite now has pixels to spare. `node tools/trim.mjs` checks this per sprite.
// Exported because render.js needs it to place a death pose: an untrimmed corpse
// is drawn as the whole square, anchored by where the living figure's feet sit
// inside it, so the canvas size is part of that sum.
export const EXPORT_PX = 512;
export const SCALE = 105 / EXPORT_PX;

// THE ONE EXCEPTION TO THE RULE ABOVE, and it is deliberate.
//
// Blood is an effect, not a figure. The shared SCALE exists so that figures are
// sized against each other by the artwork — a soldier is small next to a tower
// because that is how tall a soldier is. A splash of blood has no such truth to
// respect: how big it should be is a question about how well it reads, not about
// anatomy.
//
// x2. That puts the spatter at about 14px beside a 23px militia and the pool at
// about 40px under a 27px body — big enough to read, small enough not to be the
// loudest thing on the board. Drawn at the shared SCALE instead it would be a
// 7x7 speck.
//
// THIS NUMBER IS HALF OF WHAT IT WAS, AND THE BLOOD IS THE SAME SIZE ON SCREEN.
// It was x4 against art that filled 17-56px of its canvas; the art was redrawn
// at twice that, so the multiplier came down by the same factor to hold the
// drawn size still. That is the whole point of keeping the size in one constant:
// the artist changes how many pixels the drawing has, and one number here decides
// how big it appears, so the two can move independently.
//
// It also bought back most of the sharpness. The upscale at 3x device pixels went
// from 2.46x to 1.23x — visibly softer than a sprite drawn 1:1, but close enough
// that a red blob will not read as blurry. Do not raise this to chase the last of
// it: bigger blood was explicitly not wanted.
export const BLOOD_SCALE = SCALE * 2;

const drawnW = trim => Math.round(trim[2] * SCALE);
const drawnH = trim => Math.round(trim[3] * SCALE);

// spriteTrim = the tight bounding box of the art inside its square export.
// mountFrac  = where the gunner stands as a fraction of the building box: the
//              middle of the platform.
// muzzle     = [sideways, vertical] from the gunner. The sideways part flips
//              with the sprite, so the arrow always leaves the bow.
// spriteFaces= which way the artwork is drawn, -1 for left.
// gunnerPivot= the body centre as a fraction of the gunner's trim — the point
//              it mirrors about, not the middle of a box a bow pulls off-centre.

// Measured from the PNGs' alpha by tools/trim.mjs — do not hand-edit. These are
// absolute source pixels, so they are the one thing that MUST be re-pasted after
// a re-export at a different size; everything else below is a fraction of the
// trim and carries over untouched.
// THE FOUR TOWERS ARE ON A 1024 CANVAS; EVERY FIGURE IS STILL ON 512.
//
// That is not a mistake and it needs no special case in the code. A trim is
// absolute source pixels into whatever image it names, and SCALE turns source
// pixels into game px, so a drawing on a bigger canvas simply draws bigger —
// which is what the redraw was for. The check that the two canvases still agree
// with each other is external: the plot marker is on 1024 too, and at this same
// SCALE it comes out within 2.5% of the markers painted into the 1920-wide map.
// The map is authored at the game's own scale, so that agreement is the proof.
//
// It does mean a tower's trim can no longer be eyeballed against a figure's.
// 490 wide here and 144 wide for the archer are not the same units.
const TOWER_TRIM = [267, 211, 490, 602];
const TOWER2_TRIM = [298, 140, 428, 744];
const TOWER3_TRIM = [331, 140, 362, 744];
const ARCHER_TRIM = [184, 197, 144, 119];
const ARCHER2_TRIM = [184, 195, 144, 122];
const ARCHER3_TRIM = [186, 186, 141, 121];
const CAMP_TRIM = [207, 249, 610, 526];
const CAMP2_TRIM = [200, 197, 624, 630];
const CAMP3_TRIM = [200, 201, 624, 621];
const SPEAR_TRIM = [170, 198, 172, 116];
const SPEAR2_TRIM = [173, 196, 166, 120];
const SPEAR3_TRIM = [199, 196, 114, 120];

// Every tier has its own drawing now, in both families — nothing is shared.
// They are all within a few px of each other in size, because scale is fixed by
// the export: a tier reads as an upgrade from what the building is MADE of and
// from the stars over its roof, never from being bigger. Timber becomes stone.
const watchtower = {
  sprite: 'archery_t1',
  spriteTrim: TOWER_TRIM,
  w: drawnW(TOWER_TRIM), h: drawnH(TOWER_TRIM),
  // The MIDDLE of the deck, source pixel (506.5, 438.6) inside the 1024 canvas.
  //
  // NOT the middle of the trim: the ladder and the flagpole hang off opposite
  // sides and drag the box centre away from the deck. The deck is found from the
  // four corner posts instead, and the mount is where the parallelogram's
  // diagonals cross. Anchor the archer to the art, never to the bounding box the
  // exporter happened to produce.
  //
  // The corners are the tops of the four legs, read out of the SVG: (356, 460),
  // (466, 382), (651.5, 418) and (554, 505). Those four have not moved across
  // two redraws — it is the rails between them that keep changing height, and a
  // rail is not what fixes the deck.
  mountFrac: [0.489, 0.378],
  // Where the building meets the ground: the centre of its shadow ellipse,
  // source (507.3, 735.6). See towerBox in src/towers.js for why this and not
  // the bounding box, and run tools/shadow.mjs to re-measure it.
  //
  // The tool fits the ellipse rather than reading its extremes, because the log
  // and the ladder lie across this one and hide its left and right tips at
  // different heights. Reading the tips put it 9px low.
  groundFrac: [0.490, 0.871],
  // The post on the deck's NEAREST corner — source x 547..560, from y 399 down
  // past the planks — crosses the archer's legs, so it is re-drawn over him.
  // One rect, tight to the post.
  //
  // The far corner's post is the trap here, exactly as it is on tier 2: it sits
  // at x 459..473, well inside the archer's span, and it is BEHIND him. A rect
  // generous enough to take both would paint a brown bar across his chest.
  frontTrims: [[547, 397, 15, 60]],
  // The near-left railing, as a polygon in the same source pixels. It runs
  // diagonally along the deck's near-left edge, from the left corner down to the
  // near corner, so a rect around it takes the deck behind it too. Traced from
  // the rail outline in the SVG and padded 5px for the black stroke the PNG
  // draws around a shape the SVG stores without one.
  //
  // There is only one now. The near-RIGHT edge has no rail on either tier — that
  // is the side the ladder comes up — and the previous drawing's second polygon
  // was tracing the deck's edge board, which is below the archer's feet and
  // never covers him.
  //
  // The rail was lowered in the redraw to give the archer more room, and it
  // shows in the numbers: it crosses him from x 438 to about x 484 and only
  // across his shins. Past that it passes below his feet entirely.
  frontPolys: [
    [[352, 419], [560, 462], [558, 480], [350, 438]]
  ],
  shape: 'tower'
};

// Tier 2: the same tower with a roof on it, and parts of the building are nearer
// the camera than the archer under it, so they have to be drawn OVER him. See
// frontTrims below.
const watchtower2 = {
  sprite: 'archery_t2',
  spriteTrim: TOWER2_TRIM,
  w: drawnW(TOWER2_TRIM), h: drawnH(TOWER2_TRIM),
  // The MIDDLE of the deck, source pixel (541.2, 505.2) in the 1024 canvas,
  // found the same way as tier 1's: leg tops at (391, 526), (501, 449),
  // (687, 485), (589, 572), mount where the diagonals cross.
  //
  // The whole drawing shifted about (-1, -2) between exports and the deck came
  // with it, which is the reassuring answer: the tower was redrawn, not
  // rebuilt. Re-measured anyway rather than nudged, because a fraction of a box
  // that changed shape is a different point.
  mountFrac: [0.568, 0.491],
  // Shadow centre, source (545.3, 802.5). Note it is NOT 0.5 across: the
  // flagpole leans out one side of the drawing, so centring the box put the
  // tower 7px left of where it should stand.
  groundFrac: [0.578, 0.890],
  // The near corner post, source x 583..596, running the whole height of the
  // tower from the roof at y=374 down through the deck to y=563. It is between
  // the archer and the camera for his entire height, so this rect is taller
  // than tier 1's — it has to cover him from over his helmet to under his feet.
  //
  // Tight to the post on purpose: the deck planks are behind it at the same x,
  // and two columns of deck painted over the archer is two columns too many.
  frontTrims: [[583, 392, 15, 130]],
  // The near-left railing — see the note on tier 1's. Same single rail, same
  // 5px pad, lowered by the same redraw.
  frontPolys: [
    [[387, 487], [594, 530], [592, 548], [385, 506]]
  ],
  shape: 'tower'
};

// Tier 3: a stone keep with a roofed timber deck on top. Tiers 1 and 2 are
// timber towers on splayed legs; this one is masonry, so it is 14px narrower and
// the same height. Nothing is shared with tier 2 any more.
const watchtower3 = {
  sprite: 'archery_t3',
  spriteTrim: TOWER3_TRIM,
  w: drawnW(TOWER3_TRIM), h: drawnH(TOWER3_TRIM),
  // The MIDDLE of the deck, source (509.5, 502.0), and it is found differently
  // from the two tiers below because the building is built differently. There
  // are no leg tops to take: the deck is the top FACE of the stone keep, one
  // path in the SVG with corners (467.3, 445.1), (659.9, 474.7), (555.9, 564.9)
  // and (350.6, 517.6), and the four roof posts stand ON it rather than holding
  // it up. The check that it is the right face is that the posts land on those
  // corners — the left post's foot is (350.6, 517.6) to the pixel.
  //
  // That face is not a parallelogram: its diagonals cross 10.9px apart at their
  // midpoints, so tiers 1 and 2's "where the diagonals cross" is not defined on
  // it and lands 7px off. This is the polygon's AREA CENTROID, which is the same
  // point on a true parallelogram and the right one here.
  mountFrac: [0.493, 0.487],
  // Shadow centre, source (512.3, 802.4). The SVG's shadow path spans
  // 335.6..689.9 by 724.4..881.5, centre (512.75, 802.95) — the fit is 0.7px off
  // it without being shown the SVG, the same check tier 1 passes.
  groundFrac: [0.501, 0.890],
  // The near corner post: a single 13x191 timber from (549.4, 373.0) to
  // (562.8, 563.8), padded 2px for the black stroke the PNG draws around it.
  // Taller than either tier below, but for the opposite reason to tier 2's —
  // tier 2's post runs DOWN past the deck through the tower, and this one runs
  // UP from a deck that is already at the top of a stone keep.
  //
  // The far post at x 466..479 is the usual trap: it is inside the archer's span
  // and behind him, so the rect stays tight to the near one.
  frontTrims: [[547, 370, 18, 197]],
  // NO frontPolys, and that is measured rather than forgotten. There IS a
  // near-left timber — (358.4, 492.2) (556.1, 534.7) (554.3, 543.4)
  // (356.5, 500.9) — and it looks like the rail tiers 1 and 2 need a polygon
  // for. It is not one: the archer stands at y=502 and that beam runs at
  // y=525..534 under him, never rising above y=510 anywhere across his 141px
  // span. It is the deck's near edge board. The rails have been lowered in every
  // redraw and on this tower they have gone under the floor.
  shape: 'tower'
};

const archer = {
  gunner: 'archer_t1',
  gunnerTrim: ARCHER_TRIM,
  // THE CENTRE OF HIS GROUND SHADOW, source (252, 303). Not his feet, not the
  // middle of his box: the artist now draws a grey ellipse under every figure,
  // and that ellipse is where the figure stands. `node tools/shadow.mjs` reads
  // it straight out of the PNG.
  //
  // This used to be guesswork dressed up as measurement — "the middle of his
  // torso, at the rows where the bow arc separates from the body" — and it was
  // wrong twice, once by 13px. The shadow removes the judgement call entirely:
  // the artist decides where he stands by drawing it, and the code reads it.
  //
  // A gunner also mirrors about this point, so it has to be the body's middle or
  // he jumps sideways when he turns. The shadow's centre is exactly that.
  gunnerPivot: [0.472, 0.891],
  spriteFaces: -1,
  // Where the arrow leaves the bow, as an offset from the anchor above. The bow
  // is the brown arc in front of him and it bulges forward, so its grip — the
  // point an arrow rests on — is the arc's frontmost pixel at its vertical
  // middle: source (190, 255), which is 62 in front of the anchor and 48 above.
  //
  // Kept as fractions of the trim, not source pixels. Written as pixels it was
  // 14.2 and 22.6 against a 200px export, and a 512px re-export left those
  // numbers looking fine while silently moving the arrow's origin to a third of
  // the way up the archer's shin.
  muzzle: [Math.round(0.431 * ARCHER_TRIM[2] * SCALE), -Math.round(0.403 * ARCHER_TRIM[3] * SCALE)]
};

// Tier 2's archer: helmet instead of a hat, and a slightly different box. Every
// anchor here is a fraction of a trim, and this trim is not tier 1's, so the
// fractions differ even where the drawing does not.
//
// Nothing here is derived from tier 1 any more. Both are measured from their own
// shadow and their own bow, and they agree to within a pixel — which is the
// check that the measurement is real rather than a number carried across.
const archer2 = {
  gunner: 'archer_t2',
  gunnerTrim: ARCHER2_TRIM,
  // The centre of his ground shadow, source (253, 304) — a pixel from tier 1's.
  gunnerPivot: [0.476, 0.892],
  spriteFaces: -1,
  // Same bow, grip at source (190, 256.5): 63 in front of the anchor and 47.5
  // above. Different fractions from tier 1 because the box differs, and they
  // round to exactly tier 1's [13, -10] — two measurements describing one bow.
  muzzle: [Math.round(0.438 * ARCHER2_TRIM[2] * SCALE), -Math.round(0.389 * ARCHER2_TRIM[3] * SCALE)]
};

// Tier 3's archer, and the first one tier 3 has had of its own — it borrowed
// tier 2's man for as long as it borrowed tier 2's tower. The tower is still
// borrowed; only the man on it is new.
//
// Plate armour instead of a leather jerkin, and he stands a little higher in his
// own box, which is the whole reason none of these numbers could be carried
// across: a fraction of a box that changed shape is a different point.
const archer3 = {
  gunner: 'archer_t3',
  gunnerTrim: ARCHER3_TRIM,
  // The centre of his ground shadow, source (253.5, 296.1).
  gunnerPivot: [0.479, 0.910],
  spriteFaces: -1,
  // Same bow, measured the same way: the arc's frontmost pixel at its vertical
  // middle, taken 5px inside the outline because that is the face the arrow
  // rests on. Source (191, 244), which is 62.5 in front of the anchor and 52.1
  // above.
  //
  // The sideways figure rounds to 13 like both tiers below it — three drawings
  // of one bow — but the height is 11 rather than 10, and that is real: this
  // archer carries the bow higher relative to where he stands.
  muzzle: [Math.round(0.443 * ARCHER3_TRIM[2] * SCALE), -Math.round(0.431 * ARCHER3_TRIM[3] * SCALE)]
};

// Range up across the board and cooldown down with it. The reach is what makes
// a tower feel useful in the first three waves, when there is only one or two of
// them on the map; the slower draw is what stops that reach turning archery into
// the only family worth building. Both were moved together and the pair was
// re-checked against tools/sim.mjs, not tuned one at a time.
//
// 150/170/190 -> 190/210/230 when reach became an ELLIPSE (see src/ground.js).
// This is not a buff. The number is now the reach ACROSS; the reach up and down
// is 62% of it, so a tier 1 tower covers 190 x 118 where it covered 150 x 150 —
// 8% MORE area, chosen to land the per-plot road coverage back on roughly what
// it was rather than to make archery stronger. It measured out at almost exactly
// even: the seven usable plots covered 93.5% of the road as circles at 150 and
// cover 95.7% as ellipses at 190.
//
// What did change is the SHAPE of what a plot is worth, and that is a real
// gameplay difference rather than a cosmetic one. A tower now reaches much
// further along a road running past it and much less far up a road running away
// from it, so a plot beside a straight is worth more than it was and a plot
// above a bend is worth less. Plot 0 went from being in none of the winning
// builds to being in three of the four.
export const archery = [
  { ...watchtower,  ...archer,  tier: 1, name: 'Watchtower',     cost: 70,  damage: 9,  range: 190, cooldown: 1.00, colour: '#9C7248' },
  { ...watchtower2, ...archer2, tier: 2, name: 'Archer Post',    cost: 90,  damage: 15, range: 210, cooldown: 0.90, colour: '#7A5230' },
  { ...watchtower3, ...archer3, tier: 3, name: 'Crossbow Tower', cost: 140, damage: 24, range: 230, cooldown: 0.80, colour: '#B8B2A4' }
];

// Barracks. These do not shoot — `range` is how far from the tower the rally
// point may sit, not a weapon range. The player moves that rally point, so the
// number is a real upgrade rather than bookkeeping.
//
// 130/165/200 -> 165/180/195: a much longer leash at tier 1 and a much smaller
// one per upgrade. Two things forced it, and they compound.
//
// The tier 2 barracks is the biggest building in the game and the plot markers
// were redrawn bigger to hold it, which slid every plot further from the road.
// Then reach became elliptical, and a barracks needs to reach the road, which is
// mostly the direction the ellipse is SHORT in. The minimum range that touches
// the road at all went from 51..142 across the nine plots to 82..151 — at the
// old 130, the tier 1 squad at plots 0 and 6 could barely leave the building,
// and at plot 2 it could not reach the road at all.
//
// 165 clears the worst usable plot (6, which needs 126) by 39. Taking the
// upgrade steps down from 35 to 15 is what keeps that from being a straight
// buff: tier 3's leash is 195 where it used to be 200, so the barracks now
// starts most of the way to its ceiling instead of climbing to it. A first
// barracks is immediately useful; upgrading one is about the men, not the map.
//
// None of this shows up in tools/sim.mjs, which never moves a rally point — the
// number is the size of a choice the player makes, and the sim does not make it.
//
// soldier.count stays at 3 across all tiers on purpose: how many enemies you can
// hold at once is the dominant balance lever, so upgrades make the same wall
// tougher rather than wider.
//
// soldier.damage went 4/5/6 -> 3/4/5 when the men learned to gang up on an enemy
// a squadmate is already blocking (see updateUnits). Three men hitting one enemy
// is three times the damage, and at the old numbers that alone took the best
// all-barracks build from losing on wave 3 to winning with 9 lives out of 20 —
// which breaks the one rule the level has. The assist is what was asked for and
// it stayed; its price was one point off each tier's damage.
const camp = {
  sprite: 'barracks_t1',
  spriteTrim: CAMP_TRIM,
  w: drawnW(CAMP_TRIM), h: drawnH(CAMP_TRIM),
  // Shadow centre, source (521.1, 605.4). This is the one that was visibly
  // wrong under the old bounding-box rule: the stakes planted in front of the
  // tent reach 68 source px below the shadow, and the box pinned THEM to the
  // ground, standing the whole tent 22px too high on its plot.
  groundFrac: [0.515, 0.678],
  shape: 'camp'
};

// Tier 2's barracks: a log hut where tier 1 is a tent, and the biggest building
// in the game — 128x129 game px against the tent's 125x108 and the tier 2
// watchtower's 88x153. It is the reason the artist redrew the plot marker
// bigger, so re-check tools/hud-clear.mjs whenever either of them changes.
//
// Tier 3 borrows this rather than the tent, for the same reason tier 3 archery
// borrows the tier 2 tower: an upgrade must never look like less than the tier
// below it.
const camp2 = {
  sprite: 'barracks_t2',
  spriteTrim: CAMP2_TRIM,
  w: drawnW(CAMP2_TRIM), h: drawnH(CAMP2_TRIM),
  // Shadow centre, source (503.8, 696.8).
  groundFrac: [0.487, 0.793],
  shape: 'camp'
};

// Tier 3's barracks: the tent and the log hut become a stone hall. 128x127
// against tier 2's 128x129 — the same building in stone, so the plot marker that
// was redrawn to hold tier 2 still holds this, and the HUD ceiling has not moved.
const camp3 = {
  sprite: 'barracks_t3',
  spriteTrim: CAMP3_TRIM,
  w: drawnW(CAMP3_TRIM), h: drawnH(CAMP3_TRIM),
  // Shadow centre, source (504.2, 701.8). PNG-only like the other two huts —
  // there is no SVG to check it against, and none is needed: nothing in a
  // barracks has to be drawn in front of anything, because it has no gunner.
  groundFrac: [0.487, 0.806],
  shape: 'camp'
};

// The soldier's collision radius is DERIVED from the drawn art, not chosen, so
// the formation and tools/formation.mjs always agree with what you can see.
const SPEAR_W = drawnW(SPEAR_TRIM);
const SPEAR_BODY = 0.341;

const spearman = {
  sprite: 'soldier_t1',
  spriteTrim: SPEAR_TRIM,
  // Feet on the anchor, standing axis of the legs across — the same convention
  // as the archer's gunnerPivot, so "where a figure is" means one thing.
  pivot: [0.657, 0.903],
  bodyFrac: SPEAR_BODY,
  spriteFaces: -1,
  // A spearman leaves a body too, then musters again from the barracks once his
  // respawn timer runs out. The body is scenery and nothing else — a dead
  // soldier stops blocking the instant he falls, so the enemy he was holding
  // walks straight over him.
  //
  // deadPivot is the centre of the corpse's OWN ground shadow, measured by
  // tools/shadow.mjs — not derived from the living figure any more; see the note
  // in data/waves.js for what that used to cost.
  dead: 'dead_soldier_t1',
  deadTrim: [153, 206, 206, 100],
  deadPivot: [0.078, 0.697],
  r: Math.round(SPEAR_W * SPEAR_BODY / 2),
  lunge: 6            // px thrust when the spear goes in
};

// Tier 2's spearman: helmet instead of a hat, and the artist drew him 17px right
// and 19px down the same canvas. Same body, different box, so every fraction
// below had to be re-derived even though nothing about the man changed.
//
// Tiers 2 and 3 no longer share a drawing — tier 3 has its own knight below.
//
// The 17/19 is measured, not eyeballed: it is the shift that best overlays the
// two silhouettes (IoU 0.80). It is the BODY that agrees at that shift, not the
// spear — the spear is drawn a little differently, which is also why the trim
// did not simply move with the figure. The body is the right thing to match: a
// man stands where his body is.
const SPEAR2_W = drawnW(SPEAR2_TRIM);
// The same 59 source px of torso as tier 1, over a 166-wide box instead of 172.
// Both come out at r = 6, so the collision radius — and the formation, and the
// balance that rests on it — is unchanged by the new artwork.
const SPEAR2_BODY = 0.354;

const spearman2 = {
  sprite: 'soldier_t2',
  spriteTrim: SPEAR2_TRIM,
  // Tier 1's feet plus (17, 19): source (281.0, 313.4).
  pivot: [0.753, 0.908],
  bodyFrac: SPEAR2_BODY,
  spriteFaces: -1,
  dead: 'dead_soldier_t2',
  deadTrim: [158, 198, 195, 116],
  // The centre of this corpse's own shadow.
  deadPivot: [0.131, 0.583],
  r: Math.round(SPEAR2_W * SPEAR2_BODY / 2),
  lunge: 6
};

// Tier 3's soldier: a knight in plate with a sword, and the narrowest box of the
// three because a sword held across the chest reaches nowhere near as far as a
// spear does. 114 wide against 172 and 166 — which is exactly why bodyFrac has
// to be re-measured rather than carried across. The same fraction on a box that
// lost a third of its width would make a wider man, not a narrower box.
const SPEAR3_W = drawnW(SPEAR3_TRIM);
// 59 source px of torso again, over a 114-wide box. All three tiers come out at
// r = 6, so the collision radius — and the formation, and the balance resting on
// it — is untouched by the new artwork. That is worth checking rather than
// assuming every time: the radius is derived from the drawing, so a redraw can
// move it without anyone deciding to.
const SPEAR3_BODY = 0.518;

const spearman3 = {
  sprite: 'soldier_t3',
  spriteTrim: SPEAR3_TRIM,
  // The centre of his ground shadow, source (278.0, 304.3).
  pivot: [0.693, 0.903],
  bodyFrac: SPEAR3_BODY,
  spriteFaces: -1,
  dead: 'dead_soldier_t3',
  deadTrim: [168, 211, 176, 90],
  // The centre of this corpse's own shadow, source (197.5, 279.3).
  deadPivot: [0.168, 0.759],
  r: Math.round(SPEAR3_W * SPEAR3_BODY / 2),
  lunge: 6
};

export const barracks = [
  {
    ...camp, tier: 1, name: 'Militia Camp', cost: 70, range: 165, colour: '#6E7A6A',
    soldier: { ...spearman, count: 3, hp: 105, damage: 3, cd: 0.95, speed: 62, respawn: 8, regen: 4, colour: '#7C93B8' }
  },
  {
    ...camp2, tier: 2, name: 'Guard Post', cost: 100, range: 180, colour: '#5E6B5C',
    soldier: { ...spearman2, count: 3, hp: 145, damage: 4, cd: 0.90, speed: 66, respawn: 7, regen: 5, colour: '#6E86B4' }
  },
  {
    ...camp3, tier: 3, name: "Knight's Hall", cost: 150, range: 195, colour: '#8A8478',
    soldier: { ...spearman3, count: 3, hp: 195, damage: 5, cd: 0.85, speed: 70, respawn: 6, regen: 6, colour: '#5C79AE' }
  }
];

// Arrow. The only sprite that rotates: it points where it is flying. Drawn
// pointing left in the source, same as the figures.
export const arrow = {
  sprite: 'arrow_t1',
  trim: [203, 246, 100, 20],
  faces: -1
};

// The four quadrants of the build menu, in N/E/S/W order. A family with no
// tiers yet still takes its quadrant, drawn locked — the layout is the same
// on day one as it will be when all four are in, so nothing moves under the
// player's thumb as families land.
export const families = [
  { id: 'archery',   name: 'Archery',   glyph: 'bow',      tiers: archery },
  { id: 'barracks',  name: 'Barracks',  glyph: 'swords',   tiers: barracks },
  { id: 'siege',     name: 'Siege',     glyph: 'catapult', tiers: null },
  { id: 'monastery', name: 'Monastery', glyph: 'cross',    tiers: null }
];

export const projectileSpeed = 360;
