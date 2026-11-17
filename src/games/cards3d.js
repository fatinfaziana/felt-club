/* ===================== 3D tables for hand-holding card games: Big Two and Colour Rush ===================== */
(() => {
  const arr = x => (Array.isArray(x) ? x : []);
  const handTap = (rootSel, S, s, e, seatG) => {
    if (S.me < 0 || !seatG[S.me]) return false; const h = seatG[S.me], hit = s.pick(e, h.m)[0]; if (!hit) return false;
    let o = hit.object; while (o && h.m.indexOf(o) < 0) o = o.parent; if (!o) return false;
    const b = document.querySelector(`${rootSel} [data-c="${o.userData.c}"]`); if (b) { b.click(); return true; } return false;
  };

  /* ---------- Big Two ---------- */
  const bigtwo = {
    felt: '#1f5a3a', noDealer: true, ring: true,
    map: c => ((((c >> 2) + 1) % 13) * 4) + [2, 3, 1, 0][c & 3],
    cards: (S, i) => { const g = S.V.g; return i === S.me ? arr(S.my && S.my.h) : g.hands ? arr(g.hands[i]) : Array(Math.min(13, (g.counts || [])[i] || 0)).fill(-1); },
    size: (S, i) => (i === S.me ? [0.8, 0.52] : [0.42, 0.22]),
    held: (S, i) => (i === S.me ? [...document.querySelectorAll('#btHand .bt-card')].map(b => b.classList.contains('sel')) : []),
    status: (S, i) => { const g = S.V.g; return g.passed && g.passed[i] ? 'Passed' : (g.counts || [])[i] === 1 ? 'One card!' : ''; },
    zones: S => { const l = S.V.g.lead; return [{ id: 'lead', x: 0, z: -0.4, faces: l ? l.cs : [], text: l ? S.nameOf(l.by) + ' played' : (S.V.g.turn >= 0 ? 'Open lead' : ''), w: 0.8 }]; },
    hint: S => (S.turn ? 'Tap cards to pick them, then press Play (or Pass) below.' : ''),
    tapCards: (s, e, S, seatG) => handTap('#btHand', S, s, e, seatG),
  };

  /* ---------- Colour Rush ---------- */
  const RC = ['#e8685a', '#f2b441', '#5cc8b0', '#5aa8f0', '#2b2433'], CN = ['Coral', 'Amber', 'Mint', 'Sky'];
  const lab = v => (v <= 9 ? String(v) : v === 10 ? '⊘' : v === 11 ? '⇄' : v === 12 ? '+2' : v === 13 ? '★' : '+4');
  const faceCache = {};
  const rushMat = id => faceCache[id] || (faceCache[id] = new THREE.MeshStandardMaterial({ roughness: 0.5, map: T3.canvasTex(256, 360, (g, w, h) => {
    const c = id >> 4, v = id & 15, L = lab(v);
    g.fillStyle = '#fbf6ea'; g.fillRect(0, 0, w, h); g.fillStyle = RC[c]; g.fillRect(12, 12, w - 24, h - 24);
    if (c === 4) { ['#e8685a', '#f2b441', '#5cc8b0', '#5aa8f0'].forEach((q, k) => { g.fillStyle = q; g.fillRect(12 + (k % 2) * (w - 24) / 2, 12 + (k >> 1) * (h - 24) / 2, (w - 24) / 2, (h - 24) / 2); }); }
    g.save(); g.translate(w / 2, h / 2); g.rotate(-0.5); g.fillStyle = '#fbf6ea'; g.beginPath(); g.ellipse(0, 0, 86, 120, 0, 0, 7); g.fill(); g.restore();
    g.fillStyle = c === 4 ? '#2b2433' : RC[c]; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 ' + (L.length > 1 ? 92 : 128) + 'px Figtree, system-ui, sans-serif'; g.fillText(L, w / 2, h / 2 + 6);
    g.fillStyle = '#fff'; g.font = '800 40px Figtree, sans-serif'; g.fillText(L, 46, 52); g.fillText(L, w - 46, h - 52);
  }) }));
  const rush = {
    felt: '#2a3a6a', noDealer: true, ring: true,
    mk: (c, w) => { const m = T3.card3(-1, w); if (c >= 0) m.material[2] = rushMat(c); return m; },
    cards: (S, i) => { const g = S.V.g; return i === S.me ? arr(S.my && S.my.h) : g.hands ? arr(g.hands[i]) : Array(Math.min(14, (g.counts || [])[i] || 0)).fill(-1); },
    size: (S, i) => (i === S.me ? [0.8, 0.52] : [0.42, 0.22]),
    held: (S, i) => (i === S.me ? [...document.querySelectorAll('#rsHand .bt-card')].map(b => b.classList.contains('ok') || b.classList.contains('sel')) : []),
    status: (S, i) => ((S.V.g.counts || [])[i] === 1 ? 'One card!' : ''),
    zones: S => { const g = S.V.g; return [
      { id: 'top', x: 1.1, z: -0.5, faces: g.top >= 0 ? [g.top] : [], text: g.top >= 0 ? (CN[g.color] || '') + ' · ' + (g.dir === 1 ? 'clockwise' : 'anticlockwise') : '', w: 1.0 },
      { id: 'draw', x: -1.1, z: -0.5, faces: g.left ? [-1] : [], text: g.left ? g.left + ' left' : '', w: 1.0 }]; },
    hint: S => (S.turn ? 'Tap a lit card to play it, or tap the pile to draw.' : ''),
    tapCards: (s, e, S, seatG, zones) => {
      if (handTap('#rsHand', S, s, e, seatG)) return;
      const z = zones.draw; if (z && z.m.length && s.pick(e, z.m)[0]) { const b = document.getElementById('rsDraw'); if (b) b.click(); }
    },
  };

  bigtwo.hands = st => [{ label: 'Your hand', el: st.querySelector('#btHand') }];
  rush.hands = st => [{ label: 'Your hand', el: st.querySelector('#rsHand') }];
  T3.attach3('bigtwo', bigtwo, ['#btHand', '#btLead']);
  T3.attach3('rush', rush, ['#rsHand', '.rs-mid']);
})();
