/* ---------- Scrabble: build crossword-style words on a 15 by 15 board. Free chips ---------- */
(function () {
const ANTE = 20, N = 15, C = 7;
const PTS = { A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10 };
const DIST = { A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1 };
const PREM = Array(N * N).fill('');
const setP = (t, list) => list.forEach(([r, c]) => { PREM[r * N + c] = t; });
setP('tw', [[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]]);
setP('dw', [[1, 1], [2, 2], [3, 3], [4, 4], [1, 13], [2, 12], [3, 11], [4, 10], [13, 1], [12, 2], [11, 3], [10, 4], [13, 13], [12, 12], [11, 11], [10, 10], [7, 7]]);
setP('tl', [[1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13], [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9]]);
setP('dl', [[0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14], [6, 2], [6, 6], [6, 8], [6, 12], [7, 3], [7, 11], [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14], [12, 6], [12, 8], [14, 3], [14, 11]]);
const newBag = () => { const b = []; for (const k in DIST) for (let i = 0; i < DIST[k]; i++) b.push(k); return shuffle(b); };

function wordAt(T, r, c, dr, dc) {
  while (r - dr >= 0 && c - dc >= 0 && T[(r - dr) * N + c - dc]) { r -= dr; c -= dc; }
  const cells = []; let w = '';
  while (r < N && c < N && T[r * N + c]) { cells.push([r, c]); w += T[r * N + c]; r += dr; c += dc; }
  return { w, cells };
}
function evalPlay(B, cells, first) {
  if (!cells.length) return { err: 'Place at least one tile.' };
  const seen = new Set();
  for (const x of cells) { if (!(x.r >= 0 && x.r < N && x.c >= 0 && x.c < N) || B[x.r * N + x.c]) return { err: 'A tile is on a taken square.' }; const k = x.r * N + x.c; if (seen.has(k)) return { err: 'Two tiles on one square.' }; seen.add(k); }
  const sameR = cells.every(x => x.r === cells[0].r), sameC = cells.every(x => x.c === cells[0].c);
  if (!sameR && !sameC) return { err: 'Place tiles in one row or one column.' };
  const T = B.slice(); cells.forEach(x => { T[x.r * N + x.c] = x.ch; });
  if (cells.length > 1) { const dr = sameC ? 1 : 0, dc = sameR ? 1 : 0, lo = sameR ? Math.min(...cells.map(x => x.c)) : Math.min(...cells.map(x => x.r)), hi = sameR ? Math.max(...cells.map(x => x.c)) : Math.max(...cells.map(x => x.r));
    for (let k = lo; k <= hi; k++) if (!T[(sameR ? cells[0].r : k) * N + (sameR ? k : cells[0].c)]) return { err: 'There is a gap in your word.' }; }
  const words = [], add = wd => { if (wd.w.length >= 2) words.push(wd); };
  if (cells.length > 1) { add(wordAt(T, cells[0].r, cells[0].c, sameR ? 0 : 1, sameR ? 1 : 0)); cells.forEach(x => add(wordAt(T, x.r, x.c, sameR ? 1 : 0, sameR ? 0 : 1))); }
  else { add(wordAt(T, cells[0].r, cells[0].c, 0, 1)); add(wordAt(T, cells[0].r, cells[0].c, 1, 0)); }
  if (!words.length) return { err: 'Words need at least two letters.' };
  if (first) { if (!seen.has(7 * N + 7)) return { err: 'The first word must cover the centre star.' }; }
  else if (!words.some(wd => wd.cells.some(([r, c]) => !seen.has(r * N + c)))) return { err: 'Your word must touch a tile already on the board.' };
  let score = 0; const out = [];
  for (const wd of words) {
    if (!Dict.has(wd.w.toLowerCase())) return { err: `"${wd.w}" is not in the word list.` };
    let s = 0, wm = 1;
    for (const [r, c] of wd.cells) { const k = r * N + c, v = PTS[T[k]] || 0; if (seen.has(k)) { const p = PREM[k]; s += v * (p === 'dl' ? 2 : p === 'tl' ? 3 : 1); if (p === 'dw') wm *= 2; if (p === 'tw') wm *= 3; } else s += v; }
    out.push({ w: wd.w, pts: s * wm }); score += s * wm;
  }
  if (cells.length === C) score += 50;
  return { ok: true, score, words: out, bingo: cells.length === C };
}
function drawTiles(R, i) { while (R.racks[i].length < C && R.bag.length) R.racks[i].push(R.bag.pop()); }
const hasLetters = (rack, cells) => { const r = rack.slice(); for (const x of cells) { const k = r.indexOf(x.ch); if (k < 0) return false; r.splice(k, 1); } return true; };

function botMove(R, i) {
  if (!Dict.ok) return { t: 'pass' };
  const t0 = performance.now(), rack = R.racks[i], cnt = {}; rack.forEach(ch => { cnt[ch] = (cnt[ch] || 0) + 1; });
  const bl = new Set(R.board.filter(x => x)), only = [], thru = [];
  for (const w of Dict.list) {
    if (w.length > 8) continue; const up = w.toUpperCase(), c2 = Object.assign({}, cnt); let miss = '', mc = 0;
    for (let k = 0; k < up.length; k++) { const ch = up[k]; if (c2[ch] > 0) c2[ch]--; else { mc++; miss = ch; if (mc > 1) break; } }
    if (mc === 0) { if (up.length >= 2) only.push(up); } else if (mc === 1 && bl.has(miss) && up.length >= 3) thru.push([up, miss]);
  }
  const jit = () => Math.random() * 1.5;
  only.sort((a, b) => b.length - a.length + jit() - jit()); thru.sort((a, b) => b[0].length - a[0].length + jit() - jit());
  const found = []; let bestSc = -1;
  const tryAt = (up, r0, c0, dr, dc) => {
    const cells = []; for (let k = 0; k < up.length; k++) { const r = r0 + dr * k, c = c0 + dc * k; if (r < 0 || c < 0 || r >= N || c >= N) return; const cur = R.board[r * N + c]; if (cur) { if (cur !== up[k]) return; } else cells.push({ r, c, ch: up[k] }); }
    if (!cells.length || !hasLetters(rack, cells)) return;
    const ev = evalPlay(R.board, cells, R.first); if (ev.ok) found.push({ cells, sc: ev.score });
  };
  const near = (r, c) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => R.board[(r + a) * N + c + b] && r + a >= 0 && r + a < N && c + b >= 0 && c + b < N);
  for (const up of only.slice(0, 260)) {
    if (performance.now() - t0 > 450) break;
    for (const [dr, dc] of [[0, 1], [1, 0]]) for (let r0 = 0; r0 < N; r0++) for (let c0 = 0; c0 < N; c0++) {
      if (r0 + dr * (up.length - 1) >= N || c0 + dc * (up.length - 1) >= N) continue;
      if (R.first) { if (!(r0 + dr * 0 <= 7 && c0 <= 7 && ((dr === 0 && r0 === 7 && c0 + up.length > 7) || (dc === 0 && c0 === 7 && r0 + up.length > 7)))) continue; }
      else { let adj = false; for (let k = 0; k < up.length && !adj; k++) adj = near(r0 + dr * k, c0 + dc * k); if (!adj) continue; }
      tryAt(up, r0, c0, dr, dc);
    }
  }
  if (!R.first) for (const [up, miss] of thru.slice(0, 220)) {
    if (performance.now() - t0 > 800) break;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (R.board[r * N + c] === miss) for (const [dr, dc] of [[0, 1], [1, 0]]) for (let k = 0; k < up.length; k++) if (up[k] === miss) tryAt(up, r - dr * k, c - dc * k, dr, dc);
  }
  if (!found.length) return { t: 'pass' };
  found.sort((a, b) => b.sc - a.sc);
  const pick = found[Math.min(found.length - 1, rnd(Math.max(1, Math.round(1 + (1 - (R.skill || 0.5)) * 3))))];
  return { t: 'play', cells: pick.cells };
}

async function round(G, io) {
  await Dict.load();
  const P = G.players, n = P.length;
  const R = G.sc = { board: Array(N * N).fill(''), racks: P.map(() => []), score: P.map(() => 0), turn: (G.round - 1) % n, bag: newBag(), passes: 0, over: false, winners: [], last: null, first: true };
  for (let i = 0; i < n; i++) drawTiles(R, i);
  io.render(); await io.sleep(600);
  while (!R.over) {
    const i = R.turn, p = P[i]; R.skill = p.human ? 1 : p.agg; io.render();
    const a = await io.turn(p, {}, { auto: { t: 'pass' },
      validate: x => { if (!x) return null; if (x.t === 'pass') return { t: 'pass' }; if (x.t === 'swap') return R.bag.length >= C ? { t: 'swap' } : null;
        if (x.t !== 'play' || !Array.isArray(x.cells) || x.cells.length < 1 || x.cells.length > C) return null;
        const cells = x.cells.map(q => ({ r: q.r | 0, c: q.c | 0, ch: String(q.ch || '').toUpperCase().slice(0, 1) })); if (!cells.every(q => PTS[q.ch]) || !hasLetters(R.racks[i], cells)) return null;
        return evalPlay(R.board, cells, R.first).ok ? { t: 'play', cells } : null; },
      bot: () => botMove(R, i), think: 1200 + Math.random() * 600 });
    if (a.t === 'play') {
      const ev = evalPlay(R.board, a.cells, R.first), rk = R.racks[i];
      a.cells.forEach(q => { R.board[q.r * N + q.c] = q.ch; rk.splice(rk.indexOf(q.ch), 1); });
      R.score[i] += ev.score; R.first = false; R.passes = 0; drawTiles(R, i);
      R.last = { p: i, words: ev.words.map(w => w.w), score: ev.score, bingo: ev.bingo };
      io.ev(p, `plays ${ev.words[0].w} for ${ev.score}${ev.bingo ? ' (bingo +50)' : ''}`, `play ${ev.words[0].w} for ${ev.score}${ev.bingo ? ' (bingo +50)' : ''}`);
      if (!R.racks[i].length && !R.bag.length) { R.over = true; break; }
    } else if (a.t === 'swap') { R.bag.push(...R.racks[i]); R.racks[i] = []; shuffle(R.bag); drawTiles(R, i); R.passes++; R.last = { p: i, words: [], score: 0, swap: true }; io.ev(p, 'swaps tiles', 'swap tiles'); }
    else { R.passes++; R.last = { p: i, words: [], score: 0, pass: true }; io.ev(p, 'passes', 'pass'); if (R.passes >= n * 2) R.over = true; }
    R.turn = (i + 1) % n; io.render(); await io.sleep(700);
  }
  const out = R.racks.findIndex(r => !r.length); let bonus = 0;
  R.racks.forEach((r, i) => { const v = r.reduce((s, ch) => s + PTS[ch], 0); R.score[i] -= v; bonus += v; });
  if (out >= 0) R.score[out] += bonus;
  R.over = true; const top = Math.max(...R.score); R.winners = R.score.map((s, i) => (s === top ? i : -1)).filter(i => i >= 0);
  settlePot(G, ANTE, R.winners); potSummary(G);
  io.line(`Final scores: ${P.map((p, i) => `${p.human ? 'player ' + (i + 1) : p.name} ${R.score[i]}`).join(', ')}.`, true); io.render();
}
function view(G) {
  const R = G.sc;
  if (!R || R.score.length !== G.players.length) return { b: '.'.repeat(N * N), score: G.players.map(() => 0), counts: G.players.map(() => 0), bag: 0, turn: -1, last: null, first: true, over: false, winners: [], delta: [] };
  return { b: R.board.map(x => x || '.').join(''), score: R.score, counts: R.racks.map(r => r.length), bag: R.bag.length, turn: R.over ? -1 : R.turn, last: R.last, first: R.first, over: R.over, winners: R.winners, delta: G.players.map(p => (R.over ? p.delta || 0 : 0)) };
}

let S0 = null, pend = [], selR = null, errMsg = '';
const boardOf = g => g.b.split('').map(x => (x === '.' ? '' : x));
function preview(S) {
  const g = S.V.g, rack = S.my && S.my.rack ? S.my.rack : [];
  const cells = pend.map(q => ({ r: Math.floor(q.i / N), c: q.i % N, ch: rack[q.ri] })).filter(q => q.ch);
  return { cells, ev: cells.length ? evalPlay(boardOf(g), cells, g.first) : null };
}
const ui = {
  mount(stage, ctl) {
    pend = []; selR = null; errMsg = ''; Dict.load();
    let cells = ''; for (let i = 0; i < N * N; i++) cells += `<button type="button" class="scc ${PREM[i]}" data-i="${i}" aria-label="Square ${Math.floor(i / N) + 1}, ${(i % N) + 1}"></button>`;
    stage.innerHTML = `<section class="table scwrap"><div class="bt-opps" id="scSeats"></div><div class="scb" id="scBoard">${cells}</div><div class="screk" id="scRack"></div><div class="pz-label" id="scMsg"></div><div class="banner" id="scBan" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="scAct" hidden><div class="betrow"><button type="button" class="b gold" id="scPlay" disabled>Play word</button><button type="button" class="ghost" id="scRecall">Recall</button><button type="button" class="ghost" id="scShuf">Shuffle</button><button type="button" class="ghost" id="scSwap">Swap rack</button><button type="button" class="ghost" id="scPass">Pass</button></div><p class="hint bt-hint" id="scHint"></p></div>`;
    $('scBoard').onclick = e => { const b = e.target.closest('[data-i]'); if (!b || !S0 || !S0.turn) return; const i = +b.dataset.i, at = pend.findIndex(q => q.i === i);
      if (at >= 0) pend.splice(at, 1); else if (selR !== null && !boardOf(S0.V.g)[i]) { pend.push({ i, ri: selR }); selR = null; Snd.p('clack'); } ui.update(S0); };
    $('scRack').onclick = e => { const b = e.target.closest('[data-ri]'); if (!b || !S0 || !S0.turn) return; const ri = +b.dataset.ri; if (pend.some(q => q.ri === ri)) return; selR = selR === ri ? null : ri; ui.update(S0); };
    $('scRecall').onclick = () => { pend = []; selR = null; ui.update(S0); };
    $('scShuf').onclick = () => { const r = S0.my && S0.my.rack; if (r) { S0.my.rack = shuffle(r.slice()); pend = []; selR = null; ui.update(S0); } };
    $('scPass').onclick = () => { pend = []; S0.send({ t: 'pass' }); };
    $('scSwap').onclick = () => { pend = []; S0.send({ t: 'swap' }); };
    $('scPlay').onclick = () => { const { cells, ev } = preview(S0); if (S0.turn && cells.length && (!ev || ev.ok)) { pend = []; S0.send({ t: 'play', cells }); } };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g, B = boardOf(g), my = !!S.turn, rack = S.my && S.my.rack ? S.my.rack : [];
    if (!my) { pend = []; selR = null; }
    $('scSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, won: g.winners, doing: 'Thinking…', extra: i => `${g.score[i]} pts` });
    const pm = new Map(pend.map(q => [q.i, rack[q.ri]])), lastCells = new Set();
    [...$('scBoard').children].forEach((el, i) => { const ch = pm.get(i) || B[i]; el.className = `scc ${PREM[i]}${ch ? ' has' : ''}${pm.has(i) ? ' pend' : ''}${i === 112 && !ch ? ' star' : ''}`; el.innerHTML = ch ? `${ch}<sub>${PTS[ch]}</sub>` : (i === 112 ? '★' : PREM[i].toUpperCase()); });
    const used = new Set(pend.map(q => q.ri));
    $('scRack').hidden = S.me < 0; $('scRack').innerHTML = rack.map((ch, k) => `<button type="button" class="sct${used.has(k) ? ' used' : ''}${selR === k ? ' sel' : ''}" data-ri="${k}">${ch}<sub>${PTS[ch]}</sub></button>`).join('');
    const l = g.last;
    $('scMsg').textContent = g.over ? '' : l ? (l.swap ? `${S.nameOf(l.p)} swapped tiles` : l.pass ? `${S.nameOf(l.p)} passed` : `${S.nameOf(l.p)} played ${l.words.join(', ')} for ${l.score}${l.bingo ? ' (bingo!)' : ''}`) + ` · ${g.bag} tiles in the bag` : `${g.bag} tiles in the bag`;
    $('scBan').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('scAct').hidden = !my; if (!my) return '';
    const { cells, ev } = preview(S);
    $('scPlay').disabled = !cells.length || (ev && !ev.ok); $('scSwap').disabled = g.bag < C;
    $('scHint').textContent = !cells.length ? (g.first ? 'Tap a rack tile, then a square. The first word must cover the ★.' : 'Tap a rack tile, then a square next to the tiles on the board.') : ev && ev.ok ? `${ev.words.map(w => w.w).join(', ')}: +${ev.score}${ev.bingo ? ' (bingo!)' : ''}. Press Play word.` : ev ? ev.err : '';
    return '';
  },
};
Club.register({
  id: 'scrabble', cat: 'word', name: 'Scrabble', tag: 'Build crossword words with lettered tiles and score big.', min: 2, max: 4, soloBots: 1, roundWord: 'Game',
  art: () => ['S', 'C', 'A'].map(c => `<div class="ltile num">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> score the most points by building words on the board.</p>
    <ol><li>Everyone has a rack of 7 lettered tiles. Each letter has a point value shown in its corner.</li>
    <li>On your turn, tap a rack tile, then tap a square. Place tiles in <b>one row or one column</b>. The first word must cover the centre ★. Every later word must touch tiles already on the board.</li>
    <li>All the words you make must be real words (the game checks a word list). Single letters do not count as words.</li>
    <li>Premium squares: <b>DL/TL</b> double or triple a letter, <b>DW/TW</b> double or triple the whole word. They only count when a tile is first placed there.</li>
    <li>Use all 7 tiles in one turn for a <b>+50 bingo</b>.</li>
    <li>Stuck? <b>Pass</b>, or <b>swap</b> your whole rack (while the bag has at least 7 tiles).</li>
    <li>The game ends when someone uses their last tile after the bag is empty, or everyone passes twice in a row. Leftover tile values are taken off your score. Highest score wins the pot (${ANTE} chips each). This version has no blank tiles.</li></ol>`,
  round, view, priv: (G, i) => ({ rack: G.sc && G.sc.racks[i] ? G.sc.racks[i] : [] }), ui, _test: { evalPlay, botMove, PTS },
});
})();
