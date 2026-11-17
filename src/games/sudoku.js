/* ---------- Sudoku Duel: one puzzle, players take turns placing a number ---------- */
(function () {
// ----- generator: a full grid, then remove cells while the answer stays unique -----
const BOX = i => ((i / 27) | 0) * 3 + (((i % 9) / 3) | 0);
function solveCount(g, limit) {
  const rows = Array(9).fill(0), cols = Array(9).fill(0), boxes = Array(9).fill(0);
  for (let i = 0; i < 81; i++) if (g[i]) { const m = 1 << g[i]; rows[(i / 9) | 0] |= m; cols[i % 9] |= m; boxes[BOX(i)] |= m; }
  let count = 0;
  const rec = () => {
    let best = -1, bm = 0, bc = 10;
    for (let i = 0; i < 81; i++) if (!g[i]) {
      const used = rows[(i / 9) | 0] | cols[i % 9] | boxes[BOX(i)]; let n = 0, m = 0;
      for (let d = 1; d <= 9; d++) if (!(used & (1 << d))) { n++; m |= 1 << d; }
      if (n < bc) { bc = n; best = i; bm = m; if (n <= 1) break; }
    }
    if (best < 0) { count++; return count >= limit; }
    if (bc === 0) return false;
    const r = (best / 9) | 0, c = best % 9, b = BOX(best);
    for (let d = 1; d <= 9; d++) if (bm & (1 << d)) {
      g[best] = d; rows[r] |= 1 << d; cols[c] |= 1 << d; boxes[b] |= 1 << d;
      const stop = rec();
      g[best] = 0; rows[r] &= ~(1 << d); cols[c] &= ~(1 << d); boxes[b] &= ~(1 << d);
      if (stop) return true;
    }
    return false;
  };
  rec(); return count;
}
function fullGrid() {
  const g = Array(81).fill(0);
  const fill = i => {
    if (i === 81) return true;
    const r = (i / 9) | 0, c = i % 9;
    for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      let ok = true;
      for (let k = 0; k < 9 && ok; k++) if (g[r * 9 + k] === d || g[k * 9 + c] === d) ok = false;
      const br = r - (r % 3), bc = c - (c % 3);
      for (let a = 0; a < 3 && ok; a++) for (let b = 0; b < 3; b++) if (g[(br + a) * 9 + bc + b] === d) ok = false;
      if (ok) { g[i] = d; if (fill(i + 1)) return true; g[i] = 0; }
    }
    return false;
  };
  fill(0); return g;
}
function makePuzzle(remove) {
  const sol = fullGrid(), g = sol.slice(); let removed = 0;
  for (const i of shuffle([...Array(81).keys()])) {
    if (removed >= remove) break;
    const v = g[i]; g[i] = 0;
    if (solveCount(g.slice(), 2) !== 1) g[i] = v; else removed++;
  }
  return { sol, puz: g };
}

const ANTE = 20;
async function round(G, io) {
  const P = G.players, n = P.length;
  const { sol, puz } = makePuzzle(44);
  const Z = G.su = { g: puz.slice(), given: puz.map(v => v > 0), score: P.map(() => 0), turn: (G.round - 1) % n, over: false, winners: [], last: null };
  io.render(); await io.sleep(500);
  while (Z.g.some(v => !v)) {
    const i = Z.turn, p = P[i]; io.render();
    const empties = Z.g.map((v, k) => (v ? -1 : k)).filter(k => k >= 0);
    const a = await io.turn(p, {}, { timeout: 60000, auto: { t: 'place', i: empties[0], d: sol[empties[0]] },
      validate: x => (x && x.t === 'place' && Number.isInteger(x.i) && Number.isInteger(x.d) && x.i >= 0 && x.i < 81 && !Z.g[x.i] && x.d >= 1 && x.d <= 9 ? { t: 'place', i: x.i, d: x.d } : null),
      bot: () => { const k = empties[rnd(empties.length)]; return { t: 'place', i: k, d: Math.random() < 0.9 ? sol[k] : 1 + rnd(9) }; }, think: 1000 + Math.random() * 800 });
    const ok = a.d === sol[a.i];
    if (ok) { Z.g[a.i] = a.d; Z.score[i]++; } else Z.score[i]--;
    Z.last = { i: a.i, ok, p: i };
    io.ev(p, ok ? 'places a correct number' : 'places a wrong number', ok ? 'place a correct number' : 'place a wrong number');
    Z.turn = (i + 1) % n; io.render();
  }
  const top = Math.max(...Z.score); Z.winners = Z.score.map((s, i) => (s === top ? i : -1)).filter(i => i >= 0); Z.over = true;
  settlePot(G, ANTE, Z.winners); potSummary(G);
  io.line(`Scores: ${P.map((p, i) => `${p.human ? 'player ' + (i + 1) : p.name} ${Z.score[i]}`).join(', ')}.`, true); io.render();
}
function view(G) {
  const Z = G.su;
  if (!Z || Z.score.length !== G.players.length) return { g: Array(81).fill(0), given: Array(81).fill(false), score: G.players.map(() => 0), turn: -1, over: false, winners: [], last: null };
  return { g: Z.g, given: Z.given, score: Z.score, turn: Z.over ? -1 : Z.turn, over: Z.over, winners: Z.winners, last: Z.last, delta: G.players.map(p => (Z.over ? p.delta || 0 : 0)) };
}
let S0 = null, cell = -1;
function draw() {
  const g = S0.V.g, sd = cell >= 0 && g.g[cell] ? g.g[cell] : 0;
  const cr = cell >= 0 ? (cell / 9) | 0 : -9, cc = cell >= 0 ? cell % 9 : -9;
  $('su').innerHTML = g.g.map((v, i) => {
    const r = (i / 9) | 0, c = i % 9, cls = ['su-c'];
    if (g.given[i]) cls.push('given'); if (i === cell) cls.push('sel'); else if (r === cr || c === cc || BOX(i) === (cell >= 0 ? BOX(cell) : -1)) cls.push('rel');
    if (sd && v === sd && i !== cell) cls.push('same'); if (r % 3 === 2 && r < 8) cls.push('br'); if (c % 3 === 2 && c < 8) cls.push('bc');
    if (g.last && g.last.i === i && !g.last.ok) cls.push('bad');
    return `<button type="button" class="${cls.join(' ')}" data-i="${i}" aria-label="Row ${r + 1}, column ${c + 1}${v ? ', ' + v : ', empty'}">${v || ''}</button>`;
  }).join('');
}
const ui = {
  mount(stage, ctl) {
    cell = -1;
    stage.innerHTML = `<section class="table c4wrap"><div class="bt-opps" id="suSeats"></div><div class="su" id="su"></div><div class="banner" id="suBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="suAct"><div class="betrow" id="suPad">${[1,2,3,4,5,6,7,8,9].map(d => `<button type="button" class="pill su-d" data-d="${d}">${d}</button>`).join('')}</div><p class="hint bt-hint" id="suHint"></p></div>`;
    $('su').onclick = e => { const b = e.target.closest('[data-i]'); if (b) { cell = +b.dataset.i === cell ? -1 : +b.dataset.i; draw(); } };
    $('suPad').onclick = e => { const b = e.target.closest('[data-d]'); if (b) put(+b.dataset.d); };
    document.addEventListener('keydown', ev => { if (S0 && S0.turn && /^[1-9]$/.test(ev.key) && $('su')) put(+ev.key); });
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    if (cell >= 0 && g.g[cell]) cell = -1;
    $('suSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, doing: 'Placing…', extra: i => `${g.score[i]} point${Math.abs(g.score[i]) === 1 ? '' : 's'}` });
    draw();
    $('suBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    document.querySelectorAll('#suPad .su-d').forEach(b => { b.disabled = !S.turn || cell < 0; });
    $('suHint').textContent = S.turn ? (cell < 0 ? 'Your turn. Tap an empty square, then a number.' : 'Now tap the number (or press a key 1 to 9).') : '';
    return '';
  },
};
function put(d) { if (S0 && S0.turn && cell >= 0 && !S0.V.g.g[cell]) { const i = cell; cell = -1; S0.send({ t: 'place', i, d }); } }
Club.register({
  id: 'sudoku', cat: 'mind', name: 'Sudoku Duel', tag: 'Fill the grid together. Right numbers score, wrong ones cost.', min: 1, max: 4, soloBots: 1, roundWord: 'Puzzle',
  art: () => ['5', '3', '7'].map(c => `<div class="ltile num">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> help finish the Sudoku grid and score more points than the others. You can play alone or with up to 3 others.</p>
    <ol><li>A Sudoku grid is shown with some numbers filled in. Every row, every column and every 3 × 3 box must contain the numbers 1 to 9 once each.</li>
    <li>Players take turns. On your turn, tap an empty square, then tap a number (or press 1 to 9 on a keyboard).</li>
    <li>A <b>correct</b> number stays in the grid and scores 1 point. A <b>wrong</b> number is not placed and costs 1 point.</li>
    <li>Use the highlighted row, column and box to work out what fits. Tapping a filled square highlights the same number everywhere.</li>
    <li>When the grid is full, the player with the most points wins. If you play alone, finishing the puzzle is your win.</li>
    <li>Each player puts in ${ANTE} free chips and the winner takes the pot. Chips have no cash value.</li></ol>`,
  round, view, ui, _test: { makePuzzle, solveCount },
});
})();
