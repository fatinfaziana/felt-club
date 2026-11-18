/* ---------- Arcade engine games, part 8: solitaire, dominoes, tap tiles, gold miner, air hockey, balloon cannon ---------- */
(function () {
const { W, H, R, clamp, LV, emo, txt, hud, sfx, register } = Arc;
const rr = (c, x, y, w, h, r, f) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); c.fillStyle = f; c.fill(); };
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const inb = (x, y, b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

// ============ Solitaire (Klondike) ============
const SUIT = ['♠', '♥', '♣', '♦'], RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
register({ id: 'solitaire', cat: 'card', name: 'Solitaire', icon: '🃏', tag: 'The classic patience card game.', goal: 'move cards up to the four piles (Ace to King, by suit) and score as many points as you can in 4 minutes.', how: 'Tap a card (or a run of cards) to pick it up, then tap where it goes: on a card one rank higher and the other colour, on an empty column (Kings only), or on a pile at the top. Tap the deck to turn over cards. Tap a selected card again to send it to its pile. Easy turns one card at a time, Hard turns three.', par: 170,
  make(lv) {
    const g = { score: 0, over: false, t: 240, msg: 'Time!' }; const CW = 46, CH = 62, GX = 51, ML = 2; const draw3 = lv === 2;
    const deck = shuf([...Array(52).keys()]); const tab = []; for (let i = 0; i < 7; i++) { const col = []; for (let j = 0; j <= i; j++) col.push({ c: deck.pop(), up: j === i }); tab.push(col); }
    let stock = deck.slice(), waste = [], found = [[], [], [], []], sel = null, flash = 0;
    const suitOf = c => Math.floor(c / 13), rk = c => (c % 13) + 1, red = c => suitOf(c) % 2 === 1;
    const colX = i => ML + i * GX;
    const colOff = i => { const col = tab[i]; const downs = col.filter(x => !x.up).length, ups = col.length - downs; const room = 470 - 112 - CH - downs * 8; return Math.min(22, Math.max(10, room / Math.max(1, ups - 1))); };
    const cardY = (i, k) => { const col = tab[i], o = colOff(i); let y = 112; for (let j = 0; j < k; j++) y += col[j].up ? o : 8; return y; };
    const fdone = () => found.reduce((a, f) => a + f.length, 0);
    const canTab = (card, i) => { const col = tab[i]; if (!col.length) return rk(card) === 13; const top = col[col.length - 1]; return top.up && rk(top.c) === rk(card) + 1 && red(top.c) !== red(card); };
    const canFound = card => found[suitOf(card)].length === rk(card) - 1;
    const flipTop = i => { const col = tab[i]; if (col.length && !col[col.length - 1].up) { col[col.length - 1].up = true; g.score += 5; } };
    const toFound = () => { const card = sel.cards[0]; if (sel.cards.length !== 1 || !canFound(card)) return false; remove(); found[suitOf(card)].push(card); g.score += 10; sfx('coin'); sel = null; check(); return true; };
    const remove = () => { if (sel.from === 'w') waste.pop(); else if (sel.from === 'f') found[sel.fi].pop(); else { tab[sel.col].splice(sel.idx); flipTop(sel.col); } };
    const check = () => { if (fdone() === 52) { g.over = true; g.win = true; g.msg = 'You won!'; g.score += 200 + Math.round(g.t); sfx('win'); } };
    const drawStock = () => { if (stock.length) { for (let n = 0; n < (draw3 ? 3 : 1) && stock.length; n++) waste.push(stock.pop()); sfx('tap'); } else if (waste.length) { stock = waste.reverse(); waste = []; sfx('click'); } sel = null; };
    g.update = dt => { g.t -= dt; flash -= dt; if (g.t <= 0) { g.over = true; } };
    const stockB = { x: colX(0), y: 34, w: CW, h: CH }, wasteB = { x: colX(1), y: 34, w: CW, h: CH }, fB = i => ({ x: colX(3 + i), y: 34, w: CW, h: CH });
    g.ptr = (t, x, y) => { if (t !== 'down' || g.over) return;
      if (inb(x, y, stockB)) { drawStock(); return; }
      if (inb(x, y, wasteB) && waste.length) { const card = waste[waste.length - 1]; if (sel && sel.from === 'w') { toFound(); return; } sel = { from: 'w', cards: [card] }; sfx('click'); return; }
      for (let i = 0; i < 4; i++) if (inb(x, y, fB(i))) { if (sel) { if (sel.cards.length === 1 && suitOf(sel.cards[0]) === i && canFound(sel.cards[0])) toFound(); else { sel = null; } } else if (found[i].length) { sel = { from: 'f', fi: i, cards: [found[i][found[i].length - 1]] }; } return; }
      for (let i = 0; i < 7; i++) { const col = tab[i], x0 = colX(i); if (x < x0 || x > x0 + CW) continue;
        let hit = -1; for (let k = col.length - 1; k >= 0; k--) { const cy = cardY(i, k), h = k === col.length - 1 ? CH : (col[k].up ? colOff(i) : 8); if (y >= cy && y <= cy + h) { hit = k; break; } }
        if (!col.length && y >= 112 && y <= 112 + CH) hit = -2;
        if (hit === -1 && !(col.length === 0)) continue;
        if (sel) { const card = sel.cards[0]; if (sel.from === 't' && sel.col === i && hit >= 0 && sel.idx === hit) { toFound(); return; } if (canTab(card, i) && !(sel.from === 't' && sel.col === i)) { const cards = sel.cards.slice(); remove(); cards.forEach(cc => tab[i].push({ c: cc, up: true })); sfx('pop'); sel = null; return; } sel = null; sfx('bad'); if (hit < 0 || !col[hit].up) return; }
        if (hit >= 0 && col[hit].up) { sel = { from: 't', col: i, idx: hit, cards: col.slice(hit).map(z => z.c) }; sfx('click'); } else if (hit >= 0 && hit === col.length - 1) { col[hit].up = true; g.score += 5; sfx('tap'); }
        return; }
      sel = null; };
    const face = (c, x, y, card, hl) => { rr(c, x, y, CW, CH, 5, '#fffdf4'); c.strokeStyle = hl ? '#ffb300' : '#9a9a8a'; c.lineWidth = hl ? 3 : 1; c.beginPath(); c.roundRect ? c.roundRect(x + 0.5, y + 0.5, CW - 1, CH - 1, 5) : c.rect(x, y, CW, CH); c.stroke(); const col = red(card) ? '#d33' : '#222'; txt(c, RANK[rk(card)] + SUIT[suitOf(card)], x + 4, y + 11, 13, col); txt(c, SUIT[suitOf(card)], x + CW / 2, y + CH / 2 + 8, 26, col, 'center'); };
    const back = (c, x, y) => { rr(c, x, y, CW, CH, 5, '#2a4a9a'); c.strokeStyle = '#8fb0ff'; c.lineWidth = 1; c.strokeRect(x + 4, y + 4, CW - 8, CH - 8); };
    const slot = (c, x, y, ch) => { c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 2; c.beginPath(); c.roundRect ? c.roundRect(x, y, CW, CH, 5) : c.rect(x, y, CW, CH); c.stroke(); if (ch) txt(c, ch, x + CW / 2, y + CH / 2, 22, 'rgba(255,255,255,.3)', 'center'); };
    g.draw = c => {
      c.fillStyle = '#1b6a3e'; c.fillRect(0, 0, W, H);
      if (stock.length) back(c, stockB.x, stockB.y); else slot(c, stockB.x, stockB.y, '↻');
      if (waste.length) { const show = draw3 ? waste.slice(-3) : waste.slice(-1); show.forEach((cd, i) => face(c, wasteB.x + i * 8 - (show.length - 1) * 4 + (draw3 ? 4 : 0), wasteB.y, cd, sel && sel.from === 'w' && i === show.length - 1)); } else slot(c, wasteB.x, wasteB.y);
      for (let i = 0; i < 4; i++) { const b = fB(i); if (found[i].length) face(c, b.x, b.y, found[i][found[i].length - 1], sel && sel.from === 'f' && sel.fi === i); else slot(c, b.x, b.y, SUIT[i]); }
      tab.forEach((col, i) => { if (!col.length) slot(c, colX(i), 112, 'K'); col.forEach((z, k) => { const y = cardY(i, k); if (z.up) face(c, colX(i), y, z.c, sel && sel.from === 't' && sel.col === i && k >= sel.idx); else back(c, colX(i), y); }); });
      hud(c, 'Piles ' + fdone() + '/52', 'Score ' + g.score + '  ⏱ ' + Math.ceil(g.t));
    };
    return g;
  } });

// ============ Dominoes ============
register({ id: 'dominoes', cat: 'board', name: 'Dominoes', icon: '🁣', tag: 'Match the ends and empty your hand first.', goal: 'play all your tiles before the computer does.', how: 'Tap one of your tiles at the bottom to play it. A tile can be played when one of its halves matches a number at either end of the line. If both ends fit, pick Left or Right. No tile that fits? Tap the boneyard to draw. The first to run out wins. If nobody can move, the lower total of dots wins.', par: 130,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Game over' }; const all = []; for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) all.push([a, b]); const pile = shuf(all); const mine = pile.splice(0, 7), opp = pile.splice(0, 7); let chain = [], turn = 'me', sel = -1, think = 0, note = '', blocked = 0, t = 0;
    const ends = () => (chain.length ? [chain[0][0], chain[chain.length - 1][1]] : null);
    const fits = (tile, side) => { const e = ends(); if (!e) return true; return side === 'L' ? (tile[0] === e[0] || tile[1] === e[0]) : (tile[0] === e[1] || tile[1] === e[1]); };
    const place = (hand, i, side) => { const tile = hand.splice(i, 1)[0].slice(); if (!chain.length) chain.push(tile); else if (side === 'L') { if (tile[1] !== chain[0][0]) tile.reverse(); chain.unshift(tile); } else { if (tile[0] !== chain[chain.length - 1][1]) tile.reverse(); chain.push(tile); } blocked = 0; sfx('clack'); };
    const pips = h => h.reduce((a, b) => a + b[0] + b[1], 0);
    const finish = (who, why) => { g.over = true; const pm = pips(mine), po = pips(opp); if (who === 'me') { g.win = true; g.msg = 'You win!'; g.score = 90 + Math.min(80, po * 3); } else if (who === 'opp') { g.msg = 'Computer wins'; g.score = Math.max(0, 20 - pm); } else if (pm < po) { g.win = true; g.msg = 'You win on dots!'; g.score = 70 + Math.min(60, (po - pm) * 3); } else if (pm > po) { g.msg = 'Computer wins on dots'; g.score = 15; } else { g.msg = 'A draw'; g.score = 45; } };
    const afterMove = who => { if (!mine.length) return finish('me'); if (!opp.length) return finish('opp'); turn = who === 'me' ? 'opp' : 'me'; think = 0.9; sel = -1; };
    const canPlay = h => h.some(tile => fits(tile, 'L') || fits(tile, 'R'));
    const doPass = who => { blocked++; note = who === 'me' ? 'You pass' : 'Computer passes'; if (blocked >= 2) return finish(null); turn = who === 'me' ? 'opp' : 'me'; think = 0.8; };
    const oppMove = () => { const opts = []; opp.forEach((tile, i) => { if (!chain.length) opts.push([i, 'R', tile[0] + tile[1]]); else { if (fits(tile, 'L')) opts.push([i, 'L', tile[0] + tile[1]]); if (fits(tile, 'R')) opts.push([i, 'R', tile[0] + tile[1]]); } });
      if (opts.length) { opts.sort((a, b) => b[2] - a[2]); const pickI = lv === 0 && Math.random() < 0.45 ? Math.floor(Math.random() * opts.length) : 0; const o = opts[pickI]; place(opp, o[0], o[1]); note = 'Computer plays'; afterMove('opp'); }
      else if (pile.length) { opp.push(pile.pop()); note = 'Computer draws'; think = 0.6; sfx('tap'); } else doPass('opp'); };
    g.update = dt => { t += dt; if (g.over) return; if (turn === 'opp') { think -= dt; if (think <= 0) oppMove(); } else if (turn === 'me' && think > 0) think -= dt; if (t > 220 && !g.over) finish(null); };
    g.dbg = { mine, pile, get turn() { return turn; }, get chain() { return chain; }, get sel() { return sel; } };
    const hb = i => ({ x: 8 + (i % 9) * 39, y: 330 + Math.floor(i / 9) * 70, w: 36, h: 64 });
    const L = { x: 40, y: 262, w: 120, h: 40 }, Rb = { x: 200, y: 262, w: 120, h: 40 }, bone = { x: 270, y: 80, w: 84, h: 36 }, passB = { x: 270, y: 120, w: 84, h: 30 };
    const tryPlay = (i, side) => { if (turn !== 'me' || g.over || think > 0) return; const tile = mine[i]; if (!chain.length) { place(mine, i, 'R'); afterMove('me'); return; } const l = fits(tile, 'L'), r = fits(tile, 'R'); if (side) { if (side === 'L' ? l : r) { place(mine, i, side); afterMove('me'); } return; } if (l && r && ends()[0] !== ends()[1]) { sel = i; return; } if (l || r) { place(mine, i, l ? 'L' : 'R'); afterMove('me'); } else { sfx('bad'); } };
    g.ptr = (tp, x, y) => { if (tp !== 'down' || g.over || turn !== 'me' || think > 0) return;
      if (sel >= 0) { if (inb(x, y, L)) { tryPlay(sel, 'L'); return; } if (inb(x, y, Rb)) { tryPlay(sel, 'R'); return; } }
      if (inb(x, y, bone) && pile.length && !canPlay(mine)) { mine.push(pile.pop()); sfx('tap'); sel = -1; return; }
      if (inb(x, y, passB) && !pile.length && !canPlay(mine)) { doPass('me'); return; }
      mine.forEach((tile, i) => { if (inb(x, y, hb(i))) { sel = -1; tryPlay(i); } }); };
    const domino = (c, x, y, w, h, tile, vert, fill, hl) => { rr(c, x, y, w, h, 4, fill || '#fdfbef'); c.strokeStyle = hl ? '#ffb300' : '#555'; c.lineWidth = hl ? 3 : 1; c.beginPath(); c.roundRect ? c.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 4) : c.rect(x, y, w, h); c.stroke(); c.beginPath(); if (vert) { c.moveTo(x + 4, y + h / 2); c.lineTo(x + w - 4, y + h / 2); } else { c.moveTo(x + w / 2, y + 3); c.lineTo(x + w / 2, y + h - 3); } c.stroke();
      const pp = (cx, cy, n, s) => { const P = { 0: [], 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[n]; c.fillStyle = '#222'; P.forEach(([a, b]) => { c.beginPath(); c.arc(cx + a * s, cy + b * s, s * 0.38, 0, 7); c.fill(); }); };
      if (vert) { pp(x + w / 2, y + h / 4, tile[0], w * 0.2); pp(x + w / 2, y + h * 0.75, tile[1], w * 0.2); } else { pp(x + w / 4, y + h / 2, tile[0], h * 0.2); pp(x + w * 0.75, y + h / 2, tile[1], h * 0.2); } };
    g.draw = c => {
      c.fillStyle = '#244a3a'; c.fillRect(0, 0, W, H); txt(c, 'Computer: ' + opp.length + ' tiles', 10, 44, 14, '#cfe8d8'); for (let i = 0; i < Math.min(opp.length, 14); i++) rr(c, 10 + i * 16, 54, 13, 22, 3, '#3a2a1a');
      txt(c, 'Boneyard: ' + pile.length, 270, 66, 12, '#cfe8d8'); const canD = turn === 'me' && !canPlay(mine) && pile.length; rr(c, bone.x, bone.y + 8, bone.w, bone.h - 6, 8, canD ? '#e8a33c' : '#3a5a4a'); txt(c, 'Draw', bone.x + bone.w / 2, bone.y + 24, 14, canD ? '#2a1800' : '#7a9a8a', 'center');
      if (turn === 'me' && !canPlay(mine) && !pile.length) { rr(c, passB.x, passB.y + 10, passB.w, passB.h, 8, '#c4403a'); txt(c, 'Pass', passB.x + 42, passB.y + 25, 14, '#fff', 'center'); }
      const per = 9, tw = 38, th = 22; chain.forEach((tile, i) => { const row = Math.floor(i / per), col = i % per; const x = 12 + col * (tw + 2), y = 100 + row * (th + 6); domino(c, x, y, tw, th, tile, false); });
      if (!chain.length) txt(c, turn === 'me' ? 'Play any tile to start' : '', W / 2, 150, 15, '#cfe8d8', 'center');
      if (sel >= 0) { rr(c, L.x, L.y, L.w, L.h, 10, '#e8a33c'); txt(c, '◀ Left end', L.x + 60, L.y + 21, 15, '#2a1800', 'center'); rr(c, Rb.x, Rb.y, Rb.w, Rb.h, 10, '#e8a33c'); txt(c, 'Right end ▶', Rb.x + 60, Rb.y + 21, 15, '#2a1800', 'center'); }
      txt(c, note, W / 2, 318, 13, '#ffe27a', 'center'); mine.forEach((tile, i) => { const b = hb(i); const pl = turn === 'me' && (fits(tile, 'L') || fits(tile, 'R')); domino(c, b.x, b.y, b.w, b.h, tile, true, pl ? '#fffbe0' : '#d8d6c8', sel === i); });
      hud(c, turn === 'me' ? 'Your turn' : 'Computer thinking…', 'Your dots ' + pips(mine));
    };
    return g;
  } });

// ============ Tap Tiles ============
register({ id: 'taptiles', cat: 'arcade', name: 'Tap Tiles', icon: '🎹', tag: 'Tap only the black tiles. Never miss one.', goal: 'tap as many black tiles as you can without missing one.', how: 'Black tiles fall in four lanes. Tap each black tile (lowest first). Tap a white square or let one reach the bottom and it is over. The tiles speed up. On a keyboard use D, F, J, K for the four lanes.', par: 160,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Missed!' }; const TH = 120, LW = 90, OX = 0; let rows = [], off = 0, sp = LV(lv, 150, 200, 260), n = 0, bad = -1;
    const addRow = () => { rows.unshift({ lane: Math.floor(R(0, 4)), hit: 0 }); };
    for (let i = 0; i < 6; i++) addRow(); rows.forEach((r, i) => { r.idx = i; });
    g.update = dt => { off += sp * dt; sp = Math.min(LV(lv, 330, 420, 520), sp + dt * 3.2); while (off >= TH) { off -= TH; addRow(); } if (rows.length > 7) { const last = rows[rows.length - 1]; if (!last.hit) { g.over = true; sfx('bad'); } else rows.pop(); } };
    const y = i => 480 - (rows.length - 1 - i) * TH + off - TH * 6 + (rows.length - 7) * 0;
    const rowY = i => 480 - TH - (rows.length - 1 - i) * TH + off; // i counts from the top (index 0 newest)
    const tap = lane => { if (g.over) return; let k = -1; for (let i = rows.length - 1; i >= 0; i--) if (!rows[i].hit) { k = i; break; } if (k < 0) return; if (rows[k].lane === lane) { rows[k].hit = 1; g.score++; n++; sfx('tap'); } else { g.over = true; bad = lane; sfx('bad'); } };
    g.dbg = { next: () => { for (let i = rows.length - 1; i >= 0; i--) if (!rows[i].hit) return rows[i].lane; return -1; } };
    g.key = (k, d) => { if (!d) return; const m = { d: 0, f: 1, j: 2, k: 3, D: 0, F: 1, J: 2, K: 3, ArrowLeft: 1, ArrowRight: 2 }[k]; if (m !== undefined) tap(m); };
    g.ptr = (t, x) => { if (t === 'down') tap(clamp(Math.floor(x / LW), 0, 3)); };
    g.draw = c => {
      c.fillStyle = '#f2f2f2'; c.fillRect(0, 0, W, H); c.strokeStyle = '#ccc'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(i * LW, 0); c.lineTo(i * LW, H); c.stroke(); }
      rows.forEach((r, i) => { const ry = rowY(i); c.strokeStyle = '#ddd'; c.beginPath(); c.moveTo(0, ry); c.lineTo(W, ry); c.stroke(); rr(c, r.lane * LW + 2, ry + 2, LW - 4, TH - 4, 6, r.hit ? '#bbb' : '#111'); });
      hud(c, 'Tiles ' + g.score, 'Speed ' + Math.round(sp));
    };
    return g;
  } });

// ============ Gold Miner ============
register({ id: 'goldminer', cat: 'arcade', name: 'Gold Miner', icon: '⛏️', tag: 'Swing the claw and grab the treasure.', goal: 'grab as much treasure as you can in 60 seconds.', how: 'The claw swings left and right. Tap, click or press Space or the down arrow to shoot it. Big gold is worth more but is slow to pull in. Stones are heavy and worth little. Diamonds are small and quick.', par: 330,
  make(lv) {
    const g = { score: 0, over: false, t: 60, msg: 'Time!' }; const PX = 180, PY = 52; let ang = 0, ph = 0, rope = 0, state = 'swing', hook = null, items = [], flash = null;
    const KINDS = [['🪙', 0, 18, 18, 1.3], ['🥇', 1, 30, 45, 2.4], ['💎', 2, 12, 60, 0.7], ['🪨', 3, 26, 6, 3.2], ['👝', 4, 16, 30, 1.1]];
    for (let i = 0; i < LV(lv, 9, 11, 13); i++) { let o, tries = 0; do { const k = KINDS[Math.floor(R(0, 5))]; const w = k[1] === 3 || k[1] === 1 ? 1 : 1; o = { e: k[0], r: k[2], v: k[3] + (k[1] === 4 ? Math.round(R(0, 30)) : 0), wt: k[4], x: R(30, 330), y: R(150, 450) }; tries++; } while (tries < 40 && items.some(q => Math.hypot(q.x - o.x, q.y - o.y) < q.r + o.r + 8)); items.push(o); }
    g.update = dt => { g.t -= dt; if (g.t <= 0) { g.over = true; return; } if (state === 'swing') { ph += dt * LV(lv, 1.5, 1.9, 2.4); ang = Math.sin(ph) * 1.15; }
      else if (state === 'out') { rope += 330 * dt; const hx = PX + Math.sin(ang) * rope, hy = PY + Math.cos(ang) * rope; for (const o of items) if (Math.hypot(o.x - hx, o.y - hy) < o.r + 6) { hook = o; items.splice(items.indexOf(o), 1); state = 'in'; sfx('pop'); break; } if (hx < 6 || hx > 354 || hy > 474) state = 'in'; }
      else if (state === 'in') { const sp = hook ? 240 / hook.wt : 380; rope -= sp * dt; if (hook) { hook.x = PX + Math.sin(ang) * rope; hook.y = PY + Math.cos(ang) * rope; } if (rope <= 0) { rope = 0; if (hook) { g.score += hook.v; flash = { v: hook.v, a: 0.8 }; sfx(hook.v > 50 ? 'coin' : 'tap'); hook = null; } state = 'swing'; } } if (flash) { flash.a -= dt; if (flash.a <= 0) flash = null; } };
    const fire = () => { if (state === 'swing' && !g.over) { state = 'out'; rope = 18; sfx('click'); } };
    g.key = (k, d) => { if (d && (k === ' ' || k === 'ArrowDown')) fire(); };
    g.ptr = t => { if (t === 'down') fire(); };
    g.draw = c => {
      c.fillStyle = '#8a5a2a'; c.fillRect(0, 0, W, H); c.fillStyle = '#6a8ad0'; c.fillRect(0, 0, W, 64); c.fillStyle = '#5a3a1a'; c.fillRect(0, 64, W, 6);
      emo(c, '👷', PX, 44, 34); const hx = PX + Math.sin(ang) * rope, hy = PY + Math.cos(ang) * (state === 'swing' ? 40 : rope); const lx = PX + Math.sin(ang) * (state === 'swing' ? 40 : rope);
      c.strokeStyle = '#222'; c.lineWidth = 3; c.beginPath(); c.moveTo(PX, PY); c.lineTo(lx, hy); c.stroke(); c.fillStyle = '#ddd'; c.beginPath(); c.arc(lx, hy, 6, 0, 7); c.fill();
      items.forEach(o => emo(c, o.e, o.x, o.y, o.r * 2)); if (hook) emo(c, hook.e, hook.x, hook.y + 6, hook.r * 2); if (flash) txt(c, '+' + flash.v, PX + 60, 40, 24, '#ffe27a', 'center');
      hud(c, 'Cash ' + g.score, 'Time ' + Math.ceil(g.t));
    };
    return g;
  } });

// ============ Air Hockey ============
register({ id: 'airhockey', cat: 'sports', name: 'Air Hockey', icon: '🏒', tag: 'Smash the puck past the computer.', goal: 'score more goals than the computer. First to 5 or the most goals in 90 seconds wins.', how: 'Move the mouse or drag your finger to move your mallet on the bottom half. Hit the puck into the goal at the top. Arrow keys move the mallet too.', par: 330,
  make(lv) {
    const g = { score: 0, over: false, t: 90, msg: 'Full time' }; const P = { x: 180, y: 240, vx: 0, vy: 0 }, me = { x: 180, y: 410, px: 180, py: 410 }, ai = { x: 180, y: 70, px: 180, py: 70 }; let ms = 0, as = 0, serve = 0.8, kx = 0, ky = 0, tx = 180, ty = 410, flash = 0; const MR = 26, PR = 16, GW = 120; const aiSp = LV(lv, 150, 230, 320);
    const reset = dir => { P.x = 180; P.y = 240; P.vx = 0; P.vy = 0; serve = 0.9; me.x = 180; me.y = 410; ai.x = 180; ai.y = 70; P.vy = 0; flash = 0.4; };
    const hitM = (m, dt) => { const dx = P.x - m.x, dy = P.y - m.y, d = Math.hypot(dx, dy), mind = MR + PR; if (d < mind && d > 0) { const nx = dx / d, ny = dy / d; P.x = m.x + nx * mind; P.y = m.y + ny * mind; const mvx = (m.x - m.px) / dt, mvy = (m.y - m.py) / dt; const rel = (P.vx - mvx) * nx + (P.vy - mvy) * ny; if (rel < 0) { P.vx -= 2 * rel * nx; P.vy -= 2 * rel * ny; } const sp = Math.hypot(P.vx, P.vy); if (sp > 700) { P.vx *= 700 / sp; P.vy *= 700 / sp; } if (sp < 120) { P.vx += nx * 160; P.vy += ny * 160; } sfx('clack'); } };
    g.update = dt => { g.t -= dt; if (g.t <= 0) { fin(); return; } flash -= dt;
      if (kx || ky) { tx = clamp(tx + kx * 330 * dt, MR, 360 - MR); ty = clamp(ty + ky * 330 * dt, 250 + MR, 480 - MR); }
      me.px = me.x; me.py = me.y; me.x += clamp(tx - me.x, -900 * dt, 900 * dt); me.y += clamp(ty - me.y, -900 * dt, 900 * dt); me.x = clamp(me.x, MR, 360 - MR); me.y = clamp(me.y, 240 + MR, 480 - MR);
      ai.px = ai.x; ai.py = ai.y; let gx = 180, gy = 60; if (P.y < 270 || (P.vy < -30)) { gx = P.x; gy = P.y < 150 ? 60 : clamp(P.y - 40, 50, 150); if (P.y < ai.y + 4 && Math.abs(P.x - ai.x) < 40) { gy = P.y + 30; } } ai.x += clamp(gx - ai.x, -aiSp * dt, aiSp * dt); ai.y += clamp(gy - ai.y, -aiSp * dt, aiSp * dt); ai.x = clamp(ai.x, MR, 360 - MR); ai.y = clamp(ai.y, MR + 28, 240 - MR);
      if (serve > 0) { serve -= dt; return; } P.x += P.vx * dt; P.y += P.vy * dt; P.vx *= Math.pow(0.8, dt); P.vy *= Math.pow(0.8, dt);
      if (P.x < PR) { P.x = PR; P.vx = Math.abs(P.vx); sfx('tap'); } if (P.x > 360 - PR) { P.x = 360 - PR; P.vx = -Math.abs(P.vx); sfx('tap'); }
      const inGoal = Math.abs(P.x - 180) < GW / 2 - 6;
      if (P.y < PR && !inGoal) { P.y = PR; P.vy = Math.abs(P.vy); sfx('tap'); } if (P.y > 480 - PR && !inGoal) { P.y = 480 - PR; P.vy = -Math.abs(P.vy); sfx('tap'); }
      if (P.y < -PR) { ms++; g.score += 100; sfx('good'); reset(); if (ms >= 5) fin(); } else if (P.y > 480 + PR) { as++; g.score = Math.max(0, g.score - 20); sfx('bad'); reset(); if (as >= 5) fin(); }
      hitM(me, dt); hitM(ai, dt); };
    const fin = () => { g.over = true; if (ms > as) { g.win = true; g.msg = 'You win ' + ms + '–' + as; g.score += 150; } else g.msg = ms === as ? 'Draw ' + ms + '–' + as : 'Lost ' + ms + '–' + as; };
    g.key = (k, d) => { if (k === 'ArrowLeft') kx = d ? -1 : (kx === -1 ? 0 : kx); if (k === 'ArrowRight') kx = d ? 1 : (kx === 1 ? 0 : kx); if (k === 'ArrowUp') ky = d ? -1 : (ky === -1 ? 0 : ky); if (k === 'ArrowDown') ky = d ? 1 : (ky === 1 ? 0 : ky); };
    g.ptr = (t, x, y) => { if (t !== 'up') { tx = x; ty = y; kx = ky = 0; } };
    g.draw = c => {
      c.fillStyle = '#12365a'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.strokeRect(2, 2, W - 4, H - 4); c.beginPath(); c.moveTo(0, 240); c.lineTo(W, 240); c.stroke(); c.beginPath(); c.arc(180, 240, 44, 0, 7); c.stroke();
      c.fillStyle = '#05101e'; c.fillRect(180 - GW / 2, 0, GW, 8); c.fillRect(180 - GW / 2, H - 8, GW, 8);
      const mal = (m, col) => { c.fillStyle = col; c.beginPath(); c.arc(m.x, m.y, MR, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(m.x, m.y, MR * 0.45, 0, 7); c.fill(); }; mal(ai, '#d8453a'); mal(me, '#3ac28a');
      c.fillStyle = '#fff'; c.beginPath(); c.arc(P.x, P.y, PR, 0, 7); c.fill(); c.fillStyle = '#222'; c.beginPath(); c.arc(P.x, P.y, PR - 5, 0, 7); c.fill(); if (flash > 0) txt(c, 'GOAL!', W / 2, 240, 36, '#ffe27a', 'center');
      hud(c, 'You ' + ms + '  –  ' + as + ' CPU', 'Time ' + Math.ceil(g.t));
    };
    return g;
  } });

// ============ Balloon Cannon ============
register({ id: 'cannon', cat: 'arcade', name: 'Balloon Cannon', icon: '🎈', tag: 'Drag back, aim and pop the balloons.', goal: 'pop as many balloons as you can with 8 cannonballs.', how: 'Press anywhere and drag: the cannon aims at your finger, and the farther you drag the more power it has. Let go to fire. The cannonball curves down with gravity. Pop balloons to score. Golden balloons are worth more. Keyboard: up and down to aim, hold Space to power up and release to fire.', par: 280,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Out of shots' }; const CX = 40, CY = 420, GR = 520; let shots = 8, ball = null, drag = null, balloons = [], ang = -0.7, pw = 0.6, charge = 0, ch = 0, pops = [], rest = 0, key = 0;
    const spawn = () => { balloons.push({ x: R(150, 340), y: R(90, 380), r: LV(lv, 26, 22, 18), vx: R(-1, 1) * LV(lv, 15, 28, 45), vy: R(-1, 1) * LV(lv, 10, 20, 35), gold: Math.random() < 0.2, ph: R(0, 6) }); };
    for (let i = 0; i < LV(lv, 7, 8, 9); i++) spawn();
    const fire = () => { if (ball || g.over || shots <= 0) return; const v = 280 + pw * 520; ball = { x: CX + Math.cos(ang) * 30, y: CY + Math.sin(ang) * 30, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, trail: [] }; shots--; sfx('thud'); };
    g.update = dt => { pops = pops.filter(p => (p.a -= dt) > 0);
      balloons.forEach(b => { b.ph += dt; b.x += b.vx * dt; b.y += b.vy * dt + Math.sin(b.ph * 2) * 8 * dt; if (b.x < 120 || b.x > 345) b.vx = -b.vx; if (b.y < 60 || b.y > 400) b.vy = -b.vy; });
      if (ch) { charge = (charge + dt * 0.9) % 2; pw = 0.15 + 0.85 * (charge < 1 ? charge : 2 - charge); } if (key) ang = clamp(ang + key * 1.1 * dt, -1.45, -0.05);
      if (ball) { ball.vy += GR * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.trail.push([ball.x, ball.y]); if (ball.trail.length > 18) ball.trail.shift();
        for (let i = balloons.length - 1; i >= 0; i--) { const b = balloons[i]; if (Math.hypot(b.x - ball.x, b.y - ball.y) < b.r + 8) { g.score += b.gold ? 60 : 30; pops.push({ x: b.x, y: b.y, a: 0.5, gold: b.gold }); balloons.splice(i, 1); sfx('pop'); } }
        if (ball.y > 480 || ball.x > 380 || ball.x < -20) { ball = null; rest = 0.4; if (balloons.length < 3) { for (let k = 0; k < 3; k++) spawn(); } } }
      else if (shots <= 0 && !g.over) { rest -= dt; if (rest <= 0) { g.over = true; g.score += 0; } } };
    g.key = (k, d) => { if (k === 'ArrowUp') key = d ? -1 : (key === -1 ? 0 : key); if (k === 'ArrowDown') key = d ? 1 : (key === 1 ? 0 : key); if (k === ' ') { if (d) { ch = 1; } else if (ch) { ch = 0; fire(); } } };
    g.ptr = (t, x, y) => { if (t === 'down' || (t === 'move' && drag)) { drag = { x, y }; ang = clamp(Math.atan2(y - CY, x - CX), -1.45, -0.05); pw = clamp(Math.hypot(x - CX, y - CY) / 300, 0.15, 1); } if (t === 'up' && drag) { drag = null; fire(); } };
    g.draw = c => {
      const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#8fd0ff'); gr.addColorStop(1, '#e0f4ff'); c.fillStyle = gr; c.fillRect(0, 0, W, H); c.fillStyle = '#5aa84a'; c.fillRect(0, 440, W, 40);
      balloons.forEach(b => { c.strokeStyle = '#555'; c.lineWidth = 1; c.beginPath(); c.moveTo(b.x, b.y + b.r); c.lineTo(b.x, b.y + b.r + 14); c.stroke(); c.fillStyle = b.gold ? '#ffcc33' : ['#e8453c', '#3a8de0', '#9a5ad8', '#35b56a'][Math.floor(b.ph * 0 + (b.x * 7) % 4)]; c.beginPath(); c.ellipse(b.x, b.y, b.r * 0.85, b.r, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.2, 0, 7); c.fill(); });
      pops.forEach(p => { c.globalAlpha = p.a * 2; txt(c, '+' + (p.gold ? 60 : 30), p.x, p.y - (0.5 - p.a) * 50, 18, '#d33', 'center'); c.globalAlpha = 1; });
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.setLineDash([4, 6]); c.lineWidth = 2; c.beginPath(); let px = CX + Math.cos(ang) * 30, py = CY + Math.sin(ang) * 30, vx = Math.cos(ang) * (280 + pw * 520), vy = Math.sin(ang) * (280 + pw * 520); c.moveTo(px, py); for (let i = 0; i < 14; i++) { vy += GR * 0.07; px += vx * 0.07; py += vy * 0.07; c.lineTo(px, py); } c.stroke(); c.setLineDash([]);
      c.save(); c.translate(CX, CY); c.rotate(ang); c.fillStyle = '#333'; c.fillRect(0, -10, 46, 20); c.restore(); c.fillStyle = '#6a4a2a'; c.beginPath(); c.arc(CX, CY + 6, 20, 0, 7); c.fill();
      if (ball) { c.fillStyle = '#222'; c.beginPath(); c.arc(ball.x, ball.y, 8, 0, 7); c.fill(); ball.trail.forEach(([tx, ty], i) => { c.fillStyle = 'rgba(0,0,0,' + i / 40 + ')'; c.fillRect(tx - 1, ty - 1, 3, 3); }); }
      c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(10, 458, 100, 10); c.fillStyle = pw > 0.8 ? '#e8453c' : '#ffd45a'; c.fillRect(10, 458, 100 * pw, 10); hud(c, 'Shots ' + shots, 'Score ' + g.score);
    };
    return g;
  } });
})();
