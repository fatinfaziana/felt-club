/* ---------- Chess: full rules, two players, no betting ---------- */
(function () {
// board: 64 ints, row 0 is rank 8. White 1..6 (P N B R Q K), black -1..-6.
const ANTE = 20, P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
const GLYPH = { 1: '♙', 2: '♘', 3: '♗', 4: '♖', 5: '♕', 6: '♔', '-1': '♟', '-2': '♞', '-3': '♝', '-4': '♜', '-5': '♛', '-6': '♚' };
const VAL = [0, 100, 320, 330, 500, 900, 0];
const side = v => (v > 0 ? 0 : 1);
const sgn = s => (s === 0 ? 1 : -1);
function start() {
  const b = Array(64).fill(0), back = [R, N, B, Q, K, B, N, R];
  for (let c = 0; c < 8; c++) { b[c] = -back[c]; b[8 + c] = -P; b[48 + c] = P; b[56 + c] = back[c]; }
  return { b, turn: 0, cas: [true, true, true, true], ep: -1, half: 0, plies: 0, keys: {} };   // cas: white K, white Q, black K, black Q
}
const KN = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]], KG = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const ROOK = [[-1,0],[1,0],[0,-1],[0,1]], BISH = [[-1,-1],[-1,1],[1,-1],[1,1]];
function attacked(b, sq, by) {            // is square sq attacked by side `by`?
  const r = sq >> 3, c = sq & 7, s = sgn(by);
  const pr = r + (by === 0 ? 1 : -1);
  for (const dc of [-1, 1]) if (pr >= 0 && pr < 8 && c + dc >= 0 && c + dc < 8 && b[pr * 8 + c + dc] === P * s) return true;
  for (const [dr, dc] of KN) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === N * s) return true; }
  for (const [dr, dc] of KG) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === K * s) return true; }
  for (const [dirs, a, z] of [[ROOK, R, Q], [BISH, B, Q]]) for (const [dr, dc] of dirs) {
    let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const v = b[rr * 8 + cc]; if (v) { if (v === a * s || v === z * s) return true; break; } rr += dr; cc += dc; }
  }
  return false;
}
const kingSq = (b, s) => b.indexOf(K * sgn(s));
function pseudo(st, s) {
  const { b } = st, out = [], me = sgn(s);
  for (let i = 0; i < 64; i++) {
    const v = b[i]; if (!v || side(v) !== s) continue;
    const t = Math.abs(v), r = i >> 3, c = i & 7;
    const add = (to, extra) => out.push(Object.assign({ from: i, to }, extra || {}));
    if (t === P) {
      const dr = s === 0 ? -1 : 1, sr = s === 0 ? 6 : 1, lr = s === 0 ? 0 : 7, r1 = r + dr;
      const push = (to, extra) => { if ((to >> 3) === lr) for (const p of [Q, R, B, N]) add(to, Object.assign({ promo: p }, extra || {})); else add(to, extra); };
      if (r1 >= 0 && r1 < 8 && !b[r1 * 8 + c]) { push(r1 * 8 + c); if (r === sr && !b[(r + 2 * dr) * 8 + c]) add((r + 2 * dr) * 8 + c, { dbl: true }); }
      for (const dc of [-1, 1]) { const cc = c + dc; if (cc < 0 || cc > 7 || r1 < 0 || r1 > 7) continue; const to = r1 * 8 + cc;
        if (b[to] && side(b[to]) !== s) push(to); else if (to === st.ep) add(to, { ep: true }); }
    } else if (t === N || t === K) {
      for (const [dr, dc] of (t === N ? KN : KG)) { const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue; const to = rr * 8 + cc; if (!b[to] || side(b[to]) !== s) add(to); }
      if (t === K) {
        const row = s === 0 ? 7 : 0, ki = s * 2;
        if (i === row * 8 + 4 && !attacked(b, i, 1 - s)) {
          if (st.cas[ki] && !b[row * 8 + 5] && !b[row * 8 + 6] && b[row * 8 + 7] === R * me && !attacked(b, row * 8 + 5, 1 - s) && !attacked(b, row * 8 + 6, 1 - s)) add(row * 8 + 6, { castle: 'k' });
          if (st.cas[ki + 1] && !b[row * 8 + 3] && !b[row * 8 + 2] && !b[row * 8 + 1] && b[row * 8] === R * me && !attacked(b, row * 8 + 3, 1 - s) && !attacked(b, row * 8 + 2, 1 - s)) add(row * 8 + 2, { castle: 'q' });
        }
      }
    } else {
      const dirs = t === R ? ROOK : t === B ? BISH : [...ROOK, ...BISH];
      for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const to = rr * 8 + cc; if (!b[to]) add(to); else { if (side(b[to]) !== s) add(to); break; } rr += dr; cc += dc; } }
    }
  }
  return out;
}
function apply(st, m) {
  const b = st.b.slice(), v = b[m.from], s = side(v), t = Math.abs(v);
  const cap = b[m.to] || (m.ep ? b[m.from + (m.to & 7) - (m.from & 7)] : 0);
  b[m.to] = m.promo ? m.promo * sgn(s) : v; b[m.from] = 0;
  if (m.ep) b[(m.from >> 3) * 8 + (m.to & 7)] = 0;
  if (m.castle) { const row = m.to >> 3; if (m.castle === 'k') { b[row * 8 + 5] = b[row * 8 + 7]; b[row * 8 + 7] = 0; } else { b[row * 8 + 3] = b[row * 8]; b[row * 8] = 0; } }
  const cas = st.cas.slice();
  if (t === K) { cas[s * 2] = false; cas[s * 2 + 1] = false; }
  for (const [sq, k] of [[63, 0], [56, 1], [7, 2], [0, 3]]) if (m.from === sq || m.to === sq) cas[k] = false;
  const ns = { b, turn: 1 - st.turn, cas, ep: m.dbl ? (m.from + m.to) / 2 : -1, half: t === P || cap ? 0 : st.half + 1, plies: st.plies + 1, keys: st.keys };
  return ns;
}
function legal(st, s = st.turn) {
  const out = [];
  for (const m of pseudo(st, s)) { const ns = apply(st, m); if (!attacked(ns.b, kingSq(ns.b, s), 1 - s)) out.push(m); }
  return out;
}
const inCheck = (st, s = st.turn) => attacked(st.b, kingSq(st.b, s), 1 - s);
const key = st => st.b.join(',') + '|' + st.turn + st.cas.map(Number).join('') + st.ep;
function insufficient(b) {
  const pcs = b.filter(v => v && Math.abs(v) !== K).map(Math.abs);
  return pcs.length === 0 || (pcs.length === 1 && (pcs[0] === N || pcs[0] === B));
}
// score from white's point of view, for the bot
const PST = i => { const r = i >> 3, c = i & 7; return (3 - Math.abs(3.5 - c)) + (3 - Math.abs(3.5 - r)); };
function evalSt(st) {
  let sc = 0;
  for (let i = 0; i < 64; i++) { const v = st.b[i]; if (!v) continue; const t = Math.abs(v), s = v > 0 ? 1 : -1, r = i >> 3;
    sc += s * (VAL[t] + (t === P ? (v > 0 ? 6 - r : r - 1) * 6 + PST(i) : t === K ? 0 : PST(i) * 4)); }
  return sc;
}
function search(st, d, al, be, s) {            // negamax from side s
  const mv = legal(st, s);
  if (!mv.length) return inCheck(st, s) ? -99999 - d : 0;
  if (d === 0) return (s === 0 ? 1 : -1) * evalSt(st);
  mv.sort((x, y) => (Math.abs(st.b[y.to]) || 0) - (Math.abs(st.b[x.to]) || 0));
  let best = -1e9;
  for (const m of mv) { const v = -search(apply(st, m), d - 1, -be, -al, 1 - s); if (v > best) best = v; if (best > al) al = best; if (al >= be) break; }
  return best;
}
function botMove(st, lv = 1) {
  const s = st.turn, mv = legal(st, s);
  if (Math.random() < [0.4, 0.07, 0][lv]) return mv[rnd(mv.length)];
  let best = mv[0], bs = -1e9;
  for (const m of shuffle(mv.slice())) { const v = -search(apply(st, m), [1, 3, 3][lv], -1e9, 1e9, 1 - s) + Math.random() * 6; if (v > bs) { bs = v; best = m; } }
  return best;
}
const sameMove = (m, x) => m.from === x.from && m.to === x.to && (m.promo || 0) === (x.promo || 0);
const SQ = i => 'abcdefgh'[i & 7] + (8 - (i >> 3));

async function round(G, io) {
  const Pl = G.players;
  const C = G.ch = Object.assign(start(), { over: false, winner: -1, last: null, why: '' });
  C.turn = 0;                                   // white always moves first; seats alternate colours each game
  C.white = (G.round - 1) % 2; C.keys[key(C)] = 1;
  const seatOf = col => (col === 0 ? C.white : 1 - C.white);   // colour -> seat
  io.render(); await io.sleep(400);
  while (!C.over) {
    const col = C.turn, seat = seatOf(col), mv = legal(C, col);
    if (!mv.length) { C.over = true; if (inCheck(C, col)) { C.winner = seatOf(1 - col); C.why = 'Checkmate'; } else C.why = 'Stalemate'; break; }
    if (C.half >= 100) { C.over = true; C.why = 'Fifty moves without a capture or pawn move'; break; }
    if (insufficient(C.b)) { C.over = true; C.why = 'Not enough pieces to checkmate'; break; }
    if (C.plies >= 400) { C.over = true; C.why = 'Move limit reached'; break; }
    io.render();
    const a = await io.turn(Pl[seat], {}, { timeout: 90000, auto: { t: 'move', from: mv[0].from, to: mv[0].to, promo: mv[0].promo || 0 },
      validate: x => (x && x.t === 'move' && Number.isInteger(x.from) && Number.isInteger(x.to) && mv.some(m => sameMove(m, { from: x.from, to: x.to, promo: x.promo || 0 })) ? { t: 'move', from: x.from, to: x.to, promo: x.promo || 0 } : null),
      bot: () => { const m = botMove(C, G.level); return { t: 'move', from: m.from, to: m.to, promo: m.promo || 0 }; }, think: 1000 + Math.random() * 600 });
    const m = mv.find(q => sameMove(q, { from: a.from, to: a.to, promo: a.promo || 0 }));
    const piece = Math.abs(C.b[m.from]), took = C.b[m.to] || m.ep;
    const ns = apply(C, m); Object.assign(C, { b: ns.b, turn: ns.turn, cas: ns.cas, ep: ns.ep, half: ns.half, plies: ns.plies });
    C.last = { from: m.from, to: m.to };
    const k = key(C); C.keys[k] = (C.keys[k] || 0) + 1;
    io.ev(Pl[seat], `${m.castle ? 'castles' : 'plays ' + SQ(m.from) + ' to ' + SQ(m.to)}${took ? ' and captures' : ''}${m.promo ? ' and promotes' : ''}${inCheck(C) ? '. Check' : ''}`,
      `${m.castle ? 'castle' : 'play ' + SQ(m.from) + ' to ' + SQ(m.to)}${took ? ' and capture' : ''}${m.promo ? ' and promote' : ''}${inCheck(C) ? '. Check' : ''}`);
    if (C.keys[k] >= 3) { C.over = true; C.why = 'The same position three times'; }
    io.render();
  }
  settlePot(G, ANTE, C.winner >= 0 ? [C.winner] : []); potSummary(G);
  io.line(C.why + '.', true); io.render();
}
function view(G) {
  const C = G.ch;
  if (!C) return { b: Array(64).fill(0), turn: -1, col: 0, white: 0, cas: [false, false, false, false], ep: -1, over: false, winner: -1, why: '', last: null, check: false, delta: [] };
  return { b: C.b, col: C.turn, white: C.white, cas: C.cas, ep: C.ep, turn: C.over ? -1 : (C.turn === 0 ? C.white : 1 - C.white), over: C.over, winner: C.winner, why: C.why, last: C.last, check: !C.over && inCheck(C), delta: G.players.map(p => (C.over ? p.delta || 0 : 0)) };
}

let S0 = null, sel = -1, promoFor = null;
function stateOf(g) { return { b: g.b, turn: g.col, cas: g.cas, ep: g.ep, half: 0, plies: 0, keys: {} }; }
const SOLID = { 1: '♟', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚' }, PVAL = { 1: 1, 2: 3, 3: 3, 4: 5, 5: 9, 6: 0 }, START_N = { 1: 8, 2: 2, 3: 2, 4: 2, 5: 1, 6: 1 };
const glyph = v => SOLID[Math.abs(v)] + '︎';
// Pieces each side has lost, worked out from what is left on the board (a promoted pawn is not counted as lost).
function lost(b) {
  const out = [{}, {}];                                    // [white lost, black lost]
  const cnt = [{}, {}];
  for (const v of b) if (v) { const c = v > 0 ? 0 : 1, t = Math.abs(v); cnt[c][t] = (cnt[c][t] || 0) + 1; }
  for (let c = 0; c < 2; c++) {
    let promos = 0;
    for (const t of [2, 3, 4, 5]) { const d = (cnt[c][t] || 0) - START_N[t]; if (d > 0) promos += d; }
    for (const t of [1, 2, 3, 4, 5]) { let m = START_N[t] - (cnt[c][t] || 0); if (t === 1) m -= promos; if (m > 0) out[c][t] = m; }
  }
  return out;
}
const matOf = L => Object.keys(L).reduce((a, t) => a + PVAL[t] * L[t], 0);
function bar(S, g, seat, L, who) {
  const col = seat === g.white ? 0 : 1, mine = seat === S.me;
  const taken = L[1 - col];                                  // pieces this seat has captured
  const adv = matOf(L[1 - col]) - matOf(L[col]);
  const tk = [5, 4, 3, 2, 1].map(t => (glyph(t).repeat(0) + Array(taken[t] || 0).fill(`<span class="ch-cp ${col === 0 ? 'bk' : 'wh'}">${glyph(t)}</span>`).join(''))).join('');
  const active = !g.over && g.turn === seat;
  const tag = g.over ? '' : active ? (mine ? '<span class="ch-turn me">Your turn</span>' : `<span class="ch-turn">${g.check ? 'In check…' : 'Thinking…'}</span>`) : '';
  return `<div class="ch-bar${active ? ' on' : ''}"><div class="ch-who"><i class="ch-disc ${col === 0 ? 'wh' : 'bk'}"></i><b>${esc(S.nameOf(seat))}${mine ? ' (you)' : ''}</b><small>${col === 0 ? 'White' : 'Black'}</small></div><div class="ch-taken" aria-label="Pieces captured">${tk || '<span class="ch-none">No captures yet</span>'}${adv > 0 ? `<em>+${adv}</em>` : ''}</div>${tag}</div>`;
}
function draw() {
  const S = S0, g = S.V.g, mine = S.turn ? legal(stateOf(g), g.col) : [];
  const bottom = S.me >= 0 ? S.me : g.white, top = 1 - bottom;
  const flip = bottom !== g.white;
  const dests = sel >= 0 ? mine.filter(m => m.from === sel).map(m => m.to) : [];
  const ks = g.check ? kingSq(g.b, g.col) : -1;
  let html = '';
  for (let k = 0; k < 64; k++) {
    const i = flip ? 63 - k : k, v = g.b[i], dark = ((i >> 3) + (i & 7)) % 2 === 1, r = k >> 3, c = k & 7;
    const cls = ['ch-sq', dark ? 'dk' : 'lt'];
    if (g.last && (g.last.from === i || g.last.to === i)) cls.push('last');
    if (sel === i) cls.push('sel'); if (dests.includes(i)) cls.push(v ? 'cap' : 'mv'); if (ks === i) cls.push('chk');
    const rank = c === 0 ? `<i class="ch-rk">${8 - (i >> 3)}</i>` : '', file = r === 7 ? `<i class="ch-fl">${'abcdefgh'[i & 7]}</i>` : '';
    html += `<button type="button" class="${cls.join(' ')}" data-i="${i}" aria-label="${SQ(i)}${v ? ', ' + (v > 0 ? 'white' : 'black') + ' piece' : ''}">${rank}${file}${v ? `<span class="ch-p ${v > 0 ? 'wh' : 'bk'}">${glyph(v)}</span>` : ''}</button>`;
  }
  $('ch').innerHTML = html;
  const L = lost(g.b);
  $('chTop').innerHTML = bar(S, g, top, L);
  $('chBot').innerHTML = bar(S, g, bottom, L);
  $('chPromo').hidden = !promoFor;
}
function pick(i) {
  if (!S0 || !S0.turn) return;
  const g = S0.V.g, mine = legal(stateOf(g), g.col);
  if (sel >= 0) {
    const opts = mine.filter(m => m.from === sel && m.to === i);
    if (opts.length) {
      if (opts[0].promo) { promoFor = { from: sel, to: i }; draw(); return; }
      sel = -1; S0.send({ t: 'move', from: opts[0].from, to: i, promo: 0 }); return;
    }
  }
  sel = mine.some(m => m.from === i) && sel !== i ? i : -1; draw();
}
const ui = {
  mount(stage, ctl) {
    sel = -1; promoFor = null;
    stage.innerHTML = `<div class="chfit"><section class="chbox"><div id="chTop" class="ch-side sdt"></div><div class="ch" id="ch"></div><div id="chBot" class="ch-side sdb"></div><div class="banner" id="chBanner" aria-live="polite"></div></section></div>`;
    ctl.innerHTML = `<div class="act"><div class="betrow" id="chPromo" hidden><span class="hint">Promote the pawn to:</span>${[[Q, 'Queen ♕'], [R, 'Rook ♖'], [B, 'Bishop ♗'], [N, 'Knight ♘']].map(([p, l]) => `<button type="button" class="pill" data-p="${p}">${l}</button>`).join('')}</div><p class="hint bt-hint" id="chHint"></p></div>`;
    // pointerdown so a tap lands instantly on a tablet (no click delay)
    $('ch').onpointerdown = e => { const b = e.target.closest('[data-i]'); if (!b) return; e.preventDefault(); pick(+b.dataset.i); };
    $('ch').onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.i) { e.preventDefault(); pick(+e.target.dataset.i); } };
    $('chPromo').onclick = e => { const b = e.target.closest('[data-p]'); if (b && promoFor) { const m = promoFor; promoFor = null; sel = -1; S0.send({ t: 'move', from: m.from, to: m.to, promo: +b.dataset.p }); } };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    if (!S.turn) { sel = -1; promoFor = null; }
    draw();
    $('chBanner').innerHTML = g.over ? `<span>${g.why}.</span>` + (g.winner >= 0 && V.summary.length ? `<span>${S.text(V.summary.find(e => e.p === g.winner) || V.summary[0])}</span>` : '<span>A draw.</span>') : '';
    $('chHint').textContent = S.turn ? (sel >= 0 ? 'Now tap a marked square' : g.check ? 'You are in check. Tap a piece to move.' : 'Tap a piece, then where it goes.') : '';
    return '';
  },
};

Club.register({
  id: 'chess', cat: 'board', name: 'Chess', tag: 'The classic game of strategy. Full rules, for two.', min: 2, max: 2, soloBots: 1, roundWord: 'Game', levels: true,
  art: () => ['♞', '♚', '♜'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> trap your opponent’s king so it cannot escape capture. This is called <b>checkmate</b>.</p>
    <ol><li>Two players take turns. White moves first. You are shown which colour you play, and your pieces start at the bottom.</li>
    <li>Tap one of your pieces to see where it can go, then tap a highlighted square. Pawns move forward one square (two on their first move) and capture diagonally. Knights jump in an L shape. Bishops move diagonally, rooks in straight lines, queens both. The king moves one square any way.</li>
    <li>If a king is attacked, it is in <b>check</b>. You must get out of check on your move. The game only lets you make legal moves.</li>
    <li>Special moves: <b>castling</b> (move the king two squares towards a rook), <b>en passant</b> (a pawn capture after an enemy two-square pawn move), and <b>promotion</b> (a pawn reaching the far end becomes a queen, rook, bishop or knight).</li>
    <li>A game is drawn by stalemate (no legal move but not in check), the same position three times, fifty moves without a capture or pawn move, or too few pieces left.</li>
    <li>Each player puts in ${ANTE} free chips and the winner takes both stakes. A draw returns the chips. The chips have no cash value.</li></ol>`,
  round, view, ui, _test: { start, legal, apply, inCheck, botMove, key },
});
})();
