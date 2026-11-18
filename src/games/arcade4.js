/* ---------- Arcade, part 4: Block Stack, Table Tennis, Asteroids, Road Crossing, Quick Draw, Slide Puzzle, Lights Out, Tower Stack ---------- */
(function () {
const { W, H, R, clamp, LV, emo, txt, hud, sfx, register } = Arc;
const rr = (c, x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };

// ============ Block Stack (falling blocks) ============
const PIECES = [
  { c: '#35d0e8', m: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] }, { c: '#f2d03b', m: [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]] },
  { c: '#b25be0', m: [[0, 1, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]] }, { c: '#4cd05a', m: [[0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] },
  { c: '#e85a4a', m: [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]] }, { c: '#3a6ee8', m: [[1, 0, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]] },
  { c: '#f29443', m: [[0, 0, 1, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]] }];
const rot = m => m.map((r, y) => r.map((_, x) => m[3 - x][y]));
register({ id: 'blocks', name: 'Block Stack', icon: '🧱', tag: 'Fit the falling blocks into complete lines.', goal: 'clear as many lines as you can before the stack reaches the top.', how: 'Arrow keys: ← → move, ↑ rotate, ↓ speed up, Space drops. On a touch screen: tap to rotate, drag sideways to move, drag down to speed up, flick down to drop.', par: 420,
  make(lv) {
    const CW = 10, CH = 20, S = 21, X0 = 20, Y0 = 36, g = { score: 0, over: false, lines: 0, t: 0, acc: 0, k: { l: 0, r: 0, d: 0 }, hold: 0, msg: 'Stack is full' };
    const grid = Array.from({ length: CH }, () => Array(CW).fill(null)); let bag = [], cur, next;
    const draw7 = () => { if (!bag.length) bag = [0, 1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5); return bag.pop(); };
    const fits = (m, px, py) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (m[y][x]) { const gx = px + x, gy = py + y; if (gx < 0 || gx >= CW || gy >= CH || (gy >= 0 && grid[gy][gx])) return false; } return true; };
    const spawn = () => { const k = next == null ? draw7() : next; next = draw7(); cur = { k, m: PIECES[k].m.map(r => r.slice()), x: 3, y: -1 }; if (!fits(cur.m, cur.x, cur.y)) g.over = true; };
    spawn();
    const lock = () => { cur.m.forEach((r, y) => r.forEach((v, x) => { if (v && cur.y + y >= 0) grid[cur.y + y][cur.x + x] = PIECES[cur.k].c; })); sfx('thud');
      let n = 0; for (let y = CH - 1; y >= 0; y--) if (grid[y].every(Boolean)) { grid.splice(y, 1); grid.unshift(Array(CW).fill(null)); n++; y++; }
      if (n) { g.lines += n; g.score += [0, 100, 300, 500, 800][n]; sfx(n >= 4 ? 'win' : 'good'); } spawn(); };
    const move = dx => { if (fits(cur.m, cur.x + dx, cur.y)) { cur.x += dx; sfx('tap'); } };
    const rotate = () => { const m = rot(cur.m); for (const k of [0, -1, 1, -2, 2]) if (fits(m, cur.x + k, cur.y)) { cur.m = m; cur.x += k; sfx('click'); return; } };
    const hard = () => { let n = 0; while (fits(cur.m, cur.x, cur.y + 1)) { cur.y++; n++; } g.score += n * 2; lock(); };
    const level = () => Math.floor(g.lines / 8), step = () => LV(lv, 0.85, 0.6, 0.4) * Math.pow(0.88, level());
    g.update = dt => {
      g.t += dt; if (g.t > 240) { g.over = true; g.msg = 'Time!'; return; }
      g.hold -= dt; if ((g.k.l || g.k.r) && g.hold <= 0) { move(g.k.r - g.k.l); g.hold = 0.11; }
      g.acc += dt * (g.k.d ? 14 : 1) / step(); while (g.acc >= 1 && !g.over) { g.acc -= 1; if (fits(cur.m, cur.x, cur.y + 1)) { cur.y++; if (g.k.d) g.score += 1; } else lock(); }
    };
    g.key = (k, d) => { if (k === 'ArrowLeft' || k === 'a') { g.k.l = d ? 1 : 0; if (d) { move(-1); g.hold = 0.18; } } if (k === 'ArrowRight' || k === 'd') { g.k.r = d ? 1 : 0; if (d) { move(1); g.hold = 0.18; } } if (k === 'ArrowDown' || k === 's') g.k.d = d ? 1 : 0; if (d && (k === 'ArrowUp' || k === 'w')) rotate(); if (d && k === ' ' && !g.over) hard(); };
    let tp = null; g.ptr = (t, x, y) => {
      if (t === 'down') tp = { x, y, ax: x, t0: performance.now(), moved: false };
      else if (tp && t === 'move') { while (x - tp.ax > 24) { move(1); tp.ax += 24; tp.moved = true; } while (tp.ax - x > 24) { move(-1); tp.ax -= 24; tp.moved = true; } if (y - tp.y > 50) { g.k.d = 1; tp.moved = true; } }
      else if (tp && t === 'up') { const dt = performance.now() - tp.t0; if (!tp.moved && dt < 300) rotate(); else if (y - tp.y > 70 && dt < 260) hard(); g.k.d = 0; tp = null; }
    };
    g.draw = c => {
      c.fillStyle = '#10142a'; c.fillRect(0, 0, W, H); c.fillStyle = '#1a2040'; c.fillRect(X0 - 3, Y0 - 3, CW * S + 6, CH * S + 6); c.fillStyle = '#0a0e20'; c.fillRect(X0, Y0, CW * S, CH * S);
      c.strokeStyle = 'rgba(255,255,255,.05)'; for (let i = 1; i < CW; i++) { c.beginPath(); c.moveTo(X0 + i * S, Y0); c.lineTo(X0 + i * S, Y0 + CH * S); c.stroke(); } for (let i = 1; i < CH; i++) { c.beginPath(); c.moveTo(X0, Y0 + i * S); c.lineTo(X0 + CW * S, Y0 + i * S); c.stroke(); }
      const cell = (x, y, col, a) => { c.globalAlpha = a || 1; c.fillStyle = col; c.fillRect(X0 + x * S + 1, Y0 + y * S + 1, S - 2, S - 2); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(X0 + x * S + 1, Y0 + y * S + 1, S - 2, 4); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(X0 + x * S + 1, Y0 + y * S + S - 5, S - 2, 4); c.globalAlpha = 1; };
      grid.forEach((r, y) => r.forEach((v, x) => { if (v) cell(x, y, v); }));
      let gy = cur.y; while (fits(cur.m, cur.x, gy + 1)) gy++; cur.m.forEach((r, y) => r.forEach((v, x) => { if (v && gy + y >= 0) cell(cur.x + x, gy + y, PIECES[cur.k].c, 0.22); }));
      cur.m.forEach((r, y) => r.forEach((v, x) => { if (v && cur.y + y >= 0) cell(cur.x + x, cur.y + y, PIECES[cur.k].c); }));
      txt(c, 'NEXT', 300, 58, 14, '#cfe', 'center'); PIECES[next].m.forEach((r, y) => r.forEach((v, x) => { if (v) { c.fillStyle = PIECES[next].c; c.fillRect(268 + x * 16, 74 + y * 16, 15, 15); } }));
      txt(c, 'LINES', 300, 170, 14, '#cfe', 'center'); txt(c, String(g.lines), 300, 194, 26, '#fff', 'center'); txt(c, 'LEVEL', 300, 240, 14, '#cfe', 'center'); txt(c, String(level() + 1), 300, 264, 26, '#fff', 'center');
      hud(c, 'Score ' + g.score, Math.max(0, Math.ceil(240 - g.t)) + 's');
    };
    return g;
  } });

// ============ Table Tennis (Pong) ============
register({ id: 'pong', name: 'Table Tennis', icon: '🏓', tag: 'Beat the computer to five points.', goal: 'win the rally game against the computer: first to five points.', how: 'Slide your paddle (bottom) with the left and right arrow keys, or drag. Hit the ball with the edge of the paddle to send it at an angle.', par: 330,
  make(lv) {
    const g = { score: 0, over: false, me: 0, cpu: 0, px: W / 2, ax: W / 2, k: { l: 0, r: 0 }, b: null, srv: 1, wait: 1, t: 0, msg: 'Game over' }, PW = LV(lv, 84, 72, 62), AS = LV(lv, 140, 205, 275), base = LV(lv, 230, 270, 320);
    const serve = dir => { g.b = { x: W / 2, y: H / 2 + 10, vx: R(-110, 110), vy: dir * base, sp: base }; g.wait = 0.9; };
    serve(1);
    g.update = dt => {
      g.t += dt; g.px = clamp(g.px + (g.k.r - g.k.l) * 340 * dt, PW / 2, W - PW / 2); const b = g.b;
      const tx = b.vy < 0 ? b.x + R(-1, 1) * 0 : W / 2; g.ax += clamp(tx - g.ax, -AS * dt, AS * dt); g.ax = clamp(g.ax, PW / 2, W - PW / 2);
      if (g.wait > 0) { g.wait -= dt; return; }
      b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < 8) { b.x = 8; b.vx = Math.abs(b.vx); sfx('tap'); } if (b.x > W - 8) { b.x = W - 8; b.vx = -Math.abs(b.vx); sfx('tap'); }
      const hit = (px, y, dir) => { if (Math.abs(b.x - px) < PW / 2 + 7) { const o = (b.x - px) / (PW / 2); b.sp = Math.min(560, b.sp * 1.05); b.vx = o * b.sp * 0.8; b.vy = dir * Math.sqrt(Math.max(b.sp * b.sp - b.vx * b.vx, 4000)); b.y = y + dir * -1 * 0 + (dir > 0 ? 8 : -8) * 0 + (dir > 0 ? 9 : -9); sfx('clack'); return true; } return false; };
      if (b.vy > 0 && b.y > 436 && b.y < 456) hit(g.px, 436, -1); if (b.vy < 0 && b.y < 74 && b.y > 54) hit(g.ax, 74, 1);
      if (b.y > H + 10) { g.cpu++; sfx('bad'); serve(-1); } if (b.y < 20) { g.me++; sfx('good'); serve(1); }
      if (g.me >= 5 || g.cpu >= 5) { g.over = true; g.win = g.me > g.cpu; g.msg = g.win ? 'You win!' : 'You lose'; g.score = Math.max(0, g.me * 100 - g.cpu * 40 + (g.win ? 300 : 0)); }
    };
    g.key = (k, d) => { if (k === 'ArrowLeft' || k === 'a') g.k.l = d ? 1 : 0; if (k === 'ArrowRight' || k === 'd') g.k.r = d ? 1 : 0; };
    g.ptr = (t, x) => { if (t !== 'up') g.px = clamp(x, PW / 2, W - PW / 2); };
    g.draw = c => {
      c.fillStyle = '#1b6a9a'; c.fillRect(0, 0, W, H); c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(8, 34, W - 16, H - 44); c.setLineDash([10, 8]); c.beginPath(); c.moveTo(8, H / 2 + 10); c.lineTo(W - 8, H / 2 + 10); c.stroke(); c.setLineDash([]);
      const pad = (x, y, col) => { c.fillStyle = 'rgba(0,0,0,.3)'; rr(c, x - PW / 2 + 2, y + 3, PW, 12, 6); c.fill(); c.fillStyle = col; rr(c, x - PW / 2, y - 3, PW, 12, 6); c.fill(); };
      pad(g.ax, 66, '#e8e8ea'); pad(g.px, 440, '#f2c230');
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.arc(g.b.x + 3, g.b.y + 4, 7, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(g.b.x, g.b.y, 7, 0, 7); c.fill();
      hud(c, 'You ' + g.me, 'Computer ' + g.cpu);
    };
    return g;
  } });

// ============ Asteroids ============
register({ id: 'asteroids', name: 'Asteroids', icon: '☄️', tag: 'Blast the space rocks before they hit your ship.', goal: 'destroy as many asteroids as you can in 90 seconds.', how: 'Keys: ← → turn, ↑ thrust, Space fire. Touch: drag where you want to fly, your ship turns, thrusts and fires automatically.', par: 420,
  make(lv) {
    const g = { score: 0, over: false, lives: 3, t: 90, s: { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0 }, bl: [], ro: [], inv: 2, cd: 0, k: { l: 0, r: 0, u: 0, f: 0 }, tp: null, wave: 0, msg: 'Time!' };
    const rock = (x, y, sz) => { const n = 9, r0 = [0, 11, 20, 34][sz], pts = Array.from({ length: n }, (_, i) => r0 * R(0.75, 1.15)); const a = R(0, 6.28), sp = R(25, 55) * LV(lv, 0.7, 1, 1.4) / (sz * 0.6 + 0.4); return { x, y, sz, r: r0, pts, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: R(0, 6), vr: R(-1, 1) }; };
    const wave = () => { g.wave++; for (let i = 0; i < 2 + g.wave + (lv > 1 ? 1 : 0); i++) { const x = Math.random() < 0.5 ? R(0, 80) : R(280, W), y = R(40, H); g.ro.push(rock(x, y, 3)); } };
    wave();
    const wrap = o => { if (o.x < -20) o.x = W + 20; if (o.x > W + 20) o.x = -20; if (o.y < 10) o.y = H + 20; if (o.y > H + 20) o.y = 10; };
    g.update = dt => {
      g.t -= dt; if (g.t <= 0) { g.over = true; return; } g.inv -= dt; g.cd -= dt; const s = g.s;
      let thrust = g.k.u;
      if (g.tp) { const dx = g.tp.x - s.x, dy = g.tp.y - s.y, want = Math.atan2(dy, dx); let da = want - s.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; s.a += clamp(da, -5 * dt, 5 * dt); thrust = Math.hypot(dx, dy) > 50 ? 1 : 0; if (Math.abs(da) < 0.5) g.k.f = 1; }
      s.a += (g.k.r - g.k.l) * 4 * dt; if (thrust) { s.vx += Math.cos(s.a) * 220 * dt; s.vy += Math.sin(s.a) * 220 * dt; }
      const sp = Math.hypot(s.vx, s.vy); if (sp > 260) { s.vx *= 260 / sp; s.vy *= 260 / sp; } s.vx *= 1 - dt * 0.4; s.vy *= 1 - dt * 0.4; s.x += s.vx * dt; s.y += s.vy * dt; wrap(s);
      if (g.k.f && g.cd <= 0) { g.bl.push({ x: s.x + Math.cos(s.a) * 14, y: s.y + Math.sin(s.a) * 14, vx: Math.cos(s.a) * 420 + s.vx * 0.3, vy: Math.sin(s.a) * 420 + s.vy * 0.3, t: 1.1 }); g.cd = 0.24; sfx('tap'); }
      g.bl.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; b.t -= dt; wrap(b); }); g.bl = g.bl.filter(b => b.t > 0);
      g.ro.forEach(r => { r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt; wrap(r); });
      const add = [];
      g.bl.forEach(b => g.ro.forEach(r => { if (!b.dead && !r.dead && Math.hypot(b.x - r.x, b.y - r.y) < r.r + 2) { b.dead = r.dead = true; g.score += [0, 100, 50, 20][r.sz]; sfx('pop'); if (r.sz > 1) { add.push(rock(r.x, r.y, r.sz - 1), rock(r.x, r.y, r.sz - 1)); } } }));
      g.ro = g.ro.filter(r => !r.dead).concat(add); g.bl = g.bl.filter(b => !b.dead);
      if (g.inv <= 0) g.ro.forEach(r => { if (Math.hypot(s.x - r.x, s.y - r.y) < r.r + 8) { g.lives--; sfx('bad'); g.inv = 2.2; s.x = W / 2; s.y = H / 2; s.vx = s.vy = 0; if (g.lives <= 0) { g.over = true; g.msg = 'Ship destroyed'; } } });
      if (!g.ro.length) { g.score += 100; wave(); sfx('good'); }
    };
    g.key = (k, d) => { if (k === 'ArrowLeft' || k === 'a') g.k.l = d ? 1 : 0; if (k === 'ArrowRight' || k === 'd') g.k.r = d ? 1 : 0; if (k === 'ArrowUp' || k === 'w') g.k.u = d ? 1 : 0; if (k === ' ') g.k.f = d ? 1 : 0; };
    g.ptr = (t, x, y) => { if (t === 'up') { g.tp = null; g.k.f = 0; } else g.tp = { x, y }; };
    g.draw = c => {
      c.fillStyle = '#05060f'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; for (let i = 0; i < 40; i++) c.fillRect((i * 83) % W, (i * 57) % H, 1.5, 1.5);
      c.strokeStyle = '#cfe'; c.lineWidth = 2; g.ro.forEach(r => { c.save(); c.translate(r.x, r.y); c.rotate(r.rot); c.beginPath(); r.pts.forEach((p, i) => { const a = i / r.pts.length * 6.283; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * p, Math.sin(a) * p); }); c.closePath(); c.fillStyle = '#2a3250'; c.fill(); c.stroke(); c.restore(); });
      c.fillStyle = '#ffe27a'; g.bl.forEach(b => { c.beginPath(); c.arc(b.x, b.y, 2.5, 0, 7); c.fill(); });
      if (g.inv <= 0 || Math.floor(g.t * 10) % 2) { const s = g.s; c.save(); c.translate(s.x, s.y); c.rotate(s.a); c.strokeStyle = '#fff'; c.fillStyle = '#35d0e8'; c.beginPath(); c.moveTo(14, 0); c.lineTo(-10, 9); c.lineTo(-5, 0); c.lineTo(-10, -9); c.closePath(); c.fill(); c.stroke(); if (g.k.u || (g.tp && Math.hypot(g.tp.x - s.x, g.tp.y - s.y) > 50)) { c.fillStyle = '#ff9a2a'; c.beginPath(); c.moveTo(-6, 0); c.lineTo(-18 - R(0, 8), 0); c.lineTo(-6, 3); c.fill(); } c.restore(); }
      hud(c, 'Score ' + g.score, '🚀'.repeat(Math.max(0, g.lives)) + '  ' + Math.ceil(g.t) + 's');
    };
    return g;
  } });

// ============ Road Crossing (Frogger) ============
register({ id: 'frogger', name: 'Road Crossing', icon: '🐸', tag: 'Hop across the road and the river to reach home.', goal: 'get the frog across as many times as you can in 90 seconds.', how: 'Arrow keys hop the frog. On touch, swipe in a direction (or tap to hop up). Dodge the cars, then ride the logs across the water.', par: 420,
  make(lv) {
    const RH = 40, Y0 = 40, ROWS = 11, g = { score: 0, over: false, lives: 3, t: 90, col: 4, row: 10, best: 10, fx: 0, hop: 0, dead: 0, msg: 'Time!' }, lanes = [];
    const mk = (row, kind) => { const sp = R(40, 80) * LV(lv, 0.75, 1, 1.35) * (Math.random() < 0.5 ? -1 : 1), items = [], w = kind === 'log' ? R(90, 130) : R(36, 62), gap = kind === 'log' ? R(110, 170) : R(110, 200) * LV(lv, 1.3, 1, 0.85); for (let x = R(0, 60); x < W + 120; x += w + gap) items.push({ x, w }); lanes[row] = { kind, sp: kind === 'log' ? sp * 0.8 : sp, items, em: ['🚗', '🚙', '🚕', '🚌', '🚚', '🏎️'][Math.floor(R(0, 6))] }; };
    [1, 2, 3].forEach(r => mk(r, 'log')); [5, 6, 7, 8, 9].forEach(r => mk(r, 'car'));
    const reset = () => { g.col = 4; g.row = 10; g.best = 10; };
    const die = why => { if (g.dead > 0) return; g.dead = 0.6; g.lives--; sfx('bad'); if (g.lives <= 0) { g.over = true; g.msg = why; } };
    const hop = (dc, dr) => { if (g.dead > 0 || g.over) return; const nr = g.row + dr, nc = clamp(Math.round(g.col + dc), 0, 8); if (nr < 0 || nr > 10) return; g.row = nr; g.col = dr ? g.col : nc; if (dr) g.col = clamp(Math.round(g.col), 0, 8); g.hop = 0.12; sfx('pop');
      if (nr < g.best) { g.best = nr; g.score += 10; } if (nr === 0) { g.score += 100; sfx('win'); reset(); } };
    g.update = dt => {
      g.t -= dt; if (g.t <= 0) { g.over = true; return; } g.dead = Math.max(0, g.dead - dt); g.hop = Math.max(0, g.hop - dt);
      lanes.forEach(l => { if (!l) return; l.items.forEach(it => { it.x += l.sp * dt; if (l.sp > 0 && it.x > W + 20) it.x = -it.w - R(0, 80); if (l.sp < 0 && it.x < -it.w - 20) it.x = W + R(0, 80); }); });
      if (g.dead > 0) { if (g.dead <= dt) reset(); return; }
      const l = lanes[g.row]; const fx = g.col * 40 + 20;
      if (l && l.kind === 'car') { if (l.items.some(it => fx > it.x - 6 && fx < it.x + it.w + 6)) die('Run over'); }
      else if (l && l.kind === 'log') { const on = l.items.find(it => fx > it.x - 4 && fx < it.x + it.w + 4); if (on) { g.col += l.sp * dt / 40; if (g.col < -0.4 || g.col > 8.4) die('Swept away'); } else die('Splash'); }
    };
    g.key = (k, d) => { if (!d) return; if (k === 'ArrowUp' || k === 'w') hop(0, -1); if (k === 'ArrowDown' || k === 's') hop(0, 1); if (k === 'ArrowLeft' || k === 'a') hop(-1, 0); if (k === 'ArrowRight' || k === 'd') hop(1, 0); };
    let sw = null; g.ptr = (t, x, y) => { if (t === 'down') sw = { x, y, done: 0 }; else if (sw && !sw.done && t !== 'down') { const dx = x - sw.x, dy = y - sw.y; if (Math.hypot(dx, dy) > 22) { sw.done = 1; Math.abs(dx) > Math.abs(dy) ? hop(Math.sign(dx), 0) : hop(0, Math.sign(dy)); } else if (t === 'up') hop(0, -1); } };
    g.draw = c => {
      c.fillStyle = '#3f8f3a'; c.fillRect(0, 0, W, H); for (let r = 0; r < ROWS; r++) { const y = Y0 + r * RH, l = lanes[r];
        c.fillStyle = l ? (l.kind === 'log' ? '#2a79b8' : '#3c3c46') : (r === 0 ? '#2f7a34' : '#58a854'); c.fillRect(0, y, W, RH); if (l && l.kind === 'car') { c.fillStyle = '#e8d24a'; for (let x = 0; x < W; x += 40) c.fillRect(x + 8, y + RH - 2, 22, 2); } }
      txt(c, '🏠 🏠 🏠 🏠 🏠', W / 2, Y0 + 20, 20, '#fff', 'center');
      lanes.forEach((l, r) => { if (!l) return; const y = Y0 + r * RH; l.items.forEach(it => { if (l.kind === 'log') { c.fillStyle = '#8a5a2a'; rr(c, it.x, y + 6, it.w, RH - 12, 10); c.fill(); c.fillStyle = '#a8743a'; rr(c, it.x + 4, y + 10, it.w - 8, 6, 3); c.fill(); } else { emo(c, l.em, it.x + it.w / 2, y + 22, 34, l.sp > 0 ? Math.PI : 0); } }); });
      const fy = Y0 + g.row * RH + 22 - Math.sin(g.hop / 0.12 * Math.PI) * 10; emo(c, g.dead > 0 ? '💀' : '🐸', g.col * 40 + 20, fy, 32);
      hud(c, 'Score ' + g.score, '🐸'.repeat(Math.max(0, g.lives)) + '  ' + Math.ceil(g.t) + 's');
    };
    return g;
  } });

// ============ Quick Draw (reaction test) ============
register({ id: 'quickdraw', name: 'Quick Draw', icon: '⚡', tag: 'Test your reactions: tap the moment the screen turns green.', goal: 'react faster than everyone else over five rounds.', how: 'Wait for the red screen to turn green, then tap (or press Space) as fast as you can. Tap too early and you score nothing for that round.', par: 380,
  make(lv) {
    const g = { score: 0, over: false, round: 0, st: 'wait', t: 0, at: R(1.2, 3.2), ms: 0, res: [], note: '', msg: 'All done' };
    const next = () => { g.round++; g.st = 'wait'; g.t = 0; g.at = R(1.0, LV(lv, 4, 3.2, 2.6)); g.note = ''; if (g.round > 5) { g.over = true; g.win = true; } };
    g.round = 1;
    g.update = dt => { g.t += dt; if (g.st === 'wait' && g.t >= g.at) { g.st = 'go'; g.t = 0; sfx('ding'); } else if (g.st === 'go') g.ms = g.t * 1000; else if (g.st === 'show' && g.t > 1.3) next(); };
    const tap = () => { if (g.over) return; if (g.st === 'wait') { g.res.push(0); g.st = 'show'; g.t = 0; g.note = 'Too early!'; sfx('bad'); } else if (g.st === 'go') { const ms = Math.round(g.t * 1000), pts = Math.round(clamp((560 - ms) / 2.5, 0, 220)); g.score += pts; g.res.push(ms); g.st = 'show'; g.t = 0; g.note = ms + ' ms  (+' + pts + ')'; sfx('good'); } };
    g.key = (k, d) => { if (d && (k === ' ' || k === 'Enter')) tap(); }; g.ptr = t => { if (t === 'down') tap(); };
    g.draw = c => {
      c.fillStyle = g.st === 'go' ? '#1f9a46' : g.st === 'show' ? '#2a5fa8' : '#b82a2a'; c.fillRect(0, 0, W, H);
      txt(c, g.st === 'wait' ? 'Wait for green…' : g.st === 'go' ? 'TAP NOW!' : g.note, W / 2, H / 2 - 20, 34, '#fff', 'center'); txt(c, g.st === 'go' ? Math.round(g.ms) + ' ms' : '', W / 2, H / 2 + 30, 24, '#fff', 'center');
      g.res.forEach((r, i) => txt(c, r ? r + ' ms' : '—', W / 2, 330 + i * 24, 16, '#ffffffcc', 'center'));
      hud(c, 'Score ' + g.score, 'Round ' + Math.min(5, g.round) + '/5');
    };
    return g;
  } });

// ============ Slide Puzzle ============
register({ id: 'slide', name: 'Sliding Puzzle', icon: '🔢', tag: 'Slide the numbered tiles into order.', goal: 'put the tiles in order 1, 2, 3… before time runs out.', how: 'Tap a tile next to the gap to slide it (tapping further along the row slides several). Arrow keys also move the gap. Finish fast for a higher score.', par: 520,
  make(lv) {
    const N = LV(lv, 3, 4, 4), CS = Math.floor(320 / N), OX = (W - CS * N) / 2, OY = 100, cap = LV(lv, 120, 180, 150), g = { score: 0, over: false, t: 0, moves: 0, msg: 'Time!' };
    let b = Array.from({ length: N * N }, (_, i) => (i + 1) % (N * N)), gap = N * N - 1;
    const swapGap = i => { b[gap] = b[i]; b[i] = 0; gap = i; };
    for (let k = 0, prev = -1; k < 160 + N * 40; k++) { const gx = gap % N, gy = Math.floor(gap / N), nb = [gx > 0 && gap - 1, gx < N - 1 && gap + 1, gy > 0 && gap - N, gy < N - 1 && gap + N].filter(v => v !== false && v !== prev); const i = nb[Math.floor(Math.random() * nb.length)]; prev = gap; swapGap(i); }
    const solved = () => b.every((v, i) => v === (i + 1) % (N * N));
    const slide = i => { const gx = gap % N, gy = Math.floor(gap / N), ix = i % N, iy = Math.floor(i / N); if (ix !== gx && iy !== gy) return; if (i === gap) return; const dx = Math.sign(ix - gx), dy = Math.sign(iy - gy); let p = gap; while (p !== i) { const q = p + dx + dy * N; swapGap(q); p = q; } g.moves++; sfx('clack'); if (solved()) { g.over = true; g.win = true; g.msg = 'Solved!'; g.score = Math.round(400 + Math.max(0, cap - g.t) * 3 - g.moves * 2 + N * 20); } };
    g.update = dt => { g.t += dt; if (g.t >= cap) { g.over = true; g.score = b.filter((v, i) => v && v === i + 1).length * 8; } };
    g.ptr = (t, x, y) => { if (t !== 'down') return; const cx = Math.floor((x - OX) / CS), cy = Math.floor((y - OY) / CS); if (cx >= 0 && cx < N && cy >= 0 && cy < N) slide(cy * N + cx); };
    g.key = (k, d) => { if (!d) return; const gx = gap % N, gy = Math.floor(gap / N); if (k === 'ArrowLeft' && gx < N - 1) slide(gap + 1); if (k === 'ArrowRight' && gx > 0) slide(gap - 1); if (k === 'ArrowUp' && gy < N - 1) slide(gap + N); if (k === 'ArrowDown' && gy > 0) slide(gap - N); };
    g.draw = c => {
      c.fillStyle = '#26324a'; c.fillRect(0, 0, W, H); c.fillStyle = '#10182a'; rr(c, OX - 6, OY - 6, CS * N + 12, CS * N + 12, 10); c.fill();
      b.forEach((v, i) => { if (!v) return; const x = OX + (i % N) * CS, y = OY + Math.floor(i / N) * CS, ok = v === i + 1; c.fillStyle = `hsl(${(v * 360 / (N * N))},60%,${ok ? 52 : 42}%)`; rr(c, x + 3, y + 3, CS - 6, CS - 6, 10); c.fill(); c.fillStyle = 'rgba(255,255,255,.22)'; rr(c, x + 3, y + 3, CS - 6, 14, 10); c.fill(); txt(c, v, x + CS / 2, y + CS / 2 + 2, CS * 0.42, '#fff', 'center'); });
      hud(c, 'Moves ' + g.moves, Math.max(0, Math.ceil(cap - g.t)) + 's');
    };
    return g;
  } });

// ============ Lights Out ============
register({ id: 'lightsout', name: 'Lights Out', icon: '💡', tag: 'Switch off every light on the grid.', goal: 'turn all the lights off in as few presses as you can.', how: 'Tap a light to flip it and its four neighbours. Switch them all off to win. Fewer presses and a faster time score more.', par: 480,
  make(lv) {
    const N = 5, CS = 64, OX = (W - N * CS) / 2, OY = 110, cap = 150, g = { score: 0, over: false, t: 0, moves: 0, msg: 'Time!' }, cells = Array(25).fill(0);
    const flip = i => { const x = i % N, y = Math.floor(i / N); [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const a = x + dx, b = y + dy; if (a >= 0 && a < N && b >= 0 && b < N) cells[b * N + a] ^= 1; }); };
    const k = LV(lv, 4, 8, 13); const picks = [...Array(25).keys()].sort(() => Math.random() - 0.5).slice(0, k); picks.forEach(flip); if (!cells.some(Boolean)) flip(12);
    g.update = dt => { g.t += dt; if (g.t >= cap) { g.over = true; g.score = (25 - cells.filter(Boolean).length) * 8; } };
    g.ptr = (t, x, y) => { if (t !== 'down') return; const cx = Math.floor((x - OX) / CS), cy = Math.floor((y - OY) / CS); if (cx < 0 || cx >= N || cy < 0 || cy >= N) return; flip(cy * N + cx); g.moves++; sfx('click');
      if (!cells.some(Boolean)) { g.over = true; g.win = true; g.msg = 'All off!'; g.score = Math.round(300 + Math.max(0, 200 - (g.moves - k) * 14) + Math.max(0, cap - g.t) * 1.5); } };
    g.draw = c => {
      c.fillStyle = '#12182a'; c.fillRect(0, 0, W, H);
      cells.forEach((v, i) => { const x = OX + (i % N) * CS, y = OY + Math.floor(i / N) * CS; c.fillStyle = v ? '#ffd23a' : '#222b44'; rr(c, x + 4, y + 4, CS - 8, CS - 8, 12); c.fill(); if (v) { c.fillStyle = 'rgba(255,255,255,.5)'; rr(c, x + 10, y + 9, CS - 28, 10, 5); c.fill(); c.shadowColor = '#ffd23a'; c.shadowBlur = 14; c.fillStyle = '#ffd23a'; rr(c, x + 4, y + 4, CS - 8, CS - 8, 12); c.fill(); c.shadowBlur = 0; } });
      hud(c, 'Presses ' + g.moves, Math.max(0, Math.ceil(cap - g.t)) + 's');
    };
    return g;
  } });

// ============ Tower Stack ============
register({ id: 'tower', name: 'Tower Stack', icon: '🏗️', tag: 'Stack the blocks as high as you can.', goal: 'build the tallest tower you can.', how: 'A block slides across the top. Tap, click or press Space to drop it. Any overhang is cut off, so line it up carefully. Perfect drops keep your block full size.', par: 300,
  make(lv) {
    const BH = 26, g = { score: 0, over: false, floors: 0, cam: 0, msg: 'Tower fell', fx: [], perfect: 0 };
    let stack = [{ x: 100, w: 160, col: 0 }], cur = null, dir = 1, sp = LV(lv, 130, 170, 215);
    const newBlock = () => { const t = stack[stack.length - 1]; cur = { x: dir > 0 ? -t.w : W, w: t.w, col: stack.length }; };
    newBlock();
    const drop = () => { if (g.over) return; const t = stack[stack.length - 1], l = Math.max(cur.x, t.x), r = Math.min(cur.x + cur.w, t.x + t.w), ov = r - l;
      if (ov <= 0) { g.over = true; g.score = g.floors * 10 + g.perfect * 5; sfx('bad'); g.fx.push({ x: cur.x, y: 0, w: cur.w, col: cur.col, vy: 0, fall: 1 }); return; }
      let x = l, w = ov; if (Math.abs(cur.x - t.x) < 5) { x = t.x; w = t.w; g.perfect++; g.fx.push({ txt: 'PERFECT', t: 0.8 }); sfx('win'); } else sfx('clack');
      stack.push({ x, w, col: stack.length }); g.floors++; g.score = g.floors * 10 + g.perfect * 5; sp = Math.min(LV(lv, 300, 360, 420), sp + LV(lv, 6, 8, 10)); dir = -dir; newBlock(); };
    g.update = dt => { cur.x += dir * sp * dt; if (cur.x + cur.w > W + 20) dir = -1; if (cur.x < -20) dir = 1; g.cam += ((Math.max(0, stack.length - 9) * BH) - g.cam) * Math.min(1, dt * 4); g.fx.forEach(f => { if (f.fall) { f.vy += 900 * dt; } if (f.t) f.t -= dt; }); g.fx = g.fx.filter(f => !f.t || f.t > 0); };
    g.key = (k, d) => { if (d && (k === ' ' || k === 'Enter' || k === 'ArrowDown')) drop(); }; g.ptr = t => { if (t === 'down') drop(); };
    g.draw = c => {
      const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#16224a'); bg.addColorStop(1, '#4a2a6a'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
      const yOf = i => H - 20 - (i + 1) * BH + g.cam; const blk = (b, y) => { c.fillStyle = `hsl(${(b.col * 22) % 360},70%,58%)`; c.fillRect(b.x, y, b.w, BH - 2); c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(b.x, y, b.w, 5); };
      c.fillStyle = '#222'; c.fillRect(0, H - 20 + g.cam, W, 400);
      stack.forEach((b, i) => blk(b, yOf(i))); if (!g.over) blk(cur, yOf(stack.length));
      g.fx.forEach(f => { if (f.fall) { c.globalAlpha = 0.8; blk(f, yOf(stack.length) + f.vy * 0.4); c.globalAlpha = 1; } else txt(c, f.txt, W / 2, 140 - (0.8 - f.t) * 30, 24, '#ffe27a', 'center'); });
      hud(c, 'Floors ' + g.floors, 'Score ' + g.score);
    };
    return g;
  } });
})();
