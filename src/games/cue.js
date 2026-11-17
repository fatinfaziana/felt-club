/* ---------- Pool and Carrom: shared disc physics and the rules of both games.
   The host simulates each shot once and sends the recorded frames; every screen plays the same frames. Free chips only. ---------- */
const CUE = (() => {
  const ANTE = 20;
  const r1 = v => Math.round(v * 10) / 10;
  const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); };

  /* ----- physics: circles on a rectangle with pockets. D = [{id,x,y,r,m,vx,vy,alive}] ----- */
  function sim(T, D, o) {
    o = o || {}; const frames = [], ev = [], n = D.length, SUB = 2, dt = 1 / SUB; let first = -1, step = 0, wallHits = 0;
    const snap = () => { const f = new Array(n * 2); for (let i = 0; i < n; i++) { const d = D[i]; f[2 * i] = d.alive ? Math.round(d.x * 10) : -1; f[2 * i + 1] = d.alive ? Math.round(d.y * 10) : -1; } frames.push(f); };
    snap();
    for (; step < T.max; step++) {
      for (let s = 0; s < SUB; s++) {
        for (const d of D) { if (!d.alive) continue; d.x += d.vx * dt; d.y += d.vy * dt; }
        for (let i = 0; i < n; i++) {
          const d = D[i]; if (!d.alive) continue;
          for (let k = 0; k < T.pk.length; k++) { const p = T.pk[k]; if (Math.hypot(d.x - p.x, d.y - p.y) < p.r - (T.capIn || 0)) { d.alive = false; d.vx = d.vy = 0; ev.push({ f: frames.length, id: d.id, k }); break; } }
          if (!d.alive) continue;
          if (d.x < d.r) { d.x = d.r + (d.r - d.x); d.vx = Math.abs(d.vx) * T.ew; wallHits++; } else if (d.x > T.w - d.r) { d.x = T.w - d.r - (d.x - (T.w - d.r)); d.vx = -Math.abs(d.vx) * T.ew; wallHits++; }
          if (d.y < d.r) { d.y = d.r + (d.r - d.y); d.vy = Math.abs(d.vy) * T.ew; wallHits++; } else if (d.y > T.h - d.r) { d.y = T.h - d.r - (d.y - (T.h - d.r)); d.vy = -Math.abs(d.vy) * T.ew; wallHits++; }
        }
        for (let i = 0; i < n; i++) {
          const a = D[i]; if (!a.alive) continue;
          for (let j = i + 1; j < n; j++) {
            const b = D[j]; if (!b.alive) continue;
            const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, dd = dx * dx + dy * dy; if (dd >= rr * rr || dd === 0) continue;
            const dist = Math.sqrt(dd), nx = dx / dist, ny = dy / dist, rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            const pen = rr - dist, tm = a.m + b.m; a.x -= nx * pen * b.m / tm; a.y -= ny * pen * b.m / tm; b.x += nx * pen * a.m / tm; b.y += ny * pen * a.m / tm;
            if (rv < 0) { const jv = -(1 + T.ed) * rv / (1 / a.m + 1 / b.m); a.vx -= jv * nx / a.m; a.vy -= jv * ny / a.m; b.vx += jv * nx / b.m; b.vy += jv * ny / b.m; }
            if (first < 0 && o.cue !== undefined && (a.id === o.cue || b.id === o.cue)) first = a.id === o.cue ? b.id : a.id;
          }
        }
      }
      let moving = false;
      for (const d of D) {
        if (!d.alive) continue; const sp = Math.hypot(d.vx, d.vy); if (sp === 0) continue;
        const ns = sp * T.fm - T.fc;
        if (ns < T.stop) { d.vx = d.vy = 0; } else { d.vx *= ns / sp; d.vy *= ns / sp; moving = true; }
      }
      if (step % 4 === 3 || !moving) snap();
      if (!moving) break;
    }
    return { frames, ev, first, steps: step, wallHits };
  }

  /* ===================== Pool (8-ball) ===================== */
  const PT = { w: 100, h: 50, ew: 0.78, ed: 0.96, fm: 0.992, fc: 0.004, stop: 0.012, max: 1100, capIn: 0,
    pk: [{ x: 0, y: 0, r: 3.0 }, { x: 100, y: 0, r: 3.0 }, { x: 0, y: 50, r: 3.0 }, { x: 100, y: 50, r: 3.0 }, { x: 50, y: -0.6, r: 2.7 }, { x: 50, y: 50.6, r: 2.7 }] };
  const BR = 1.25, VMAX = 3.6;
  const RACK = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 15, 7];
  const grp = id => (id === 0 ? 'cue' : id === 8 ? 'eight' : id < 8 ? 'solid' : 'stripe');
  function rack() {
    const b = [{ id: 0, x: 25, y: 25, alive: true }]; let k = 0;
    for (let c = 0; c < 5; c++) for (let r = 0; r <= c; r++) b.push({ id: RACK[k++], x: r1(72 + c * 2.2), y: r1(25 + (r - c / 2) * 2.56), alive: true });
    return b;
  }
  const poolDiscs = B => B.map(b => ({ id: b.id, x: b.x, y: b.y, r: BR, m: 1, vx: 0, vy: 0, alive: b.alive }));
  function poolShoot(B, ang, pw, place) {
    const bs = B.map(b => Object.assign({}, b)); const cue = bs[0];
    if (place) { cue.x = place.x; cue.y = place.y; cue.alive = true; }
    const D = poolDiscs(bs); D[0].vx = Math.cos(ang) * pw * VMAX; D[0].vy = Math.sin(ang) * pw * VMAX;
    const r = sim(PT, D, { cue: 0 });
    D.forEach((d, i) => { bs[i].alive = d.alive; bs[i].x = r1(d.x); bs[i].y = r1(d.y); });
    return { balls: bs, frames: r.frames, ev: r.ev, first: r.first };
  }
  const freeSpot = (B, x, y, skip) => x > BR && x < PT.w - BR && y > BR && y < PT.h - BR && B.every(b => b.id === skip || !b.alive || Math.hypot(b.x - x, b.y - y) > 2 * BR + 0.05);

  // after a shot: who pocketed what, was it a foul, does the turn pass, did someone win
  function poolRules(M, i, res) {
    const G = M.groups, mine = G[i], opp = 1 - i, pocketed = res.ev.map(e => e.id), cueSunk = pocketed.includes(0), potted = pocketed.filter(id => id !== 0);
    const before = M.balls; const mineLeft = g => before.filter(b => b.alive && grp(b.id) === g).length;
    let foul = cueSunk, why = cueSunk ? 'scratched the cue ball' : '';
    if (res.first < 0) { foul = true; why = why || 'missed every ball'; }
    else if (mine) { const fg = grp(res.first); if (!(fg === mine || (fg === 'eight' && mineLeft(mine) === 0))) { foul = true; why = why || 'hit the wrong ball first'; } }
    else if (res.first === 8) { foul = true; why = why || 'hit the 8 ball first'; }
    let winner = -1, loseWhy = '';
    if (potted.includes(8)) {
      if (mine && mineLeft(mine) === 0 && !foul) { winner = i; } else { winner = opp; loseWhy = 'sank the 8 ball too soon'; }
    }
    let assigned = null;
    if (!mine && !foul && winner < 0) { const f = potted.find(id => id !== 8); if (f !== undefined) { assigned = grp(f); } }
    const myG = mine || assigned;
    const own = potted.filter(id => (myG ? grp(id) === myG : id !== 8));
    const cont = !foul && winner < 0 && own.length > 0;
    return { foul, why, winner, loseWhy, assigned, cont, cueSunk, potted };
  }

  const poolNames = ['solids', 'stripes'];
  function legalAim(B, place) { return !place || freeSpot(B, place.x, place.y, 0); }

  function poolCandidates(B, i, groups, inHand) {
    // ghost-ball targets for the shooter; returns a list of {ang, pw, score}
    const cue = B[0], mine = groups[i], list = [];
    const mineLeft = mine ? B.filter(b => b.alive && grp(b.id) === mine).length : 99;
    const targets = B.filter(b => b.alive && b.id !== 0 && (mine ? (grp(b.id) === mine || (b.id === 8 && mineLeft === 0)) : b.id !== 8));
    for (const t of targets) for (const p of PT.pk) {
      const px = p.x < 1 ? 1.8 : p.x > 99 ? 98.2 : p.x, py = p.y < 1 ? 1.8 : p.y > 49 ? 48.2 : p.y;
      const dx = px - t.x, dy = py - t.y, dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl, gx = t.x - ux * 2 * BR, gy = t.y - uy * 2 * BR;
      if (gx < BR || gx > 100 - BR || gy < BR || gy > 50 - BR) continue;
      const cx = gx - cue.x, cy = gy - cue.y, cl = Math.hypot(cx, cy); if (cl < 0.1) continue;
      const cut = (cx * ux + cy * uy) / cl; if (cut < 0.35) continue;
      const blocked = B.some(b => b.alive && b.id !== 0 && b.id !== t.id && distSeg(cue.x, cue.y, gx, gy, b.x, b.y) < 2 * BR - 0.1) || B.some(b => b.alive && b.id !== 0 && b.id !== t.id && distSeg(t.x, t.y, px, py, b.x, b.y) < 2 * BR - 0.1);
      if (blocked) continue;
      list.push({ ang: Math.atan2(cy, cx), dist: cl + dl, cut, pw: Math.min(1, 0.22 + (cl + dl) / 130) });
    }
    return list.sort((a, b) => (b.cut * 40 - b.dist) - (a.cut * 40 - a.dist));
  }
  function distSeg(x1, y1, x2, y2, px, py) { const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy; let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)); }

  function poolBot(M, i, skill) {
    const B = M.balls; let place = null;
    if (M.inHand) { for (let k = 0; k < 60 && !place; k++) { const x = 6 + Math.random() * 28, y = 6 + Math.random() * 38; if (freeSpot(B, x, y, 0)) place = { x: r1(x), y: r1(y) }; } if (!place) place = { x: 25, y: 25 }; }
    const base = place ? B.map((b, k) => (k === 0 ? Object.assign({}, b, place, { alive: true }) : b)) : B;
    let cands = poolCandidates(base, i, M.groups, !!place);
    let best = null, bs = -1e9;
    const tries = cands.slice(0, 5).map(c => ({ ang: c.ang, pw: c.pw }));
    if (!M.balls.some(b => b.id !== 0 && b.alive && b.x < 70) || M.breaking) tries.push({ ang: Math.atan2(25 - base[0].y, 72 - base[0].x), pw: 1 });
    for (let k = 0; k < 4; k++) tries.push({ ang: Math.random() * Math.PI * 2, pw: 0.35 + Math.random() * 0.5 });
    for (const c of tries) {
      const ang = c.ang + gauss() * 0.01 * (1.4 - skill), pw = Math.max(0.12, Math.min(1, c.pw * (1 + gauss() * 0.05)));
      const r = poolShoot(base, ang, pw, null), q = poolRules(Object.assign({}, M, { balls: base }), i, r);
      const sc = q.winner === i ? 1000 : q.winner >= 0 ? -1000 : (q.foul ? -30 : 0) + q.potted.length * 8 + (q.cont ? 12 : 0) + Math.random() * 3;
      if (sc > bs) { bs = sc; best = { ang, pw }; }
    }
    return { place, ang: best.ang, pw: best.pw };
  }

  async function poolRound(G, io) {
    const P = G.players, n = 2; const M = G.pl = { balls: rack(), groups: [null, null], turn: 0, over: false, winner: -1, inHand: false, shot: null, seq: 0, msg: 'Break!', shooter: 0, breaking: true };
    io.line('Rack them up. Player 1 breaks.'); io.render(); await io.sleep(600);
    let guard = 0;
    while (!M.over && guard++ < 80) {
      const i = M.turn, p = P[i]; M.shooter = i; io.render();
      const aim = M.balls[1] || { x: 70, y: 25 };
      const a = await io.turn(p, { kind: M.inHand ? 'place' : 'shot', inHand: M.inHand, groups: M.groups }, {
        auto: { t: 'shot', x: aim.x, y: aim.y, p: 0.6, place: M.inHand ? { x: 25, y: 25 } : null },
        validate: x => {
          if (!x || x.t !== 'shot' || typeof x.x !== 'number' || typeof x.y !== 'number' || !isFinite(x.x + x.y)) return null;
          const pw = Math.max(0.08, Math.min(1, +x.p || 0.5)); let place = null;
          if (M.inHand) { if (!x.place || typeof x.place.x !== 'number' || typeof x.place.y !== 'number' || !freeSpot(M.balls, x.place.x, x.place.y, 0)) return null; place = { x: x.place.x, y: x.place.y }; }
          const c = place || M.balls[0]; if (Math.hypot(x.x - c.x, x.y - c.y) < 0.2) return null;
          return { t: 'shot', x: x.x, y: x.y, p: pw, place };
        },
        bot: () => { const b = poolBot(M, i, p.agg || 0.5), c = b.place || M.balls[0]; return { t: 'shot', x: c.x + Math.cos(b.ang) * 20, y: c.y + Math.sin(b.ang) * 20, p: b.pw, place: b.place }; },
        think: 1100 + Math.random() * 700 });
      const c0 = a.place || M.balls[0], ang = Math.atan2(a.y - c0.y, a.x - c0.x);
      const prev = M.balls, res = poolShoot(prev, ang, a.p, a.place);
      const q = poolRules(Object.assign({}, M, { balls: prev }), i, res);
      M.balls = res.balls; M.seq++; M.shot = { p: i, frames: res.frames, seq: M.seq, ev: res.ev.map(e => [e.f, e.id, e.k]) }; M.inHand = false; M.breaking = false;
      if (q.assigned) { M.groups[i] = q.assigned; M.groups[1 - i] = q.assigned === 'solid' ? 'stripe' : 'solid'; }
      const nm = p.human ? 'you' : p.name;
      let msg = q.potted.length ? `Potted ${q.potted.join(', ')}.` : 'No ball potted.';
      if (q.assigned) msg += ` ${nm === 'you' ? 'You are' : p.name + ' is'} ${poolNames[q.assigned === 'solid' ? 0 : 1]}.`;
      if (q.foul) msg += ` Foul: ${q.why}. Ball in hand.`;
      io.ev(p, q.potted.length ? `pots ${q.potted.join(', ')}` : 'misses', q.potted.length ? `pot ${q.potted.join(', ')}` : 'miss');
      if (q.winner >= 0) { M.over = true; M.winner = q.winner; msg = q.loseWhy ? `${P[i].human ? 'You' : P[i].name} ${q.loseWhy}.` : 'The 8 ball goes in!'; }
      else if (!q.cont) { M.turn = 1 - i; if (q.foul) M.inHand = true; }
      if (q.cueSunk) { const cb = M.balls[0]; cb.alive = true; cb.x = 25; cb.y = 25; M.cueBack = true; }
      M.msg = msg; M.turnNow = M.turn; io.render();
      await io.sleep(Math.min(res.frames.length * 66, 9000) + 500);
    }
    if (!M.over) { M.over = true; M.winner = -1; }
    G.players.forEach(p => { p.delta = 0; });
    if (M.winner >= 0) { settlePot(G, ANTE, [M.winner]); potSummary(G); } else { settlePot(G, ANTE, []); G.summary = [{ p: -1, s: 'No result. Everyone keeps their chips.' }]; }
    io.render();
  }
  function poolView(G) {
    const M = G.pl;
    if (!M) return { balls: rack(), groups: [null, null], turn: -1, over: false, winner: -1, inHand: false, shot: null, msg: '', delta: [] };
    return { balls: M.balls, groups: M.groups, turn: M.over ? -1 : M.turn, over: M.over, winner: M.winner, inHand: M.inHand, shot: M.shot, msg: M.msg || '', delta: G.players.map(p => (M.over ? p.delta || 0 : 0)) };
  }

  /* ===================== Carrom ===================== */
  const CT = { w: 100, h: 100, ew: 0.72, ed: 0.9, fm: 0.994, fc: 0.003, stop: 0.012, max: 1300, capIn: 0.6,
    pk: [{ x: 3.4, y: 3.4, r: 4.4 }, { x: 96.6, y: 3.4, r: 4.4 }, { x: 3.4, y: 96.6, r: 4.4 }, { x: 96.6, y: 96.6, r: 4.4 }] };
  const CR = 1.75, SR = 2.25, SV = 4.0, BASE = [84, 16];
  function carromSet() {
    const c = [{ id: 0, t: 'q', x: 50, y: 50, alive: true }]; let id = 1;
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.push({ id: id++, t: k % 2 ? 'b' : 'w', x: r1(50 + Math.cos(a) * 3.65), y: r1(50 + Math.sin(a) * 3.65), alive: true }); }
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + Math.PI / 12; c.push({ id: id++, t: k % 2 ? 'b' : 'w', x: r1(50 + Math.cos(a) * 7.3), y: r1(50 + Math.sin(a) * 7.3), alive: true }); }
    return c;
  }
  // striker is the last disc (id 99)
  function carromShoot(C, sx, i, ang, pw) {
    const D = C.map(c => ({ id: c.id, x: c.x, y: c.y, r: CR, m: 1, vx: 0, vy: 0, alive: c.alive }));
    const y = BASE[i]; D.push({ id: 99, x: sx, y, r: SR, m: 1.7, vx: Math.cos(ang) * pw * SV, vy: Math.sin(ang) * pw * SV, alive: true });
    const r = sim(CT, D, { cue: 99 });
    const out = C.map((c, k) => Object.assign({}, c, { alive: D[k].alive, x: r1(D[k].x), y: r1(D[k].y) }));
    return { coins: out, frames: r.frames, ev: r.ev, first: r.first };
  }
  const carromSpot = (C, sx, i) => C.every(c => !c.alive || Math.hypot(c.x - sx, c.y - BASE[i]) > CR + SR + 0.05);
  function carromBot(M, i, skill) {
    const C = M.coins, mine = i === 0 ? 'w' : 'b', own = C.filter(c => c.alive && c.t === mine), tgt = own.length ? own : C.filter(c => c.alive && c.t === 'q');
    let best = null, bs = -1e9; const opts = [];
    for (const t of tgt) for (const p of CT.pk) {
      const dx = p.x - t.x, dy = p.y - t.y, dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl, gx = t.x - ux * (CR + SR), gy = t.y - uy * (CR + SR);
      for (let sx = 24; sx <= 76; sx += 4) {
        if (!carromSpot(C, sx, i)) continue;
        const cx = gx - sx, cy = gy - BASE[i], cl = Math.hypot(cx, cy); if (cl < 1) continue;
        if (cy * (i === 0 ? -1 : 1) <= 0) continue;
        const cut = (cx * ux + cy * uy) / cl; if (cut < 0.45) continue;
        opts.push({ sx, ang: Math.atan2(cy, cx), pw: Math.min(1, 0.3 + (cl + dl) / 170), cut, dist: cl + dl });
      }
    }
    opts.sort((a, b) => (b.cut * 60 - b.dist) - (a.cut * 60 - a.dist));
    const tries = opts.slice(0, 6); for (let k = 0; k < 3; k++) { const sx = 30 + Math.random() * 40; if (carromSpot(C, sx, i)) tries.push({ sx, ang: Math.atan2(50 - BASE[i], 50 - sx) + gauss() * 0.1, pw: 0.5 + Math.random() * 0.4 }); }
    if (!tries.length) tries.push({ sx: 50, ang: i === 0 ? -Math.PI / 2 : Math.PI / 2, pw: 0.6 });
    for (const c of tries) {
      const ang = c.ang + gauss() * 0.012 * (1.5 - skill), pw = Math.max(0.15, Math.min(1, c.pw * (1 + gauss() * 0.06)));
      const r = carromShoot(C, c.sx, i, ang, pw), sunk = r.ev.map(e => e.id), strikerSunk = sunk.includes(99);
      const sc = sunk.filter(id => id !== 99 && C[id].t === mine).length * 10 + (sunk.includes(0) ? 4 : 0) - sunk.filter(id => id !== 99 && C[id].t !== mine && C[id].t !== 'q').length * 8 - (strikerSunk ? 14 : 0) + Math.random() * 2;
      if (sc > bs) { bs = sc; best = { sx: c.sx, ang, pw }; }
    }
    return best;
  }
  function carromScore(C, mine) { return C.filter(c => !c.alive && c.t === mine).length; }

  async function carromRound(G, io) {
    const P = G.players, M = G.cr = { coins: carromSet(), turn: 0, over: false, winner: -1, shot: null, seq: 0, msg: 'White starts.', qHold: -1, qOwner: [0, 0], turns: 0 };
    io.line('Coins set. Player 1 plays white, player 2 plays black.'); io.render(); await io.sleep(600);
    while (!M.over && M.turns < 60) {
      const i = M.turn, p = P[i], mine = i === 0 ? 'w' : 'b'; M.turns++; io.render();
      const a = await io.turn(p, { colour: mine, qPending: M.qHold === i }, {
        auto: { t: 'shot', sx: 50, x: 50, y: 50, p: 0.6 },
        validate: x => {
          if (!x || x.t !== 'shot' || typeof x.sx !== 'number' || typeof x.x !== 'number' || typeof x.y !== 'number' || !isFinite(x.sx + x.x + x.y)) return null;
          const sx = Math.max(20, Math.min(80, x.sx)); if (!carromSpot(M.coins, sx, i)) return null; if (Math.hypot(x.x - sx, x.y - BASE[i]) < 0.2) return null;
          return { t: 'shot', sx, x: x.x, y: x.y, p: Math.max(0.1, Math.min(1, +x.p || 0.5)) };
        },
        bot: () => { const b = carromBot(M, i, p.agg || 0.5); return { t: 'shot', sx: b.sx, x: b.sx + Math.cos(b.ang) * 30, y: BASE[i] + Math.sin(b.ang) * 30, p: b.pw }; },
        think: 1100 + Math.random() * 700 });
      const ang = Math.atan2(a.y - BASE[i], a.x - a.sx), res = carromShoot(M.coins, a.sx, i, ang, a.p);
      M.coins = res.coins; M.seq++; M.shot = { p: i, sx: a.sx, frames: res.frames, seq: M.seq, ev: res.ev.map(e => [e.f, e.id, e.k]) };
      const sunk = res.ev.map(e => e.id), strikerSunk = sunk.includes(99), ownSunk = sunk.filter(id => id !== 99 && M.coins[id].t === mine), oppSunk = sunk.filter(id => id !== 99 && M.coins[id].t !== mine && M.coins[id].t !== 'q'), queenSunk = sunk.includes(0);
      let msg = '', cont = false;
      if (strikerSunk) {
        msg = 'Foul: the striker went in.'; const back = M.coins.find(c => !c.alive && c.t === mine && c.id !== 0);
        if (back) { back.alive = true; back.x = 50 + (Math.random() - 0.5) * 4; back.y = 50 + (Math.random() - 0.5) * 4; msg += ' One of your coins returns to the centre.'; }
        if (queenSunk && M.qHold === i) { const q = M.coins[0]; q.alive = true; q.x = 50; q.y = 50; M.qHold = -1; }
      } else {
        if (queenSunk) { if (ownSunk.length) { M.qOwner[i] = 1; M.qHold = -1; msg += 'Queen covered! '; } else { M.qHold = i; msg += 'Queen is down. Pot one of your coins to keep it. '; } }
        else if (M.qHold === i) { if (ownSunk.length) { M.qOwner[i] = 1; M.qHold = -1; msg += 'Queen covered! '; } }
        cont = ownSunk.length > 0 || (queenSunk && M.qHold === i);
        if (ownSunk.length) msg += `Potted ${ownSunk.length} of your coin${ownSunk.length > 1 ? 's' : ''}.`; else if (!queenSunk) msg += oppSunk.length ? 'Potted the other side’s coin.' : 'No coin potted.';
        if (oppSunk.length) msg += ' (A coin for the other side.)';
        if (!cont && M.qHold === i) { const q = M.coins[0]; q.alive = true; q.x = 50; q.y = 50; M.qHold = -1; msg += ' Queen goes back to the centre.'; }
      }
      io.ev(p, ownSunk.length ? `pots ${ownSunk.length}` : strikerSunk ? 'fouls' : 'misses', ownSunk.length ? `pot ${ownSunk.length}` : strikerSunk ? 'foul' : 'miss');
      const wl = M.coins.filter(c => c.t === 'w' && !c.alive).length, bl = M.coins.filter(c => c.t === 'b' && !c.alive).length;
      if (wl === 9 || bl === 9) { M.over = true; M.winner = wl === 9 ? 0 : 1; msg = `${P[M.winner].human ? 'You' : P[M.winner].name} cleared all nine coins!`; }
      else if (!cont) M.turn = 1 - i;
      M.msg = msg; io.render(); await io.sleep(Math.min(res.frames.length * 66, 9000) + 500);
    }
    if (!M.over) { const w = carromScore(M.coins, 'w') + M.qOwner[0] * 3, b = carromScore(M.coins, 'b') + M.qOwner[1] * 3; M.over = true; M.winner = w > b ? 0 : b > w ? 1 : -1; }
    G.players.forEach(p => { p.delta = 0; });
    if (M.winner >= 0) { settlePot(G, ANTE, [M.winner]); potSummary(G); } else { settlePot(G, ANTE, []); G.summary = [{ p: -1, s: 'A draw. Everyone keeps their chips.' }]; }
    io.render();
  }
  function carromView(G) {
    const M = G.cr;
    if (!M) return { coins: carromSet(), turn: -1, over: false, winner: -1, shot: null, msg: '', qHold: -1, delta: [] };
    return { coins: M.coins, turn: M.over ? -1 : M.turn, over: M.over, winner: M.winner, shot: M.shot, msg: M.msg || '', qHold: M.qHold, delta: G.players.map(p => (M.over ? p.delta || 0 : 0)) };
  }

  return { ANTE, sim, PT, CT, BR, CR, SR, VMAX, SV, BASE, rack, grp, poolShoot, poolRules, poolBot, poolRound, poolView, freeSpot, carromSet, carromShoot, carromSpot, carromBot, carromRound, carromView, carromScore };
})();
