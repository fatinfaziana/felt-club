/* ---------- Rock Paper Scissors: best of five ---------- */
(function () {
const ANTE = 20, WIN = 3, MOVES = ['Rock', 'Paper', 'Scissors'], ICON = ['✊', '✋', '✌️'];
const beats = (a, b) => (a + 1) % 3 === b ? false : a !== b;   // a beats b if b === (a+2)%3 ... computed below
const wins = (a, b) => (a - b + 3) % 3 === 1;                   // 1 Paper beats 0 Rock, 2 Scissors beats 1 Paper, 0 Rock beats 2 Scissors
async function round(G, io) {
  const P = G.players;
  const R = G.rp = { score: [0, 0], hist: [], turn: -1, over: false, winner: -1, reveal: null, picks: [-1, -1] };
  io.render(); await io.sleep(400);
  const memory = [[], []];
  while (!R.over) {
    R.picks = [-1, -1]; R.reveal = null;
    for (let i = 0; i < 2; i++) {
      R.turn = i; io.render();
      const a = await io.turn(P[i], {}, { auto: { t: 'throw', m: rnd(3) },
        validate: x => (x && x.t === 'throw' && Number.isInteger(x.m) && x.m >= 0 && x.m < 3 ? { t: 'throw', m: x.m } : null),
        bot: () => { const h = memory[1 - i]; const fav = h.length > 2 && Math.random() < 0.5 ? (h.slice(-3).sort((a, b) => h.slice(-3).filter(v => v === b).length - h.slice(-3).filter(v => v === a).length)[0] + 1) % 3 : rnd(3); return { t: 'throw', m: fav }; },
        think: 900 + Math.random() * 500 });
      R.picks[i] = a.m;
    }
    R.turn = -1;
    const [x, y] = R.picks; memory[0].push(x); memory[1].push(y);
    R.reveal = [x, y];
    const w = x === y ? -1 : wins(x, y) ? 0 : 1;
    if (w >= 0) R.score[w]++;
    R.hist.push({ a: x, b: y, w });
    io.line(`${MOVES[x]} against ${MOVES[y]}: ${w < 0 ? 'a tie' : (P[w].human ? 'player ' + (w + 1) : P[w].name) + ' scores'}.`);
    if (R.score[0] >= WIN || R.score[1] >= WIN) { R.over = true; R.winner = R.score[0] >= WIN ? 0 : 1; }
    io.render(); await io.sleep(1600);
  }
  settlePot(G, ANTE, [R.winner]); potSummary(G); io.render();
}
function view(G) {
  const R = G.rp;
  if (!R) return { score: [0, 0], hist: [], turn: -1, over: false, winner: -1, reveal: null, delta: [] };
  return { score: R.score, hist: R.hist.slice(-8), turn: R.over ? -1 : R.turn, over: R.over, winner: R.winner, reveal: R.reveal, chosen: R.picks.map(v => v >= 0), delta: G.players.map(p => (R.over ? p.delta || 0 : 0)) };
}
let S0 = null;
const ui = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table c4wrap"><div class="bt-opps" id="rpSeats"></div><div class="rp-score" id="rpScore"></div><div class="rp-reveal" id="rpRev"></div><div class="rp-hist" id="rpHist"></div><div class="banner" id="rpBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="rpAct" hidden><div class="betrow">${MOVES.map((m, k) => `<button type="button" class="rp-b" data-m="${k}"><span>${ICON[k]}</span>${m}</button>`).join('')}</div><p class="hint bt-hint">Your throw is hidden until both players have chosen.</p></div>`;
    $('rpAct').onclick = e => { const b = e.target.closest('[data-m]'); if (b && S0.turn) S0.send({ t: 'throw', m: +b.dataset.m }); };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    $('rpSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Choosing…', extra: i => (g.chosen && g.chosen[i] ? 'Chosen' : '') });
    $('rpScore').textContent = `First to ${WIN} wins: ${g.score[0]} – ${g.score[1]}`;
    $('rpRev').innerHTML = g.reveal ? `<span class="rp-i">${ICON[g.reveal[0]]}</span><span class="rp-vs">vs</span><span class="rp-i">${ICON[g.reveal[1]]}</span>` : '';
    $('rpHist').innerHTML = g.hist.map(h => `<span class="nh-h">${ICON[h.a]} ${ICON[h.b]} ${h.w < 0 ? 'tie' : S.nameOf(h.w) + ' scores'}</span>`).join('');
    $('rpBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('rpAct').hidden = !S.turn;
    return '';
  },
};
Club.register({
  id: 'rps', cat: 'mind', name: 'Rock Paper Scissors', tag: 'Outguess your opponent. First to three points.', min: 2, max: 2, soloBots: 1, roundWord: 'Match',
  art: () => ICON.map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> be the first to win ${WIN} throws.</p>
    <ol><li>Both players secretly choose Rock, Paper or Scissors.</li>
    <li>Then both choices are shown. <b>Paper</b> covers Rock, <b>Scissors</b> cut Paper, <b>Rock</b> breaks Scissors. The same choice is a tie.</li>
    <li>The winner of a throw scores a point.</li>
    <li>First to ${WIN} points wins the match. Watch for patterns in how your opponent plays.</li>
    <li>Each player puts in ${ANTE} chips and the winner takes both stakes.</li></ol>`,
  round, view, ui, _test: { wins },
});
})();
