// THE STORY, a few sentences per stage, shown on a torn scrap of paper in the
// stage panel at the owner's word. Keyed by the level's id rather than by its
// place on the road, so a board that moves along the map takes its words with it.
//
// The arc: the thugs come out of nowhere at Oakhaven; the player falls back town
// by town while each one lends what it has; Sandshroud and Serene Peak are stops
// to ask for help; the crows lead to the lair in the Dark Hollow. Fernshadow's
// silence stays unexplained on purpose, for later.
//
// "Do not", not "don't": no contractions, at the owner's word, as in the tutorial.
//
// tools/story.mjs checks every board has a line here, and that each fits its paper.
export const STORY = {
  m0: 'A quiet morning in Oakhaven, until thugs come pouring out of the western woods. ' +
    'Nobody knows where they came from, only that there are a lot of them. Hold the village ' +
    'long enough for its people to get away.',
  m4: 'The village has fallen, but its people are still on the road. Now the thugs have ' +
    'archers who shoot from a distance, and your soldiers will not chase them, so let your ' +
    'towers deal with them.',
  m5: 'Winchester\'s gates are shut, and its guards do not trust a general from a burned ' +
    'village. Prove yourself at the entrance, and its crossbowmen will fight from your ' +
    'towers. Watch for thugs with shields: they raise them against arrows and come on ' +
    'slowly.',
  m6: 'Winchester\'s carpenters lend you their siege machines and their workshop. You will ' +
    'need them, because the thugs have brought giants whose clubs break armor.',
  m7: 'The thugs throw everything at the castle walls, and Winchester fights beside you now. ' +
    'Hold the castle and the town is safe, but the army only grows, and it turns east toward ' +
    'Dawnford.',
  m8: 'Dawnford sits across the river, and the bridge is the only way in. Its paladins ride ' +
    'out to hold it with you. Stop the thugs here. Their plague doctors throw poison flasks ' +
    'that armor will not stop.',
  m9: 'The thugs reach the town square. Dark priests walk among them, healing their wounded ' +
    'and warded against magic. Dawnford\'s clerics raise their High Altar against them. ' +
    'Something darker than a band of thieves is behind this army.',
  m10: 'The church bell rings for every wave. The thugs want the heart of Dawnford, and its ' +
    'clerics and paladins make their stand beside you. Protect the church, and the town ' +
    'stands with you.',
  m11: 'Sandshroud has held its walls for weeks, but some thugs here move unseen until a ' +
    'soldier catches them. Drive them off, and its assassins, who know how to fight from the ' +
    'shadows, may lend you their blades.',
  m12: 'Ironforge forges the finest steel in the land, and the thugs want it. Its smiths ' +
    'hand you their first muskets. Here, close to the Dark Hollow, the sky is full of crows, ' +
    'and now they attack too. They fly over your soldiers, so only archers and monastery ' +
    'towers can bring them down.',
  m13: 'The thugs storm the factory for its gunpowder, and some are already strapping it to ' +
    'their backs. Shoot the bomb thugs down before they reach your soldiers. Hold the ' +
    'factory, and the smiths will roll out their cannon.',
  m14: 'Ironforge\'s last stand, and the crows never stop cawing from the north. Riders went ' +
    'out to every town; all but one came back with an answer. From Fernshadow, there was ' +
    'only silence. Win here, and the rest fight under one banner.',
  m15: 'The monks of Serene Peak hold the only pass to the Dark Hollow, but giants hurling ' +
    'boulders have taken it. Spread your men out and clear the pass, and the monks will ' +
    'march with you.',
  m16: 'Follow the crows, and the road no one ever found opens into the Dark Hollow. To the ' +
    'west, Fernshadow\'s trees stand thicker still; its people watch, and do not come. Here ' +
    'the thugs wave war banners that make their friends hit harder. Cut them down first.',
  m17: 'The thugs\' lair, and the Captain who has led them from the start. Shield, bow and ' +
    'sword, and when he is wounded he fights on with a magic blade. Bring him down, and his ' +
    'army loses its head. But the crows still circle the citadel behind him.',
  m18: 'Behind the lair stands the citadel of the Crow Harbinger, the sorcerer who sent the ' +
    'crows. From his balcony he blinds your towers and calls the flock down on the road. ' +
    'Hold out, and he will come down to face you himself. End him, and the crows leave the ' +
    'sky for good.'
};
