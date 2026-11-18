/* ---------- Arcade games, part 2 ---------- */
(function () {
const { W, H, R, clamp, LV, emo, txt, hud, sfx, register } = Arc;

// ============ Mine Sweeper ============
register({ id: 'mines', name: 'Minesweeper', icon: '💣', tag: 'Clear the field without touching a mine.', goal: 'uncover every safe square without hitting a mine.', how: 'Tap a square to dig. Numbers show how many mines touch it. Tap the flag button (or press F, or long-press a square) to flag a mine instead. A faster win scores more.', par: 520,
  make(lv) {
    const N = 9, M = LV(lv, 7, 11, 16), CS = 36, OX = 18, OY = 70, g = { score: 0, over: false, t: 0, flagMode: false, first: true, msg: 'Boom!' };
    const cells = Array.from({ length: N * N }, () => ({ m: 0, o: 0, f: 0, n: 0 }));
    const nb = i => { const r = [], x = i % N, y = Math.floor(i / N); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if ((dx || dy) && x + dx >= 0 && x + dx < N && y + dy >= 0 && y + dy < N) r.push((y + dy) * N + x + dx); } return r; };
    const place = safe => { let k = 0; while (k < M) { const i = Math.floor(R(0, N * N)); if (!cells[i].m && i !== safe && !nb(safe).includes(i)) { cells[i].m = 1; k++; } } cells.forEach((c, i) => { c.n = nb(i).filter(j => cells[j].m).length; }); };
    const open = i => { const st = [i]; while (st.length) { const j = st.pop(), c = cells[j]; if (c.o || c.f) continue; c.o = 1; if (!c.n && !c.m) nb(j).forEach(k => st.push(k)); } };
    const safeLeft = () => cells.filter(c => !c.m && !c.o).length;
    const dig = i => { const c = cells[i]; if (c.o || c.f) return; if (g.first) { g.first = false; place(i); }
      if (c.m) { cells.forEach(k => { if (k.m) k.o = 1; }); g.over = true; g.score = cells.filter(k => k.o && !k.m).length * 4; sfx('bad'); return; }
      open(i); sfx('tap'); if (!safeLeft()) { g.over = true; g.win = true; g.msg = 'Cleared!'; g.score = Math.round(600 + Math.max(0, 240 - g.t * 2.2) + M * 8); } };
    g.update = dt => { if (!g.first) g.t += dt; };
    let hold = null;
    g.key = (k, d) => { if (d && (k === 'f' || k === 'F')) g.flagMode = !g.flagMode; };
    const at = (x, y) => { const cx = Math.floor((x - OX) / CS), cy = Math.floor((y - OY) / CS); return cx >= 0 && cx < N && cy >= 0 && cy < N ? cy * N + cx : -1; };
    g.ptr = (t, x, y) => {
      if (t === 'down') { if (y > OY + N * CS + 20 && y < OY + N * CS + 70) { g.flagMode = !g.flagMode; return; } const i = at(x, y); hold = i >= 0 ? { i, t: performance.now() } : null; }
      if (t === 'up' && hold) { const i = at(x, y); const long = performance.now() - hold.t > 380; if (i === hold.i) { if (g.flagMode || long) { if (!cells[i].o) { cells[i].f ^= 1; sfx('pop'); } } else dig(i); } hold = null; }
    };
    g.draw = c => {
      c.fillStyle = '#2d3b4a'; c.fillRect(0, 0, W, H);
      cells.forEach((k, i) => { const X = OX + (i % N) * CS, Y = OY + Math.floor(i / N) * CS;
        c.fillStyle = k.o ? (k.m ? '#c33' : '#cfd6dc') : '#7b8d9d'; c.fillRect(X + 1, Y + 1, CS - 2, CS - 2);
        if (!k.o) { c.fillStyle = '#9db0c0'; c.fillRect(X + 1, Y + 1, CS - 2, 4); }
        if (k.o && k.m) emo(c, '💣', X + CS / 2, Y + CS / 2, 24); else if (k.o && k.n) txt(c, k.n, X + CS / 2, Y + CS / 2 + 1, 20, ['', '#1b5fd8', '#1a8a3a', '#d6372a', '#2a2a9a', '#8a2a2a', '#0a8a8a', '#222', '#555'][k.n], 'center'); else if (k.f) emo(c, '🚩', X + CS / 2, Y + CS / 2, 22); });
      const fl = cells.filter(k => k.f).length;
      hud(c, '💣 ' + (M - fl), 'Time ' + Math.floor(g.t));
      c.fillStyle = g.flagMode ? '#e0a020' : '#4a5d70'; c.fillRect(OX, OY + N * CS + 24, N * CS, 40); txt(c, g.flagMode ? '🚩 Flag mode ON (tap to switch)' : '⛏️ Dig mode (tap for flags)', W / 2, OY + N * CS + 44, 16, '#fff', 'center');
    };
    return g;
  } });

// ============ Sea Battle (Battleship) ============
register({ id: 'seabattle', name: 'Sea Battle', icon: '🚢', tag: 'Sink the enemy fleet before they sink yours.', goal: 'sink every enemy ship before the computer sinks yours.', how: 'Tap a square on the top sea (the enemy fleet) to fire. A hit lets you see part of a ship. The computer then fires at your fleet on the bottom sea. First to sink all ships wins.', par: 430,
  make(lv) {
    const N = 8, CS = 30, SHIPS = [4, 3, 3, 2, 2], g = { score: 0, over: false, turn: 0, wait: 0, shots: 0, fx: [], t: 0, msg: 'Fleet sunk' };
    const mkBoard = () => { const b = { s: Array(N * N).fill(-1), shot: Array(N * N).fill(0), ships: [] }; SHIPS.forEach((len, si) => { for (let tries = 0; tries < 200; tries++) { const h = Math.random() < 0.5, x = Math.floor(R(0, N - (h ? len : 0))), y = Math.floor(R(0, N - (h ? 0 : len))), cs = []; for (let k = 0; k < len; k++) cs.push((y + (h ? 0 : k)) * N + x + (h ? k : 0)); if (cs.every(i => b.s[i] < 0)) { cs.forEach(i => { b.s[i] = si; }); b.ships.push(cs); break; } } }); return b; };
    const E = mkBoard(), Y = mkBoard(); const OXE = 45, OYE = 40, OYY = 300;
    const sunk = (b, si) => b.ships[si].every(i => b.shot[i]); const allSunk = b => b.ships.every((_, si) => sunk(b, si));
    const aiQueue = []; const aiPick = () => { const free = i => !Y.shot[i]; let cand = []; for (let i = 0; i < N * N; i++) if (Y.shot[i] === 2 && !sunk(Y, Y.s[i])) { const x = i % N, y = Math.floor(i / N); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < N && ny >= 0 && ny < N && free(ny * N + nx)) cand.push(ny * N + nx); }); }
      if (cand.length && Math.random() < LV(lv, 0.35, 0.8, 1)) return cand[Math.floor(Math.random() * cand.length)];
      const all = []; for (let i = 0; i < N * N; i++) if (free(i) && (lv < 2 || ((i % N) + Math.floor(i / N)) % 2 === 0)) all.push(i); const pool = all.length ? all : [...Array(N * N).keys()].filter(free); return pool[Math.floor(Math.random() * pool.length)]; };
    const fire = (b, i, who) => { b.shot[i] = b.s[i] >= 0 ? 2 : 1; const x = i % N, y = Math.floor(i / N); g.fx.push({ x: (who ? OXE : OXE) + x * CS + CS / 2, y: (who ? OYY : OYE) + y * CS + CS / 2, t: 0.7, e: b.s[i] >= 0 ? '💥' : '💦' }); if (b.s[i] >= 0) { sfx('thud'); if (sunk(b, b.s[i])) { g.fx.push({ x: 180, y: 240, t: 1.2, e: '🔥', big: 1, m: who ? 'They sank your ship!' : 'Ship sunk!' }); sfx('good'); } } else sfx('pop'); };
    g.update = dt => {
      g.t += dt; g.fx = g.fx.filter(f => (f.t -= dt) > 0);
      if (g.turn === 1) { g.wait -= dt; if (g.wait <= 0) { fire(Y, aiPick(), 1); if (allSunk(Y)) { g.over = true; g.score = Math.round(E.shot.filter(v => v === 2).length * 12); g.msg = 'Your fleet sank'; } else g.turn = 0; } }
    };
    g.ptr = (t, x, y) => { if (t !== 'down' || g.turn !== 0 || g.over) return; const cx = Math.floor((x - OXE) / CS), cy = Math.floor((y - OYE) / CS); if (cx < 0 || cx >= N || cy < 0 || cy >= N) return; const i = cy * N + cx; if (E.shot[i]) return; g.shots++; fire(E, i, 0);
      if (allSunk(E)) { g.over = true; g.win = true; g.msg = 'Victory!'; g.score = Math.round(300 + Y.ships.flat().filter(j => !Y.shot[j]).length * 25 + Math.max(0, 120 - g.shots * 2)); } else { g.turn = 1; g.wait = 0.9; } };
    const grid = (c, b, ox, oy, show) => { for (let i = 0; i < N * N; i++) { const X = ox + (i % N) * CS, Yy = oy + Math.floor(i / N) * CS; c.fillStyle = '#2a7fc0'; c.fillRect(X, Yy, CS - 1, CS - 1);
      const si = b.s[i]; if ((show || b.shot[i] === 2) && si >= 0) { c.fillStyle = sunk(b, si) ? '#8a2a2a' : '#8d99a5'; c.fillRect(X + 2, Yy + 2, CS - 5, CS - 5); }
      if (b.shot[i] === 1) { c.fillStyle = '#fff'; c.beginPath(); c.arc(X + CS / 2, Yy + CS / 2, 4, 0, 7); c.fill(); } if (b.shot[i] === 2) emo(c, '💥', X + CS / 2, Yy + CS / 2, 20); } };
    g.draw = c => {
      const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0e3f6e'); bg.addColorStop(1, '#0a2a4a'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
      txt(c, '🎯 Enemy sea (tap to fire)', W / 2, 32, 14, '#cfe9ff', 'center'); grid(c, E, OXE, OYE, false);
      txt(c, '🚢 Your fleet', W / 2, OYY - 12, 14, '#cfe9ff', 'center'); grid(c, Y, OXE, OYY, true);
      g.fx.forEach(f => emo(c, f.e, f.x, f.y - (0.7 - Math.min(0.7, f.t)) * 10, f.big ? 60 : 30));
      const f = g.fx.find(v => v.m); if (f) txt(c, f.m, W / 2, 285, 18, '#ffe27a', 'center');
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(0, H - 26, W, 26); txt(c, g.turn === 0 ? 'Your shot' : 'Enemy is aiming…', 8, H - 13, 14, '#ffe27a'); txt(c, 'Shots ' + g.shots, W - 8, H - 13, 14, '#fff', 'right');
    };
    return g;
  } });

// ============ Brick Breaker ============
register({ id: 'breakout', name: 'Brick Breaker', icon: '🧱', tag: 'Bounce the ball and smash every brick.', goal: 'break all the bricks with the bouncing ball.', how: 'Move the paddle with the left and right arrow keys, or drag. Do not let the ball fall. You have three lives.', par: 280,
  make(lv) {
    const g = { score: 0, over: false, px: W / 2, lives: 3, bricks: [], ball: null, k: { l: 0, r: 0 }, launched: false, msg: 'Out of lives' }, PW = LV(lv, 90, 72, 58), sp0 = LV(lv, 250, 300, 360);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) g.bricks.push({ x: 8 + c * 43, y: 50 + r * 20, w: 40, h: 16, col: ['#e84a4a', '#f29443', '#f0cf3a', '#4caf50', '#3a8fe0', '#9a5ad8'][r], pts: 10 + (5 - r) * 2 });
    const serve = () => { g.ball = { x: g.px, y: H - 52, vx: 0, vy: 0 }; g.launched = false; }; serve();
    const launch = () => { if (!g.launched) { g.launched = true; g.ball.vx = R(-90, 90); g.ball.vy = -sp0; } };
    g.update = dt => {
      g.px = clamp(g.px + (g.k.r - g.k.l) * 330 * dt, PW / 2, W - PW / 2); const b = g.ball;
      if (!g.launched) { b.x = g.px; return; }
      const sp = Math.hypot(b.vx, b.vy); const steps = Math.ceil(sp * dt / 6);
      for (let s = 0; s < steps; s++) { b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
        if (b.x < 8) { b.x = 8; b.vx = Math.abs(b.vx); } if (b.x > W - 8) { b.x = W - 8; b.vx = -Math.abs(b.vx); } if (b.y < 34) { b.y = 34; b.vy = Math.abs(b.vy); }
        if (b.vy > 0 && b.y > H - 46 && b.y < H - 34 && Math.abs(b.x - g.px) < PW / 2 + 6) { const o = (b.x - g.px) / (PW / 2); const v = Math.min(520, Math.hypot(b.vx, b.vy) * 1.015); b.vx = o * v * 0.8; b.vy = -Math.sqrt(Math.max(v * v - b.vx * b.vx, 100)); b.y = H - 47; sfx('clack'); }
        for (const br of g.bricks) { if (!br.dead && b.x > br.x - 6 && b.x < br.x + br.w + 6 && b.y > br.y - 6 && b.y < br.y + br.h + 6) { br.dead = true; g.score += br.pts; sfx('pop'); const ox = Math.min(b.x - br.x + 6, br.x + br.w + 6 - b.x), oy = Math.min(b.y - br.y + 6, br.y + br.h + 6 - b.y); if (ox < oy) b.vx = -b.vx; else b.vy = -b.vy; break; } }
      }
      g.bricks = g.bricks.filter(x => !x.dead);
      if (!g.bricks.length) { g.score += 100; g.over = true; g.win = true; g.msg = 'Cleared!'; }
      if (b.y > H + 10) { g.lives--; sfx('bad'); if (g.lives <= 0) g.over = true; else serve(); }
    };
    g.key = (k, d) => { if (k === 'ArrowLeft' || k === 'a') g.k.l = d ? 1 : 0; if (k === 'ArrowRight' || k === 'd') g.k.r = d ? 1 : 0; if (d && (k === ' ' || k === 'ArrowUp')) launch(); };
    g.ptr = (t, x) => { if (t !== 'up') g.px = clamp(x, PW / 2, W - PW / 2); if (t === 'down') launch(); };
    g.draw = c => {
      c.fillStyle = '#10142a'; c.fillRect(0, 0, W, H); g.bricks.forEach(b => { c.fillStyle = b.col; c.fillRect(b.x, b.y, b.w, b.h); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(b.x, b.y, b.w, 4); });
      c.fillStyle = '#e8eefc'; c.beginPath(); c.roundRect ? c.roundRect(g.px - PW / 2, H - 40, PW, 12, 6) : c.rect(g.px - PW / 2, H - 40, PW, 12); c.fill();
      c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(g.ball.x, g.ball.y, 6, 0, 7); c.fill();
      if (!g.launched) txt(c, 'Tap or press Space to launch', W / 2, H - 90, 15, '#cfe', 'center');
      hud(c, 'Score ' + g.score, '❤️'.repeat(Math.max(0, g.lives)));
    };
    return g;
  } });

// ============ Snake ============
register({ id: 'snake', name: 'Snake', icon: '🐍', tag: 'Eat apples and grow, but never bite yourself.', goal: 'eat as many apples as you can without hitting a wall or yourself.', how: 'Steer with the arrow keys, or swipe on the screen. Each apple makes you longer and faster.', par: 140,
  make(lv) {
    const C = 18, Rr = 22, S = 20, OY = 36, g = { score: 0, over: false, sn: [[9, 11], [8, 11], [7, 11]], d: [1, 0], nd: [1, 0], apple: null, acc: 0, t: 0, msg: 'Ouch!' };
    const putApple = () => { for (;;) { const a = [Math.floor(R(0, C)), Math.floor(R(0, Rr))]; if (!g.sn.some(s => s[0] === a[0] && s[1] === a[1])) { g.apple = a; return; } } }; putApple();
    const spd = () => LV(lv, 6, 8, 11) + g.sn.length * 0.12;
    g.update = dt => { g.t += dt; g.acc += dt * spd(); while (g.acc >= 1 && !g.over) { g.acc -= 1; g.d = g.nd; const h = [g.sn[0][0] + g.d[0], g.sn[0][1] + g.d[1]];
      if (h[0] < 0 || h[0] >= C || h[1] < 0 || h[1] >= Rr || g.sn.slice(0, -1).some(s => s[0] === h[0] && s[1] === h[1])) { g.over = true; sfx('bad'); return; }
      g.sn.unshift(h); if (h[0] === g.apple[0] && h[1] === g.apple[1]) { g.score += 10; sfx('coin'); putApple(); } else g.sn.pop(); } };
    const turn = d => { if (d[0] !== -g.d[0] || d[1] !== -g.d[1]) g.nd = d; };
    g.key = (k, d) => { if (!d) return; const m = { ArrowRight: [1, 0], d: [1, 0], ArrowLeft: [-1, 0], a: [-1, 0], ArrowDown: [0, 1], s: [0, 1], ArrowUp: [0, -1], w: [0, -1] }[k]; if (m) turn(m); };
    let sx = 0, sy = 0; g.ptr = (t, x, y) => { if (t === 'down') { sx = x; sy = y; } else { const dx = x - sx, dy = y - sy; if (Math.hypot(dx, dy) > 16) { turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]); sx = x; sy = y; } } };
    g.draw = c => {
      c.fillStyle = '#16301c'; c.fillRect(0, 0, W, H); for (let y = 0; y < Rr; y++) for (let x = 0; x < C; x++) { c.fillStyle = (x + y) % 2 ? '#1b3a22' : '#1f4428'; c.fillRect(x * S, OY + y * S, S, S); }
      emo(c, '🍎', g.apple[0] * S + S / 2, OY + g.apple[1] * S + S / 2, 18);
      g.sn.forEach((s, i) => { c.fillStyle = i ? `hsl(${120 - i * 2},65%,${48 - (i % 2) * 5}%)` : '#7be06a'; c.beginPath(); c.arc(s[0] * S + S / 2, OY + s[1] * S + S / 2, S / 2 - (i ? 1 : 0), 0, 7); c.fill(); });
      const h = g.sn[0]; c.fillStyle = '#111'; c.beginPath(); c.arc(h[0] * S + S / 2 + g.d[0] * 3 - g.d[1] * 4, OY + h[1] * S + S / 2 + g.d[1] * 3 + g.d[0] * -4, 2, 0, 7); c.arc(h[0] * S + S / 2 + g.d[0] * 3 + g.d[1] * 4, OY + h[1] * S + S / 2 + g.d[1] * 3 - g.d[0] * -4, 2, 0, 7); c.fill();
      hud(c, 'Score ' + g.score, 'Length ' + g.sn.length);
    };
    return g;
  } });

// ============ Flappy Bird ============
register({ id: 'flappy', name: 'Flappy Chick', icon: '🐤', tag: 'Flap through the gaps between the pipes.', goal: 'fly through as many pipes as you can.', how: 'Tap, click or press Space to flap. Fly through the gaps. Touch a pipe, the ground or the sky and it is over.', par: 80,
  make(lv) {
    const g = { score: 0, over: false, y: 220, vy: 0, pipes: [], t: 0, sp: 0, started: false, msg: 'Splat!' }, gap = LV(lv, 170, 140, 118), vx = LV(lv, 120, 150, 185);
    const flap = () => { if (!g.started) g.started = true; g.vy = -300; sfx('tap'); };
    g.update = dt => {
      g.t += dt; if (!g.started) { g.y = 220 + Math.sin(g.t * 5) * 8; return; }
      g.vy += 900 * dt; g.y += g.vy * dt; g.sp -= dt; if (g.sp <= 0) { g.sp = 1.55 * 150 / vx * 1.05; g.pipes.push({ x: W + 30, gy: R(100, H - 140 - gap + 40), done: 0 }); }
      g.pipes.forEach(p => { p.x -= vx * dt; if (!p.done && p.x < 70) { p.done = 1; g.score += 10; sfx('good'); } if (Math.abs(p.x - 90) < 38 && (g.y - 12 < p.gy || g.y + 12 > p.gy + gap)) { g.over = true; sfx('bad'); } });
      g.pipes = g.pipes.filter(p => p.x > -50); if (g.y > H - 50 || g.y < 10) { g.over = true; sfx('bad'); }
    };
    g.key = (k, d) => { if (d && (k === ' ' || k === 'ArrowUp' || k === 'w')) flap(); }; g.ptr = (t) => { if (t === 'down') flap(); };
    g.draw = c => {
      const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#6ec6f2'); bg.addColorStop(1, '#c8ecff'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
      emo(c, '☁️', 60 + ((-g.t * 12) % 420 + 420) % 420 - 40, 90, 50); emo(c, '☁️', 260 + ((-g.t * 8) % 420 + 420) % 420 - 200, 170, 40);
      g.pipes.forEach(p => { c.fillStyle = '#3fa64a'; c.fillRect(p.x - 28, 0, 56, p.gy); c.fillRect(p.x - 28, p.gy + gap, 56, H); c.fillStyle = '#2d8a38'; c.fillRect(p.x - 34, p.gy - 16, 68, 16); c.fillRect(p.x - 34, p.gy + gap, 68, 16); });
      c.fillStyle = '#d9b36a'; c.fillRect(0, H - 40, W, 40); c.fillStyle = '#6aa84f'; c.fillRect(0, H - 40, W, 8);
      emo(c, '🐤', 90, g.y, 34, clamp(g.vy / 700, -0.5, 1));
      if (!g.started) txt(c, 'Tap to flap', W / 2, 320, 22, '#234', 'center');
      hud(c, 'Score ' + g.score, '');
    };
    return g;
  } });

// ============ Fruit Catch ============
register({ id: 'fruit', name: 'Fruit Catch', icon: '🍉', tag: 'Catch the falling fruit. Dodge the bombs.', goal: 'catch as much fruit as you can in 40 seconds.', how: 'Move the basket with the left and right arrow keys, or drag. Golden fruit is worth more. A bomb costs a life.', par: 230,
  make(lv) {
    const g = { score: 0, over: false, x: W / 2, t: 40, items: [], sp: 0.4, lives: 3, k: { l: 0, r: 0 }, msg: 'Time!' }, FR = ['🍎', '🍌', '🍇', '🍊', '🍓', '🍉'];
    g.update = dt => {
      g.t -= dt; if (g.t <= 0) { g.over = true; return; } g.x = clamp(g.x + (g.k.r - g.k.l) * 360 * dt, 34, W - 34);
      g.sp -= dt; if (g.sp <= 0) { g.sp = R(0.3, 0.7) * LV(lv, 1.3, 1, 0.75); const r = Math.random(); g.items.push({ x: R(24, W - 24), y: 30, v: R(120, 190) * LV(lv, 0.8, 1, 1.25) * (1 + (40 - g.t) * 0.01), e: r < 0.16 ? '💣' : r < 0.24 ? '⭐' : FR[Math.floor(R(0, FR.length))] }); }
      g.items.forEach(o => { o.y += o.v * dt; if (!o.dead && o.y > H - 70 && o.y < H - 30 && Math.abs(o.x - g.x) < 42) { o.dead = true; if (o.e === '💣') { g.lives--; sfx('bad'); if (g.lives <= 0) g.over = true; } else { g.score += o.e === '⭐' ? 30 : 10; sfx('coin'); } } });
      g.items = g.items.filter(o => !o.dead && o.y < H + 30);
    };
    g.key = (k, d) => { if (k === 'ArrowLeft' || k === 'a') g.k.l = d ? 1 : 0; if (k === 'ArrowRight' || k === 'd') g.k.r = d ? 1 : 0; };
    g.ptr = (t, x) => { if (t !== 'up') g.x = clamp(x, 34, W - 34); };
    g.draw = c => {
      const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#ffe9a8'); bg.addColorStop(1, '#f7b267'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
      g.items.forEach(o => emo(c, o.e, o.x, o.y, 36)); emo(c, '🧺', g.x, H - 52, 62);
      hud(c, 'Score ' + g.score, '❤️'.repeat(Math.max(0, g.lives)) + '  ⏱ ' + Math.ceil(g.t));
    };
    return g;
  } });
})();
