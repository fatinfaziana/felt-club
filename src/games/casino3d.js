/* ===================== 3D casino tables (shared scene) =====================
   One table builder serves every casino game. Each game gives a small config:
   cards(S,i) / bet(S,i) / status(S,i) per seat, zones(S) for dealer and middle cards,
   and optional props (dice, wheel, slot machine, keno board). The 2D seat plates stay. */
(() => {
  const AVC = ['#3f8be8', '#e0443c', '#5cc8b0', '#e8a23a', '#a063d8', '#e8708a', '#8ab4ff', '#9ac24a'];
  const TY = 2.5, TA = 8.4, TB = 4.6;

  /* ---------- dice ---------- */
  const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  const dieTex = {};
  const dieFace = v => dieTex[v] || (dieTex[v] = new THREE.MeshStandardMaterial({ roughness: 0.35, map: T3.canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#f7f1e3'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1a1a';
    PIPS[v].forEach(([x, y]) => { g.beginPath(); g.arc(w / 2 + x * 32, h / 2 + y * 32, 12, 0, 7); g.fill(); });
  }) }));
  const DIE_ORDER = [3, 4, 1, 6, 2, 5];           // +x -x +y -y +z -z
  const DIE_ROT = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0] };
  const mkDie = () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), DIE_ORDER.map(dieFace)); m.castShadow = true; return m; };

  T3.mkDie = mkDie; T3.DIE_ROT = DIE_ROT;
  /* ---------- roulette wheel ---------- */
  const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const wheelTex = () => T3.canvasTex(512, 512, (g, w, h) => {
    g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2);
    const n = 37, st = Math.PI * 2 / n;
    for (let k = 0; k < n; k++) {
      const v = WHEEL[k]; g.fillStyle = v === 0 ? '#1f8a4a' : RED.has(v) ? '#c4372e' : '#1c1c22';
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 250, (k - 0.5) * st, (k + 0.5) * st); g.closePath(); g.fill();
      g.save(); g.rotate(k * st); g.fillStyle = '#f7f0e1'; g.font = '700 22px Figtree, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.translate(222, 0); g.rotate(Math.PI / 2); g.fillText(String(v), 0, 0); g.restore();
    }
    g.fillStyle = '#6b4a22'; g.beginPath(); g.arc(0, 0, 175, 0, 7); g.fill();
    g.fillStyle = '#d6b05a'; g.beginPath(); g.arc(0, 0, 60, 0, 7); g.fill();
  });

  /* ---------- the scene ---------- */
  function casino3(box, S0, cfg) {
    const TH = THREE, s = T3.stage(box, { fov: 44 }), sc = s.scene;
    T3.lounge(s, { w: 36, d: 30, lamps: [], ambient: 0.6, wall: '#2a1424', bg: 0x0c0810 });
    const key = new TH.SpotLight(0xfff0d0, 1.5, 46, 0.95, 0.6, 1.1); key.position.set(0, 14, 2); key.target.position.set(0, TY, -0.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0008; key.shadow.normalBias = 0.05; sc.add(key, key.target);
    T3.mk(sc, new TH.CircleGeometry(13, 56), T3.mat('#3a1220', { roughness: 1 }), 0, 0.012, 0, { noCast: true }).rotation.x = -Math.PI / 2;
    const felt = T3.canvasTex(512, 512, T3.speckle(cfg.felt || '#1f7a4a', 40, 7000));
    const top = T3.mk(sc, new TH.CylinderGeometry(1, 1, 0.3, 72), T3.mat('#fff', { map: felt, roughness: 1 }), 0, TY - 0.15, 0); top.scale.set(TA, 1, TB);
    const pts = []; for (let k = 0; k < 96; k++) { const a = k / 96 * Math.PI * 2; pts.push(new TH.Vector3(Math.cos(a) * (TA + 0.1), TY, Math.sin(a) * (TB + 0.1))); }
    T3.mk(sc, new TH.TubeGeometry(new TH.CatmullRomCurve3(pts, true), 120, 0.26, 12, true), T3.mat('#3b1d12', { roughness: 0.35 }), 0, 0, 0);
    T3.mk(sc, T3.CYL(1.4, 2.2, TY - 0.3, 24), T3.mat('#2a1810'), 0, (TY - 0.3) / 2, 0);
    const people = [], tags = [], chairs = [], seatG = [], betG = [], betL = [], diam = [], hold = [], zones = {};
    let layoutKey = '', built = false, SS = S0, first = true, dealerP = null, dealerLab = null, props = null, n = 0;
    const shoe = new TH.Vector3(3.2, TY + 1.4, -3.4);
    const T = (x, z, f) => new TH.Vector3(x * f, TY + 0.02, z * f);

    function setCards(h, faces, w, sp, instant, lift) {
      const g = h.g; h.m = h.m || [];
      while (h.m.length > faces.length) g.remove(h.m.pop());
      faces.forEach((c, j) => {
        const tx = (j - (faces.length - 1) / 2) * sp; let m = h.m[j];
        if (m && m.userData.c === c && m.userData.w === w) { m.userData.tx = tx; m.userData.lift = lift && lift[j] ? 0.32 : 0; return; }
        const old = m; if (old) g.remove(old);
        m = cfg.mk ? cfg.mk(c, w) : T3.card3(c >= 0 && cfg.map ? cfg.map(c) : c, w); m.userData.c = c; m.userData.w = w; m.userData.tx = tx; m.userData.lift = lift && lift[j] ? 0.32 : 0; g.add(m); h.m[j] = m;
        if (old || instant) { m.position.set(tx, 0, 0); return; }
        g.updateMatrixWorld(true); const from = g.worldToLocal(shoe.clone()); m.userData.fly = true; m.position.copy(from); m.scale.setScalar(0.5);
        s.tween(480 + j * 120, (k, e) => { m.position.set(from.x + (tx - from.x) * e, from.y * (1 - e) + Math.sin(Math.PI * e) * 0.5, from.z * (1 - e)); m.scale.setScalar(0.5 + 0.5 * e); m.rotation.y = (1 - e) * 1.4; }, () => { m.userData.fly = false; m.rotation.y = 0; });
      });
    }
    s.on(dt => {
      const k = Math.min(1, dt * 9);
      const all = [...seatG, ...Object.values(zones)];
      all.forEach(h => (h.m || []).forEach(m => { if (m.userData.fly) return; m.position.x += (m.userData.tx - m.position.x) * k; m.position.y += (m.userData.lift - m.position.y) * k; }));
    });

    function layout(S) {
      const V = S.V, me = S.me; n = V.seats.length;
      [...people, ...chairs, ...diam].forEach(o => sc.remove(o)); [...tags, ...betL].forEach(l => sc.remove(l.sprite)); betG.forEach(b => b.g && sc.remove(b.g)); seatG.forEach(h => sc.remove(h.g));
      people.length = chairs.length = diam.length = tags.length = betL.length = betG.length = seatG.length = hold.length = 0;
      const span = n <= 1 ? 0 : Math.min(124, 34 * (n - 1) + 20), mid = Math.floor((n - 1) / 2);
      for (let i = 0; i < n; i++) {
        const k = me >= 0 ? (i - me + mid + n) % n : i, th = cfg.ring ? -2 * Math.PI * ((i - Math.max(me, 0) + n) % n) / n : n <= 1 ? 0 : (-span / 2 + span * k / (n - 1)) * Math.PI / 180;
        const ox = 10.3 * Math.sin(th), oz = 6.6 * Math.cos(th), ry = Math.atan2(-ox, -oz);
        const seat = T3.mk(sc, T3.BOX(2.0, 0.3, 2.0), T3.mat('#2a1a3a', { roughness: 0.8 }), ox, 1.28, oz); seat.rotation.y = ry; seat.userData.seatOf = i; chairs.push(seat);
        const L = Math.hypot(ox, oz), back = T3.mk(sc, T3.BOX(2.0, 2.4, 0.26), T3.mat('#2a1a3a', { roughness: 0.8 }), ox + ox / L, 2.5, oz + oz / L); back.rotation.y = ry; back.userData.seatOf = i; chairs.push(back);
        const pp = T3.person(AVC[i % 8], { seated: true, idx: i }); pp.scale.setScalar(2.2); pp.position.set(ox, 0, oz); pp.rotation.y = ry; sc.add(pp); s.addPerson(pp); people.push(pp);
        const lb = T3.label('', { scale: 3.6 }); lb.sprite.position.y = 2.1; lb.sprite.scale.multiplyScalar(1 / 2.2); pp.add(lb.sprite); tags.push(lb);
        const dm = T3.mk(pp, new TH.OctahedronGeometry(0.1), new TH.MeshBasicMaterial({ color: 0xf2b441 }), 0, 2.42, 0, { noCast: true }); dm.visible = false; diam.push(dm);
        const g = new TH.Group(), cp = T(TA * Math.sin(th), TB * Math.cos(th), 0.6); g.position.copy(cp); g.rotation.y = Math.atan2(ox, oz); sc.add(g); seatG.push({ g, m: [] });
        const bp = T(TA * Math.sin(th), TB * Math.cos(th), 0.34); betG.push({ g: null, amt: -1, x: bp.x, z: bp.z });
        const bl = T3.label('', { scale: 1.7 }); bl.sprite.position.set(bp.x, TY + 0.75, bp.z); sc.add(bl.sprite); betL.push(bl);
      }
      built = true; layoutKey = me + '|' + V.seats.map(q => q.u || q.n).join(',');
    }
    if (!cfg.noDealer) {
      dealerP = T3.person('#7a1f3a', { idx: 4 }); dealerP.scale.setScalar(2.2); dealerP.position.set(0, 0, -6.6); sc.add(dealerP); s.addPerson(dealerP);
      dealerLab = T3.label('Dealer', { scale: 3 }); dealerLab.sprite.position.y = 2.3; dealerLab.sprite.scale.multiplyScalar(1 / 2.2); dealerP.add(dealerLab.sprite);
      T3.mk(sc, T3.BOX(2.2, 0.06, 0.8), T3.mat('#2a1810'), 0, TY + 0.03, -3.9, { noCast: true });
    }
    if (cfg.props) props = cfg.props(s, sc, TY, S0, { seatG });

    s.setViews({
      seat: { label: 'Seat', pos: [0, 8.4, 10.2], look: [0, 1.8, -0.2], fov: 44, sway: 0.012 },
      table: { label: 'Table', pos: [0, 11.8, 12.4], look: [0, 2.2, -0.6], fov: 42 },
      top: { label: 'Top', pos: [0, 17.5, 0.01], look: [0, 2.5, -0.4], up: [0, 0, -1], fov: 42 },
    }, 'seat', true);
    s.on((dt, t) => {
      const g = SS.V.g, done = SS.V.done;
      people.forEach((pp, i) => {
        const act = g.turn === i && !done, win = done && dlt(g, i) > 0, ar = pp.userData.arms;
        ar[0].rotation.x += ((win ? -2.7 : -1.0) - ar[0].rotation.x) * Math.min(1, dt * 4); ar[1].rotation.x += ((win ? -2.7 : act ? -1.3 : -1.0) - ar[1].rotation.x) * Math.min(1, dt * 4);
        if (diam[i]) { diam[i].visible = act; diam[i].position.y = 2.42 + Math.sin(t * 3) * 0.05; diam[i].rotation.y = t * 2; }
      });
      if (dealerP) { const ar = dealerP.userData.arms; ar[1].rotation.x += ((g.turn >= 0 ? -0.5 : -1.1) - ar[1].rotation.x) * Math.min(1, dt * 3); }
      if (props && props.frame) props.frame(dt, t, SS);
    });
    s.onView = nm => { people.forEach((pp, i) => { pp.visible = !(nm === 'seat' && i === SS.me); }); chairs.forEach(c => { c.visible = !(nm === 'seat' && c.userData.seatOf === SS.me && SS.me >= 0); }); };

    s.onTap(e => { if (props && props.tap) { props.tap(e, SS); setTimeout(() => { if (!s.dead) { try { s.sync(SS); } catch (x) {} } }, 40); } else if (cfg.tapCards) { cfg.tapCards(s, e, SS, seatG, zones); setTimeout(() => { if (!s.dead) { try { s.sync(SS); } catch (x) {} } }, 40); } });

    s.sync = S => {
      SS = S; const V = S.V, g = V.g, me = S.me, inst = first;
      if (!built || layoutKey !== me + '|' + V.seats.map(q => q.u || q.n).join(',')) { layout(S); Object.values(zones).forEach(z => z.m.forEach(m => z.g.remove(m))); }
      const nn = V.seats.length, big = nn > 3;
      V.seats.forEach((st, i) => {
        const p = (g.ps && g.ps[i]) || {};
        const faces = cfg.cards && !(cfg._hud && i === me) ? cfg.cards(S, i) : [];
        const sz = cfg.size ? cfg.size(S, i, faces) : null, cw = sz ? sz[0] : faces.length > 3 && big ? 0.5 : big ? 0.62 : 0.78;
        setCards(seatG[i], faces, cw, sz ? sz[1] : cw * 0.82, inst, cfg.held ? cfg.held(S, i) : null);
        const amt = cfg.bet ? cfg.bet(S, i) : 0, bl = cfg.betText ? cfg.betText(S, i) : (amt ? fmt(amt) : '');
        if (betG[i].amt !== amt) { betG[i].amt = amt; if (betG[i].g) sc.remove(betG[i].g); betG[i].g = null; if (amt > 0) { const c = T3.chips(amt, 0.22); c.position.set(betG[i].x, TY, betG[i].z); sc.add(c); betG[i].g = c; } }
        betL[i].set(bl, '#f7f0e1');
        const d = dlt(g, i), stt = cfg.status ? cfg.status(S, i, p) : (p.res || '');
        const txt = `${S.nameOf(i)} · ${fmt(st.stack)}${V.done && d ? (d > 0 ? ' +' : ' ') + fmt(d) : stt ? ' · ' + stt : ''}`;
        tags[i].set(txt, V.done && d > 0 ? '#6ee09a' : V.done && d < 0 ? '#ff9a8a' : (g.turn === i ? '#f2b441' : '#f7f0e1'));
      });
      (cfg.zones ? cfg.zones(S) : []).forEach(zd => {
        let z = zones[zd.id]; if (!z) { const gg = new TH.Group(); gg.position.set(zd.x, TY + 0.02, zd.z); sc.add(gg); const lb = T3.label('', { scale: 2.4 }); lb.sprite.position.set(zd.x, TY + 0.8, zd.z + (zd.ly || 0.9)); sc.add(lb.sprite); z = zones[zd.id] = { g: gg, m: [], lab: lb }; }
        setCards(z, zd.faces || [], zd.w || 0.82, (zd.w || 0.82) * 0.86, inst, null); z.lab.set(zd.text || '', '#f7f0e1');
      });
      if (props && props.sync) props.sync(S, inst);
      s.onView(s.view); first = false;
      s.hint(cfg.hint ? cfg.hint(S) : (S.turn ? 'Your turn: use the buttons below.' : ''));
    };
    return s;
  }

  /* ---------- game configs ---------- */
  const arr = x => (Array.isArray(x) ? x : []);
  const dlt = (g, i) => ((g.ps && g.ps[i] ? g.ps[i].delta : (g.delta || [])[i]) || 0);
  const diceProps = (opts) => (s, sc, TY0) => {
    const TH = THREE, g = new TH.Group(); g.position.set(opts.x || 0, TY0 + 0.31, opts.z || -0.6); sc.add(g);
    const lab = T3.label('', { scale: 2.6 }); lab.sprite.position.set(opts.x || 0, TY0 + 1.0, (opts.z || -0.6) + 1.2); sc.add(lab.sprite);
    let dice = [], key = '', puck = null, puckLab = null;
    if (opts.puck) { puck = new TH.Group(); T3.mk(puck, T3.CYL(0.36, 0.36, 0.08, 24), T3.mat('#f7f0e1', { roughness: 0.4 }), 0, 0, 0); puckLab = T3.label('OFF', { scale: 0.9, bg: 'rgba(0,0,0,0)', color: '#222' }); puckLab.sprite.position.y = 0.2; puck.add(puckLab.sprite); puck.position.set(-3.4, TY0 + 0.06, -2); sc.add(puck); }
    return {
      sync(S, inst) {
        const vals = arr(opts.dice(S)), k = vals.join('.');
        while (dice.length > vals.length) g.remove(dice.pop());
        while (dice.length < vals.length) { const d = mkDie(); g.add(d); dice.push(d); }
        if (k !== key) {
          key = k;
          vals.forEach((v, j) => {
            const d = dice[j], r = DIE_ROT[v], x = (j - (vals.length - 1) / 2) * 1.15, from = new TH.Vector3(x + 2.5, 2.4, 2.4), spin = [6 + j, 5, 7 - j];
            if (inst) { d.position.set(x, 0, 0); d.rotation.set(r[0], r[1], r[2]); return; }
            s.tween(900 + j * 140, (kk, e) => { d.position.set(from.x + (x - from.x) * e, from.y * (1 - e) + Math.abs(Math.sin(e * 9)) * 0.5 * (1 - e), from.z * (1 - e)); d.rotation.set(r[0] + (1 - e) * spin[0], r[1] + (1 - e) * spin[1], r[2] + (1 - e) * spin[2]); });
          });
        }
        lab.set(opts.text ? opts.text(S) : '', '#f7f0e1');
        if (puck) { const pt = S.V.g.point; puckLab.set(pt ? 'ON' : 'OFF', '#222'); puck.children[0].material.color.set(pt ? '#1a1a1a' : '#f7f0e1'); puckLab.set(pt ? 'ON' : 'OFF', pt ? '#fff' : '#222'); puck.position.x = pt ? ([4, 5, 6, 8, 9, 10].indexOf(pt) - 2.5) * 1.3 : -4.6; }
      },
    };
  };

  T3.diceProps = diceProps;
  const CF = {};

  CF.blackjack = {
    cards: (S, i) => arr(S.V.g.ps[i] && S.V.g.ps[i].cards), bet: (S, i) => (S.V.g.ps[i] || {}).bet || 0,
    status: (S, i, p) => (p.cards && p.cards.length ? (p.soft && p.t < 21 ? 'Soft ' : '') + p.t + (p.state === 'bust' ? ' Bust' : p.state === 'bj' ? ' Blackjack' : '') : ''),
    zones: S => [{ id: 'd', x: 0, z: -2.9, faces: arr(S.V.g.dealer), text: S.V.g.dealer && S.V.g.dealer.length ? 'Dealer ' + S.V.g.dt + (S.V.g.dealer.includes(-1) ? ' + ?' : '') : '', ly: -0.9 }],
    hint: S => (S.turn ? (S.turn.data.kind === 'bet' ? 'Place your bet with the chips below.' : 'Your move: hit, stand or double.') : ''),
  };
  CF.threecard = {
    cards: (S, i) => arr(S.V.g.ps[i] && S.V.g.ps[i].cards), bet: (S, i) => (S.V.g.ps[i] || {}).ante || 0,
    status: (S, i, p) => p.cat || (p.state === 'fold' ? 'Folded' : ''),
    zones: S => [{ id: 'd', x: 0, z: -2.9, faces: arr(S.V.g.dealer), text: S.V.g.dcat ? 'Dealer: ' + S.V.g.dcat : '', ly: -0.9 }],
  };
  CF.caribbean = {
    cards: (S, i) => arr(S.V.g.ps[i] && S.V.g.ps[i].cards), bet: (S, i) => { const p = S.V.g.ps[i] || {}; return (p.ante || 0) * (p.state === 'raise' ? 3 : 1); },
    status: (S, i, p) => (p.state === 'fold' ? 'Folded' : p.cat || ''),
    zones: S => [{ id: 'd', x: 0, z: -2.9, faces: arr(S.V.g.dealer), text: S.V.g.dcat ? 'Dealer: ' + S.V.g.dcat : '', ly: -0.9, w: 0.78 }],
  };
  CF.letitride = {
    cards: (S, i) => arr(S.V.g.ps[i] && S.V.g.ps[i].cards), bet: (S, i) => { const p = S.V.g.ps[i] || {}; return (p.bet || 0) * (p.units || 1); },
    zones: S => [{ id: 'c', x: 0, z: -1.5, faces: arr(S.V.g.comm), text: S.V.g.kind || '', w: 0.95 }],
  };
  CF.reddog = {
    cards: () => [], bet: (S, i) => (S.V.g.ps[i] || {}).bet || 0,
    zones: S => [{ id: 'c', x: 0, z: -1.5, faces: arr(S.V.g.cards), text: S.V.g.spread ? 'Spread ' + S.V.g.spread : (S.V.g.kind || ''), w: 0.95 }],
  };
  CF.baccarat = {
    cards: () => [], bet: (S, i) => { const b = (S.V.g.ps[i] || {}).bet; return b ? b.amt : 0; }, betText: (S, i) => { const b = (S.V.g.ps[i] || {}).bet; return b ? b.kind + ' ' + fmt(b.amt) : ''; },
    zones: S => { const g = S.V.g; return [
      { id: 'b', x: 0, z: -2.9, faces: arr(g.banker), text: g.banker && g.banker.length ? 'Banker ' + g.bk : '', ly: -0.9, w: 0.9 },
      { id: 'p', x: 0, z: -0.6, faces: arr(g.player), text: g.player && g.player.length ? 'Player ' + g.pt + (g.win ? ' · ' + (g.win === 'tie' ? 'Tie' : g.win[0].toUpperCase() + g.win.slice(1) + ' wins') : '') : '', w: 0.9 }]; },
  };
  CF.videopoker = {
    cards: (S, i) => arr(S.V.g.ps[i] && S.V.g.ps[i].cards), bet: (S, i) => (S.V.g.ps[i] || {}).bet || 0,
    held: (S, i) => { const rows = document.querySelectorAll('#vpSeats .seat'); const r = rows[i]; return r ? [...r.querySelectorAll('.vp-card')].map(b => b.classList.contains('held')) : []; },
    hint: S => (S.turn ? (S.turn.data.kind === 'hold' ? 'Tap cards to hold them, then press Draw.' : 'Tap a stake to be dealt five cards.') : ''),
    tapCards(s, e, S, seatG) {
      if (!(S.turn && S.turn.data.kind === 'hold') || S.me < 0) return;
      const h = seatG[S.me]; if (!h) return; const hit = s.pick(e, h.m)[0]; if (!hit) return;
      let o = hit.object; while (o && h.m.indexOf(o) < 0) o = o.parent; const k = h.m.indexOf(o); if (k < 0) return;
      const b = document.querySelectorAll('#vpSeats .seat')[S.me]; const btn = b && b.querySelector('[data-h="' + k + '"]'); if (btn) btn.click();
    },
  };
  CF.roulette = {
    cards: () => [], bet: (S, i) => { const b = (S.V.g.ps[i] || {}).bet; return b ? b.amt : 0; },
    betText: (S, i) => { const b = (S.V.g.ps[i] || {}).bet; return b ? (b.kind === 'num' ? '#' + b.n : b.kind) + ' ' + fmt(b.amt) : ''; },
    noDealer: false, felt: '#1f6a4a',
    props: (s, sc, TY0) => {
      const TH = THREE, wg = new TH.Group(); wg.position.set(0, TY0 + 0.12, -0.9); sc.add(wg);
      T3.mk(wg, T3.CYL(2.05, 2.15, 0.22, 48), T3.mat('#4a2a14', { roughness: 0.4 }), 0, 0, 0);
      const disc = T3.mk(wg, T3.CYL(1.8, 1.8, 0.1, 64), T3.mat('#fff', { map: wheelTex(), roughness: 0.5 }), 0, 0.14, 0); T3.mk(wg, T3.CYL(0.2, 0.28, 0.5, 14), T3.mat('#d6b05a', { metalness: 0.6, roughness: 0.3 }), 0, 0.3, 0);
      const ball = T3.mk(wg, T3.SPH(0.1, 12), T3.mat('#fafafa', { roughness: 0.2 }), 1.5, 0.28, 0); const lab = T3.label('', { scale: 2.6 }); lab.sprite.position.set(0, TY0 + 1.4, -0.9); sc.add(lab.sprite);
      let phase = '', ang = 0, rad = 1.55, landed = false, spinT = 0;
      return {
        frame(dt) {
          disc.rotation.y += dt * (phase === 'spin' ? 0.9 : 0.25);
          if (phase === 'spin') { spinT += dt; ang -= dt * (9 - Math.min(5, spinT * 3)); rad = 1.55; landed = false; ball.visible = true; ball.position.set(Math.cos(ang) * rad, 0.28, Math.sin(ang) * rad); }
          else if (landed) { ball.position.set(Math.cos(landAng()) * 1.35, 0.26, Math.sin(landAng()) * 1.35); }
        },
        sync(S, inst) {
          const g = S.V.g; if (g.phase !== phase) { phase = g.phase; spinT = 0; }
          if (phase === 'done' && g.result !== null && g.result !== undefined) { landed = true; lastRes = g.result; lab.set(g.result + (g.result === 0 ? ' green' : RED.has(g.result) ? ' red' : ' black'), '#f7f0e1'); }
          else { if (phase !== 'spin') landed = false; lab.set(phase === 'spin' ? 'No more bets…' : '', '#f7f0e1'); if (phase !== 'spin' && g.result == null) { ball.position.set(1.5, 0.28, 0); } }
        },
      };
      function landAng() { const k = WHEEL.indexOf(lastRes); return -disc.rotation.y + (k * Math.PI * 2 / 37) - Math.PI / 2 + Math.PI / 2 * 0; }
    },
  };
  let lastRes = 0;
  CF.sicbo = {
    cards: () => [], bet: (S, i) => { const b = (S.V.g.ps[i] || {}).bet; return b ? b.amt : 0; },
    betText: (S, i) => { const b = (S.V.g.ps[i] || {}).bet; return b ? (b.kind === 'num' ? 'number ' + b.n : b.kind === 'sum' ? 'total ' + b.n : b.kind) + ' ' + fmt(b.amt) : ''; },
    props: diceProps({ z: -0.6, dice: S => S.V.g.dice, text: S => { const d = arr(S.V.g.dice); return d.length ? 'Total ' + d.reduce((a, b) => a + b, 0) : ''; } }),
  };
  CF.craps = {
    cards: () => [], bet: (S, i) => { const b = (S.V.g.ps[i] || {}).bet; return b ? b.amt : 0; },
    betText: (S, i) => { const b = (S.V.g.ps[i] || {}).bet; return b ? b.kind + ' ' + fmt(b.amt) : ''; },
    props: diceProps({ z: -0.8, puck: true, dice: S => S.V.g.dice, text: S => { const g = S.V.g, d = arr(g.dice); return (d.length ? 'Rolled ' + (d[0] + d[1]) + ' · ' : '') + (g.point ? 'Point ' + g.point : 'Come-out roll'); } }),
  };
  CF.slots = {
    cards: () => [], bet: (S, i) => (S.V.g.ps[i] || {}).bet || 0,
    noDealer: true,
    props: (s, sc, TY0) => {
      const TH = THREE, cab = new TH.Group(); cab.position.set(0, TY0, -1.4); sc.add(cab);
      T3.mk(cab, T3.BOX(4.6, 3.6, 1.7), T3.mat('#a3262a', { roughness: 0.45 }), 0, 1.8, 0); T3.mk(cab, T3.BOX(4.9, 0.4, 1.9), T3.mat('#d6b05a', { metalness: 0.6, roughness: 0.3 }), 0, 3.7, 0);
      T3.mk(cab, T3.BOX(4.0, 1.5, 0.12), T3.mat('#111'), 0, 2.15, 0.88);
      const SYM = ['🍒', '🍋', '🔔', '⭐', '💎', '7'], reels = [], ctxs = [];
      for (let k = 0; k < 3; k++) {
        const c = document.createElement('canvas'); c.width = c.height = 128; const tex = new TH.CanvasTexture(c), gx = c.getContext('2d'); ctxs.push({ c, tex, gx, cur: -2 });
        const m = new TH.Mesh(new TH.PlaneGeometry(1.2, 1.2), new TH.MeshBasicMaterial({ map: tex })); m.position.set((k - 1) * 1.3, 2.15, 0.96); cab.add(m); reels.push(m);
      }
      const lever = new TH.Group(); lever.position.set(2.5, 2.2, 0); cab.add(lever); T3.mk(lever, T3.CYL(0.06, 0.06, 1.3, 8), T3.mat('#bbb', { metalness: 0.7 }), 0, 0.65, 0); T3.mk(lever, T3.SPH(0.2, 12), T3.mat('#c4372e'), 0, 1.35, 0);
      const lab = T3.label('', { scale: 3 }); lab.sprite.position.set(0, TY0 + 4.6, -1.4); sc.add(lab.sprite);
      let focus = -1, t0 = 0, SS = null;
      const draw = (k, v) => { const o = ctxs[k]; if (o.cur === v) return; o.cur = v; o.gx.fillStyle = '#f7f0e1'; o.gx.fillRect(0, 0, 128, 128); o.gx.font = (v === 5 ? '700 90px Georgia, serif' : '86px serif'); o.gx.textAlign = 'center'; o.gx.textBaseline = 'middle'; o.gx.fillStyle = v === 5 ? '#c4372e' : '#222'; o.gx.fillText(v < 0 ? '' : SYM[v], 64, 70); o.tex.needsUpdate = true; };
      return {
        frame(dt, t) {
          if (!SS) return; const g = SS.V.g, p = g.ps[focus]; if (!p) return; const spinning = g.turn === focus && p.bet > 0;
          for (let k = 0; k < 3; k++) { if (p.reels[k] === null || p.reels[k] === undefined) { if (spinning) draw(k, Math.floor(t * 14 + k * 3) % 6); else draw(k, -1); } else draw(k, p.reels[k]); }
          lever.rotation.x += ((spinning ? 0.9 : 0) - lever.rotation.x) * Math.min(1, dt * 6);
        },
        sync(S) { SS = S; const g = S.V.g; if (g.turn >= 0) focus = g.turn; else if (focus < 0 || !g.ps[focus] || !g.ps[focus].bet) { const f = g.ps.findIndex(p => p.bet > 0); focus = f >= 0 ? f : (S.me >= 0 ? S.me : 0); }
          lab.set(S.V.g.ps[focus] ? 'Reels: ' + S.nameOf(focus) : '', '#f7f0e1'); },
      };
    },
  };
  CF.keno = {
    cards: () => [], bet: (S, i) => (S.V.g.ps[i] || {}).bet || 0, betText: (S, i) => { const p = S.V.g.ps[i] || {}; return p.bet ? p.picks.length + ' spots · ' + fmt(p.bet) : ''; },
    noDealer: true, felt: '#2b3a6a',
    hint: S => (S.turn ? 'Tap numbers on the board (up to 8), then pick a stake below.' : ''),
    props: (s, sc, TY0) => {
      const TH = THREE, c = document.createElement('canvas'); c.width = 1024; c.height = 640; const gx = c.getContext('2d'), tex = new TH.CanvasTexture(c);
      const board = new TH.Mesh(new TH.PlaneGeometry(7.6, 4.75), new TH.MeshBasicMaterial({ map: tex })); board.position.set(0, TY0 + 2.5, -2.3); board.rotation.x = -0.32; sc.add(board);
      T3.mk(sc, T3.BOX(7.9, 5.05, 0.2), T3.mat('#2a1810'), 0, TY0 + 2.5, -2.42, { noCast: true }).rotation.x = -0.32;
      const lab = T3.label('', { scale: 3 }); lab.sprite.position.set(0, TY0 + 5.6, -2.3); sc.add(lab.sprite); let key = '', SS = null;
      const draw = () => {
        gx.fillStyle = '#0f1a38'; gx.fillRect(0, 0, 1024, 640);
        const btns = document.querySelectorAll('#knGrid .kn-n');
        for (let n = 1; n <= 80; n++) {
          const col = (n - 1) % 10, row = Math.floor((n - 1) / 10), x = 12 + col * 100, y = 12 + row * 78, b = btns[n - 1], cl = b ? b.className : '';
          gx.fillStyle = cl.includes('hit') ? '#3fbf6a' : cl.includes('drawn') ? '#f2b441' : cl.includes('pick') ? '#3f8be8' : '#26335c'; gx.beginPath(); gx.roundRect ? gx.roundRect(x, y, 90, 68, 10) : gx.rect(x, y, 90, 68); gx.fill();
          gx.fillStyle = cl.includes('drawn') || cl.includes('hit') ? '#1b1206' : '#f7f0e1'; gx.font = '700 34px Figtree, sans-serif'; gx.textAlign = 'center'; gx.textBaseline = 'middle'; gx.fillText(String(n), x + 45, y + 36);
        }
        tex.needsUpdate = true;
      };
      return {
        sync(S) {
          SS = S; const g = S.V.g, btns = document.querySelectorAll('#knGrid .kn-n'), k = [...btns].map(b => b.className).join('|') + g.drawn.length; if (k !== key) { key = k; draw(); }
          lab.set(g.drawn.length ? g.drawn.length + ' of 20 drawn' : '', '#f7f0e1');
        },
        tap(e, S) {
          if (!S.turn || S.me < 0) return; const hit = s.pick(e, [board])[0]; if (!hit || !hit.uv) return;
          const col = Math.floor(hit.uv.x * 1024 / 100 - 0.12), row = Math.floor((640 - hit.uv.y * 640) / 78 - 0.15); if (col < 0 || col > 9 || row < 0 || row > 7) return;
          const b = document.querySelector('#knGrid .kn-n[data-n="' + (row * 10 + col + 1) + '"]'); if (b) b.click();
        },
      };
    },
  };

  /* ---------- hook onto the games ---------- */
  const SET = [
    ['blackjack', CF.blackjack, ['.bj-dealer']], ['threecard', CF.threecard, ['.bac-h']], ['caribbean', CF.caribbean, ['.bac-h']],
    ['letitride', CF.letitride, ['.bac-h']], ['reddog', CF.reddog, ['#rdCards']], ['baccarat', CF.baccarat, ['#bacHands']],
    ['videopoker', CF.videopoker, []], ['roulette', CF.roulette, ['#rlBall']], ['sicbo', CF.sicbo, ['#sicDice', '#sicTot']],
    ['craps', CF.craps, ['#crPuck', '#crDice', '#crTot']], ['slots', CF.slots, []], ['keno', CF.keno, ['#knGrid']],
  ];
  // default hand overlay: the shared / dealer cards, then my own cards
  const defHands = (st, S) => {
    const me = S ? S.me : -1, L = [], sh = st.querySelector('#csDealer, #lrComm, #bjDcards, #rdCards');
    if (sh) L.push({ label: sh.id === 'lrComm' ? 'Community' : sh.id === 'rdCards' ? 'Spread' : 'Dealer', el: sh });
    const mine = st.querySelector('#bjSeats .seat.me .cards') || (me >= 0 && st.querySelector(`.tc-seats > .seat:nth-child(${me + 1}) .cards`));
    if (mine) L.push({ label: 'You', el: mine });
    return L;
  };
  const attach = (id, cfg, hide) => {
    cfg._hud = id !== 'baccarat';
    const D = Club.games[id]; if (!D) return;
    const m2 = D.ui.mount; D.ui.mount = function (st, ctl, S) { st.classList.remove('c3d'); return m2.call(this, st, ctl, S); };
    const w = T3.wrapUi(D.ui, { slot: st => ({ before: st.querySelector('.table'), hide: hide.map(q => st.querySelector(q)) }), hands: cfg.hands || defHands, make: (box, S) => casino3(box, S, cfg) });
    D.ui3d = { mount(st, ctl, S) { w.mount(st, ctl, S); if (st.querySelector('.s3dbox')) st.classList.add('c3d'); }, update: w.update };
  };
  T3.casino3 = casino3; T3.attach3 = attach;
  for (const [id, cfg, hide] of SET) attach(id, cfg, hide);
})();
