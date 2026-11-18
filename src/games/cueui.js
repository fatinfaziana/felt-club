/* ---------- Pool and Carrom screens: one smooth canvas each (60 fps playback, drag-to-shoot, real impact sounds) ---------- */
(() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
  const BCOL = ['#f4f1e8', '#f2c230', '#2b5fd6', '#d63b2b', '#7a3fb8', '#ec7a1f', '#2e9b4a', '#8a2a2a', '#16161c'];
  const colOf = id => (id === 0 ? BCOL[0] : id === 8 ? BCOL[8] : BCOL[id > 8 ? id - 8 : id]);
  const FPS = 15;                                   // recorded frames per second of play; we interpolate between them at the screen rate

  /* ---- find the sounds hidden in a recorded shot: ball hits, cushion/wall knocks, pockets ---- */
  function analyze(frames, n, rad, W, H) {
    const ev = [];
    for (let f = 1; f < frames.length; f++) {
      let hit = 0, wall = 0, pocket = 0;
      for (let i = 0; i < n; i++) {
        const a = frames[f][2 * i], p = frames[f - 1][2 * i];
        if (p >= 0 && a < 0) { pocket++; continue; }
        if (a < 0 || f < 2 || frames[f - 2][2 * i] < 0) continue;
        const x2 = frames[f][2 * i] / 10, y2 = frames[f][2 * i + 1] / 10, x1 = frames[f - 1][2 * i] / 10, y1 = frames[f - 1][2 * i + 1] / 10, x0 = frames[f - 2][2 * i] / 10, y0 = frames[f - 2][2 * i + 1] / 10;
        const vx1 = x1 - x0, vy1 = y1 - y0, vx2 = x2 - x1, vy2 = y2 - y1, dv = Math.hypot(vx2 - vx1, vy2 - vy1);
        if (dv < 0.7) continue;
        const r = rad(i), nearWall = x1 < r + 1.6 || x1 > W - r - 1.6 || y1 < r + 1.6 || y1 > H - r - 1.6;
        const flip = (vx1 * vx2 < 0 && (x1 < r + 1.6 || x1 > W - r - 1.6)) || (vy1 * vy2 < 0 && (y1 < r + 1.6 || y1 > H - r - 1.6));
        if (nearWall && flip) wall = Math.max(wall, dv); else hit = Math.max(hit, dv);
      }
      const t = f / FPS;
      if (hit) ev.push({ t, k: 'hit', v: clamp(hit / 7, 0.18, 1) }); if (wall) ev.push({ t: t + 0.004, k: 'wall', v: clamp(wall / 7, 0.15, 1) }); if (pocket) ev.push({ t: t + 0.03, k: 'pocket', v: 0.8 });
    }
    return ev;
  }

  /* ---- shared plumbing for a canvas table ---- */
  function table(o) {
    const st = { S: null, canvas: null, ctx: null, bg: null, sc: 1, raf: 0, play: null, seq: 0, seen: false, drag: null, aim: null, pw: 0, thrust: null, place: null, kb: { ang: null, ch: 0 }, dead: false };
    const VB = o.vb;
    st.fit = () => {
      const cv = st.canvas; if (!cv || !cv.isConnected) return; const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      const d = DPR(), pw = Math.round(w * d), ph = Math.round(h * d); if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
      st.sc = pw / VB.w; st.bg = document.createElement('canvas'); st.bg.width = pw; st.bg.height = ph; const b = st.bg.getContext('2d'); b.setTransform(st.sc, 0, 0, st.sc, -VB.x * st.sc, -VB.y * st.sc); o.bg(b); st.kick();
    };
    st.kick = () => { if (!st.raf && !st.dead) st.raf = requestAnimationFrame(st.frame); };
    st.active = () => st.play || st.drag || st.thrust || st.kb.ch;
    st.frame = now => {
      st.raf = 0; const cv = st.canvas; if (!cv || !cv.isConnected || st.dead) return;
      const c = st.ctx || (st.ctx = cv.getContext('2d')); if (!st.bg) { st.fit(); if (!st.bg) return; }
      c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(st.bg, 0, 0); c.setTransform(st.sc, 0, 0, st.sc, -VB.x * st.sc, -VB.y * st.sc);
      o.draw(c, now);
      if (st.active()) st.kick();
    };
    st.toLogical = e => { const r = st.canvas.getBoundingClientRect(); let x = (e.clientX - r.left) / r.width * VB.w + VB.x, y = (e.clientY - r.top) / r.height * VB.h + VB.y; if (o.flip && o.flip()) { x = 100 - x; y = 100 - y; } return { x, y }; };
    st.mount = (stage) => {
      st.dead = false; cancelAnimationFrame(st.raf); st.raf = 0; st.play = null; st.drag = null; st.aim = null; st.thrust = null; st.place = null; st.seen = false; st.pw = 0; st.kb = { ang: null, ch: 0 };
      st.canvas = stage.querySelector('canvas'); st.ctx = null; st.bg = null;
      const cv = st.canvas; cv.style.touchAction = 'none';
      cv.addEventListener('pointerdown', e => { if (!st.S || !st.S.turn || st.play || st.thrust) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {} const p = st.toLogical(e); st.drag = { x0: p.x, y0: p.y, x: p.x, y: p.y, moved: 0, px: e.clientX, py: e.clientY, id: e.pointerId }; o.onDown && o.onDown(p); st.kick(); });
      cv.addEventListener('pointermove', e => { const d = st.drag; if (!d || d.id !== e.pointerId) return; const p = st.toLogical(e); d.x = p.x; d.y = p.y; d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.px, e.clientY - d.py)); o.onMove && o.onMove(d); st.kick(); });
      const up = e => { const d = st.drag; if (!d || d.id !== e.pointerId) return; st.drag = null; o.onUp && o.onUp(d); st.kick(); };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { st.drag = null; st.kick(); });
      cv.addEventListener('contextmenu', e => e.preventDefault());
      if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(() => st.fit()); ro.observe(cv.parentNode); st.ro = ro; }
      st.fit();
    };
    st.unmount = () => { st.dead = true; cancelAnimationFrame(st.raf); if (st.ro) st.ro.disconnect(); };
    return st;
  }
  const ease = k => k * k;                                       // accelerate into the hit
  function runPlay(st, shot, nDisc, rad, W, H, pre, strikeSound, vol) {
    st.play = { frames: shot.frames, t0: performance.now() + pre * 1000, pre, ev: analyze(shot.frames, nDisc, rad, W, H), ei: 0, strike: false, sound: strikeSound, vol };
    st.kick();
  }
  function playState(st) {                                       // returns the frame position (float) or -1 while the cue/finger is still winding up
    const p = st.play; if (!p) return -1; const t = (performance.now() - p.t0) / 1000;
    if (t < 0) return -1;
    if (!p.strike) { p.strike = true; Snd.p(p.sound, 0, p.vol); }
    while (p.ei < p.ev.length && p.ev[p.ei].t <= t) { const e = p.ev[p.ei++]; Snd.p(st.pre + e.k, 0, e.v); }
    const f = t * FPS; if (f >= p.frames.length - 1) { st.play = null; st.afterPlay && st.afterPlay(); return -2; } return f;
  }
  const lerpPos = (A, B, i, a) => { const ax = A[2 * i], bx = B[2 * i]; if (ax < 0 && bx < 0) return null; if (ax < 0) return { x: bx / 10, y: B[2 * i + 1] / 10, s: 1 }; const x = (ax + ((bx < 0 ? ax : bx) - ax) * a) / 10, y = (A[2 * i + 1] + ((bx < 0 ? A[2 * i + 1] : B[2 * i + 1]) - A[2 * i + 1]) * a) / 10; return { x, y, s: bx < 0 ? 1 - a : 1 }; };
  const setPow = (id, v) => { const f = $(id + 'Fill'), t = $(id + 'V'); if (f) { f.style.width = Math.round(v * 100) + '%'; f.style.background = `hsl(${120 - v * 120},75%,48%)`; } if (t) t.textContent = Math.round(v * 100) + '%'; };
  const pt = (c, x, y) => { c.beginPath(); c.arc(x, y, 0.35, 0, 7); c.fill(); };

  /* ===================== Pool ===================== */
  const PV = { x: -4, y: -4, w: 108, h: 58 };
  const BR = () => CUE.BR;
  function poolBg(c) {
    const wood = c.createLinearGradient(0, -4, 0, 54); wood.addColorStop(0, '#7a4a26'); wood.addColorStop(0.5, '#5a3418'); wood.addColorStop(1, '#3d2210');
    c.fillStyle = wood; c.beginPath(); c.roundRect ? c.roundRect(-4, -4, 108, 58, 3) : c.rect(-4, -4, 108, 58); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 0.25; c.strokeRect(-3.7, -3.7, 107.4, 57.4);
    c.fillStyle = '#e8d8a8'; for (let i = 1; i < 8; i++) { if (i === 4) continue; for (const y of [-2, 52]) { c.beginPath(); c.arc(i * 12.5, y, 0.4, 0, 7); c.fill(); } } for (let i = 1; i < 4; i++) for (const x of [-2, 102]) { c.beginPath(); c.arc(x, i * 12.5, 0.4, 0, 7); c.fill(); }
    const felt = c.createRadialGradient(50, 25, 6, 50, 25, 62); felt.addColorStop(0, '#2a9a62'); felt.addColorStop(1, '#14603a'); c.fillStyle = felt; c.fillRect(0, 0, 100, 50);
    c.globalAlpha = 0.05; c.strokeStyle = '#000'; c.lineWidth = 0.15; for (let x = 0; x < 100; x += 1.1) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 50); c.stroke(); } c.globalAlpha = 1;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, 100, 1.1); c.fillRect(0, 48.9, 100, 1.1); c.fillRect(0, 0, 1.1, 50); c.fillRect(98.9, 0, 1.1, 50);
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 0.25; c.beginPath(); c.moveTo(25, 1); c.lineTo(25, 49); c.stroke(); c.fillStyle = 'rgba(255,255,255,.4)'; pt(c, 25, 25); pt(c, 72, 25);
    CUE.PT.pk.forEach(p => { const g = c.createRadialGradient(p.x, p.y, 0.5, p.x, p.y, p.r + 0.9); g.addColorStop(0, '#000'); g.addColorStop(0.8, '#05050a'); g.addColorStop(1, '#9a7a3a'); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r + 0.9, 0, 7); c.fill(); });
  }
  function drawBall(c, x, y, id, s) {
    const r = CUE.BR * (s == null ? 1 : s); if (r <= 0.05) return;
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x + 0.5, y + 0.75, r, r * 0.92, 0, 0, 7); c.fill();
    const base = colOf(id), stripe = id > 8, g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#fff'); g.addColorStop(0.35, stripe ? '#f4f1e8' : base); g.addColorStop(1, stripe ? '#b8b4a8' : 'rgba(0,0,0,.65)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    if (stripe) { c.save(); c.beginPath(); c.arc(x, y, r, 0, 7); c.clip(); const g3 = c.createLinearGradient(x, y - r, x, y + r); g3.addColorStop(0, base); g3.addColorStop(0.5, base); g3.addColorStop(1, '#00000066'); c.fillStyle = g3; c.fillRect(x - r, y - r * 0.5, r * 2, r); c.restore(); }
    if (id > 0) { c.fillStyle = '#fbf6ea'; c.beginPath(); c.arc(x, y, r * 0.42, 0, 7); c.fill(); c.fillStyle = '#111'; c.font = `700 ${r * 0.62}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(id), x, y + r * 0.04); }
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.17, -0.6, 0, 7); c.fill();
  }
  function cueStick(c, x, y, ang, gap) {
    const dx = Math.cos(ang), dy = Math.sin(ang), L = 60, tip = CUE.BR + gap;
    c.save(); c.translate(x - dx * tip, y - dy * tip); c.rotate(ang);
    const draw = (ox, oy, shadow) => { c.save(); c.translate(ox, oy);
      const poly = (x0, x1, w0, w1, fill) => { c.fillStyle = shadow ? 'rgba(0,0,0,.25)' : fill; c.beginPath(); c.moveTo(-x0, -w0 / 2); c.lineTo(-x1, -w1 / 2); c.lineTo(-x1, w1 / 2); c.lineTo(-x0, w0 / 2); c.closePath(); c.fill(); };
      poly(0, 0.8, 0.62, 0.62, '#4aa0e8'); poly(0.8, 3.2, 0.62, 0.66, '#f2efe6'); poly(3.2, 36, 0.66, 1.1, '#e6c88f'); poly(36, 37, 1.1, 1.14, '#c9a56a'); poly(37, L, 1.14, 1.7, '#3a2216'); poly(44, 46, 1.34, 1.38, shadow ? '#000' : '#b08a3a'); c.restore(); };
    draw(0.6, 0.9, true); draw(0, 0, false); c.restore();
  }
  function ghost(P, c, ang, R) {
    const dx = Math.cos(ang), dy = Math.sin(ang); let best = null;
    for (let i = 1; i < P.length; i++) { const b = P[i]; if (!b.alive) continue; const rx = b.x - c.x, ry = b.y - c.y, t = rx * dx + ry * dy; if (t <= 0) continue; const d2 = rx * rx + ry * ry - t * t; if (d2 > R * R) continue; const tc = t - Math.sqrt(R * R - d2); if (tc > 0 && (!best || tc < best.t)) best = { t: tc, b }; }
    let wt = 1e9; if (dx > 0) wt = Math.min(wt, (100 - R - c.x) / dx); if (dx < 0) wt = Math.min(wt, (R - c.x) / dx); if (dy > 0) wt = Math.min(wt, (50 - R - c.y) / dy); if (dy < 0) wt = Math.min(wt, (R - c.y) / dy);
    return { hit: best, len: best ? best.t : Math.max(2, wt) };
  }
  const poolSt = table({ vb: PV, bg: poolBg, draw: (c, now) => poolDraw(c, now), onMove: d => poolSt.upd(d), onUp: d => poolSt.release(d), onDown: () => { poolSt.aimNow = null; } });
  poolSt.pre = 'b'; poolSt.aimNow = null;
  const poolBalls = () => { const g = poolSt.S && poolSt.S.V.g; return g ? g.balls : []; };
  poolSt.cueSpot = () => { const S = poolSt.S; if (!S || !S.turn) return null; const g = S.V.g, hand = S.turn.data.inHand; if (hand) return poolSt.place; const b = g.balls[0]; return b && b.alive ? b : null; };
  poolSt.upd = d => { const c = poolSt.cueSpot(); if (!c) { poolSt.aim = null; return; } const px = d.x0 - d.x, py = d.y0 - d.y, len = Math.hypot(px, py); if (len < 0.6) { poolSt.aim = null; poolSt.pwNow = 0; setPow('plPow', 0); return; }
    const ang = Math.atan2(py, px), pw = clamp((len - 1) / 26, 0, 1); poolSt.aim = { ang, pw }; poolSt.kb.ang = ang; setPow('plPow', pw); };
  poolSt.release = d => {
    const S = poolSt.S; if (!S || !S.turn) return; const hand = S.turn.data.inHand;
    if (d.moved < 7) { if (hand) { const spot = { x: Math.round(d.x0 * 10) / 10, y: Math.round(d.y0 * 10) / 10 }; if (CUE.freeSpot(S.V.g.balls, spot.x, spot.y, 0)) { poolSt.place = spot; poolSt.aim = null; Snd.p('tap'); poolSt.refreshHint(); } } return; }
    if (poolSt.aim && poolSt.aim.pw >= 0.05 && poolSt.cueSpot()) poolSt.fire(poolSt.aim.ang, poolSt.aim.pw);
    else { poolSt.aim = null; setPow('plPow', 0); }
  };
  poolSt.fire = (ang, pw) => {
    const S = poolSt.S, c = poolSt.cueSpot(); if (!S || !S.turn || !c || poolSt.thrust) return;
    const hand = S.turn.data.inHand; if (hand && !poolSt.place) return;
    poolSt.lastPw = pw; poolSt.thrust = { t0: performance.now(), from: 1.2 + pw * 9, ang, pw, c: { x: c.x, y: c.y }, send: { t: 'shot', x: c.x + Math.cos(ang) * 20, y: c.y + Math.sin(ang) * 20, p: Math.max(0.08, pw), place: hand ? poolSt.place : null }, S };
    poolSt.kick();
  };
  poolSt.kbLoop = () => {                                         // keyboard: arrows turn the aim, hold Space to pull back, release to hit
    const k = poolSt.kb; if (!k.ch) return; const S = poolSt.S; if (!S || !S.turn) { k.ch = 0; return; }
    const t = (performance.now() - k.t0) / 1000, pw = clamp(t / 1.4, 0, 1); poolSt.aim = { ang: k.ang == null ? 0 : k.ang, pw: Math.max(pw, 0.02) }; setPow('plPow', pw);
  };
  function poolDraw(c, now) {
    const S = poolSt.S; if (!S) return; const g = S.V.g, st = poolSt; poolSt.kbLoop();
    // playback or resting positions
    let P = g.balls.map(b => ({ id: b.id, x: b.x, y: b.y, s: b.alive ? 1 : 0 })), shooter = null;
    const pre = st.play && now < st.play.t0;
    if (st.play) {
      const f = playState(st);
      if (f >= 0) { const i0 = Math.floor(f), A = st.play.frames[i0], B = st.play.frames[Math.min(i0 + 1, st.play.frames.length - 1)], a = f - i0; P = g.balls.map((b, i) => { const q = lerpPos(A, B, i, a); return q ? { id: b.id, x: q.x, y: q.y, s: q.s } : { id: b.id, x: 0, y: 0, s: 0 }; }); }
      else if (f === -1) { P = st.play.start.map(b => ({ id: b.id, x: b.x, y: b.y, s: b.alive ? 1 : 0 })); const u = clamp(1 - (st.play.t0 - now) / (st.play.pre * 1000), 0, 1); shooter = { x: P[0].x, y: P[0].y, ang: st.play.ang, gap: u < 0.65 ? 0.4 + (u / 0.65) * (1.2 + st.play.pw * 9) : (1.6 + st.play.pw * 8.6) * (1 - ease((u - 0.65) / 0.35)) + 0.0 }; }
    }
    const hand = S.turn && S.turn.data.inHand, place = hand ? st.place : null;
    if (place && !st.play) { P[0] = { id: 0, x: place.x, y: place.y, s: 1 }; }
    // aim helpers
    let aimLine = null;
    if (S.turn && !st.play && !(hand && !place)) {
      const cs = st.cueSpot(), a = st.aim; if (cs && (a || st.thrust)) { const ang = a ? a.ang : st.thrust.ang; aimLine = { cs, ang, pw: a ? a.pw : st.thrust.pw }; }
      else if (cs && !st.drag) { const tgt = g.balls.find(b => b.alive && b.id > 0), ang0 = st.kb.ang == null ? Math.atan2((tgt ? tgt.y : 25) - cs.y, (tgt ? tgt.x : 72) - cs.x) : st.kb.ang; aimLine = { cs, ang: ang0, pw: 0, idle: true }; if (st.kb.ang == null) st.kb.ang = ang0; }
    }
    if (aimLine) {
      const { cs, ang } = aimLine, gh = ghost(P, cs, ang, 2 * CUE.BR), dx = Math.cos(ang), dy = Math.sin(ang);
      c.save(); c.setLineDash([1.1, 0.9]); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 0.32; c.beginPath(); c.moveTo(cs.x, cs.y); c.lineTo(cs.x + dx * gh.len, cs.y + dy * gh.len); c.stroke(); c.restore();
      if (gh.hit) { const gx = cs.x + dx * gh.hit.t, gy = cs.y + dy * gh.hit.t, b = gh.hit.b, bx = b.x - gx, by = b.y - gy, bl = Math.hypot(bx, by) || 1;
        c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 0.3; c.beginPath(); c.arc(gx, gy, CUE.BR, 0, 7); c.stroke(); c.strokeStyle = '#f2b441'; c.setLineDash([1, 0.8]); c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x + bx / bl * 12, b.y + by / bl * 12); c.stroke(); c.setLineDash([]); }
    }
    // balls (cue ball last so it sits on top)
    for (let i = P.length - 1; i >= 0; i--) { const b = P[i]; if (b.s > 0.02) drawBall(c, b.x, b.y, b.id, b.s); }
    // cue stick
    if (shooter) cueStick(c, shooter.x, shooter.y, shooter.ang, shooter.gap);
    else if (st.thrust) { const T = st.thrust, u = (performance.now() - T.t0) / 150, gap = T.from * (1 - ease(Math.min(1, u))) + 0.05; cueStick(c, T.c.x, T.c.y, T.ang, gap + 0.0); if (u >= 1) { const m = T.send; st.thrust = null; st.aim = null; setPow('plPow', 0); T.S.send(m); } }
    else if (aimLine && !st.play) { const wob = aimLine.pw ? 0 : Math.sin(performance.now() / 420) * 0.25 + 0.5; cueStick(c, aimLine.cs.x, aimLine.cs.y, aimLine.ang, 1.2 + aimLine.pw * 9 + wob); }
    if (hand && !place && !st.play) { c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(0, 0, 25, 50); c.fillStyle = '#fff'; c.font = '700 2.6px sans-serif'; c.textAlign = 'center'; c.fillText('Tap here to place the cue ball', 12.5, 25); }
  }
  const poolUI = {
    st: poolSt,
    mount(stage, ctl) {
      stage.innerHTML = `<section class="table pz cuewrap"><div class="bt-opps" id="plSeats"></div><div class="cuebox pool"><canvas id="plCv" aria-label="Pool table"></canvas></div><div class="pz-label" id="plMsg"></div><div class="banner" id="plBanner" aria-live="polite"></div></section>`;
      ctl.innerHTML = `<div class="act" id="plAct" hidden><div class="pwrow"><span class="hint">Power</span><div class="pwbar"><i id="plPowFill"></i></div><span class="hint" id="plPowV">0%</span></div><p class="hint bt-hint" id="plHint"></p></div>`;
      poolSt.mount(stage); poolSt.S = null;
      if (poolSt.kd) { window.removeEventListener('keydown', poolSt.kd); window.removeEventListener('keyup', poolSt.ku); }
      window.addEventListener('keydown', poolSt.kd = e => { const S = poolSt.S; if (!S || !S.turn || !$('plCv') || poolSt.play || poolSt.thrust) return; if (/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) return;
        const k = e.key; if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); if (poolSt.kb.ang == null) poolSt.kb.ang = 0; poolSt.kb.ang += (k === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 0.002 : 0.012); poolSt.aim = poolSt.kb.ch ? poolSt.aim : null; poolSt.kick(); }
        if (k === ' ' && !e.repeat && !(S.turn.data.inHand && !poolSt.place)) { e.preventDefault(); poolSt.kb.ch = 1; poolSt.kb.t0 = performance.now(); poolSt.kick(); } });
      window.addEventListener('keyup', poolSt.ku = e => { if (e.key === ' ' && poolSt.kb.ch) { poolSt.kb.ch = 0; const a = poolSt.aim; if (a && a.pw >= 0.05) poolSt.fire(a.ang, a.pw); else { poolSt.aim = null; setPow('plPow', 0); } } });
      poolSt.afterPlay = () => { poolSt.kick(); };
    },
    update(S) {
      poolSt.S = S; const V = S.V, g = V.g; if (!S.turn) { poolSt.aim = null; poolSt.place = null; poolSt.kb.ch = 0; }
      if (!poolSt.seen) { poolSt.seen = true; poolSt.seq = g.shot ? g.shot.seq : 0; }
      else if (g.shot && g.shot.seq !== poolSt.seq) {
        poolSt.seq = g.shot.seq; const f = g.shot.frames, mine = g.shot.p === S.me, a0 = f[0], a1 = f[Math.min(2, f.length - 1)];
        const ang = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]), pw = clamp(Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) / 10 / (7.2 * CUE.VMAX), 0.1, 1);
        const start = g.balls.map((b, i) => ({ id: b.id, alive: f[0][2 * i] >= 0, x: f[0][2 * i] / 10, y: f[0][2 * i + 1] / 10 }));
        runPlay(poolSt, g.shot, g.balls.length, () => CUE.BR, 100, 50, mine ? 0 : 0.65, 'cuehit', mine && poolSt.lastPw ? poolSt.lastPw : pw);
        Object.assign(poolSt.play, { start, ang, pw });
      }
      const gn = i => (g.groups[i] === 'solid' ? 'Solids' : g.groups[i] === 'stripe' ? 'Stripes' : 'Open table');
      $('plSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Lining up…', extra: i => gn(i) });
      $('plMsg').textContent = g.over ? '' : g.msg;
      $('plBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') + `<span>${esc(g.msg)}</span>` : '';
      $('plAct').hidden = !S.turn; poolSt.refreshHint(); poolSt.kick(); return '';
    },
  };
  poolSt.refreshHint = () => { const S = poolSt.S; if (!S || !S.turn || !$('plHint')) return; const hand = S.turn.data.inHand; $('plHint').textContent = hand && !poolSt.place ? 'Ball in hand: tap the left part of the table to place the cue ball.' : 'Drag back like pulling a cue (further = more power) and let go to hit. Keyboard: ← → to aim, hold Space then release.'; };

  /* ===================== Carrom ===================== */
  const CV = { x: -3, y: -3, w: 106, h: 106 };
  const CC = { w: '#f4ecd8', b: '#2a2430', q: '#d6453d' };
  function carromBg(c) {
    const fr = c.createLinearGradient(-3, -3, 103, 103); fr.addColorStop(0, '#7a4a26'); fr.addColorStop(1, '#4a2a12'); c.fillStyle = fr; c.beginPath(); c.roundRect ? c.roundRect(-3, -3, 106, 106, 3) : c.rect(-3, -3, 106, 106); c.fill();
    const bd = c.createRadialGradient(50, 50, 5, 50, 50, 75); bd.addColorStop(0, '#f0cf92'); bd.addColorStop(1, '#d9b072'); c.fillStyle = bd; c.fillRect(0, 0, 100, 100);
    c.globalAlpha = 0.06; c.strokeStyle = '#7a4a22'; c.lineWidth = 0.2; for (let y = 0; y < 100; y += 1.6) { c.beginPath(); c.moveTo(0, y); c.lineTo(100, y + (y % 3)); c.stroke(); } c.globalAlpha = 1;
    c.strokeStyle = '#7a4a22'; c.lineWidth = 0.4; c.strokeRect(5.5, 5.5, 89, 89);
    [16, 84].forEach(y => { c.beginPath(); c.moveTo(14, y); c.lineTo(86, y); c.stroke(); c.beginPath(); c.moveTo(14, y + (y < 50 ? 3.2 : -3.2)); c.lineTo(86, y + (y < 50 ? 3.2 : -3.2)); c.stroke(); }); [16, 84].forEach(x => { c.beginPath(); c.moveTo(x, 14); c.lineTo(x, 86); c.stroke(); c.beginPath(); c.moveTo(x + (x < 50 ? 3.2 : -3.2), 14); c.lineTo(x + (x < 50 ? 3.2 : -3.2), 86); c.stroke(); });
    [[14, 16], [86, 16], [14, 84], [86, 84], [16, 14], [84, 14], [16, 86], [84, 86]].forEach(([x, y]) => { c.fillStyle = '#d6453d'; c.beginPath(); c.arc(x, y, 1.9, 0, 7); c.fill(); c.strokeStyle = '#7a4a22'; c.stroke(); });
    c.beginPath(); c.arc(50, 50, 12, 0, 7); c.stroke(); c.beginPath(); c.arc(50, 50, 8, 0, 7); c.stroke(); c.fillStyle = 'rgba(214,69,61,.55)'; c.beginPath(); c.arc(50, 50, 2.4, 0, 7); c.fill();
    c.lineWidth = 0.35; [[8, 8, 22, 22], [92, 8, 78, 22], [8, 92, 22, 78], [92, 92, 78, 78]].forEach(([a, b, x, y]) => { c.beginPath(); c.moveTo(a, b); c.lineTo(x, y); c.stroke(); });
    CUE.CT.pk.forEach(p => { const x = p.x - 0.4 * Math.sign(p.x - 50), y = p.y - 0.4 * Math.sign(p.y - 50), g = c.createRadialGradient(x, y, 0.5, x, y, 4.2); g.addColorStop(0, '#000'); g.addColorStop(0.8, '#0c0905'); g.addColorStop(1, '#6a5030'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 4.2, 0, 7); c.fill(); });
  }
  function drawCoin(c, x, y, col, r, s, striker) {
    r = r * (s == null ? 1 : s); if (r <= 0.05) return;
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x + 0.45, y + 0.6, r, r * 0.95, 0, 0, 7); c.fill();
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); g.addColorStop(0, '#fff'); g.addColorStop(0.3, col); g.addColorStop(1, striker ? '#4a88b8' : 'rgba(0,0,0,.55)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.strokeStyle = striker ? 'rgba(255,255,255,.8)' : 'rgba(0,0,0,.35)'; c.lineWidth = 0.22; c.beginPath(); c.arc(x, y, r * 0.72, 0, 7); c.stroke(); if (!striker) { c.beginPath(); c.arc(x, y, r * 0.4, 0, 7); c.stroke(); } else { c.beginPath(); c.arc(x, y, r * 0.4, 0, 7); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(x - r * 0.33, y - r * 0.38, r * 0.24, r * 0.14, -0.6, 0, 7); c.fill();
  }
  function finger(c, x, y, ang, gap) {
    c.save(); c.translate(x - Math.cos(ang) * (CUE.SR + gap), y - Math.sin(ang) * (CUE.SR + gap)); c.rotate(ang);
    const shape = (ox, oy, a) => { c.fillStyle = `rgba(0,0,0,${a})`; c.beginPath(); c.ellipse(ox - 4.6, oy, 5.6, 2.4, 0, 0, 7); c.fill(); };
    shape(0.6, 0.9, 0.22);
    const g = c.createLinearGradient(0, -2.4, 0, 2.4); g.addColorStop(0, '#f6cfa6'); g.addColorStop(1, '#d19a70'); c.fillStyle = g; c.beginPath(); c.ellipse(-4.6, 0, 5.6, 2.4, 0, 0, 7); c.fill();
    c.fillStyle = '#f2dccb'; c.beginPath(); c.ellipse(-0.9, 0, 1.9, 1.5, 0, 0, 7); c.fill(); c.strokeStyle = '#b57a52'; c.lineWidth = 0.18; c.stroke();
    c.fillStyle = '#e4b088'; c.beginPath(); c.ellipse(-6.6, 2.1, 3.2, 1.2, 0.2, 0, 7); c.fill(); c.restore();
  }
  const carSt = table({ vb: CV, bg: carromBg, flip: () => !!(carSt.S && carSt.S.me === 1), draw: (c, now) => carDraw(c, now), onMove: d => carSt.upd(d), onUp: d => carSt.release(d) });
  carSt.pre = 'c'; carSt.sx = 50;
  carSt.base = () => { const S = carSt.S; return CUE.BASE[S && S.me === 1 ? 1 : 0]; };
  carSt.upd = d => { const px = d.x0 - d.x, py = d.y0 - d.y, len = Math.hypot(px, py); if (len < 0.6) { carSt.aim = null; setPow('crPow', 0); return; } const ang = Math.atan2(py, px), pw = clamp((len - 1) / 24, 0, 1); carSt.aim = { ang, pw }; carSt.kb.ang = ang; setPow('crPow', pw); };
  carSt.release = d => { if (d.moved < 7) { return; } if (carSt.aim && carSt.aim.pw >= 0.05) carSt.fire(carSt.aim.ang, carSt.aim.pw); else { carSt.aim = null; setPow('crPow', 0); } };
  carSt.fire = (ang, pw) => {
    const S = carSt.S; if (!S || !S.turn || carSt.thrust) return; const by = carSt.base(); if (!CUE.carromSpot(S.V.g.coins, carSt.sx, S.me === 1 ? 1 : 0)) { Snd.p('bad'); return; }
    carSt.lastPw = pw; carSt.thrust = { t0: performance.now(), from: 0.8 + pw * 8, ang, pw, sx: carSt.sx, send: { t: 'shot', sx: carSt.sx, x: carSt.sx + Math.cos(ang) * 30, y: by + Math.sin(ang) * 30, p: Math.max(0.1, pw) }, S }; carSt.kick();
  };
  carSt.kbLoop = () => { const k = carSt.kb; if (!k.ch) return; const S = carSt.S; if (!S || !S.turn) { k.ch = 0; return; } const pw = clamp((performance.now() - k.t0) / 1000 / 1.3, 0, 1); carSt.aim = { ang: k.ang == null ? (S.me === 1 ? Math.PI / 2 : -Math.PI / 2) : k.ang, pw: Math.max(pw, 0.02) }; setPow('crPow', pw); };
  function carDraw(c, now) {
    const S = carSt.S; if (!S) return; const g = S.V.g, st = carSt, n = g.coins.length, me = S.me === 1 ? 1 : 0, by = CUE.BASE[me]; st.kbLoop();
    c.save(); if (S.me === 1) { c.translate(100, 100); c.scale(-1, -1); }
    let P = g.coins.map(k => ({ t: k.t, x: k.x, y: k.y, s: k.alive ? 1 : 0 })), SP = null, fing = null;
    if (st.play) {
      const f = playState(st);
      if (f >= 0) { const i0 = Math.floor(f), A = st.play.frames[i0], B = st.play.frames[Math.min(i0 + 1, st.play.frames.length - 1)], a = f - i0; P = g.coins.map((k, i) => { const q = lerpPos(A, B, i, a); return q ? { t: k.t, x: q.x, y: q.y, s: q.s } : { t: k.t, x: 0, y: 0, s: 0 }; }); const q = lerpPos(A, B, n, a); SP = q ? { x: q.x, y: q.y, s: q.s } : null; }
      else if (f === -1) { P = st.play.start.map(k => ({ t: k.t, x: k.x, y: k.y, s: k.alive ? 1 : 0 })); SP = { x: st.play.sx, y: CUE.BASE[st.play.p], s: 1 }; const u = clamp(1 - (st.play.t0 - now) / (st.play.pre * 1000), 0, 1); fing = { x: SP.x, y: SP.y, ang: st.play.ang, gap: u < 0.65 ? 0.3 + (u / 0.65) * (0.8 + st.play.pw * 8) : (1.1 + st.play.pw * 7.9) * (1 - ease((u - 0.65) / 0.35)) }; }
    } else if (S.turn) SP = { x: st.sx, y: by, s: 1 };
    const ok = !S.turn || CUE.carromSpot(g.coins, st.sx, me);
    let aim = null; if (S.turn && !st.play) { const a = st.aim; if (a) aim = a; else if (st.thrust) aim = { ang: st.thrust.ang, pw: st.thrust.pw }; else { const ang0 = st.kb.ang == null ? Math.atan2(50 - by, 50 - st.sx) : st.kb.ang; aim = { ang: ang0, pw: 0, idle: true }; } }
    if (aim && SP) { c.save(); c.setLineDash([1.1, 0.9]); c.strokeStyle = 'rgba(60,30,10,.7)'; c.lineWidth = 0.35; c.beginPath(); c.moveTo(st.sx, by); c.lineTo(st.sx + Math.cos(aim.ang) * 55, by + Math.sin(aim.ang) * 55); c.stroke(); c.restore(); }
    P.forEach(k => { if (k.s > 0.02) drawCoin(c, k.x, k.y, CC[k.t], CUE.CR, k.s); });
    if (SP && SP.s > 0.02) drawCoin(c, SP.x, SP.y, ok ? '#cfe8ff' : '#f0a0a0', CUE.SR, SP.s, true);
    if (fing) finger(c, fing.x, fing.y, fing.ang, fing.gap);
    else if (st.thrust) { const T = st.thrust, u = (performance.now() - T.t0) / 120; finger(c, T.sx, by, T.ang, T.from * (1 - ease(Math.min(1, u))) + 0.1); if (u >= 1) { const m = T.send; st.thrust = null; st.aim = null; setPow('crPow', 0); T.S.send(m); } }
    else if (aim && S.turn && !st.play) finger(c, st.sx, by, aim.ang, 0.8 + aim.pw * 8 + (aim.pw ? 0 : Math.sin(performance.now() / 420) * 0.25 + 0.4));
    c.restore();
  }
  const carromUI = {
    st: carSt,
    mount(stage, ctl) {
      stage.innerHTML = `<section class="table pz cuewrap"><div class="bt-opps" id="crSeats"></div><div class="cuebox carrom"><canvas id="crCv" aria-label="Carrom board"></canvas></div><div class="pz-label" id="crMsg"></div><div class="banner" id="crBanner" aria-live="polite"></div></section>`;
      ctl.innerHTML = `<div class="act" id="crAct" hidden><div class="pwrow"><span class="hint">Striker</span><input type="range" id="crSx" min="20" max="80" value="50" aria-label="Slide the striker"></div><div class="pwrow"><span class="hint">Power</span><div class="pwbar"><i id="crPowFill"></i></div><span class="hint" id="crPowV">0%</span></div><p class="hint bt-hint" id="crHint"></p></div>`;
      carSt.sx = 50; carSt.S = null; carSt.mount(stage);
      $('crSx').oninput = () => { carSt.sx = +$('crSx').value; carSt.kick(); };
      if (carSt.kd) { window.removeEventListener('keydown', carSt.kd); window.removeEventListener('keyup', carSt.ku); }
      window.addEventListener('keydown', carSt.kd = e => { const S = carSt.S; if (!S || !S.turn || !$('crCv') || carSt.play || carSt.thrust) return; if (/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '') && document.activeElement.type !== 'range') return;
        const k = e.key; if (k === 'a' || k === 'd') { carSt.sx = clamp(carSt.sx + (k === 'a' ? -1.5 : 1.5), 20, 80); $('crSx').value = carSt.sx; carSt.kick(); }
        if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); const sgn = S.me === 1 ? -1 : 1; if (carSt.kb.ang == null) carSt.kb.ang = S.me === 1 ? Math.PI / 2 : -Math.PI / 2; carSt.kb.ang += (k === 'ArrowLeft' ? -1 : 1) * sgn * (e.shiftKey ? 0.002 : 0.012); carSt.kick(); }
        if (k === ' ' && !e.repeat) { e.preventDefault(); carSt.kb.ch = 1; carSt.kb.t0 = performance.now(); carSt.kick(); } });
      window.addEventListener('keyup', carSt.ku = e => { if (e.key === ' ' && carSt.kb.ch) { carSt.kb.ch = 0; const a = carSt.aim; if (a && a.pw >= 0.05) carSt.fire(a.ang, a.pw); else { carSt.aim = null; setPow('crPow', 0); } } });
      carSt.afterPlay = () => carSt.kick();
    },
    update(S) {
      carSt.S = S; const V = S.V, g = V.g; if (!S.turn) { carSt.aim = null; carSt.kb.ch = 0; }
      if (!carSt.seen) { carSt.seen = true; carSt.seq = g.shot ? g.shot.seq : 0; }
      else if (g.shot && g.shot.seq !== carSt.seq) {
        carSt.seq = g.shot.seq; const f = g.shot.frames, n = g.coins.length, mine = g.shot.p === S.me, a0 = [f[0][2 * n], f[0][2 * n + 1]], a1 = [f[Math.min(2, f.length - 1)][2 * n], f[Math.min(2, f.length - 1)][2 * n + 1]];
        const ang = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]), pw = clamp(Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) / 10 / (7.2 * CUE.SV), 0.1, 1);
        const start = g.coins.map((k, i) => ({ t: k.t, alive: f[0][2 * i] >= 0, x: f[0][2 * i] / 10, y: f[0][2 * i + 1] / 10 }));
        runPlay(carSt, g.shot, n + 1, i => (i === n ? CUE.SR : CUE.CR), 100, 100, mine ? 0 : 0.6, 'cflick', mine && carSt.lastPw ? carSt.lastPw : pw);
        Object.assign(carSt.play, { start, ang, pw, sx: g.shot.sx, p: g.shot.p });
      }
      $('crSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Lining up…', extra: i => `${i === 0 ? 'White' : 'Black'} · ${CUE.carromScore(g.coins, i === 0 ? 'w' : 'b')} of 9` });
      $('crMsg').textContent = g.over ? '' : g.msg;
      $('crBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') + `<span>${esc(g.msg)}</span>` : '';
      $('crAct').hidden = !S.turn;
      if (S.turn) $('crHint').textContent = `You play ${S.turn.data.colour === 'w' ? 'white' : 'black'}. Slide the striker, then drag back like pulling a finger (further = more power) and let go to flick.${S.turn.data.qPending ? ' Pot one of your coins now to keep the queen.' : ''}`;
      carSt.kick(); return '';
    },
  };

  /* ===================== register ===================== */
  Club.register({
    id: 'pool', cat: 'aim', name: 'Eight-Ball Pool', tag: 'Eight-ball for two. Pot your group, then the 8 ball.', min: 2, max: 2, soloBots: 1, roundWord: 'Rack',
    art: () => ['8', '●', '○'].map(c => `<div class="ltile">${c}</div>`).join(''),
    rules: `<p><b>Goal:</b> pot all the balls of your group, then sink the 8 ball.</p>
      <ol><li>Player 1 breaks. The table is <b>open</b> until someone pots a ball. The first ball potted decides your group: <b>solids</b> (1 to 7) or <b>stripes</b> (9 to 15).</li>
      <li><b>To shoot:</b> press on the table and <b>drag backwards</b>, like pulling a cue back. The cue pulls back with your finger, the dotted line shows where the ball will go, and the further you pull the harder the hit. <b>Let go</b> to strike. On a keyboard, press ← → to aim, hold <b>Space</b> to pull back, and release it to hit.</li>
      <li>Pot a ball of your group and you shoot again.</li>
      <li>Your first contact must be a ball of your group (or the 8 once your group is gone). <b>A foul</b> is a scratch, a miss, or hitting the wrong ball first. After a foul your opponent gets <b>ball in hand</b>: tap the table to place the cue ball.</li>
      <li>Sink the 8 ball after clearing your group to win. Sinking it too early loses the game.</li>
      <li>Each player puts in ${CUE.ANTE} free chips; the winner takes the pot. Chips have no cash value.</li></ol>`,
    round: CUE.poolRound, view: CUE.poolView, ui: poolUI, _test: { CUE },
  });
  Club.register({
    id: 'carrom', cat: 'aim', name: 'Carrom', tag: 'Flick the striker and pot your coins. Clear all nine to win.', min: 2, max: 2, soloBots: 1, roundWord: 'Board',
    art: () => ['◎', '●', '○'].map(c => `<div class="ltile">${c}</div>`).join(''),
    rules: `<p><b>Goal:</b> pot all nine of your coins before your opponent does. Player 1 plays white, player 2 plays black.</p>
      <ol><li><b>To flick:</b> slide the striker along your baseline with the slider, then press on the board and <b>drag backwards</b>. A finger pulls back behind the striker and the dotted line shows its path. The further you pull, the harder the flick. <b>Let go</b> to strike. On a keyboard, use A and D to slide the striker, ← → to aim, hold <b>Space</b> and release to flick.</li>
      <li>Pot one of your own coins and you play again. Pot the other side’s coin and it counts for them.</li>
      <li>The red <b>queen</b> must be “covered”: pot one of your own coins right after it (or on the same flick). Otherwise the queen goes back to the centre.</li>
      <li>If the striker goes in the pocket, that is a <b>foul</b>: your turn ends and one of your potted coins returns to the centre.</li>
      <li>First to pot all nine of their coins wins the pot. Each player puts in ${CUE.ANTE} free chips; chips have no cash value.</li></ol>`,
    round: CUE.carromRound, view: CUE.carromView, ui: carromUI, _test: { CUE },
  });
})();
