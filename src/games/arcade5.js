/* ---------- Arcade engine games, part 5: sports + more arcade ---------- */
(function () {
const { W, H, R, clamp, LV, emo, txt, hud, sfx, register } = Arc;
const rr = (c, x, y, w, h, r, f) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); c.fillStyle = f; c.fill(); };

// ============ Basketball Shots ============
register({ id: 'hoops', cat: 'sports', name: 'Basketball Shots', icon: '🏀', tag: 'Time your shot and sink the moving hoop.', goal: 'score as many baskets as you can in 40 seconds.', how: 'Move the mouse or your finger to aim, then click or lift to shoot. The hoop slides side to side, so lead your shot. On a keyboard use the left and right arrows to aim and Space to shoot.', par: 150,
  make(lv) {
    const g = { score: 0, over: false, t: 40, msg: 'Time!' }; let aim = 180, ball = null, hx = 180, ph = 0, streak = 0, flash = 0, net = 0;
    const sp = LV(lv, 0.8, 1.3, 1.9), amp = LV(lv, 60, 100, 125), hw = LV(lv, 42, 34, 28);
    const shoot = () => { if (ball) return; ball = { x0: 180, tx: aim, p: 0, x: 180, y: 430 }; sfx('tap'); };
    g.update = dt => {
      g.t -= dt; if (g.t <= 0) { g.over = true; return; } ph += dt * sp; hx = 180 + Math.sin(ph) * amp; flash -= dt; net -= dt;
      if (ball) { ball.p += dt / 0.7; const p = Math.min(1, ball.p); ball.x = ball.x0 + (ball.tx - ball.x0) * p; ball.y = 430 - 290 * p - Math.sin(p * Math.PI) * 90; ball.s = 1 - 0.4 * p;
        if (p >= 1) { if (Math.abs(ball.x - hx) < hw * 0.7) { streak++; g.score += 2 + Math.min(4, streak - 1) * 1; g.score += 0; net = 0.4; flash = 0.4; sfx('good'); } else { streak = 0; sfx('thud'); } ball = null; } }
    };
    g.key = (k, d) => { if (!d) return; if (k === 'ArrowLeft') aim = clamp(aim - 24, 20, 340); if (k === 'ArrowRight') aim = clamp(aim + 24, 20, 340); if (k === ' ' || k === 'ArrowUp') shoot(); };
    g.ptr = (t, x) => { if (t === 'down' || t === 'move') aim = clamp(x, 20, 340); if (t === 'up') shoot(); };
    g.draw = c => {
      c.fillStyle = '#1d2b4a'; c.fillRect(0, 0, W, H); c.fillStyle = '#c98a4a'; c.fillRect(0, 400, W, 80); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, 400, W, 3);
      c.fillStyle = '#e8eef7'; c.fillRect(hx - 52, 62, 104, 74); c.strokeStyle = '#d33'; c.lineWidth = 3; c.strokeRect(hx - 52, 62, 104, 74); c.strokeRect(hx - 22, 96, 44, 40);
      c.strokeStyle = net > 0 ? '#fff' : '#ff8a2a'; c.lineWidth = 5; c.beginPath(); c.moveTo(hx - hw, 140); c.lineTo(hx + hw, 140); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(hx + i * hw / 3, 142); c.lineTo(hx + i * hw / 5, 142 + (net > 0 ? 34 : 26)); c.stroke(); }
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([4, 6]); c.beginPath(); c.moveTo(180, 440); c.lineTo(aim, 142); c.stroke(); c.setLineDash([]); emo(c, '🎯', aim, 142, 16);
      const b = ball || { x: 180, y: 430, s: 1 }; emo(c, '🏀', b.x, b.y, 40 * b.s);
      hud(c, 'Baskets ' + g.score, 'Time ' + Math.ceil(g.t)); if (streak > 1) txt(c, streak + ' in a row!', W / 2, 44, 16, '#ffd45a', 'center');
    };
    return g;
  } });

// ============ Penalty Kicks ============
register({ id: 'penalty', cat: 'sports', name: 'Penalty Kicks', icon: '⚽', tag: 'Beat the goalkeeper from the spot.', goal: 'score as many of your 5 penalty kicks as you can.', how: 'Click or tap the spot in the goal where you want the ball to go. Corners are harder to save but easier to miss. On a keyboard move the target with the arrows and press Space.', par: 320,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Full time!' }; let k = 0, ph = 'aim', cx = 180, cy = 170, ball = null, kp = { x: 180, tx: 180 }, res = '', tm = 0, goals = 0, kdive = 0;
    const guess = LV(lv, 0.2, 0.4, 0.58);
    const shoot = (x, y) => { if (ph !== 'aim') return; ph = 'fly'; const side = x < 180 ? -1 : 1; const right = Math.random() < guess; const dir = right ? side : (Math.random() < 0.5 ? -1 : 1); kp.tx = 180 + dir * R(30, 100); kp.x = 180; ball = { x: 180, y: 430, tx: x, ty: y, p: 0 }; kdive = 0; sfx('clack'); };
    const finish = () => { const inside = ball.tx > 62 && ball.tx < 298 && ball.ty > 108 && ball.ty < 236; const saved = inside && Math.abs(kp.x - ball.tx) < 38; if (!inside) { res = 'Wide!'; sfx('bad'); } else if (saved) { res = 'Saved!'; sfx('thud'); } else { goals++; const corner = Math.abs(ball.tx - 180) > 90 || ball.ty < 135; g.score += 60 + (corner ? 40 : 0); res = corner ? 'Top corner! +100' : 'Goal! +60'; sfx('good'); } k++; ph = 'res'; tm = 1.1; };
    g.update = dt => {
      if (ph === 'fly') { ball.p += dt / 0.5; kdive = Math.min(1, ball.p * 1.3); kp.x = 180 + (kp.tx - 180) * kdive; if (ball.p >= 1) finish(); }
      if (ph === 'res') { tm -= dt; if (tm <= 0) { if (k >= 5) { g.over = true; } else { ph = 'aim'; ball = null; kp.x = 180; kdive = 0; res = ''; } } }
    };
    g.key = (kk, d) => { if (!d) return; if (kk === 'ArrowLeft') cx = clamp(cx - 18, 40, 320); if (kk === 'ArrowRight') cx = clamp(cx + 18, 40, 320); if (kk === 'ArrowUp') cy = clamp(cy - 14, 100, 250); if (kk === 'ArrowDown') cy = clamp(cy + 14, 100, 250); if (kk === ' ') shoot(cx, cy); };
    g.ptr = (t, x, y) => { if (t === 'move') { cx = x; cy = y; } if (t === 'down' && ph === 'aim') { cx = x; cy = y; shoot(x, y); } };
    g.draw = c => {
      c.fillStyle = '#2f8f45'; c.fillRect(0, 0, W, H); for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#2b8540' : '#359a4b'; c.fillRect(0, 230 + i * 32, W, 32); }
      c.fillStyle = '#9fd0ee'; c.fillRect(0, 26, W, 84); c.strokeStyle = '#fff'; c.lineWidth = 6; c.strokeRect(58, 108, 244, 132); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.35)'; for (let x = 64; x < 300; x += 12) { c.beginPath(); c.moveTo(x, 110); c.lineTo(x, 238); c.stroke(); } for (let y = 118; y < 238; y += 12) { c.beginPath(); c.moveTo(60, y); c.lineTo(300, y); c.stroke(); }
      const ky = 215 - 10 * Math.sin(kdive * Math.PI); emo(c, '🧤', kp.x, ky, 44, (kp.x - 180) / 160);
      if (ph === 'aim') { c.strokeStyle = '#ffe27a'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, 14, 0, 7); c.moveTo(cx - 20, cy); c.lineTo(cx + 20, cy); c.moveTo(cx, cy - 20); c.lineTo(cx, cy + 20); c.stroke(); }
      const bp = ball ? Math.min(1, ball.p) : 0, bx = ball ? 180 + (ball.tx - 180) * bp : 180, by = ball ? 430 + (ball.ty - 430) * bp : 430; emo(c, '⚽', bx, by, 34 - 12 * bp);
      for (let i = 0; i < 5; i++) { c.fillStyle = i < k ? (i < goals ? '#3adf6a' : '#ff6a5a') : 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(130 + i * 25, 462, 8, 0, 7); c.fill(); }
      hud(c, 'Kick ' + Math.min(5, k + (ph === 'aim' || ph === 'fly' ? 1 : 0)) + ' of 5', 'Score ' + g.score); if (res) txt(c, res, W / 2, 300, 30, '#fff', 'center');
    };
    return g;
  } });

// ============ Ten-Pin Bowling ============
register({ id: 'bowling', cat: 'sports', name: 'Bowling', icon: '🎳', tag: 'Roll the ball and knock down all ten pins.', goal: 'knock down as many pins as you can over 5 frames.', how: 'Slide left and right to place the ball, watch the aim swing, then click or tap to roll. Each frame has two rolls. A strike or a spare earns bonus points. On a keyboard use the arrows to place and Space to roll.', par: 90,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Game over' }; let fr = 1, roll = 1, bx = 180, sw = 0, ph = 'aim', ball = null, tm = 0, note = '', pinsDown = 0;
    const pins = []; for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) pins.push({ x: 180 + (i - r / 2) * 26, y: 122 + (3 - r) * 24, up: 1, fall: 0 });
    const chain = LV(lv, 0.7, 0.55, 0.42), width = LV(lv, 16, 13, 11);
    const reset = () => pins.forEach(p => { p.up = 1; p.fall = 0; });
    const swing = () => Math.sin(sw) * LV(lv, 0.05, 0.09, 0.13);
    const throwBall = () => { if (ph !== 'aim') return; ph = 'roll'; ball = { x: bx, y: 440, a: swing(), vy: 0 }; sfx('thud'); };
    g.update = dt => {
      if (ph === 'aim') sw += dt * 3.2;
      if (ph === 'roll') { ball.y -= 420 * dt; ball.x += Math.tan(ball.a) * 420 * dt; ball.rot = (ball.rot || 0) + dt * 12;
        if (ball.x < 128 || ball.x > 232) { if (ball.y < 280) { ph = 'wait'; tm = 0.8; note = 'Gutter'; ball.gone = true; sfx('bad'); } }
        if (ball.y < 160 && ph === 'roll') { const hit = pins.filter(p => p.up && Math.abs(p.x - ball.x) < width + 4 * (160 - ball.y) / 40 && ball.y - p.y < 20);
          const q = new Set(hit); const bfs = [...hit]; while (bfs.length) { const a = bfs.shift(); pins.forEach(b => { if (b.up && !q.has(b) && Math.hypot(a.x - b.x, a.y - b.y) < 34 && Math.random() < chain) { q.add(b); bfs.push(b); } }); }
          q.forEach(p => { p.up = 0; p.fall = 1; }); sfx(q.size ? 'clack' : 'tap'); ph = 'wait'; tm = 1.0; ball.gone = true; }
      }
      pins.forEach(p => { if (p.fall > 0) p.fall = Math.max(0, p.fall - dt * 0.7); });
      if (ph === 'wait') { tm -= dt; if (tm <= 0) {
        const down = pins.filter(p => !p.up).length, left = 10 - down, got = down - pinsDown; g.score += got; pinsDown = down; note = '';
        if (roll === 1 && left === 0) { g.score += 10; note = 'STRIKE! +10'; fr++; roll = 1; reset(); pinsDown = 0; }
        else if (roll === 2 && left === 0) { g.score += 5; note = 'Spare! +5'; fr++; roll = 1; reset(); pinsDown = 0; }
        else if (roll === 1) roll = 2; else { fr++; roll = 1; reset(); pinsDown = 0; }
        if (fr > 5) { g.over = true; return; } ph = 'aim'; ball = null; if (note) sfx('good'); } }
    };
    g.key = (k, d) => { if (!d) return; if (k === 'ArrowLeft') bx = clamp(bx - 10, 138, 222); if (k === 'ArrowRight') bx = clamp(bx + 10, 138, 222); if (k === ' ' || k === 'ArrowUp') throwBall(); };
    g.ptr = (t, x) => { if (ph !== 'aim') return; if (t === 'down' || t === 'move') bx = clamp(x, 138, 222); if (t === 'up') throwBall(); };
    g.draw = c => {
      c.fillStyle = '#2a1a12'; c.fillRect(0, 0, W, H); c.fillStyle = '#d9a86a'; c.beginPath(); c.moveTo(150, 90); c.lineTo(210, 90); c.lineTo(236, 470); c.lineTo(124, 470); c.fill();
      c.fillStyle = '#111'; c.fillRect(108, 90, 16, 380); c.fillRect(236, 90, 16, 380); c.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 9; i++) c.fillRect(130 + i * 12, 130 + i * 20, 5, 5);
      pins.forEach(p => { if (p.up) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(p.x, p.y, 7, 10, 0, 0, 7); c.fill(); c.fillStyle = '#d33'; c.fillRect(p.x - 6, p.y - 4, 12, 3); } else if (p.fall > 0) { c.globalAlpha = p.fall; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(p.x + (1 - p.fall) * 26, p.y - (1 - p.fall) * 30, 7, 10, (1 - p.fall) * 3, 0, 7); c.fill(); c.globalAlpha = 1; } });
      if (ph === 'aim') { const a = swing(); c.strokeStyle = 'rgba(255,226,122,.8)'; c.lineWidth = 3; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(bx, 440); c.lineTo(bx + Math.tan(a) * 320, 120); c.stroke(); c.setLineDash([]); }
      if (!ball || !ball.gone) { const b = ball || { x: bx, y: 440 }; c.fillStyle = '#16346a'; c.beginPath(); c.arc(b.x, b.y, 12, 0, 7); c.fill(); c.fillStyle = '#6f9cff'; c.beginPath(); c.arc(b.x - 4, b.y - 4, 3, 0, 7); c.fill(); }
      hud(c, 'Frame ' + Math.min(5, fr) + ' · roll ' + roll, 'Score ' + g.score); if (note) txt(c, note, W / 2, 70, 24, '#ffe27a', 'center');
    };
    return g;
  } });

// ============ Gone Fishing ============
register({ id: 'fishing', cat: 'sports', name: 'Gone Fishing', icon: '🎣', tag: 'Drop the line and reel in the big ones.', goal: 'catch as many fish as you can in 45 seconds.', how: 'Move your boat left and right (mouse, finger or arrows). Press and hold (or hold Space or the down arrow) to lower the hook, let go to reel up. Touch a fish with the hook to catch it. Avoid the jellyfish.', par: 240,
  make(lv) {
    const g = { score: 0, over: false, t: 45, msg: 'Time!' }; let bx = 180, tx = 180, hy = 50, down = false, got = null, fish = [], sp = 0;
    const KINDS = [['🐟', 10, 60], ['🐠', 20, 90], ['🐡', 30, 120], ['🦈', 50, 150], ['🪼', -25, 50]];
    g.update = dt => {
      g.t -= dt; if (g.t <= 0) { g.over = true; return; } bx += clamp(tx - bx, -240 * dt, 240 * dt);
      sp -= dt; if (sp <= 0 && fish.length < 9) { sp = LV(lv, 0.8, 0.6, 0.45); const kd = Math.random() < 0.18 ? 4 : (Math.random() < 0.5 ? 0 : Math.random() < 0.6 ? 1 : Math.random() < 0.6 ? 2 : 3); const dir = Math.random() < 0.5 ? 1 : -1; fish.push({ k: kd, x: dir > 0 ? -20 : 380, y: R(130, 440), d: dir, v: KINDS[kd][2] * R(0.8, 1.2) * LV(lv, 0.8, 1, 1.3) }); }
      fish.forEach(f => { f.x += f.d * f.v * dt; }); fish = fish.filter(f => f.x > -40 && f.x < 400 && f !== got);
      if (got) { hy = Math.max(50, hy - 330 * dt); got.x = bx; got.y = hy + 14; if (hy <= 50) { g.score = Math.max(0, g.score + KINDS[got.k][1]); sfx(KINDS[got.k][1] > 0 ? 'coin' : 'bad'); got = null; } }
      else { hy = clamp(hy + (down ? 230 : -260) * dt, 50, 450); if (down) for (const f of fish) if (Math.hypot(f.x - bx, f.y - hy - 8) < 24) { got = f; down = false; sfx('pop'); break; } }
    };
    g.key = (k, d) => { if (k === 'ArrowLeft') tx = d ? 20 : bx; if (k === 'ArrowRight') tx = d ? 340 : bx; if (k === ' ' || k === 'ArrowDown') down = d; };
    g.ptr = (t, x) => { if (t !== 'up') tx = clamp(x, 20, 340); if (t === 'down') down = true; if (t === 'up') down = false; };
    g.draw = c => {
      c.fillStyle = '#9fd8ff'; c.fillRect(0, 0, W, 90); c.fillStyle = '#1d6fa5'; c.fillRect(0, 90, W, H); c.fillStyle = '#165a8a'; c.fillRect(0, 280, W, H); c.fillStyle = '#0f4468'; c.fillRect(0, 400, W, H);
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= W; x += 20) c.lineTo(x, 90 + Math.sin(x / 14 + g.t * 3) * 2); c.stroke();
      fish.forEach(f => { emo(c, KINDS[f.k][0], f.x, f.y, 34); }); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(bx + 14, 70); c.lineTo(bx, hy); c.stroke(); emo(c, '⚓', bx, hy + 4, 14);
      if (got) emo(c, KINDS[got.k][0], got.x, got.y + 6, 34); emo(c, '⛵', bx, 70, 48);
      hud(c, 'Score ' + g.score, 'Time ' + Math.ceil(g.t));
    };
    return g;
  } });

// ============ 100m Sprint ============
register({ id: 'sprint', cat: 'sports', name: '100m Sprint', icon: '🏃', tag: 'Tap left, right, left, right as fast as you can.', goal: 'run 100 metres in the fastest time you can.', how: 'Wait for GO, then tap the LEFT and RIGHT halves of the screen one after the other, as fast as you can. On a keyboard alternate the Left and Right arrows (or A and D). Tapping the same side twice does nothing.', par: 360,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Finish!' }; let d = 0, v = 0, t = 0, wait = R(1.2, 2.4), go = false, last = 0, taps = 0, ft = 0;
    const decay = LV(lv, 0.8, 1, 1.25), kick = 1.4;
    const tap = s => { if (!go || g.over) return; if (s !== last) { last = s; v += kick; taps++; sfx('tap'); } };
    g.update = dt => { if (!go) { wait -= dt; if (wait <= 0) { go = true; sfx('ding'); } return; } t += dt; v = Math.max(0, v - v * decay * dt); d += v * dt; if (d >= 100) { g.over = true; g.win = true; ft = t; g.score = Math.max(0, Math.round((24 - t) * 30)); g.msg = 'Time ' + t.toFixed(2) + 's'; } };
    g.key = (k, dn) => { if (!dn) return; if (k === 'ArrowLeft' || k === 'a' || k === 'A') tap(1); if (k === 'ArrowRight' || k === 'd' || k === 'D') tap(2); };
    g.ptr = (tp, x) => { if (tp === 'down') tap(x < 180 ? 1 : 2); };
    g.draw = c => {
      c.fillStyle = '#c0583a'; c.fillRect(0, 0, W, H); for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#b34f33' : '#c8603f'; c.fillRect(0, 60 + i * 60, W, 60); }
      c.fillStyle = '#fff'; c.fillRect(0, 60, W, 3); c.fillRect(0, 420, W, 3); c.fillStyle = '#fff'; for (let y = 60; y < 420; y += 60) c.fillRect(0, y, W, 1);
      const px = 30 + (d / 100) * 270; emo(c, '🏃', px, 360, 56); emo(c, '🏁', 335, 360, 40);
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(30, 70, 300, 14); c.fillStyle = '#ffe27a'; c.fillRect(30, 70, 300 * Math.min(1, d / 100), 14);
      c.fillStyle = last === 1 ? '#ffd45a' : 'rgba(255,255,255,.18)'; c.fillRect(10, 410, 165, 62); c.fillStyle = last === 2 ? '#ffd45a' : 'rgba(255,255,255,.18)'; c.fillRect(185, 410, 165, 62); txt(c, 'LEFT', 92, 441, 22, '#fff', 'center'); txt(c, 'RIGHT', 267, 441, 22, '#fff', 'center');
      hud(c, Math.min(100, Math.round(d)) + ' m', go ? t.toFixed(2) + ' s' : 'Get ready…'); txt(c, go ? (t < 0.9 ? 'GO!' : 'Speed ' + v.toFixed(1)) : 'Ready…', W / 2, 220, go && t < 0.9 ? 54 : 22, '#fff', 'center');
    };
    return g;
  } });

// ============ Keepie Uppie ============
register({ id: 'juggle', cat: 'sports', name: 'Keepie Uppie', icon: '🥅', tag: 'Keep the football in the air.', goal: 'keep the ball off the ground for as many touches as you can.', how: 'Click or tap the ball to kick it up. Where you hit it sends it left or right. Do not let it hit the ground. On a keyboard move with the arrows and press Space to kick.', par: 230,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Dropped!' }; let b = { x: 180, y: 160, vx: 0, vy: 0 }, fx = 180, touch = 0, rot = 0;
    const grav = LV(lv, 900, 1150, 1450), rad = LV(lv, 58, 48, 40);
    const kick = (x, y) => { if (Math.hypot(b.x - x, b.y - y) < rad + 20 && b.vy > -150) { b.vy = -(430 + touch * 4 > 560 ? 560 : 430 + touch * 4); b.vx = clamp((b.x - x) * 7, -190, 190) + R(-25, 25); touch++; g.score = touch * 10; rot += 4; sfx('thud'); } };
    g.update = dt => { b.vy += grav * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < 24) { b.x = 24; b.vx = Math.abs(b.vx); } if (b.x > 336) { b.x = 336; b.vx = -Math.abs(b.vx); } if (b.y < 50) { b.y = 50; b.vy = Math.abs(b.vy) * 0.4; } if (b.y > 430) { g.over = true; sfx('bad'); } };
    g.key = (k, d) => { if (!d) return; if (k === 'ArrowLeft') fx = clamp(fx - 30, 24, 336); if (k === 'ArrowRight') fx = clamp(fx + 30, 24, 336); if (k === ' ' || k === 'ArrowUp') kick(fx, b.y + 10); };
    g.ptr = (t, x, y) => { if (t === 'down') kick(x, y); };
    g.draw = c => {
      c.fillStyle = '#4aa860'; c.fillRect(0, 0, W, H); c.fillStyle = '#3f9754'; for (let i = 0; i < 6; i++) c.fillRect(i * 60 + (i % 2) * 0, 0, 30, H); c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(b.x, 440, 24 - (440 - b.y) / 30, 6, 0, 0, 7); c.fill();
      emo(c, '⚽', b.x, b.y, 46, b.x / 30 + rot); emo(c, '👟', fx, 452, 32); hud(c, 'Touches ' + touch, 'Score ' + g.score);
    };
    return g;
  } });

// ============ Sky Hopper (Doodle-style jumper) ============
register({ id: 'doodle', cat: 'arcade', name: 'Sky Hopper', icon: '🐸', tag: 'Bounce up from cloud to cloud.', goal: 'climb as high as you can without falling.', how: 'You bounce on every cloud by yourself. Steer left and right with the mouse, your finger or the arrows. Some clouds drift sideways. Fall off the bottom and it is over.', par: 260,
  make(lv) {
    const g = { score: 0, over: false, msg: 'You fell!' }; const p = { x: 180, y: 380, vy: -600 }; let tgt = 180, ht = 0, key = 0, plats = []; const gap = LV(lv, 78, 98, 116), mv = LV(lv, 0.1, 0.25, 0.4);
    let top = 480; const mk = y => plats.push({ x: R(30, 330), y, w: 58, m: Math.random() < mv ? R(40, 80) * (Math.random() < 0.5 ? 1 : -1) : 0, o: Math.random() * 6 });
    plats.push({ x: 180, y: 440, w: 100, m: 0, o: 0 }); top = 440; while (top > -60) { top -= R(gap * 0.55, gap); mk(top); }
    g.update = dt => {
      if (key) tgt = clamp(tgt + key * 340 * dt, 20, 340); p.x += clamp(tgt - p.x, -300 * dt, 300 * dt); p.vy += 1500 * dt; const py = p.y; p.y += p.vy * dt;
      plats.forEach(q => { if (q.m) { q.x += q.m * dt; if (q.x < 30 || q.x > 330) q.m = -q.m; } });
      if (p.vy > 0) for (const q of plats) if (py + 16 <= q.y + 4 && p.y + 16 >= q.y && Math.abs(p.x - q.x) < q.w / 2 + 10) { p.vy = -740; sfx('pop'); break; }
      if (p.y < 220) { const s = 220 - p.y; p.y = 220; ht += s; plats.forEach(q => { q.y += s; }); }
      plats = plats.filter(q => q.y < 500); top = Math.min(...plats.map(q => q.y)); while (top > -60) { top -= R(gap * 0.55, gap); mk(top); }
      g.score = Math.floor(ht / 8); if (p.y > 510) g.over = true;
    };
    g.key = (k, d) => { if (k === 'ArrowLeft' || k === 'a') key = d ? -1 : (key === -1 ? 0 : key); if (k === 'ArrowRight' || k === 'd') key = d ? 1 : (key === 1 ? 0 : key); };
    g.ptr = (t, x) => { if (t !== 'up') { tgt = clamp(x, 20, 340); key = 0; } };
    g.draw = c => {
      const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6ec3ff'); gr.addColorStop(1, '#d6f0ff'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
      plats.forEach(q => { rr(c, q.x - q.w / 2, q.y, q.w, 14, 7, q.m ? '#ffb347' : '#fff'); rr(c, q.x - q.w / 2 + 4, q.y + 2, q.w - 8, 4, 2, 'rgba(0,0,0,.08)'); });
      emo(c, '🐸', p.x, p.y, 36, p.vy < 0 ? -0.15 : 0.15); hud(c, 'Height ' + g.score, '');
    };
    return g;
  } });

// ============ Desert Runner (Dino-style) ============
register({ id: 'runner', cat: 'arcade', name: 'Desert Runner', icon: '🦖', tag: 'Run, jump the cacti, go further.', goal: 'run as far as you can without hitting an obstacle.', how: 'Tap, click, press Space or the up arrow to jump. Press and hold a little longer for a higher jump. The run gets faster the further you go.', par: 280,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Crash!' }; const GY = 380; let y = GY, vy = 0, dist = 0, sp = LV(lv, 230, 280, 330), obs = [], nx = 260, on = true, hold = false, ht = 0;
    const jump = () => { if (y >= GY - 1) { vy = -560; sfx('tap'); hold = true; ht = 0; } };
    g.update = dt => {
      sp += dt * LV(lv, 4, 6, 8); dist += sp * dt; g.score = Math.floor(dist / 6);
      if (hold && vy < 0) { ht += dt; if (ht < 0.2) vy -= 1100 * dt; } vy += 1650 * dt; y = Math.min(GY, y + vy * dt); if (y >= GY) vy = 0;
      nx -= sp * dt; if (nx <= 0) { const k = Math.random(); obs.push({ x: 380, w: k < 0.3 ? 46 : 22, h: k < 0.2 ? 34 : 44, e: k < 0.3 ? '🌵🌵' : (k < 0.5 ? '🪨' : '🌵') }); nx = sp * R(0.62, 1.0) + 120; }
      obs.forEach(o => { o.x -= sp * dt; }); obs = obs.filter(o => o.x > -60);
      for (const o of obs) if (Math.abs(o.x - 60) < o.w / 2 + 12 && y > GY - o.h + 8) { g.over = true; sfx('bad'); }
    };
    g.key = (k, d) => { if (k === ' ' || k === 'ArrowUp') { if (d) jump(); else hold = false; } };
    g.ptr = (t) => { if (t === 'down') jump(); if (t === 'up') hold = false; };
    g.draw = c => {
      c.fillStyle = '#f7d8a0'; c.fillRect(0, 0, W, H); c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(290, 90, 34, 0, 7); c.fill(); c.fillStyle = '#e3b573'; c.fillRect(0, GY + 20, W, H); c.fillStyle = '#c99a58'; for (let i = 0; i < 14; i++) c.fillRect(((i * 61 - dist * 0.9) % 420 + 420) % 420 - 30, GY + 30 + (i % 3) * 22, 18, 3);
      obs.forEach(o => emo(c, o.e, o.x, GY + 4, o.e.length > 2 ? 34 : 44)); emo(c, '🦖', 60, y - 4, 54, vy < 0 ? -0.1 : 0.05); hud(c, 'Distance ' + g.score + ' m', '');
    };
    return g;
  } });

// ============ Basket Catch ============
register({ id: 'catcher', cat: 'arcade', name: 'Basket Catch', icon: '🧺', tag: 'Catch the fruit, dodge the bombs.', goal: 'catch as much fruit as you can in 40 seconds.', how: 'Slide the basket with the mouse, your finger or the arrow keys. Fruit scores points, golden fruit scores more. A bomb costs you points.', par: 260,
  make(lv) {
    const g = { score: 0, over: false, t: 40, msg: 'Time!' }; let bx = 180, tgt = 180, items = [], sp = 0, key = 0, shake = 0;
    const fall = LV(lv, 150, 200, 260), bomb = LV(lv, 0.12, 0.2, 0.28), wide = LV(lv, 52, 44, 38);
    g.update = dt => {
      g.t -= dt; if (g.t <= 0) { g.over = true; return; } if (key) tgt = clamp(tgt + key * 380 * dt, 30, 330); bx += clamp(tgt - bx, -420 * dt, 420 * dt); shake -= dt;
      sp -= dt; if (sp <= 0) { sp = LV(lv, 0.7, 0.5, 0.38) * R(0.7, 1.2); const r = Math.random(); items.push({ x: R(24, 336), y: 30, v: fall * R(0.8, 1.25), k: r < bomb ? 'b' : (r < bomb + 0.1 ? 'g' : 'f'), e: r < bomb ? '💣' : (r < bomb + 0.1 ? '🍍' : ['🍎', '🍌', '🍇', '🍊', '🍓'][Math.floor(R(0, 5))]) }); }
      items.forEach(o => { o.y += o.v * dt; if (!o.d && o.y > 408 && o.y < 440 && Math.abs(o.x - bx) < wide) { o.d = 1; if (o.k === 'b') { g.score = Math.max(0, g.score - 25); shake = 0.3; sfx('bad'); } else { g.score += o.k === 'g' ? 30 : 10; sfx('coin'); } } });
      items = items.filter(o => !o.d && o.y < 500);
    };
    g.key = (k, d) => { if (k === 'ArrowLeft' || k === 'a') key = d ? -1 : (key === -1 ? 0 : key); if (k === 'ArrowRight' || k === 'd') key = d ? 1 : (key === 1 ? 0 : key); };
    g.ptr = (t, x) => { if (t !== 'up') { tgt = clamp(x, 30, 330); key = 0; } };
    g.draw = c => {
      c.fillStyle = '#7fc8f0'; c.fillRect(0, 0, W, H); c.fillStyle = '#6ab34a'; c.fillRect(0, 440, W, 40); c.fillStyle = 'rgba(255,255,255,.7)'; [[60, 80], [250, 130], [160, 50]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, 34, 14, 0, 0, 7); c.fill(); });
      items.forEach(o => emo(c, o.e, o.x, o.y, 32)); emo(c, '🧺', bx + (shake > 0 ? R(-4, 4) : 0), 428, 62); hud(c, 'Score ' + g.score, 'Time ' + Math.ceil(g.t));
    };
    return g;
  } });
})();
