/* ---------- Mini Golf: host simulates the ball, everyone watches the same path. Free chips ---------- */
(function () {
const ANTE = 20, MAXS = 7;
const BR = 1.6, HR = 3.4, VMAX = 3.2, FR = 0.982, SANDFR = 0.93, REST = 0.82, CAP = 2.8, PW_DIST = 45;
const HOLES = [
  { par: 3, tee: { x: 12, y: 30 }, hole: { x: 88, y: 30 }, walls: [[48, 10, 52, 38]], sand: [] },
  { par: 4, tee: { x: 10, y: 10 }, hole: { x: 90, y: 50 }, walls: [[30, 0, 36, 36], [64, 24, 70, 60]], sand: [] },
  { par: 4, tee: { x: 10, y: 50 }, hole: { x: 90, y: 10 }, walls: [[20, 20, 24, 60], [76, 22, 80, 60]], sand: [[42, 0, 58, 60]] },
];
const PCOL = ['#f2b441', '#f7f0e1', '#5cc8b0', '#e8708a', '#a063d8', '#8ab4ff'];
const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); };
const r1 = v => Math.round(v * 10) / 10;

function sim(H, pos, ang, pw) {
  let x = pos.x, y = pos.y, sp = pw * VMAX, vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
  const path = [[r1(x), r1(y)]];
  for (let s = 0; s < 900; s++) {
    x += vx; y += vy;
    if (x < BR) { x = BR; vx = Math.abs(vx) * REST; } else if (x > 100 - BR) { x = 100 - BR; vx = -Math.abs(vx) * REST; }
    if (y < BR) { y = BR; vy = Math.abs(vy) * REST; } else if (y > 60 - BR) { y = 60 - BR; vy = -Math.abs(vy) * REST; }
    for (const w of H.walls) {
      const cx = Math.max(w[0], Math.min(x, w[2])), cy = Math.max(w[1], Math.min(y, w[3])), dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
      if (d2 < BR * BR) {
        let nx, ny;
        if (d2 > 1e-9) { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; x = cx + nx * BR; y = cy + ny * BR; }
        else {
          const l = x - w[0], r = w[2] - x, t = y - w[1], b = w[3] - y, m = Math.min(l, r, t, b);
          if (m === l) { nx = -1; ny = 0; x = w[0] - BR; } else if (m === r) { nx = 1; ny = 0; x = w[2] + BR; } else if (m === t) { nx = 0; ny = -1; y = w[1] - BR; } else { nx = 0; ny = 1; y = w[3] + BR; }
        }
        const vn = vx * nx + vy * ny;
        if (vn < 0) { vx -= (1 + REST) * vn * nx; vy -= (1 + REST) * vn * ny; }
      }
    }
    const f = H.sand.some(w => x >= w[0] && x <= w[2] && y >= w[1] && y <= w[3]) ? SANDFR : FR;
    vx *= f; vy *= f; sp = Math.hypot(vx, vy);
    if (Math.hypot(x - H.hole.x, y - H.hole.y) < HR && sp < CAP) { path.push([H.hole.x, H.hole.y]); return { path, end: { x: H.hole.x, y: H.hole.y }, sunk: true }; }
    if (s % 3 === 2) path.push([r1(x), r1(y)]);
    if (sp < 0.05) break;
  }
  path.push([r1(x), r1(y)]);
  return { path, end: { x: r1(x), y: r1(y) }, sunk: false };
}
const toShot = (pos, tx, ty) => { const dx = tx - pos.x, dy = ty - pos.y; return { ang: Math.atan2(dy, dx), pw: Math.max(0.08, Math.min(1, Math.hypot(dx, dy) / PW_DIST)) }; };
const target = (pos, ang, pw) => ({ x: pos.x + Math.cos(ang) * pw * PW_DIST, y: pos.y + Math.sin(ang) * pw * PW_DIST });
function botShot(H, pos, agg) {
  const c = [];
  for (let a = 0; a < 360; a += 4) for (const pw of [0.2, 0.35, 0.5, 0.65, 0.8, 1]) {
    const ang = a * Math.PI / 180, r = sim(H, pos, ang, pw);
    c.push({ ang, pw, score: r.sunk ? -1 : Math.hypot(r.end.x - H.hole.x, r.end.y - H.hole.y) });
  }
  c.sort((p, q) => p.score - q.score);
  const pick = c[rnd(agg > 0.6 ? 14 : 8)];
  const ang = pick.ang + gauss() * (0.07 + (agg > 0.6 ? 0.02 : 0)), pw = Math.max(0.1, Math.min(1, pick.pw * (1 + gauss() * 0.12))), t = target(pos, ang, pw);
  return { t: 'shot', x: t.x, y: t.y };
}

async function round(G, io) {
  const P = G.players, n = P.length;
  const M = G.mg = { ps: P.map(() => ({ tot: 0, st: 0, pos: null, sunk: false, res: [] })), hole: 0, turn: -1, shot: null, seq: 0, over: false, winners: [] };
  for (let h = 0; h < HOLES.length; h++) {
    const H = HOLES[h]; M.hole = h; M.shot = null;
    M.ps.forEach(s => { s.pos = { x: H.tee.x, y: H.tee.y }; s.st = 0; s.sunk = false; });
    io.line(`Hole ${h + 1}, par ${H.par}.`); io.render(); await io.sleep(700);
    while (M.ps.some(s => !s.sunk && s.st < MAXS)) {
      for (let i = 0; i < n; i++) {
        const s = M.ps[i], p = P[i]; if (s.sunk || s.st >= MAXS) continue;
        M.turn = i; io.render();
        const a = await io.turn(p, { hole: h, stroke: s.st + 1 }, { auto: (() => { const t = target(s.pos, Math.atan2(H.hole.y - s.pos.y, H.hole.x - s.pos.x), 0.5); return { t: 'shot', x: t.x, y: t.y }; })(),
          validate: x => (x && x.t === 'shot' && typeof x.x === 'number' && typeof x.y === 'number' && x.x > -300 && x.x < 400 && x.y > -300 && x.y < 400 ? { t: 'shot', x: x.x, y: x.y } : null),
          bot: () => botShot(H, s.pos, p.agg || 0.5), think: 1000 + Math.random() * 600 });
        const sh = toShot(s.pos, a.x, a.y), r = sim(H, s.pos, sh.ang, sh.pw);
        s.st++; s.pos = r.end; s.sunk = r.sunk; M.seq++; M.shot = { p: i, path: r.path, seq: M.seq };
        io.ev(p, r.sunk ? (s.st === 1 ? 'sinks a hole in one!' : `sinks it in ${s.st}`) : `hits stroke ${s.st}`, r.sunk ? (s.st === 1 ? 'sink a hole in one!' : `sink it in ${s.st}`) : `hit stroke ${s.st}`);
        M.turn = -1; io.render(); await io.sleep(Math.min(r.path.length * 33, 6500) + 400);
      }
    }
    M.turn = -1; M.ps.forEach(s => { const sc = s.sunk ? s.st : MAXS + 1; s.res.push(sc); s.tot += sc; });
    io.render(); await io.sleep(800);
  }
  M.over = true; const best = Math.min(...M.ps.map(s => s.tot)); M.winners = M.ps.map((s, i) => (s.tot === best ? i : -1)).filter(i => i >= 0);
  settlePot(G, ANTE, M.winners); potSummary(G);
  io.line(`Totals: ${P.map((p, i) => `${p.human ? 'player ' + (i + 1) : p.name} ${M.ps[i].tot}`).join(', ')}.`, true); io.render();
}
function view(G) {
  const M = G.mg;
  if (!M || M.ps.length !== G.players.length) return { hole: 0, ps: G.players.map(() => ({ tot: 0, st: 0, pos: null, sunk: false, res: [] })), turn: -1, shot: null, over: false, winners: [], delta: [] };
  return { hole: M.hole, ps: M.ps, turn: M.over ? -1 : M.turn, shot: M.shot, over: M.over, winners: M.winners, delta: G.players.map(p => (M.over ? p.delta || 0 : 0)) };
}

/* ----- screen ----- */
let SM = null, mAim = null, animSeq = -1, animT = null, anim = null;
function draw() {
  if (!SM || !$('mgSvg')) return;
  const g = SM.V.g, H = HOLES[g.hole] || HOLES[0];
  let s = `<rect width="100" height="60" fill="#2f7d46"/>` + H.sand.map(w => `<rect x="${w[0]}" y="${w[1]}" width="${w[2] - w[0]}" height="${w[3] - w[1]}" fill="#d9c07a" opacity=".85"/>`).join('') +
    H.walls.map(w => `<rect x="${w[0]}" y="${w[1]}" width="${w[2] - w[0]}" height="${w[3] - w[1]}" fill="#7a4b2a" stroke="#4a2c14" stroke-width=".4" rx=".6"/>`).join('') +
    `<circle cx="${H.tee.x}" cy="${H.tee.y}" r="2.2" fill="none" stroke="#fff" stroke-width=".3" opacity=".6"/><circle cx="${H.hole.x}" cy="${H.hole.y}" r="${HR}" fill="#111"/><line x1="${H.hole.x}" y1="${H.hole.y}" x2="${H.hole.x}" y2="${H.hole.y - 9}" stroke="#eee" stroke-width=".4"/><path d="M${H.hole.x},${H.hole.y - 9} l5,1.6 l-5,1.6z" fill="#e0443c"/>`;
  g.ps.forEach((p, i) => { const at = anim && anim.p === i ? anim : (p.sunk ? null : p.pos); if (at) s += `<circle cx="${at.x}" cy="${at.y}" r="${BR}" fill="${PCOL[i % 6]}" stroke="#000" stroke-width=".35"/>`; });
  const me = g.ps[SM.me];
  if (SM.turn && mAim && me && me.pos) s += `<line x1="${me.pos.x}" y1="${me.pos.y}" x2="${mAim.x}" y2="${mAim.y}" stroke="#fff" stroke-width=".5" stroke-dasharray="1.4 1"/><circle cx="${mAim.x}" cy="${mAim.y}" r="1.4" fill="none" stroke="#fff" stroke-width=".4"/>`;
  $('mgSvg').innerHTML = s;
  if ($('mgHit')) $('mgHit').disabled = !(SM.turn && mAim);
}
function playShot(shot) {
  if (!shot || shot.seq === animSeq) return;
  const first = animSeq < 0; animSeq = shot.seq; clearInterval(animT); let k = 0; if (!first) Snd.p('putt');
  animT = setInterval(() => {
    if (k >= shot.path.length) { clearInterval(animT); anim = null; draw(); const L = shot.path[shot.path.length - 1], H = HOLES[SM.V.g.hole] || HOLES[0]; if (!first && L[0] === H.hole.x && L[1] === H.hole.y) Snd.p('sink'); return; }
    if (!first && k > 2) { const a = shot.path[k - 2], b = shot.path[k - 1], c = shot.path[k], u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]], lu = Math.hypot(...u), lv = Math.hypot(...v); if (lu > 0.3 && lv > 0.3 && (u[0] * v[0] + u[1] * v[1]) / (lu * lv) < 0.6) Snd.p('clack'); }
    anim = { p: shot.p, x: shot.path[k][0], y: shot.path[k][1] }; k++; draw();
  }, 33);
}
const ui = {
  mount(stage, ctl) {
    mAim = null; animSeq = -1; anim = null; clearInterval(animT);
    stage.innerHTML = `<section class="table pz"><div class="bt-opps" id="mgSeats"></div><svg class="mg-svg" id="mgSvg" viewBox="0 0 100 60" role="img" aria-label="Mini golf course"></svg><div class="pz-label" id="mgMsg"></div><div class="banner" id="mgBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="mgAct" hidden><div class="powrow"><span>Power</span><input type="range" id="mgPow" min="8" max="100" value="50" aria-label="Shot power"><b id="mgPowV">50%</b></div><div class="powbar"><i id="mgPowBar"></i></div><div class="betrow"><button type="button" class="b gold" id="mgHit" disabled>Hit ball</button></div><p class="hint bt-hint" id="mgHint"></p></div>`;
    $('mgSvg').onclick = e => {
      if (!SM || !SM.turn) return; const r = $('mgSvg').getBoundingClientRect();
      mAim = { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 60 }; ui.update(SM);
    };
    $('mgPow').oninput = () => { const me = SM && SM.V.g.ps[SM.me]; if (!SM || !SM.turn || !me || !me.pos) return;
      const pw = $('mgPow').value / 100, ang = mAim ? toShot(me.pos, mAim.x, mAim.y).ang : Math.atan2(HOLES[SM.V.g.hole].hole.y - me.pos.y, HOLES[SM.V.g.hole].hole.x - me.pos.x);
      mAim = target(me.pos, ang, pw); ui.update(SM); };
    $('mgHit').onclick = () => { if (SM.turn && mAim) { const a = mAim; mAim = null; SM.send({ t: 'shot', x: a.x, y: a.y }); } };
  },
  update(S) {
    SM = S; const V = S.V, g = V.g;
    if (!S.turn) mAim = null;
    playShot(g.shot);
    $('mgSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Aiming…', extra: i => `${g.ps[i].sunk ? 'Holed in ' + g.ps[i].st : g.ps[i].st + ' strokes'} · total ${g.ps[i].tot}` });
    $('mgMsg').textContent = g.over ? '' : `Hole ${g.hole + 1} of ${HOLES.length} · par ${(HOLES[g.hole] || HOLES[0]).par}`;
    $('mgBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('mgAct').hidden = !S.turn;
    if (S.turn) { const me = g.ps[S.me]; let pw = '';
      if (mAim && me && me.pos) pw = ` Power ${Math.round(toShot(me.pos, mAim.x, mAim.y).pw * 100)}%.`;
      const pp = mAim && me && me.pos ? Math.round(toShot(me.pos, mAim.x, mAim.y).pw * 100) : +$('mgPow').value;
      $('mgPow').value = pp; $('mgPowV').textContent = pp + '%'; $('mgPowBar').style.width = pp + '%'; $('mgPowBar').style.background = pp < 40 ? '#5cc8b0' : pp < 75 ? '#f2b441' : '#e0443c';
      $('mgHint').textContent = `Stroke ${S.turn.data.stroke}. Tap the course to point the shot, then set the Power slider (or tap further away for a harder hit). Walls bounce the ball, sand slows it, and a ball that is too fast skips over the hole.${pw}`; }
    draw();
    return '';
  },
};

/* ----- 3D course ----- */
function golf3d(box, S) {
  const TH = THREE, s = T3.stage(box, { fov: 50 }), sc = s.scene;
  T3.outdoor(s, { r: 70, treeR: 26, shadow: 13, trees: 30, fogNear: 40, fogFar: 110 });
  const K = 0.16, X0 = -8, Z0 = -4.8, BRW = BR * K * 1.2, HRW = HR * K;
  const wx = x => x * K + X0, wz = y => y * K + Z0;
  const course = new TH.Group(); sc.add(course);
  const wood = T3.mat('#7a4b2a', { roughness: 0.6 }), woodDk = T3.mat('#4a2c14', { roughness: 0.6 });
  // scenery: a windmill beside the course
  const mill = new TH.Group(); mill.position.set(-13, 0, -9); sc.add(mill);
  T3.mk(mill, new TH.ConeGeometry(1.8, 5.5, 10), T3.mat('#efe4cc'), 0, 2.75, 0); T3.mk(mill, new TH.ConeGeometry(2.1, 1.4, 10), T3.mat('#a3262a'), 0, 5.9, 0);
  const blades = new TH.Group(); blades.position.set(0, 4.6, 1.5); mill.add(blades);
  for (let k = 0; k < 4; k++) { const b = T3.mk(blades, T3.BOX(0.5, 3.4, 0.08), T3.mat('#f7f0e1'), 0, 0, 0); b.geometry.translate(0, 1.9, 0); b.rotation.z = k * Math.PI / 2; }
  T3.mk(mill, T3.CYL(0.2, 0.2, 0.5, 10), T3.mat('#333'), 0, 4.6, 1.3).rotation.x = Math.PI / 2;
  s.on((dt, t) => { blades.rotation.z += dt * 0.7; });
  let builtHole = -1, baseMesh = null, flag = null, holeW = { x: 0, z: 0 };
  function buildHole(h) {
    while (course.children.length) course.remove(course.children[0]);
    const H = HOLES[h] || HOLES[0], g = T3.canvasTex(512, 512, (c, w, hh) => { c.fillStyle = '#4fae5e'; c.fillRect(0, 0, w, hh); for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)'; c.fillRect(i * 32, 0, 32, hh); } T3.speckle('rgba(0,0,0,0)', 40, 3500)(c, w, hh); }, [1, 1]);
    baseMesh = T3.mk(course, T3.BOX(16, 0.3, 9.6), T3.mat('#fff', { map: g, roughness: 0.95 }), 0, -0.15, 0, { noCast: true });
    for (const [x, z, w, d] of [[0, -5.05, 17.1, 0.5], [0, 5.05, 17.1, 0.5], [-8.3, 0, 0.5, 9.6], [8.3, 0, 0.5, 9.6]]) T3.mk(course, T3.BOX(w, 0.5, d), woodDk, x, 0.05, z);
    const sand = T3.canvasTex(256, 256, T3.speckle('#dcc27c', 90, 4000), [3, 3]);
    H.sand.forEach(w => T3.mk(course, T3.BOX((w[2] - w[0]) * K, 0.04, (w[3] - w[1]) * K), T3.mat('#fff', { map: sand, roughness: 1 }), wx((w[0] + w[2]) / 2), 0.02, wz((w[1] + w[3]) / 2), { noCast: true }));
    H.walls.forEach(w => { T3.mk(course, T3.BOX((w[2] - w[0]) * K, 0.62, (w[3] - w[1]) * K), wood, wx((w[0] + w[2]) / 2), 0.31, wz((w[1] + w[3]) / 2)); T3.mk(course, T3.BOX((w[2] - w[0]) * K + 0.04, 0.05, (w[3] - w[1]) * K + 0.04), T3.mat('#c79a5a'), wx((w[0] + w[2]) / 2), 0.64, wz((w[1] + w[3]) / 2)); });
    const tee = T3.mk(course, T3.CYL(0.5, 0.5, 0.03, 24), T3.mat('#3a3a44'), wx(H.tee.x), 0.015, wz(H.tee.y), { noCast: true }); tee.receiveShadow = true;
    holeW = { x: wx(H.hole.x), z: wz(H.hole.y) };
    T3.mk(course, T3.CYL(HRW + 0.06, HRW + 0.06, 0.02, 28), T3.mat('#d8d8d8'), holeW.x, 0.012, holeW.z, { noCast: true });
    T3.mk(course, T3.CYL(HRW, HRW, 0.03, 28), new TH.MeshBasicMaterial({ color: 0x050505 }), holeW.x, 0.02, holeW.z, { noCast: true });
    flag = new TH.Group(); flag.position.set(holeW.x, 0, holeW.z); course.add(flag);
    T3.mk(flag, T3.CYL(0.025, 0.025, 2.2, 8), T3.mat('#eee'), 0, 1.1, 0);
    const cl = T3.mk(flag, T3.BOX(0.9, 0.5, 0.02), T3.mat('#e0443c', { side: TH.DoubleSide }), 0.45, 1.95, 0); cl.userData.flap = true; flag.userData.cloth = cl;
    builtHole = h;
  }
  s.on((dt, t) => { if (flag && flag.userData.cloth) { flag.userData.cloth.rotation.y = Math.sin(t * 3) * 0.25; flag.userData.cloth.position.x = 0.45 + Math.sin(t * 3) * 0.02; } });
  // balls, people, aim helpers
  const balls = [], people = [], fence = [];
  const ballMat = c => T3.mat(c, { roughness: 0.25, metalness: 0.1 });
  const dots = [], ring = T3.mk(sc, new TH.TorusGeometry(0.3, 0.04, 8, 24), new TH.MeshBasicMaterial({ color: 0xffffff }), 0, 0.06, 0, { noCast: true }); ring.rotation.x = Math.PI / 2; ring.visible = false;
  for (let i = 0; i < 16; i++) dots.push(T3.mk(sc, T3.SPH(0.06, 6), new TH.MeshBasicMaterial({ color: 0xffffff }), 0, 0.12, 0, { noCast: true }));
  dots.forEach(d => { d.visible = false; });
  let n = 0, lastSeq = -1, firstSync = true, anim = null, SS = S;
  function ensure(cnt) {
    while (balls.length < cnt) {
      const i = balls.length, b = T3.mk(sc, T3.SPH(BRW, 16), ballMat(PCOL[i % 6]), 0, BRW, 0); balls.push(b);
      const pp = T3.person(PCOL[i % 6], { idx: i }); pp.scale.setScalar(1.05); sc.add(pp); s.addPerson(pp); people.push(pp);
      const club = new TH.Group(); const shaft = T3.mk(club, T3.CYL(0.025, 0.025, 1.5, 8), T3.mat('#bbb', { metalness: 0.7, roughness: 0.3 }), 0, -0.7, 0); T3.mk(club, T3.BOX(0.28, 0.1, 0.14), T3.mat('#555'), 0.1, -1.45, 0);
      club.position.set(0.1, 1.35, 0.28); pp.add(club); pp.userData.club = club; club.rotation.x = 0.35;
      const lb = T3.label('', { scale: 2.4 }); lb.sprite.position.y = 2.15; pp.add(lb.sprite); lb.sprite.scale.multiplyScalar(1 / 1.05); pp.userData.lb = lb;
      pp.position.set(0, 0, 6.2); pp.userData.target = new TH.Vector3(0, 0, 6.2); fence.push(0);
    }
  }
  const bpos = (p) => (p ? new TH.Vector3(wx(p.x), BRW, wz(p.y)) : new TH.Vector3(0, -5, 0));
  function startAnim(shot, from) {
    const pts = shot.path.map(q => new TH.Vector3(wx(q[0]), BRW, wz(q[1])));
    const pp = people[shot.p]; if (pp) { const cl = pp.userData.club; s.tween(380, (k) => { cl.rotation.x = 0.35 - Math.sin(Math.PI * Math.min(1, k * 1.15)) * 1.5; }, () => { cl.rotation.x = 0.35; }); }
    anim = { p: shot.p, pts, idx: 0, wait: 0.38, sunk: false };
  }
  s.on(dt => {
    if (!anim) return;
    if (anim.wait > 0) { anim.wait -= dt; return; }
    anim.idx += dt / 0.033; const i = Math.floor(anim.idx), a = anim.pts[Math.min(i, anim.pts.length - 1)], b = anim.pts[Math.min(i + 1, anim.pts.length - 1)];
    const f = anim.idx - i, ball = balls[anim.p]; const nx = a.x + (b.x - a.x) * f, nz = a.z + (b.z - a.z) * f;
    ball.rotation.x += (nz - ball.position.x * 0 - ball.position.z) * 2.5; ball.rotation.z -= (nx - ball.position.x) * 2.5; ball.position.set(nx, BRW, nz); anim.cur = ball.position;
    if (anim.idx >= anim.pts.length - 1) { anim = null; if (SS) place(SS.V.g); }
  });
  function place(g) {
    g.ps.forEach((p, i) => { if (!balls[i] || (anim && anim.p === i)) return; const sunk = p.sunk; balls[i].visible = !!p.pos && !sunk; balls[i].position.copy(bpos(p.pos)); });
  }
  const camFocus = () => { const g = SS.V.g; if (anim && anim.cur) return anim.cur; const i = g.turn >= 0 ? g.turn : (SS.me >= 0 ? SS.me : 0); return balls[i] && balls[i].visible ? balls[i].position : new TH.Vector3(holeW.x, 0, holeW.z); };
  s.setViews({
    follow: { label: 'Behind ball', pos: [0, 5, 9], look: [0, 0, 0], fov: 52, sway: 0.01 },
    top: { label: 'Top', pos: [0, 19, 0.01], look: [0, 0, 0], up: [0, 0, -1], fov: 46 },
    course: { label: 'Course', pos: [0, 10, 13.5], look: [0, 0, 0.5], fov: 48 },
  }, 'follow', true);
  s.on(() => {
    if (s.view !== 'follow' || !builtHole < 0) { if (s.view !== 'follow') return; }
    const f = camFocus(), hole = new TH.Vector3(holeW.x, 0, holeW.z), d = hole.clone().sub(f); d.y = 0; const len = d.length(); if (len < 0.5) d.set(1, 0, 0); d.normalize();
    s.goto({ pos: [f.x - d.x * 5.6, 4.2, f.z - d.z * 5.6], look: [f.x + d.x * 3.2, 0.2, f.z + d.z * 3.2], fov: 52, sway: 0.01 });
  });
  s.on((dt, t) => {
    const g = SS.V.g;
    people.forEach((pp, i) => {
      const act = g.turn === i && !g.over, b = balls[i], tg = pp.userData.target;
      if (act && b && b.visible) {
        const hole = new TH.Vector3(holeW.x, 0, holeW.z), d = hole.clone().sub(b.position); d.y = 0; d.normalize();
        tg.set(b.position.x - d.z * 1.1 - d.x * 0.1, 0, b.position.z + d.x * 1.1 - d.z * 0.1);
      } else { const m = people.length; tg.set((i - (m - 1) / 2) * 2.3, 0, 6.3); }
      const dv = tg.clone().sub(pp.position), dist = dv.length();
      if (dist > 0.05) { pp.position.addScaledVector(dv.normalize(), Math.min(dist, dt * 4.5)); pp.userData.lookLocked = true; pp.rotation.y += (Math.atan2(dv.x, dv.z) - pp.rotation.y + Math.PI * 3) % (Math.PI * 2) * 0 + ((((Math.atan2(dv.x, dv.z) - pp.rotation.y) + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 8); }
      else {
        pp.userData.lookLocked = false; const face = act && b ? b.position : new TH.Vector3(0, 0, 0), a = Math.atan2(face.x - pp.position.x, face.z - pp.position.z);
        pp.rotation.y += ((((a - pp.rotation.y) + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 6);
      }
      pp.userData.arms.forEach(a => { a.rotation.x += ((act ? -0.9 : 0.05) - a.rotation.x) * Math.min(1, dt * 5); });
    });
  });
  const colX = new TH.Vector3();
  function paintAim() {
    const g = SS.V.g, me = g.ps[SS.me], on = !!(SS.turn && mAim && me && me.pos);
    ring.visible = on; dots.forEach(d => { d.visible = on; });
    if (!on) return;
    const a = bpos(me.pos), tx = wx(mAim.x), tz = wz(mAim.y); ring.position.set(tx, 0.06, tz);
    dots.forEach((d, i) => { const f = (i + 1) / dots.length; d.position.set(a.x + (tx - a.x) * f, 0.12, a.z + (tz - a.z) * f); });
    const pw = Math.round(toShot(me.pos, mAim.x, mAim.y).pw * 100);
    ring.material.color.setHSL(0.33 - 0.33 * pw / 100, 0.9, 0.55); dots.forEach(d => d.material.color.setHSL(0.33 - 0.33 * pw / 100, 0.9, 0.7));
    s.hint(`Power ${pw}%. Tap again to change, then press Hit ball.`);
  }
  s.onTap(e => {
    if (!SS || !SS.turn || !baseMesh) return; const h = s.pick(e, [baseMesh]); if (!h.length) return;
    const p = h[0].point; mAim = { x: (p.x - X0) / K, y: (p.z - Z0) / K }; draw(); paintAim();
  });
  s.sync = S2 => {
    SS = S2; const g = S2.V.g; ensure(g.ps.length);
    if (builtHole !== g.hole) { buildHole(g.hole); }
    if (firstSync) { firstSync = false; lastSeq = g.shot ? g.shot.seq : -1; }
    else if (g.shot && g.shot.seq !== lastSeq) { lastSeq = g.shot.seq; if (!anim) startAnim(g.shot); }
    place(g);
    people.forEach((pp, i) => { pp.visible = i < g.ps.length; pp.userData.lb.set(S2.nameOf(i) + (g.ps[i].sunk ? ' ✓' : ''), g.turn === i ? '#f2b441' : '#f7f0e1'); });
    if (!S2.turn) { s.hint(''); ring.visible = false; dots.forEach(d => { d.visible = false; }); } else if (!mAim) s.hint('Your stroke: tap the course to aim, then adjust the Power slider.');
    paintAim();
  };
  return s;
}

Club.register({
  id: 'minigolf', cat: 'aim', name: 'Mini Golf', tag: 'Three holes. Bank shots off the walls. Fewest strokes wins.', min: 1, max: 6, soloBots: 2, roundWord: 'Round',
  art: () => ['⛳', '●', '3'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> get your ball in the hole in the fewest strokes. Play three holes; the lowest total wins.</p>
    <ol><li>Everyone starts at the white tee circle. Players take turns, one stroke at a time, until every ball is in the hole.</li>
    <li>Tap the course to aim. The line goes from your ball to where you tapped. Then set the <b>Power slider</b> (or tap further away for a harder hit). Press <b>Hit ball</b>.</li>
    <li>The ball rolls and slows down. <b>Brown walls</b> make it bounce, so you can bank shots. <b>Sand</b> slows it quickly.</li>
    <li>The ball drops in only if it is rolling slowly enough. A fast ball skips over the hole.</li>
    <li>Balls do not bump into each other. If a ball is not in after ${MAXS} strokes, it scores ${MAXS + 1} for that hole.</li>
    <li>After three holes, the lowest total wins the pot. Ties share it. Each player puts in ${ANTE} free chips; chips have no cash value.</li></ol>`,
  round, view, ui, ui3d: T3.wrapUi(ui, { slot: st => ({ before: st.querySelector('#mgSvg'), hide: [st.querySelector('#mgSvg')] }), make: golf3d }), _test: { sim, botShot, HOLES, toShot },
});
})();
