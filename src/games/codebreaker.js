/* ---------- Code Breaker (Mastermind), everyone cracks the same code ---------- */
(function () {
const ANTE = 20, LEN = 4, COLS = 6, MAXROWS = 12;
const NAMES = ['Red', 'Gold', 'Green', 'Blue', 'Purple', 'White'];
function score(secret, g) {
  let exact = 0; const sc = Array(COLS).fill(0), gc = Array(COLS).fill(0);
  for (let i = 0; i < LEN; i++) { if (secret[i] === g[i]) exact++; else { sc[secret[i]]++; gc[g[i]]++; } }
  let near = 0; for (let c = 0; c < COLS; c++) near += Math.min(sc[c], gc[c]);
  return { exact, near };
}
const ALL = []; for (let a = 0; a < COLS; a++) for (let b = 0; b < COLS; b++) for (let c = 0; c < COLS; c++) for (let d = 0; d < COLS; d++) ALL.push([a, b, c, d]);
const okGuess = x => Array.isArray(x) && x.length === LEN && x.every(v => Number.isInteger(v) && v >= 0 && v < COLS);
async function round(G, io) {
  const P = G.players, n = P.length;
  const C = G.c = { secret: Array.from({ length: LEN }, () => rnd(COLS)), rows: [], turn: (G.round - 1) % n, over: false, winner: -1 };
  let cands = ALL;
  io.render(); await io.sleep(400);
  while (!C.over) {
    const i = C.turn, p = P[i]; io.render();
    const a = await io.turn(p, { row: C.rows.length + 1 }, { auto: { t: 'guess', g: [0, 1, 2, 3] },
      validate: x => (x && x.t === 'guess' && okGuess(x.g) ? { t: 'guess', g: x.g.slice() } : null),
      bot: () => { const pool = Math.random() < 0.12 ? ALL : cands; return { t: 'guess', g: pool[rnd(pool.length)] }; }, think: 1200 + Math.random() * 800 });
    const f = score(C.secret, a.g); C.rows.push({ p: i, g: a.g, exact: f.exact, near: f.near });
    cands = cands.filter(c => { const r = score(c, a.g); return r.exact === f.exact && r.near === f.near; });
    if (!cands.length) cands = ALL;
    io.ev(p, `tries a code: ${f.exact} in the right place, ${f.near} right colour only`, `try a code: ${f.exact} in the right place, ${f.near} right colour only`);
    if (f.exact === LEN) { C.over = true; C.winner = i; } else if (C.rows.length >= MAXROWS) C.over = true; else C.turn = (i + 1) % n;
    io.render();
  }
  settlePot(G, ANTE, C.winner >= 0 ? [C.winner] : []); potSummary(G);
  io.line(`The code was ${C.secret.map(c => NAMES[c]).join(', ')}.`, true);
  io.render();
}
function view(G) {
  const C = G.c;
  if (!C) return { rows: [], turn: -1, over: false, winner: -1, secret: null, max: MAXROWS, delta: [] };
  return { rows: C.rows, turn: C.over ? -1 : C.turn, over: C.over, winner: C.winner, secret: C.over ? C.secret : null, max: MAXROWS, delta: G.players.map(p => (C.over ? p.delta || 0 : 0)) };
}
const peg = c => `<i class="peg c${c}" title="${NAMES[c]}"></i>`;
let S0 = null, cur = [];
const ui = {
  mount(stage, ctl) {
    cur = [];
    stage.innerHTML = `<section class="table c4wrap"><div class="bt-opps" id="cbSeats"></div><div class="cb-rows" id="cbRows"></div><div class="banner" id="cbBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="cbAct" hidden><div class="cb-cur" id="cbCur"></div><div class="betrow" id="cbPal">${NAMES.map((nm, c) => `<button type="button" class="cb-p" data-c="${c}" aria-label="${nm}">${peg(c)}</button>`).join('')}</div>
      <div class="betrow"><button type="button" class="ghost" id="cbClear">Clear</button><button type="button" class="b gold small" id="cbGo" disabled>Try this code</button></div><p class="hint bt-hint" id="cbHint"></p></div>`;
    $('cbPal').onclick = e => { const b = e.target.closest('[data-c]'); if (b && cur.length < LEN) { cur.push(+b.dataset.c); drawCur(); } };
    $('cbClear').onclick = () => { cur = []; drawCur(); };
    $('cbGo').onclick = () => { if (cur.length === LEN && S0 && S0.turn) { const g = cur; cur = []; drawCur(); S0.send({ t: 'guess', g }); } };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    $('cbSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, doing: 'Guessing…' });
    $('cbRows').innerHTML = g.rows.map((r, k) => `<div class="cb-row"><span class="cb-n">${k + 1}</span><span class="cb-g">${r.g.map(peg).join('')}</span><span class="cb-f"><b>${r.exact}</b> right place · <b>${r.near}</b> right colour</span><span class="cb-who">${esc(S.nameOf(r.p))}</span></div>`).join('') +
      (g.secret ? `<div class="cb-row secret"><span class="cb-n">Code</span><span class="cb-g">${g.secret.map(peg).join('')}</span></div>` : '') || '<p class="hint">Nobody has guessed yet.</p>';
    $('cbBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('cbAct').hidden = !S.turn; drawCur();
    $('cbHint').textContent = S.turn ? `Pick ${LEN} colours. Guess ${S.turn.data.row} of ${g.max}.` : '';
    return '';
  },
};
function drawCur() { $('cbCur').innerHTML = Array.from({ length: LEN }, (_, k) => (k < cur.length ? peg(cur[k]) : '<i class="peg empty"></i>')).join(''); $('cbGo').disabled = cur.length !== LEN; }
Club.register({
  id: 'codebreaker', cat: 'mind', name: 'Code Breaker', tag: 'Crack the hidden colour code using the clues.', min: 2, max: 6, soloBots: 2, roundWord: 'Game',
  art: () => [0, 3, 2].map(c => `<div class="ltile">${peg(c)}</div>`).join(''),
  rules: `<p><b>Goal:</b> be the player who cracks the secret code of ${LEN} colours. Everyone works on the same code and learns from each other’s guesses.</p>
    <ol><li>The computer picks a hidden code of ${LEN} colours from ${COLS}. A colour can appear more than once.</li>
    <li>On your turn, tap ${LEN} colours, then press <b>Try this code</b>.</li>
    <li>You get two clues: <b>right place</b> means a correct colour in the correct spot; <b>right colour</b> means a correct colour in the wrong spot.</li>
    <li>Use all the clues on the table to work out the code. Players take turns.</li>
    <li>Crack the code and you win the pot. If nobody does in ${MAXROWS} guesses, everyone gets their chips back.</li>
    <li>Each player puts in ${ANTE} chips.</li></ol>`,
  round, view, ui, _test: { score },
});
})();
