/* ---------- Higher or Lower: a survival game for the whole group ---------- */
(function () {
const ANTE = 20, CAP = 30;
const LAB = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], SUI = ['♠', '♥', '♦', '♣'];
const rank = c => c >> 2, red = c => (c & 3) === 1 || (c & 3) === 2;
const cardHTML = c => faceHTML(LAB[rank(c)], SUI[c & 3], red(c));
async function round(G, io) {
  const P = G.players, n = P.length;
  const deck = shuffle([...Array(52).keys()]);
  const H = G.hl = { cur: deck.pop(), alive: P.map(() => true), streak: P.map(() => 0), turn: (G.round - 1) % n, over: false, winners: [], last: null, count: 0 };
  const next = i => { for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (H.alive[j]) return j; } return i; };
  if (!H.alive[H.turn]) H.turn = next(H.turn);
  io.render(); await io.sleep(600);
  while (!H.over) {
    const i = H.turn, p = P[i];
    io.render();
    const a = await io.turn(p, {}, { auto: { t: 'guess', d: rank(H.cur) < 6 ? 'higher' : 'lower' },
      validate: x => (x && x.t === 'guess' && (x.d === 'higher' || x.d === 'lower') ? { t: 'guess', d: x.d } : null),
      bot: () => ({ t: 'guess', d: rank(H.cur) <= 5 ? 'higher' : rank(H.cur) >= 7 ? 'lower' : (Math.random() < 0.5 ? 'higher' : 'lower') }), think: 900 + Math.random() * 500 });
    if (!deck.length) { H.over = true; H.winners = H.alive.map((v, k) => (v ? k : -1)).filter(k => k >= 0); break; }
    const nx = deck.pop(), r0 = rank(H.cur), r1 = rank(nx);
    const ok = r1 === r0 || (a.d === 'higher' ? r1 > r0 : r1 < r0);
    H.last = { p: i, from: H.cur, to: nx, d: a.d, ok }; H.cur = nx; H.count++;
    if (ok) { H.streak[i]++; io.ev(p, `says ${a.d} and is right (${LAB[r1]})`, `say ${a.d} and are right (${LAB[r1]})`); }
    else { H.alive[i] = false; io.ev(p, `says ${a.d} but it is ${LAB[r1]}. Out`, `say ${a.d} but it is ${LAB[r1]}. Out`); }
    const left = H.alive.map((v, k) => (v ? k : -1)).filter(k => k >= 0);
    if (left.length <= 1 || H.count >= CAP) { H.over = true; H.winners = left; } else H.turn = next(i);
    io.render(); await io.sleep(900);
  }
  settlePot(G, ANTE, H.winners); potSummary(G); io.render();
}
function view(G) {
  const H = G.hl;
  if (!H || H.alive.length !== G.players.length) return { cur: null, alive: G.players.map(() => true), streak: G.players.map(() => 0), turn: -1, over: false, winners: [], last: null, delta: [] };
  return { cur: H.cur, alive: H.alive, streak: H.streak, turn: H.over ? -1 : H.turn, over: H.over, winners: H.winners, last: H.last, delta: G.players.map(p => (H.over ? p.delta || 0 : 0)) };
}
let S0 = null;
const ui = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table pz"><div class="bt-opps" id="hlSeats"></div><div class="hl-card" id="hlCard"></div><div class="pz-label" id="hlMsg"></div><div class="banner" id="hlBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="hlAct" hidden><div class="betrow"><button type="button" class="b gold" data-d="higher">▲ Higher</button><button type="button" class="b" data-d="lower">▼ Lower</button></div><p class="hint bt-hint">Aces are low, kings are high. A matching card counts as a win for you.</p></div>`;
    $('hlAct').onclick = e => { const b = e.target.closest('[data-d]'); if (b && S0.turn) S0.send({ t: 'guess', d: b.dataset.d }); };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    $('hlSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, doing: 'Guessing…', extra: i => (g.alive[i] ? (g.streak[i] ? `Streak ${g.streak[i]}` : '') : 'Out') });
    $('hlCard').innerHTML = g.cur === null ? '' : cardHTML(g.cur);
    const l = g.last;
    $('hlMsg').textContent = l ? `${S.nameOf(l.p)} said ${l.d}: ${l.ok ? 'right' : 'wrong'}` : 'Will the next card be higher or lower?';
    $('hlBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('hlAct').hidden = !S.turn; return '';
  },
};
Club.register({
  id: 'hilo', cat: 'group', name: 'Higher or Lower', tag: 'Guess the next card. One wrong guess and you are out.', min: 2, max: 10, soloBots: 3, roundWord: 'Game',
  art: () => ['▲', '7', '▼'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> be the last player still in. Fits 2 to 10 players.</p>
    <ol><li>A card is shown. All players take turns guessing whether the <b>next</b> card will be higher or lower. Aces are low and kings are high.</li>
    <li>Press <b>Higher</b> or <b>Lower</b>. The next card is turned over. A matching card counts as correct.</li>
    <li>If you are right, you stay in and the new card becomes the one to beat. If you are wrong, you are out.</li>
    <li>The last player left wins the pot. If ${CAP} cards go by, everyone still in shares it.</li>
    <li>Each player puts in ${ANTE} chips.</li></ol>`,
  round, view, ui, _test: {},
});
})();
