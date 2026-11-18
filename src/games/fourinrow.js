/* ---------- Four in a Row ---------- */
(function () {
const COLS = 7, ROWS = 6, ANTE = 20;
const idx = (r, c) => r * COLS + c;
const order = [3, 2, 4, 1, 5, 0, 6];
const legal = b => order.filter(c => b[idx(0, c)] < 0);
function drop(b, c, who) { for (let r = ROWS - 1; r >= 0; r--) if (b[idx(r, c)] < 0) { b[idx(r, c)] = who; return r; } return -1; }
function lineAt(b, r, c) {
  const who = b[idx(r, c)]; if (who < 0) return null;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [idx(r, c)];
    for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && b[idx(rr, cc)] === who) { cells.push(idx(rr, cc)); rr += dr * s; cc += dc * s; } }
    if (cells.length >= 4) return cells;
  }
  return null;
}
const WINS = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
  const er = r + 3 * dr, ec = c + 3 * dc;
  if (er >= 0 && er < ROWS && ec >= 0 && ec < COLS) WINS.push([0, 1, 2, 3].map(k => idx(r + k * dr, c + k * dc)));
}
function evalB(b, me) {
  let s = 0;
  for (const w of WINS) {
    let m = 0, t = 0;
    for (const q of w) { if (b[q] === me) m++; else if (b[q] >= 0) t++; }
    if (m && t) continue;
    if (m === 3) s += 5; else if (m === 2) s += 2; else if (t === 3) s -= 4; else if (t === 2) s -= 1;
  }
  for (let r = 0; r < ROWS; r++) if (b[idx(r, 3)] === me) s += 1.5;
  return s;
}
function search(b, who, depth, alpha, beta) {
  const mv = legal(b); if (!mv.length) return 0;
  if (depth === 0) return evalB(b, who);
  let best = -1e9;
  for (const c of mv) {
    const r = drop(b, c, who);
    const v = lineAt(b, r, c) ? 1000 + depth : -search(b, 1 - who, depth - 1, -beta, -alpha);
    b[idx(r, c)] = -1;
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}
function botMove(b, who) {
  const mv = legal(b);
  if (Math.random() < 0.1) return mv[rnd(mv.length)];
  let best = mv[0], bs = -1e9;
  for (const c of mv) {
    const r = drop(b, c, who);
    const v = (lineAt(b, r, c) ? 1010 : -search(b, 1 - who, 4, -1e9, 1e9)) + Math.random() * 0.6;
    b[idx(r, c)] = -1;
    if (v > bs) { bs = v; best = c; }
  }
  return best;
}

async function round(G, io) {
  const P = G.players;
  const F = G.f = { b: Array(COLS * ROWS).fill(-1), turn: (G.round - 1) % 2, over: false, winner: -1, last: -1, line: [] };
  io.render();
  await io.sleep(500);
  while (!F.over) {
    const i = F.turn, p = P[i];
    io.render();
    const a = await io.turn(p, {}, {
      auto: { t: 'drop', c: legal(F.b)[0] },
      validate: x => (x && x.t === 'drop' && Number.isInteger(x.c) && x.c >= 0 && x.c < COLS && F.b[idx(0, x.c)] < 0 ? { t: 'drop', c: x.c } : null),
      bot: () => ({ t: 'drop', c: botMove(F.b.slice(), i) }), think: 700 + Math.random() * 500,
    });
    const r = drop(F.b, a.c, i); F.last = idx(r, a.c);
    io.ev(p, `drops a disc in column ${a.c + 1}`, `drop a disc in column ${a.c + 1}`);
    const ln = lineAt(F.b, r, a.c);
    if (ln) { F.over = true; F.winner = i; F.line = ln; }
    else if (!legal(F.b).length) F.over = true;
    else F.turn = 1 - i;
    io.render();
  }
  settlePot(G, ANTE, F.winner >= 0 ? [F.winner] : []);
  potSummary(G);
  if (F.winner < 0) io.line('The board is full. It is a draw.', true);
  io.render();
}
function view(G) {
  const F = G.f;
  if (!F) return { b: Array(COLS * ROWS).fill(-1), turn: -1, over: false, winner: -1, last: -1, line: [], delta: [] };
  return { b: F.b, turn: F.over ? -1 : F.turn, over: F.over, winner: F.winner, last: F.last, line: F.line, delta: G.players.map(p => (F.over ? p.delta || 0 : 0)) };
}

let S0 = null;
const ui = {
  mount(stage, ctl, S) {
    stage.innerHTML = `<section class="table c4wrap"><div class="bt-opps" id="c4Seats"></div><div class="c4" id="c4"></div><div class="banner" id="c4Banner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<p class="hint bt-hint" id="c4Hint"></p>`;
    $('c4').innerHTML = Array.from({ length: COLS }, (_, c) => `<button type="button" class="c4-col" data-c="${c}" aria-label="Drop in column ${c + 1}">${
      Array.from({ length: ROWS }, (_, r) => `<span class="c4-cell" data-i="${idx(r, c)}"></span>`).join('')}</button>`).join('');
    $('c4').onclick = e => { const b = e.target.closest('[data-c]'); if (b && S0 && S0.turn) S0.send({ t: 'drop', c: +b.dataset.c }); };
  },
  update(S) {
    S0 = S;
    const V = S.V, g = V.g;
    $('c4Seats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Dropping…' });
    document.querySelectorAll('#c4 .c4-cell').forEach(el => {
      const i = +el.dataset.i, v = g.b[i];
      el.className = 'c4-cell' + (v >= 0 ? ' p' + v : '') + (g.line.includes(i) ? ' win' : '') + (g.last === i ? ' last' : '');
    });
    document.querySelectorAll('#c4 .c4-col').forEach(b => { b.disabled = !S.turn || g.b[+b.dataset.c] >= 0; });
    $('c4Banner').innerHTML = g.over && V.summary.length ? `<span>${g.winner >= 0 ? S.text(V.summary.find(e => e.p === g.winner) || V.summary[0]) : 'Draw. Everyone keeps their chips.'}</span>` : '';
    $('c4Hint').textContent = S.turn ? 'Your turn. Tap a column to drop your disc.' : '';
    return '';
  },
};

Club.register({
  id: 'fourinrow', cat: 'board', name: 'Connect Four', tag: 'Drop discs and line up four before your opponent.', min: 2, max: 2, soloBots: 1, roundWord: 'Game',
  art: () => ['p0', 'p1', 'p0'].map(c => `<div class="disc ${c}"></div>`).join(''),
  rules: `<p><b>Goal:</b> be the first to get four of your discs in a row: across, up and down, or diagonally.</p>
    <ol><li>Two players take turns. You are gold or cream; the colour is shown beside your name.</li>
    <li>On your turn, tap a column. Your disc drops to the lowest free space in it.</li>
    <li>The first player with four in a row wins. The four discs light up.</li>
    <li>If the board fills up with no winner, it is a draw.</li>
    <li>Each player puts in ${ANTE} chips and the winner takes both stakes. A draw returns the chips.</li></ol>`,
  round, view, ui,
  _test: { legal, drop, lineAt, botMove },
});
})();
