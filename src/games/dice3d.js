/* ===================== 3D tables for the dice games: Pig, Shut the Box, Bankroll, Bluff Dice ===================== */
(() => {
  const arr = x => (Array.isArray(x) ? x : []);

  const pig = {
    cards: () => [], felt: '#6a2a2a', noDealer: true, ring: true,
    status: (S, i) => `${S.V.g.score[i]} pts`,
    props: T3.diceProps({ z: -0.4, dice: S => (S.V.g.die ? [S.V.g.die] : []), text: S => { const g = S.V.g; return g.over ? '' : g.busted ? 'Rolled a 1! Turn total lost.' : g.turn >= 0 ? 'Turn total: ' + g.tt : ''; } }),
    hint: S => (S.turn ? 'Your turn: press Roll, or Hold to bank your turn total.' : ''),
  };
  const bank = {
    cards: () => [], felt: '#1f5a3a', noDealer: true, ring: true,
    status: (S, i) => `${S.V.g.score[i]} banked` + (S.V.g.banked[i] && !S.V.g.over ? ' ✓' : ''),
    props: T3.diceProps({ z: -0.4, dice: S => S.V.g.dice, text: S => { const g = S.V.g; return g.over ? '' : (g.roundN ? `Round ${g.roundN} · pot ${g.pot}` : '') + (g.note ? ' · ' + g.note : ''); } }),
    hint: S => (S.turn ? 'Bank the pot to keep it, or stay in for more.' : ''),
  };

  /* ---------- Shut the Box ---------- */
  const tileTex = n => T3.canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#e7cf9f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6b4423'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = '#3b1d12'; g.font = '700 84px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), w / 2, h / 2 + 6); });
  const shut = {
    cards: () => [], felt: '#2a5a3a', noDealer: true, ring: true,
    status: (S, i) => { const g = S.V.g, open = (g.tiles[i] || []).reduce((a, o, x) => a + (o ? x + 1 : 0), 0); return g.finished[i] || g.over ? 'Open ' + open : ''; },
    hint: S => (S.turn ? 'Tap tiles that add up to your roll, then press Shut these tiles.' : ''),
    props: (s, sc, TY0, S0, api) => {
      const TH = THREE, dp = T3.diceProps({ z: 0.1, dice: S => S.V.g.dice, text: S => S.V.g.note || '' })(s, sc, TY0);
      const tiles = [], picks = [];
      T3.mk(sc, T3.BOX(9.6, 0.2, 1.7), T3.mat('#4a2a14', { roughness: 0.6 }), 0, TY0 + 0.1, -2.6, { noCast: true });
      for (let k = 1; k <= 9; k++) {
        const t = T3.mk(sc, T3.BOX(0.86, 0.14, 1.2), T3.mat('#fff', { map: tileTex(k), roughness: 0.5 }), (k - 5) * 1.0, TY0 + 0.27, -2.6); t.userData.v = k; tiles[k] = t; picks.push(t);
      }
      const who = T3.label('', { scale: 2.6 }); who.sprite.position.set(0, TY0 + 1.5, -2.6); sc.add(who.sprite);
      return {
        sync(S, inst) {
          dp.sync(S, inst); const g = S.V.g;
          document.querySelectorAll('#sbTiles .sb-t').forEach(b => {
            const k = +b.dataset.v, t = tiles[k]; if (!t) return; const sh = b.classList.contains('shut'), pk = b.classList.contains('pick');
            t.userData.ty = sh ? TY0 + 0.1 : pk ? TY0 + 0.75 : TY0 + 0.27; t.userData.shut = sh; t.material.color.set(sh ? '#4a3a2a' : pk ? '#ffe49a' : '#ffffff');
            if (inst) t.position.y = t.userData.ty;
          });
          who.set(g.over ? '' : g.turn >= 0 ? S.nameOf(g.turn) + (g.turn === S.me ? ' (your tiles)' : '') : '', '#f7f0e1');
        },
        frame(dt) { tiles.forEach(t => { if (t && t.userData.ty !== undefined) t.position.y += (t.userData.ty - t.position.y) * Math.min(1, dt * 10); }); },
        tap(e, S) { const h = s.pick(e, picks)[0]; if (!h) return false; const b = document.querySelector(`#sbTiles [data-v="${h.object.userData.v}"]`); if (b && !b.disabled) { b.click(); return true; } return false; },
      };
    },
  };

  /* ---------- Bluff Dice ---------- */
  const bluff = {
    cards: () => [], felt: '#3a1f3a', noDealer: true, ring: true,
    status: (S, i) => { const g = S.V.g; return g.bid && g.by === i ? `Bid ${g.bid.q} × ${g.bid.f}s` : ''; },
    hint: S => (S.turn ? 'Choose a bid (or call liar) with the buttons below.' : ''),
    props: (s, sc, TY0, S0, api) => {
      const TH = THREE, rows = [], bid = T3.label('', { scale: 3.4 }); bid.sprite.position.set(0, TY0 + 1.2, -0.6); sc.add(bid.sprite);
      const cup = () => { const g = new TH.Group(); T3.mk(g, new TH.CylinderGeometry(0.5, 0.7, 0.9, 20, 1, true), T3.mat('#7a1f3a', { roughness: 0.5, side: TH.DoubleSide }), 0, 0.45, 0); T3.mk(g, T3.CYL(0.5, 0.5, 0.06, 20), T3.mat('#7a1f3a'), 0, 0.9, 0); return g; };
      return {
        sync(S, inst) {
          const g = S.V.g, n = S.V.seats.length, per = Math.max(1, Math.round((g.total || 0) / Math.max(1, n)));
          bid.set(g.bid ? `Bid: ${g.bid.q} × ${g.bid.f}s (${S.nameOf(g.by)})` : 'No bid yet', '#f7f0e1');
          S.V.seats.forEach((st, i) => {
            const holder = api.seatG[i]; if (!holder) return; const grp = holder.g;
            const vals = g.dice ? arr(g.dice[i]) : (i === S.me ? arr(S.my && S.my.d) : null), key = (vals ? vals.join('.') : 'cup' + per) + '|' + grp.id;
            if (rows[i] && rows[i].key === key) return; if (rows[i]) grp.remove(rows[i].g); const r = new TH.Group(); r.position.y = 0.3;
            if (vals) vals.forEach((v, j) => { const d = T3.mkDie(); d.scale.setScalar(0.85); const rr = T3.DIE_ROT[v]; d.rotation.set(rr[0], rr[1] + j * 0.5, rr[2]); d.position.set((j - (vals.length - 1) / 2) * 0.8, 0.0, (j % 2) * 0.15); r.add(d); if (g.bid && v === g.bid.f && g.dice) { T3.mk(r, new TH.TorusGeometry(0.34, 0.04, 6, 20), new TH.MeshBasicMaterial({ color: 0x6ee09a }), d.position.x, -0.2, d.position.z, { noCast: true }).rotation.x = Math.PI / 2; } });
            else { const c = cup(); c.position.y = -0.3; r.add(c); }
            grp.add(r); rows[i] = { g: r, key };
          });
          rows.length = n;
        },
      };
    },
  };

  T3.attach3('pig', pig, ['#pgDie']);
  T3.attach3('bankroll', bank, ['#bkDice', '#bkPot']);
  T3.attach3('shutbox', shut, ['#sbDice', '#sbTiles']);
  T3.attach3('bluffdice', bluff, ['#bdDice', '#bdAll']);
})();
