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
function botMove(st) {
  const s = st.turn, mv = legal(st, s);
  if (Math.random() < 0.07) return mv[rnd(mv.length)];
  let best = mv[0], bs = -1e9;
  for (const m of shuffle(mv.slice())) { const v = -search(apply(st, m), 3, -1e9, 1e9, 1 - s) + Math.random() * 6; if (v > bs) { bs = v; best = m; } }
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
      bot: () => { const m = botMove(C); return { t: 'move', from: m.from, to: m.to, promo: m.promo || 0 }; }, think: 1000 + Math.random() * 600 });
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
function draw() {
  const S = S0, g = S.V.g, mine = S.turn ? legal(stateOf(g), g.col) : [];
  const myCol = S.me === g.white ? 0 : 1, flip = myCol === 1;
  const dests = sel >= 0 ? mine.filter(m => m.from === sel).map(m => m.to) : [];
  const movable = new Set(mine.map(m => m.from));
  const ks = g.check ? kingSq(g.b, g.col) : -1;
  let html = '';
  for (let k = 0; k < 64; k++) {
    const i = flip ? 63 - k : k, v = g.b[i], dark = ((i >> 3) + (i & 7)) % 2 === 1;
    const cls = ['ch-sq', dark ? 'dk' : 'lt'];
    if (g.last && (g.last.from === i || g.last.to === i)) cls.push('last');
    if (sel === i) cls.push('sel'); if (dests.includes(i)) cls.push(v ? 'cap' : 'mv'); if (ks === i) cls.push('chk');
    html += `<button type="button" class="${cls.join(' ')}" data-i="${i}" ${S.turn && (movable.has(i) || dests.includes(i)) ? '' : 'tabindex="-1"'} aria-label="${SQ(i)}${v ? ', ' + (v > 0 ? 'white' : 'black') + ' piece' : ''}">${v ? `<span class="ch-p ${v > 0 ? 'w' : 'b'}">${GLYPH[v]}</span>` : ''}</button>`;
  }
  $('ch').innerHTML = html;
  $('chPromo').hidden = !promoFor;
}
const ui = {
  mount(stage, ctl) {
    sel = -1; promoFor = null;
    stage.innerHTML = `<section class="table c4wrap"><div class="bt-opps" id="chSeats"></div><div class="ch" id="ch"></div><div class="banner" id="chBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act"><div class="betrow" id="chPromo" hidden><span class="hint">Promote the pawn to:</span>${[[Q, 'Queen ♕'], [R, 'Rook ♖'], [B, 'Bishop ♗'], [N, 'Knight ♘']].map(([p, l]) => `<button type="button" class="pill" data-p="${p}">${l}</button>`).join('')}</div><p class="hint bt-hint" id="chHint"></p></div>`;
    $('ch').onclick = e => {
      const b = e.target.closest('[data-i]'); if (!b || !S0.turn) return;
      const i = +b.dataset.i, g = S0.V.g, mine = legal(stateOf(g), g.col);
      if (sel >= 0) {
        const opts = mine.filter(m => m.from === sel && m.to === i);
        if (opts.length) {
          if (opts[0].promo) { promoFor = { from: sel, to: i }; draw(); return; }
          sel = -1; S0.send({ t: 'move', from: opts[0].from, to: i, promo: 0 }); return;
        }
      }
      sel = mine.some(m => m.from === i) && sel !== i ? i : -1; draw();
    };
    $('chPromo').onclick = e => { const b = e.target.closest('[data-p]'); if (b && promoFor) { const m = promoFor; promoFor = null; sel = -1; S0.send({ t: 'move', from: m.from, to: m.to, promo: +b.dataset.p }); } };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    if (!S.turn) { sel = -1; promoFor = null; }
    const myCol = S.me === g.white ? 'White' : 'Black';
    $('chSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: g.check ? 'In check…' : 'Thinking…', extra: i => (i === g.white ? 'White' : 'Black') });
    draw();
    $('chBanner').innerHTML = g.over ? `<span>${g.why}.</span>` + (g.winner >= 0 && V.summary.length ? `<span>${S.text(V.summary.find(e => e.p === g.winner) || V.summary[0])}</span>` : '<span>A draw.</span>') : '';
    $('chHint').textContent = S.turn ? `You play ${myCol}. ${g.check ? 'You are in check. ' : ''}Tap a piece, then where it goes.` : '';
    return '';
  },
};

/* ----- 3D table ----- */
function clickSq(i) {
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
function makePiece(v) {
  // Turned-wood style pieces: every kind has its own clear silhouette (pawn ball, castle, horse, mitre, crown, cross).
  const TH = THREE, t = Math.abs(v), white = v > 0, g = new TH.Group();
  const m = T3.mat(white ? '#fff3dc' : '#241a16', { roughness: 0.4, metalness: 0.05, side: TH.DoubleSide });
  const gold = T3.mat('#d9a93c', { roughness: 0.3, metalness: 0.45 }), ink = T3.mat('#14100e', { roughness: 0.5 });
  const lathe = (pts, mt) => T3.mk(g, new TH.LatheGeometry(pts.map(p => new TH.Vector2(p[0], p[1])), 32), mt || m, 0, 0, 0);
  const base = [[0.001, 0], [0.4, 0], [0.43, 0.04], [0.43, 0.09], [0.36, 0.14], [0.3, 0.2], [0.3, 0.24]];
  const ring = (y, r) => T3.mk(g, new TH.TorusGeometry(r, 0.035, 8, 28), m, 0, y, 0).rotation.x = Math.PI / 2;
  if (t === 1) {                                   // pawn: small, round head on a short stem
    lathe([...base, [0.2, 0.34], [0.14, 0.5], [0.2, 0.58], [0.001, 0.58]]); ring(0.57, 0.19);
    T3.mk(g, T3.SPH(0.21, 20), m, 0, 0.76, 0);
  } else if (t === 4) {                            // rook: tower with battlements
    lathe([...base, [0.26, 0.34], [0.23, 0.78], [0.33, 0.86], [0.35, 0.92], [0.35, 1.06], [0.001, 1.06]]);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; const b = T3.mk(g, T3.BOX(0.16, 0.2, 0.13), m, Math.cos(a) * 0.27, 1.14, Math.sin(a) * 0.27); b.rotation.y = -a; }
  } else if (t === 3) {                            // bishop: mitre with a slit and a ball
    lathe([...base, [0.2, 0.36], [0.12, 0.7], [0.22, 0.78], [0.12, 0.86], [0.001, 0.86]]); ring(0.78, 0.2);
    const h = T3.mk(g, T3.SPH(0.2, 20), m, 0, 1.08, 0); h.scale.y = 1.55;
    const cut = T3.mk(g, T3.BOX(0.34, 0.05, 0.05), ink, 0.02, 1.14, 0.17); cut.rotation.z = 0.7;
    T3.mk(g, T3.SPH(0.07, 12), gold, 0, 1.46, 0);
  } else if (t === 5) {                            // queen: tall, with a crown of points
    lathe([...base, [0.22, 0.38], [0.13, 0.85], [0.17, 1.0], [0.3, 1.16], [0.24, 1.24], [0.001, 1.24]]); ring(0.98, 0.17);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; const c = T3.mk(g, new TH.ConeGeometry(0.05, 0.24, 8), m, Math.cos(a) * 0.23, 1.34, Math.sin(a) * 0.23); c.rotation.z = -Math.cos(a) * 0.25; c.rotation.x = Math.sin(a) * 0.25; T3.mk(g, T3.SPH(0.045, 8), gold, Math.cos(a) * 0.26, 1.48, Math.sin(a) * 0.26); }
    T3.mk(g, T3.SPH(0.11, 14), gold, 0, 1.4, 0);
  } else if (t === 6) {                            // king: crown band with a cross
    lathe([...base, [0.22, 0.38], [0.14, 0.9], [0.18, 1.04], [0.3, 1.2], [0.25, 1.3], [0.001, 1.3]]); ring(1.02, 0.18);
    T3.mk(g, new TH.TorusGeometry(0.22, 0.045, 8, 28), gold, 0, 1.33, 0).rotation.x = Math.PI / 2;
    T3.mk(g, T3.BOX(0.11, 0.42, 0.11), gold, 0, 1.62, 0); T3.mk(g, T3.BOX(0.32, 0.11, 0.11), gold, 0, 1.68, 0);
  } else {                                         // knight: a real horse-head profile
    lathe([...base, [0.24, 0.3], [0.001, 0.3]]);
    const sh = new TH.Shape();
    sh.moveTo(-0.26, 0.28); sh.lineTo(-0.28, 0.62); sh.quadraticCurveTo(-0.3, 0.95, -0.12, 1.14);      // back of the neck and mane
    sh.lineTo(-0.06, 1.3); sh.lineTo(0.04, 1.16);                                                          // ear
    sh.quadraticCurveTo(0.22, 1.14, 0.36, 0.9); sh.lineTo(0.5, 0.74); sh.quadraticCurveTo(0.54, 0.64, 0.46, 0.6); // forehead, nose
    sh.lineTo(0.3, 0.62); sh.quadraticCurveTo(0.14, 0.62, 0.1, 0.52); sh.quadraticCurveTo(0.2, 0.4, 0.26, 0.28); sh.lineTo(-0.26, 0.28);
    const geo = new TH.ExtrudeGeometry(sh, { depth: 0.26, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 10 });
    geo.translate(0, 0, -0.13);
    const k = new TH.Group(); g.add(k); T3.mk(k, geo, m, 0, 0, 0);
    for (const sz of [-1, 1]) T3.mk(k, T3.SPH(0.035, 8), ink, 0.3, 0.92, sz * 0.17);
    T3.mk(k, T3.BOX(0.07, 0.5, 0.05), ink, -0.3, 0.88, 0).rotation.z = 0.12;                              // mane stripe
    k.rotation.y = white ? Math.PI / 2 - 0.8 : -Math.PI / 2 + 0.8;
  }
  g.scale.setScalar(1.08);
  g.traverse(o => { o.castShadow = true; });
  return g;
}
function chess3d(box, S) {
  const TH = THREE, s = T3.stage(box, { fov: 38 }), sc = s.scene;
  T3.lounge(s, { w: 28, d: 24, lamps: [[-9, -6], [9, -6], [-9, 6], [9, 6]], lampPower: 0.5, ambient: 0.55 });
  const key = new TH.DirectionalLight(0xfff2d8, 0.85); key.position.set(4, 16, 9); key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005;
  key.target.position.set(0, 3, 0); sc.add(key, key.target);
  T3.mk(sc, new TH.CircleGeometry(10, 48), T3.mat('#5a1a2a', { roughness: 1 }), 0, 0.01, 0, { noCast: true }).rotation.x = -Math.PI / 2;
  T3.mk(sc, T3.BOX(11.5, 0.34, 11.5), T3.mat('#3d2312', { roughness: 0.35 }), 0, 2.83, 0);
  for (const x of [-5, 5]) for (const z of [-5, 5]) T3.mk(sc, T3.CYL(0.3, 0.34, 2.7, 14), T3.mat('#2e1a0d'), x, 1.35, z);
  const bd = new TH.Group(); bd.position.y = 3; sc.add(bd);
  const sqs = [], ov = [], marks = [], pick = [];
  const sqV = i => new TH.Vector3((i & 7) - 3.5, 0.2, (i >> 3) - 3.5);
  for (let i = 0; i < 64; i++) {
    const dark = ((i >> 3) + (i & 7)) % 2 === 1, v = sqV(i);
    const q = T3.mk(bd, T3.BOX(1, 0.2, 1), T3.mat(dark ? '#7d4c28' : '#dcc08e', { roughness: 0.45 }), v.x, 0.1, v.z, { noCast: true }); q.userData.sq = i; sqs.push(q); pick.push(q);
    const o = T3.mk(bd, new TH.PlaneGeometry(0.96, 0.96), new TH.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0, depthWrite: false }), v.x, 0.208, v.z, { noCast: true, noRecv: true }); o.rotation.x = -Math.PI / 2; ov.push(o);
    const mkr = T3.mk(bd, new TH.CircleGeometry(0.17, 20), new TH.MeshBasicMaterial({ color: 0x38d37a, transparent: true, opacity: 0.85, depthWrite: false }), v.x, 0.212, v.z, { noCast: true, noRecv: true }); mkr.rotation.x = -Math.PI / 2; mkr.visible = false; marks.push(mkr);
  }
  const wood = T3.mat('#4a2a12', { roughness: 0.4 });
  for (const [x, z, w, d] of [[0, -4.35, 9.4, 0.7], [0, 4.35, 9.4, 0.7], [-4.35, 0, 0.7, 8], [4.35, 0, 0.7, 8]]) T3.mk(bd, T3.BOX(w, 0.26, d), wood, x, 0.13, z);
  'abcdefgh'.split('').forEach((ch, c) => { for (const z of [-4.2, 4.2]) { const l = T3.label(ch, { scale: 0.7, bg: 'rgba(0,0,0,0)', color: '#e9d3a3', depthTest: false }); l.sprite.position.set(c - 3.5, 0.32, z); bd.add(l.sprite); } });
  for (let r = 0; r < 8; r++) for (const x of [-4.2, 4.2]) { const l = T3.label(String(8 - r), { scale: 0.7, bg: 'rgba(0,0,0,0)', color: '#e9d3a3', depthTest: false }); l.sprite.position.set(x, 0.32, r - 3.5); bd.add(l.sprite); }
  // people and chairs: white sits on the +z side
  const people = [], tags = [];
  for (const side of [1, -1]) {
    T3.mk(sc, T3.BOX(2.6, 0.3, 2.6), T3.mat('#2a1a3a', { roughness: 0.8 }), 0, 1.7, side * 7.6);
    T3.mk(sc, T3.BOX(2.6, 2.8, 0.28), T3.mat('#2a1a3a', { roughness: 0.8 }), 0, 3.1, side * 9.1);
    for (const x of [-1.1, 1.1]) for (const z of [-1.1, 1.1]) T3.mk(sc, T3.CYL(0.1, 0.1, 1.6, 8), T3.mat('#1d1226'), x, 0.8, side * 7.6 + z);
  }
  for (let i = 0; i < 2; i++) { const pp = T3.person(i ? '#e0443c' : '#3f8be8', { seated: true, idx: i }); pp.scale.setScalar(3); sc.add(pp); s.addPerson(pp); people.push(pp); const lb = T3.label('', { scale: 4.2 }); lb.sprite.position.y = 2.25; pp.add(lb.sprite); lb.sprite.scale.multiplyScalar(1 / 3); tags.push(lb); }
  s.hint('');
  // Camera distances are worked out from the screen shape so the whole board (and its edge) is always in view.
  const mkViews = side => {
    const a = s.camera.aspect || 1.5, fm = a >= 1.3 ? 1 : Math.min(1.9, 1.3 / a), vf = 40 * fm * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * a);
    const d = 5.7 / Math.tan(Math.min(vf, hf) / 2), e = 1.0;
    return {
      seat: { label: 'Seat', pos: [0, 3 + Math.sin(e) * d, side * Math.cos(e) * d], look: [0, 3, 0], fov: 40, zoom: 0, sway: 0.006 },
      top: { label: 'Top', pos: [0, 3 + d, side * 0.01], look: [0, 3, 0], up: [0, 0, -side], fov: 40, zoom: 0 },
      side: { label: 'Side', pos: [Math.cos(e) * d, 3 + Math.sin(e) * d * 0.8, 0], look: [0, 3, 0], fov: 40, zoom: 0 },
    };
  };
  s.minZoom = 0.9;
  s.onResize = () => { if (mySide) s.setViews(mkViews(mySide), s.view || 'seat', true); };
  let mySide = 0, pcs = [], built = false, lastSeat = null, SS = S;
  const seatNode = i => people[i];
  function place(white) {
    // seat index i sits on the side of its colour; white at +z
    const g = SS.V.g;
    for (let i = 0; i < 2; i++) { const isWhite = i === g.white; const pp = people[i]; pp.position.set(0, 0, isWhite ? 7.6 : -7.6); pp.rotation.y = isWhite ? Math.PI : 0; }
  }
  function build(v) { const p = { v, sq: 0, mesh: makePiece(v), used: false }; bd.add(p.mesh); return p; }
  function put(p, sq) { const v = sqV(sq); p.sq = sq; p.mesh.position.copy(v); p.mesh.userData.sq = sq; }
  function move(p, sq) {
    const a = p.mesh.position.clone(), b = sqV(sq), long = Math.abs(p.v) === 2 ? 1.1 : 0.55; p.sq = sq; p.mesh.userData.sq = sq;
    s.tween(560, (k, e) => p.mesh.position.set(a.x + (b.x - a.x) * e, 0.2 + Math.sin(Math.PI * e) * long, a.z + (b.z - a.z) * e), () => p.mesh.position.copy(b));
  }
  function kill(p) { s.tween(300, k => p.mesh.scale.setScalar(Math.max(0.01, 1 - k)), () => bd.remove(p.mesh)); }
  function reconcile(g) {
    const want = []; g.b.forEach((v, i) => { if (v) want.push([i, v]); });
    pcs.forEach(p => { p.used = false; }); const left = [];
    want.forEach(([i, v]) => { const m = pcs.find(p => !p.used && p.sq === i && p.v === v); if (m) m.used = true; else left.push([i, v]); });
    if (!built || left.length > 4) { pcs.forEach(p => bd.remove(p.mesh)); pcs = want.map(([i, v]) => { const p = build(v); put(p, i); p.used = true; return p; }); built = true; return; }
    const free = pcs.filter(p => !p.used);
    left.forEach(([i, v]) => {
      const cand = free.filter(p => p.v === v);
      if (!cand.length) { const p = build(v); put(p, i); p.mesh.scale.setScalar(0.01); s.tween(400, k => p.mesh.scale.setScalar(Math.max(0.01, k))); p.used = true; pcs.push(p); return; }
      const dist = p => Math.abs((p.sq >> 3) - (i >> 3)) + Math.abs((p.sq & 7) - (i & 7));
      const best = (g.last && cand.find(p => p.sq === g.last.from && g.last.to === i)) || cand.sort((a, b) => dist(a) - dist(b))[0];
      free.splice(free.indexOf(best), 1); move(best, i); best.used = true;
    });
    free.forEach(p => { kill(p); pcs.splice(pcs.indexOf(p), 1); });
  }
  function paint() {
    const g = SS.V.g, mine = SS.turn ? legal(stateOf(g), g.col) : [], dests = sel >= 0 ? mine.filter(m => m.from === sel).map(m => m.to) : [], movable = new Set(mine.map(m => m.from)), ks = g.check ? kingSq(g.b, g.col) : -1;
    for (let i = 0; i < 64; i++) {
      let c = 0, a = 0;
      if (g.last && (g.last.from === i || g.last.to === i)) { c = 0xffd34d; a = 0.32; }
      if (movable.has(i) && sel !== i) { c = 0x5aa9ff; a = 0.22; }
      if (sel === i) { c = 0x38d37a; a = 0.6; }
      if (ks === i) { c = 0xff3b30; a = 0.65; }
      ov[i].material.color.setHex(c || 0xffd34d); ov[i].material.opacity = a;
      marks[i].visible = dests.includes(i); marks[i].material.color.setHex(g.b[i] ? 0xff6a3d : 0x38d37a);
      marks[i].scale.setScalar(g.b[i] ? 2.1 : 1);
    }
  }
  s.onTap(e => {
    const hits = s.pick(e, [...pick, ...pcs.map(p => p.mesh)]); if (!hits.length) return;
    let o = hits[0].object; while (o && o.userData.sq === undefined) o = o.parent; if (!o) return;
    clickSq(o.userData.sq); paint(); s.hint(S0 && S0.turn ? (sel >= 0 ? 'Now tap a glowing square to move there' : 'Your move: tap one of your pieces') : '');
  });
  s.on((dt, t) => { // arms: the player whose move it is leans in
    const g = SS.V.g;
    people.forEach((pp, i) => { const act = g.turn === i && !g.over; pp.userData.arms[1].rotation.x += ((act ? -1.45 : -1.0) - pp.userData.arms[1].rotation.x) * Math.min(1, dt * 4); });
  });
  s.onView = n => { people.forEach((pp, i) => { pp.visible = !(n === 'seat' && i === SS.me); }); };
  s.sync = S2 => {
    SS = S2; const g = S2.V.g, side = S2.me >= 0 && S2.me !== g.white ? -1 : 1;
    if (side !== mySide) { mySide = side; s.setViews(mkViews(side), 'seat', !built); }
    place(); reconcile(g); paint();
    people.forEach((pp, i) => { tags[i].set(S2.nameOf(i), g.turn === i && !g.over ? '#f2b441' : '#f7f0e1'); });
    s.onView(s.view);
    s.hint(S2.turn ? (sel >= 0 ? 'Now tap a glowing square to move there' : 'Your move: tap one of your pieces') : '');
  };
  return s;
}

Club.register({
  id: 'chess', cat: 'board', name: 'Chess', tag: 'The classic game of strategy. Full rules, for two.', min: 2, max: 2, soloBots: 1, roundWord: 'Game',
  art: () => ['♞', '♚', '♜'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> trap your opponent’s king so it cannot escape capture. This is called <b>checkmate</b>.</p>
    <ol><li>Two players take turns. White moves first. You are shown which colour you play, and your pieces start at the bottom.</li>
    <li>Tap one of your pieces to see where it can go, then tap a highlighted square. Pawns move forward one square (two on their first move) and capture diagonally. Knights jump in an L shape. Bishops move diagonally, rooks in straight lines, queens both. The king moves one square any way.</li>
    <li>If a king is attacked, it is in <b>check</b>. You must get out of check on your move. The game only lets you make legal moves.</li>
    <li>Special moves: <b>castling</b> (move the king two squares towards a rook), <b>en passant</b> (a pawn capture after an enemy two-square pawn move), and <b>promotion</b> (a pawn reaching the far end becomes a queen, rook, bishop or knight).</li>
    <li>A game is drawn by stalemate (no legal move but not in check), the same position three times, fifty moves without a capture or pawn move, or too few pieces left.</li>
    <li>Each player puts in ${ANTE} free chips and the winner takes both stakes. A draw returns the chips. The chips have no cash value.</li></ol>`,
  round, view, ui, ui3d: T3.wrapUi(ui, { slot: st => ({ before: st.querySelector('#ch'), hide: [st.querySelector('#ch')] }), make: chess3d }), _test: { start, legal, apply, inCheck, botMove, key },
});
})();
