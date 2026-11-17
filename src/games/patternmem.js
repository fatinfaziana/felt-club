/* ---------- Pattern Memory: repeat the pattern, add one, last player standing wins ---------- */
(function () {
const ANTE = 20, CAP = 12, STEP = 800;
const NAMES = ['Red', 'Gold', 'Green', 'Blue'];
const okSeq = (x, len) => Array.isArray(x) && x.length === len && x.every(v => Number.isInteger(v) && v >= 0 && v < 4);
async function round(G, io) {
  const P = G.players, n = P.length;
  const Q = G.pm = { seq: [], alive: P.map(() => true), turn: (G.round - 1) % n, show: null, over: false, winners: [], sid: 0 };
  const next = i => { for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (Q.alive[j]) return j; } return i; };
  io.render(); await io.sleep(500);
  while (!Q.over) {
    const i = Q.turn, p = P[i], len = Q.seq.length;
    if (len) { Q.show = { id: ++Q.sid, seq: Q.seq.slice() }; io.render(); await io.sleep(len * STEP + 600); Q.show = null; }
    io.render();
    const a = await io.turn(p, { len }, { timeout: 60000, auto: { t: 'seq', s: [...Q.seq, rnd(4)] },
      validate: x => (x && x.t === 'seq' && okSeq(x.s, len + 1) ? { t: 'seq', s: x.s.slice() } : null),
      bot: () => { const ok = Math.random() < Math.pow(0.96, len) ; const s = [...Q.seq, rnd(4)]; if (!ok && len) { const k = rnd(len); s[k] = (s[k] + 1 + rnd(3)) % 4; } return { t: 'seq', s }; },
      think: 900 + Math.random() * 600 });
    const good = Q.seq.every((c, k) => a.s[k] === c);
    if (good) { Q.seq.push(a.s[len]); io.ev(p, `repeats the pattern and adds ${NAMES[a.s[len]]}`, `repeat the pattern and add ${NAMES[a.s[len]]}`); }
    else { Q.alive[i] = false; io.ev(p, 'gets the pattern wrong and is out', 'get the pattern wrong and are out'); }
    const left = Q.alive.map((v, k) => (v ? k : -1)).filter(k => k >= 0);
    if (left.length <= 1) { Q.over = true; Q.winners = left; }
    else if (Q.seq.length >= CAP) { Q.over = true; Q.winners = left; }
    else Q.turn = good ? next(i) : next(i);
    io.render();
  }
  settlePot(G, ANTE, Q.winners); potSummary(G);
  io.line(`The pattern reached ${Q.seq.length} colour${Q.seq.length === 1 ? '' : 's'}.`, true);
  io.render();
}
function view(G) {
  const Q = G.pm;
  if (!Q || Q.alive.length !== G.players.length) return { len: 0, show: null, alive: G.players.map(() => true), turn: -1, over: false, winners: [], delta: [] };
  return { len: Q.seq.length, show: Q.show, alive: Q.alive, turn: Q.over ? -1 : Q.turn, over: Q.over, winners: Q.winners, delta: G.players.map(p => (Q.over ? p.delta || 0 : 0)) };
}
let S0 = null, entered = [], animId = 0, seq0 = 0;
async function animate(show) {
  const id = animId = show.id;
  for (const c of show.seq) {
    if (animId !== id) return;
    const b = document.querySelector(`#pm .pm-b.c${c}`); if (!b) return;
    b.classList.add('lit'); await new Promise(r => setTimeout(r, STEP - 250)); b.classList.remove('lit'); await new Promise(r => setTimeout(r, 250));
  }
}
function draw() {
  const g = S0.V.g, need = S0.turn ? S0.turn.data.len + 1 : 0;
  $('pmEntry').innerHTML = S0.turn ? Array.from({ length: need }, (_, k) => `<i class="peg ${k < entered.length ? 'c' + entered[k] : 'empty'}"></i>`).join('') : '';
  $('pmGo').disabled = !(S0.turn && entered.length === need);
  document.querySelectorAll('#pm .pm-b').forEach(b => { b.disabled = !S0.turn || entered.length >= need; });
}
const ui = {
  mount(stage, ctl) {
    entered = []; animId = 0; seq0 = 0;
    stage.innerHTML = `<section class="table c4wrap"><div class="bt-opps" id="pmSeats"></div><div class="pz-label" id="pmLabel"></div><div class="pm" id="pm">${[0, 1, 2, 3].map(c => `<button type="button" class="pm-b c${c}" data-c="${c}" aria-label="${NAMES[c]}" disabled></button>`).join('')}</div><div class="banner" id="pmBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="pmAct" hidden><div class="cb-cur" id="pmEntry"></div><div class="betrow"><button type="button" class="ghost" id="pmUndo">Undo</button><button type="button" class="b gold small" id="pmGo" disabled>Done</button></div><p class="hint bt-hint" id="pmHint"></p></div>`;
    $('pm').onclick = e => { const b = e.target.closest('[data-c]'); if (b && S0.turn && entered.length < S0.turn.data.len + 1) { entered.push(+b.dataset.c); draw(); } };
    $('pmUndo').onclick = () => { entered.pop(); draw(); };
    $('pmGo').onclick = () => { if (S0.turn && entered.length === S0.turn.data.len + 1) { const s = entered; entered = []; S0.send({ t: 'seq', s }); draw(); } };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    if (!S.turn) entered = [];
    else if (seq0 !== S.turn.seq) { seq0 = S.turn.seq; entered = []; }
    $('pmSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, doing: 'Repeating…', extra: i => (g.alive[i] ? '' : 'Out') });
    $('pmLabel').textContent = g.show ? `Watch the pattern (${g.show.seq.length})` : S.turn ? `Repeat the ${g.len ? 'pattern, then add one colour' : 'first colour: tap any colour'}` : g.over ? '' : `Pattern length: ${g.len}`;
    if (g.show && g.show.id !== animId) animate(g.show);
    $('pmBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('pmAct').hidden = !S.turn; draw();
    $('pmHint').textContent = S.turn ? 'Tap the colours in order, then press Done.' : '';
    return '';
  },
};
Club.register({
  id: 'patternmem', cat: 'mind', name: 'Pattern Memory', tag: 'Repeat the colour pattern and add one. Last player in wins.', min: 2, max: 8, soloBots: 2, roundWord: 'Game',
  art: () => [0, 2, 3].map(c => `<div class="ltile"><i class="peg c${c}"></i></div>`).join(''),
  rules: `<p><b>Goal:</b> be the last player who can still remember the pattern. Works for 2 to 8 players.</p>
    <ol><li>The first player taps any one colour. That starts the pattern.</li>
    <li>On the next turn, the pattern is shown by flashing colours. Watch closely.</li>
    <li>When it is your turn, tap the whole pattern in the same order, then <b>add one new colour of your choice</b> at the end, and press <b>Done</b>.</li>
    <li>Get any colour wrong and you are out.</li>
    <li>The last player left wins the pot. If the pattern reaches ${CAP} colours, everyone still in shares it.</li>
    <li>Each player puts in ${ANTE} chips.</li></ol>`,
  round, view, ui, _test: {},
});
})();
