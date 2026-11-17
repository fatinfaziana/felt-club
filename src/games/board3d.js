/* ===================== 3D tables for the grid board games =====================
   Checkers, Reversi, Gomoku, Four in a Row, Tic-tac-toe.
   The 2D screen keeps running underneath (hidden board); the 3D scene reads the same board state
   from its buttons and taps the matching button, so the rules and bots stay in one place. */
(() => {
  const COL = ['#f2b441', '#f7f0e1'], AV = ['#3f8be8', '#e0443c'];
  const TY = 2.5;

  function board3(box, S0, cfg) {
    const TH = THREE, s = T3.stage(box, { fov: 42 }), sc = s.scene;
    T3.lounge(s, { w: 30, d: 26, lamps: [], ambient: 0.65, wall: '#1d2a38', bg: 0x0c1118 });
    const key = new TH.SpotLight(0xfff0d0, 1.45, 40, 0.95, 0.6, 1.1); key.position.set(0, 14, 3); key.target.position.set(0, TY, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; sc.add(key, key.target);
    T3.mk(sc, new TH.CircleGeometry(11, 56), T3.mat('#3a2a1e', { roughness: 1 }), 0, 0.012, 0, { noCast: true }).rotation.x = -Math.PI / 2;
    const wood = T3.canvasTex(512, 512, T3.speckle('#6b4423', 30, 5000));
    T3.mk(sc, T3.BOX(13, 0.5, 11), T3.mat('#fff', { map: wood, roughness: 0.55 }), 0, TY - 0.25, 0);
    T3.mk(sc, T3.BOX(1.6, TY - 0.5, 1.6), T3.mat('#2a1810'), 0, (TY - 0.5) / 2, 0);
    const root = new TH.Group(); root.position.set(0, TY, 0); sc.add(root);
    const api = cfg.build(s, root, TH);
    let SS = S0, people = [], diam = [], tags = [], laidOut = false, first = true;

    function seat(S) {
      people.forEach(p => sc.remove(p)); people = []; diam = []; tags = [];
      const n = S.V.seats.length, me = S.me;
      for (let i = 0; i < n; i++) {
        const rel = me >= 0 ? (i === me ? 0 : 1) : i;      // 0 = near side
        const ew = cfg.sides === 'ew';
        const others = n - (me >= 0 ? 1 : 0), oi = me >= 0 ? (i < me ? i : i - 1) : i, spread = (oi - (others - 1) / 2) * 4.4;
        const ox = ew ? (rel === 0 ? -8 : 8) : (rel === 1 && others > 1 ? spread : 0), oz = ew ? 1.5 : (rel === 0 ? 7.4 : -7.4), ry = ew ? (rel === 0 ? Math.PI / 2 : -Math.PI / 2) : (rel === 0 ? Math.PI : 0);
        // person faces +z by default: near side must face -z (rotate pi), far side faces +z
        const pp = T3.person(AV[i % 2], { seated: true, idx: i + 2 }); pp.scale.setScalar(2.2); pp.position.set(ox, 0, oz); pp.rotation.y = ry; sc.add(pp); s.addPerson(pp); pp.userData.rel = rel; pp.userData.who = i;
        const ch = T3.mk(pp, T3.BOX(0.9, 0.12, 0.9), T3.mat('#2a1a3a'), 0, 0.55, 0.1, {}); ch.scale.setScalar(1);
        const lb = T3.label('', { scale: 3.6 }); lb.sprite.position.y = 2.1; lb.sprite.scale.multiplyScalar(1 / 2.2); pp.add(lb.sprite); tags.push(lb);
        const dm = T3.mk(pp, new TH.OctahedronGeometry(0.1), new TH.MeshBasicMaterial({ color: 0xf2b441 }), 0, 2.42, 0, { noCast: true }); dm.visible = false; diam.push(dm);
        people.push(pp);
      }
      laidOut = true;
    }
    s.setViews(cfg.views, 'seat', true);
    s.on((dt, t) => {
      const g = SS.V.g;
      people.forEach((pp, i) => {
        const act = g.turn === i && !g.over, win = g.over && g.winner === i, ar = pp.userData.arms;
        ar[0].rotation.x += ((win ? -2.7 : -1.0) - ar[0].rotation.x) * Math.min(1, dt * 4); ar[1].rotation.x += ((win ? -2.7 : act ? -1.3 : -1.0) - ar[1].rotation.x) * Math.min(1, dt * 4);
        diam[i].visible = act; diam[i].position.y = 2.42 + Math.sin(t * 3) * 0.05; diam[i].rotation.y = t * 2;
      });
      if (api.frame) api.frame(dt, t, SS);
    });
    s.onView = nm => { people.forEach(pp => { pp.visible = !(nm === 'seat' && pp.userData.who === SS.me && SS.me >= 0); }); };
    const resync = () => setTimeout(() => { if (!s.dead) { try { s.sync(SS); } catch (e) {} } }, 30);
    s.onTap(e => { if (api.tap && api.tap(e, SS)) resync(); });
    s.sync = S => {
      SS = S; const V = S.V, g = V.g;
      if (!laidOut || people.length !== V.seats.length) seat(S);
      V.seats.forEach((st, i) => {
        const won = g.over && g.winner === i, d = (g.delta || [])[i] || 0;
        tags[i].set(`${S.nameOf(i)} · ${fmt(st.stack)}${g.over && d ? (d > 0 ? ' +' : ' ') + fmt(d) : ''}`, won ? '#6ee09a' : g.turn === i ? '#f2b441' : '#f7f0e1');
      });
      api.sync(S, first); s.onView(s.view); first = false;
      s.hint(S.turn ? cfg.hint : '');
    };
    return s;
  }

  T3.board3 = board3;
  /* ---------- helpers ---------- */
  const cells = sel => [...document.querySelectorAll(sel)];
  const owner = el => { const m = /\bp([01])\b/.exec((el.querySelector('.ck-pc,.rv-d') || el).className || ''); return m ? +m[1] : -1; };
  const disc = (parent, p, r, h) => { const m = T3.mk(parent, T3.CYL(r, r, h, 28), T3.mat(COL[p], { roughness: 0.4 }), 0, h / 2, 0); return m; };
  const squares = (root, n, cell, a, b, pickKey) => {
    const list = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const m = T3.mk(root, T3.BOX(cell, 0.12, cell), T3.mat((r + c) % 2 ? a : b, { roughness: 0.6 }), (c - (n - 1) / 2) * cell, 0.06, (r - (n - 1) / 2) * cell, { noCast: true });
      m.userData[pickKey] = r * n + c; list.push(m);
    }
    return list;
  };
  const ring = (root, x, z, col, r) => { const m = T3.mk(root, new THREE.TorusGeometry(r || 0.36, 0.045, 8, 28), new THREE.MeshBasicMaterial({ color: col }), x, 0.16, z, { noCast: true }); m.rotation.x = Math.PI / 2; return m; };
  const tapSq = (s, e, list, fn) => { const h = s.pick(e, list)[0]; if (!h) return false; let o = h.object; while (o && o.userData.pk === undefined && !list.includes(o)) o = o.parent; return fn(h.object.userData, h.object); };

  /* ---------- checkers / reversi (8 by 8) ---------- */
  function grid8(kind) {
    return (s, root, TH) => {
      const CELL = 1.02, N = 8, sq = squares(root, N, CELL, kind === 'ck' ? '#2e1a0e' : '#1f7a4a', kind === 'ck' ? '#c9a06a' : '#1b6a40', 'i');
      T3.mk(root, T3.BOX(N * CELL + 0.7, 0.2, N * CELL + 0.7), T3.mat('#3b1d12', { roughness: 0.5 }), 0, 0.0, 0, { noCast: true });
      const pcs = {}, marks = [];
      const pos = i => { const r = i >> 3, c = i & 7; return [(c - 3.5) * CELL, (r - 3.5) * CELL]; };
      let flipped = false;
      const place = (i, el, first, st) => {
        const [x, z] = pos(i), p = owner(el), king = !!el.querySelector('.king');
        const key = p + (king ? 'k' : '');
        let g = pcs[i];
        if (g && g.userData.key === key) return;
        if (g) { root.remove(g); }
        if (p < 0) { delete pcs[i]; return; }
        g = new TH.Group(); g.userData.key = key; g.position.set(x, 0.12, z);
        if (kind === 'ck') { disc(g, p, 0.4, 0.2); if (king) { const k2 = disc(g, p, 0.4, 0.2); k2.position.y = 0.2 + 0.1; T3.mk(g, new TH.TorusGeometry(0.22, 0.04, 8, 20), T3.mat('#d6b05a', { metalness: 0.6, roughness: 0.3 }), 0, 0.42, 0, { noCast: true }).rotation.x = Math.PI / 2; } }
        else disc(g, p, 0.4, 0.14);
        root.add(g); pcs[i] = g;
        if (!first) { const y0 = 1.6; g.position.y = y0; s.tween(kind === 'ck' ? 320 : 380, (k, e) => { g.position.y = 0.12 + (y0 - 0.12) * (1 - e) + (kind === 'rv' ? Math.sin(Math.PI * e) * 0.35 : 0); if (kind === 'rv') g.rotation.z = Math.PI * e * (st.flip ? 1 : 0); }); }
      };
      return {
        sync(S, first) {
          flipped = kind === 'ck' && S.me === 1; root.rotation.y = flipped ? Math.PI : 0;
          const els = cells(kind === 'ck' ? '#ck .ck-sq' : '#rv .rv-c'), seen = new Set();
          marks.forEach(m => root.remove(m)); marks.length = 0;
          els.forEach(el => {
            const i = +(el.dataset.sq !== undefined ? el.dataset.sq : el.dataset.i); seen.add(i);
            place(i, el, first, { flip: kind === 'rv' });
            const [x, z] = pos(i);
            if (el.classList.contains('hint') || el.classList.contains('ok')) marks.push(ring(root, x, z, 0x6ee09a));
            if (el.classList.contains('sel')) marks.push(ring(root, x, z, 0xffffff, 0.46));
            if (el.classList.contains('last')) marks.push(ring(root, x, z, 0xf2b441, 0.3));
          });
          Object.keys(pcs).forEach(k => { if (!seen.has(+k)) { root.remove(pcs[k]); delete pcs[k]; } });
        },
        tap(e) {
          const h = s.pick(e, sq)[0]; if (!h) return false; const i = h.object.userData.i;
          const el = document.querySelector(kind === 'ck' ? `#ck [data-sq="${i}"]` : `#rv [data-i="${i}"]`); if (!el || el.disabled) return false; el.click(); return true;
        },
      };
    };
  }

  /* ---------- gomoku ---------- */
  function gomoku(s, root, TH) {
    const N = 11, SP = 0.62, W = (N - 1) * SP + 1.1;
    const tex = T3.canvasTex(1024, 1024, (g, w, h) => {
      g.fillStyle = '#d9b36b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4a3216'; g.lineWidth = 3;
      const m = 1024 * 0.55 / W, a = (1024 - (N - 1) * SP * 1024 / W) / 2, st = SP * 1024 / W;
      for (let i = 0; i < N; i++) { g.beginPath(); g.moveTo(a + i * st, a); g.lineTo(a + i * st, 1024 - a); g.stroke(); g.beginPath(); g.moveTo(a, a + i * st); g.lineTo(1024 - a, a + i * st); g.stroke(); }
      g.fillStyle = '#4a3216'; [[2, 2], [8, 2], [5, 5], [2, 8], [8, 8]].forEach(([x, y]) => { g.beginPath(); g.arc(a + x * st, a + y * st, 8, 0, 7); g.fill(); });
    });
    T3.mk(root, T3.BOX(W, 0.22, W), T3.mat('#fff', { map: tex, roughness: 0.5 }), 0, 0.05, 0, { noCast: true });
    const picks = [], st = {}, marks = [];
    const pos = i => [((i % N) - (N - 1) / 2) * SP, (Math.floor(i / N) - (N - 1) / 2) * SP];
    for (let i = 0; i < N * N; i++) { const [x, z] = pos(i); const m = T3.mk(root, T3.BOX(SP, 0.02, SP), new TH.MeshBasicMaterial({ visible: false }), x, 0.2, z, { noCast: true }); m.userData.i = i; picks.push(m); }
    return {
      sync(S, first) {
        marks.forEach(m => root.remove(m)); marks.length = 0;
        cells('#gm .gm-c').forEach(el => {
          const i = +el.dataset.i, p = owner(el), [x, z] = pos(i);
          if (p >= 0 && !st[i]) {
            const m = T3.mk(root, T3.SPH(0.27, 18), T3.mat(COL[p], { roughness: 0.3 }), x, 0.34, z); m.scale.y = 0.5; st[i] = m;
            if (!first) { m.position.y = 1.8; s.tween(340, (k, e) => { m.position.y = 0.34 + 1.46 * (1 - e); }); }
          }
          if (el.classList.contains('win')) marks.push(ring(root, x, z, 0x6ee09a, 0.32));
          else if (el.classList.contains('last')) marks.push(ring(root, x, z, 0xff6a4a, 0.22));
        });
      },
      tap(e) { const h = s.pick(e, picks)[0]; if (!h) return false; const el = document.querySelector(`#gm [data-i="${h.object.userData.i}"]`); if (!el || el.disabled) return false; el.click(); return true; },
    };
  }

  /* ---------- tic-tac-toe ---------- */
  function ttt(s, root, TH) {
    const CELL = 2.1;
    T3.mk(root, T3.BOX(3 * CELL + 0.6, 0.25, 3 * CELL + 0.6), T3.mat('#d9b36b', { roughness: 0.5 }), 0, 0.05, 0, { noCast: true });
    for (const k of [-0.5, 0.5]) { T3.mk(root, T3.BOX(0.12, 0.08, 3 * CELL), T3.mat('#4a3216'), k * CELL, 0.2, 0, { noCast: true }); T3.mk(root, T3.BOX(3 * CELL, 0.08, 0.12), T3.mat('#4a3216'), 0, 0.2, k * CELL, { noCast: true }); }
    const pos = i => [((i % 3) - 1) * CELL, (Math.floor(i / 3) - 1) * CELL], picks = [], marks = [], st = {};
    for (let i = 0; i < 9; i++) { const [x, z] = pos(i); const m = T3.mk(root, T3.BOX(CELL, 0.05, CELL), new TH.MeshBasicMaterial({ visible: false }), x, 0.24, z, { noCast: true }); m.userData.i = i; picks.push(m); }
    const mark = (p, x, z) => {
      const g = new TH.Group(); g.position.set(x, 0.18, z);
      if (p === 0) for (const a of [Math.PI / 4, -Math.PI / 4]) { const b = T3.mk(g, T3.BOX(1.3, 0.28, 0.26), T3.mat(COL[0], { roughness: 0.4 }), 0, 0.14, 0); b.rotation.y = a; }
      else { const t = T3.mk(g, new TH.TorusGeometry(0.5, 0.14, 12, 28), T3.mat(COL[1], { roughness: 0.4 }), 0, 0.15, 0); t.rotation.x = Math.PI / 2; }
      root.add(g); return g;
    };
    return {
      sync(S, first) {
        marks.forEach(m => root.remove(m)); marks.length = 0;
        cells('#ttt .ttt-c').forEach(el => {
          const i = +el.dataset.i, p = el.classList.contains('p0') ? 0 : el.classList.contains('p1') ? 1 : -1, [x, z] = pos(i);
          if (p >= 0 && !st[i]) { const g = mark(p, x, z); st[i] = g; if (!first) { g.scale.setScalar(0.1); s.tween(300, (k, e) => g.scale.setScalar(0.1 + 0.9 * e)); } }
          if (el.classList.contains('win')) marks.push(ring(root, x, z, 0x6ee09a, 0.8));
        });
        Object.keys(st).forEach(k => { const el = document.querySelector(`#ttt [data-i="${k}"]`); if (el && !el.classList.contains('p0') && !el.classList.contains('p1')) { root.remove(st[k]); delete st[k]; } });
      },
      tap(e) { const h = s.pick(e, picks)[0]; if (!h) return false; const el = document.querySelector(`#ttt [data-i="${h.object.userData.i}"]`); if (!el || el.disabled) return false; el.click(); return true; },
    };
  }

  /* ---------- four in a row ---------- */
  function four(s, root, TH) {
    const COLS = 7, ROWS = 6, SP = 1.06, W = COLS * SP + 0.5, H = ROWS * SP + 0.5;
    const shape = new TH.Shape(); shape.moveTo(-W / 2, 0); shape.lineTo(W / 2, 0); shape.lineTo(W / 2, H); shape.lineTo(-W / 2, H); shape.closePath();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const h = new TH.Path(); h.absarc((c - (COLS - 1) / 2) * SP, 0.25 + SP / 2 + r * SP + 0.0, 0.44, 0, Math.PI * 2, true); shape.holes.push(h); }
    const fr = new TH.Mesh(new TH.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }), T3.mat('#2b57c9', { roughness: 0.35 })); fr.castShadow = true; fr.position.set(0, 0.2, 0.12); root.add(fr);
    for (const sx of [-1, 1]) T3.mk(root, T3.BOX(0.3, 0.3, 1.1), T3.mat('#1d3f96'), sx * (W / 2 - 0.05), 0.35, 0.2);
    const backing = T3.mk(root, T3.BOX(W - 0.2, H - 0.2, 0.06), T3.mat('#101a3a', { roughness: 0.8 }), 0, 0.2 + H / 2, 0.1, { noCast: true });
    const posC = c => (c - (COLS - 1) / 2) * SP, posR = r => 0.2 + 0.25 + SP / 2 + (ROWS - 1 - r) * SP;   // r=0 is the top row
    const picks = [], st = {}, marks = [];
    for (let c = 0; c < COLS; c++) { const m = T3.mk(root, T3.BOX(SP, H + 1.2, 0.8), new TH.MeshBasicMaterial({ visible: false }), posC(c), 0.2 + H / 2 + 0.3, 0.3, { noCast: true }); m.userData.c = c; picks.push(m); }
    return {
      sync(S, first) {
        marks.forEach(m => root.remove(m)); marks.length = 0;
        cells('#c4 .c4-cell').forEach(el => {
          const i = +el.dataset.i, r = Math.floor(i / COLS), c = i % COLS, p = el.classList.contains('p0') ? 0 : el.classList.contains('p1') ? 1 : -1;
          if (p >= 0 && !st[i]) {
            const m = T3.mk(root, T3.CYL(0.42, 0.42, 0.2, 28), T3.mat(COL[p], { roughness: 0.35 }), posC(c), posR(r), 0.22); m.rotation.x = Math.PI / 2; st[i] = m;
            if (!first) { const y0 = H + 1.6, y1 = posR(r); m.position.y = y0; s.tween(300 + (ROWS - r) * 70, (k, e) => { const b = e * e; m.position.y = y1 + (y0 - y1) * (1 - b); }); }
          }
          if (el.classList.contains('win')) { const m = T3.mk(root, new TH.TorusGeometry(0.46, 0.05, 8, 24), new TH.MeshBasicMaterial({ color: 0x6ee09a }), posC(c), posR(r), 0.4, { noCast: true }); marks.push(m); }
        });
        Object.keys(st).forEach(k => { const el = document.querySelector(`#c4 [data-i="${k}"]`); if (el && !el.classList.contains('p0') && !el.classList.contains('p1')) { root.remove(st[k]); delete st[k]; } });
      },
      tap(e) { const h = s.pick(e, picks)[0]; if (!h) return false; const el = document.querySelector(`#c4 [data-c="${h.object.userData.c}"]`); if (!el || el.disabled) return false; el.click(); return true; },
    };
  }

  const V8 = { seat: { label: 'Seat', pos: [0, 12.6, 10.4], look: [0, 2.3, 0.6], fov: 42, sway: 0.01 }, top: { label: 'Top', pos: [0, 16.5, 0.01], look: [0, 2.5, 0], up: [0, 0, -1], fov: 42 }, side: { label: 'Side', pos: [11.5, 7.5, 5], look: [0, 2.4, 0], fov: 42 } };
  const SETUP = [
    ['checkers', { build: grid8('ck'), views: V8, hint: 'Tap a piece, then tap where it goes.' }, ['#ck']],
    ['reversi', { build: grid8('rv'), views: V8, hint: 'Tap a glowing square to place a disc.' }, ['#rv']],
    ['gomoku', { build: gomoku, views: V8, hint: 'Tap an empty point to place a stone.' }, ['#gm']],
    ['tictactoe', { build: ttt, views: V8, hint: 'Tap an empty square.' }, ['#ttt']],
    ['fourinrow', { build: four, sides: 'ew', hint: 'Tap a column to drop your disc.', views: {
      seat: { label: 'Front', pos: [0, 8.2, 13.2], look: [0, 4.2, 0], fov: 42, sway: 0.01 }, side: { label: 'Side', pos: [11, 6.4, 7], look: [0, 4.0, 0], fov: 42 }, top: { label: 'Top', pos: [0, 15, 4], look: [0, 3, 0], fov: 42 } } }, ['#c4']],
  ];
  for (const [id, cfg, hide] of SETUP) {
    const D = Club.games[id]; if (!D) continue;
    D.ui3d = T3.wrapUi(D.ui, { slot: st => ({ before: st.querySelector('.table > :nth-child(2)'), hide: hide.map(q => st.querySelector(q)) }), make: (box, S) => board3(box, S, cfg) });
  }
})();
