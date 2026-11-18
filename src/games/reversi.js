/* ---------- Reversi ---------- */
(function () {
const ANTE = 20, DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const W = [120,-20,20,5,5,20,-20,120, -20,-40,-5,-5,-5,-5,-40,-20, 20,-5,15,3,3,15,-5,20, 5,-5,3,3,3,3,-5,5,
           5,-5,3,3,3,3,-5,5, 20,-5,15,3,3,15,-5,20, -20,-40,-5,-5,-5,-5,-40,-20, 120,-20,20,5,5,20,-20,120];
function flips(b, i, who) {
  if (b[i] >= 0) return [];
  const r = i >> 3, c = i & 7, out = [];
  for (const [dr, dc] of DIRS) {
    const line = []; let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === 1 - who) { line.push(rr * 8 + cc); rr += dr; cc += dc; }
    if (line.length && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === who) out.push(...line);
  }
  return out;
}
const moves = (b, who) => { const m = []; for (let i = 0; i < 64; i++) if (b[i] < 0 && flips(b, i, who).length) m.push(i); return m; };
function put(b, i, who) { const f = flips(b, i, who); f.forEach(k => { b[k] = who; }); b[i] = who; return f.length; }
const evalR = (b, me) => { let s = 0; for (let i = 0; i < 64; i++) if (b[i] >= 0) s += (b[i] === me ? 1 : -1) * W[i]; return s + (moves(b, me).length - moves(b, 1 - me).length) * 6; };
function search(b, who, me, d, al, be) {
  const mv = moves(b, who);
  if (!mv.length) { const o = moves(b, 1 - who); if (!o.length) { const diff = b.filter(v => v === me).length - b.filter(v => v === 1 - me).length; return diff * 100; } return search(b, 1 - who, me, d, al, be); }
  if (d === 0) return evalR(b, me);
  let best = who === me ? -1e9 : 1e9;
  for (const i of mv) {
    const nb = b.slice(); put(nb, i, who); const v = search(nb, 1 - who, me, d - 1, al, be);
    if (who === me) { best = Math.max(best, v); al = Math.max(al, v); } else { best = Math.min(best, v); be = Math.min(be, v); }
    if (be <= al) break;
  }
  return best;
}
function botMove(b, who, lv = 1) {
  const mv = moves(b, who); if (Math.random() < [0.5, 0.1, 0][lv]) return mv[rnd(mv.length)];
  let best = mv[0], bs = -1e9;
  for (const i of mv) { const nb = b.slice(); put(nb, i, who); const v = search(nb, 1 - who, who, [1, 2, 3][lv], -1e9, 1e9) + Math.random() * 4; if (v > bs) { bs = v; best = i; } }
  return best;
}
const count = b => [b.filter(v => v === 0).length, b.filter(v => v === 1).length];
async function round(G, io) {
  const P = G.players, b = Array(64).fill(-1);
  b[27] = 1; b[28] = 0; b[35] = 0; b[36] = 1;
  const R = G.rv = { b, turn: (G.round - 1) % 2, over: false, winner: -1, last: -1 };
  io.render(); await io.sleep(400);
  while (!R.over) {
    let i = R.turn, mv = moves(R.b, i);
    if (!mv.length) {
      if (!moves(R.b, 1 - i).length) { R.over = true; break; }
      io.ev(P[i], 'has no move and passes', 'have no move and pass'); R.turn = 1 - i; i = R.turn; mv = moves(R.b, i);
    }
    io.render();
    const a = await io.turn(P[i], {}, { auto: { t: 'place', i: mv[0] },
      validate: x => (x && x.t === 'place' && Number.isInteger(x.i) && mv.includes(x.i) ? { t: 'place', i: x.i } : null),
      bot: () => ({ t: 'place', i: botMove(R.b.slice(), i, G.level) }), think: 900 + Math.random() * 500 });
    const k = put(R.b, a.i, i); R.last = a.i;
    io.ev(P[i], `flips ${k} disc${k === 1 ? '' : 's'}`, `flip ${k} disc${k === 1 ? '' : 's'}`);
    R.turn = 1 - i; io.render();
  }
  const [c0, c1] = count(R.b); R.winner = c0 === c1 ? -1 : c0 > c1 ? 0 : 1;
  settlePot(G, ANTE, R.winner >= 0 ? [R.winner] : []); potSummary(G);
  io.line(`Final count: ${c0} to ${c1}.`, true); io.render();
}
function view(G) {
  const R = G.rv;
  if (!R) return { b: Array(64).fill(-1), turn: -1, over: false, winner: -1, last: -1, delta: [] };
  return { b: R.b, turn: R.over ? -1 : R.turn, over: R.over, winner: R.winner, last: R.last, delta: G.players.map(p => (R.over ? p.delta || 0 : 0)) };
}
let S0 = null;
const ui = {
  mount(stage) {
    stage.innerHTML = `<section class="table c4wrap"><div class="bt-opps" id="rvSeats"></div><div class="rv" id="rv">${Array.from({ length: 64 }, (_, i) => `<button type="button" class="rv-c" data-i="${i}" aria-label="Square ${(i >> 3) + 1},${(i & 7) + 1}"></button>`).join('')}</div><div class="banner" id="rvBanner" aria-live="polite"></div><p class="hint bt-hint" id="rvHint"></p></section>`;
    $('rv').onclick = e => { const b = e.target.closest('[data-i]'); if (b && S0.turn) S0.send({ t: 'place', i: +b.dataset.i }); };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g, [c0, c1] = count(g.b), legal = S.turn && S.me >= 0 ? moves(g.b, S.me) : [];
    $('rvSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Placing…', extra: i => `${i ? c1 : c0} discs` });
    document.querySelectorAll('#rv .rv-c').forEach(el => {
      const i = +el.dataset.i, v = g.b[i], ok = legal.includes(i);
      el.className = 'rv-c' + (ok ? ' ok' : '') + (g.last === i ? ' last' : ''); el.disabled = !ok;
      el.innerHTML = v >= 0 ? `<i class="rv-d p${v}"></i>` : '';
    });
    $('rvBanner').innerHTML = g.over && V.summary.length ? `<span>${g.winner >= 0 ? S.text(V.summary.find(e => e.p === g.winner) || V.summary[0]) : 'A draw. Everyone keeps their chips.'}</span>` : '';
    $('rvHint').textContent = S.turn ? 'Your turn. Tap a highlighted square.' : '';
    return '';
  },
};
Club.register({
  id: 'reversi', cat: 'board', name: 'Reversi', tag: 'Trap your opponent’s discs between yours and flip them.', min: 2, max: 2, soloBots: 1, roundWord: 'Game', levels: true,
  art: () => ['p0', 'p1', 'p0'].map(c => `<div class="disc ${c}"></div>`).join(''),
  rules: `<p><b>Goal:</b> have more discs than your opponent when the board is full or nobody can move.</p>
    <ol><li>Two players take turns. You are gold or cream. The game starts with two discs of each colour in the middle.</li>
    <li>On your turn, tap a highlighted square. You can only place a disc where it <b>traps one or more of your opponent’s discs</b> in a straight line between your new disc and another of your discs.</li>
    <li>All the trapped discs flip to your colour.</li>
    <li>If you have no legal move, your turn is skipped.</li>
    <li>When neither player can move, the player with more discs wins. Corners are very strong because they can never be flipped.</li>
    <li>Each player puts in ${ANTE} chips and the winner takes both stakes. A draw returns the chips.</li></ol>`,
  round, view, ui, _test: { moves, put, botMove },
});
})();
