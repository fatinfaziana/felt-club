/* ---------- Tic-Tac-Toe: two players ---------- */
(function () {
const ANTE = 20;
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const winLine = b => LINES.find(l => b[l[0]] >= 0 && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) || null;
const open = b => b.map((v, i) => (v < 0 ? i : -1)).filter(i => i >= 0);
function mm(b, who, me) {                       // best outcome for `me` if `who` is to move
  const w = winLine(b); if (w) return b[w[0]] === me ? 10 : -10;
  const o = open(b); if (!o.length) return 0;
  let best = who === me ? -99 : 99;
  for (const i of o) { b[i] = who; const v = mm(b, 1 - who, me) + (who === me ? -0.01 : 0.01); b[i] = -1; best = who === me ? Math.max(best, v) : Math.min(best, v); }
  return best;
}
function botMove(b, me) {
  const o = open(b);
  if (Math.random() < 0.15) return o[rnd(o.length)];
  let best = o[0], bs = -99;
  for (const i of shuffle(o.slice())) { b[i] = me; const v = mm(b, 1 - me, me); b[i] = -1; if (v > bs) { bs = v; best = i; } }
  return best;
}
async function round(G, io) {
  const P = G.players;
  const F = G.t = { b: Array(9).fill(-1), turn: (G.round - 1) % 2, over: false, winner: -1, line: [] };
  io.render(); await io.sleep(400);
  while (!F.over) {
    const i = F.turn, p = P[i];
    io.render();
    const a = await io.turn(p, {}, { auto: { t: 'mark', i: open(F.b)[0] },
      validate: x => (x && x.t === 'mark' && Number.isInteger(x.i) && x.i >= 0 && x.i < 9 && F.b[x.i] < 0 ? { t: 'mark', i: x.i } : null),
      bot: () => ({ t: 'mark', i: botMove(F.b.slice(), i) }), think: 700 + Math.random() * 400 });
    F.b[a.i] = i; io.ev(p, `plays square ${a.i + 1}`, `play square ${a.i + 1}`);
    const w = winLine(F.b);
    if (w) { F.over = true; F.winner = i; F.line = w; } else if (!open(F.b).length) F.over = true; else F.turn = 1 - i;
    io.render();
  }
  settlePot(G, ANTE, F.winner >= 0 ? [F.winner] : []); potSummary(G);
  if (F.winner < 0) io.line('A draw. Nobody wins.', true);
  io.render();
}
function view(G) {
  const F = G.t;
  if (!F) return { b: Array(9).fill(-1), turn: -1, over: false, winner: -1, line: [], delta: [] };
  return { b: F.b, turn: F.over ? -1 : F.turn, over: F.over, winner: F.winner, line: F.line, delta: G.players.map(p => (F.over ? p.delta || 0 : 0)) };
}
let S0 = null;
const ui = {
  mount(stage) {
    stage.innerHTML = `<section class="table c4wrap"><div class="bt-opps" id="tsSeats"></div><div class="ttt" id="ttt">${Array.from({ length: 9 }, (_, i) => `<button type="button" class="ttt-c" data-i="${i}" aria-label="Square ${i + 1}"></button>`).join('')}</div><div class="banner" id="tsBanner" aria-live="polite"></div><p class="hint bt-hint" id="tsHint"></p></section>`;
    $('ttt').onclick = e => { const b = e.target.closest('[data-i]'); if (b && S0 && S0.turn) S0.send({ t: 'mark', i: +b.dataset.i }); };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    $('tsSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Choosing…' });
    document.querySelectorAll('#ttt .ttt-c').forEach(el => {
      const i = +el.dataset.i, v = g.b[i];
      el.className = 'ttt-c' + (v >= 0 ? ' p' + v : '') + (g.line.includes(i) ? ' win' : '');
      el.textContent = v < 0 ? '' : v === 0 ? '✕' : '○'; el.disabled = v >= 0 || !S.turn;
    });
    $('tsBanner').innerHTML = g.over && V.summary.length ? `<span>${g.winner >= 0 ? S.text(V.summary.find(e => e.p === g.winner) || V.summary[0]) : 'A draw. Everyone keeps their chips.'}</span>` : '';
    $('tsHint').textContent = S.turn ? 'Your turn. Tap an empty square.' : '';
    return '';
  },
};
Club.register({
  id: 'tictactoe', cat: 'mind', name: 'Tic-Tac-Toe', tag: 'Three in a row wins. A quick duel for two.', min: 2, max: 2, soloBots: 1, roundWord: 'Game',
  art: () => ['✕', '○', '✕'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> get three of your marks in a row before your opponent.</p>
    <ol><li>Two players take turns. One plays ✕ (gold), the other ○ (cream). The first player changes each game.</li>
    <li>On your turn, tap an empty square to place your mark.</li>
    <li>Three in a row across, down or diagonally wins.</li>
    <li>If all nine squares fill up with no line, it is a draw.</li>
    <li>Each player puts in ${ANTE} chips and the winner takes both stakes. A draw returns the chips.</li></ol>`,
  round, view, ui, _test: { botMove, winLine },
});
})();
