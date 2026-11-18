/* ---------- Arcade engine games, part 6: puzzle, word, math, trivia, mind ---------- */
(function () {
const { W, H, R, clamp, LV, emo, txt, hud, sfx, register } = Arc;
const rr = (c, x, y, w, h, r, f) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); c.fillStyle = f; c.fill(); };
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const inb = (x, y, b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const COL = ['#e8453c', '#3a8de0', '#35b56a', '#f2b441', '#9a5ad8', '#ee7d3a'];

// ============ Maze Runner ============
register({ id: 'maze', cat: 'puzzle', name: 'Maze Runner', icon: '🧭', tag: 'Find the way out, again and again.', goal: 'escape as many mazes as you can in 75 seconds.', how: 'Press and drag (or hold) toward where you want to go, or use the arrow keys. Reach the flag to get a new maze. Faster escapes score more.', par: 360,
  make(lv) {
    const g = { score: 0, over: false, t: 75, msg: 'Time!' }; const N = LV(lv, 8, 11, 14), CS = Math.floor(330 / N), OX = (W - CS * N) / 2, OY = 60; let cells, px, py, mv = 0, key = null, tgt = null, done = 0, flash = 0;
    const gen = () => { cells = Array.from({ length: N * N }, () => ({ n: 1, e: 1, s: 1, w: 1, v: 0 })); const st = [0]; cells[0].v = 1;
      while (st.length) { const i = st[st.length - 1], x = i % N, y = Math.floor(i / N), nb = []; if (y > 0 && !cells[i - N].v) nb.push([i - N, 'n', 's']); if (x < N - 1 && !cells[i + 1].v) nb.push([i + 1, 'e', 'w']); if (y < N - 1 && !cells[i + N].v) nb.push([i + N, 's', 'n']); if (x > 0 && !cells[i - 1].v) nb.push([i - 1, 'w', 'e']);
        if (!nb.length) { st.pop(); continue; } const [j, a, b] = nb[Math.floor(Math.random() * nb.length)]; cells[i][a] = 0; cells[j][b] = 0; cells[j].v = 1; st.push(j); } px = 0; py = 0; };
    gen();
    const step = d => { const c = cells[py * N + px]; if (d === 'n' && !c.n) py--; else if (d === 's' && !c.s) py++; else if (d === 'e' && !c.e) px++; else if (d === 'w' && !c.w) px--; else return; sfx('tap');
      if (px === N - 1 && py === N - 1) { done++; g.score += 60 + Math.round(g.t * 0.6) + N * 2; flash = 0.5; sfx('good'); gen(); } };
    g.update = dt => { g.t -= dt; flash -= dt; if (g.t <= 0) { g.over = true; return; } mv -= dt; if (mv <= 0) { const d = key || (tgt && (() => { const cx = OX + px * CS + CS / 2, cy = OY + py * CS + CS / 2, dx = tgt.x - cx, dy = tgt.y - cy; if (Math.hypot(dx, dy) < CS * 0.4) return null; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'e' : 'w') : (dy > 0 ? 's' : 'n'); })()); if (d) { step(d); mv = 0.085; } } };
    const M = { ArrowUp: 'n', ArrowDown: 's', ArrowLeft: 'w', ArrowRight: 'e', w: 'n', s: 's', a: 'w', d: 'e' };
    g.key = (k, d) => { if (M[k]) key = d ? M[k] : (key === M[k] ? null : key); };
    g.ptr = (t, x, y) => { if (t === 'down' || t === 'move') tgt = { x, y }; if (t === 'up') tgt = null; };
    g.draw = c => {
      c.fillStyle = flash > 0 ? '#2d4a38' : '#1d2433'; c.fillRect(0, 0, W, H); c.strokeStyle = '#8fb4ff'; c.lineWidth = 2.5; c.lineCap = 'round'; c.beginPath();
      cells.forEach((k, i) => { const x = OX + (i % N) * CS, y = OY + Math.floor(i / N) * CS; if (k.n) { c.moveTo(x, y); c.lineTo(x + CS, y); } if (k.w) { c.moveTo(x, y); c.lineTo(x, y + CS); } if (i % N === N - 1 && k.e) { c.moveTo(x + CS, y); c.lineTo(x + CS, y + CS); } if (i >= N * N - N && k.s) { c.moveTo(x, y + CS); c.lineTo(x + CS, y + CS); } }); c.stroke();
      emo(c, '🏁', OX + (N - 0.5) * CS, OY + (N - 0.5) * CS, CS * 0.7); emo(c, '🐭', OX + (px + 0.5) * CS, OY + (py + 0.5) * CS, CS * 0.7);
      hud(c, 'Escaped ' + done, 'Time ' + Math.ceil(g.t)); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(0, 464, W * clamp(g.t / 75, 0, 1), 6);
    };
    return g;
  } });

// ============ Colour Flood ============
register({ id: 'flood', cat: 'puzzle', name: 'Colour Flood', icon: '🎨', tag: 'Flood the whole board with one colour.', goal: 'turn the whole board one colour before you run out of moves.', how: 'You own the top-left corner. Tap a colour to flood your area with it, taking in every touching square of that colour. Fill the board in as few moves as you can. Keys 1 to 6 also work.', par: 380,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Out of moves' }; const N = LV(lv, 9, 12, 14), K = LV(lv, 5, 6, 6), CS = Math.floor(330 / N), OX = (W - CS * N) / 2, OY = 44; let moves = LV(lv, 20, 22, 25);
    const grid = Array.from({ length: N * N }, () => Math.floor(Math.random() * K)); let own = new Set([0]);
    const spread = () => { const col = grid[0]; const st = [...own]; own = new Set(); const seen = new Set(st); const q = [0]; own.add(0); while (q.length) { const i = q.pop(); const x = i % N, y = Math.floor(i / N); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) return; const j = ny * N + nx; if (!own.has(j) && grid[j] === col) { own.add(j); q.push(j); } }); } };
    spread();
    const pick = k => { if (g.over || k === grid[0] || k >= K) return; own.forEach(i => { grid[i] = k; }); spread(); moves--; sfx('pop');
      if (own.size === N * N) { g.over = true; g.win = true; g.msg = 'Flooded!'; g.score = 300 + moves * 30; sfx('good'); } else if (moves <= 0) { g.over = true; g.score = Math.round(own.size / (N * N) * 200); } };
    const btn = k => ({ x: 14 + k * (332 / K), y: 400, w: 332 / K - 8, h: 54 });
    g.update = () => {};
    g.key = (k, d) => { if (d && /^[1-6]$/.test(k)) pick(+k - 1); };
    g.ptr = (t, x, y) => { if (t !== 'down') return; for (let k = 0; k < K; k++) if (inb(x, y, btn(k))) pick(k); };
    g.draw = c => {
      c.fillStyle = '#20232e'; c.fillRect(0, 0, W, H);
      grid.forEach((v, i) => { rr(c, OX + (i % N) * CS + 0.5, OY + Math.floor(i / N) * CS + 0.5, CS - 1, CS - 1, 3, COL[v]); }); c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeRect(OX + 1, OY + 1, CS - 2, CS - 2);
      for (let k = 0; k < K; k++) { const b = btn(k); rr(c, b.x, b.y, b.w, b.h, 10, COL[k]); if (grid[0] === k) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6); } txt(c, k + 1, b.x + b.w / 2, b.y + b.h / 2, 18, 'rgba(0,0,0,.45)', 'center'); }
      hud(c, 'Moves left ' + moves, Math.round(own.size / (N * N) * 100) + '% flooded');
    };
    return g;
  } });

// ============ Gem Swap (match 3) ============
register({ id: 'match3', cat: 'puzzle', name: 'Gem Swap', icon: '💎', tag: 'Swap gems to line up three or more.', goal: 'score as many points as you can before your moves run out.', how: 'Tap a gem, then tap a gem next to it to swap them (or drag one across). Line up three or more of the same colour to clear them. Chains score extra. Only swaps that make a line are allowed.', par: 600,
  make(lv) {
    const g = { score: 0, over: false, msg: 'No moves left' }; const N = 7, CS = 46, OX = (W - N * CS) / 2, OY = 80, K = LV(lv, 5, 6, 6); let moves = LV(lv, 30, 25, 22), sel = -1, busy = false, queue = [], combo = '', ct = 0, drag = null;
    const T = () => Math.floor(Math.random() * K);
    let G = []; const fresh = () => { G = []; for (let i = 0; i < N * N; i++) { let t, tries = 0; do { t = T(); tries++; } while (tries < 20 && ((i % N >= 2 && G[i - 1].t === t && G[i - 2].t === t) || (i >= 2 * N && G[i - N].t === t && G[i - 2 * N].t === t))); G.push({ t, oy: 0, sc: 1 }); } };
    fresh();
    const find = () => { const m = new Set(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, t = G[i] && G[i].t; if (t == null) continue; if (x < N - 2 && G[i + 1] && G[i + 2] && G[i + 1].t === t && G[i + 2].t === t) { m.add(i); m.add(i + 1); m.add(i + 2); } if (y < N - 2 && G[i + N] && G[i + 2 * N] && G[i + N].t === t && G[i + 2 * N].t === t) { m.add(i); m.add(i + N); m.add(i + 2 * N); } } return m; };
    const swapT = (a, b) => { const t = G[a]; G[a] = G[b]; G[b] = t; };
    const adj = (a, b) => { const ax = a % N, ay = Math.floor(a / N), bx = b % N, by = Math.floor(b / N); return Math.abs(ax - bx) + Math.abs(ay - by) === 1; };
    const hasMove = () => { for (let i = 0; i < N * N; i++) for (const j of [i + 1, i + N]) { if (j >= N * N || (j === i + 1 && i % N === N - 1)) continue; swapT(i, j); const ok = find().size > 0; swapT(i, j); if (ok) return true; } return false; };
    const later = (t, fn) => queue.push({ t, fn });
    const resolve = chain => { const m = find(); if (!m.size) { busy = false; if (!hasMove()) { fresh(); while (find().size) fresh(); } if (moves <= 0) later(0.4, () => { g.over = true; }); return; }
      g.score += m.size * 10 * chain + (m.size > 3 ? (m.size - 3) * 10 : 0); combo = chain > 1 ? 'Chain x' + chain + '!' : ''; ct = 0.9; sfx(chain > 1 ? 'good' : 'pop'); m.forEach(i => { G[i].dead = 1; });
      later(0.2, () => { for (let x = 0; x < N; x++) { const surv = []; for (let y = N - 1; y >= 0; y--) { const cell = G[y * N + x]; if (!cell.dead) surv.push([cell, y]); } const miss = N - surv.length;
          for (let y = N - 1, k = 0; y >= 0; y--, k++) { if (k < surv.length) { const [cell, oy] = surv[k]; cell.oy = -(y - oy) * CS; G[y * N + x] = cell; } else G[y * N + x] = { t: T(), oy: -(miss + 1) * CS, sc: 1 }; } }
        later(0.45, () => resolve(chain + 1)); }); };
    const act = (a, b) => { if (busy || g.over) return; if (!adj(a, b)) return; swapT(a, b); if (find().size) { busy = true; moves--; sfx('tap'); later(0.15, () => resolve(1)); } else { swapT(a, b); sfx('bad'); } sel = -1; };
    const cellAt = (x, y) => { const cx = Math.floor((x - OX) / CS), cy = Math.floor((y - OY) / CS); return cx >= 0 && cx < N && cy >= 0 && cy < N ? cy * N + cx : -1; };
    g.update = dt => { ct -= dt; for (let i = queue.length - 1; i >= 0; i--) { queue[i].t -= dt; if (queue[i].t <= 0) { const q = queue.splice(i, 1)[0]; q.fn(); } } G.forEach(c => { if (c.oy < 0) c.oy = Math.min(0, c.oy + 520 * dt); }); };
    g.ptr = (t, x, y) => { if (busy) return; const i = cellAt(x, y);
      if (t === 'down') { drag = { i, x, y }; if (i < 0) { sel = -1; return; } if (sel >= 0 && adj(sel, i)) { act(sel, i); drag = null; } else sel = i; }
      if (t === 'move' && drag && drag.i >= 0 && !busy) { const dx = x - drag.x, dy = y - drag.y; if (Math.hypot(dx, dy) > CS * 0.55) { const j = Math.abs(dx) > Math.abs(dy) ? drag.i + (dx > 0 ? 1 : -1) : drag.i + (dy > 0 ? N : -N); if (j >= 0 && j < N * N && adj(drag.i, j)) act(drag.i, j); drag = null; } }
      if (t === 'up') drag = null; };
    g.draw = c => {
      c.fillStyle = '#1b1530'; c.fillRect(0, 0, W, H); rr(c, OX - 4, OY - 4, N * CS + 8, N * CS + 8, 10, '#2c2150');
      G.forEach((k, i) => { const x = OX + (i % N) * CS + CS / 2, y = OY + Math.floor(i / N) * CS + CS / 2 + (k.oy || 0), r = CS * 0.38 * (k.dead ? 0.5 : 1); if (k.dead) c.globalAlpha = 0.5;
        c.fillStyle = COL[k.t]; c.beginPath(); const s = k.t % 3; if (s === 0) c.arc(x, y, r, 0, 7); else if (s === 1) { c.moveTo(x, y - r - 2); c.lineTo(x + r + 2, y); c.lineTo(x, y + r + 2); c.lineTo(x - r - 2, y); c.closePath(); } else c.roundRect ? c.roundRect(x - r, y - r, r * 2, r * 2, 6) : c.rect(x - r, y - r, r * 2, r * 2); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(x - r / 3, y - r / 3, r / 4, 0, 7); c.fill(); c.globalAlpha = 1;
        if (i === sel) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(x - CS / 2 + 2, y - CS / 2 + 2, CS - 4, CS - 4); } });
      hud(c, 'Moves ' + moves, 'Score ' + g.score); if (ct > 0 && combo) txt(c, combo, W / 2, 50, 20, '#ffd45a', 'center');
    };
    return g;
  } });

// ============ Tower of Hanoi ============
register({ id: 'hanoi', cat: 'puzzle', name: 'Tower of Hanoi', icon: '🗼', tag: 'Move the whole tower to the far peg.', goal: 'move every disc from the left peg to the right peg in as few moves as you can.', how: 'Tap a peg to pick up its top disc, then tap another peg to put it down. A bigger disc can never sit on a smaller one. On a keyboard press 1, 2 or 3 for the pegs.', par: 520,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Solved!' }; const n = LV(lv, 3, 4, 5), opt = Math.pow(2, n) - 1; const P = [[], [], []]; for (let i = n; i >= 1; i--) P[0].push(i); let sel = -1, moves = 0, t = 0, bad = 0;
    const press = k => { if (g.over) return; if (sel < 0) { if (P[k].length) { sel = k; sfx('tap'); } } else { if (k === sel) { sel = -1; return; } const d = P[sel][P[sel].length - 1]; const top = P[k][P[k].length - 1]; if (top && top < d) { bad = 0.5; sfx('bad'); sel = -1; return; } P[sel].pop(); P[k].push(d); moves++; sel = -1; sfx('pop'); if (P[2].length === n) { g.over = true; g.win = true; g.score = Math.round(500 * opt / moves + Math.max(0, 120 - t) * 2); g.msg = moves + ' moves'; } } };
    g.update = dt => { if (!g.over) t += dt; bad -= dt; };
    g.key = (k, d) => { if (d && /^[1-3]$/.test(k)) press(+k - 1); };
    g.ptr = (tp, x, y) => { if (tp === 'down' && y > 70) press(x < 120 ? 0 : x < 240 ? 1 : 2); };
    g.draw = c => {
      c.fillStyle = '#243044'; c.fillRect(0, 0, W, H); c.fillStyle = '#7a5a3a'; c.fillRect(20, 400, 320, 14);
      for (let k = 0; k < 3; k++) { const cx = 60 + k * 120; c.fillStyle = bad > 0 && k === 1 ? '#a33' : '#9a7a52'; c.fillRect(cx - 4, 150, 8, 252); txt(c, k + 1, cx, 432, 18, 'rgba(255,255,255,.5)', 'center');
        P[k].forEach((d, i) => { const w = 30 + d * 17, y = 378 - i * 26, lift = sel === k && i === P[k].length - 1; rr(c, cx - w / 2, lift ? 118 : y, w, 22, 8, COL[(d - 1) % 6]); }); }
      hud(c, 'Moves ' + moves + ' (best ' + opt + ')', 'Time ' + Math.floor(t));
    };
    return g;
  } });

// ============ Word Search ============
const WORDS = { 0: ['MOON', 'STAR', 'FISH', 'BIRD', 'TREE', 'CAKE', 'RAIN', 'SNOW', 'WIND', 'FIRE', 'BOOK', 'GAME', 'SHIP', 'LION', 'BEAR', 'FROG', 'DUCK', 'MILK', 'SAND', 'KITE'],
  1: ['PLANET', 'ROCKET', 'GARDEN', 'BRIDGE', 'CASTLE', 'DRAGON', 'FOREST', 'GUITAR', 'JUNGLE', 'MARKET', 'ORANGE', 'PIRATE', 'SILVER', 'TICKET', 'WINTER', 'ANCHOR', 'BASKET', 'CANDLE'], 2: ['PENCIL', 'RABBIT', 'SUMMER', 'TURTLE', 'LADDER', 'MIRROR', 'ISLAND', 'HAMMER', 'FLOWER', 'ENGINE', 'DOCTOR', 'KITTEN', 'NUMBER', 'OYSTER', 'THUNDER', 'DOLPHIN', 'VOLCANO', 'BALLOON'] };
register({ id: 'wordsearch', cat: 'word', name: 'Word Search', icon: '🔍', tag: 'Find the hidden words in the grid.', goal: 'find every hidden word before the time runs out.', how: 'Press on the first letter of a word and drag to its last letter, then let go. Words can run across, down and (on Medium and Hard) diagonally, and on Hard also backwards. Found words are crossed off.', par: 420,
  make(lv) {
    const g = { score: 0, over: false, t: 150, msg: 'Time!' }; const N = 9, CS = 36, OX = (W - N * CS) / 2, OY = 34; const cnt = LV(lv, 5, 6, 7); const pool = lv === 0 ? WORDS[0] : lv === 1 ? WORDS[1].concat(WORDS[0].slice(0, 6)) : WORDS[2].concat(WORDS[1]);
    const dirs = lv === 0 ? [[0, 1], [1, 0]] : lv === 1 ? [[0, 1], [1, 0], [1, 1]] : [[0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1], [-1, 1]];
    let grid, words, found, tries = 0;
    do { grid = Array(N * N).fill(''); words = []; const ws = shuf(pool).filter(w => w.length <= N);
      for (const w of ws) { if (words.length >= cnt) break; for (let a = 0; a < 60; a++) { const d = dirs[Math.floor(Math.random() * dirs.length)], r = Math.floor(R(0, N)), cc = Math.floor(R(0, N)), er = r + d[0] * (w.length - 1), ec = cc + d[1] * (w.length - 1); if (er < 0 || er >= N || ec < 0 || ec >= N) continue; let ok = true; for (let k = 0; k < w.length; k++) { const ch = grid[(r + d[0] * k) * N + cc + d[1] * k]; if (ch && ch !== w[k]) { ok = false; break; } } if (!ok) continue; for (let k = 0; k < w.length; k++) grid[(r + d[0] * k) * N + cc + d[1] * k] = w[k]; words.push({ w, r, c: cc, d, ok: 0 }); break; } } tries++;
    } while (words.length < cnt && tries < 30);
    for (let i = 0; i < N * N; i++) if (!grid[i]) grid[i] = String.fromCharCode(65 + Math.floor(R(0, 26)));
    let a = null, b = null; const lineCells = (s, e) => { let dr = e.r - s.r, dc = e.c - s.c; if (Math.abs(dr) > 2 * Math.abs(dc)) dc = 0; else if (Math.abs(dc) > 2 * Math.abs(dr)) dr = 0; else { const m = Math.max(Math.abs(dr), Math.abs(dc)); dr = Math.sign(dr) * m; dc = Math.sign(dc) * m; } const len = Math.max(Math.abs(dr), Math.abs(dc)); const out = []; for (let k = 0; k <= len; k++) out.push([s.r + Math.sign(dr) * k, s.c + Math.sign(dc) * k]); return out.filter(([r, c2]) => r >= 0 && r < N && c2 >= 0 && c2 < N); };
    const at = (x, y) => { const c2 = Math.floor((x - OX) / CS), r = Math.floor((y - OY) / CS); return c2 >= 0 && c2 < N && r >= 0 && r < N ? { r, c: c2 } : null; };
    g.update = dt => { g.t -= dt; if (g.t <= 0) { g.over = true; g.score += 0; } };
    g.ptr = (t, x, y) => { if (g.over) return; if (t === 'down') { a = at(x, y); b = a; } if (t === 'move' && a) { const p = at(x, y); if (p) b = p; }
      if (t === 'up' && a) { const cells = lineCells(a, b || a); const s = cells.map(([r, c2]) => grid[r * N + c2]).join(''); const hit = words.find(w => !w.ok && (w.w === s || w.w === s.split('').reverse().join(''))); if (hit) { hit.ok = 1; g.score += 100; sfx('good'); if (words.every(w => w.ok)) { g.over = true; g.win = true; g.msg = 'All found!'; g.score += Math.round(g.t * 2); } } else if (cells.length > 1) sfx('bad'); a = b = null; } };
    g.draw = c => {
      c.fillStyle = '#14202c'; c.fillRect(0, 0, W, H);
      words.forEach(w => { if (w.ok) { c.strokeStyle = 'rgba(255,214,90,.55)'; c.lineWidth = CS * 0.7; c.lineCap = 'round'; c.beginPath(); c.moveTo(OX + (w.c + 0.5) * CS, OY + (w.r + 0.5) * CS); c.lineTo(OX + (w.c + w.d[1] * (w.w.length - 1) + 0.5) * CS, OY + (w.r + w.d[0] * (w.w.length - 1) + 0.5) * CS); c.stroke(); } });
      if (a) { const cl = lineCells(a, b || a); c.fillStyle = 'rgba(120,200,255,.5)'; cl.forEach(([r, c2]) => { c.beginPath(); c.arc(OX + (c2 + 0.5) * CS, OY + (r + 0.5) * CS, CS * 0.42, 0, 7); c.fill(); }); }
      grid.forEach((ch, i) => txt(c, ch, OX + (i % N + 0.5) * CS, OY + (Math.floor(i / N) + 0.5) * CS + 1, 22, '#e8f0ff', 'center'));
      words.forEach((w, i) => { const x = 14 + (i % 3) * 118, y = 376 + Math.floor(i / 3) * 26; txt(c, w.w, x, y, 17, w.ok ? '#5a6a7a' : '#ffd45a'); if (w.ok) { c.fillStyle = '#5a6a7a'; c.fillRect(x, y, w.w.length * 11, 2); } });
      hud(c, 'Found ' + words.filter(w => w.ok).length + '/' + words.length, 'Time ' + Math.ceil(g.t));
    };
    return g;
  } });

// ============ answer-button engine (math, trivia, colours) ============
function quiz(def) {
  register(Object.assign({ par: 200 }, def, {
    make(lv) {
      const g = { score: 0, over: false, t: def.time ? def.time(lv) : 45, msg: 'Time!' }; let q = null, streak = 0, fb = 0, fbOk = true, asked = 0; const nopt = 4;
      const next = () => { q = def.next(lv, asked++); q.opts = q.opts.slice(0, nopt); };
      next();
      const bx = i => ({ x: 14 + (i % 2) * 168, y: 292 + Math.floor(i / 2) * 84, w: 164, h: 76 });
      const pick = i => { if (g.over || fb > 0.12) return; if (q.opts[i].ok) { streak++; g.score += 10 + Math.min(10, streak * 2); fbOk = true; sfx('coin'); } else { streak = 0; g.score = Math.max(0, g.score - 8); fbOk = false; sfx('bad'); } fb = 0.35; q.shown = i; };
      g.update = dt => { g.t -= dt; if (g.t <= 0) { g.over = true; return; } if (fb > 0) { fb -= dt; if (fb <= 0) next(); } };
      g.key = (k, d) => { if (d && /^[1-4]$/.test(k)) pick(+k - 1); };
      g.ptr = (t, x, y) => { if (t !== 'down') return; for (let i = 0; i < q.opts.length; i++) if (inb(x, y, bx(i))) pick(i); };
      g.draw = c => {
        c.fillStyle = def.bg || '#1f2a44'; c.fillRect(0, 0, W, H); rr(c, 14, 50, 332, 220, 16, 'rgba(255,255,255,.08)');
        if (def.draw) def.draw(c, q); else { if (q.big) emo(c, q.big, W / 2, 130, 90); txt(c, q.text, W / 2, q.big ? 215 : 150, q.big ? 22 : (q.text.length > 12 ? 30 : 44), '#fff', 'center'); if (q.sub) txt(c, q.sub, W / 2, 250, 15, '#9fb3d8', 'center'); }
        q.opts.forEach((o, i) => { const b = bx(i); let f = def.btn ? def.btn(o, i) : '#3b4d7a'; if (fb > 0) { if (o.ok) f = '#2f9a55'; else if (i === q.shown) f = '#c4403a'; } rr(c, b.x, b.y, b.w, b.h, 14, f); txt(c, i + 1, b.x + 12, b.y + 14, 13, 'rgba(255,255,255,.55)'); txt(c, o.t, b.x + b.w / 2, b.y + b.h / 2 + 2, o.t.length > 12 ? 16 : 24, '#fff', 'center'); });
        hud(c, 'Score ' + g.score, 'Time ' + Math.ceil(g.t)); if (streak > 2) txt(c, streak + ' in a row!', W / 2, 44, 14, '#ffd45a', 'center');
      };
      return g;
    } }));
}
const opts = (ans, pool) => { const set = new Set([ans]); const out = [{ t: String(ans), ok: 1 }]; let guard = 0; while (out.length < 4 && guard++ < 80) { const v = pool(); if (!set.has(v)) { set.add(v); out.push({ t: String(v), ok: 0 }); } } return shuf(out); };

// ============ Math Dash ============
quiz({ id: 'mathdash', cat: 'math', name: 'Math Dash', icon: '➗', tag: 'Quick sums against the clock.', goal: 'answer as many sums correctly as you can in 45 seconds.', how: 'A sum appears. Tap the right answer, or press 1 to 4. Right answers in a row earn bonus points. A wrong answer costs points.', par: 330, bg: '#1d3a34',
  next(lv) { const a1 = LV(lv, 20, 12, 25), op = lv === 0 ? ['+', '-'][Math.floor(R(0, 2))] : lv === 1 ? ['+', '-', '×'][Math.floor(R(0, 3))] : ['+', '-', '×', '÷'][Math.floor(R(0, 4))]; let a, b, ans;
    if (op === '+') { a = Math.floor(R(2, a1 * (lv === 2 ? 3 : 1))); b = Math.floor(R(2, a1 * (lv === 2 ? 3 : 1))); ans = a + b; } else if (op === '-') { a = Math.floor(R(5, a1 * (lv === 2 ? 3 : 1))); b = Math.floor(R(1, a)); ans = a - b; } else if (op === '×') { a = Math.floor(R(2, lv === 2 ? 13 : 10)); b = Math.floor(R(2, lv === 2 ? 13 : 10)); ans = a * b; } else { b = Math.floor(R(2, 12)); ans = Math.floor(R(2, 12)); a = b * ans; }
    return { text: `${a} ${op} ${b}`, sub: 'What is the answer?', opts: opts(ans, () => ans + Math.floor(R(-10, 11)) || ans + 1) }; } });

// ============ Colour Clash (Stroop) ============
const CN = [['RED', '#e8453c'], ['BLUE', '#3a8de0'], ['GREEN', '#35b56a'], ['YELLOW', '#f2b441']];
quiz({ id: 'stroop', cat: 'mind', name: 'Colour Clash', icon: '🌈', tag: 'Pick the colour of the ink, not the word.', goal: 'name the ink colour as fast as you can for 30 seconds.', how: 'A colour word appears, written in a different colour ink. Tap the button that names the INK colour (not what the word says), or press 1 to 4.', par: 210, bg: '#221a38', time: () => 30,
  next(lv) { const w = Math.floor(R(0, 4)); let ink = Math.floor(R(0, 4)); if (Math.random() < LV(lv, 0.25, 0.1, 0.05)) ink = w; if (ink === w && Math.random() < 0.7) ink = (w + 1 + Math.floor(R(0, 3))) % 4; return { ink, word: CN[w][0], opts: shuf(CN.map((c, i) => ({ t: c[0], ok: i === ink ? 1 : 0 }))) }; },
  draw(c, q) { txt(c, q.word, W / 2, 150, 64, CN[q.ink][1], 'center'); txt(c, 'What colour is the ink?', W / 2, 235, 16, '#b9a9e0', 'center'); } });

// ============ trivia engines ============
const CAP = [['France', 'Paris'], ['Japan', 'Tokyo'], ['Italy', 'Rome'], ['Germany', 'Berlin'], ['Spain', 'Madrid'], ['Egypt', 'Cairo'], ['Canada', 'Ottawa'], ['Australia', 'Canberra'], ['Brazil', 'Brasília'], ['India', 'New Delhi'], ['China', 'Beijing'], ['Russia', 'Moscow'], ['Mexico', 'Mexico City'], ['Thailand', 'Bangkok'], ['Malaysia', 'Kuala Lumpur'], ['Indonesia', 'Jakarta'], ['Singapore', 'Singapore'], ['Turkey', 'Ankara'], ['Greece', 'Athens'], ['Portugal', 'Lisbon'], ['Kenya', 'Nairobi'], ['Argentina', 'Buenos Aires'], ['Peru', 'Lima'], ['Norway', 'Oslo'], ['Sweden', 'Stockholm'], ['Poland', 'Warsaw'], ['Vietnam', 'Hanoi'], ['Philippines', 'Manila'], ['South Korea', 'Seoul'], ['Saudi Arabia', 'Riyadh'], ['New Zealand', 'Wellington'], ['Switzerland', 'Bern'], ['Austria', 'Vienna'], ['Ireland', 'Dublin'], ['Cuba', 'Havana'], ['Morocco', 'Rabat'], ['Nigeria', 'Abuja'], ['Pakistan', 'Islamabad'], ['Chile', 'Santiago'], ['Finland', 'Helsinki']];
const ANI = [['🐘', 'Elephant'], ['🦒', 'Giraffe'], ['🐧', 'Penguin'], ['🦁', 'Lion'], ['🐯', 'Tiger'], ['🐼', 'Panda'], ['🦘', 'Kangaroo'], ['🐨', 'Koala'], ['🦓', 'Zebra'], ['🐊', 'Crocodile'], ['🦈', 'Shark'], ['🐙', 'Octopus'], ['🦉', 'Owl'], ['🦅', 'Eagle'], ['🐢', 'Turtle'], ['🦋', 'Butterfly'], ['🐝', 'Bee'], ['🦀', 'Crab'], ['🐬', 'Dolphin'], ['🐋', 'Whale'], ['🦊', 'Fox'], ['🐺', 'Wolf'], ['🐻', 'Bear'], ['🦔', 'Hedgehog'], ['🦜', 'Parrot'], ['🐪', 'Camel'], ['🦌', 'Deer'], ['🐿️', 'Squirrel'], ['🦩', 'Flamingo'], ['🦥', 'Sloth'], ['🦏', 'Rhino'], ['🦛', 'Hippo']];
const LAN = [['Eiffel Tower', 'France'], ['Taj Mahal', 'India'], ['Colosseum', 'Italy'], ['Big Ben', 'United Kingdom'], ['Statue of Liberty', 'USA'], ['Great Wall', 'China'], ['Pyramids of Giza', 'Egypt'], ['Petronas Towers', 'Malaysia'], ['Sydney Opera House', 'Australia'], ['Machu Picchu', 'Peru'], ['Christ the Redeemer', 'Brazil'], ['Mount Fuji', 'Japan'], ['Angkor Wat', 'Cambodia'], ['Burj Khalifa', 'UAE'], ['Leaning Tower of Pisa', 'Italy'], ['Acropolis', 'Greece'], ['Kremlin', 'Russia'], ['Sagrada Família', 'Spain'], ['Brandenburg Gate', 'Germany'], ['CN Tower', 'Canada'], ['Chichén Itzá', 'Mexico'], ['Table Mountain', 'South Africa'], ['Hagia Sophia', 'Turkey'], ['Marina Bay Sands', 'Singapore']];
const ELE = [['H', 'Hydrogen'], ['He', 'Helium'], ['C', 'Carbon'], ['N', 'Nitrogen'], ['O', 'Oxygen'], ['Na', 'Sodium'], ['Mg', 'Magnesium'], ['Al', 'Aluminium'], ['Si', 'Silicon'], ['P', 'Phosphorus'], ['S', 'Sulfur'], ['Cl', 'Chlorine'], ['K', 'Potassium'], ['Ca', 'Calcium'], ['Fe', 'Iron'], ['Cu', 'Copper'], ['Zn', 'Zinc'], ['Ag', 'Silver'], ['Au', 'Gold'], ['Hg', 'Mercury'], ['Pb', 'Lead'], ['Sn', 'Tin'], ['Ne', 'Neon'], ['Li', 'Lithium'], ['I', 'Iodine'], ['Ar', 'Argon']];
const trivia = (id, name, icon, tag, items, qf, opt) => quiz({ id, cat: 'trivia', name, icon, tag, goal: 'answer as many questions correctly as you can in 50 seconds.', how: 'Read the question and tap the right answer, or press 1 to 4. Right answers in a row earn bonus points. A wrong answer costs points.', par: 280, bg: opt.bg, time: () => 50,
  next(lv) { const pool = lv === 0 ? items.slice(0, Math.ceil(items.length * 0.5)) : items; const it = pool[Math.floor(R(0, pool.length))]; const ans = it[1]; return Object.assign(qf(it), { opts: shuf([{ t: ans, ok: 1 }].concat(shuf(items.filter(x => x[1] !== ans)).slice(0, 3).map(x => ({ t: x[1], ok: 0 })))) }); } });
trivia('capitals', 'Capital Cities', '🌍', 'Name the capital of the country.', CAP, it => ({ text: it[0], sub: 'What is its capital city?' }), { bg: '#1c3550' });
trivia('animals', 'Name the Animal', '🦒', 'Which animal is it?', ANI, it => ({ big: it[0], text: 'Which animal is this?' }), { bg: '#23402a' });
trivia('landmarks', 'Famous Places', '🗽', 'Which country is it in?', LAN, it => ({ text: it[0], sub: 'Which country is it in?' }), { bg: '#402a38' });
trivia('elements', 'Chemical Elements', '⚗️', 'Match the symbol to the element.', ELE, it => ({ text: it[0], sub: 'Which element has this symbol?' }), { bg: '#2d2a4a' });

// ============ Odd Tile Out ============
register({ id: 'oddone', cat: 'mind', name: 'Odd Tile Out', icon: '🟦', tag: 'Spot the tile with a slightly different colour.', goal: 'find the odd tile as many times as you can in 40 seconds.', how: 'Every board has one tile with a slightly different shade. Tap it. The board grows and the difference gets smaller as you go. A wrong tap costs you 3 seconds.', par: 260,
  make(lv) {
    const g = { score: 0, over: false, t: LV(lv, 50, 40, 32), msg: 'Time!' }; let n = 2, round = 0, odd = 0, hue = 0, light = 0, fl = 0, delta = LV(lv, 22, 16, 12);
    const OX = 20, OY = 70, S = 320;
    const nextB = () => { round++; n = Math.min(8, 2 + Math.floor(round / 2)); odd = Math.floor(R(0, n * n)); hue = Math.floor(R(0, 360)); delta = Math.max(LV(lv, 5, 3.5, 2.2), delta * 0.93); };
    nextB();
    g.update = dt => { g.t -= dt; fl -= dt; if (g.t <= 0) g.over = true; };
    g.ptr = (t, x, y) => { if (t !== 'down' || g.over) return; const cs = S / n, cx = Math.floor((x - OX) / cs), cy = Math.floor((y - OY) / cs); if (cx < 0 || cy < 0 || cx >= n || cy >= n) return; if (cy * n + cx === odd) { g.score += 15; sfx('pop'); nextB(); } else { g.t -= 3; fl = 0.3; sfx('bad'); } };
    g.draw = c => {
      c.fillStyle = fl > 0 ? '#3a1c1c' : '#1c1f2b'; c.fillRect(0, 0, W, H); const cs = S / n;
      for (let i = 0; i < n * n; i++) { const L = i === odd ? 55 + delta : 55; rr(c, OX + (i % n) * cs + 2, OY + Math.floor(i / n) * cs + 2, cs - 4, cs - 4, Math.max(4, 14 - n), `hsl(${hue},70%,${L}%)`); }
      hud(c, 'Found ' + (round - 1), 'Time ' + Math.ceil(g.t));
    };
    return g;
  } });
})();
