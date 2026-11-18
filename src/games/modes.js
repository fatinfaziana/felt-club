/* ===================== which games are 3D =====================
   Only the games you play inside a scene keep 3D: chess, mini golf, archery and darts.
   Every other game, including all card and casino games, is plain 2D. */
(() => {
  const SCENES = ['chess', 'minigolf', 'archery', 'darts'];
  for (const id of Object.keys(Club.games)) if (!SCENES.includes(id)) delete Club.games[id].ui3d;
})();
