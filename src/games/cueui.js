/* ---------- Pool and Carrom: screens (flat view plus 3D table) and registration ---------- */
(() => {
  const BCOL = ['#fff', '#f2c230', '#2b5fd6', '#d63b2b', '#7a3fb8', '#ec7a1f', '#2e9b4a', '#8a2a2a', '#16161c'];
  const ballCol = id => BCOL[id === 0 ? 0 : id === 8 ? 8 : ((id - 1) % 8) + 1 > 7 ? 7 : ((id - 1) % 8) + 1];
  const colOf = id => (id === 0 ? '#fff' : id === 8 ? '#16161c' : BCOL[id > 8 ? id - 8 : id]);
  const PCOL = ['#f2b441', '#f7f0e1'];

  /* shared: play the recorded frames on a flat screen */
  function player(st, redraw) {
    return shot => {
      if (!shot || shot.seq === st.seq) return; st.seq = shot.seq; clearInterval(st.timer); let k = 0;
      st.timer = setInterval(() => {
        if (k >= shot.frames.length) { clearInterval(st.timer); st.anim = null; redraw(); return; }
        st.anim = shot.frames[k++]; redraw();
      }, 66);
    };
  }
  const pt = (svg, e, vb) => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * vb.w + vb.x, y: (e.clientY - r.top) / r.height * vb.h + vb.y }; };

  /* ===================== Pool ===================== */
  const VB = { x: -4, y: -4, w: 108, h: 58 };
  const poolSt = { aim: null, place: null, pw: 0.6, anim: null, seq: -1, timer: null, S: null };
  function poolPositions(g) { if (poolSt.anim) { const f = poolSt.anim; return g.balls.map((b, i) => ({ id: b.id, alive: f[2 * i] >= 0, x: f[2 * i] / 10, y: f[2 * i + 1] / 10 })); } return g.balls; }
  const poolPlay = player(poolSt, () => poolUI.draw());
  const poolUI = {
    st: poolSt,
    tap(x, y) {
      const S = poolSt.S; if (!S || !S.turn) return; const g = S.V.g;
      if (S.turn.data.inHand && !poolSt.place) { if (CUE.freeSpot(g.balls, x, y, 0)) poolSt.place = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }; }
      else poolSt.aim = { x, y };
      poolUI.update(S);
    },
    draw() {
      const S = poolSt.S; if (!S || !$('plSvg')) return; const g = S.V.g, P = poolPositions(g), my = S.turn;
      let s = `<rect x="-4" y="-4" width="108" height="58" rx="3" fill="#5a3418"/><rect x="0" y="0" width="100" height="50" fill="#1f7a4a"/>` +
        CUE.PT.pk.map(p => `<circle cx="${p.x}" cy="${p.y}" r="${p.r - 0.3}" fill="#0b0b0f"/>`).join('') +
        `<line x1="25" y1="1" x2="25" y2="49" stroke="#fff" stroke-opacity=".12" stroke-width=".3"/>`;
      const cue = P[0], place = my && my.data.inHand ? poolSt.place : null;
      P.forEach((b, i) => {
        if (!b.alive && !(i === 0 && place)) return; const x = i === 0 && place ? place.x : b.x, y = i === 0 && place ? place.y : b.y, id = b.id;
        s += `<circle cx="${x}" cy="${y}" r="${CUE.BR}" fill="${id > 8 ? '#fbf6ea' : colOf(id)}" stroke="#000" stroke-opacity=".4" stroke-width=".2"/>`;
        if (id > 8) s += `<rect x="${x - CUE.BR}" y="${y - 0.55}" width="${CUE.BR * 2}" height="1.1" fill="${colOf(id)}" clip-path="circle(${CUE.BR}px at ${CUE.BR}px 0.55px)"/>`;
        if (id > 0) s += `<text x="${x}" y="${y + 0.45}" font-size="1.2" text-anchor="middle" fill="${id > 8 || id === 0 ? '#111' : '#fff'}" font-weight="700">${id}</text>`;
      });
      if (my && poolSt.aim && !(my.data.inHand && !poolSt.place) && cue) {
        const c = place || cue, dx = poolSt.aim.x - c.x, dy = poolSt.aim.y - c.y, l = Math.hypot(dx, dy) || 1;
        s += `<line x1="${c.x}" y1="${c.y}" x2="${c.x + dx / l * 30}" y2="${c.y + dy / l * 30}" stroke="#fff" stroke-width=".4" stroke-dasharray="1.2 1"/>`;
      }
      $('plSvg').innerHTML = s;
      if ($('plShoot')) $('plShoot').disabled = !(my && poolSt.aim && !(my.data.inHand && !poolSt.place));
    },
    mount(stage, ctl) {
      poolSt.aim = null; poolSt.place = null; poolSt.anim = null; poolSt.seq = -1; clearInterval(poolSt.timer);
      stage.innerHTML = `<section class="table pz"><div class="bt-opps" id="plSeats"></div><svg class="cue-svg" id="plSvg" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" role="img" aria-label="Pool table"></svg><div class="pz-label" id="plMsg"></div><div class="banner" id="plBanner" aria-live="polite"></div></section>`;
      ctl.innerHTML = `<div class="act" id="plAct" hidden><div class="betrow"><label class="hint" for="plPow">Power</label><input type="range" id="plPow" min="10" max="100" value="60"><span class="hint" id="plPowV">60%</span></div>
        <div class="betrow"><button type="button" class="b gold" id="plShoot" disabled>Shoot</button><button type="button" class="ghost" id="plReset">Reset</button></div><p class="hint bt-hint" id="plHint"></p></div>`;
      $('plSvg').onclick = e => { const p = pt($('plSvg'), e, VB); poolUI.tap(p.x, p.y); };
      $('plPow').oninput = () => { poolSt.pw = +$('plPow').value / 100; $('plPowV').textContent = $('plPow').value + '%'; };
      $('plReset').onclick = () => { poolSt.aim = null; poolSt.place = null; if (poolSt.S) poolUI.update(poolSt.S); };
      $('plShoot').onclick = () => { const S = poolSt.S; if (!S || !S.turn || !poolSt.aim) return; const m = { t: 'shot', x: poolSt.aim.x, y: poolSt.aim.y, p: poolSt.pw, place: S.turn.data.inHand ? poolSt.place : null }; poolSt.aim = null; poolSt.place = null; S.send(m); };
    },
    update(S) {
      poolSt.S = S; const V = S.V, g = V.g; if (!S.turn) { poolSt.aim = null; poolSt.place = null; }
      poolPlay(g.shot);
      const gn = i => (g.groups[i] === 'solid' ? 'Solids' : g.groups[i] === 'stripe' ? 'Stripes' : 'Open table');
      $('plSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Lining up…', extra: i => gn(i) });
      $('plMsg').textContent = g.over ? '' : g.msg;
      $('plBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') + `<span>${esc(g.msg)}</span>` : '';
      $('plAct').hidden = !S.turn;
      if (S.turn) { const hand = S.turn.data.inHand;
        $('plHint').textContent = hand && !poolSt.place ? 'Ball in hand: tap the table to place the cue ball, then tap to aim.' : 'Tap the table to aim. Set the power, then press Shoot. Pot your group, then the 8 ball.'; }
      poolUI.draw(); return '';
    },
  };

  /* ===================== Carrom ===================== */
  const CVB = { x: -3, y: -3, w: 106, h: 106 };
  const carSt = { aim: null, sx: 50, pw: 0.6, anim: null, seq: -1, timer: null, S: null };
  const carPlay = player(carSt, () => carromUI.draw());
  const carPositions = g => { if (carSt.anim) { const f = carSt.anim; return { coins: g.coins.map((c, i) => ({ t: c.t, id: c.id, alive: f[2 * i] >= 0, x: f[2 * i] / 10, y: f[2 * i + 1] / 10 })), st: f[2 * g.coins.length] >= 0 ? { x: f[2 * g.coins.length] / 10, y: f[2 * g.coins.length + 1] / 10 } : null }; } return { coins: g.coins, st: null }; };
  const CC = { w: '#f7f0e1', b: '#2a2430', q: '#d6453d' };
  const carromUI = {
    st: carSt,
    tap(x, y) { const S = carSt.S; if (!S || !S.turn) return; carSt.aim = { x, y }; carromUI.update(S); },
    flip() { const S = carSt.S; return !!(S && S.me === 1); },
    draw() {
      const S = carSt.S; if (!S || !$('crSvg')) return; const g = S.V.g, P = carPositions(g), my = S.turn, me = S.me === 1 ? 1 : 0;
      let s = `<g${carromUI.flip() ? ' transform="rotate(180 50 50)"' : ''}><rect x="-3" y="-3" width="106" height="106" rx="3" fill="#6b3d1a"/><rect x="0" y="0" width="100" height="100" fill="#e2bd7e"/>` +
        `<circle cx="50" cy="50" r="12" fill="none" stroke="#7a4a22" stroke-width=".4"/><circle cx="50" cy="50" r="2" fill="#d6453d" fill-opacity=".5"/>` +
        [16, 84].map(y => `<line x1="14" y1="${y}" x2="86" y2="${y}" stroke="#7a4a22" stroke-width=".35"/>`).join('') + [16, 84].map(x => `<line x1="${x}" y1="14" x2="${x}" y2="86" stroke="#7a4a22" stroke-width=".35"/>`).join('') +
        CUE.CT.pk.map(p => `<circle cx="${p.x - 0.4 * Math.sign(p.x - 50)}" cy="${p.y - 0.4 * Math.sign(p.y - 50)}" r="3.2" fill="#14100c"/>`).join('');
      P.coins.forEach(c => { if (!c.alive) return; s += `<circle cx="${c.x}" cy="${c.y}" r="${CUE.CR}" fill="${CC[c.t]}" stroke="#000" stroke-opacity=".5" stroke-width=".25"/>`; });
      if (P.st) s += `<circle cx="${P.st.x}" cy="${P.st.y}" r="${CUE.SR}" fill="#9ac8f0" stroke="#fff" stroke-width=".4"/>`;
      if (my) {
        const by = CUE.BASE[me], ok = CUE.carromSpot(g.coins, carSt.sx, me);
        s += `<circle cx="${carSt.sx}" cy="${by}" r="${CUE.SR}" fill="${ok ? '#9ac8f0' : '#e06060'}" stroke="#fff" stroke-width=".4"/>`;
        if (carSt.aim) { const dx = carSt.aim.x - carSt.sx, dy = carSt.aim.y - by, l = Math.hypot(dx, dy) || 1; s += `<line x1="${carSt.sx}" y1="${by}" x2="${carSt.sx + dx / l * 60}" y2="${by + dy / l * 60}" stroke="#fff" stroke-width=".4" stroke-dasharray="1.2 1"/>`; }
      }
      $('crSvg').innerHTML = s + '</g>';
      if ($('crShoot')) $('crShoot').disabled = !(my && carSt.aim && CUE.carromSpot(g.coins, carSt.sx, me));
    },
    mount(stage, ctl) {
      carSt.aim = null; carSt.sx = 50; carSt.anim = null; carSt.seq = -1; clearInterval(carSt.timer);
      stage.innerHTML = `<section class="table pz"><div class="bt-opps" id="crSeats"></div><svg class="cue-svg carrom" id="crSvg" viewBox="${CVB.x} ${CVB.y} ${CVB.w} ${CVB.h}" role="img" aria-label="Carrom board"></svg><div class="pz-label" id="crMsg"></div><div class="banner" id="crBanner" aria-live="polite"></div></section>`;
      ctl.innerHTML = `<div class="act" id="crAct" hidden><div class="betrow"><label class="hint" for="crSx">Striker</label><input type="range" id="crSx" min="20" max="80" value="50"></div>
        <div class="betrow"><label class="hint" for="crPow">Power</label><input type="range" id="crPow" min="10" max="100" value="60"><span class="hint" id="crPowV">60%</span></div>
        <div class="betrow"><button type="button" class="b gold" id="crShoot" disabled>Flick</button><button type="button" class="ghost" id="crReset">Reset</button></div><p class="hint bt-hint" id="crHint"></p></div>`;
      $('crSvg').onclick = e => { const p = pt($('crSvg'), e, CVB); carromUI.tap(carromUI.flip() ? 100 - p.x : p.x, carromUI.flip() ? 100 - p.y : p.y); };
      $('crSx').oninput = () => { carSt.sx = +$('crSx').value; carromUI.draw(); };
      $('crPow').oninput = () => { carSt.pw = +$('crPow').value / 100; $('crPowV').textContent = $('crPow').value + '%'; };
      $('crReset').onclick = () => { carSt.aim = null; if (carSt.S) carromUI.update(carSt.S); };
      $('crShoot').onclick = () => { const S = carSt.S; if (!S || !S.turn || !carSt.aim) return; const m = { t: 'shot', sx: carSt.sx, x: carSt.aim.x, y: carSt.aim.y, p: carSt.pw }; carSt.aim = null; S.send(m); };
    },
    update(S) {
      carSt.S = S; const V = S.V, g = V.g; if (!S.turn) carSt.aim = null;
      carPlay(g.shot);
      $('crSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Lining up…', extra: i => `${i === 0 ? 'White' : 'Black'} · ${CUE.carromScore(g.coins, i === 0 ? 'w' : 'b')} of 9` });
      $('crMsg').textContent = g.over ? '' : g.msg;
      $('crBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') + `<span>${esc(g.msg)}</span>` : '';
      $('crAct').hidden = !S.turn;
      if (S.turn) $('crHint').textContent = `You play ${S.turn.data.colour === 'w' ? 'white' : 'black'}. Slide the striker along your line, tap the board to aim, set the power and flick.${S.turn.data.qPending ? ' Pot one of your coins now to keep the queen.' : ''}`;
      carromUI.draw(); return '';
    },
  };

  /* ===================== 3D ===================== */
  const TY = 2.5;
  const numTex = (id) => T3.canvasTex(256, 128, (g, w, h) => {
    const base = id > 8 ? '#fbf6ea' : colOf(id); g.fillStyle = base; g.fillRect(0, 0, w, h);
    if (id > 8) { g.fillStyle = colOf(id); g.fillRect(0, h * 0.28, w, h * 0.44); }
    if (id > 0) for (const cx of [w * 0.25, w * 0.75]) { g.fillStyle = '#fbf6ea'; g.beginPath(); g.arc(cx, h / 2, 26, 0, 7); g.fill(); g.fillStyle = '#111'; g.font = '700 34px Figtree, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(id), cx, h / 2 + 2); }
  });

  /* common: person standing at the table, frame playback */
  function setupPeople(s, sc, S0, spots) {
    const people = [], tags = [];
    const build = S => {
      people.forEach(p => sc.remove(p)); people.length = 0; tags.length = 0;
      S.V.seats.forEach((st, i) => {
        const sp = spots[i % spots.length], pp = T3.person(i ? '#e0443c' : '#3f8be8', { idx: i + 1 }); pp.scale.setScalar(2.2); pp.position.set(sp[0], 0, sp[1]); pp.rotation.y = sp[2]; sc.add(pp); s.addPerson(pp); people.push(pp);
        const lb = T3.label('', { scale: 3.6 }); lb.sprite.position.y = 3.0; lb.sprite.scale.multiplyScalar(1 / 2.2); pp.add(lb.sprite); tags.push(lb);
      });
    };
    return { people, tags, build };
  }

  function pool3d(box, S0) {
    const TH = THREE, s = T3.stage(box, { fov: 42 }), sc = s.scene, K = 0.16;
    T3.lounge(s, { w: 34, d: 28, lamps: [], ambient: 0.55, wall: '#1d2a38', bg: 0x0c1118 });
    const key = new TH.SpotLight(0xfff0d0, 1.6, 44, 0.9, 0.55, 1.1); key.position.set(0, 13, 0); key.target.position.set(0, TY, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; sc.add(key, key.target);
    T3.mk(sc, new TH.CircleGeometry(12, 56), T3.mat('#3a2a1e', { roughness: 1 }), 0, 0.012, 0, { noCast: true }).rotation.x = -Math.PI / 2;
    const felt = T3.canvasTex(512, 256, T3.speckle('#1f7a4a', 36, 6000));
    T3.mk(sc, T3.BOX(16.2, 0.2, 8.2), T3.mat('#fff', { map: felt, roughness: 1 }), 0, TY - 0.1, 0, { noCast: true });
    const wood = T3.mat('#4a2a14', { roughness: 0.4 });
    T3.mk(sc, T3.BOX(17.6, 0.5, 0.7), wood, 0, TY + 0.1, 4.45); T3.mk(sc, T3.BOX(17.6, 0.5, 0.7), wood, 0, TY + 0.1, -4.45); T3.mk(sc, T3.BOX(0.7, 0.5, 9.6), wood, 8.45, TY + 0.1, 0); T3.mk(sc, T3.BOX(0.7, 0.5, 9.6), wood, -8.45, TY + 0.1, 0);
    T3.mk(sc, T3.BOX(17.6, 0.3, 9.6), wood, 0, TY - 0.4, 0);
    for (const x of [-7, 7]) for (const z of [-3, 3]) T3.mk(sc, T3.BOX(0.7, TY - 0.5, 0.7), wood, x, (TY - 0.5) / 2, z);
    const wx = x => (x - 50) * K, wz = y => (y - 25) * K;
    CUE.PT.pk.forEach(p => T3.mk(sc, T3.CYL(p.r * K * 0.95, p.r * K * 0.95, 0.05, 20), new TH.MeshBasicMaterial({ color: 0x050507 }), wx(p.x), TY + 0.015, wz(p.y), { noCast: true }));
    const balls = [], BRW = CUE.BR * K;
    for (let i = 0; i < 16; i++) { const id = i === 0 ? 0 : -1; balls.push(null); }
    const mkBall = id => { const m = new TH.Mesh(new TH.SphereGeometry(BRW, 24, 16), new TH.MeshStandardMaterial({ map: id === 0 ? null : numTex(id), color: id === 0 ? 0xfbf6ea : 0xffffff, roughness: 0.25, metalness: 0.05 })); m.castShadow = true; sc.add(m); return m; };
    const plane = T3.mk(sc, new TH.PlaneGeometry(18, 10), new TH.MeshBasicMaterial({ visible: false }), 0, TY + BRW, 0, { noCast: true }); plane.rotation.x = -Math.PI / 2;
    const stick = new TH.Group(); T3.mk(stick, new TH.CylinderGeometry(0.035, 0.07, 5.2, 10), T3.mat('#d9b36b', { roughness: 0.5 }), 0, 0, 0).rotation.z = Math.PI / 2; T3.mk(stick, new TH.CylinderGeometry(0.037, 0.037, 0.12, 10), T3.mat('#3f8be8'), -2.62, 0, 0).rotation.z = Math.PI / 2; stick.visible = false; sc.add(stick);
    const dots = []; for (let i = 0; i < 16; i++) dots.push(T3.mk(sc, T3.SPH(0.035, 6), new TH.MeshBasicMaterial({ color: 0xffffff }), 0, TY + BRW, 0, { noCast: true })); dots.forEach(d => { d.visible = false; });
    const ring = T3.mk(sc, new TH.TorusGeometry(BRW * 1.25, 0.03, 8, 24), new TH.MeshBasicMaterial({ color: 0x6ee09a }), 0, TY + 0.02, 0, { noCast: true }); ring.rotation.x = Math.PI / 2; ring.visible = false;
    const msg = T3.label('', { scale: 3 }); msg.sprite.position.set(0, TY + 1.6, -3.4); sc.add(msg.sprite);
    const spots = [[0, 6.4, Math.PI], [0, -6.4, 0]], pe = setupPeople(s, sc, S0, spots); let SS = S0, peopleKey = '', cur = null, play = null, seq = -1, wasMine = false;
    s.setViews({ seat: { label: 'Seat', pos: [0, 10.6, 6.6], look: [0, 2.3, 0.7], fov: 42, sway: 0.008 }, top: { label: 'Top', pos: [0, 14.5, 0.01], look: [0, 2.5, 0], up: [0, 0, -1], fov: 42 }, end: { label: 'End', pos: [-11.5, 6.5, 2.5], look: [0, 2.3, 0], fov: 42 } }, 'seat', true);
    const place = (m, b) => { m.position.set(wx(b.x), TY + BRW, wz(b.y)); };
    const setBall = (i, b, instant) => {
      if (!balls[i]) { balls[i] = mkBall(b.id); }
      const m = balls[i]; if (!b.alive) { m.visible = false; return; } m.visible = true;
      if (instant) place(m, b);
    };
    const frameToBalls = f => SS.V.g.balls.map((b, i) => ({ id: b.id, alive: f[2 * i] >= 0, x: f[2 * i] / 10, y: f[2 * i + 1] / 10 }));
    s.onTap(e => { const h = s.pick(e, [plane])[0]; if (!h) return; poolUI.tap(h.point.x / K + 50, h.point.z / K + 25); setTimeout(() => s.sync(SS), 20); });
    s.on((dt, t) => {
      const g = SS.V.g, st = poolSt;
      if (play) {
        play.t += dt; const kf = play.t / 0.066 - 7;     // short delay while the cue strikes
        if (kf >= 0) {
          const k0 = Math.min(play.f.length - 1, Math.floor(kf)), k1 = Math.min(play.f.length - 1, k0 + 1), a = kf - k0, A = play.f[k0], Bf = play.f[k1];
          for (let i = 0; i < 16; i++) { const m = balls[i]; if (!m) continue; const ax = A[2 * i], bx = Bf[2 * i]; if (ax < 0 && bx < 0) { m.visible = false; continue; }
            const x = (ax < 0 ? bx : ax + (bx - ax) * a) / 10, y = ((ax < 0 ? Bf[2 * i + 1] : A[2 * i + 1] + (Bf[2 * i + 1] - A[2 * i + 1]) * a)) / 10;
            const nx = wx(x), nz = wz(y); const ddx = nx - m.position.x, ddz = nz - m.position.z, dd = Math.hypot(ddx, ddz); if (dd > 1e-4 && m.visible) m.rotateOnWorldAxis(new TH.Vector3(ddz, 0, -ddx).normalize(), dd / BRW);
            m.visible = ax >= 0 || a < 0.5; m.position.set(nx, TY + BRW, nz); }
        }
        if (play.t > 0.5 && stick.visible) stick.visible = false;
        if (play.stickT !== undefined && play.t < 0.55) { const u = play.t / 0.5, pull = u < 0.6 ? u / 0.6 : 1 - (u - 0.6) / 0.4 * 1.0; stick.position.set(play.c.x - Math.cos(play.ang) * (2.7 + 0.9 * Math.max(0, Math.min(1, pull)) - (u > 0.6 ? 0.9 : 0)), TY + BRW + 0.12, play.c.z - Math.sin(play.ang) * (2.7 + 0.9 * Math.max(0, Math.min(1, pull)) - (u > 0.6 ? 0.9 : 0))); }
        if (kf > play.f.length + 1) { play = null; s.sync(SS); }
        return;
      }
      // aiming overlay for my shot
      const turn = SS.turn, cueB = g.balls[0]; ring.visible = false; stick.visible = false; dots.forEach(d => { d.visible = false; });
      if (turn && cueB) {
        const hand = turn.data.inHand, c = hand ? st.place : cueB;
        if (hand && !st.place) { ring.visible = true; ring.position.set(0, TY + 0.02, 0); ring.visible = false; }
        if (c && st.aim && !(hand && !st.place)) {
          const ang = Math.atan2(st.aim.y - c.y, st.aim.x - c.x), px = wx(c.x), pz = wz(c.y);
          stick.visible = true; stick.rotation.y = -ang; stick.position.set(px - Math.cos(ang) * (2.9 + (0.5 + 0.5 * Math.sin(t * 2.2)) * 0.15), TY + BRW + 0.12, pz - Math.sin(ang) * (2.9 + (0.5 + 0.5 * Math.sin(t * 2.2)) * 0.15));
          dots.forEach((d, k) => { d.visible = true; d.position.set(px + Math.cos(ang) * (0.5 + k * 0.5), TY + BRW, pz + Math.sin(ang) * (0.5 + k * 0.5)); });
        }
        if (hand && st.place) { const m = balls[0]; if (m) { m.visible = true; place(m, st.place); } }
      }
    });
    s.onView = nm => { pe.people.forEach((pp, i) => { pp.visible = !(nm === 'seat' && i === SS.me); }); };
    s.sync = S => {
      SS = S; const g = S.V.g, inst = !cur;
      const key = S.me + '|' + S.V.seats.length; if (key !== peopleKey) { peopleKey = key; pe.build(S); }
      if (g.shot && g.shot.seq !== seq) {
        const first = seq < 0; seq = g.shot.seq;
        if (!first || false) { const f = g.shot.frames, a0 = f[0], a1 = f[Math.min(2, f.length - 1)], ang = Math.atan2((a1[1] - a0[1]), (a1[0] - a0[0])); const c0 = { x: wx(a0[0] / 10), z: wz(a0[1] / 10) };
          play = { f, t: 0, ang: Math.atan2(wz(a1[1] / 10) - wz(a0[1] / 10), wx(a1[0] / 10) - wx(a0[0] / 10)), c: c0, stickT: 0 }; stick.visible = true; stick.rotation.y = -play.ang; ring.visible = false; dots.forEach(d => { d.visible = false; });
          const shooter = pe.people[g.shot.p]; if (shooter) { const arms = shooter.userData.arms; if (arms) s.tween(600, (k, e) => { arms[1].rotation.x = -1.4 + Math.sin(Math.PI * e) * 0.9; }); } }
      }
      g.balls.forEach((b, i) => { if (!play) setBall(i, b, true); else if (!balls[i]) setBall(i, b, true); });
      cur = true;
      const me = S.me; S.V.seats.forEach((st, i) => { pe.tags[i] && pe.tags[i].set(`${S.nameOf(i)} · ${fmt(st.stack)}`, g.turn === i ? '#f2b441' : '#f7f0e1'); });
      msg.set(g.over ? '' : g.msg, '#f7f0e1'); s.onView(s.view);
      if (S.me === 1) { if (!s._flip) { s._flip = true; s.setViews({ seat: { label: 'Seat', pos: [0, 10.6, -6.6], look: [0, 2.3, -0.7], fov: 42, sway: 0.008 }, top: { label: 'Top', pos: [0, 14.5, 0.01], look: [0, 2.5, 0], up: [0, 0, 1], fov: 42 }, end: { label: 'End', pos: [11.5, 6.5, -2.5], look: [0, 2.3, 0], fov: 42 } }, 'seat', true); } }
      s.hint(S.turn ? (S.turn.data.inHand && !poolSt.place ? 'Ball in hand: tap the table to place the cue ball.' : 'Tap the table to aim, set power below, then Shoot.') : '');
    };
    return s;
  }

  function carrom3d(box, S0) {
    const TH = THREE, s = T3.stage(box, { fov: 42 }), sc = s.scene, K = 0.11;
    T3.lounge(s, { w: 30, d: 26, lamps: [], ambient: 0.62, wall: '#2a1d14', bg: 0x0d0a08 });
    const key = new TH.SpotLight(0xfff0d0, 1.5, 40, 0.9, 0.55, 1.1); key.position.set(0, 13, 1); key.target.position.set(0, TY, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; sc.add(key, key.target);
    T3.mk(sc, new TH.CircleGeometry(11, 56), T3.mat('#3a2a1e', { roughness: 1 }), 0, 0.012, 0, { noCast: true }).rotation.x = -Math.PI / 2;
    T3.mk(sc, T3.BOX(2.6, TY - 0.5, 2.6), T3.mat('#2a1810'), 0, (TY - 0.5) / 2, 0); T3.mk(sc, T3.BOX(13, 0.5, 13), T3.mat('#6b4423', { roughness: 0.5 }), 0, TY - 0.25, 0);
    const tex = T3.canvasTex(1024, 1024, (g, w, h) => {
      g.fillStyle = '#e2bd7e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7a4a22'; g.lineWidth = 4; const q = v => v * w / 100;
      g.beginPath(); g.arc(q(50), q(50), q(12), 0, 7); g.stroke(); g.beginPath(); g.arc(q(50), q(50), q(2), 0, 7); g.fillStyle = 'rgba(214,69,61,.6)'; g.fill();
      [16, 84].forEach(v => { g.beginPath(); g.moveTo(q(14), q(v)); g.lineTo(q(86), q(v)); g.stroke(); g.beginPath(); g.moveTo(q(v), q(14)); g.lineTo(q(v), q(86)); g.stroke(); });
      [[16, 16], [84, 16], [16, 84], [84, 84]].forEach(([x, y]) => { g.beginPath(); g.arc(q(x), q(y), q(2.2), 0, 7); g.stroke(); });
      g.strokeStyle = '#7a4a22'; g.lineWidth = 2; [[3.4, 3.4, 22, 22], [96.6, 3.4, 78, 22], [3.4, 96.6, 22, 78], [96.6, 96.6, 78, 78]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(q(a), q(b)); g.lineTo(q(c), q(d)); g.stroke(); });
    });
    T3.mk(sc, T3.BOX(11, 0.2, 11), T3.mat('#fff', { map: tex, roughness: 0.35 }), 0, TY - 0.1, 0, { noCast: true });
    const rail = T3.mat('#5a3418', { roughness: 0.4 }); [[0, 5.75, 12.4, 0.8], [0, -5.75, 12.4, 0.8]].forEach(([x, z, w, d]) => T3.mk(sc, T3.BOX(w, 0.5, d), rail, x, TY + 0.1, z)); [[5.75, 0], [-5.75, 0]].forEach(([x, z]) => T3.mk(sc, T3.BOX(0.8, 0.5, 11), rail, x, TY + 0.1, z));
    const wx = x => (x - 50) * K, wz = y => (y - 50) * K;
    CUE.CT.pk.forEach(p => T3.mk(sc, T3.CYL(0.42, 0.42, 0.05, 20), new TH.MeshBasicMaterial({ color: 0x0a0806 }), wx(p.x - 0.4 * Math.sign(p.x - 50)), TY + 0.015, wz(p.y - 0.4 * Math.sign(p.y - 50)), { noCast: true }));
    const CRW = CUE.CR * K, SRW = CUE.SR * K, coins = [], CH = 0.07;
    const mkCoin = c => { const g = new TH.Group(); const col = c.t === 'w' ? '#f7f0e1' : c.t === 'b' ? '#2a2430' : '#d6453d'; T3.mk(g, T3.CYL(CRW, CRW, CH, 24), T3.mat(col, { roughness: 0.35 }), 0, CH / 2, 0); T3.mk(g, new TH.TorusGeometry(CRW * 0.6, 0.012, 6, 20), T3.mat(c.t === 'b' ? '#8a7aa0' : '#b09870'), 0, CH + 0.002, 0, { noCast: true }).rotation.x = Math.PI / 2; sc.add(g); return g; };
    const striker = new TH.Group(); T3.mk(striker, T3.CYL(SRW, SRW, 0.1, 28), T3.mat('#9ac8f0', { roughness: 0.2 }), 0, 0.05, 0); T3.mk(striker, new TH.TorusGeometry(SRW * 0.7, 0.02, 6, 24), T3.mat('#fff'), 0, 0.102, 0, { noCast: true }).rotation.x = Math.PI / 2; sc.add(striker); striker.visible = false;
    const plane = T3.mk(sc, new TH.PlaneGeometry(12, 12), new TH.MeshBasicMaterial({ visible: false }), 0, TY + 0.1, 0, { noCast: true }); plane.rotation.x = -Math.PI / 2;
    const dots = []; for (let i = 0; i < 18; i++) dots.push(T3.mk(sc, T3.SPH(0.03, 6), new TH.MeshBasicMaterial({ color: 0xffffff }), 0, TY + 0.1, 0, { noCast: true })); dots.forEach(d => { d.visible = false; });
    const msg = T3.label('', { scale: 3 }); msg.sprite.position.set(0, TY + 1.6, -2.6); sc.add(msg.sprite);
    const spots = [[0, 7.4, Math.PI], [0, -7.4, 0]], pe = setupPeople(s, sc, S0, spots); let SS = S0, peopleKey = '', play = null, seq = -1, flip = false, first = true; s.onView = nm => { pe.people.forEach((pp, i) => { pp.visible = !(nm === 'seat' && i === SS.me); }); };
    const views = f => ({ seat: { label: 'Seat', pos: [0, 11.4, f ? -6.2 : 6.2], look: [0, 2.3, f ? -0.6 : 0.6], fov: 42, sway: 0.008 }, top: { label: 'Top', pos: [0, 15, 0.01], look: [0, 2.5, 0], up: [0, 0, f ? 1 : -1], fov: 42 }, side: { label: 'Side', pos: [10.5, 6.5, 0], look: [0, 2.3, 0], fov: 42 } });
    s.setViews(views(false), 'seat', true);
    s.onTap(e => { const h = s.pick(e, [plane])[0]; if (!h) return; carromUI.tap(h.point.x / K + 50, h.point.z / K + 50); setTimeout(() => s.sync(SS), 20); });
    const putCoins = g => { g.coins.forEach((c, i) => { if (!coins[i]) coins[i] = mkCoin(c); const m = coins[i]; m.visible = c.alive; m.position.set(wx(c.x), TY, wz(c.y)); }); };
    s.on((dt, t) => {
      const g = SS.V.g;
      if (play) {
        play.t += dt; const kf = play.t / 0.066, n = g.coins.length;
        if (kf >= 0) {
          const k0 = Math.min(play.f.length - 1, Math.floor(kf)), k1 = Math.min(play.f.length - 1, k0 + 1), a = kf - k0, A = play.f[k0], B = play.f[k1];
          for (let i = 0; i <= n; i++) { const ax = A[2 * i], bx = B[2 * i]; const m = i === n ? striker : coins[i]; if (!m) continue; if (ax < 0 && bx < 0) { m.visible = false; continue; }
            const x = (ax < 0 ? bx : ax + (bx - ax) * a) / 10, y = (ax < 0 ? B[2 * i + 1] : A[2 * i + 1] + (B[2 * i + 1] - A[2 * i + 1]) * a) / 10; m.visible = ax >= 0 || a < 0.5; m.position.set(wx(x), TY, wz(y)); }
        }
        if (kf > play.f.length + 1) { play = null; striker.visible = false; s.sync(SS); }
        return;
      }
      dots.forEach(d => { d.visible = false; }); striker.visible = false;
      if (SS.turn && SS.me >= 0) { const me = SS.me === 1 ? 1 : 0, by = CUE.BASE[me]; striker.visible = true; striker.position.set(wx(carSt.sx), TY, wz(by));
        if (carSt.aim) { const ang = Math.atan2(carSt.aim.y - by, carSt.aim.x - carSt.sx); dots.forEach((d, k) => { d.visible = true; d.position.set(wx(carSt.sx) + Math.cos(ang) * (0.4 + k * 0.4), TY + 0.1, wz(by) + Math.sin(ang) * (0.4 + k * 0.4)); }); } }
    });
    s.sync = S => {
      SS = S; const g = S.V.g; const key = S.me + '|' + S.V.seats.length; if (key !== peopleKey) { peopleKey = key; pe.build(S); }
      const wantFlip = S.me === 1; if (wantFlip !== flip) { flip = wantFlip; s.setViews(views(flip), 'seat', true); }
      if (g.shot && g.shot.seq !== seq) { const was = seq < 0; seq = g.shot.seq; if (!was) { play = { f: g.shot.frames, t: -0.3 }; striker.visible = true; } }
      if (!play) putCoins(g); else g.coins.forEach((c, i) => { if (!coins[i]) coins[i] = mkCoin(c); });
      S.V.seats.forEach((st, i) => { pe.tags[i] && pe.tags[i].set(`${S.nameOf(i)} · ${fmt(st.stack)}`, g.turn === i ? '#f2b441' : '#f7f0e1'); });
      msg.set(g.over ? '' : g.msg, '#f7f0e1'); first = false; s.onView(s.view);
      s.hint(S.turn ? 'Slide the striker below, tap the board to aim, set power, then Flick.' : '');
    };
    return s;
  }

  /* ===================== register ===================== */
  Club.register({
    id: 'pool', cat: 'aim', name: 'Pool', tag: 'Eight-ball for two. Pot your group, then the 8 ball.', min: 2, max: 2, soloBots: 1, roundWord: 'Rack',
    art: () => ['8', '●', '○'].map(c => `<div class="ltile">${c}</div>`).join(''),
    rules: `<p><b>Goal:</b> pot all the balls of your group, then sink the 8 ball.</p>
      <ol><li>Player 1 breaks. The table is <b>open</b> until someone pots a ball. The first ball potted decides your group: <b>solids</b> (1 to 7) or <b>stripes</b> (9 to 15).</li>
      <li>Tap the table to aim, set the <b>power</b>, then press <b>Shoot</b>. Pot a ball of your group and you shoot again.</li>
      <li>Your first contact must be a ball of your group (or the 8 once your group is gone). <b>A foul</b> is a scratch, a miss, or hitting the wrong ball first. After a foul your opponent gets <b>ball in hand</b>: tap to place the cue ball anywhere.</li>
      <li>Sink the 8 ball after clearing your group to win. Sinking it too early loses the game.</li>
      <li>Each player puts in ${CUE.ANTE} free chips; the winner takes the pot. Chips have no cash value.</li></ol>`,
    round: CUE.poolRound, view: CUE.poolView, ui: poolUI, ui3d: T3.wrapUi(poolUI, { slot: st => ({ before: st.querySelector('#plSvg'), hide: [st.querySelector('#plSvg')] }), make: pool3d }), _test: { CUE },
  });
  Club.register({
    id: 'carrom', cat: 'aim', name: 'Carrom', tag: 'Flick the striker and pot your coins. Clear all nine to win.', min: 2, max: 2, soloBots: 1, roundWord: 'Board',
    art: () => ['◎', '●', '○'].map(c => `<div class="ltile">${c}</div>`).join(''),
    rules: `<p><b>Goal:</b> pot all nine of your coins before your opponent does. Player 1 plays white, player 2 plays black.</p>
      <ol><li>On your turn, <b>slide the striker</b> along your baseline, <b>tap the board</b> to aim, set the power and press <b>Flick</b>.</li>
      <li>Pot one of your own coins and you play again. Pot the other side’s coin and it counts for them.</li>
      <li>The red <b>queen</b> must be “covered”: pot one of your own coins right after it (or on the same flick). Otherwise the queen goes back to the centre.</li>
      <li>If the striker goes in the pocket, that is a <b>foul</b>: your turn ends and one of your potted coins returns to the centre.</li>
      <li>First to pot all nine of their coins wins the pot. Each player puts in ${CUE.ANTE} free chips; chips have no cash value.</li></ol>`,
    round: CUE.carromRound, view: CUE.carromView, ui: carromUI, ui3d: T3.wrapUi(carromUI, { slot: st => ({ before: st.querySelector('#crSvg'), hide: [st.querySelector('#crSvg')] }), make: carrom3d }), _test: { CUE },
  });
})();
