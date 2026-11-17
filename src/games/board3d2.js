/* ===================== 3D tables: Mancala, Dots and Boxes, Snakes-style Ladders ===================== */
(() => {
  const COL = ['#f2b441', '#f7f0e1'], SEED = ['#e04a3a', '#3f8be8', '#5cc8b0', '#f2b441', '#a063d8'];
  const ring = (root, x, z, col, r, y) => { const m = T3.mk(root, new THREE.TorusGeometry(r || 0.5, 0.05, 8, 28), new THREE.MeshBasicMaterial({ color: col }), x, y || 0.3, z, { noCast: true }); m.rotation.x = Math.PI / 2; return m; };
  const V = (pos, look) => ({ seat: { label: 'Seat', pos, look, fov: 42, sway: 0.01 }, top: { label: 'Top', pos: [0, 19, 0.01], look: [0, 2.5, 0.4], up: [0, 0, -1], fov: 42 }, side: { label: 'Side', pos: [11.5, 7.5, 5], look: [0, 2.4, 0], fov: 42 } });

  /* ---------- Mancala ---------- */
  function mancala(s, root, TH) {
    const SPC = 1.5;
    T3.mk(root, T3.BOX(12.4, 0.5, 4.4), T3.mat('#7a4a22', { roughness: 0.5 }), 0, 0.1, 0, { noCast: true });
    const pitX = k => (k - 2.5) * SPC, pits = [], pickers = [], seeds = {}, marks = [], key = {};
    const mkPit = (x, z, r, sx) => { const m = T3.mk(root, T3.CYL(r, r, 0.08, 28), T3.mat('#2b170a', { roughness: 0.9 }), x, 0.37, z, { noCast: true }); m.scale.x = sx || 1; return m; };
    for (let k = 0; k < 6; k++) { mkPit(pitX(k), 1.05, 0.62); mkPit(pitX(k), -1.05, 0.62); }
    const stores = [mkPit(-5.35, 0, 0.8, 0.62), mkPit(5.35, 0, 0.8, 0.62)];
    stores.forEach(st => { st.scale.set(0.8, 1, 1.9); st.geometry = new TH.CylinderGeometry(0.8, 0.8, 0.08, 28); });
    const bottom = [];
    for (let k = 0; k < 6; k++) { const m = T3.mk(root, T3.CYL(0.7, 0.7, 0.04, 20), new TH.MeshBasicMaterial({ visible: false }), pitX(k), 0.45, 1.05, { noCast: true }); m.userData.p = k; pickers.push(m); }
    const labels = [T3.label('', { scale: 1.6 }), T3.label('', { scale: 1.6 })]; labels[0].sprite.position.set(-5.35, 1.7, 0); labels[1].sprite.position.set(5.35, 1.7, 0); labels.forEach(l => root.add(l.sprite));
    const fill = (id, n, cx, cz, rad, w) => {
      const k = n + '|' + w; if (key[id] === k) return; key[id] = k; (seeds[id] || []).forEach(m => root.remove(m)); seeds[id] = [];
      for (let i = 0; i < Math.min(n, 36); i++) {
        const a = i * 2.4 + id.length, rr = rad * Math.sqrt((i + 0.5) / Math.min(n, 36)) * 0.8, ly = 0.46 + Math.floor(i / 14) * 0.16;
        const m = T3.mk(root, T3.SPH(0.16, 10), T3.mat(SEED[(i + id.charCodeAt(0)) % 5], { roughness: 0.3 }), cx + Math.cos(a) * rr * (w || 1), ly, cz + Math.sin(a) * rr); seeds[id].push(m);
      }
    };
    return {
      sync(S) {
        const g = S.V.g, me = S.me === 1 ? 1 : 0, opp = 1 - me;
        marks.forEach(m => root.remove(m)); marks.length = 0;
        for (let k = 0; k < 6; k++) { fill('b' + k, g.b[me * 7 + k], pitX(k), 1.05, 0.5); fill('t' + k, g.b[opp * 7 + k], pitX(5 - k), -1.05, 0.5); }
        fill('sL', g.b[opp * 7 + 6], -5.35, 0, 0.9, 0.5); fill('sR', g.b[me * 7 + 6], 5.35, 0, 0.9, 0.5);
        labels[0].set(String(g.b[opp * 7 + 6]), '#f7f0e1'); labels[1].set(String(g.b[me * 7 + 6]), '#f7f0e1');
        document.querySelectorAll('#mc .mc-p[data-p]').forEach(b => { const k = +b.dataset.p; if (b.classList.contains('ok')) marks.push(ring(root, pitX(k), 1.05, 0x6ee09a, 0.66, 0.42)); if (b.classList.contains('last')) marks.push(ring(root, pitX(k), 1.05, 0xf2b441, 0.56, 0.42)); });
      },
      tap(e) { const h = s.pick(e, pickers)[0]; if (!h) return false; const b = document.querySelector(`#mc [data-p="${h.object.userData.p}"]`); if (!b || b.disabled) return false; b.click(); return true; },
    };
  }

  /* ---------- Dots and Boxes ---------- */
  function dots(s, root, TH) {
    const L = 1.9;
    const kids = [...document.getElementById('db').children], B = Math.round(Math.sqrt(kids.length) - 1) / 2, W = 2 * B + 1;
    T3.mk(root, T3.BOX(B * L + 1.6, 0.2, B * L + 1.6), T3.mat('#d9b36b', { roughness: 0.55 }), 0, 0.05, 0, { noCast: true });
    const X = C => (C - B) * L / 2, Z = R => (R - B) * L / 2, edges = {}, boxes = {}, picks = [];
    kids.forEach((el, idx) => {
      const R = Math.floor(idx / W), C = idx % W;
      if (R % 2 === 0 && C % 2 === 0) T3.mk(root, T3.CYL(0.16, 0.16, 0.14, 14), T3.mat('#2b170a'), X(C), 0.2, Z(R));
      else if (el.dataset.e !== undefined) {
        const e = +el.dataset.e, hz = R % 2 === 0;
        const m = T3.mk(root, T3.BOX(hz ? L - 0.45 : 0.14, 0.06, hz ? 0.14 : L - 0.45), T3.mat('#a98a58', { roughness: 0.8 }), X(C), 0.17, Z(R), { noCast: true }); edges[e] = m;
        const p = T3.mk(root, T3.BOX(hz ? L - 0.3 : 0.55, 0.05, hz ? 0.55 : L - 0.3), new TH.MeshBasicMaterial({ visible: false }), X(C), 0.2, Z(R), { noCast: true }); p.userData.e = e; picks.push(p);
      } else if (el.dataset.b !== undefined) boxes[+el.dataset.b] = { x: X(C), z: Z(R), m: null };
    });
    return {
      sync(S, first) {
        document.querySelectorAll('#db .db-e').forEach(el => {
          const m = edges[+el.dataset.e]; if (!m) return; const on = el.classList.contains('on'), last = el.classList.contains('last');
          m.material.color.set(last ? '#f2b441' : on ? '#f7f0e1' : '#a98a58'); m.scale.y = on ? 2.6 : 1; m.position.y = on ? 0.21 : 0.17;
          if (on && !m.userData.on) { m.userData.on = true; if (!first) { const y1 = 0.21; m.position.y = 1.4; s.tween(260, (k, e) => { m.position.y = y1 + (1.4 - y1) * (1 - e); }); } }
        });
        document.querySelectorAll('#db .db-b').forEach(el => {
          const b = boxes[+el.dataset.b], p = el.classList.contains('p0') ? 0 : el.classList.contains('p1') ? 1 : -1;
          if (b && p >= 0 && !b.m) { b.m = T3.mk(root, T3.BOX(L - 0.55, 0.12, L - 0.55), T3.mat(COL[p], { roughness: 0.4 }), b.x, 0.2, b.z, { noCast: true }); if (!first) { b.m.scale.setScalar(0.1); s.tween(300, (k, e) => b.m.scale.setScalar(0.1 + 0.9 * e)); } }
        });
      },
      tap(e) { const h = s.pick(e, picks)[0]; if (!h) return false; const b = document.querySelector(`#db [data-e="${h.object.userData.e}"]`); if (!b || b.disabled) return false; b.click(); return true; },
    };
  }

  /* ---------- Ladders ---------- */
  function ladders(s, root, TH) {
    const W = 9.6, CELL = W / 10;
    const tex = T3.canvasTex(1024, 1024, (g, w, h) => {
      const c = w / 10;
      for (let r = 0; r < 10; r++) for (let q = 0; q < 10; q++) {
        const n = (9 - r) % 2 === 0 ? (9 - r) * 10 + q + 1 : (9 - r) * 10 + 10 - q;
        g.fillStyle = (r + q) % 2 ? '#e7cf9f' : '#c9a06a'; g.fillRect(q * c, r * c, c, c);
        g.fillStyle = 'rgba(60,35,15,.75)'; g.font = '700 30px Figtree, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(String(n), q * c + 8, r * c + 6);
      }
    });
    T3.mk(root, T3.BOX(W + 0.5, 0.18, W + 0.5), T3.mat('#fff', { map: tex, roughness: 0.6 }), 0, 0.05, 0, { noCast: true });
    const P = (x, y) => new TH.Vector3((x / 100 - 0.5) * W, 0.2, (y / 100 - 0.5) * W);
    document.querySelectorAll('.ld-svg line').forEach(l => {
      const a = P(+l.getAttribute('x1'), +l.getAttribute('y1')), b = P(+l.getAttribute('x2'), +l.getAttribute('y2')), lad = l.classList.contains('lad');
      const dir = b.clone().sub(a), len = dir.length(), nrm = new TH.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(0.14);
      if (lad) {
        for (const sg of [-1, 1]) { const rail = T3.mk(root, T3.BOX(0.07, 0.07, len), T3.mat('#2f9e5a', { roughness: 0.5 }), (a.x + b.x) / 2 + nrm.x * sg, 0.28, (a.z + b.z) / 2 + nrm.z * sg, { noCast: true }); rail.rotation.y = Math.atan2(dir.x, dir.z); }
        for (let t = 0.5; t < len; t += 0.45) { const p = a.clone().add(dir.clone().multiplyScalar(t / len)); const rg = T3.mk(root, T3.BOX(0.3, 0.05, 0.05), T3.mat('#2f9e5a'), p.x, 0.28, p.z, { noCast: true }); rg.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI / 2; rg.rotation.y = Math.atan2(dir.x, dir.z); }
      } else {
        const pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12, p = a.clone().lerp(b, t); const wob = Math.sin(t * Math.PI * 3) * 0.35; p.x += nrm.x * 2.4 * wob; p.z += nrm.z * 2.4 * wob; p.y = 0.3; pts.push(p); }
        const tube = new TH.Mesh(new TH.TubeGeometry(new TH.CatmullRomCurve3(pts), 40, 0.12, 8, false), T3.mat('#d6453d', { roughness: 0.4 })); root.add(tube);
        T3.mk(root, T3.SPH(0.2, 12), T3.mat('#d6453d'), a.x, 0.32, a.z).scale.set(1, 0.7, 1.2); // head at the top
      }
    });
    const cellPos = n => { if (n <= 0) return new TH.Vector3(-W / 2 - 0.6, 0.2, W / 2 + 0.2); const k = n - 1, r = Math.floor(k / 10), c = r % 2 === 0 ? k % 10 : 9 - (k % 10); return new TH.Vector3((c - 4.5) * CELL, 0.2, (4.5 - r) * CELL); };
    const pawns = [], at = [];
    const pawn = i => { const g = new TH.Group(); T3.mk(g, T3.CYL(0.22, 0.3, 0.3, 16), T3.mat(i < 2 ? COL[i] : SEED[i], { roughness: 0.4 }), 0, 0.15, 0); T3.mk(g, T3.SPH(0.22, 16), T3.mat(i < 2 ? COL[i] : SEED[i], { roughness: 0.4 }), 0, 0.45, 0); root.add(g); return g; };
    const die = T3.mkDie(); die.scale.setScalar(1.2); die.position.set(W / 2 + 1.4, 0.4, -1.5); root.add(die); let dieKey = -1;
    const note = T3.label('', { scale: 2.6 }); note.sprite.position.set(W / 2 + 1.4, 1.5, -1.5); root.add(note.sprite);
    return {
      sync(S, first) {
        const g = S.V.g;
        g.pos.forEach((p, i) => {
          if (!pawns[i]) { pawns[i] = pawn(i); at[i] = -999; }
          if (at[i] === p) return;
          const from = at[i] === -999 ? cellPos(p) : cellPos(at[i]), to = cellPos(p), off = new TH.Vector3((i % 2 - 0.5) * 0.3, 0, (Math.floor(i / 2) - 0.5) * 0.3); at[i] = p; const pw = pawns[i];
          if (first || from.equals(to)) { pw.position.copy(to).add(off); return; }
          s.tween(750, (k, e) => { pw.position.lerpVectors(from, to, e).add(off); pw.position.y += Math.abs(Math.sin(e * Math.PI * Math.min(8, from.distanceTo(to) / 1.1 + 1))) * 0.35; });
        });
        if (g.die && g.die !== dieKey) { dieKey = g.die; const r = T3.DIE_ROT[g.die]; if (first) die.rotation.set(r[0], r[1], r[2]); else s.tween(800, (k, e) => { die.position.y = 0.4 + Math.abs(Math.sin(e * 9)) * 1.1 * (1 - e); die.rotation.set(r[0] + (1 - e) * 7, r[1] + (1 - e) * 5, r[2] + (1 - e) * 6); }); }
        note.set(g.note || '', '#f7f0e1');
      },
    };
  }

  const SET = [
    ['mancala', { build: mancala, views: V([0, 11, 9], [0, 2.4, 0.4]), hint: 'Tap one of your pits (the bottom row).' }, ['#mc']],
    ['dotsboxes', { build: dots, views: V([0, 12.5, 9.6], [0, 2.4, 0.4]), hint: 'Tap a gap between two dots. Close a box and go again.' }, ['#db']],
    ['ladders', { build: ladders, views: V([0, 13.6, 10.6], [0, 2.4, 0.4]), hint: 'Roll the die with the button below.' }, ['.ld']],
  ];
  for (const [id, cfg, hide] of SET) {
    const D = Club.games[id]; if (!D) continue;
    D.ui3d = T3.wrapUi(D.ui, { slot: st => ({ before: st.querySelector('.table > :nth-child(2)'), hide: hide.map(q => st.querySelector(q)) }), make: (box, S) => T3.board3(box, S, cfg) });
  }
})();
