/* ---------- Checkers (English draughts) ---------- */
(function () {
const ANTE = 20;
// squares are row*8+col. Values: -1 empty, 0 man of seat 0, 1 king of seat 0, 2 man of seat 1, 3 king of seat 1
const side = v => (v < 0 ? -1 : v >> 1);
const isK = v => v >= 0 && (v & 1) === 1;
const dirsOf = v => (isK(v) ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : side(v) === 0 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
const crowns = (v, row) => !isK(v) && (side(v) === 0 ? row === 0 : row === 7);

function newBoard() {
  const b = Array(64).fill(-1);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) { if (r < 3) b[r * 8 + c] = 2; else if (r > 4) b[r * 8 + c] = 0; }
  return b;
}
function jumps(b, from, sq, v, caps, path, out) {
  const r = sq >> 3, c = sq & 7; let any = false;
  for (const [dr, dc] of dirsOf(v)) {
    const lr = r + 2 * dr, lc = c + 2 * dc;
    if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
    const m = (r + dr) * 8 + c + dc, l = lr * 8 + lc;
    if (b[m] < 0 || side(b[m]) === side(v) || caps.includes(m) || b[l] >= 0) continue;
    any = true;
    const ncaps = [...caps, m], npath = [...path, l];
    if (crowns(v, lr)) out.push({ from, path: npath, caps: ncaps });          // a man that reaches the far row stops there
    else if (!jumps(b, from, l, v, ncaps, npath, out)) out.push({ from, path: npath, caps: ncaps });
  }
  return any;
}
function legalMoves(b, s) {
  const jm = [], sm = [];
  for (let sq = 0; sq < 64; sq++) {
    const v = b[sq]; if (v < 0 || side(v) !== s) continue;
    b[sq] = -1; jumps(b, sq, sq, v, [], [], jm); b[sq] = v;
    const r = sq >> 3, c = sq & 7;
    for (const [dr, dc] of dirsOf(v)) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr * 8 + nc] < 0) sm.push({ from: sq, path: [nr * 8 + nc], caps: [] });
    }
  }
  return jm.length ? jm : sm;
}
function apply(b, m) {
  const v = b[m.from], to = m.path[m.path.length - 1];
  b[m.from] = -1; m.caps.forEach(x => { b[x] = -1; });
  b[to] = crowns(v, to >> 3) ? v | 1 : v;
}
function evalC(b, s) {
  let t = 0;
  for (let sq = 0; sq < 64; sq++) {
    const v = b[sq]; if (v < 0) continue;
    const r = sq >> 3, adv = side(v) === 0 ? 7 - r : r;
    const x = isK(v) ? 160 : 100 + adv * 3;
    t += side(v) === s ? x : -x;
  }
  return t;
}
function search(b, s, depth, alpha, beta) {
  const mv = legalMoves(b, s);
  if (!mv.length) return -10000 - depth;
  if (depth === 0) return evalC(b, s);
  let best = -1e9;
  for (const m of mv) {
    const nb = b.slice(); apply(nb, m);
    const v = -search(nb, 1 - s, depth - 1, -beta, -alpha);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}
function botMove(b, s) {
  const mv = legalMoves(b, s);
  if (mv.length === 1) return mv[0];
  if (Math.random() < 0.08) return mv[rnd(mv.length)];
  let best = mv[0], bs = -1e9;
  for (const m of mv) {
    const nb = b.slice(); apply(nb, m);
    const v = -search(nb, 1 - s, 4, -1e9, 1e9) + Math.random() * 2;
    if (v > bs) { bs = v; best = m; }
  }
  return best;
}
const same = (m, x) => m.from === x.from && m.path.length === x.path.length && m.path.every((q, k) => q === x.path[k]);

async function round(G, io) {
  const P = G.players;
  const F = G.k = { b: newBoard(), turn: (G.round - 1) % 2, over: false, winner: -1, last: null, quiet: 0, plies: 0 };
  io.render();
  await io.sleep(500);
  while (!F.over) {
    const i = F.turn, p = P[i], mv = legalMoves(F.b, i);
    if (!mv.length) { F.over = true; F.winner = 1 - i; break; }
    io.render();
    const a = await io.turn(p, {}, {
      auto: { t: 'move', from: mv[0].from, path: mv[0].path },
      validate: x => {
        if (!x || x.t !== 'move' || !Number.isInteger(x.from) || !Array.isArray(x.path) || x.path.length > 12 || !x.path.every(Number.isInteger)) return null;
        const m = mv.find(q => same(q, x)); return m ? { t: 'move', from: m.from, path: m.path } : null;
      },
      bot: () => { const m = botMove(F.b.slice(), i); return { t: 'move', from: m.from, path: m.path }; }, think: 900 + Math.random() * 600,
    });
    const m = mv.find(q => same(q, a));
    const wasMan = !isK(F.b[m.from]);
    apply(F.b, m);
    F.last = { from: m.from, to: m.path[m.path.length - 1] };
    F.quiet = m.caps.length || wasMan ? 0 : F.quiet + 1; F.plies++;
    if (m.caps.length) io.ev(p, `captures ${m.caps.length === 1 ? 'a piece' : m.caps.length + ' pieces'}`, `capture ${m.caps.length === 1 ? 'a piece' : m.caps.length + ' pieces'}`);
    if (F.quiet >= 60 || F.plies >= 240) F.over = true;
    else F.turn = 1 - i;
    io.render();
  }
  settlePot(G, ANTE, F.winner >= 0 ? [F.winner] : []);
  potSummary(G);
  if (F.winner < 0) io.line('Neither side can make progress. It is a draw.', true);
  io.render();
}
function view(G) {
  const F = G.k;
  if (!F) return { b: Array(64).fill(-1), turn: -1, over: false, winner: -1, last: null, delta: [] };
  return { b: F.b, turn: F.over ? -1 : F.turn, over: F.over, winner: F.winner, last: F.last, delta: G.players.map(p => (F.over ? p.delta || 0 : 0)) };
}

/* ----- screen: tap a piece, then tap where it goes (for a multi-jump, tap each landing in turn) ----- */
let S0 = null, pick = null, chosen = [];
function draw() {
  const S = S0, g = S.V.g, flip = S.me === 1;
  const mine = S.turn ? legalMoves(g.b.slice(), S.me) : [];
  let cand = [], hints = new Set(), movable = new Set(mine.map(m => m.from));
  if (pick !== null) {
    cand = mine.filter(m => m.from === pick && chosen.every((q, k) => m.path[k] === q));
    cand.forEach(m => hints.add(m.path[chosen.length]));
  }
  let html = '';
  for (let k = 0; k < 64; k++) {
    const sq = flip ? 63 - k : k, r = sq >> 3, c = sq & 7, dark = (r + c) % 2 === 1, v = g.b[sq];
    const cls = ['ck-sq', dark ? 'dk' : 'lt'];
    if (g.last && (g.last.from === sq || g.last.to === sq)) cls.push('last');
    if (pick === sq) cls.push('sel');
    if (hints.has(sq)) cls.push('hint');
    const can = dark && S.turn && (hints.has(sq) || (pick === null || chosen.length === 0) && movable.has(sq));
    html += `<button type="button" class="${cls.join(' ')}" data-sq="${sq}" ${can ? '' : 'tabindex="-1"'} aria-label="${dark ? 'Square ' + (r + 1) + ',' + (c + 1) : 'Light square'}">${
      v >= 0 ? `<span class="ck-pc p${side(v)}${isK(v) ? ' king' : ''}${movable.has(sq) ? ' can' : ''}">${isK(v) ? '♛' : ''}</span>` : ''}</button>`;
  }
  $('ck').innerHTML = html;
}
const ui = {
  mount(stage, ctl, S) {
    pick = null; chosen = [];
    stage.innerHTML = `<section class="table ckwrap"><div class="bt-opps" id="ckSeats"></div><div class="ck" id="ck"></div><div class="banner" id="ckBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<p class="hint bt-hint" id="ckHint"></p>`;
    $('ck').onclick = e => {
      const b = e.target.closest('[data-sq]'); if (!b || !S0 || !S0.turn) return;
      const sq = +b.dataset.sq, mine = legalMoves(S0.V.g.b.slice(), S0.me);
      if (pick !== null) {
        const cand = mine.filter(m => m.from === pick && chosen.every((q, k) => m.path[k] === q) && m.path[chosen.length] === sq);
        if (cand.length) {
          chosen = [...chosen, sq];
          const done = cand.find(m => m.path.length === chosen.length);
          if (done) { const m = done; pick = null; chosen = []; S0.send({ t: 'move', from: m.from, path: m.path }); return; }
          draw(); return;
        }
        if (chosen.length) return;
      }
      pick = mine.some(m => m.from === sq) ? (pick === sq ? null : sq) : null; chosen = [];
      draw();
    };
  },
  update(S) {
    S0 = S;
    const V = S.V, g = V.g;
    if (!S.turn) { pick = null; chosen = []; }
    $('ckSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Moving…' });
    draw();
    $('ckBanner').innerHTML = g.over && V.summary.length ? `<span>${g.winner >= 0 ? S.text(V.summary.find(e => e.p === g.winner) || V.summary[0]) : 'Draw. Everyone keeps their chips.'}</span>` : '';
    const must = S.turn && legalMoves(g.b.slice(), S.me).some(m => m.caps.length);
    $('ckHint').textContent = S.turn ? (pick === null ? (must ? 'You must capture. Tap a glowing piece.' : 'Your turn. Tap one of your glowing pieces.') : chosen.length ? 'Keep jumping. Tap the next square.' : 'Now tap the square to move to.') : '';
    return '';
  },
};

Club.register({
  id: 'checkers', cat: 'board', name: 'Checkers', tag: 'Jump your opponent’s pieces and crown your kings.', min: 2, max: 2, soloBots: 1, roundWord: 'Game',
  art: () => ['p0', 'p1', 'p0'].map(c => `<div class="disc ${c}"></div>`).join(''),
  rules: `<p><b>Goal:</b> capture all of your opponent’s pieces, or leave them with no move.</p>
    <ol><li>Two players take turns. Each starts with 12 pieces on the dark squares. You are gold or cream; yours start at the bottom of your screen.</li>
    <li>Tap one of your glowing pieces, then tap the dark square to move to. Pieces move one square diagonally <b>forward</b>.</li>
    <li>To capture, jump over an enemy piece that is next to yours, landing on the empty square behind it. <b>If you can capture, you must.</b> If you can jump again from where you land, keep going by tapping each landing square.</li>
    <li>A piece that reaches the far row is crowned a <b>king</b> (♛). Kings can move and jump both forwards and backwards.</li>
    <li>If neither side captures or moves a plain piece for a long time, the game is a draw.</li>
    <li>Each player puts in ${ANTE} chips and the winner takes both stakes. A draw returns the chips.</li></ol>`,
  round, view, ui,
  _test: { newBoard, legalMoves, apply, botMove },
});
})();
