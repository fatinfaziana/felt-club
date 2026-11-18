/* ===================== Card & casino rooms: a 3D room around the 2D table =====================
   The room (lounge, lamps, a dealer and the other players sitting around the table) is drawn in 3D behind the game.
   The cards, chips and buttons stay in 2D in front, large and easy to read. There is nothing to switch. */
(() => {
  const AVC = ['#3f8be8', '#e0443c', '#5cc8b0', '#e8a23a', '#a063d8', '#e8708a', '#8ab4ff', '#9ac24a'];
  const TY = 2.5;
  const THEME = {
    poker: { wall: '#1d2a38', felt: '#1f7a4a', bg: 0x0c1118 }, bigtwo: { wall: '#2d1b3d', felt: '#1f6a52', bg: 0x120b1a }, rush: { wall: '#1d2250', felt: '#2a3a6a', bg: 0x0b0e24 },
    roulette: { wall: '#3a1220', felt: '#1a6b3a', bg: 0x14080e }, craps: { wall: '#2a1424', felt: '#1f6a52', bg: 0x0c0810 }, sicbo: { wall: '#3a1a14', felt: '#8a1f2a', bg: 0x140a08 },
    slots: { wall: '#241044', felt: '#3a1a6a', bg: 0x0a0618 }, keno: { wall: '#10244a', felt: '#2b3a6a', bg: 0x080e1e },
  };
  const dflt = { wall: '#2a1424', felt: '#1f7a4a', bg: 0x0c0810 };

  function scene(box, S0, id, dealer) {
    const TH = THREE, th = THEME[id] || dflt, s = T3.stage(box, { fov: 46 }), sc = s.scene;
    s.cv.style.pointerEvents = 'none';
    T3.lounge(s, { w: 40, d: 32, h: 9, lamps: [[-9, -6], [9, -6], [0, 4]], lampPower: 0.8, ambient: 0.62, wall: th.wall, bg: th.bg });
    const key = new TH.SpotLight(0xfff0d0, 1.5, 50, 0.95, 0.6, 1.1); key.position.set(0, 14, 2); key.target.position.set(0, TY, -0.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0008; key.shadow.normalBias = 0.05; sc.add(key, key.target);
    T3.mk(sc, new TH.CircleGeometry(15, 56), T3.mat('#3a1220', { roughness: 1 }), 0, 0.012, 0, { noCast: true }).rotation.x = -Math.PI / 2;
    const felt = T3.canvasTex(512, 512, T3.speckle(th.felt, 40, 7000)), TA = 8.6, TB = 4.8;
    const top = T3.mk(sc, new TH.CylinderGeometry(1, 1, 0.3, 72), T3.mat('#fff', { map: felt, roughness: 1 }), 0, TY - 0.15, 0); top.scale.set(TA, 1, TB);
    const pts = []; for (let k = 0; k < 96; k++) { const a = k / 96 * Math.PI * 2; pts.push(new TH.Vector3(Math.cos(a) * (TA + 0.1), TY, Math.sin(a) * (TB + 0.1))); }
    T3.mk(sc, new TH.TubeGeometry(new TH.CatmullRomCurve3(pts, true), 120, 0.28, 12, true), T3.mat('#3b1d12', { roughness: 0.35 }), 0, 0, 0);
    T3.mk(sc, T3.CYL(1.4, 2.2, TY - 0.3, 24), T3.mat('#2a1810'), 0, (TY - 0.3) / 2, 0);
    // a row of glowing machines and signs along the back wall for atmosphere
    const glow = [];
    for (let i = -4; i <= 4; i++) {
      const m = T3.mk(sc, T3.BOX(2.2, 4.2, 1.4), T3.mat('#1a1022'), i * 4.2, 2.1, -14.5, { noCast: true });
      const c = new TH.Color().setHSL((i * 0.11 + 0.9) % 1, 0.8, 0.55), scr = T3.mk(sc, T3.BOX(1.7, 1.2, 0.05), new TH.MeshBasicMaterial({ color: c }), i * 4.2, 3.2, -13.78, { noCast: true }); glow.push(scr);
    }
    s.on((dt, t) => glow.forEach((g, i) => { g.material.color.offsetHSL(dt * 0.05, 0, 0); g.scale.y = 1 + 0.06 * Math.sin(t * 2 + i); }));
    if (dealer) {
      const dp = T3.person('#7a1f3a', { idx: 4 }); dp.scale.setScalar(2.2); dp.position.set(0, 0, -6.8); sc.add(dp); s.addPerson(dp);
      const dl = T3.label('Dealer', { scale: 3 }); dl.sprite.position.y = 2.3; dl.sprite.scale.multiplyScalar(1 / 2.2); dp.add(dl.sprite);
    }
    s.setViews({ seat: { label: 'Seat', pos: [0, 6.2, 10.5], look: [0, 1.6, -7], fov: 50, zoom: 0, sway: 0.03 } }, 'seat', true);

    const people = [], tags = [], diam = [], chairs = []; let key2 = '', SS = S0;
    function layout(S) {
      [...people, ...chairs].forEach(o => sc.remove(o)); tags.forEach(l => l.sprite.parent && l.sprite.parent.remove(l.sprite));
      people.length = tags.length = diam.length = chairs.length = 0;
      const n = S.V.seats.length, others = []; for (let i = 0; i < n; i++) if (i !== S.me) others.push(i);
      others.forEach((i, k) => {
        const m = others.length, f = m <= 1 ? 0.5 : k / (m - 1), a = (-68 + 136 * f) * Math.PI / 180, ox = 10.8 * Math.sin(a), oz = -(7.4 * Math.cos(a)) + (dealer ? 0.9 : 0), ry = Math.atan2(-ox, -oz);
        const ch = T3.mk(sc, T3.BOX(2.0, 0.3, 2.0), T3.mat('#2a1a3a', { roughness: 0.8 }), ox, 1.28, oz); ch.rotation.y = ry; chairs.push(ch);
        const L = Math.hypot(ox, oz), bk = T3.mk(sc, T3.BOX(2.0, 2.4, 0.26), T3.mat('#2a1a3a', { roughness: 0.8 }), ox + ox / L, 2.5, oz + oz / L); bk.rotation.y = ry; chairs.push(bk);
        const pp = T3.person(AVC[i % 8], { seated: true, idx: i }); pp.scale.setScalar(2.2); pp.position.set(ox, 0, oz); pp.rotation.y = ry; sc.add(pp); s.addPerson(pp); people.push(pp); pp.userData.seat = i;
        const lb = T3.label('', { scale: 3.6 }); lb.sprite.position.y = 2.1; lb.sprite.scale.multiplyScalar(1 / 2.2); pp.add(lb.sprite); tags.push(lb);
        const dm = T3.mk(pp, new TH.OctahedronGeometry(0.1), new TH.MeshBasicMaterial({ color: 0xf2b441 }), 0, 2.42, 0, { noCast: true }); dm.visible = false; diam.push(dm);
      });
      key2 = S.me + '|' + S.V.seats.map(q => q.u || q.n).join(',');
    }
    s.on((dt, t) => { const g = SS.V.g || {}, who = g.turn !== undefined ? g.turn : g.active; people.forEach((pp, k) => { const act = who === pp.userData.seat && !SS.V.done; if (diam[k]) { diam[k].visible = act; diam[k].position.y = 2.42 + Math.sin(t * 3) * 0.05; diam[k].rotation.y = t * 2; } const ar = pp.userData.arms; ar[1].rotation.x += ((act ? -1.3 : -1.0) - ar[1].rotation.x) * Math.min(1, dt * 4); }); });
    s.sync = S => {
      SS = S; if (key2 !== S.me + '|' + S.V.seats.map(q => q.u || q.n).join(',')) layout(S);
      people.forEach((pp, k) => { const i = pp.userData.seat, st = S.V.seats[i]; if (st) tags[k].set(`${S.nameOf(i)} · ${fmt(st.stack)}`, '#f7f0e1'); });
    };
    s.sync(S0); return s;
  }

  function ambient(ui2d, id, dealer) {
    let sc = null, lastS = null;
    return {
      mount(stageEl, ctl, S) {
        ui2d.mount(stageEl, ctl, S); sc = null; lastS = S;
        let wrap = null, fg = null;
        try {
          wrap = document.createElement('div'); wrap.className = 'ambwrap'; const bg = document.createElement('div'); bg.className = 'ambbg'; fg = document.createElement('div'); fg.className = 'ambfg';
          while (stageEl.firstChild) fg.appendChild(stageEl.firstChild);
          wrap.append(bg, fg); stageEl.appendChild(wrap); stageEl.classList.add('amb');
          sc = scene(bg, S, id, dealer);
        } catch (e) {
          console.error(e); try { window.__errs && window.__errs.push('3D: ' + (e && e.stack || e)); } catch (x) {}
          if (wrap && fg) { while (fg.firstChild) stageEl.appendChild(fg.firstChild); wrap.remove(); } stageEl.classList.remove('amb'); sc = null;
        }
      },
      update(S) { lastS = S; const r = ui2d.update(S); if (sc && sc.sync) { try { sc.sync(S); } catch (e) { console.error(e); } } return r; },
    };
  }
  T3.ambient = ambient;
})();
