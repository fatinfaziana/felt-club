/* ---------- Dots and Boxes ---------- */
(function () {
const ANTE = 20, B = 4;                       // B x B boxes
const NH = (B + 1) * B, NE = NH * 2;           // horizontal edges first, then vertical
const h = (r, c) => r * B + c, v = (r, c) => NH + r * (B + 1) + c;
const sides = (r, c) => [h(r, c), h(r + 1, c), v(r, c), v(r, c + 1)];
const edgeBoxes = e => { const out = []; if (e < NH) { const r = (e / B) | 0, c = e % B; if (r > 0) out.push([r - 1, c]); if (r < B) out.push([r, c]); } else { const k = e - NH, r = (k / (B + 1)) | 0, c = k % (B + 1); if (c > 0) out.push([r, c - 1]); if (c < B) out.push([r, c]); } return out; };
function draw(E, O, e, who) {                 // returns boxes completed
  E[e] = 1; let n = 0;
  for (const [r, c] of edgeBoxes(e)) if (O[r * B + c] < 0 && sides(r, c).every(x => E[x])) { O[r * B + c] = who; n++; }
  return n;
}
const missing = (E, r, c) => sides(r, c).filter(x => !E[x]).length;
function botMove(E, O, lv = 1) {
  const free = []; for (let e = 0; e < NE; e++) if (!E[e]) free.push(e);
  const finish = free.filter(e => edgeBoxes(e).some(([r, c]) => O[r * B + c] < 0 && missing(E, r, c) === 1));
  if (finish.length && Math.random() < [0.45, 0.92, 1][lv]) return finish[rnd(finish.length)];
  const safe = free.filter(e => edgeBoxes(e).every(([r, c]) => O[r * B + c] >= 0 || missing(E, r, c) > 2));
  if (safe.length) return safe[rnd(safe.length)];
  if (lv === 0 && Math.random() < 0.5) return free[rnd(free.length)];
  let best = free[0], bs = 99;                // give away as little as possible
  for (const e of free) { const s = edgeBoxes(e).reduce((a, [r, c]) => a + (O[r * B + c] < 0 && missing(E, r, c) === 2 ? 1 : 0), 0); if (s < bs) { bs = s; best = e; } }
  return best;
}
async function round(G, io) {
  const P = G.players;
  const D = G.db = { E: Array(NE).fill(0), O: Array(B * B).fill(-1), turn: (G.round - 1) % 2, over: false, winner: -1, last: -1, score: [0, 0] };
  io.render(); await io.sleep(400);
  while (!D.over) {
    const i = D.turn, p = P[i]; io.render();
    const a = await io.turn(p, {}, { auto: { t: 'line', e: D.E.indexOf(0) },
      validate: x => (x && x.t === 'line' && Number.isInteger(x.e) && x.e >= 0 && x.e < NE && !D.E[x.e] ? { t: 'line', e: x.e } : null),
      bot: () => ({ t: 'line', e: botMove(D.E, D.O, G.level) }), think: 700 + Math.random() * 400 });
    const n = draw(D.E, D.O, a.e, i); D.last = a.e; D.score[i] += n;
    if (n) io.ev(p, `completes ${n} box${n === 1 ? '' : 'es'} and goes again`, `complete ${n} box${n === 1 ? '' : 'es'} and go again`);
    if (D.O.every(x => x >= 0)) D.over = true; else if (!n) D.turn = 1 - i;
    io.render();
  }
  D.winner = D.score[0] === D.score[1] ? -1 : D.score[0] > D.score[1] ? 0 : 1;
  settlePot(G, ANTE, D.winner >= 0 ? [D.winner] : []); potSummary(G);
  io.line(`Boxes: ${D.score[0]} to ${D.score[1]}.`, true); io.render();
}
function view(G) {
  const D = G.db;
  if (!D) return { E: Array(NE).fill(0), O: Array(B * B).fill(-1), turn: -1, over: false, winner: -1, last: -1, score: [0, 0], delta: [] };
  return { E: D.E, O: D.O, turn: D.over ? -1 : D.turn, over: D.over, winner: D.winner, last: D.last, score: D.score, delta: G.players.map(p => (D.over ? p.delta || 0 : 0)) };
}
let S0 = null;
const ui = {
  mount(stage) {
    let cells = '';
    for (let R = 0; R <= 2 * B; R++) for (let C = 0; C <= 2 * B; C++) {
      if (R % 2 === 0 && C % 2 === 0) cells += '<i class="db-dot"></i>';
      else if (R % 2 === 0) cells += `<button type="button" class="db-e hz" data-e="${h(R / 2, (C - 1) / 2)}" aria-label="Horizontal line"></button>`;
      else if (C % 2 === 0) cells += `<button type="button" class="db-e vt" data-e="${v((R - 1) / 2, C / 2)}" aria-label="Vertical line"></button>`;
      else cells += `<span class="db-b" data-b="${((R - 1) / 2) * B + (C - 1) / 2}"></span>`;
    }
    stage.innerHTML = `<section class="table c4wrap"><div class="bt-opps" id="dbSeats"></div><div class="db" id="db">${cells}</div><div class="banner" id="dbBanner" aria-live="polite"></div><p class="hint bt-hint" id="dbHint"></p></section>`;
    $('db').onclick = e => { const b = e.target.closest('[data-e]'); if (b && S0.turn) S0.send({ t: 'line', e: +b.dataset.e }); };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    $('dbSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Drawing…', extra: i => `${g.score[i]} box${g.score[i] === 1 ? '' : 'es'}` });
    document.querySelectorAll('#db .db-e').forEach(el => { const e = +el.dataset.e; el.className = 'db-e ' + (el.classList.contains('hz') ? 'hz' : 'vt') + (g.E[e] ? ' on' : '') + (g.last === e ? ' last' : ''); el.disabled = !!g.E[e] || !S.turn; });
    document.querySelectorAll('#db .db-b').forEach(el => { const o = g.O[+el.dataset.b]; el.className = 'db-b' + (o >= 0 ? ' p' + o : ''); });
    $('dbBanner').innerHTML = g.over && V.summary.length ? `<span>${g.winner >= 0 ? S.text(V.summary.find(e => e.p === g.winner) || V.summary[0]) : 'A draw. Everyone keeps their chips.'}</span>` : '';
    $('dbHint').textContent = S.turn ? 'Your turn. Tap a gap between two dots. Close a box and you go again.' : '';
    return '';
  },
};
Club.register({
  id: 'dotsboxes', cat: 'board', name: 'Dots and Boxes', tag: 'Draw lines, close boxes and claim the most.', min: 2, max: 2, soloBots: 1, roundWord: 'Game', levels: true,
  art: () => ['▢', '▣', '▢'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> close more boxes than your opponent.</p>
    <ol><li>A grid of dots is shown. Two players take turns.</li>
    <li>On your turn, tap the gap between two neighbouring dots to draw a line.</li>
    <li>If your line completes the <b>fourth side of a box</b>, the box is yours (it takes your colour) and you <b>draw again</b>.</li>
    <li>If you draw a third side of a box, your opponent may close it. Try not to hand out boxes.</li>
    <li>When every box is taken, the player with more boxes wins.</li>
    <li>Each player puts in ${ANTE} chips and the winner takes both stakes. A draw returns the chips.</li></ol>`,
  round, view, ui, _test: { botMove, draw },
});
})();
