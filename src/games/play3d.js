/* ===================== 3D tables: Memory, Nim, Rock Paper Scissors, Pattern Memory, Hi-Lo, Code Breaker, Hangman ===================== */
(() => {
  const PEG = ['#e0443c', '#f2b441', '#46b96a', '#3f8be8', '#a063d8', '#f7f0e1'];
  const symTex = {};
  const sym = (txt, bg) => { const k = txt + '|' + bg; return symTex[k] || (symTex[k] = T3.canvasTex(128, 160, (g, w, h) => { g.fillStyle = bg || '#fbf6ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8ccb0'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = '#222'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = (txt.length > 2 ? 44 : 78) + 'px Figtree, "Apple Color Emoji", system-ui, sans-serif'; g.fillText(txt, w / 2, h / 2 + 4); })); };
  const emoji = (txt, size) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.font = '190px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 140); const t = new THREE.CanvasTexture(c); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true })); sp.scale.set(size, size, 1); return sp; };
  const V = (pos, look) => ({ seat: { label: 'Seat', pos, look, fov: 42, sway: 0.01 }, top: { label: 'Top', pos: [0, 15, 0.01], look: [0, 2.5, 0], up: [0, 0, -1], fov: 42 }, side: { label: 'Side', pos: [10.5, 7, 4.5], look: [0, 2.4, 0], fov: 42 } });
  const dom = (sel) => [...document.querySelectorAll(sel)];

  /* ---------- Memory ---------- */
  function memory(s, root, TH) {
    const cards = [], picks = [], dx = 1.6, dz = 2.0;
    for (let i = 0; i < 16; i++) {
      const g = new TH.Group(), x = ((i % 4) - 1.5) * dx, z = (Math.floor(i / 4) - 1.5) * dz; g.position.set(x, 0.07, z); root.add(g);
      const back = T3.mk(g, T3.BOX(1.3, 0.09, 1.75), T3.mat('#a3262a', { roughness: 0.5 }), 0, 0, 0); back.userData.i = i; picks.push(back);
      T3.mk(g, new TH.PlaneGeometry(1.1, 1.55), new TH.MeshBasicMaterial({ color: 0xf4d9a0 }), 0, 0.048, 0, { noCast: true }).rotation.x = -Math.PI / 2;
      const face = T3.mk(g, new TH.PlaneGeometry(1.26, 1.7), new TH.MeshBasicMaterial({ map: sym('?') }), 0, 0.05, 0, { noCast: true }); face.rotation.x = -Math.PI / 2; face.visible = false;
      cards.push({ g, face, up: false, gone: false, txt: '' });
    }
    return {
      sync(S, inst) {
        dom('#mm .mm-c').forEach(el => {
          const i = +el.dataset.i, c = cards[i], up = el.classList.contains('up'), gone = el.classList.contains('gone'), txt = el.textContent.trim();
          if (txt && c.txt !== txt) { c.txt = txt; c.face.material.map = sym(txt); c.face.material.needsUpdate = true; }
          if (up !== c.up || gone !== c.gone) {
            const was = c.up; c.up = up; const wasGone = c.gone; c.gone = gone;
            if (inst) { c.face.visible = up || gone; c.g.visible = !gone; return; }
            if (gone && !wasGone) { c.face.visible = true; s.tween(500, (k, e) => { c.g.position.y = 0.07 + e * 0.5; c.g.scale.setScalar(1 - e * 0.9); }, () => { c.g.visible = false; }); return; }
            s.tween(300, (k) => { c.g.scale.x = Math.abs(Math.cos(Math.PI * k)) * 0.98 + 0.02; if (k > 0.5) c.face.visible = up; });
          }
        });
      },
      tap(e) { const h = s.pick(e, picks)[0]; if (!h) return false; const b = document.querySelector(`#mm [data-i="${h.object.userData.i}"]`); if (b && !b.disabled) { b.click(); return true; } return false; },
    };
  }

  /* ---------- Nim ---------- */
  function nim(s, root, TH) {
    T3.mk(root, T3.BOX(9, 0.14, 7), T3.mat('#6b4a2a', { roughness: 0.6 }), 0, 0.07, 0, { noCast: true });
    const sticks = [], picks = []; let key = '';
    return {
      sync(S) {
        const els = dom('#nmRows .nm-s'), k = els.map(b => b.dataset.r + b.dataset.k + (b.classList.contains('sel') ? 's' : '')).join('|');
        if (k === key) return; key = k; sticks.forEach(m => root.remove(m)); sticks.length = 0; picks.length = 0;
        const rows = {}; els.forEach(b => { (rows[b.dataset.r] = rows[b.dataset.r] || []).push(b); });
        Object.keys(rows).forEach(r => rows[r].forEach((b, j) => {
          const sel = b.classList.contains('sel'), x = (j - (rows[r].length - 1) / 2) * 0.62, z = (+r - (Object.keys(rows).length - 1) / 2) * 1.8;
          const m = T3.mk(root, T3.CYL(0.17, 0.17, 1.7, 12), T3.mat(sel ? '#f2b441' : '#e7cf9f', { roughness: 0.5 }), x, 0.14 + 0.85 + (sel ? 0.4 : 0), z); m.userData.r = +r; m.userData.k = +b.dataset.k; sticks.push(m); picks.push(m);
          T3.mk(root, T3.SPH(0.17, 10), T3.mat(sel ? '#f2b441' : '#c9a06a'), x, m.position.y + 0.85, z, { noCast: true });
        }));
      },
      tap(e) { const h = s.pick(e, picks)[0]; if (!h) return false; const b = document.querySelector(`#nmRows [data-r="${h.object.userData.r}"][data-k="${h.object.userData.k}"]`); if (b && !b.disabled) { b.click(); return true; } return false; },
    };
  }

  /* ---------- Rock Paper Scissors ---------- */
  function rps(s, root, TH) {
    const score = T3.label('', { scale: 4 }); score.sprite.position.set(0, 3.2, 0); root.add(score.sprite);
    const spots = [-2.6, 2.6], hands = [null, null], qm = [null, null]; let revKey = '';
    const sh = i => { const g = new TH.Group(); g.position.set(spots[i], 1.1, 0); root.add(g); return g; };
    const holders = [sh(0), sh(1)];
    holders.forEach((h, i) => { qm[i] = T3.mk(h, T3.SPH(0.8, 20), T3.mat('#e7cf9f', { roughness: 0.6 }), 0, 0.2, 0); qm[i].scale.set(1, 0.8, 1); });
    T3.mk(root, T3.CYL(1.1, 1.1, 0.12, 24), T3.mat('#2a1810'), -2.6, 0.06, 0, { noCast: true }); T3.mk(root, T3.CYL(1.1, 1.1, 0.12, 24), T3.mat('#2a1810'), 2.6, 0.06, 0, { noCast: true });
    return {
      sync(S, inst) {
        const g = S.V.g; score.set(`First to 3: ${g.score[0]} – ${g.score[1]}`, '#f7f0e1');
        const rev = dom('#rpRev .rp-i').map(e => e.textContent.trim()); const k = rev.join('');
        holders.forEach((h, i) => { qm[i].visible = !rev.length; if (hands[i] && k !== revKey) { h.remove(hands[i]); hands[i] = null; } });
        if (rev.length && k !== revKey) {
          holders.forEach((h, i) => { const e = emoji(rev[i], 2.6); e.position.y = 0.9; h.add(e); hands[i] = e; if (!inst) s.tween(700, (kk, ee) => { h.position.y = 1.1 + Math.abs(Math.sin(ee * Math.PI * 3)) * 0.7 * (1 - ee) + 0.0; }); });
        }
        revKey = k;
        if (!rev.length) holders.forEach((h, i) => { qm[i].material.color.set(g.chosen && g.chosen[i] ? '#6ee09a' : '#e7cf9f'); });
      },
    };
  }

  /* ---------- Pattern Memory ---------- */
  function pattern(s, root, TH) {
    const pads = [], picks = [], pos = [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]];
    T3.mk(root, T3.BOX(6.4, 0.2, 6.4), T3.mat('#2a2230', { roughness: 0.6 }), 0, 0.1, 0, { noCast: true });
    for (let c = 0; c < 4; c++) { const m = T3.mk(root, T3.CYL(1.2, 1.3, 0.4, 28), new TH.MeshStandardMaterial({ color: PEG[c], emissive: PEG[c], emissiveIntensity: 0.12, roughness: 0.3 }), pos[c][0], 0.4, pos[c][1]); m.userData.c = c; pads.push(m); picks.push(m); }
    return {
      sync() { },
      frame(dt) { pads.forEach((m, c) => { const b = document.querySelector(`#pm .pm-b.c${c}`), lit = b && b.classList.contains('lit'); m.material.emissiveIntensity += ((lit ? 1.6 : 0.12) - m.material.emissiveIntensity) * Math.min(1, dt * 18); m.position.y += ((lit ? 0.3 : 0.4) - m.position.y) * Math.min(1, dt * 18); }); },
      tap(e) { const h = s.pick(e, picks)[0]; if (!h) return false; const b = document.querySelector(`#pm .pm-b.c${h.object.userData.c}`); if (b && !b.disabled) { b.click(); const m = h.object; m.material.emissiveIntensity = 1.4; return true; } return false; },
    };
  }

  /* ---------- Hi-Lo ---------- */
  function hilo(s, root, TH) {
    let cur = null, card = null; const msg = T3.label('', { scale: 4 }); msg.sprite.position.set(0, 2.4, 0.5); root.add(msg.sprite);
    T3.mk(root, T3.CYL(2.6, 2.6, 0.06, 40), T3.mat('#1f5a3a', { roughness: 1 }), 0, 0.03, 0, { noCast: true });
    return {
      sync(S, inst) {
        const g = S.V.g, c = g.cur; msg.set((document.getElementById('hlMsg') || {}).textContent || '', '#f7f0e1');
        if (c === cur) return; cur = c; if (card) root.remove(card); card = null; if (c === null) return;
        const id = (((c >> 2) + 12) % 13) * 4 + (c & 3); card = T3.card3(id, 1.9); card.position.set(0, 0.1, 0); root.add(card);
        if (!inst) { s.tween(520, (k, e) => { card.position.y = 0.1 + Math.sin(Math.PI * e) * 1.4; card.rotation.y = (1 - e) * 3.1; card.rotation.z = (1 - e) * 0.4; card.scale.setScalar(0.6 + 0.4 * e); }); }
      },
    };
  }

  /* ---------- Code Breaker ---------- */
  function codebreaker(s, root, TH) {
    T3.mk(root, T3.BOX(8.6, 0.22, 8.4), T3.mat('#4a2a14', { roughness: 0.5 }), 0, 0.11, 0, { noCast: true });
    let key = '', objs = [];
    return {
      sync(S) {
        const rows = dom('#cbRows .cb-row'), k = rows.map(r => r.textContent + r.innerHTML.length).join('~'); if (k === key) return; key = k; objs.forEach(o => root.remove(o)); objs = [];
        rows.forEach((r, ri) => {
          const z = -3.3 + ri * 0.78, secret = r.classList.contains('secret'), pegs = [...r.querySelectorAll('.cb-g .peg')];
          pegs.forEach((p, j) => { const m = /c(\d)/.exec(p.className), c = m ? +m[1] : 5; objs.push(T3.mk(root, T3.SPH(0.27, 14), T3.mat(PEG[c], { roughness: 0.3 }), -2.7 + j * 0.78, 0.5, z)); });
          const nums = [...r.querySelectorAll('.cb-f b')].map(b => +b.textContent); if (nums.length === 2 && !secret) {
            let idx = 0; for (let q = 0; q < nums[0] + nums[1]; q++, idx++) objs.push(T3.mk(root, T3.SPH(0.11, 8), T3.mat(q < nums[0] ? '#111' : '#f7f0e1'), 1.0 + (idx % 4) * 0.3, 0.4, z - 0.12 + Math.floor(idx / 4) * 0.28, { noCast: true }));
          }
          if (secret) objs.push(T3.mk(root, T3.BOX(4.0, 0.05, 0.06), T3.mat('#f2b441'), -1.2, 0.3, z + 0.4, { noCast: true }));
        });
      },
    };
  }

  /* ---------- Hangman ---------- */
  function hangman(s, root, TH) {
    const wood = T3.mat('#7a4a22', { roughness: 0.6 });
    T3.mk(root, T3.BOX(2.4, 0.2, 1.8), wood, -3.2, 0.1, 0); T3.mk(root, T3.CYL(0.1, 0.1, 4, 10), wood, -3.9, 2.1, 0); T3.mk(root, T3.BOX(2.3, 0.14, 0.14), wood, -2.8, 4.05, 0); T3.mk(root, T3.CYL(0.04, 0.04, 0.6, 6), T3.mat('#c9a06a'), -1.9, 3.7, 0);
    const parts = [], body = new TH.Group(); body.position.set(-1.9, 0, 0); root.add(body);
    const skin = T3.mat('#e8b890'), cl = T3.mat('#3f8be8');
    parts.push(T3.mk(body, T3.SPH(0.3, 14), skin, 0, 3.15, 0));
    parts.push(T3.mk(body, T3.CYL(0.22, 0.26, 1.1, 12), cl, 0, 2.4, 0));
    const al = T3.mk(body, T3.CYL(0.07, 0.07, 0.95, 8), skin, -0.42, 2.45, 0); al.rotation.z = 0.5; parts.push(al);
    const ar = T3.mk(body, T3.CYL(0.07, 0.07, 0.95, 8), skin, 0.42, 2.45, 0); ar.rotation.z = -0.5; parts.push(ar);
    const ll = T3.mk(body, T3.CYL(0.09, 0.09, 1.1, 8), cl, -0.18, 1.35, 0); ll.rotation.z = 0.15; parts.push(ll);
    const lr = T3.mk(body, T3.CYL(0.09, 0.09, 1.1, 8), cl, 0.18, 1.35, 0); lr.rotation.z = -0.15; parts.push(lr);
    parts.forEach(p => { p.visible = false; });
    const tiles = []; let wk = '';
    return {
      sync(S) {
        const g = S.V.g; parts.forEach((p, i) => { p.visible = i < g.wrong; });
        const ls = dom('#hmWord .hm-l').map(e => e.textContent.trim() + (e.classList.contains('miss') ? '!' : '')), k = ls.join('');
        if (k !== wk) { wk = k; tiles.forEach(t => root.remove(t)); tiles.length = 0; ls.forEach((t, i) => { const ch = t.replace('!', ''), miss = t.endsWith('!'); const m = T3.mk(root, T3.BOX(0.64, 0.16, 0.82), T3.mat('#fff', { map: sym(ch || ' ', miss ? '#f3c0b8' : '#fbf6ea'), roughness: 0.5 }), (i - (ls.length - 1) / 2) * 0.74 + 0.9, 0.22, 2.4, { noCast: true }); tiles.push(m); }); }
      },
    };
  }

  const SET = [
    ['memory', { build: memory, views: V([0, 10, 7.6], [0, 2.4, 0.2]), hint: 'Tap a card to flip it.' }, ['#mm']],
    ['nim', { build: nim, views: V([0, 9, 7.2], [0, 2.4, 0.2]), hint: 'Tap a stick, then press Take them.' }, ['#nmRows']],
    ['rps', { build: rps, views: V([0, 7.4, 7.6], [0, 2.8, 0]), hint: 'Choose rock, paper or scissors below.' }, ['.rp-reveal', '.rp-score']],
    ['patternmem', { build: pattern, views: V([0, 9.5, 6.4], [0, 2.4, 0.2]), hint: 'Watch the pattern, then tap the colours in order.' }, ['#pm']],
    ['hilo', { build: hilo, views: V([0, 7.8, 7], [0, 2.4, 0.4]), hint: 'Will the next card be higher or lower?' }, ['#hlCard']],
    ['codebreaker', { build: codebreaker, views: V([0, 11.5, 8], [0, 2.4, 0.2]), hint: 'Pick colours below to break the code.' }, ['#cbRows']],
    ['hangman', { build: hangman, views: V([0, 8.4, 8.4], [0, 3.2, 0.2]), hint: 'Pick a letter below.' }, ['.hm-top']],
  ];
  for (const [id, cfg, hide] of SET) {
    const D = Club.games[id]; if (!D) continue;
    D.ui3d = T3.wrapUi(D.ui, { slot: st => ({ before: st.querySelector('.table > :nth-child(2)') || st.querySelector('.table'), hide: hide.map(q => st.querySelector(q)) }), make: (box, S) => T3.board3(box, S, cfg) });
  }
})();
