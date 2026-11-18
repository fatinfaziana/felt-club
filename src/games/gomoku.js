/* ---------- Gomoku: five in a row ---------- */
(function () {
const ANTE = 20, N = 11;
const D4 = [[0, 1], [1, 0], [1, 1], [1, -1]];
const at = (b, r, c) => (r >= 0 && r < N && c >= 0 && c < N ? b[r * N + c] : 9);
function lineWin(b, i) {
  const who = b[i], r = (i / N) | 0, c = i % N;
  for (const [dr, dc] of D4) {
    const cells = [i];
    for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (at(b, rr, cc) === who) { cells.push(rr * N + cc); rr += dr * s; cc += dc * s; } }
    if (cells.length >= 5) return cells;
  }
  return null;
}
function score(b, i, who) {      // how good is a stone at i for `who`
  const r = (i / N) | 0, c = i % N; let s = 0;
  for (const [dr, dc] of D4) {
    let n = 1, open = 0;
    for (const sg of [1, -1]) { let rr = r + dr * sg, cc = c + dc * sg, k = 0; while (at(b, rr, cc) === who) { k++; rr += dr * sg; cc += dc * sg; } n += k; if (at(b, rr, cc) === -1) open++; }
    s += n >= 5 ? 1e6 : n === 4 ? (open === 2 ? 1e4 : open === 1 ? 800 : 0) : n === 3 ? (open === 2 ? 600 : open === 1 ? 60 : 0) : n === 2 ? (open === 2 ? 40 : 6) : 1;
  }
  return s;
}
function botMove(b, me, lv = 1) {
  const empties = []; for (let i = 0; i < N * N; i++) if (b[i] < 0) empties.push(i);
  const any = b.some(v => v >= 0), c = (N * N - 1) / 2;
  if (!any) return c;
  let best = empties[0], bs = -1;
  for (const i of empties) {
    const r = (i / N) | 0, cc = i % N; let near = false;
    for (let dr = -2; dr <= 2 && !near; dr++) for (let dc = -2; dc <= 2; dc++) if (at(b, r + dr, cc + dc) >= 0 && at(b, r + dr, cc + dc) !== 9) { near = true; break; }
    if (!near) continue;
    const v = score(b, i, me) * 1.05 + score(b, i, 1 - me) + Math.random() * 3;
    if (v > bs) { bs = v; best = i; }
  }
  return Math.random() < [0.4, 0.06, 0][lv] ? empties[rnd(empties.length)] : best;
}
async function round(G, io) {
  const P = G.players;
  const F = G.gm = { b: Array(N * N).fill(-1), turn: (G.round - 1) % 2, over: false, winner: -1, line: [], last: -1, n: 0 };
  io.render(); await io.sleep(400);
  while (!F.over) {
    const i = F.turn, p = P[i]; io.render();
    const a = await io.turn(p, {}, { auto: { t: 'stone', i: F.b.indexOf(-1) },
      validate: x => (x && x.t === 'stone' && Number.isInteger(x.i) && x.i >= 0 && x.i < N * N && F.b[x.i] < 0 ? { t: 'stone', i: x.i } : null),
      bot: () => ({ t: 'stone', i: botMove(F.b.slice(), i, G.level) }), think: 700 + Math.random() * 500 });
    F.b[a.i] = i; F.last = a.i; F.n++;
    const w = lineWin(F.b, a.i);
    if (w) { F.over = true; F.winner = i; F.line = w; io.ev(p, 'makes five in a row', 'make five in a row'); }
    else if (F.n >= N * N) F.over = true; else F.turn = 1 - i;
    io.render();
  }
  settlePot(G, ANTE, F.winner >= 0 ? [F.winner] : []); potSummary(G); io.render();
}
function view(G) {
  const F = G.gm;
  if (!F) return { b: Array(N * N).fill(-1), turn: -1, over: false, winner: -1, line: [], last: -1, delta: [] };
  return { b: F.b, turn: F.over ? -1 : F.turn, over: F.over, winner: F.winner, line: F.line, last: F.last, delta: G.players.map(p => (F.over ? p.delta || 0 : 0)) };
}
let S0 = null;
const ui = {
  mount(stage) {
    stage.innerHTML = `<section class="table c4wrap"><div class="bt-opps" id="gmSeats"></div><div class="gm" id="gm">${Array.from({ length: N * N }, (_, i) => `<button type="button" class="gm-c" data-i="${i}" aria-label="Row ${((i / N) | 0) + 1}, column ${(i % N) + 1}"></button>`).join('')}</div><div class="banner" id="gmBanner" aria-live="polite"></div><p class="hint bt-hint" id="gmHint"></p></section>`;
    $('gm').onclick = e => { const b = e.target.closest('[data-i]'); if (b && S0.turn) S0.send({ t: 'stone', i: +b.dataset.i }); };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    $('gmSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Placing…' });
    document.querySelectorAll('#gm .gm-c').forEach(el => {
      const i = +el.dataset.i, v = g.b[i];
      el.className = 'gm-c' + (g.line.includes(i) ? ' win' : '') + (g.last === i ? ' last' : ''); el.disabled = v >= 0 || !S.turn;
      el.innerHTML = v >= 0 ? `<i class="rv-d p${v}"></i>` : '';
    });
    $('gmBanner').innerHTML = g.over && V.summary.length ? `<span>${g.winner >= 0 ? S.text(V.summary.find(e => e.p === g.winner) || V.summary[0]) : 'The board is full. A draw.'}</span>` : '';
    $('gmHint').textContent = S.turn ? 'Your turn. Tap an empty point.' : '';
    return '';
  },
};
Club.register({
  id: 'gomoku', cat: 'board', name: 'Gomoku', tag: 'Five in a row wins. Easy to learn, deep to master.', min: 2, max: 2, soloBots: 1, roundWord: 'Game', levels: true,
  art: () => ['p0', 'p1', 'p0'].map(c => `<div class="disc ${c}"></div>`).join(''),
  rules: `<p><b>Goal:</b> be first to line up <b>five</b> of your stones in a row.</p>
    <ol><li>Two players take turns. You are gold or cream.</li>
    <li>On your turn, tap any empty point on the board to place a stone.</li>
    <li>The first player to get five stones in an unbroken line, across, down or diagonally, wins.</li>
    <li>Watch your opponent’s lines. When they have four, you must block the end.</li>
    <li>If the board fills with no winner, it is a draw.</li>
    <li>Each player puts in ${ANTE} chips and the winner takes both stakes.</li></ol>`,
  round, view, ui, _test: { botMove, lineWin },
});
})();
