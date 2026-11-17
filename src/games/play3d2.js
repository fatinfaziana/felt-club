/* ===================== 3D tables with a big screen or board: Quiz, Sudoku, Number Hunt, Sealed picks, Puzzles ===================== */
(() => {
  const dom = sel => [...document.querySelectorAll(sel)];
  const txt = sel => { const e = document.querySelector(sel); return e ? e.textContent.trim() : ''; };
  const V = (pos, look) => ({ seat: { label: 'Seat', pos, look, fov: 42, sway: 0.008 }, top: { label: 'Top', pos: [0, 15, 0.01], look: [0, 2.5, 0], up: [0, 0, -1], fov: 42 }, side: { label: 'Side', pos: [10.5, 7, 4.5], look: [0, 2.6, 0], fov: 42 } });
  const wrap = (g, text, x, y, maxW, lh) => { const words = String(text).split(/\s+/); let line = '', yy = y; for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = t; } if (line) g.fillText(line, x, yy); return yy + lh; };

  /* a canvas "screen": standing at the back of the table, or lying flat on it */
  function screen(s, root, TH, o) {
    const W = o.px[0], H = o.px[1], c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), tex = new TH.CanvasTexture(c); tex.encoding = TH.sRGBEncoding;
    const [sw, sh] = o.size, plane = new TH.Mesh(new TH.PlaneGeometry(sw, sh), new TH.MeshBasicMaterial({ map: tex }));
    if (o.flat) { plane.rotation.x = -Math.PI / 2; plane.position.set(0, 0.17, 0); T3.mk(root, T3.BOX(sw + 0.5, 0.2, sh + 0.5), T3.mat('#3b1d12', { roughness: 0.5 }), 0, 0.06, 0, { noCast: true }); }
    else { plane.position.set(0, 3.0, -3.1); plane.rotation.x = -0.12; T3.mk(root, T3.BOX(sw + 0.4, sh + 0.4, 0.2), T3.mat('#14101c', { roughness: 0.4 }), 0, 3.0, -3.25).rotation.x = -0.12; T3.mk(root, T3.BOX(1.6, 0.6, 0.8), T3.mat('#2a1810'), 0, 0.3, -3.2, { noCast: true }); }
    root.add(plane);
    let regions = [], key = '';
    const api = {
      sync(S, inst) {
        const k = o.key(S); if (k === key) return; key = k; regions = [];
        g.clearRect(0, 0, W, H); o.paint(g, W, H, (x, y, w, h, el) => regions.push({ x, y, w, h, el, pid: el && el.parentElement && el.parentElement.id, idx: el && el.parentElement ? [...el.parentElement.children].indexOf(el) : -1 }), S); tex.needsUpdate = true;
      },
      tap(e) {
        const h = s.pick(e, [plane])[0]; if (!h || !h.uv) return false; const px = h.uv.x * W, py = (1 - h.uv.y) * H;
        for (const r of regions) if (r.el && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) { let el = r.el; if (!el.isConnected && r.pid) el = (document.getElementById(r.pid) || {children: []}).children[r.idx] || el; if (!el.disabled) { el.click(); return true; } }
        return false;
      },
    };
    return api;
  }
  const panel = (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1d1633'); gr.addColorStop(1, '#2a1f4a'); g.fillStyle = gr; g.fillRect(0, 0, W, H); };

  /* ---------- Quiz ---------- */
  const quiz = (s, root, TH) => screen(s, root, TH, {
    px: [1024, 576], size: [9, 5.06],
    key: S => txt('#qzQ') + '|' + dom('#qzOpts .qz-o').map(b => b.textContent + b.className + b.disabled).join('|'),
    paint(g, W, H, add) {
      panel(g, W, H); g.fillStyle = '#f2b441'; g.font = '700 30px Figtree, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top';
      const q = txt('#qzQ'); g.fillStyle = '#f7f0e1'; g.font = '700 40px Figtree, system-ui, sans-serif'; wrap(g, q, 40, 36, W - 80, 52);
      const opts = dom('#qzOpts .qz-o'); opts.forEach((b, i) => {
        const x = 40 + (i % 2) * ((W - 100) / 2 + 20), y = 270 + Math.floor(i / 2) * 150, w = (W - 100) / 2, h = 120, right = b.classList.contains('right');
        g.fillStyle = right ? '#2f9e5a' : b.disabled ? '#3a2f55' : '#4d3a86'; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 18) : g.rect(x, y, w, h); g.fill();
        g.fillStyle = '#fff'; g.font = '700 34px Figtree, system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText(String.fromCharCode(65 + i) + '  ', x + 20, y + h / 2); g.font = '600 32px Figtree, system-ui, sans-serif'; wrap(g, b.textContent.trim(), x + 70, y + h / 2 - 16, w - 90, 38); g.textBaseline = 'top';
        add(x, y, w, h, b);
      });
    },
  });

  /* ---------- Sudoku (lies flat on the table) ---------- */
  const sudoku = (s, root, TH) => screen(s, root, TH, {
    flat: true, px: [1024, 1024], size: [8.4, 8.4],
    key: S => dom('#su .su-c').map(b => b.className + b.textContent).join('|'),
    paint(g, W, H, add) {
      g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, W, H); const cs = W / 9;
      dom('#su .su-c').forEach((b, i) => {
        const r = Math.floor(i / 9), c = i % 9, x = c * cs, y = r * cs, cl = b.className;
        if (cl.includes('sel')) g.fillStyle = '#ffd877'; else if (cl.includes('same')) g.fillStyle = '#cfe6ff'; else if (cl.includes('rel')) g.fillStyle = '#ece0c2'; else g.fillStyle = 'rgba(0,0,0,0)';
        if (g.fillStyle !== 'rgba(0, 0, 0, 0)') g.fillRect(x, y, cs, cs);
        if (cl.includes('bad')) { g.fillStyle = '#f3b0a8'; g.fillRect(x, y, cs, cs); }
        const t = b.textContent.trim(); if (t) { g.fillStyle = cl.includes('given') ? '#1d1a24' : '#2b57c9'; g.font = (cl.includes('given') ? '800 ' : '600 ') + '68px Figtree, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x + cs / 2, y + cs / 2 + 4); }
        add(x, y, cs, cs, b);
      });
      g.strokeStyle = '#6b4a2a'; for (let i = 0; i <= 9; i++) { g.lineWidth = i % 3 === 0 ? 7 : 2; g.beginPath(); g.moveTo(i * cs, 0); g.lineTo(i * cs, H); g.stroke(); g.beginPath(); g.moveTo(0, i * cs); g.lineTo(W, i * cs); g.stroke(); }
    },
  });

  /* ---------- Number Hunt ---------- */
  const numberhunt = (s, root, TH) => screen(s, root, TH, {
    px: [1024, 576], size: [9, 5.06],
    key: S => txt('.pz-label') + txt('#nhRange') + dom('#nhHist > *').map(e => e.textContent).join('|'),
    paint(g, W, H) {
      panel(g, W, H); g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#f7f0e1'; g.font = '700 38px Figtree, sans-serif'; g.fillText(txt('.pz-label') || 'Guess the number', W / 2, 34);
      g.fillStyle = '#f2b441'; g.font = '800 120px Figtree, sans-serif'; g.fillText(txt('#nhRange') || '', W / 2, 110);
      g.fillStyle = '#cfc6e8'; g.font = '600 30px Figtree, sans-serif'; dom('#nhHist > *').slice(-6).forEach((e, i) => g.fillText(e.textContent.trim(), W / 2, 280 + i * 42));
    },
  });

  /* ---------- Sealed picks ---------- */
  const sealed = (s, root, TH) => screen(s, root, TH, {
    px: [1024, 576], size: [9, 5.06],
    key: S => txt('.pz-label') + '|' + dom('#slSeats .tag').map(e => e.textContent).join('|') + '|' + txt('#slBanner'),
    paint(g, W, H, add, S) {
      panel(g, W, H); g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#f7f0e1'; g.font = '700 36px Figtree, sans-serif'; wrap(g, txt('.pz-label'), W / 2, 30, W - 100, 46);
      const seats = dom('#slSeats .seat'); seats.forEach((el, i) => {
        const nm = (el.querySelector('.name') || {}).textContent || '', tg = (el.querySelector('.tag') || {}).textContent || '', y = 150 + i * 62;
        g.textAlign = 'left'; g.fillStyle = '#cfc6e8'; g.font = '600 34px Figtree, sans-serif'; g.fillText(nm.trim(), 120, y); g.textAlign = 'right'; g.fillStyle = tg.includes('Picked') ? '#f2b441' : '#9a90a8'; g.fillText(tg.trim(), W - 120, y);
      });
    },
  });

  /* ---------- Puzzles ---------- */
  const puzzle = (s, root, TH) => screen(s, root, TH, {
    px: [1024, 576], size: [9, 5.06],
    key: S => txt('#pzLabel') + '|' + dom('#pzTiles > *').map(e => e.textContent).join(','),
    paint(g, W, H) {
      panel(g, W, H); g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#f7f0e1'; g.font = '700 38px Figtree, sans-serif'; wrap(g, txt('#pzLabel'), W / 2, 30, W - 100, 48);
      const tiles = dom('#pzTiles > *').map(e => e.textContent.trim()), n = Math.max(1, tiles.length), tw = Math.min(150, (W - 120) / n - 12);
      tiles.forEach((t, i) => { const x = W / 2 + (i - (n - 1) / 2) * (tw + 12) - tw / 2, y = 250; g.fillStyle = '#f4ecd8'; g.beginPath(); g.roundRect ? g.roundRect(x, y, tw, tw * 1.1, 14) : g.rect(x, y, tw, tw * 1.1); g.fill(); g.fillStyle = '#2b1d12'; g.font = '800 ' + Math.floor(tw * 0.6) + 'px Figtree, sans-serif'; g.textBaseline = 'middle'; g.fillText(t, x + tw / 2, y + tw * 0.57); g.textBaseline = 'top'; });
    },
  });

  const SET = [
    ['quiz', { build: quiz, views: V([0, 8.6, 8.6], [0, 3.0, -1.2]), hint: 'Tap an answer on the screen (or use the buttons).' }, ['#qzOpts', '#qzQ']],
    ['sudoku', { build: sudoku, views: V([0, 15.5, 6.5], [0, 0.4, 0.3]), hint: 'Tap a square, then choose a number below.' }, ['#su']],
    ['numberhunt', { build: numberhunt, views: V([0, 8.6, 8.6], [0, 3.0, -1.2]), hint: 'Type a guess below.' }, ['#nhRange', '#nhHist', '.pz-label']],
    ['lowunique', { build: sealed, views: V([0, 8.6, 8.6], [0, 3.0, -1.2]), hint: 'Lock in your number below.' }, ['.pz-label']],
    ['twothirds', { build: sealed, views: V([0, 8.6, 8.6], [0, 3.0, -1.2]), hint: 'Lock in your number below.' }, ['.pz-label']],
    ['scramble', { build: puzzle, views: V([0, 8.6, 8.6], [0, 3.0, -1.2]), hint: 'Type your answer below.' }, ['#pzLabel', '#pzTiles']],
    ['make24', { build: puzzle, views: V([0, 8.6, 8.6], [0, 3.0, -1.2]), hint: 'Type your answer below.' }, ['#pzLabel', '#pzTiles']],
    ['pattern', { build: puzzle, views: V([0, 8.6, 8.6], [0, 3.0, -1.2]), hint: 'Type your answer below.' }, ['#pzLabel', '#pzTiles']],
    ['sums', { build: puzzle, views: V([0, 8.6, 8.6], [0, 3.0, -1.2]), hint: 'Type your answer below.' }, ['#pzLabel', '#pzTiles']],
  ];
  for (const [id, cfg, hide] of SET) {
    const D = Club.games[id]; if (!D) { console.warn('no game', id); continue; }
    D.ui3d = T3.wrapUi(D.ui, { slot: st => ({ before: st.querySelector('.table > :nth-child(2)') || st.querySelector('.table'), hide: hide.map(q => st.querySelector(q)) }), make: (box, S) => T3.board3(box, S, cfg) });
  }
})();
