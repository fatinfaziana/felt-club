/* ---------- Arcade engine + games (canvas, keyboard + touch) ---------- */
const Arc = (function () {
const W = 360, H = 480, ANTE = 20;
const R = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const LV = (lv, a, b, c) => [a, b, c][lv == null ? 1 : lv];
const FONT = 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
function emo(c, ch, x, y, size, rot) { c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.font = `${size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 0, 0); c.restore(); }
function txt(c, s, x, y, size, col, al) { c.font = `800 ${size}px ${FONT}`; c.textAlign = al || 'left'; c.textBaseline = 'middle'; c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function hud(c, left, right) { c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, 0, W, 26); txt(c, left, 8, 14, 15, '#ffe27a'); txt(c, right || '', W - 8, 14, 15, '#fff', 'right'); }
const sfx = n => { try { Snd.p(n); } catch (e) {} };

function run(cv, make, lv, onEnd) {
  cv.width = W * 2; cv.height = H * 2;
  const c = cv.getContext('2d'); c.scale(2, 2);
  const g = make(lv); let last = performance.now(), raf = 0, alive = true, ended = false, down = false;
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  const pd = e => { e.preventDefault(); down = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} const [x, y] = pt(e); g.ptr && g.ptr('down', x, y); };
  const pm = e => { if (!down && e.pointerType === 'touch') return; const [x, y] = pt(e); g.ptr && g.ptr('move', x, y); };
  const pu = e => { down = false; const [x, y] = pt(e); g.ptr && g.ptr('up', x, y); };
  const kd = e => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault(); if (!e.repeat) g.key && g.key(e.key, true); };
  const ku = e => g.key && g.key(e.key, false);
  cv.addEventListener('pointerdown', pd); cv.addEventListener('pointermove', pm); cv.addEventListener('pointerup', pu); cv.addEventListener('pointercancel', pu);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  const loop = now => {
    if (!alive) return; const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!g.over) g.update(dt); g.draw(c);
    if (g.over) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0, 170, W, 120); txt(c, g.msg || 'Game over', W / 2, 205, 30, '#fff', 'center'); txt(c, 'Score ' + Math.round(g.score), W / 2, 250, 24, '#ffe27a', 'center'); }
    if (g.over && !ended) { ended = true; sfx(g.win ? 'win' : 'end'); setTimeout(() => { if (alive) onEnd(Math.round(g.score)); }, 1500); }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => { alive = false; cancelAnimationFrame(raf); cv.removeEventListener('pointerdown', pd); cv.removeEventListener('pointermove', pm); cv.removeEventListener('pointerup', pu); cv.removeEventListener('pointercancel', pu); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
}

// ---------- the multiplayer wrapper: everyone plays in turn, best score wins ----------
function register(def) {
  async function round(G, io) {
    const P = G.players, n = P.length, lv = G.level == null ? 1 : G.level;
    const A = G.ar = { sc: P.map(() => null), turn: (G.round - 1) % n, order: 0, over: false, winner: -1, lv };
    io.render(); await io.sleep(400);
    for (let k = 0; k < n; k++) {
      const i = (A.turn + k) % n; A.turn = i; io.render();
      const a = await io.turn(P[i], { lv }, { auto: { t: 'done', score: 0 }, timeout: (def.limit || 240) * 1000,
        validate: x => (x && x.t === 'done' && Number.isFinite(x.score) ? { t: 'done', score: clamp(Math.round(x.score), 0, 99999) } : null),
        bot: () => ({ t: 'done', score: Math.round(def.par * LV(lv, 0.55, 0.9, 1.25) * R(0.7, 1.3)) }), think: 2200 + Math.random() * 1500 });
      A.sc[i] = a.score; io.ev(P[i], `scores ${a.score}`, `score ${a.score}`); io.render(); await io.sleep(500);
    }
    let best = -1, bs = -1, tie = false; A.sc.forEach((s, i) => { if (s > bs) { bs = s; best = i; tie = false; } else if (s === bs) tie = true; });
    A.over = true; A.winner = tie && n > 1 ? -1 : best; A.turn = -1;
    settlePot(G, ANTE, A.winner >= 0 ? [A.winner] : (n > 1 ? A.sc.map((s, i) => (s === bs ? i : -1)).filter(i => i >= 0) : [])); potSummary(G);
    io.line(`Best score: ${bs}.`, true); io.render();
  }
  function view(G) {
    const A = G.ar;
    if (!A || A.sc.length !== G.players.length) return { sc: G.players.map(() => null), turn: -1, over: false, winner: -1, lv: 1, delta: [] };
    return { sc: A.sc, turn: A.over ? -1 : A.turn, over: A.over, winner: A.winner, lv: A.lv, delta: G.players.map(p => (A.over ? p.delta || 0 : 0)) };
  }
  let S0 = null, stop = null, running = false, seq = -1;
  const ui = {
    mount(stage, ctl) {
      if (stop) stop(); stop = null; running = false; seq = -1;
      stage.innerHTML = `<section class="table arwrap"><div class="bt-opps" id="arSeats"></div><div class="arbox"><canvas id="arCv" class="arcv" aria-label="${esc(def.name)} game screen"></canvas><div class="arover" id="arOver"></div></div><div class="banner" id="arBanner" aria-live="polite"></div></section>`;
      ctl.innerHTML = '';
      $('arOver').onclick = () => start();
    },
    update(S) {
      S0 = S; const g = S.V.g;
      $('arSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Playing…', extra: i => (g.sc[i] == null ? 'Waiting' : 'Score ' + g.sc[i]) });
      $('arBanner').innerHTML = g.over && S.V.summary.length ? `<span>${g.winner >= 0 ? S.text(S.V.summary.find(e => e.p === g.winner) || S.V.summary[0]) : 'A tie. Everyone keeps their chips.'}</span>` : '';
      const ov = $('arOver');
      if (S.turn && !running) { ov.hidden = false; ov.innerHTML = `<div class="arcard"><div class="arbig">${def.icon}</div><b>${esc(def.name)}</b><p>${def.how}</p><button type="button" class="b gold">Start</button><small>Press Enter or tap Start</small></div>`; if (seq !== S.turn.seq) { seq = S.turn.seq; } }
      else if (!S.turn && !running) { ov.hidden = false; ov.innerHTML = g.over ? '' : `<div class="arcard"><div class="arbig">${def.icon}</div><p>${g.turn >= 0 ? esc(S.nameOf(g.turn)) + ' is playing…' : ''}</p></div>`; if (g.over) ov.hidden = true; }
      if (running && !S.turn) { if (stop) stop(); stop = null; running = false; }
      return '';
    },
  };
  function start() {
    if (!S0 || !S0.turn || running) return; running = true; $('arOver').hidden = true;
    const my = S0.turn.seq;
    stop = run($('arCv'), def.make, S0.V.g.lv, score => { running = false; if (stop) stop(); stop = null; if (S0 && S0.turn && S0.turn.seq === my) S0.send({ t: 'done', score }); });
  }
  window.addEventListener('keydown', e => { if (e.key === 'Enter' && S0 && S0.turn && !running && $('arOver') && !$('arOver').hidden && document.activeElement && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); start(); } });
  Club.register({
    id: def.id, cat: def.cat || 'arcade', name: def.name, tag: def.tag, min: 1, max: 6, soloBots: 2, roundWord: 'Game', levels: true,
    art: () => `<div class="ltile big">${def.icon}</div>`,
    rules: `<p><b>Goal:</b> ${def.goal}</p><ol><li>${def.how}</li><li>Everyone plays one go, one after another. The highest score wins.</li><li>Pick <b>Easy, Medium or Hard</b> on the game page before you start.</li><li>Each player puts in ${ANTE} chips and the best score takes the pot.</li></ol>`,
    round, view, ui, _test: { make: def.make },
  });
}
return { W, H, R, clamp, LV, emo, txt, hud, sfx, register };
})();

(function () {
const { W, H, R, clamp, LV, emo, txt, hud, sfx, register } = Arc;

// ============ Hit the Mice (Whack-a-Mole) ============
register({ id: 'whack', name: 'Hit the Mice', icon: '🐭', tag: 'Whack the mice as they pop up. Do not hit the cats.', goal: 'hit as many mice as you can in 30 seconds.', how: 'Tap or click a mouse the moment it pops up. Hitting a cat costs you points.', par: 170,
  make(lv) {
    const g = { score: 0, over: false, t: 30, holes: Array.from({ length: 12 }, () => ({ up: 0, k: 0, hit: 0 })), sp: 0, msg: 'Time!' };
    const cell = i => [60 + (i % 3) * 120, 120 + Math.floor(i / 3) * 90];
    g.update = dt => {
      g.t -= dt; if (g.t <= 0) { g.over = true; return; }
      g.sp -= dt; if (g.sp <= 0) { g.sp = LV(lv, 0.75, 0.5, 0.32) * R(0.6, 1.2); const h = g.holes[Math.floor(Math.random() * 12)]; if (!h.up && !h.hit) { h.up = LV(lv, 1.3, 0.95, 0.65); h.k = Math.random() < 0.18 ? 1 : 0; } }
      g.holes.forEach(h => { if (h.up > 0) h.up -= dt; if (h.hit > 0) h.hit -= dt; });
    };
    g.ptr = (t, x, y) => { if (t !== 'down') return; g.holes.forEach((h, i) => { const [cx, cy] = cell(i); if (h.up > 0 && Math.hypot(x - cx, y - cy + 14) < 38) { h.up = 0; h.hit = 0.4; if (h.k) { g.score = Math.max(0, g.score - 15); sfx('bad'); } else { g.score += 10; sfx('pop'); } } }); };
    g.draw = c => {
      c.fillStyle = '#5aa84a'; c.fillRect(0, 0, W, H); c.fillStyle = '#4a9040'; for (let i = 0; i < 30; i++) c.fillRect((i * 53) % W, 40 + (i * 97) % 440, 14, 4);
      g.holes.forEach((h, i) => { const [cx, cy] = cell(i); c.fillStyle = '#2b1a0d'; c.beginPath(); c.ellipse(cx, cy + 20, 40, 16, 0, 0, 7); c.fill();
        if (h.up > 0 || h.hit > 0) { const k = h.hit > 0 ? 0.6 : Math.min(1, (h.up) * 6, 1); emo(c, h.hit > 0 ? '💥' : h.k ? '🐱' : '🐭', cx, cy + 20 - 34 * k, 52); }
        c.fillStyle = '#7a4a22'; c.beginPath(); c.ellipse(cx, cy + 24, 42, 12, 0, 0, Math.PI); c.fill(); });
      hud(c, 'Score ' + g.score, 'Time ' + Math.ceil(g.t));
    };
    return g;
  } });

// ============ Zombie Hunt ============
register({ id: 'zombies', name: 'Zombie Hunt', icon: '🧟', tag: 'Shoot the zombies before they reach your house.', goal: 'survive and shoot as many zombies as you can.', how: 'Tap or click a zombie to shoot it. Big zombies take two shots. Do not let five reach the house.', par: 220,
  make(lv) {
    const g = { score: 0, over: false, z: [], lives: 5, t: 0, sp: 0.5, fl: [], msg: 'The house fell' };
    g.update = dt => {
      g.t += dt; g.sp -= dt;
      if (g.sp <= 0) { g.sp = Math.max(0.3, LV(lv, 1.1, 0.8, 0.55) - g.t * 0.008) * R(0.6, 1.3); const big = Math.random() < 0.2; g.z.push({ x: R(30, W - 30), y: 40, hp: big ? 2 : 1, big, sp: R(28, 44) * LV(lv, 0.7, 1, 1.35) * (big ? 0.7 : 1) + g.t * 0.35, wob: R(0, 6) }); }
      g.z.forEach(z => { z.y += z.sp * dt; z.x += Math.sin(g.t * 2 + z.wob) * 14 * dt; if (z.y > H - 70) { z.dead = true; g.lives--; sfx('bad'); } });
      g.z = g.z.filter(z => !z.dead); g.fl = g.fl.filter(f => (f.t -= dt) > 0);
      if (g.lives <= 0) g.over = true;
    };
    g.ptr = (t, x, y) => { if (t !== 'down') return; sfx('clack'); g.fl.push({ x, y, t: 0.15 }); let best = null, bd = 40; g.z.forEach(z => { const d = Math.hypot(x - z.x, y - z.y); if (d < bd) { bd = d; best = z; } });
      if (best) { best.hp--; best.hit = 0.15; if (best.hp <= 0) { best.dead = true; g.score += best.big ? 30 : 10; sfx('pop'); g.fl.push({ x: best.x, y: best.y, t: 0.4, boom: 1 }); } } };
    g.draw = c => {
      c.fillStyle = '#2b3a2a'; c.fillRect(0, 0, W, H); c.fillStyle = '#1f2b1e'; for (let i = 0; i < 40; i++) c.fillRect((i * 71) % W, 30 + (i * 53) % 400, 10, 3);
      c.fillStyle = '#3d2f26'; c.fillRect(0, H - 70, W, 70); emo(c, '🏠', 60, H - 40, 50); emo(c, '🏠', 180, H - 40, 50); emo(c, '🏠', 300, H - 40, 50);
      g.z.slice().sort((a, b) => a.y - b.y).forEach(z => emo(c, '🧟', z.x, z.y, z.big ? 64 : 44, Math.sin(g.t * 6 + z.wob) * 0.15));
      g.fl.forEach(f => { if (f.boom) emo(c, '💥', f.x, f.y, 40); else { c.strokeStyle = '#ffe27a'; c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, 14, 0, 7); c.moveTo(f.x - 20, f.y); c.lineTo(f.x + 20, f.y); c.moveTo(f.x, f.y - 20); c.lineTo(f.x, f.y + 20); c.stroke(); } });
      hud(c, 'Score ' + g.score, '❤️'.repeat(Math.max(0, g.lives)));
    };
    return g;
  } });

// ============ Dance Floor ============
register({ id: 'dance', name: 'Dance Floor', icon: '💃', tag: 'Hit the arrows in time with the beat.', goal: 'step on every arrow as it reaches the line.', how: 'When an arrow reaches the glowing line, press the same arrow key (or tap its column). Perfect timing scores most.', par: 520,
  make(lv) {
    const sp = LV(lv, 170, 230, 300), g = { score: 0, over: false, t: 0, notes: [], combo: 0, best: 0, fb: '', fbT: 0, press: [0, 0, 0, 0], msg: 'Song over' }, ly = H - 90, gap = LV(lv, 0.75, 0.55, 0.4);
    let tt = 1.6; for (let k = 0; k < 44; k++) { g.notes.push({ l: Math.floor(R(0, 4)), time: tt, done: 0 }); tt += gap * (Math.random() < 0.25 ? 0.5 : 1) + (k % 8 === 7 ? 0.5 : 0); }
    const end = tt + 2.2;
    const hit = l => { g.press[l] = 0.15; let best = null; g.notes.forEach(n => { if (n.l === l && !n.done && (!best || Math.abs(n.time - g.t) < Math.abs(best.time - g.t))) best = n; });
      if (best && Math.abs(best.time - g.t) < 0.2) { const d = Math.abs(best.time - g.t); best.done = 1; g.combo++; g.best = Math.max(g.best, g.combo); const perfect = d < 0.07; g.score += (perfect ? 30 : 15) + Math.min(g.combo, 20); g.fb = perfect ? 'PERFECT!' : 'Good'; g.fbT = 0.6; sfx(perfect ? 'good' : 'tap'); } else { g.combo = 0; g.score = Math.max(0, g.score - 8); g.fb = 'Miss'; g.fbT = 0.4; sfx('bad'); } };
    g.update = dt => { g.t += dt; g.fbT -= dt; g.press = g.press.map(v => Math.max(0, v - dt)); g.notes.forEach(n => { if (!n.done && g.t - n.time > 0.2) { n.done = -1; g.combo = 0; g.fb = 'Miss'; g.fbT = 0.4; } }); if (g.t > end) g.over = true; };
    const KM = { ArrowLeft: 0, a: 0, ArrowDown: 1, s: 1, ArrowUp: 2, w: 2, ArrowRight: 3, d: 3 };
    g.key = (k, d) => { if (d && k in KM) hit(KM[k]); };
    g.ptr = (t, x) => { if (t === 'down') hit(clamp(Math.floor(x / (W / 4)), 0, 3)); };
    g.draw = c => {
      const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a1245'); bg.addColorStop(1, '#5a1a6a'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 4; i++) { c.fillStyle = `hsla(${(g.t * 60 + i * 90) % 360},80%,55%,${0.1 + g.press[i] * 2})`; c.fillRect(i * 90, 26, 90, H); }
      c.strokeStyle = '#fff3'; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(i * 90, 26); c.lineTo(i * 90, H); c.stroke(); }
      c.strokeStyle = '#ffe27a'; c.lineWidth = 3; c.shadowColor = '#ffe27a'; c.shadowBlur = 12; c.beginPath(); c.moveTo(0, ly); c.lineTo(W, ly); c.stroke(); c.shadowBlur = 0;
      const AR = ['⬅️', '⬇️', '⬆️', '➡️'];
      for (let i = 0; i < 4; i++) emo(c, AR[i], i * 90 + 45, ly, 40 + g.press[i] * 60);
      g.notes.forEach(n => { if (n.done === 1) return; const y = ly - (n.time - g.t) * sp; if (y > 20 && y < H + 30) { c.globalAlpha = n.done === -1 ? 0.3 : 1; emo(c, AR[n.l], n.l * 90 + 45, y, 44); c.globalAlpha = 1; } });
      emo(c, g.t % 0.8 < 0.4 ? '💃' : '🕺', W / 2, 62, 40);
      if (g.fbT > 0) txt(c, g.fb, W / 2, H / 2, 32, g.fb === 'Miss' ? '#ff9a90' : '#9af0a0', 'center');
      hud(c, 'Score ' + g.score, 'Combo ' + g.combo);
    };
    return g;
  } });

// ============ Space Ships (Space Invaders) ============
register({ id: 'invaders', name: 'Space Ships', icon: '🚀', tag: 'Defend Earth from the alien fleet.', goal: 'shoot down the aliens before they land.', how: 'Move with the left and right arrow keys and fire with the space bar, or drag on the screen (your ship fires by itself). Dodge their shots.', par: 260,
  make(lv) {
    const g = { score: 0, over: false, x: W / 2, lives: 3, bullets: [], eb: [], aliens: [], dir: 1, wave: 0, cd: 0, k: { l: 0, r: 0, f: 0 }, t: 0, inv: 0, auto: false, msg: 'Earth is lost' };
    const spawn = () => { g.aliens = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) g.aliens.push({ x: 38 + c * 44, y: 60 + r * 38, e: ['👾', '👽', '🛸', '👾'][r] }); g.dir = 1; g.wave++; };
    spawn();
    g.update = dt => {
      g.t += dt; g.cd -= dt; g.inv -= dt;
      g.x = clamp(g.x + (g.k.r - g.k.l) * 260 * dt, 20, W - 20);
      if ((g.k.f || g.auto) && g.cd <= 0) { g.bullets.push({ x: g.x, y: H - 60 }); g.cd = 0.34; sfx('tap'); }
      g.bullets.forEach(b => b.y -= 420 * dt); g.bullets = g.bullets.filter(b => b.y > 20);
      const sp = (LV(lv, 22, 32, 44) + g.wave * 5 + (28 - g.aliens.length) * 1.8) * dt; let edge = false;
      g.aliens.forEach(a => { a.x += g.dir * sp; if (a.x < 18 || a.x > W - 18) edge = true; });
      if (edge) { g.dir = -g.dir; g.aliens.forEach(a => a.y += 14); }
      if (Math.random() < dt * (LV(lv, 0.8, 1.3, 1.9) + g.wave * 0.2) && g.aliens.length) { const a = g.aliens[Math.floor(Math.random() * g.aliens.length)]; g.eb.push({ x: a.x, y: a.y + 14 }); }
      g.eb.forEach(b => b.y += 170 * dt); g.eb = g.eb.filter(b => b.y < H);
      g.bullets.forEach(b => g.aliens.forEach(a => { if (!b.dead && !a.dead && Math.abs(a.x - b.x) < 16 && Math.abs(a.y - b.y) < 16) { a.dead = b.dead = true; g.score += 10; sfx('pop'); } }));
      g.aliens = g.aliens.filter(a => !a.dead); g.bullets = g.bullets.filter(b => !b.dead);
      if (g.inv <= 0) g.eb.forEach(b => { if (!b.dead && Math.abs(b.x - g.x) < 18 && Math.abs(b.y - (H - 44)) < 18) { b.dead = true; g.lives--; g.inv = 1.4; sfx('bad'); } });
      g.eb = g.eb.filter(b => !b.dead);
      if (!g.aliens.length) { g.score += 50; spawn(); sfx('good'); }
      if (g.lives <= 0 || g.aliens.some(a => a.y > H - 80)) g.over = true;
    };
    g.key = (k, d) => { if (k === 'ArrowLeft' || k === 'a') g.k.l = d ? 1 : 0; if (k === 'ArrowRight' || k === 'd') g.k.r = d ? 1 : 0; if (k === ' ' || k === 'ArrowUp') g.k.f = d ? 1 : 0; };
    g.ptr = (t, x) => { if (t !== 'up') { g.x = clamp(x, 20, W - 20); g.auto = true; } };
    g.draw = c => {
      c.fillStyle = '#080a1c'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; for (let i = 0; i < 50; i++) c.fillRect((i * 67) % W, (i * 131 + g.t * 14) % H, 2, 2);
      g.aliens.forEach(a => emo(c, a.e, a.x, a.y + Math.sin(g.t * 4 + a.x) * 2, 30));
      c.fillStyle = '#7af'; g.bullets.forEach(b => c.fillRect(b.x - 2, b.y - 8, 4, 14)); c.fillStyle = '#f66'; g.eb.forEach(b => c.fillRect(b.x - 2, b.y - 6, 4, 12));
      if (g.inv <= 0 || Math.floor(g.t * 10) % 2) emo(c, '🚀', g.x, H - 44, 38);
      hud(c, 'Score ' + g.score + '  Wave ' + g.wave, '🚀'.repeat(Math.max(0, g.lives)));
    };
    return g;
  } });

// ============ Pac-Man ============
const MAZE = ['###############', '#o.....#.....o#', '#.###.#.#.###.#', '#.............#', '#.###.###.###.#', '#.....#.#.....#', '####.##.##.####', '#......G......#', '#.####.#.####.#', '#.............#', '#.###.###.###.#', '#o..#.....#..o#', '###.#.#.#.#.###', '#.............#', '#.###.###.###.#', '#.............#', '#.#.#######.#.#', '#o...........o#', '###############'];
register({ id: 'pacman', name: 'Pac-Man', icon: '🟡', tag: 'Eat every dot and escape the ghosts.', goal: 'eat all the dots without getting caught.', how: 'Steer with the arrow keys, or swipe in a direction. Eat a big pellet to turn the ghosts blue and catch them.', par: 700,
  make(lv) {
    const TS = 24, OY = 28, COLS = 15, ROWS = 19, g = { score: 0, over: false, lives: 3, t: 0, fr: 0, msg: 'Game over' };
    const grid = MAZE.map(r => r.split('')); let dots = 0; grid.forEach(r => r.forEach(ch => { if (ch === '.' || ch === 'o') dots++; })); const wall = (x, y) => y < 0 || y >= ROWS || x < 0 || x >= COLS || grid[y][x] === '#';
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const mk = (x, y, v) => ({ x, y, px: x, py: y, d: [0, 0], p: 0, v, nd: null, fx: x, fy: y });
    let pac, gh; const reset = () => { pac = mk(7, 13, 5.6); pac.d = [-1, 0]; gh = [0, 1, 2, 3].map(i => { const q = mk(5 + i * 1.3 | 0, 7, LV(lv, 3.6, 4.6, 5.4)); q.x = [5, 7, 9, 7][i]; q.y = i === 3 ? 9 : 7; q.px = q.x; q.py = q.y; q.d = [i % 2 ? 1 : -1, 0]; q.i = i; q.home = [q.x, q.y]; q.wait = i * 1.2; return q; }); g.fr = 0; };
    reset(); grid[7][7] = '.'; dots++;
    const step = (e, chooser, dt) => {
      let m = e.v * dt;
      while (m > 0) {
        if (e.p === 0) { const nd = chooser(e); if (nd) { e.d = nd; } if (!e.d || wall(e.x + e.d[0], e.y + e.d[1]) || (e.d[0] === 0 && e.d[1] === 0)) { e.d = [0, 0]; break; } }
        const left = 1 - e.p, s = Math.min(left, m); e.p += s; m -= s;
        if (e.p >= 1 - 1e-9) { e.x += e.d[0]; e.y += e.d[1]; e.p = 0; if (e.arrive) e.arrive(e); }
      }
      e.px = e.x + e.d[0] * e.p; e.py = e.y + e.d[1] * e.p;
    };
    pac.arrive = e => { const ch = grid[e.y][e.x]; if (ch === '.') { grid[e.y][e.x] = ' '; g.score += 10; dots--; sfx('tap'); } else if (ch === 'o') { grid[e.y][e.x] = ' '; g.score += 50; dots--; g.fr = LV(lv, 8, 6, 4.5); sfx('good'); } };
    const pacChoose = e => { if (e.nd && !wall(e.x + e.nd[0], e.y + e.nd[1])) { const d = e.nd; e.nd = null; return d; } if (e.p === 0 && wall(e.x + e.d[0], e.y + e.d[1])) return [0, 0]; return null; };
    const ghChoose = q => { const opts = DIRS.filter(d => !wall(q.x + d[0], q.y + d[1]) && !(d[0] === -q.d[0] && d[1] === -q.d[1])); if (!opts.length) return [-q.d[0], -q.d[1]];
      const chase = !q.eaten && g.fr <= 0 && Math.random() < LV(lv, 0.45, 0.7, 0.9) * (q.i === 3 ? 0.6 : 1); if (q.eaten) { const tgt = q.home; opts.sort((a, b) => Math.hypot(q.x + a[0] - tgt[0], q.y + a[1] - tgt[1]) - Math.hypot(q.x + b[0] - tgt[0], q.y + b[1] - tgt[1])); return opts[0]; }
      if (chase) { opts.sort((a, b) => Math.hypot(q.x + a[0] - pac.x, q.y + a[1] - pac.y) - Math.hypot(q.x + b[0] - pac.x, q.y + b[1] - pac.y)); return opts[0]; }
      return opts[Math.floor(Math.random() * opts.length)]; };
    g.update = dt => {
      g.t += dt; g.fr -= dt; step(pac, pacChoose, dt);
      gh.forEach(q => { q.wait -= dt; if (q.wait > 0) return; q.v = q.eaten ? 9 : g.fr > 0 ? 3 : LV(lv, 3.6, 4.6, 5.4); step(q, ghChoose, dt); if (q.eaten && q.x === q.home[0] && q.y === q.home[1] && q.p === 0) q.eaten = false; });
      gh.forEach(q => { if (q.wait > 0 || q.eaten) return; if (Math.hypot(q.px - pac.px, q.py - pac.py) < 0.6) { if (g.fr > 0) { q.eaten = true; g.score += 200; sfx('coin'); } else { g.lives--; sfx('bad'); if (g.lives <= 0) { g.over = true; } else reset(); } } });
      if (dots <= 0) { g.score += 500; g.over = true; g.win = true; g.msg = 'Cleared!'; }
    };
    const setD = d => { pac.nd = d; if (pac.p === 0 && !wall(pac.x + d[0], pac.y + d[1])) { pac.d = d; pac.nd = null; } else if (pac.p > 0 && d[0] === -pac.d[0] && d[1] === -pac.d[1]) { pac.x += pac.d[0]; pac.y += pac.d[1]; pac.d = d; pac.p = 1 - pac.p; pac.nd = null; } };
    g.key = (k, d) => { if (!d) return; const m = { ArrowRight: [1, 0], d: [1, 0], ArrowLeft: [-1, 0], a: [-1, 0], ArrowDown: [0, 1], s: [0, 1], ArrowUp: [0, -1], w: [0, -1] }[k]; if (m) setD(m); };
    let sx = 0, sy = 0;
    g.ptr = (t, x, y) => { if (t === 'down') { sx = x; sy = y; } else if (t === 'move' || t === 'up') { const dx = x - sx, dy = y - sy; if (Math.hypot(dx, dy) > 18) { setD(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]); sx = x; sy = y; } } };
    g.draw = c => {
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const ch = grid[y][x], X = x * TS, Y = OY + y * TS;
        if (ch === '#') { c.fillStyle = '#1f3fbf'; c.fillRect(X + 1, Y + 1, TS - 2, TS - 2); c.fillStyle = '#0a1670'; c.fillRect(X + 5, Y + 5, TS - 10, TS - 10); }
        else if (ch === '.') { c.fillStyle = '#ffd9a0'; c.fillRect(X + TS / 2 - 2, Y + TS / 2 - 2, 4, 4); }
        else if (ch === 'o') { c.fillStyle = '#ffe9c0'; c.beginPath(); c.arc(X + TS / 2, Y + TS / 2, 5 + Math.sin(g.t * 8) * 1.2, 0, 7); c.fill(); } }
      const ang = Math.atan2(pac.d[1], pac.d[0]), mo = 0.15 + Math.abs(Math.sin(g.t * 14)) * 0.5; c.fillStyle = '#ffd800'; c.beginPath(); c.moveTo(pac.px * TS + TS / 2, OY + pac.py * TS + TS / 2); c.arc(pac.px * TS + TS / 2, OY + pac.py * TS + TS / 2, TS * 0.42, ang + mo, ang + Math.PI * 2 - mo); c.closePath(); c.fill();
      const GC = ['#ff3b3b', '#ffb8f0', '#3bd6ff', '#ffa83b'];
      gh.forEach(q => { const X = q.px * TS + TS / 2, Y = OY + q.py * TS + TS / 2; const scared = g.fr > 0 && !q.eaten, flash = scared && g.fr < 2 && Math.floor(g.t * 6) % 2;
        if (!q.eaten) { c.fillStyle = scared ? (flash ? '#fff' : '#2b3fff') : GC[q.i]; c.beginPath(); c.arc(X, Y - 2, TS * 0.4, Math.PI, 0); c.lineTo(X + TS * 0.4, Y + TS * 0.38); for (let k = 0; k < 4; k++) c.lineTo(X + TS * 0.4 - (k + 0.5) * TS * 0.2, Y + TS * (k % 2 ? 0.38 : 0.28)); c.lineTo(X - TS * 0.4, Y + TS * 0.38); c.closePath(); c.fill(); }
        c.fillStyle = '#fff'; c.beginPath(); c.arc(X - 4, Y - 4, 3.2, 0, 7); c.arc(X + 4, Y - 4, 3.2, 0, 7); c.fill(); c.fillStyle = '#123'; c.beginPath(); c.arc(X - 4 + q.d[0] * 1.5, Y - 4 + q.d[1] * 1.5, 1.6, 0, 7); c.arc(X + 4 + q.d[0] * 1.5, Y - 4 + q.d[1] * 1.5, 1.6, 0, 7); c.fill(); });
      hud(c, 'Score ' + g.score, '🟡'.repeat(Math.max(0, g.lives)));
    };
    return g;
  } });
})();
