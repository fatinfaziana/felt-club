/* ===================== which games get what =====================
   3D scenes (you play inside them): chess, mini golf, archery, darts, pool, carrom.
   Card and casino tables: a 3D room around the normal 2D table (card rooms keep their cards in 2D, large and readable).
   Everything else is plain 2D. */
(() => {
  const SCENES = ['chess', 'minigolf', 'archery', 'darts', 'pool', 'carrom'];
  const ROOMS = { poker: 1, bigtwo: 0, rush: 0, blackjack: 1, threecard: 1, caribbean: 1, letitride: 1, reddog: 1, baccarat: 1, videopoker: 0, roulette: 1, sicbo: 1, craps: 1, slots: 0, keno: 0 };
  for (const id of Object.keys(Club.games)) {
    const D = Club.games[id];
    if (SCENES.includes(id)) continue;
    if (id in ROOMS && T3.ambient) D.ui3d = T3.ambient(D.ui, id, !!ROOMS[id]); else delete D.ui3d;
  }
})();
