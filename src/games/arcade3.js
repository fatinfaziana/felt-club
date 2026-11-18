/* ---------- Arcade: Street Racer (car) and Moto Rider (bike) on a shared top-down road engine ---------- */
(function () {
const { W, H, R, clamp, LV, txt, hud, sfx, register } = Arc;
const LANES = [75, 145, 215, 285], RX0 = 40, RX1 = 320, PY = H - 100;
const PAL = ['#d8352a', '#2b6fd6', '#f2c230', '#2e9b4a', '#8a3fb8', '#e8e8ea', '#ef7d1f', '#222831'];
const rr = (c, x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };

// a vehicle seen from above, front at the top (dir = -1 turns it round for oncoming traffic)
function car(c, x, y, o) {
  const w = o.w || 34, h = o.h || 58, col = o.col, up = o.dir !== -1;
  c.save(); c.translate(x, y); if (!up) c.rotate(Math.PI); if (o.tilt) c.rotate(o.tilt);
  c.fillStyle = 'rgba(0,0,0,.3)'; rr(c, -w / 2 + 3, -h / 2 + 5, w, h, 8); c.fill();
  c.fillStyle = '#111'; [[-w / 2 - 2, -h / 2 + 9], [w / 2 - 2, -h / 2 + 9], [-w / 2 - 2, h / 2 - 19], [w / 2 - 2, h / 2 - 19]].forEach(([wx, wy]) => { rr(c, wx, wy, 4, 11, 2); c.fill(); });
  const g = c.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, col); g.addColorStop(0.5, '#ffffff55'); g.addColorStop(1, col);
  c.fillStyle = col; rr(c, -w / 2, -h / 2, w, h, 9); c.fill(); c.fillStyle = g; c.globalAlpha = 0.35; rr(c, -w / 2, -h / 2, w, h, 9); c.fill(); c.globalAlpha = 1;
  if (o.truck) { c.fillStyle = 'rgba(255,255,255,.85)'; rr(c, -w / 2 + 3, -h / 2 + 18, w - 6, h - 22, 3); c.fill(); c.fillStyle = col; c.fillRect(-w / 2 + 3, -h / 2 + 18, w - 6, 3); c.fillStyle = '#1b2a3a'; rr(c, -w / 2 + 4, -h / 2 + 6, w - 8, 10, 3); c.fill(); }
  else { c.fillStyle = '#1b2a3a'; rr(c, -w / 2 + 4, -h / 2 + 12, w - 8, 12, 3); c.fill(); rr(c, -w / 2 + 5, h / 2 - 20, w - 10, 9, 3); c.fill(); c.fillStyle = 'rgba(255,255,255,.18)'; rr(c, -w / 2 + 6, -h / 2 + 26, w - 12, h - 50, 4); c.fill(); }
  c.fillStyle = '#fff6c0'; c.fillRect(-w / 2 + 3, -h / 2 + 1, 6, 3); c.fillRect(w / 2 - 9, -h / 2 + 1, 6, 3); c.fillStyle = '#d02020'; c.fillRect(-w / 2 + 3, h / 2 - 4, 6, 3); c.fillRect(w / 2 - 9, h / 2 - 4, 6, 3);
  if (o.stripe) { c.fillStyle = o.stripe; c.fillRect(-2, -h / 2 + 2, 4, h - 4); }
  if (o.light) { c.fillStyle = Math.floor(performance.now() / 150) % 2 ? '#ff2a2a' : '#2a6aff'; c.fillRect(-6, -4, 12, 5); }
  c.restore();
}
function bike(c, x, y, o) {
  const lean = o.lean || 0, up = o.dir !== -1;
  c.save(); c.translate(x, y); if (!up) c.rotate(Math.PI); c.rotate(lean);
  c.fillStyle = 'rgba(0,0,0,.3)'; rr(c, -5 + 4, -26 + 5, 10, 52, 5); c.fill();
  c.fillStyle = '#111'; rr(c, -3, -28, 6, 15, 3); c.fill(); rr(c, -3, 13, 6, 16, 3); c.fill();
  c.fillStyle = o.col; rr(c, -6, -14, 12, 30, 6); c.fill(); c.fillStyle = '#ffffff55'; rr(c, -2, -12, 4, 24, 2); c.fill();
  c.strokeStyle = '#999'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-13, -14); c.lineTo(13, -14); c.stroke();
  c.fillStyle = '#2a2f3a'; rr(c, -8, -4, 16, 18, 7); c.fill();
  c.fillStyle = o.helmet || '#f2c230'; c.beginPath(); c.arc(0, -6, 7, 0, 7); c.fill(); c.fillStyle = '#1b2a3a'; c.fillRect(-5, -11, 10, 4);
  c.fillStyle = '#fff6c0'; c.fillRect(-2, -29, 4, 3); c.fillStyle = '#d02020'; c.fillRect(-2, 27, 4, 3);
  c.restore();
}

function makeRoad(kind) {
  const isBike = kind === 'bike';
  return function make(lv) {
    const g = { score: 0, over: false, x: LANES[2], tx: LANES[2], spd: isBike ? LV(lv, 240, 290, 350) : LV(lv, 200, 250, 310), dist: 0, ob: [], off: 0, sp: 0.5, k: { l: 0, r: 0 }, t: 0,
      nitro: 0, shield: false, skid: 0, shake: 0, fx: [], trees: Array.from({ length: 12 }, (_, i) => ({ x: i % 2 ? R(4, 30) : R(330, 356), y: i * 44 })), coins: 0, near: 0, msg: 'Crash!' };
    const hw = isBike ? 9 : 17, hh = isBike ? 28 : 29, steer = isBike ? 420 : 320, cap = isBike ? 640 : 560;
    const free = ys => LANES.filter((_, i) => !ys.includes(i));
    const spawn = () => {
      const dens = LV(lv, 0.22, 0.34, 0.46) + (isBike ? 0.08 : 0);
      const lanes = [0, 1, 2, 3].sort(() => Math.random() - 0.5), n = 1 + (Math.random() < dens ? 1 : 0) + (Math.random() < dens * 0.4 ? 1 : 0), used = [];
      for (let k = 0; k < n && k < 3; k++) {
        const li = lanes[k], x = LANES[li], r = Math.random(); used.push(li);
        if (r < 0.52) { const big = Math.random() < 0.22, col = PAL[Math.floor(R(0, PAL.length))]; g.ob.push({ t: 'veh', x, y: -70, w: big ? 38 : 34, h: big ? 92 : 58, truck: big, col, v: g.spd * R(0.28, 0.5), dir: 1, stripe: Math.random() < 0.3 ? '#ffffffaa' : null, hw: big ? 19 : 17, hh: big ? 46 : 29, light: !big && Math.random() < 0.06 }); }
        else if (r < 0.64 && lv >= 1 && li === 0) g.ob.push({ t: 'veh', x, y: -70, w: 34, h: 58, col: PAL[Math.floor(R(0, PAL.length))], v: -g.spd * 0.55, dir: -1, hw: 17, hh: 29 });
        else if (r < 0.74) g.ob.push({ t: 'cone', x: x + R(-14, 14), y: -30, v: 0, hw: 9, hh: 10 });
        else if (r < 0.82) g.ob.push({ t: 'hole', x, y: -30, v: 0, hw: 15, hh: 12 });
        else if (r < 0.90) g.ob.push({ t: 'oil', x, y: -30, v: 0, hw: 22, hh: 20 });
        else g.ob.push({ t: 'barrier', x, y: -30, v: 0, hw: 30, hh: 9 });
      }
      const fl = free(used).filter(x => true);
      if (fl.length && Math.random() < 0.7) { const x = fl[Math.floor(R(0, fl.length))], r = Math.random(); g.ob.push({ t: r < 0.7 ? 'coin' : r < 0.86 ? 'nitro' : 'shield', x, y: -80 - R(0, 60), v: 0, hw: 15, hh: 15 }); }
      if (Math.random() < 0.55) { const x = fl.length ? fl[Math.floor(R(0, fl.length))] : LANES[Math.floor(R(0, 4))]; for (let k = 1; k <= 3; k++) g.ob.push({ t: 'coin', x, y: -100 - k * 38, v: 0, hw: 15, hh: 15 }); }
    };
    const pop = (x, y, txtS, col) => g.fx.push({ x, y, t: 0.9, s: txtS, col });
    g.update = dt => {
      g.t += dt; const nit = g.nitro > 0; g.nitro = Math.max(0, g.nitro - dt); g.skid = Math.max(0, g.skid - dt); g.shake = Math.max(0, g.shake - dt);
      g.spd = Math.min(cap, g.spd + dt * LV(lv, 6, 9, 13)); const sp = g.spd * (nit ? 1.4 : 1);
      g.dist += sp * dt; g.off = (g.off + sp * dt) % 60; g.score += sp * dt / (isBike ? 38 : 42);
      const kx = (g.k.r - g.k.l) * steer * dt; if (kx) g.tx = clamp(g.tx + kx, RX0 + hw + 4, RX1 - hw - 4);
      const follow = g.skid > 0 ? 3 : 13; g.x += (g.tx - g.x) * Math.min(1, dt * follow) + (g.skid > 0 ? Math.sin(g.t * 14) * 60 * dt : 0); g.x = clamp(g.x, RX0 + hw + 2, RX1 - hw - 2);
      g.sp -= dt; if (g.sp <= 0) { spawn(); g.sp = Math.max(0.35, R(0.7, 1.15) * 280 / sp); }
      g.trees.forEach(t => { t.y += sp * dt * 0.9; if (t.y > H + 30) { t.y = -30; t.x = Math.random() < 0.5 ? R(4, 30) : R(330, 356); } });
      for (const o of g.ob) {
        o.y += (sp - o.v) * dt; if (o.dead) continue;
        const near = Math.abs(o.x - g.x) < o.hw + hw && Math.abs(o.y - PY) < o.hh + hh;
        if (o.t === 'veh' && !o.passed && o.y > PY + o.hh + hh && Math.abs(o.x - g.x) < o.hw + hw + 18 && Math.abs(o.x - g.x) >= o.hw + hw) { o.passed = true; g.score += 5; g.near++; pop(g.x, PY - 50, 'Close! +5', '#ffe27a'); }
        if (!near) continue;
        if (o.t === 'coin') { o.dead = true; g.score += 10; g.coins++; pop(o.x, o.y, '+10', '#ffe27a'); sfx('coin'); }
        else if (o.t === 'nitro') { o.dead = true; g.nitro = 3.2; pop(o.x, o.y, 'NITRO!', '#7ee0ff'); sfx('good'); }
        else if (o.t === 'shield') { o.dead = true; g.shield = true; pop(o.x, o.y, 'SHIELD', '#9af0a0'); sfx('good'); }
        else if (o.t === 'cone') { o.dead = true; g.spd *= 0.85; g.shake = 0.2; pop(o.x, o.y, 'Bump', '#fff'); sfx('thud'); }
        else if (o.t === 'hole') { o.dead = true; g.spd *= 0.7; g.shake = 0.35; pop(o.x, o.y, 'Pothole!', '#ffb070'); sfx('thud'); }
        else if (o.t === 'oil') { if (!o.hit) { o.hit = true; g.skid = 1.4; pop(g.x, PY - 40, 'Slippery!', '#c9a0ff'); sfx('bad'); } }
        else if (nit && o.t === 'veh') { o.dead = true; g.score += 20; g.shake = 0.25; pop(o.x, o.y, 'SMASH +20', '#ff9a50'); sfx('pop'); }
        else if (g.shield) { g.shield = false; o.dead = true; g.shake = 0.3; pop(g.x, PY - 40, 'Shield saved you', '#9af0a0'); sfx('thud'); }
        else { g.over = true; g.shake = 0.5; sfx('bad'); }
      }
      g.ob = g.ob.filter(o => !o.dead && o.y < H + 100); g.fx = g.fx.filter(f => (f.t -= dt) > 0);
    };
    g.ptr = (t, x) => { if (t !== 'up') g.tx = clamp(x, RX0 + hw + 4, RX1 - hw - 4); };
    g.key = (k, d) => { if (k === 'ArrowLeft' || k === 'a') g.k.l = d ? 1 : 0; if (k === 'ArrowRight' || k === 'd') g.k.r = d ? 1 : 0; };
    g.draw = c => {
      c.save(); if (g.shake > 0) c.translate(R(-3, 3), R(-3, 3));
      c.fillStyle = '#3f8f3a'; c.fillRect(-10, -10, W + 20, H + 20); c.fillStyle = '#378636'; for (let i = 0; i < 10; i++) c.fillRect(((i * 97) % 40) , ((i * 53 + g.off * 0.3) % H), 30, 3);
      g.trees.forEach(t => { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(t.x + 3, t.y + 4, 12, 0, 7); c.fill(); c.fillStyle = '#2a7a34'; c.beginPath(); c.arc(t.x, t.y, 12, 0, 7); c.fill(); c.fillStyle = '#3a9a44'; c.beginPath(); c.arc(t.x - 3, t.y - 3, 6, 0, 7); c.fill(); });
      c.fillStyle = '#3c3c46'; c.fillRect(RX0, 0, RX1 - RX0, H); c.fillStyle = '#44444f'; c.fillRect(RX0 + 4, 0, RX1 - RX0 - 8, H);
      for (let y = -60; y < H; y += 30) { c.fillStyle = Math.floor((y + g.off) / 30) % 2 ? '#e84a4a' : '#fff'; c.fillRect(RX0 - 4, y + (g.off % 30), 4, 30); c.fillRect(RX1, y + (g.off % 30), 4, 30); }
      c.fillStyle = '#f2c230'; for (let l = 1; l < 4; l++) for (let y = -60; y < H; y += 60) { if (l === 1) { c.fillRect(RX0 + l * 70 - 1.5, y + g.off, 3, 28); c.fillRect(RX0 + l * 70 + 3, y + g.off, 3, 28); } else { c.fillStyle = '#e8e8e8'; c.fillRect(RX0 + l * 70 - 1.5, y + g.off, 3, 28); c.fillStyle = '#f2c230'; } }
      if (g.spd * (g.nitro > 0 ? 1.4 : 1) > 380) { c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1.5; for (let i = 0; i < 12; i++) { const x = RX0 + 10 + (i * 53) % 260, y = ((i * 91 + g.off * 4) % H); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 36); c.stroke(); } }
      for (const o of g.ob) {
        if (o.t === 'veh') car(c, o.x, o.y, o);
        else if (o.t === 'cone') { c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(o.x + 2, o.y + 3, 8, 5, 0, 0, 7); c.fill(); c.fillStyle = '#ef6a1f'; c.beginPath(); c.moveTo(o.x, o.y - 10); c.lineTo(o.x + 8, o.y + 8); c.lineTo(o.x - 8, o.y + 8); c.fill(); c.fillStyle = '#fff'; c.fillRect(o.x - 4, o.y - 2, 8, 3); }
        else if (o.t === 'hole') { c.fillStyle = '#17171c'; c.beginPath(); c.ellipse(o.x, o.y, 15, 11, 0, 0, 7); c.fill(); c.strokeStyle = '#555'; c.lineWidth = 1.5; c.stroke(); }
        else if (o.t === 'oil') { c.fillStyle = 'rgba(15,10,30,.85)'; c.beginPath(); c.ellipse(o.x, o.y, 24, 18, 0.3, 0, 7); c.fill(); c.fillStyle = 'rgba(160,110,255,.35)'; c.beginPath(); c.ellipse(o.x - 5, o.y - 4, 10, 6, 0.3, 0, 7); c.fill(); }
        else if (o.t === 'barrier') { for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#fff' : '#e84a4a'; c.fillRect(o.x - 30 + i * 12, o.y - 9, 12, 18); } c.strokeStyle = '#222'; c.lineWidth = 1.5; c.strokeRect(o.x - 30, o.y - 9, 60, 18); }
        else if (o.t === 'coin') { const w = Math.abs(Math.cos(g.t * 5 + o.y * 0.02)); c.fillStyle = '#f2c230'; c.beginPath(); c.ellipse(o.x, o.y, 11 * Math.max(0.25, w), 11, 0, 0, 7); c.fill(); c.strokeStyle = '#b98a10'; c.lineWidth = 2; c.stroke(); }
        else if (o.t === 'nitro') { c.fillStyle = '#1b5fd8'; c.beginPath(); c.arc(o.x, o.y, 16, 0, 7); c.fill(); c.strokeStyle = '#7ee0ff'; c.lineWidth = 3; c.stroke(); txt(c, '⚡', o.x, o.y + 1, 20, '#ffe27a', 'center'); }
        else if (o.t === 'shield') { c.fillStyle = '#1f8a3a'; c.beginPath(); c.arc(o.x, o.y, 16, 0, 7); c.fill(); c.strokeStyle = '#9af0a0'; c.lineWidth = 3; c.stroke(); txt(c, '🛡', o.x, o.y + 1, 18, '#fff', 'center'); }
      }
      if (g.nitro > 0) { for (let i = 0; i < 3; i++) { const fl = R(18, 40); c.fillStyle = i ? '#ffd24a' : '#ff6a2a'; c.beginPath(); c.moveTo(g.x - 6 + (isBike ? 3 : i * 6 - 6), PY + hh); c.lineTo(g.x + 6 + (isBike ? -3 : i * 6 - 6), PY + hh); c.lineTo(g.x + (isBike ? 0 : i * 6 - 6), PY + hh + fl); c.fill(); } }
      const lean = clamp((g.tx - g.x) / 60, -1, 1) * (isBike ? 0.45 : 0.12);
      if (g.shield) { c.strokeStyle = 'rgba(154,240,160,.85)'; c.lineWidth = 3; c.beginPath(); c.arc(g.x, PY, isBike ? 34 : 42, 0, 7); c.stroke(); }
      if (isBike) bike(c, g.x, PY, { col: '#d8352a', lean, helmet: '#f2c230' }); else car(c, g.x, PY, { col: '#d8352a', stripe: '#ffffffcc', tilt: lean, w: 34, h: 58 });
      g.fx.forEach(f => txt(c, f.s, f.x, f.y - (0.9 - f.t) * 30, 15, f.col, 'center'));
      c.restore();
      hud(c, 'Score ' + Math.round(g.score), Math.round(g.spd * (g.nitro > 0 ? 1.4 : 1) / 3) + ' km/h' + (g.shield ? ' 🛡' : '') + (g.nitro > 0 ? ' ⚡' : ''));
    };
    return g;
  };
}
register({ id: 'racing', name: 'Street Racer', icon: '🏎️', tag: 'Race up the road, dodge the traffic and grab the boosters.', goal: 'drive as far as you can without crashing.', how: 'Your car drives up the screen. Steer with the left and right arrow keys, or drag across the screen. Dodge the cars, trucks, barriers and oil. Grab coins, ⚡ nitro (smash through traffic) and 🛡 shields. One crash ends the race.', par: 300, make: makeRoad('car') });
register({ id: 'bike', name: 'Moto Rider', icon: '🏍️', tag: 'Weave a motorbike through traffic. Faster, tighter, riskier.', goal: 'ride as far as you can without crashing.', how: 'Your bike rides up the screen. Lean left and right with the arrow keys, or drag across the screen. Squeeze through gaps in the traffic, dodge oil and potholes, and pick up coins, ⚡ nitro and 🛡 shields. Close passes score bonus points.', par: 330, make: makeRoad('bike') });
})();
