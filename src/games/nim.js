/* ---------- Nim: a two-player thinking game ---------- */
(function () {
const ANTE = 20;
function botMove(piles) {
  const x = piles.reduce((a, b) => a ^ b, 0), moves = [];
  piles.forEach((n, i) => { for (let k = 1; k <= n; k++) moves.push({ pile: i, take: k }); });
  if (Math.random() < 0.15) return moves[rnd(moves.length)];
  if (x) { const good = moves.filter(m => (piles.reduce((a, b, i) => a ^ (i === m.pile ? b - m.take : b), 0)) === 0); if (good.length) return good[rnd(good.length)]; }
  const big = piles.indexOf(Math.max(...piles)); return { pile: big, take: 1 };
}
async function round(G, io) {
  const P = G.players;
  const N = G.nm = { piles: [3, 4, 5], turn: (G.round - 1) % 2, over: false, winner: -1, last: null };
  io.render(); await io.sleep(400);
  while (!N.over) {
    const i = N.turn, p = P[i]; io.render();
    const first = N.piles.findIndex(n => n > 0);
    const a = await io.turn(p, {}, { auto: { t: 'take', pile: first, take: 1 },
      validate: x => (x && x.t === 'take' && Number.isInteger(x.pile) && Number.isInteger(x.take) && x.pile >= 0 && x.pile < 3 && x.take >= 1 && x.take <= N.piles[x.pile] ? { t: 'take', pile: x.pile, take: x.take } : null),
      bot: () => Object.assign({ t: 'take' }, botMove(N.piles)), think: 1000 + Math.random() * 600 });
    N.piles[a.pile] -= a.take; N.last = { pile: a.pile, take: a.take };
    io.ev(p, `takes ${a.take} from row ${a.pile + 1}`, `take ${a.take} from row ${a.pile + 1}`);
    if (N.piles.every(n => n === 0)) { N.over = true; N.winner = i; } else N.turn = 1 - i;
    io.render();
  }
  settlePot(G, ANTE, [N.winner]); potSummary(G); io.render();
}
function view(G) {
  const N = G.nm;
  if (!N) return { piles: [3, 4, 5], turn: -1, over: false, winner: -1, delta: [] };
  return { piles: N.piles, turn: N.over ? -1 : N.turn, over: N.over, winner: N.winner, last: N.last, delta: G.players.map(p => (N.over ? p.delta || 0 : 0)) };
}
let S0 = null, pick = -1, n = 0;
function draw() {
  const g = S0.V.g;
  $('nmRows').innerHTML = g.piles.map((c, r) => `<div class="nm-row"><span class="nm-l">Row ${r + 1}</span>${Array.from({ length: c }, (_, k) => `<button type="button" class="nm-s${pick === r && k >= c - n ? ' sel' : ''}" data-r="${r}" data-k="${k}" ${S0.turn ? '' : 'disabled'} aria-label="Row ${r + 1}, stick ${k + 1}"></button>`).join('')}</div>`).join('');
  $('nmGo').disabled = !(S0.turn && pick >= 0 && n > 0);
  $('nmHint').textContent = S0.turn ? (n ? `Take ${n} from row ${pick + 1}?` : 'Tap a stick. It takes that stick and all sticks to its right.') : '';
}
const ui = {
  mount(stage, ctl) {
    pick = -1; n = 0;
    stage.innerHTML = `<section class="table c4wrap"><div class="bt-opps" id="nmSeats"></div><div class="nm" id="nmRows"></div><div class="banner" id="nmBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act"><div class="betrow"><button type="button" class="b gold small" id="nmGo" disabled>Take them</button></div><p class="hint bt-hint" id="nmHint"></p></div>`;
    $('nmRows').onclick = e => { const b = e.target.closest('[data-r]'); if (!b || !S0.turn) return; const r = +b.dataset.r, k = +b.dataset.k; pick = r; n = S0.V.g.piles[r] - k; draw(); };
    $('nmGo').onclick = () => { if (S0.turn && pick >= 0 && n > 0) { const m = { t: 'take', pile: pick, take: n }; pick = -1; n = 0; S0.send(m); } };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    if (!S.turn) { pick = -1; n = 0; }
    $('nmSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, doing: 'Thinking…' });
    draw();
    $('nmBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    return '';
  },
};
Club.register({
  id: 'nim', cat: 'mind', name: 'Nim', tag: 'Take the last stick. A duel of pure thinking.', min: 2, max: 2, soloBots: 1, roundWord: 'Game',
  art: () => ['┃', '┃┃', '┃┃┃'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> take the very last stick.</p>
    <ol><li>Three rows of sticks sit on the table: 3, 4 and 5.</li>
    <li>On your turn, pick <b>one row</b> and take as many sticks from it as you like, at least one. Tap a stick to choose it and every stick to its right, then press <b>Take them</b>.</li>
    <li>Players take turns. Whoever takes the last stick wins.</li>
    <li>Tip: try to leave your opponent a position where any move you can answer. Think about pairing up rows.</li>
    <li>Each player puts in ${ANTE} chips and the winner takes both stakes.</li></ol>`,
  round, view, ui, _test: { botMove },
});
})();
