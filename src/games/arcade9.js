/* ---------- Arcade engine games, part 9: backgammon, peg solitaire, nine men's morris, sokoban ---------- */
(function () {
const { W, H, R, clamp, LV, emo, txt, hud, sfx, register } = Arc;
const rr = (c, x, y, w, h, r, f) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); c.fillStyle = f; c.fill(); };
const inb = (x, y, b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

// ============ Backgammon ============
const BG = (() => {
  const dirOf = p => (p === 0 ? -1 : 1);
  const mineAt = (S, p, j) => (p === 0 ? Math.max(0, S.b[j]) : Math.max(0, -S.b[j]));
  const oppAt = (S, p, j) => mineAt(S, 1 - p, j);
  const pip = (p, i) => (p === 0 ? i + 1 : 24 - i);
  const clone = S => ({ b: S.b.slice(), bar: S.bar.slice(), off: S.off.slice() });
  const allHome = (S, p) => { if (S.bar[p]) return false; for (let i = 0; i < 24; i++) if (mineAt(S, p, i) && pip(p, i) > 6) return false; return true; };
  const add = (S, p, j, k) => { S.b[j] += (p === 0 ? k : -k); };
  function moves(S, p, d) {
    const out = [];
    if (S.bar[p] > 0) { const t = p === 0 ? 24 - d : d - 1; if (oppAt(S, p, t) < 2) out.push({ from: 'bar', to: t, d }); return out; }
    const dir = dirOf(p), home = allHome(S, p);
    for (let i = 0; i < 24; i++) {
      if (!mineAt(S, p, i)) continue;
      const t = i + dir * d;
      if (t >= 0 && t <= 23) { if (oppAt(S, p, t) < 2) out.push({ from: i, to: t, d }); }
      else if (home) { const pp = pip(p, i); if (d === pp) out.push({ from: i, to: 'off', d }); else if (d > pp) { let far = false; for (let k = 0; k < 24; k++) if (mineAt(S, p, k) && pip(p, k) > pp) { far = true; break; } if (!far) out.push({ from: i, to: 'off', d }); } }
    }
    return out;
  }
  function apply(S, p, m) {
    const N = clone(S);
    if (m.from === 'bar') N.bar[p]--; else add(N, p, m.from, -1);
    if (m.to === 'off') N.off[p]++;
    else { if (oppAt(N, p, m.to) === 1) { add(N, 1 - p, m.to, -1); N.bar[1 - p]++; m.hit = true; } add(N, p, m.to, 1); }
    return N;
  }
  const rest = (dice, d) => { const r = dice.slice(); r.splice(r.indexOf(d), 1); return r; };
  function best(S, p, dice) {
    let b = 0;
    for (const d of new Set(dice)) for (const m of moves(S, p, d)) { const v = 1 + best(apply(S, p, Object.assign({}, m)), p, rest(dice, d)); if (v > b) { b = v; if (b === dice.length) return b; } }
    return b;
  }
  function legal(S, p, dice) {
    const bst = best(S, p, dice); if (!bst) return [];
    const out = [];
    for (const d of new Set(dice)) for (const m of moves(S, p, d)) if (1 + best(apply(S, p, Object.assign({}, m)), p, rest(dice, d)) === bst) out.push(m);
    return out;
  }
  const pips = (S, p) => { let n = S.bar[p] * 25; for (let i = 0; i < 24; i++) n += mineAt(S, p, i) * pip(p, i); return n; };
  function evalS(S, p) {
    let v = (pips(S, 1 - p) - pips(S, p)) + 14 * S.off[p] - 14 * S.off[1 - p] - 14 * S.bar[p] + 10 * S.bar[1 - p];
    for (let i = 0; i < 24; i++) { const c = mineAt(S, p, i); if (c === 1) v -= (pip(p, i) > 6 ? 5 : 8); else if (c >= 2) v += 2 + (pip(p, i) <= 6 ? 2 : 0) + (c > 4 ? -(c - 4) : 0); }
    return v;
  }
  function plan(S, p, dice, lv) {
    // every full turn (list of moves) reachable, by distinct resulting position
    const seen = new Map();
    (function go(S0, left, seq) {
      const opts = legal(S0, p, left);
      if (!opts.length) { const key = S0.b.join() + '|' + S0.bar + '|' + S0.off; if (!seen.has(key)) seen.set(key, { S: S0, seq }); return; }
      for (const m of opts) { if (seen.size > 300) return; const mm = Object.assign({}, m); const N = apply(S0, p, mm); go(N, rest(left, m.d), seq.concat([mm])); }
    })(S, dice, []);
    const all = [...seen.values()]; if (!all.length) return [];
    all.forEach(o => { o.v = evalS(o.S, p); });
    all.sort((a, b) => b.v - a.v);
    if (lv === 0 && Math.random() < 0.5) return all[Math.floor(Math.random() * all.length)].seq;
    if (lv === 1) return all[Math.min(all.length - 1, Math.floor(Math.random() * Math.min(3, all.length)))].seq;
    return all[0].seq;
  }
  return { moves, apply, legal, plan, pips, mineAt, oppAt, clone, dirOf };
})();

register({ id: 'backgammon', cat: 'board', name: 'Backgammon', icon: '🎲', tag: 'The ancient race-and-hit dice board game.', goal: 'move all 15 of your checkers home and bear them off before the computer does.', limit: 960, how: 'You are the light checkers and move from the top right, around the board, down to the bottom right. Tap a checker to see where it can go, then tap the spot. Use both dice. You cannot land on a spot with two or more dark checkers; landing on a single one sends it to the bar. A checker on the bar must come back in first. Once all of yours are in the last quarter (bottom right) you can bear them off with the Off button. Winning with the computer still having none off is a gammon, worth extra.', par: 140,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Game over' };
    let S = { b: new Array(24).fill(0), bar: [0, 0], off: [0, 0] };
    [[23, 2], [12, 5], [7, 3], [5, 5]].forEach(([i, n]) => { S.b[i] = n; S.b[23 - i] = -n; });
    let turn = 0, phase = 'roll', dice = [], dice0 = [], sel = null, opts = [], wait = 0.6, plan = [], note = 'Your roll', t = 0, shown = [0, 0], rollAnim = 0;
    const roll = () => { const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6); return a === b ? [a, a, a, a] : [a, b]; };
    const finish = who => { g.over = true; const cp = BG.pips(S, 1), mp = BG.pips(S, 0); if (who === 0) { g.win = true; g.msg = S.off[1] === 0 ? 'Gammon! You win' : 'You win!'; g.score = 100 + (S.off[1] === 0 ? 60 : 0) + Math.min(40, Math.round(cp / 10)); } else { g.msg = 'Computer wins'; g.score = 10 + S.off[0] * 4; } };
    const startTurn = who => { turn = who; dice = roll(); dice0 = dice.slice(); sel = null; rollAnim = 0.5; phase = who === 0 ? 'rolling' : 'crolling'; note = who === 0 ? 'You rolled' : 'Computer rolled'; sfx('click'); };
    const refresh = () => { opts = BG.legal(S, 0, dice); if (!opts.length) { note = dice.length ? 'No legal move' : ''; wait = 0.9; phase = 'pass'; return; } const srcs = new Set(opts.map(m => m.from)); sel = srcs.size === 1 ? [...srcs][0] : null; phase = 'move'; };
    g.update = dt => {
      t += dt; if (g.over) return;
      if (t > 900) { finish(BG.pips(S, 0) <= BG.pips(S, 1) ? 0 : 1); return; }
      if (rollAnim > 0) { rollAnim -= dt; if (rollAnim <= 0) { if (phase === 'rolling') refresh(); else { plan = BG.plan(S, 1, dice, lv); phase = 'cpu'; wait = 0.5; if (!plan.length) { note = 'Computer cannot move'; wait = 0.9; phase = 'pass'; } } } return; }
      if (wait > 0 && (phase === 'roll' || phase === 'pass' || phase === 'cpu')) wait -= dt;
      if (phase === 'roll' && wait <= 0) startTurn(0);
      else if (phase === 'pass' && wait <= 0) { phase = 'roll'; wait = 0.5; turn = 1 - turn; if (turn === 1) startTurn(1); else startTurn(0); }
      else if (phase === 'cpu' && wait <= 0) {
        const m = plan.shift(); if (!m) { phase = 'pass'; wait = 0.5; return; }
        S = BG.apply(S, 1, m); if (m.hit) { sfx('thud'); note = 'Computer hits you!'; } else sfx('clack'); dice.splice(dice.indexOf(m.d), 1);
        if (S.off[1] >= 15) return finish(1);
        wait = 0.55; if (!plan.length) { phase = 'pass'; wait = 0.6; if (!note.includes('hits')) note = ''; }
      }
    };
    g.dbg = { get S() { return S; }, get phase() { return phase; }, get dice() { return dice; }, get opts() { return opts; }, get turn() { return turn; }, tap: (f, to) => tap(f, to), mine: BG.mineAt };
    const doMove = m => {
      const mm = Object.assign({}, m); S = BG.apply(S, 0, mm); dice.splice(dice.indexOf(m.d), 1); sel = null; sfx(mm.hit ? 'thud' : 'clack'); note = mm.hit ? 'You hit a checker!' : '';
      if (S.off[0] >= 15) return finish(0);
      if (!dice.length) { phase = 'pass'; wait = 0.5; return; }
      refresh();
    };
    const tap = (from, to) => { const m = opts.find(o => o.from === from && o.to === to); if (m) doMove(m); };
    // geometry: bottom row left to right 11..6, bar, 5..0 ; top row left to right 12..17, bar, 18..23
    const PW = 26, X0 = 8, BARX = 164, TOP = 56, BOT = 404, MID = 230;
    const colX = k => (k < 6 ? X0 + k * PW : BARX + 32 + (k - 6) * PW);
    const idxAt = (x, y) => { let k = -1; if (x >= X0 && x < X0 + 6 * PW) k = Math.floor((x - X0) / PW); else if (x >= BARX + 32 && x < BARX + 32 + 6 * PW) k = 6 + Math.floor((x - BARX - 32) / PW); else return -1; return y < MID ? 12 + k : 11 - k; };
    const posOf = j => { const top = j >= 12; const k = top ? j - 12 : 11 - j; return { top, k, x: colX(k) + PW / 2 }; };
    const OFFB = { x: 250, y: 410, w: 102, h: 30 };
    g.ptr = (tp, x, y) => {
      if (tp !== 'down' || g.over || phase !== 'move') return;
      const offOpt = opts.filter(o => o.to === 'off');
      if (inb(x, y, OFFB) && sel !== null) { const m = offOpt.find(o => o.from === sel); if (m) doMove(m); return; }
      if (x >= BARX && x < BARX + 32 && y > 60 && y < 400) { if (opts.some(o => o.from === 'bar')) sel = 'bar'; return; }
      const j = idxAt(x, y); if (j < 0) return;
      if (sel !== null) { const ms = opts.filter(o => o.from === sel && o.to === j); if (ms.length) { doMove(ms[0]); return; } }
      if (S.bar[0] > 0) { sfx('bad'); return; }
      if (opts.some(o => o.from === j)) { sel = j; sfx('tap'); } else { sel = null; }
    };
    const checker = (c, x, y, me) => { c.beginPath(); c.arc(x, y, 11.5, 0, 7); c.fillStyle = me ? '#f4ecd8' : '#3a1f14'; c.fill(); c.strokeStyle = me ? '#b8a77a' : '#120804'; c.lineWidth = 1.5; c.stroke(); c.beginPath(); c.arc(x, y, 7, 0, 7); c.strokeStyle = me ? '#d8c89a' : '#5a3a2a'; c.stroke(); };
    const stack = (c, x, top, n, me, dim) => { const lim = 5, step = n > lim ? Math.floor(((MID - TOP - 30) - 24) / (n - 1)) : 24; const gap = Math.min(24, Math.max(8, step)); for (let q = 0; q < n; q++) { const y = top ? TOP + 12 + q * gap : BOT - 12 - q * gap; checker(c, x, y, me); } };
    g.draw = c => {
      c.fillStyle = '#5a3a1e'; c.fillRect(0, 0, W, H); rr(c, 4, TOP - 6, 352, BOT - TOP + 12, 8, '#1f5a3e');
      c.fillStyle = '#3a2412'; c.fillRect(BARX, TOP - 6, 32, BOT - TOP + 12);
      const dest = new Set(opts.filter(o => sel !== null && o.from === sel).map(o => o.to));
      for (let j = 0; j < 24; j++) { const P = posOf(j), x = P.x, odd = (P.k % 2) === 0; const col = odd ? '#c8a25a' : '#8a3a2a'; c.fillStyle = col; c.beginPath(); if (P.top) { c.moveTo(x - 12, TOP); c.lineTo(x + 12, TOP); c.lineTo(x, TOP + 150); } else { c.moveTo(x - 12, BOT); c.lineTo(x + 12, BOT); c.lineTo(x, BOT - 150); } c.fill();
        if (dest.has(j)) { c.fillStyle = 'rgba(80,255,150,.45)'; c.fillRect(x - 13, P.top ? TOP : MID + 5, 26, P.top ? MID - TOP - 5 : BOT - MID - 5); }
        const m = S.b[j]; if (m > 0) stack(c, x, P.top, m, true); else if (m < 0) stack(c, x, P.top, -m, false);
        if (sel === j) { c.strokeStyle = '#ffe27a'; c.lineWidth = 3; c.strokeRect(x - 13, P.top ? TOP : MID + 5, 26, P.top ? MID - TOP - 5 : BOT - MID - 5); } }
      for (let q = 0; q < S.bar[1]; q++) checker(c, BARX + 16, MID - 40 - q * 20, false);
      for (let q = 0; q < S.bar[0]; q++) checker(c, BARX + 16, MID + 40 + q * 20, true);
      if (sel === 'bar') { c.strokeStyle = '#ffe27a'; c.lineWidth = 3; c.strokeRect(BARX + 1, MID + 20, 30, 120); }
      // dice
      const dx = 24, dy = 414; dice0.forEach((d, i) => { const used = i >= dice.length || dice.indexOf(d) < 0; const left = dice.slice(); const isUsed = (() => { const cp = dice.slice(); for (let q = 0; q <= i; q++) { const v = dice0[q]; const k = cp.indexOf(v); if (q === i) return k < 0; if (k >= 0) cp.splice(k, 1); } return true; })(); const x = dx + i * 38; rr(c, x, dy, 32, 32, 6, isUsed ? '#6a6a6a' : '#fdfbef'); const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[rollAnim > 0 ? 1 + Math.floor(Math.random() * 6) : d]; c.fillStyle = '#222'; P.forEach(([a, b]) => { c.beginPath(); c.arc(x + 16 + a * 8, dy + 16 + b * 8, 2.8, 0, 7); c.fill(); }); });
      const canOff = sel !== null && opts.some(o => o.from === sel && o.to === 'off'); rr(c, OFFB.x, OFFB.y, OFFB.w, OFFB.h, 8, canOff ? '#e8a33c' : '#3a5a4a'); txt(c, 'Bear off ▶', OFFB.x + OFFB.w / 2, OFFB.y + 20, 14, canOff ? '#2a1800' : '#7a9a8a', 'center');
      txt(c, note, 190, 462, 13, '#ffe27a', 'center'); txt(c, 'Off: you ' + S.off[0] + ' · computer ' + S.off[1], 10, 52, 11, '#cfe8d8');
      hud(c, turn === 0 ? 'Your move' : 'Computer…', 'Pips ' + BG.pips(S, 0) + ' v ' + BG.pips(S, 1));
    };
    startTurn(0); phase = 'rolling';
    return g;
  } });


// ============ Peg Solitaire ============
register({ id: 'pegs', cat: 'puzzle', name: 'Peg Solitaire', icon: '📍', tag: 'Jump pegs until only one is left.', goal: 'jump over pegs to remove them and finish with as few pegs as you can, ideally one in the centre.', how: 'Tap a peg, then tap an empty hole two steps away in a straight line with a peg in between. The peg you jumped is removed. Keep jumping until no jumps are left. One peg left is a win, and in the centre is the best. Undo takes back a jump (Easy has plenty, Medium 3, Hard none).', par: 190,
  make(lv) {
    const g = { score: 0, over: false, msg: 'No more jumps' }; const ok = (r, c) => r >= 0 && r < 7 && c >= 0 && c < 7 && !((r < 2 || r > 4) && (c < 2 || c > 4));
    const b = []; for (let r = 0; r < 7; r++) { b[r] = []; for (let c = 0; c < 7; c++) b[r][c] = ok(r, c) ? (r === 3 && c === 3 ? 0 : 1) : -1; }
    let sel = null, hist = [], t = 0, undos = LV(lv, 99, 3, 0); const X0 = 26, Y0 = 96, CS = 44; const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
    const jumps = (r, c) => dirs.map(([dr, dc]) => [r + dr, c + dc, r + dr / 2, c + dc / 2]).filter(([r2, c2, mr, mc]) => ok(r2, c2) && b[r2][c2] === 0 && b[mr][mc] === 1);
    const movable = (r, c) => b[r][c] === 1 && jumps(r, c).length > 0;
    const count = () => { let n = 0; for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (b[r][c] === 1) n++; return n; };
    const anyMove = () => { for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (movable(r, c)) return true; return false; };
    const finish = () => { g.over = true; const n = count(); g.score = (32 - n) * 6 + (n === 1 ? 80 : 0) + (n === 1 && b[3][3] === 1 ? 40 : 0); if (n === 1) { g.win = true; g.msg = b[3][3] === 1 ? 'Perfect! One peg, in the centre' : 'One peg left!'; } else g.msg = n + ' pegs left'; };
    g.update = dt => { t += dt; if (t > 230 && !g.over) finish(); };
    const jump = (r, c, r2, c2) => { hist.push(b.map(x => x.slice())); b[r][c] = 0; b[(r + r2) / 2][(c + c2) / 2] = 0; b[r2][c2] = 1; sel = null; sfx('pop'); if (!anyMove()) finish(); };
    g.dbg = { b, get sel() { return sel; }, tap: (r, c) => tap(r, c), moves: () => { const o = []; for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (b[r][c] === 1) jumps(r, c).forEach(j => o.push([r, c, j[0], j[1]])); return o; } };
    const tap = (r, c) => { if (!ok(r, c)) return; if (sel && b[r][c] === 0) { const j = jumps(sel[0], sel[1]).find(q => q[0] === r && q[1] === c); if (j) { jump(sel[0], sel[1], r, c); return; } } if (movable(r, c)) { sel = [r, c]; sfx('tap'); } else sel = null; };
    const UB = { x: 130, y: 424, w: 100, h: 34 };
    g.ptr = (tp, x, y) => { if (tp !== 'down' || g.over) return; if (inb(x, y, UB)) { if (hist.length && undos > 0) { const h = hist.pop(); for (let r = 0; r < 7; r++) b[r] = h[r]; undos--; sel = null; sfx('click'); } return; } tap(Math.floor((y - Y0) / CS), Math.floor((x - X0) / CS)); };
    g.draw = c => {
      c.fillStyle = '#6a4a2a'; c.fillRect(0, 0, W, H); rr(c, X0 - 8, Y0 - 8, 7 * CS + 16, 7 * CS + 16, 20, '#8a6234');
      for (let r = 0; r < 7; r++) for (let q = 0; q < 7; q++) { if (b[r][q] < 0) continue; const x = X0 + q * CS + CS / 2, y = Y0 + r * CS + CS / 2; c.beginPath(); c.arc(x, y, 15, 0, 7); c.fillStyle = '#4a3016'; c.fill();
        if (b[r][q] === 1) { c.beginPath(); c.arc(x, y, 14, 0, 7); const gr = c.createRadialGradient(x - 4, y - 4, 2, x, y, 14); gr.addColorStop(0, '#ffd27a'); gr.addColorStop(1, '#c0762a'); c.fillStyle = gr; c.fill(); if (sel && sel[0] === r && sel[1] === q) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); } else if (lv === 0 && movable(r, q)) { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.stroke(); } } }
      if (sel) jumps(sel[0], sel[1]).forEach(j => { const x = X0 + j[1] * CS + CS / 2, y = Y0 + j[0] * CS + CS / 2; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fillStyle = 'rgba(90,255,150,.8)'; c.fill(); });
      const can = hist.length && undos > 0; rr(c, UB.x, UB.y, UB.w, UB.h, 10, can ? '#e8a33c' : '#5a4a3a'); txt(c, undos > 50 ? 'Undo' : 'Undo (' + undos + ')', UB.x + 50, UB.y + 23, 15, can ? '#2a1800' : '#8a7a6a', 'center');
      hud(c, 'Pegs ' + count(), 'Removed ' + (32 - count()));
    };
    return g;
  } });

// ============ Nine Men's Morris ============
const MM = (() => {
  const adj = Array.from({ length: 24 }, () => []); const mills = [];
  for (let r = 0; r < 3; r++) { const bs = r * 8; for (let j = 0; j < 8; j++) { adj[bs + j].push(bs + (j + 1) % 8, bs + (j + 7) % 8); } [[0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0]].forEach(m => mills.push(m.map(x => bs + x))); }
  for (const j of [1, 3, 5, 7]) { adj[j].push(8 + j); adj[8 + j].push(j, 16 + j); adj[16 + j].push(8 + j); mills.push([j, 8 + j, 16 + j]); }
  const millsOf = Array.from({ length: 24 }, (_, i) => mills.filter(m => m.includes(i)));
  const inMill = (p, i, pl) => millsOf[i].some(m => m.every(x => p[x] === pl));
  const tot = (S, pl) => S.hand[pl] + S.n[pl];
  const clone = S => ({ p: S.p.slice(), hand: S.hand.slice(), n: S.n.slice() });
  function gen(S, pl) {
    const op = 3 - pl, out = [], base = [];
    if (S.hand[pl] > 0) { for (let i = 0; i < 24; i++) if (!S.p[i]) base.push({ from: -1, to: i }); }
    else { const fly = S.n[pl] === 3; for (let i = 0; i < 24; i++) if (S.p[i] === pl) { if (fly) { for (let j = 0; j < 24; j++) if (!S.p[j]) base.push({ from: i, to: j }); } else for (const j of adj[i]) if (!S.p[j]) base.push({ from: i, to: j }); } }
    for (const m of base) {
      const q = S.p.slice(); if (m.from >= 0) q[m.from] = 0; q[m.to] = pl;
      if (inMill(q, m.to, pl)) { const all = []; for (let i = 0; i < 24; i++) if (q[i] === op) all.push(i); const free = all.filter(i => !inMill(q, i, op)); (free.length ? free : all).forEach(r => out.push({ from: m.from, to: m.to, rem: r })); if (!all.length) out.push({ from: m.from, to: m.to, rem: -1 }); }
      else out.push({ from: m.from, to: m.to, rem: -1 });
    }
    return out;
  }
  function apply(S, pl, m) { const N = clone(S); if (m.from >= 0) N.p[m.from] = 0; else { N.hand[pl]--; N.n[pl]++; } N.p[m.to] = pl; if (m.rem >= 0) { N.p[m.rem] = 0; N.n[3 - pl]--; } return N; }
  function ev(S) { let v = 22 * (tot(S, 2) - tot(S, 1)); if (S.hand[1] + S.hand[2] === 0) v += gen(S, 2).length - gen(S, 1).length; for (const m of mills) { const a = m.filter(i => S.p[i] === 2).length, b = m.filter(i => S.p[i] === 1).length; if (a === 2 && b === 0) v += 6; if (b === 2 && a === 0) v -= 7; } return v; }
  function mm(S, pl, d, al, be) {
    if (S.hand[1] + S.hand[2] === 0 || true) { if (tot(S, 1) < 3) return 1000 + d; if (tot(S, 2) < 3) return -1000 - d; }
    const ms = gen(S, pl); if (!ms.length && S.hand[pl] === 0) return pl === 2 ? -1000 - d : 1000 + d; if (d === 0) return ev(S);
    if (pl === 2) { let b = -1e9; for (const m of ms) { const v = mm(apply(S, 2, m), 1, d - 1, al, be); if (v > b) b = v; if (b > al) al = b; if (al >= be) break; } return b; }
    let b = 1e9; for (const m of ms) { const v = mm(apply(S, 1, m), 2, d - 1, al, be); if (v < b) b = v; if (b < be) be = b; if (al >= be) break; } return b;
  }
  function choose(S, lv) {
    const ms = gen(S, 2); if (!ms.length) return null;
    const placing = S.hand[2] > 0, depth = lv === 0 ? 1 : lv === 1 ? 2 : (placing ? 2 : 3);
    if (lv === 0 && Math.random() < 0.3) return ms[Math.floor(Math.random() * ms.length)];
    let best = [], bv = -1e9; for (const m of ms) { const v = mm(apply(S, 2, m), 1, depth - 1, -1e9, 1e9) + Math.random() * 2; if (v > bv) { bv = v; best = [m]; } }
    return best[0];
  }
  const XY = i => { const r = Math.floor(i / 8), j = i % 8, h = [150, 100, 50][r], P = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]][j]; return [180 + P[0] * h, 250 + P[1] * h]; };
  return { adj, mills, gen, apply, choose, inMill, tot, XY };
})();

register({ id: 'morris', cat: 'board', name: "Nine Men's Morris", icon: '⭕', tag: 'Make mills and capture your rival’s pieces.', goal: 'leave the computer with only two pieces, or with no legal move.', how: 'Each side has 9 pieces. First take turns putting them on the points of the board. Lining up three in a row (a mill) lets you remove one of the computer’s pieces, tap the one to take. After all are placed, slide a piece along a line to a neighbouring empty point. When you are down to three pieces you can fly to any empty point. You are the light pieces and move first.', par: 150,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Game over' };
    let S = { p: new Array(24).fill(0), hand: [0, 9, 9], n: [0, 0, 0] }, turn = 1, mode = 'go', sel = -1, wait = 0, note = 'Place a piece', t = 0, pendMove = null, last = -1;
    const finish = who => { g.over = true; if (who === 1) { g.win = true; g.msg = 'You win!'; g.score = 100 + 12 * MM.tot(S, 1) + (9 - MM.tot(S, 2)) * 2; } else if (who === 2) { g.msg = 'Computer wins'; g.score = 15 + 6 * (9 - MM.tot(S, 2)); } else { const a = MM.tot(S, 1), b = MM.tot(S, 2); if (a > b) { g.win = true; g.msg = 'You win on pieces'; g.score = 80 + 8 * (a - b); } else { g.msg = a === b ? 'A draw' : 'Computer wins on pieces'; g.score = a === b ? 60 : 20; } } };
    const myMoves = () => MM.gen(S, 1);
    const endMine = () => { if (MM.tot(S, 2) < 3) return finish(1); turn = 2; wait = 0.8; note = 'Computer thinking'; sel = -1; mode = 'go'; };
    const cpu = () => { const m = MM.choose(S, lv); if (!m) return finish(1); S = MM.apply(S, 2, m); last = m.to; sfx(m.rem >= 0 ? 'thud' : 'clack'); note = m.rem >= 0 ? 'Computer made a mill!' : 'Your move'; if (MM.tot(S, 1) < 3) return finish(2); turn = 1; if (!myMoves().length && S.hand[1] === 0) return finish(2); };
    g.update = dt => { t += dt; if (g.over) return; if (t > 220) return finish(null); if (turn === 2) { wait -= dt; if (wait <= 0) cpu(); } };
    g.dbg = { get S() { return S; }, get turn() { return turn; }, get mode() { return mode; }, tap: i => tap(i), moves: () => myMoves() };
    let pend = [];
    const tap = i => {
      if (g.over || turn !== 1) return;
      if (mode === 'rem') { if (!pend.some(m => m.rem === i)) { sfx('bad'); return; } S.p[i] = 0; S.n[2]--; sfx('thud'); endMine(); return; }
      const ms = myMoves(); if (!ms.length) return;
      if (S.hand[1] > 0) { const cand = ms.filter(m => m.to === i); if (cand.length) commit(cand); return; }
      if (S.p[i] === 1) { if (ms.some(m => m.from === i)) { sel = i; sfx('tap'); } return; }
      if (sel >= 0) { const cand = ms.filter(m => m.from === sel && m.to === i); if (cand.length) commit(cand); }
    };
    const commit = cand => {
      const m0 = cand[0]; last = m0.to;
      if (m0.rem >= 0) { S = MM.apply(S, 1, Object.assign({}, m0, { rem: -1 })); pend = cand; mode = 'rem'; sel = -1; note = 'Mill! Tap a piece to remove'; sfx('coin'); return; }
      S = MM.apply(S, 1, m0); sfx('clack'); endMine();
    };
    g.ptr = (tp, x, y) => { if (tp !== 'down') return; let bi = -1, bd = 22; for (let i = 0; i < 24; i++) { const [px, py] = MM.XY(i), d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; bi = i; } } if (bi >= 0) tap(bi); };
    g.draw = c => {
      c.fillStyle = '#8a5a2e'; c.fillRect(0, 0, W, H); rr(c, 10, 80, 340, 340, 14, '#c89a5a');
      c.strokeStyle = '#4a2c10'; c.lineWidth = 3; for (let r = 0; r < 3; r++) { const h = [150, 100, 50][r]; c.strokeRect(180 - h, 250 - h, 2 * h, 2 * h); } [[180, 100, 180, 200], [180, 300, 180, 400], [30, 250, 130, 250], [230, 250, 330, 250]].forEach(l => { c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); c.stroke(); });
      const tg = new Set(); if (turn === 1 && mode === 'go') { const ms = myMoves(); if (S.hand[1] > 0) ms.forEach(m => tg.add(m.to)); else if (sel >= 0) ms.filter(m => m.from === sel).forEach(m => tg.add(m.to)); }
      const rm = new Set(); if (mode === 'rem') pend.forEach(m => rm.add(m.rem));
      for (let i = 0; i < 24; i++) { const [x, y] = MM.XY(i); c.beginPath(); c.arc(x, y, 5, 0, 7); c.fillStyle = '#4a2c10'; c.fill(); if (tg.has(i)) { c.beginPath(); c.arc(x, y, 9, 0, 7); c.fillStyle = 'rgba(40,200,110,.8)'; c.fill(); }
        if (S.p[i]) { c.beginPath(); c.arc(x, y, 14, 0, 7); c.fillStyle = S.p[i] === 1 ? '#f4ecd8' : '#3a1f14'; c.fill(); c.strokeStyle = S.p[i] === 1 ? '#a8976a' : '#120804'; c.lineWidth = 2; c.stroke(); if (sel === i) { c.strokeStyle = '#ffe27a'; c.lineWidth = 4; c.stroke(); } if (rm.has(i)) { c.strokeStyle = '#ff4a3a'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, 18, 0, 7); c.stroke(); } } }
      txt(c, 'To place: you ' + S.hand[1] + ' · computer ' + S.hand[2], 180, 442, 13, '#ffe9c0', 'center'); txt(c, note, 180, 464, 14, '#ffe27a', 'center');
      hud(c, turn === 1 ? 'Your move' : 'Computer…', 'You ' + MM.tot(S, 1) + ' v ' + MM.tot(S, 2));
    };
    return g;
  } });

// ============ Sokoban ============
const SOKO = [
  { m: ['#######', '#     #', '# .$@ #', '#     #', '#######'], o: 1 },
  { m: ['#######', '#  .  #', '#  $  #', '# @   #', '#######'], o: 2 },
  { m: ['########', '#  .   #', '# $$   #', '# @  . #', '########'], o: 10 },
  { m: ['#######', '#.  . #', '# $$  #', '#  @  #', '#     #', '#######'], o: 8 },
  { m: ['########', '#   .  #', '# $  # #', '#  @ $.#', '#      #', '########'], o: 10 },
  { m: ['#########', '#   .   #', '#  $$   #', '# .@ $. #', '#       #', '#########'], o: 8 },
  { m: ['#########', '#.  #   #', '#  $ $  #', '# #@ #. #', '#  $   .#', '#       #', '#########'], o: 26 },
  { m: ['#########', '#  .    #', '# $$  # #', '#. @  $ #', '#   .   #', '#       #', '#########'], o: 17 },
];
register({ id: 'sokoban', cat: 'puzzle', name: 'Sokoban', icon: '📦', tag: 'Push every crate onto a goal spot.', goal: 'push all the crates onto the marked spots. Clear as many rooms as you can in 4 minutes.', how: 'Move with the arrow keys or WASD, or tap beside the worker on a phone. Walk into a crate to push it one square. You cannot pull, and you cannot push two crates at once. Stuck? Undo takes back a move and Restart resets the room. Fewer moves earns a bonus.', par: 450,
  make(lv) {
    const g = { score: 0, over: false, t: 240, msg: 'Time!' }; let li = 0, L, walls, goals, boxes, pl, moves, hist, flash = 0, cleared = 0;
    const load = () => { const rows = SOKO[li].m; walls = new Set(); goals = new Set(); boxes = new Set(); rows.forEach((r, y) => [...r].forEach((ch, x) => { const k = x + ',' + y; if (ch === '#') walls.add(k); if (ch === '.' || ch === '*' || ch === '+') goals.add(k); if (ch === '$' || ch === '*') boxes.add(k); if (ch === '@' || ch === '+') pl = [x, y]; })); L = { w: rows[0].length, h: rows.length }; moves = 0; hist = []; };
    load();
    const solved = () => [...goals].every(k => boxes.has(k));
    const step = (dx, dy) => { if (g.over || flash > 0) return; const nx = pl[0] + dx, ny = pl[1] + dy, k = nx + ',' + ny; if (walls.has(k)) return; const snap = { pl: pl.slice(), boxes: new Set(boxes), moves };
      if (boxes.has(k)) { const k2 = (nx + dx) + ',' + (ny + dy); if (walls.has(k2) || boxes.has(k2)) { sfx('bad'); return; } boxes.delete(k); boxes.add(k2); sfx('thud'); } else sfx('tap');
      hist.push(snap); pl = [nx, ny]; moves++;
      if (solved()) { const extra = Math.max(0, moves - SOKO[li].o); g.score += 60 + Math.max(0, 40 - extra * 2); cleared++; flash = 1; sfx('win'); } };
    g.update = dt => { g.t -= dt; if (g.t <= 0) { g.over = true; if (cleared >= SOKO.length) g.win = true; return; } if (flash > 0) { flash -= dt; if (flash <= 0) { li++; if (li >= SOKO.length) { g.over = true; g.win = true; g.msg = 'All rooms cleared!'; g.score += Math.round(g.t); sfx('win'); } else load(); } } };
    const undo = () => { if (flash > 0 || !hist.length) return; const h = hist.pop(); pl = h.pl; boxes = h.boxes; moves = h.moves; sfx('click'); };
    g.dbg = { get li() { return li; }, get cleared() { return cleared; }, step, get walls() { return walls; }, get goals() { return goals; }, get boxes() { return boxes; }, get pl() { return pl; }, get L() { return L; }, get flash() { return flash; } };
    g.key = (k, d) => { if (!d) return; const m = { ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0], ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1] }[k]; if (m) step(m[0], m[1]); else if (k === 'z' || k === 'Z' || k === 'u') undo(); else if (k === 'r' || k === 'R') { load(); } };
    const UB = { x: 40, y: 436, w: 120, h: 34 }, RB = { x: 200, y: 436, w: 120, h: 34 };
    const geom = () => { const cs = Math.min(Math.floor(340 / L.w), Math.floor(350 / L.h), 46); return { cs, ox: Math.floor((W - cs * L.w) / 2), oy: 60 + Math.floor((366 - cs * L.h) / 2) }; };
    g.ptr = (tp, x, y) => { if (tp !== 'down' || g.over) return; if (inb(x, y, UB)) return undo(); if (inb(x, y, RB)) { if (flash <= 0) load(); return; } const G = geom(), px = G.ox + pl[0] * G.cs + G.cs / 2, py = G.oy + pl[1] * G.cs + G.cs / 2, dx = x - px, dy = y - py; if (Math.abs(dx) > Math.abs(dy)) step(dx > 0 ? 1 : -1, 0); else step(0, dy > 0 ? 1 : -1); };
    g.draw = c => {
      c.fillStyle = '#2a2a3a'; c.fillRect(0, 0, W, H); const G = geom(), cs = G.cs;
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const k = x + ',' + y, px = G.ox + x * cs, py = G.oy + y * cs; if (walls.has(k)) { rr(c, px, py, cs, cs, 4, '#7a5a3a'); c.strokeStyle = '#5a3c20'; c.strokeRect(px + 2, py + 2, cs - 4, cs - 4); } else { c.fillStyle = (x + y) % 2 ? '#3a3a50' : '#34344a'; c.fillRect(px, py, cs, cs); if (goals.has(k)) { c.beginPath(); c.arc(px + cs / 2, py + cs / 2, cs * 0.18, 0, 7); c.fillStyle = '#ff6a6a'; c.fill(); } } }
      boxes.forEach(k => { const [x, y] = k.split(',').map(Number), on = goals.has(k); rr(c, G.ox + x * cs + 3, G.oy + y * cs + 3, cs - 6, cs - 6, 5, on ? '#6ad66a' : '#d9a050'); c.strokeStyle = on ? '#2a8a2a' : '#8a5a20'; c.lineWidth = 2; c.strokeRect(G.ox + x * cs + 7, G.oy + y * cs + 7, cs - 14, cs - 14); });
      emo(c, '🧑', G.ox + pl[0] * cs + cs / 2, G.oy + pl[1] * cs + cs / 2 + 2, cs * 0.8);
      rr(c, UB.x, UB.y, UB.w, UB.h, 10, '#e8a33c'); txt(c, 'Undo', UB.x + 60, UB.y + 23, 15, '#2a1800', 'center'); rr(c, RB.x, RB.y, RB.w, RB.h, 10, '#c4403a'); txt(c, 'Restart', RB.x + 60, RB.y + 23, 15, '#fff', 'center');
      if (flash > 0) txt(c, 'Room cleared!', W / 2, 52, 22, '#7aff9a', 'center');
      hud(c, 'Room ' + Math.min(li + 1, SOKO.length) + '/' + SOKO.length + ' · ' + moves + ' moves', 'Score ' + g.score + ' · ' + Math.ceil(g.t) + 's');
    };
    return g;
  } });

})();
