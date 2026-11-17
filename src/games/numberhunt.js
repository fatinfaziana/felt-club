/* ---------- Number Hunt: a group game. Find the secret number first ---------- */
(function () {
const ANTE = 20, TOP = 100, MAXG = 40;
async function round(G, io) {
  const P = G.players, n = P.length;
  const H = G.n = { secret: 1 + rnd(TOP), lo: 1, hi: TOP, turn: (G.round - 1) % n, hist: [], over: false, winner: -1 };
  io.render(); await io.sleep(400);
  while (!H.over) {
    const i = H.turn, p = P[i]; io.render();
    const mid = Math.floor((H.lo + H.hi) / 2);
    const a = await io.turn(p, { lo: H.lo, hi: H.hi }, { auto: { t: 'guess', n: mid },
      validate: x => (x && x.t === 'guess' && Number.isInteger(x.n) && x.n >= H.lo && x.n <= H.hi ? { t: 'guess', n: x.n } : null),
      bot: () => ({ t: 'guess', n: Math.max(H.lo, Math.min(H.hi, mid + Math.round((Math.random() - 0.5) * Math.max(1, (H.hi - H.lo) * 0.3)))) }), think: 900 + Math.random() * 600 });
    const r = a.n === H.secret ? 'hit' : a.n < H.secret ? 'higher' : 'lower';
    H.hist.push({ p: i, n: a.n, r });
    if (r === 'hit') { H.over = true; H.winner = i; io.ev(p, `guesses ${a.n}. That is it`, `guess ${a.n}. That is it`); }
    else {
      if (r === 'higher') H.lo = a.n + 1; else H.hi = a.n - 1;
      io.ev(p, `guesses ${a.n}. Go ${r}`, `guess ${a.n}. Go ${r}`);
      if (H.hist.length >= MAXG) H.over = true; else H.turn = (i + 1) % n;
    }
    io.render();
  }
  settlePot(G, ANTE, H.winner >= 0 ? [H.winner] : []); potSummary(G);
  io.line(`The number was ${H.secret}.`, true);
  io.render();
}
function view(G) {
  const H = G.n;
  if (!H) return { lo: 1, hi: TOP, hist: [], turn: -1, over: false, winner: -1, secret: null, delta: [] };
  return { lo: H.lo, hi: H.hi, hist: H.hist.slice(-12), turn: H.over ? -1 : H.turn, over: H.over, winner: H.winner, secret: H.over ? H.secret : null, delta: G.players.map(p => (H.over ? p.delta || 0 : 0)) };
}
let S0 = null, seq = 0;
const ui = {
  mount(stage, ctl) {
    seq = 0;
    stage.innerHTML = `<section class="table pz"><div class="pz-label">I am thinking of a number from 1 to ${TOP}</div><div class="nh-range" id="nhRange"></div><div class="bt-opps" id="nhSeats"></div><div class="nh-hist" id="nhHist"></div><div class="banner" id="nhBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="nhAct" hidden><form class="pz-form" id="nhForm" autocomplete="off"><input id="nhIn" inputmode="numeric" aria-label="Your guess" placeholder="Your guess"><button type="submit" class="b gold small">Guess</button></form><p class="hint bt-hint" id="nhHint"></p></div>`;
    $('nhForm').onsubmit = e => { e.preventDefault(); const v = parseInt($('nhIn').value, 10); if (Number.isInteger(v) && S0 && S0.turn) { $('nhIn').value = ''; S0.send({ t: 'guess', n: v }); } };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    $('nhRange').innerHTML = g.over ? `<span class="ltile big num">${g.secret}</span>` : `<span class="ltile big num">${g.lo}</span><span class="nh-to">to</span><span class="ltile big num">${g.hi}</span>`;
    $('nhSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, doing: 'Guessing…' });
    $('nhHist').innerHTML = g.hist.map(h => `<span class="nh-h ${h.r}">${esc(S.nameOf(h.p))}: ${h.n} ${h.r === 'hit' ? '✓' : h.r === 'higher' ? '↑ higher' : '↓ lower'}</span>`).join('');
    $('nhBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('nhAct').hidden = !S.turn;
    if (S.turn) { if (seq !== S.turn.seq) { seq = S.turn.seq; $('nhIn').focus(); } $('nhHint').textContent = `Pick a number from ${g.lo} to ${g.hi}.`; }
    return '';
  },
};
Club.register({
  id: 'numberhunt', cat: 'math', name: 'Number Hunt', tag: 'A big-group game: find the secret number first.', min: 2, max: 10, soloBots: 3, roundWord: 'Game',
  art: () => ['?', '42', '?'].map(c => `<div class="ltile num">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> be the player who guesses the secret number. Works for a big group, up to 10 players.</p>
    <ol><li>The computer picks a secret number from 1 to ${TOP}.</li>
    <li>On your turn, type a guess. You are told if the secret number is <b>higher</b> or <b>lower</b>, and the range shrinks for everyone.</li>
    <li>You can only guess inside the range that is left. A smart guess is near the middle.</li>
    <li>Whoever hits the number wins the pot. If nobody does in ${MAXG} guesses, everyone gets their chips back.</li>
    <li>Each player puts in ${ANTE} chips.</li></ol>`,
  round, view, ui, _test: {},
});
})();
