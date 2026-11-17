/* ---------- Aiming games: Darts 101 and Archery. Free chips ---------- */
(function () {
const ANTE = 20;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const clampN = (v, a) => Math.max(-a, Math.min(a, v));
const okPt = x => x && typeof x.x === 'number' && typeof x.y === 'number' && Math.abs(x.x) <= 1.3 && Math.abs(x.y) <= 1.3;
function svgPoint(svg, e) { const r = svg.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width * 2.6 - 1.3), y: ((e.clientY - r.top) / r.height * 2.6 - 1.3) }; }
const arc = (r0, r1, a0, a1) => { const p = (r, a) => [(r * Math.sin(a)).toFixed(4), (-r * Math.cos(a)).toFixed(4)]; const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0); return `M${x0},${y0} A${r1},${r1} 0 0 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 0 0 ${x3},${y3} Z`; };

/* ======================= Darts ======================= */
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const R_BULL = 0.037, R_OB = 0.094, R_T0 = 0.582, R_T1 = 0.629, R_D0 = 0.953;
function dartScore(x, y) {
  const r = Math.hypot(x, y); if (r > 1) return { pts: 0, label: 'Miss' };
  if (r < R_BULL) return { pts: 50, label: 'Bullseye' };
  if (r < R_OB) return { pts: 25, label: 'Outer bull' };
  const ang = (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360, v = ORDER[Math.floor(((ang + 9) % 360) / 18)];
  if (r >= R_T0 && r < R_T1) return { pts: v * 3, label: `Triple ${v}` };
  if (r >= R_D0) return { pts: v * 2, label: `Double ${v}` };
  return { pts: v, label: `${v}` };
}
const aimFor = (v, m) => { const a = ORDER.indexOf(v) * 18 * Math.PI / 180, r = m === 3 ? (R_T0 + R_T1) / 2 : m === 2 ? 0.976 : 0.35; return { x: r * Math.sin(a), y: -r * Math.cos(a) }; };
function dartBotAim(rem) {
  if (rem > 60) return aimFor(20, 3);
  if (rem === 50) return { x: 0, y: 0 };
  if (rem <= 40 && rem % 2 === 0) return aimFor(rem / 2, 2);
  if (rem <= 20) return aimFor(rem, 1);
  return aimFor(rem > 40 ? rem - 40 : 20, rem > 40 ? 2 : 1);
}
async function dartRound(G, io) {
  const P = G.players, n = P.length, START = 101;
  const D = G.dt = { rem: P.map(() => START), turn: (G.round - 1) % n, darts: [], prev: [], over: false, winner: -1, bust: false, turns: 0 };
  io.render(); await io.sleep(500);
  while (!D.over) {
    const i = D.turn, p = P[i]; let cur = D.rem[i], bust = false; D.darts = []; D.bust = false;
    for (let k = 0; k < 3 && !D.over; k++) {
      io.render();
      const a = await io.turn(p, { dart: k + 1, rem: cur }, { auto: { t: 'throw', x: 0, y: 0 },
        validate: x => (x && x.t === 'throw' && okPt(x) ? { t: 'throw', x: x.x, y: x.y } : null),
        bot: () => { const t = dartBotAim(cur); return { t: 'throw', x: t.x, y: t.y }; }, think: 1100 + Math.random() * 500 });
      const sig = p.human ? 0.06 : 0.1 + (p.agg || 0.5) * 0.04;
      const x = clampN(a.x + gauss() * sig, 1.25), y = clampN(a.y + gauss() * sig, 1.25), s = dartScore(x, y);
      D.darts.push({ x, y, pts: s.pts, label: s.label });
      if (s.pts > cur) { bust = true; io.ev(p, `hits ${s.label} and goes bust`, `hit ${s.label} and go bust`); D.bust = true; io.render(); await io.sleep(1100); break; }
      cur -= s.pts; io.ev(p, `hits ${s.label}`, `hit ${s.label}`);
      if (cur === 0) { D.over = true; D.winner = i; }
      io.render(); await io.sleep(700);
    }
    if (!bust) D.rem[i] = cur;
    D.prev = D.darts; D.turns++;
    if (!D.over) { if (D.turns >= n * 15) { D.over = true; const low = Math.min(...D.rem); D.winner = D.rem.indexOf(low); } else D.turn = (i + 1) % n; }
    io.render(); await io.sleep(600);
  }
  settlePot(G, ANTE, [D.winner]); potSummary(G); io.render();
}
function dartView(G) {
  const D = G.dt;
  if (!D || D.rem.length !== G.players.length) return { rem: G.players.map(() => 101), turn: -1, darts: [], over: false, winner: -1, bust: false, delta: [] };
  return { rem: D.rem, turn: D.over ? -1 : D.turn, darts: D.darts, over: D.over, winner: D.winner, bust: D.bust, delta: G.players.map(p => (D.over ? p.delta || 0 : 0)) };
}
let SD = null, dAim = null;
function boardSVG() {
  let s = '<circle r="1.12" fill="#1d1626"/>';
  for (let k = 0; k < 20; k++) {
    const a0 = (k * 18 - 9) * Math.PI / 180, a1 = (k * 18 + 9) * Math.PI / 180, dark = k % 2 === 0;
    const single = dark ? '#1b1b1b' : '#efe3c4', ring = dark ? '#c4372e' : '#2e8b57';
    s += `<path d="${arc(R_OB, R_T0, a0, a1)}" fill="${single}"/><path d="${arc(R_T0, R_T1, a0, a1)}" fill="${ring}"/><path d="${arc(R_T1, R_D0, a0, a1)}" fill="${single}"/><path d="${arc(R_D0, 1, a0, a1)}" fill="${ring}"/>`;
    const am = k * 18 * Math.PI / 180; s += `<text x="${(1.075 * Math.sin(am)).toFixed(3)}" y="${(-1.075 * Math.cos(am) + 0.035).toFixed(3)}" text-anchor="middle" font-size="0.1" fill="#f7f0e1" font-weight="700">${ORDER[k]}</text>`;
  }
  return s + `<circle r="${R_OB}" fill="#2e8b57"/><circle r="${R_BULL}" fill="#c4372e"/>`;
}
const dartUI = {
  mount(stage, ctl) {
    dAim = null;
    stage.innerHTML = `<section class="table pz"><div class="bt-opps" id="dtSeats"></div><svg class="dart-svg" id="dtSvg" viewBox="-1.3 -1.3 2.6 2.6" role="img" aria-label="Dartboard"><g>${boardSVG()}</g><g id="dtDarts"></g><g id="dtAim"></g></svg><div class="pz-label" id="dtMsg"></div><div class="banner" id="dtBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="dtAct" hidden><div class="betrow"><button type="button" class="b gold" id="dtThrow" disabled>Throw dart</button></div><p class="hint bt-hint" id="dtHint"></p></div>`;
    $('dtSvg').onclick = e => { if (!SD || !SD.turn) return; dAim = svgPoint($('dtSvg'), e); drawAim(); };
    $('dtThrow').onclick = () => { if (SD.turn && dAim) { const a = dAim; dAim = null; drawAim(); SD.send({ t: 'throw', x: a.x, y: a.y }); } };
  },
  update(S) {
    SD = S; const V = S.V, g = V.g;
    if (!S.turn) dAim = null;
    $('dtSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, doing: 'Throwing…', extra: i => `${g.rem[i]} left` });
    $('dtDarts').innerHTML = g.darts.map((d, k) => `<g><circle cx="${d.x}" cy="${d.y}" r="0.028" fill="#f2b441" stroke="#000" stroke-width="0.01"/><text x="${d.x + 0.04}" y="${d.y - 0.04}" font-size="0.085" fill="#fff" stroke="#000" stroke-width="0.012" paint-order="stroke">${k + 1}</text></g>`).join('');
    $('dtMsg').textContent = g.darts.length ? `${g.darts.map(d => d.label).join(' · ')}${g.bust ? ' · Bust! Score unchanged' : ''}` : '';
    $('dtBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('dtAct').hidden = !S.turn; drawAim();
    $('dtHint').textContent = S.turn ? `Dart ${S.turn.data.dart} of 3. You need ${S.turn.data.rem}. Tap the board where you want to aim, then press Throw. Your dart lands close to your aim, not exactly on it.` : '';
    return '';
  },
};
function drawAim() { $('dtAim').innerHTML = dAim ? `<g stroke="#fff" stroke-width="0.012"><circle cx="${dAim.x}" cy="${dAim.y}" r="0.05" fill="none"/><line x1="${dAim.x - 0.09}" y1="${dAim.y}" x2="${dAim.x + 0.09}" y2="${dAim.y}"/><line x1="${dAim.x}" y1="${dAim.y - 0.09}" x2="${dAim.x}" y2="${dAim.y + 0.09}"/></g>` : ''; if ($('dtThrow')) $('dtThrow').disabled = !(SD && SD.turn && dAim); }

/* ----- 3D pub: dartboard on the wall ----- */
function makeDart(col) {
  const TH = THREE, g = new TH.Group(), steel = T3.mat('#c9ccd2', { metalness: 0.8, roughness: 0.25 }), tung = T3.mat('#6d7078', { metalness: 0.7, roughness: 0.3 });
  const tip = T3.mk(g, new TH.ConeGeometry(0.014, 0.18, 8), steel, 0, 0, 0.09, { noCast: true }); tip.rotation.x = -Math.PI / 2;
  const bar = T3.mk(g, T3.CYL(0.032, 0.026, 0.36, 12), tung, 0, 0, 0.36, { noCast: true }); bar.rotation.x = Math.PI / 2;
  const sh = T3.mk(g, T3.CYL(0.014, 0.014, 0.22, 8), T3.mat('#222'), 0, 0, 0.65, { noCast: true }); sh.rotation.x = Math.PI / 2;
  const fm = T3.mat(col, { side: TH.DoubleSide, roughness: 0.6 });
  for (const r of [0, Math.PI / 2]) { const f = T3.mk(g, T3.BOX(0.24, 0.002, 0.2), fm, 0, 0, 0.84, { noCast: true }); f.rotation.z = r; }
  return g;
}
function darts3d(box, S) {
  const TH = THREE, s = T3.stage(box, { fov: 40 }), sc = s.scene, Y0 = 1.9;
  T3.lounge(s, { w: 14, d: 16, cz: 7.4, lamps: [[-4.5, 3], [4.5, 3]], lampPower: 0.7, ambient: 0.5, wall: '#4a2a1c', bg: 0x0e0812 });
  const bg = new TH.Group(); bg.position.y = Y0; sc.add(bg);
  T3.mk(bg, T3.BOX(3.6, 3.6, 0.3), T3.mat('#2a1810', { roughness: 0.5 }), 0, 0, -0.35);
  for (const [x, y, w, h] of [[0, 1.85, 3.9, 0.16], [0, -1.85, 3.9, 0.16], [-1.85, 0, 0.16, 3.9], [1.85, 0, 0.16, 3.9]]) T3.mk(bg, T3.BOX(w, h, 0.34), T3.mat('#5a3a1e', { roughness: 0.4 }), x, y, -0.3);
  T3.mk(bg, new TH.CylinderGeometry(1.24, 1.24, 0.12, 64), T3.mat('#111'), 0, 0, -0.08).rotation.x = Math.PI / 2;
  const N = 1024, u = N / 2 / 1.2;
  const tex = T3.canvasTex(N, N, c => {
    const cx = N / 2; c.fillStyle = '#0d0d0d'; c.beginPath(); c.arc(cx, cx, 1.2 * u, 0, 7); c.fill();
    const wedge = (r0, r1, a0, a1, col) => { c.beginPath(); c.arc(cx, cx, r1 * u, a0, a1); c.arc(cx, cx, r0 * u, a1, a0, true); c.closePath(); c.fillStyle = col; c.fill(); };
    for (let k = 0; k < 20; k++) {
      const a0 = (k * 18 - 9 - 90) * Math.PI / 180, a1 = (k * 18 + 9 - 90) * Math.PI / 180, dark = k % 2 === 0, single = dark ? '#1b1b1b' : '#efe3c4', rc = dark ? '#c4372e' : '#2e8b57';
      wedge(R_OB, R_T0, a0, a1, single); wedge(R_T0, R_T1, a0, a1, rc); wedge(R_T1, R_D0, a0, a1, single); wedge(R_D0, 1, a0, a1, rc);
      c.strokeStyle = '#b9b9b9'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx + Math.cos(a0) * R_OB * u, cx + Math.sin(a0) * R_OB * u); c.lineTo(cx + Math.cos(a0) * u, cx + Math.sin(a0) * u); c.stroke();
      const am = k * 18 * Math.PI / 180; c.fillStyle = '#f7f0e1'; c.font = '700 84px Figtree, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(ORDER[k]), cx + Math.sin(am) * 1.095 * u, cx - Math.cos(am) * 1.095 * u);
    }
    c.fillStyle = '#2e8b57'; c.beginPath(); c.arc(cx, cx, R_OB * u, 0, 7); c.fill(); c.fillStyle = '#c4372e'; c.beginPath(); c.arc(cx, cx, R_BULL * u, 0, 7); c.fill();
    c.strokeStyle = '#b9b9b9'; c.lineWidth = 2; for (const r of [R_OB, R_BULL, R_T0, R_T1, R_D0, 1]) { c.beginPath(); c.arc(cx, cx, r * u, 0, 7); c.stroke(); }
  });
  const face = T3.mk(bg, new TH.CircleGeometry(1.2, 64), new TH.MeshStandardMaterial({ map: tex, roughness: 0.85 }), 0, 0, -0.015, { noCast: true });
  const hitPlane = T3.mk(bg, new TH.CircleGeometry(2.4, 24), new TH.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0, 0, 0.05, { noCast: true, noRecv: true });
  const sp = new TH.SpotLight(0xfff0d0, 1.5, 22, 0.55, 0.5, 1.2); sp.position.set(0, 4.8, 4.5); sp.target.position.set(0, Y0, 0); sc.add(sp, sp.target);
  T3.mk(sc, T3.BOX(2.4, 0.03, 0.12), T3.mat('#e8e0c8'), 0, 0.015, 7.5, { noCast: true });   // the oche
  const sign = T3.label('DARTS', { scale: 3, bg: 'rgba(120,20,20,.85)' }); sign.sprite.position.set(0, Y0 + 2.6, -0.4); sc.add(sign.sprite);
  // crosshair
  const ch = new TH.Group(); bg.add(ch); ch.position.z = 0.16; ch.visible = false;
  const cm = new TH.MeshBasicMaterial({ color: 0xffffff, depthTest: false }); const rr = T3.mk(ch, new TH.TorusGeometry(0.08, 0.012, 6, 24), cm, 0, 0, 0, { noCast: true }); rr.renderOrder = 5;
  for (const r of [0, Math.PI / 2]) { const b = T3.mk(ch, T3.BOX(0.26, 0.01, 0.01), cm, 0, 0, 0, { noCast: true }); b.rotation.z = r; b.renderOrder = 5; }
  // people
  const people = [], tags = []; let nP = 0;
  function ensure(n) {
    while (nP < n) { const i = nP++, pp = T3.person(PCOL[i % 6], { idx: i }); pp.scale.setScalar(1.15); sc.add(pp); s.addPerson(pp); people.push(pp); const lb = T3.label('', { scale: 2.2 }); lb.sprite.position.y = 2.1; lb.sprite.scale.multiplyScalar(1 / 1.15); pp.add(lb.sprite); tags.push(lb); pp.userData.target = new TH.Vector3(0, 0, 9); pp.position.set(-5, 0, 9); pp.rotation.y = Math.PI; }
  }
  // held dart and hand, shown only in the aim view on your turn
  sc.add(s.camera);
  const held = new TH.Group(); s.camera.add(held); held.position.set(0.3, -0.42, -1.1); held.rotation.set(0.05, -0.1, 0); held.visible = false;
  const hd = makeDart('#f2b441'); held.add(hd); hd.position.z = -0.1;
  const hand = T3.mk(held, T3.SPH(0.085, 12), T3.mat('#e5b48a'), 0, -0.03, 0.34, { noCast: true }); hand.scale.set(1, 0.9, 1.5);
  const arm = T3.mk(held, T3.CYL(0.07, 0.09, 1.4, 10), T3.mat('#3f8be8'), 0.1, -0.35, 1.0, { noCast: true }); arm.rotation.x = 1.15; arm.rotation.z = -0.15;
  const mkViews = () => ({
    aim: { label: 'Aim', pos: [0, Y0, 4.4], look: [0, Y0, 0], fov: 38, sway: 0.006 },
    room: { label: 'Room', pos: [-4.6, 2.7, 12.6], look: [0, 1.6, 2.2], fov: 46 },
    side: { label: 'Side', pos: [7.2, Y0 + 0.3, 4.6], look: [0, Y0 - 0.2, 2.4], fov: 42 },
  });
  s.setViews(mkViews(), 'aim', true);
  const darts = []; let shown = 0, firstSync = true, SS = S, lastTurn = 0, hadTurn = false;
  function land(d, col, instant, who) {
    const g = makeDart(col); bg.add(g); darts.push(g);
    const T = new TH.Vector3(d.x, -d.y, 0.0), a = new TH.Vector3(0.45 + (who || 0) * 0.02, -0.4, 7.2), dir = T.clone().sub(a).normalize();
    g.quaternion.setFromUnitVectors(new TH.Vector3(0, 0, 1), dir.clone().negate());
    if (instant) { g.position.copy(T); return; }
    s.tween(430, (k, e) => { g.position.set(a.x + (T.x - a.x) * e, a.y + (T.y - a.y) * e + Math.sin(Math.PI * e) * 0.6, a.z + (T.z - a.z) * e); }, () => g.position.copy(T));
    const pp = people[who]; if (pp) { const ar = pp.userData.arms[1]; s.tween(260, k => { ar.rotation.x = -1.4 - Math.sin(Math.PI * k) * 0.8; }); }
  }
  function clear() { darts.forEach(d => bg.remove(d)); darts.length = 0; shown = 0; }
  s.onTap(e => {
    if (!SS || !SS.turn) return; const h = s.pick(e, [hitPlane]); if (!h.length) return;
    const p = bg.worldToLocal(h[0].point.clone()); dAim = { x: p.x, y: -p.y }; drawAim(); paint();
  });
  function paint() { ch.visible = !!(dAim && SS && SS.turn); if (dAim) ch.position.set(dAim.x, -dAim.y, 0.16); s.hint(SS && SS.turn ? (dAim ? 'Press Throw dart. Your dart lands close to the cross.' : 'Your throw: tap the board where you want to aim.') : ''); }
  s.on((dt, t) => {
    const g = SS.V.g;
    people.forEach((pp, i) => {
      const act = g.turn === i && !g.over, tg = pp.userData.target; if (act) tg.set(0, 0, 8.2); else tg.set(-3.4 + i * 1.15 + (i > 2 ? 0.3 : 0), 0, 9.4);
      const dv = tg.clone().sub(pp.position), dist = dv.length(); if (dist > 0.03) pp.position.addScaledVector(dv.normalize(), Math.min(dist, dt * 3.5));
      pp.rotation.y += (((Math.PI - pp.rotation.y) + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 6);
      const ar = pp.userData.arms[1]; if (!ar.userData.busy) ar.rotation.x += ((act ? -1.4 : 0.05) - ar.rotation.x) * Math.min(1, dt * 5);
    });
    held.visible = !!SS.turn && s.view === 'aim'; held.position.y = -0.42 + Math.sin(t * 1.6) * 0.012; held.position.x = 0.3 + Math.cos(t * 1.1) * 0.01;
  });
  s.onView = n => { people.forEach((pp, i) => { pp.visible = !(n === 'aim' && i === SS.me && SS.turn); }); };
  s.sync = S2 => {
    SS = S2; const g = S2.V.g; ensure(g.ps ? S2.V.seats.length : 0);
    if (g.turn >= 0) lastTurn = g.turn;
    if (g.darts.length < shown) clear();
    for (let k = shown; k < g.darts.length; k++) land(g.darts[k], PCOL[lastTurn % 6], firstSync, lastTurn);
    shown = g.darts.length; firstSync = false;
    if (!S2.turn) dAim = null;
    people.forEach((pp, i) => { tags[i].set(S2.nameOf(i) + ' · ' + g.rem[i], g.turn === i ? '#f2b441' : '#f7f0e1'); });
    s.onView(s.view); paint();
  };
  return s;
}

Club.register({
  id: 'darts', cat: 'aim', name: 'Darts 101', tag: 'Aim, throw and count down from 101 to exactly zero.', min: 1, max: 6, soloBots: 1, roundWord: 'Game',
  art: () => ['20', '◎', '3'].map(c => `<div class="ltile num">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> be the first to bring your score from 101 down to exactly zero.</p>
    <ol><li>Everyone starts on 101. On your turn you throw <b>three darts</b>.</li>
    <li>Tap the dartboard to place your aim (a crosshair appears; tap again to move it), then press <b>Throw dart</b>. Your dart lands <b>near</b> your aim, with a little wobble, so aim carefully.</li>
    <li>The score of each dart is taken off your total. The outer thin ring counts <b>double</b>, the inner thin ring counts <b>triple</b>, the small green ring is 25 and the red centre is 50.</li>
    <li>You must finish on <b>exactly zero</b>. If a dart takes you below zero, you <b>bust</b>: your score goes back to what it was at the start of your turn.</li>
    <li>First to zero wins the pot. If nobody finishes after 15 turns each, the lowest score wins.</li>
    <li>Each player puts in ${ANTE} free chips. Chips have no cash value.</li></ol>`,
  round: dartRound, view: dartView, ui: dartUI, ui3d: T3.wrapUi(dartUI, { slot: st => ({ before: st.querySelector('#dtSvg'), hide: [st.querySelector('#dtSvg')] }), make: darts3d }), _test: { dartScore, dartBotAim },
});

/* ======================= Archery ======================= */
const ENDS = 3, PER_END = 3;
const ring = (x, y) => { const r = Math.hypot(x, y); return r >= 1 ? 0 : 10 - Math.floor(r / 0.1); };
async function archRound(G, io) {
  const P = G.players, n = P.length;
  const A = G.ar = { score: P.map(() => 0), shots: [], turn: -1, wind: { dx: 0, dy: 0 }, end: 0, arrow: 0, over: false, winners: [], last: null };
  io.render(); await io.sleep(500);
  for (let e = 1; e <= ENDS; e++) for (let k = 1; k <= PER_END; k++) {
    for (let i = 0; i < n; i++) {
      const p = P[i]; A.end = e; A.arrow = k; A.turn = i;
      A.wind = { dx: +(clampN(gauss() * 0.09, 0.2)).toFixed(3), dy: +(clampN(gauss() * 0.05, 0.12)).toFixed(3) }; io.render();
      const a = await io.turn(p, { end: e, arrow: k, wind: A.wind }, { auto: { t: 'shoot', x: -A.wind.dx, y: -A.wind.dy },
        validate: x => (x && x.t === 'shoot' && okPt(x) ? { t: 'shoot', x: x.x, y: x.y } : null),
        bot: () => ({ t: 'shoot', x: -A.wind.dx * (0.5 + Math.random() * 0.5), y: -A.wind.dy * (0.5 + Math.random() * 0.5) }), think: 1100 + Math.random() * 500 });
      const sig = p.human ? 0.045 : 0.075 + (p.agg || 0.5) * 0.03;
      const x = clampN(a.x + A.wind.dx + gauss() * sig, 1.25), y = clampN(a.y + A.wind.dy + gauss() * sig, 1.25), pts = ring(x, y);
      A.score[i] += pts; A.shots.push({ p: i, x, y, pts }); A.last = { p: i, pts };
      io.ev(p, pts ? `scores ${pts}` : 'misses the target', pts ? `score ${pts}` : 'miss the target');
      io.render(); await io.sleep(900);
    }
  }
  A.turn = -1; A.over = true; const top = Math.max(...A.score); A.winners = A.score.map((s, i) => (s === top ? i : -1)).filter(i => i >= 0);
  settlePot(G, ANTE, A.winners); potSummary(G);
  io.line(`Scores: ${P.map((p, i) => `${p.human ? 'player ' + (i + 1) : p.name} ${A.score[i]}`).join(', ')}.`, true); io.render();
}
function archView(G) {
  const A = G.ar;
  if (!A || A.score.length !== G.players.length) return { score: G.players.map(() => 0), shots: [], turn: -1, wind: { dx: 0, dy: 0 }, end: 0, arrow: 0, over: false, winners: [], last: null, delta: [] };
  return { score: A.score, shots: A.shots, turn: A.turn, wind: A.wind, end: A.end, arrow: A.arrow, over: A.over, winners: A.winners, last: A.last, delta: G.players.map(p => (A.over ? p.delta || 0 : 0)) };
}
const RING_COL = ['#f7f0e1', '#f7f0e1', '#1d1626', '#1d1626', '#3f8be8', '#3f8be8', '#e0443c', '#e0443c', '#f2b441', '#f2b441'];
const PCOL = ['#f2b441', '#f7f0e1', '#5cc8b0', '#e8708a', '#a063d8', '#8ab4ff'];
let SA = null, aAim = null;
const archUI = {
  mount(stage, ctl) {
    aAim = null;
    let t = ''; for (let k = 0; k < 10; k++) t += `<circle r="${(1 - k * 0.1).toFixed(2)}" fill="${RING_COL[k]}" stroke="${k > 1 && k < 4 ? '#f7f0e1' : '#000'}" stroke-width="0.006"/>`;
    stage.innerHTML = `<section class="table pz"><div class="bt-opps" id="arSeats"></div><div class="ar-wind" id="arWind"></div><svg class="dart-svg" id="arSvg" viewBox="-1.3 -1.3 2.6 2.6" role="img" aria-label="Archery target"><rect x="-1.3" y="-1.3" width="2.6" height="2.6" fill="#3a6b45" rx="0.1"/>${t}<g id="arShots"></g><g id="arAim"></g></svg><div class="banner" id="arBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="arAct" hidden><div class="betrow"><button type="button" class="b gold" id="arGo" disabled>Release arrow</button></div><p class="hint bt-hint" id="arHint"></p></div>`;
    $('arSvg').onclick = e => { if (!SA || !SA.turn) return; aAim = svgPoint($('arSvg'), e); drawA(); };
    $('arGo').onclick = () => { if (SA.turn && aAim) { const a = aAim; aAim = null; drawA(); SA.send({ t: 'shoot', x: a.x, y: a.y }); } };
  },
  update(S) {
    SA = S; const V = S.V, g = V.g;
    if (!S.turn) aAim = null;
    $('arSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, doing: 'Aiming…', extra: i => `${g.score[i]} points` });
    const w = g.wind, rd = Math.round(Math.abs(w.dx) / 0.1 * 10) / 10, rv = Math.round(Math.abs(w.dy) / 0.1 * 10) / 10;
    $('arWind').textContent = g.over ? '' : g.turn >= 0 ? `End ${g.end} of ${ENDS}, arrow ${g.arrow} of ${PER_END}. Wind pushes the arrow ${rd ? rd + ' ring' + (rd === 1 ? '' : 's') + (w.dx > 0 ? ' right' : ' left') : 'nowhere sideways'}${rv ? ' and ' + rv + (w.dy > 0 ? ' down' : ' up') : ''}.` : '';
    $('arShots').innerHTML = g.shots.map((s, k) => `<circle cx="${s.x}" cy="${s.y}" r="0.03" fill="${PCOL[s.p % 6]}" stroke="#000" stroke-width="0.01"${k === g.shots.length - 1 ? ' class="ar-last"' : ''}/>`).join('');
    $('arBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : (g.last && g.turn >= 0 ? `<span>${S.nameOf(g.last.p)} scored ${g.last.pts}</span>` : '');
    $('arAct').hidden = !S.turn; drawA();
    $('arHint').textContent = S.turn ? 'Tap the target where you want to aim. The wind will push your arrow, so aim the opposite way to cancel it. Then press Release arrow.' : '';
    return '';
  },
};
function drawA() { $('arAim').innerHTML = aAim ? `<g stroke="#fff" stroke-width="0.012"><circle cx="${aAim.x}" cy="${aAim.y}" r="0.05" fill="none"/><line x1="${aAim.x - 0.09}" y1="${aAim.y}" x2="${aAim.x + 0.09}" y2="${aAim.y}"/><line x1="${aAim.x}" y1="${aAim.y - 0.09}" x2="${aAim.x}" y2="${aAim.y + 0.09}"/></g>` : ''; if ($('arGo')) $('arGo').disabled = !(SA && SA.turn && aAim); }

/* ----- 3D range: target in a field ----- */
function makeArrow(col) {
  const TH = THREE, g = new TH.Group();
  T3.mk(g, T3.CYL(0.016, 0.016, 1.5, 6), T3.mat('#d9b27a'), 0, 0, 0.75, { noCast: true }).rotation.x = Math.PI / 2;
  const tip = T3.mk(g, new TH.ConeGeometry(0.03, 0.13, 8), T3.mat('#999', { metalness: 0.7 }), 0, 0, 0.0, { noCast: true }); tip.rotation.x = -Math.PI / 2;
  const fm = T3.mat(col, { side: TH.DoubleSide });
  for (const r of [0, 2.09, 4.18]) { const f = T3.mk(g, T3.BOX(0.001, 0.09, 0.28), fm, 0, 0, 1.38, { noCast: true }); f.rotation.z = r; f.position.y = Math.sin(r) * 0.0; }
  return g;
}
function archery3d(box, S) {
  const TH = THREE, s = T3.stage(box, { fov: 28 }), sc = s.scene, TY = 1.6, TR = 1.5;
  T3.outdoor(s, { r: 90, treeR: 32, trees: 34, shadow: 18, cz: 6, fogNear: 45, fogFar: 120 });
  const hay = T3.canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#d6b45a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { c.strokeStyle = `rgba(${120 + Math.random() * 90},${90 + Math.random() * 60},30,.5)`; c.beginPath(); const x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); c.lineTo(x + Math.random() * 18 - 9, y + Math.random() * 6 - 3); c.stroke(); } });
  T3.mk(sc, T3.BOX(5.6, 4.4, 0.9), T3.mat('#fff', { map: hay, roughness: 1 }), 0, 2.2, -0.7);
  for (const x of [-3.6, 3.6]) T3.mk(sc, T3.BOX(0.3, 3.2, 0.3), T3.mat('#6b4423'), x, 1.6, -0.2);
  for (const a of [-0.6, 0, 0.6]) { const l = T3.mk(sc, T3.CYL(0.05, 0.05, 2.2, 6), T3.mat('#5a3a1e'), a * 1.2, 0.8, 0.25); l.rotation.x = 0.35; }
  const tex = T3.canvasTex(512, 512, c => { const cx = 256, u = 256; for (let k = 0; k < 10; k++) { c.fillStyle = RING_COL[k]; c.beginPath(); c.arc(cx, cx, (1 - k * 0.1) * u, 0, 7); c.fill(); c.strokeStyle = (k > 1 && k < 4) ? '#f7f0e1' : '#222'; c.lineWidth = 2; c.stroke(); } });
  T3.mk(sc, new TH.CircleGeometry(TR, 48), new TH.MeshStandardMaterial({ map: tex, roughness: 0.9 }), 0, TY, 0.02, { noCast: true });
  T3.mk(sc, new TH.CylinderGeometry(TR + 0.04, TR + 0.04, 0.12, 48), T3.mat('#3a2410'), 0, TY, -0.05).rotation.x = Math.PI / 2;
  const hit = T3.mk(sc, new TH.CircleGeometry(2.4, 24), new TH.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0, TY, 0.08, { noCast: true, noRecv: true });
  T3.mk(sc, T3.BOX(14, 0.02, 0.14), T3.mat('#f2f2f2'), 0, 0.01, 12.5, { noCast: true });
  const dist = T3.label('18 m', { scale: 2 }); dist.sprite.position.set(-5, 1.5, 12.5); sc.add(dist.sprite); T3.mk(sc, T3.CYL(0.05, 0.05, 1.2, 6), T3.mat('#5a3a1e'), -5, 0.6, 12.5);
  // wind socks
  const socks = [];
  for (const [x, z] of [[-4.8, 5], [4.8, 9.5]]) {
    T3.mk(sc, T3.CYL(0.04, 0.05, 3.4, 8), T3.mat('#ddd'), x, 1.7, z);
    const piv = new TH.Group(); piv.position.set(x, 3.4, z); sc.add(piv);
    const cone = T3.mk(piv, new TH.CylinderGeometry(0.09, 0.28, 1.5, 12, 1, true), T3.mat('#ff7a2b', { side: TH.DoubleSide }), 0.75, 0, 0, { noCast: true }); cone.rotation.z = Math.PI / 2; socks.push(piv);
  }
  const ch = new TH.Group(); sc.add(ch); ch.position.z = 0.1; ch.visible = false;
  const cm = new TH.MeshBasicMaterial({ color: 0xffffff, depthTest: false }); const rr = T3.mk(ch, new TH.TorusGeometry(0.07, 0.012, 6, 24), cm, 0, 0, 0, { noCast: true }); rr.renderOrder = 5;
  for (const r of [0, Math.PI / 2]) { const b = T3.mk(ch, T3.BOX(0.24, 0.01, 0.01), cm, 0, 0, 0, { noCast: true }); b.rotation.z = r; b.renderOrder = 5; }
  const people = [], tags = []; let nP = 0;
  const ax = (i, n) => (i - (n - 1) / 2) * 2.3;
  function ensure(n) {
    while (nP < n) {
      const i = nP++, pp = T3.person(PCOL[i % 6], { idx: i }); pp.scale.setScalar(1.15); sc.add(pp); s.addPerson(pp); people.push(pp);
      const bow = T3.mk(pp, new TH.TorusGeometry(0.55, 0.025, 6, 20, 2.0), T3.mat('#5a3a1e'), -0.3, 1.35, 0.45); bow.rotation.set(0, Math.PI / 2, -1.0);
      const lb = T3.label('', { scale: 2.2 }); lb.sprite.position.y = 2.1; lb.sprite.scale.multiplyScalar(1 / 1.15); pp.add(lb.sprite); tags.push(lb);
      pp.position.set(ax(i, S.V.seats.length), 0, 13); pp.rotation.y = Math.PI;
    }
  }
  // first-person bow, visible in the aim view on your turn
  sc.add(s.camera);
  const fp = new TH.Group(); s.camera.add(fp); fp.visible = false;
  const bowFp = T3.mk(fp, new TH.TorusGeometry(0.9, 0.03, 6, 24, 2.0), T3.mat('#5a3a1e'), -0.55, -0.1, -0.7, { noCast: true }); bowFp.rotation.set(0, Math.PI / 2, -1.0);
  T3.mk(fp, T3.CYL(0.004, 0.004, 1.52, 4), new TH.MeshBasicMaterial({ color: 0xf0f0f0 }), -0.55, -0.1, -1.19, { noCast: true });
  const nock = makeArrow('#f2b441'); nock.position.set(-0.5, -0.1, -2.6); fp.add(nock);
  const handFp = T3.mk(fp, T3.SPH(0.09, 10), T3.mat('#e5b48a'), -0.55, -0.1, -0.95, { noCast: true });
  s.setViews({
    aim: { label: 'Aim', pos: [0, 1.55, 12.2], look: [0, TY, 0], fov: 26, sway: 0.005 },
    range: { label: 'Range', pos: [-6.5, 2.6, 17.5], look: [0, 1.5, 4], fov: 44 },
    side: { label: 'Side', pos: [8.8, 1.9, 6.5], look: [0, 1.5, 6], fov: 40 },
  }, 'aim', true);
  const arrows = []; let shown = 0, firstSync = true, SS = S;
  const landPos = sh => new TH.Vector3(sh.x * TR, TY - sh.y * TR, 0.03);
  function land(sh, instant, n) {
    const g = makeArrow(PCOL[sh.p % 6]); sc.add(g); arrows.push(g);
    const T = landPos(sh), a = new TH.Vector3(ax(sh.p, n) + 0.1, 1.45, 12.1), mid = T.clone().add(a).multiplyScalar(0.5);
    const posAt = e => new TH.Vector3(a.x + (T.x - a.x) * e, a.y + (T.y - a.y) * e + Math.sin(Math.PI * e) * 1.4, a.z + (T.z - a.z) * e);
    const face = e => { const d = posAt(Math.min(1, e + 0.02)).sub(posAt(Math.max(0, e - 0.02))).normalize(); g.quaternion.setFromUnitVectors(new TH.Vector3(0, 0, 1), d.negate()); };
    if (instant) { g.position.copy(T); face(1); return; }
    s.tween(720, (k, e) => { g.position.copy(posAt(e)); face(e); }, () => { g.position.copy(T); face(1); });
    const pp = people[sh.p]; if (pp) { const ar = pp.userData.arms[1]; s.tween(300, k => { ar.rotation.x = -1.5 + Math.sin(Math.PI * k) * 0.7; }); }
  }
  s.onTap(e => {
    if (!SS || !SS.turn) return; const h = s.pick(e, [hit]); if (!h.length) return;
    const p = h[0].point; aAim = { x: p.x / TR, y: (TY - p.y) / TR }; drawA(); paint();
  });
  function paint() { ch.visible = !!(aAim && SS && SS.turn); if (aAim) ch.position.set(aAim.x * TR, TY - aAim.y * TR, 0.1); s.hint(SS && SS.turn ? (aAim ? 'Press Release arrow. The wind will push your arrow.' : 'Look at the wind socks, then tap the target where you want to aim.') : ''); }
  s.on((dt, t) => {
    const g = SS.V.g, w = g.wind || { dx: 0, dy: 0 }, str = Math.min(1, Math.abs(w.dx) / 0.12);
    socks.forEach((p, i) => { p.rotation.y = w.dx >= 0 ? 0 : Math.PI; p.rotation.z = -(1 - str) * 1.25 + Math.sin(t * 7 + i) * 0.05 * (0.3 + str); });
    people.forEach((pp, i) => { const act = g.turn === i && !g.over, ar = pp.userData.arms; const v = act ? -1.45 : 0.05; ar[0].rotation.x += (v - ar[0].rotation.x) * Math.min(1, dt * 5); if (!act) ar[1].rotation.x += (0.05 - ar[1].rotation.x) * Math.min(1, dt * 5); else if (!s.tweens.length) ar[1].rotation.x += (-1.45 - ar[1].rotation.x) * Math.min(1, dt * 5); });
    fp.visible = !!SS.turn && s.view === 'aim'; fp.position.y = Math.sin(t * 1.3) * 0.01;
  });
  s.onView = n => { people.forEach((pp, i) => { pp.visible = !(n === 'aim' && i === SS.me && SS.turn); }); };
  s.sync = S2 => {
    SS = S2; const g = S2.V.g, n = S2.V.seats.length; ensure(n);
    if (g.shots.length < shown) { arrows.forEach(a => sc.remove(a)); arrows.length = 0; shown = 0; }
    for (let k = shown; k < g.shots.length; k++) land(g.shots[k], firstSync, n);
    shown = g.shots.length; firstSync = false;
    if (!S2.turn) aAim = null;
    people.forEach((pp, i) => { tags[i].set(S2.nameOf(i) + ' · ' + g.score[i], g.turn === i ? '#f2b441' : '#f7f0e1'); });
    s.onView(s.view); paint();
  };
  return s;
}

Club.register({
  id: 'archery', cat: 'aim', name: 'Archery', tag: 'Read the wind and put your arrows in the gold.', min: 1, max: 6, soloBots: 1, roundWord: 'Match',
  art: () => ['◎', '➶', '10'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> score the most points with your arrows. Each player shoots ${ENDS * PER_END} arrows.</p>
    <ol><li>A round target has ten rings. The gold centre scores 10, the outer white ring scores 1, and missing the target scores 0.</li>
    <li>Players take turns shooting one arrow at a time. For each arrow, a new <b>wind</b> is shown above the target: how far it will push your arrow left, right, up or down.</li>
    <li>Tap the target to place your aim, then press <b>Release arrow</b>. The wind pushes your arrow, and it lands with a little wobble. Aim <b>against</b> the wind to cancel it out: if the wind pushes 2 rings right, aim 2 rings left of the centre.</li>
    <li>Your arrows stay on the target, shown in your colour.</li>
    <li>After ${ENDS * PER_END} arrows each, the highest total wins the pot. Ties share it.</li>
    <li>Each player puts in ${ANTE} free chips. Chips have no cash value.</li></ol>`,
  round: archRound, view: archView, ui: archUI, ui3d: T3.wrapUi(archUI, { slot: st => ({ before: st.querySelector('#arSvg'), hide: [st.querySelector('#arSvg')] }), make: archery3d }), _test: { ring },
});
})();
