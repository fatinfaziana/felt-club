/* ---------- 2048: slide and merge tiles. Everyone plays their own board, one move each in turn ---------- */
(function () {
const ANTE = 20, MAXM = 120;
const dirs = ['up', 'right', 'down', 'left'];
function slideLine(line) {
  const v = line.filter(x => x), out = []; let gain = 0;
  for (let i = 0; i < v.length; i++) { if (v[i] === v[i + 1]) { out.push(v[i] * 2); gain += v[i] * 2; i++; } else out.push(v[i]); }
  while (out.length < 4) out.push(0);
  return { out, gain };
}
function slide(b, d) {   // d: 0 up, 1 right, 2 down, 3 left
  const nb = b.slice(); let gain = 0;
  for (let k = 0; k < 4; k++) {
    const idx = [0, 1, 2, 3].map(j => (d === 3 ? k * 4 + j : d === 1 ? k * 4 + 3 - j : d === 0 ? j * 4 + k : (3 - j) * 4 + k));
    const r = slideLine(idx.map(i => b[i])); gain += r.gain; idx.forEach((i, j) => { nb[i] = r.out[j]; });
  }
  return { b: nb, gain, moved: nb.some((x, i) => x !== b[i]) };
}
function spawn(b) { const e = b.map((x, i) => (x ? -1 : i)).filter(i => i >= 0); if (e.length) b[e[rnd(e.length)]] = Math.random() < 0.9 ? 2 : 4; return b; }
const canMove = b => [0, 1, 2, 3].some(d => slide(b, d).moved);
function botMove(b) {
  let best = -1, bs = -1e9;
  for (let d = 0; d < 4; d++) { const r = slide(b, d); if (!r.moved) continue; const empt = r.b.filter(x => !x).length, corner = Math.max(r.b[12], r.b[15]) === Math.max(...r.b) ? 40 : 0, s = r.gain + empt * 6 + corner + Math.random() * 6 + (d === 0 ? -8 : 0); if (s > bs) { bs = s; best = d; } }
  return best;
}
async function round(G, io) {
  const P = G.players, n = P.length;
  const R = G.g48 = { boards: P.map(() => spawn(spawn(Array(16).fill(0)))), score: P.map(() => 0), moves: P.map(() => 0), done: P.map(() => false), turn: 0, over: false, winners: [], hit: -1 };
  io.render(); await io.sleep(400);
  while (!R.over) {
    const act = R.done.map((d, i) => (d ? -1 : i)).filter(i => i >= 0);
    if (!act.length) break;
    const i = act.includes(R.turn) ? R.turn : act.find(x => x > R.turn) ?? act[0], p = P[i], b = R.boards[i]; R.turn = i;
    io.render();
    const first = [0, 1, 2, 3].find(d => slide(b, d).moved);
    const a = await io.turn(p, { moves: R.moves[i] }, { auto: { t: 'move', d: first }, validate: x => (x && x.t === 'move' && x.d >= 0 && x.d <= 3 && slide(b, x.d | 0).moved ? { t: 'move', d: x.d | 0 } : null), bot: () => ({ t: 'move', d: botMove(b) }), think: 350 + Math.random() * 300 });
    const r = slide(b, a.d); r.b = spawn(r.b); R.boards[i] = r.b; R.score[i] += r.gain; R.moves[i]++;
    if (Math.max(...r.b) >= 2048) { R.hit = i; R.over = true; break; }
    if (!canMove(r.b) || R.moves[i] >= MAXM) { R.done[i] = true; io.ev(p, !canMove(r.b) ? 'has no moves left' : 'has used all their moves', !canMove(r.b) ? 'have no moves left' : 'have used all your moves'); }
    R.turn = (i + 1) % n;
  }
  R.over = true; const top = Math.max(...R.score); R.winners = R.hit >= 0 ? [R.hit] : R.score.map((s, i) => (s === top ? i : -1)).filter(i => i >= 0);
  settlePot(G, ANTE, R.winners); potSummary(G); io.render();
}
function view(G) {
  const R = G.g48;
  if (!R || R.boards.length !== G.players.length) return { boards: G.players.map(() => Array(16).fill(0)), score: G.players.map(() => 0), moves: G.players.map(() => 0), done: [], turn: -1, over: false, winners: [], delta: [], max: MAXM };
  return { boards: R.boards, score: R.score, moves: R.moves, done: R.done, turn: R.over ? -1 : R.turn, over: R.over, winners: R.winners, delta: G.players.map(p => (R.over ? p.delta || 0 : 0)), max: MAXM };
}
let S0 = null, kb = false;
const tile = v => `<div class="t48 v${Math.min(v, 4096)}">${v || ''}</div>`;
const ui = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table pz"><div class="bt-opps" id="g8Seats"></div><div class="g48" id="g8Board" tabindex="0" aria-label="2048 board"></div><div class="pz-label" id="g8Msg"></div><div class="banner" id="g8Banner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="g8Act" hidden><div class="g48pad"><button type="button" class="b" data-d="3" aria-label="Left">◀</button><button type="button" class="b" data-d="0" aria-label="Up">▲</button><button type="button" class="b" data-d="2" aria-label="Down">▼</button><button type="button" class="b" data-d="1" aria-label="Right">▶</button></div><p class="hint bt-hint">Slide with the arrow keys, by swiping the board, or with the buttons. Equal tiles merge. Reach 2048 to win outright.</p></div>`;
    const go = d => { if (!S0 || !S0.turn) return; const b = S0.V.g.boards[S0.me]; if (b && slide(b, d).moved) { Snd.p('pop'); S0.send({ t: 'move', d }); } };
    $('g8Act').onclick = e => { const b = e.target.closest('[data-d]'); if (b) go(+b.dataset.d); };
    if (!kb) { kb = true; document.addEventListener('keydown', e => { const d = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key]; if (d !== undefined && $('g8Board')) { e.preventDefault(); ui.go && ui.go(d); } }); }
    ui.go = go;
    let sx = 0, sy = 0; const bd = $('g8Board');
    bd.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    bd.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); }, { passive: true });
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g, me = S.me >= 0 ? S.me : 0;
    $('g8Seats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, won: g.winners, doing: 'Sliding…', extra: i => `${g.score[i]} pts · ${g.moves[i]}/${g.max}${g.done[i] ? ' · done' : ''}` });
    $('g8Board').innerHTML = (g.boards[me] || []).map(tile).join('');
    $('g8Msg').textContent = V.seats.length > 1 ? `Your score ${g.score[me]} · Move ${g.moves[me]} of ${g.max}` : `Score ${g.score[me]}`;
    $('g8Banner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('g8Act').hidden = !S.turn; return '';
  },
};
Club.register({
  id: 'g2048', cat: 'math', name: '2048', tag: 'Slide and merge tiles to build 2048.', min: 1, max: 4, soloBots: 1, roundWord: 'Game',
  art: () => ['2', '4', '2048'].map(c => `<div class="ltile num">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> make the biggest score, or build a <b>2048</b> tile.</p>
    <ol><li>Everyone has their own 4 by 4 board. Players take turns making one move each.</li>
    <li>Slide all tiles up, down, left or right (arrow keys, swipe, or the buttons). Tiles with the <b>same number merge</b> into one tile with double the value, and you score that value.</li>
    <li>After every move a new 2 or 4 appears. If no move is possible, your board is finished.</li>
    <li>You have ${MAXM} moves. The highest score wins. Anyone who makes a 2048 tile wins at once.</li>
    <li>Each player puts in ${ANTE} chips. Chips have no cash value.</li></ol>`,
  round, view, ui, _test: { slide, botMove },
});
})();
