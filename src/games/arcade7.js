/* ---------- Arcade engine games, part 7: crossword, anagram, dice, party games, bubbles ---------- */
(function () {
const { W, H, R, clamp, LV, emo, txt, hud, sfx, register } = Arc;
const rr = (c, x, y, w, h, r, f) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); c.fillStyle = f; c.fill(); };
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const inb = (x, y, b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const COL = ['#e8453c', '#3a8de0', '#35b56a', '#f2b441', '#9a5ad8', '#ee7d3a'];

// ---------- clue bank shared by Crossword and Word Builder ----------
const BANK = [['SUN', 'The star we orbit'], ['MOON', 'It orbits the Earth'], ['STAR', 'Twinkles at night'], ['RAIN', 'Water falling from clouds'], ['SNOW', 'White and cold, falls in winter'], ['BIRD', 'It has wings and feathers'], ['FISH', 'It swims in water'], ['TREE', 'It has leaves and a trunk'], ['BOOK', 'You read it'], ['DOOR', 'You open it to go in'], ['LAMP', 'It gives light'], ['CAKE', 'Eaten on a birthday'], ['SHIP', 'Sails the sea'], ['KING', 'A male ruler'], ['RING', 'Worn on a finger'], ['LION', 'King of the jungle'], ['BEAR', 'Big furry animal that loves honey'], ['FROG', 'It hops and croaks'], ['DUCK', 'It quacks'], ['MILK', 'White drink from cows'],
  ['APPLE', 'A red or green fruit'], ['BREAD', 'Baked in a loaf'], ['CHAIR', 'You sit on it'], ['CLOUD', 'White and fluffy in the sky'], ['DANCE', 'Move to music'], ['EARTH', 'Our planet'], ['GRAPE', 'Small fruit that grows in bunches'], ['HORSE', 'You can ride it'], ['IGLOO', 'A house made of ice'], ['JUICE', 'Squeezed from fruit'], ['KNIFE', 'Used to cut food'], ['LEMON', 'A sour yellow fruit'], ['MOUSE', 'A cat chases it'], ['NIGHT', 'When it is dark'], ['OCEAN', 'Atlantic or Pacific'], ['PIANO', 'An instrument with black and white keys'], ['QUEEN', 'A female ruler'], ['RIVER', 'Flowing water'], ['SNAKE', 'A slithering reptile'], ['TIGER', 'A big striped cat'], ['UNCLE', 'Your parent\'s brother'], ['VOICE', 'You sing with it'], ['WATER', 'H2O'], ['ZEBRA', 'A striped horse-like animal'], ['SMILE', 'A happy look'], ['TRAIN', 'Runs on rails'], ['PLANT', 'Grows in soil'], ['BEACH', 'Sand beside the sea'], ['CLOCK', 'Tells the time'], ['MONEY', 'You spend it'],
  ['BRIDGE', 'Crosses a river'], ['CASTLE', 'A king lives here'], ['DRAGON', 'A fire-breathing monster'], ['GARDEN', 'Flowers and vegetables grow here'], ['ISLAND', 'Land surrounded by water'], ['JUNGLE', 'Thick tropical forest'], ['KITTEN', 'A baby cat'], ['ORANGE', 'A citrus fruit and a colour'], ['PLANET', 'Mars or Venus'], ['ROCKET', 'Flies into space'], ['SUMMER', 'The hottest season'], ['WINTER', 'The coldest season'], ['TURTLE', 'A slow animal with a shell'], ['PENCIL', 'You write with it and can erase'], ['MIRROR', 'Shows your reflection'], ['MARKET', 'A place to buy food'], ['SCHOOL', 'Where students learn'], ['FOREST', 'Lots of trees'], ['GUITAR', 'A stringed instrument'], ['WINDOW', 'Glass in a wall'], ['BUTTER', 'Spread on bread'], ['DOCTOR', 'Helps sick people'], ['FAMILY', 'Parents and children'], ['ANIMAL', 'A zoo is full of them'], ['DOLPHIN', 'A clever sea mammal'], ['VOLCANO', 'A mountain that erupts'], ['BALLOON', 'Floats when filled with air'], ['THUNDER', 'The loud noise after lightning'], ['KITCHEN', 'Where food is cooked'], ['LIBRARY', 'A building full of books']];

// ============ Crossword ============
register({ id: 'crossword', cat: 'word', name: 'Crossword', icon: '📰', tag: 'Fill the grid using the clues.', goal: 'fill in the whole crossword correctly before time runs out.', how: 'Tap a square, read the clue at the top, and type the answer with the keyboard on screen or your own. Tap the same square again to switch between across and down. The 💡 button reveals the selected letter for a small cost.', par: 260,
  make(lv) {
    const g = { score: 0, over: false, t: LV(lv, 300, 270, 240), msg: 'Time!' }; const want = LV(lv, 4, 6, 8), maxW = LV(lv, 5, 6, 7);
    let words, rows, cols, cells = new Map(); let tries = 0;
    do {
      const pool = shuf(BANK.filter(b => b[0].length <= maxW + (lv === 2 ? 1 : 0) && b[0].length >= (lv === 0 ? 3 : 4))); const placed = []; const grid = new Map(); const key = (r, c) => r + ',' + c;
      const can = (w, r, c, dr, dc) => { for (let k = 0; k < w.length; k++) { const rr2 = r + dr * k, cc = c + dc * k, ex = grid.get(key(rr2, cc)); if (ex && ex !== w[k]) return false; if (!ex) { if (dr === 0 ? (grid.get(key(rr2 - 1, cc)) || grid.get(key(rr2 + 1, cc))) : (grid.get(key(rr2, cc - 1)) || grid.get(key(rr2, cc + 1)))) return false; } }
        if (grid.get(key(r - dr, c - dc)) || grid.get(key(r + dr * w.length, c + dc * w.length))) return false; return true; };
      const put = (w, r, c, dr, dc, clue) => { for (let k = 0; k < w.length; k++) grid.set(key(r + dr * k, c + dc * k), w[k]); placed.push({ w, r, c, dr, dc, clue }); };
      const first = pool.shift(); put(first[0], 0, 0, 0, 1, first[1]);
      for (const [w, clue] of pool) { if (placed.length >= want) break; let done = false; const opts = [];
        for (const p of placed) for (let i = 0; i < p.w.length && !done; i++) for (let j = 0; j < w.length; j++) if (p.w[i] === w[j]) { const dr = p.dr ? 0 : 1, dc = p.dr ? 1 : 0, r = p.r + p.dr * i - dr * j, c = p.c + p.dc * i - dc * j; if (placed.some(q => q.r === r && q.c === c && q.dr === dr)) continue; if (can(w, r, c, dr, dc)) opts.push([r, c, dr, dc]); }
        if (opts.length) { const o = opts[Math.floor(Math.random() * opts.length)]; put(w, o[0], o[1], o[2], o[3], clue); } }
      const rs = [...grid.keys()].map(k => +k.split(',')[0]), cs = [...grid.keys()].map(k => +k.split(',')[1]); const r0 = Math.min(...rs), c0 = Math.min(...cs); rows = Math.max(...rs) - r0 + 1; cols = Math.max(...cs) - c0 + 1;
      words = placed.map(p => ({ w: p.w, r: p.r - r0, c: p.c - c0, dr: p.dr, dc: p.dc, clue: p.clue })); tries++;
    } while ((words.length < Math.min(want, 4) || rows > 11 || cols > 11 || (words.length < want && tries < 25)) && tries < 80);
    words.sort((a, b) => a.r - b.r || a.c - b.c); let num = 0; const starts = new Map();
    words.forEach(w => { const k = w.r + ',' + w.c; if (!starts.has(k)) starts.set(k, ++num); w.n = starts.get(k); w.dir = w.dr ? 'Down' : 'Across'; w.id = w.n + w.dir[0]; });
    words.forEach((w, wi) => { for (let k = 0; k < w.w.length; k++) { const r = w.r + w.dr * k, c = w.c + w.dc * k, kk = r + ',' + c; const cell = cells.get(kk) || { r, c, ch: w.w[k], a: -1, d: -1, v: '', bad: 0, hint: 0 }; if (w.dr) cell.d = wi; else cell.a = wi; cells.set(kk, cell); } });
    const CS = Math.min(30, Math.floor(330 / cols), Math.floor(272 / rows)), OX = Math.floor((W - cols * CS) / 2), OY = 70 + Math.floor((282 - rows * CS) / 2);
    let sel = null, dir = 'a', hints = 0, flash = 0, solved = false;
    sel = [...cells.values()][0]; dir = sel.a >= 0 ? 'a' : 'd';
    const wordOf = () => { const wi = dir === 'a' ? sel.a : sel.d; return wi >= 0 ? words[wi] : (sel.a >= 0 ? words[sel.a] : words[sel.d]); };
    const cellsOf = w => { const out = []; for (let k = 0; k < w.w.length; k++) out.push(cells.get((w.r + w.dr * k) + ',' + (w.c + w.dc * k))); return out; };
    const check = () => { const all = [...cells.values()]; if (all.every(c => c.v)) { if (all.every(c => c.v === c.ch)) { solved = true; g.over = true; g.win = true; g.msg = 'Solved!'; g.score = all.length * 3 + 80 + Math.round(g.t / 2) - hints * 15; sfx('win'); } else { all.forEach(c => { c.bad = c.v !== c.ch ? 1 : 0; }); flash = 1.2; sfx('bad'); } } };
    const typeCh = ch => { if (g.over || !sel) return; if (sel.hint) { return; } sel.v = ch; sel.bad = 0; sfx('tap'); const w = wordOf(), cl = cellsOf(w), i = cl.indexOf(sel); if (i < cl.length - 1) sel = cl[i + 1]; check(); };
    const back = () => { if (g.over || !sel) return; if (sel.v && !sel.hint) { sel.v = ''; return; } const w = wordOf(), cl = cellsOf(w), i = cl.indexOf(sel); if (i > 0) { sel = cl[i - 1]; if (!sel.hint) sel.v = ''; } };
    const KB = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM⌫']; const kb = []; KB.forEach((row, ri) => { const kw = 34, tot = row.length * kw + (row.length - 1) * 2; row.split('').forEach((ch, i) => kb.push({ ch, x: (W - tot) / 2 + i * (kw + 2), y: 366 + ri * 38, w: kw, h: 34 })); });
    const hintBtn = { x: 296, y: 32, w: 58, h: 32 };
    g.update = dt => { g.t -= dt; flash -= dt; if (g.t <= 0 && !g.over) { g.over = true; g.score = [...cells.values()].filter(c => c.v === c.ch).length * 3 - hints * 15; g.score = Math.max(0, g.score); } };
    g.key = (k, d) => { if (!d) return; if (/^[a-zA-Z]$/.test(k)) typeCh(k.toUpperCase()); else if (k === 'Backspace') back(); else if (k === ' ' && sel && sel.a >= 0 && sel.d >= 0) dir = dir === 'a' ? 'd' : 'a'; else if (sel) { const dm = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[k]; if (dm) { const n = cells.get((sel.r + dm[0]) + ',' + (sel.c + dm[1])); if (n) { sel = n; if (dir === 'a' && n.a < 0) dir = 'd'; else if (dir === 'd' && n.d < 0) dir = 'a'; } } } };
    g.ptr = (t, x, y) => { if (t !== 'down' || g.over) return; if (inb(x, y, hintBtn)) { if (sel && !sel.hint && sel.v !== sel.ch) { sel.v = sel.ch; sel.hint = 1; hints++; sfx('coin'); check(); } return; }
      for (const k of kb) if (inb(x, y, k)) { if (k.ch === '⌫') back(); else typeCh(k.ch); return; }
      const cx = Math.floor((x - OX) / CS), cy = Math.floor((y - OY) / CS), cl = cells.get(cy + ',' + cx); if (cl) { if (cl === sel) { if (cl.a >= 0 && cl.d >= 0) dir = dir === 'a' ? 'd' : 'a'; } else { sel = cl; if (dir === 'a' && cl.a < 0) dir = 'd'; else if (dir === 'd' && cl.d < 0) dir = 'a'; } sfx('click'); } };
    g.dbg = { words, cells, rows, cols };
    g.draw = c => {
      c.fillStyle = '#e9e2cf'; c.fillRect(0, 0, W, H); const cw = wordOf(), act = new Set(cellsOf(cw));
      c.fillStyle = '#fff8dc'; c.fillRect(0, 26, W, 40); txt(c, cw.n + ' ' + cw.dir + ' (' + cw.w.length + ')', 8, 38, 12, '#8a5a1a'); const clue = cw.clue; txt(c, clue, 8, 56, clue.length > 34 ? 12 : 15, '#222');
      rr(c, hintBtn.x, hintBtn.y, hintBtn.w, hintBtn.h, 8, '#f2b441'); txt(c, '💡 Hint', hintBtn.x + hintBtn.w / 2, hintBtn.y + 16, 12, '#4a2f00', 'center');
      cells.forEach(cl => { const X = OX + cl.c * CS, Y = OY + cl.r * CS; c.fillStyle = cl === sel ? '#ffd45a' : act.has(cl) ? '#bfe0ff' : '#fff'; c.fillRect(X, Y, CS, CS); c.strokeStyle = '#444'; c.lineWidth = 1; c.strokeRect(X + 0.5, Y + 0.5, CS - 1, CS - 1);
        const nw = words.find(w => w.r === cl.r && w.c === cl.c); if (nw) txt(c, nw.n, X + 2, Y + 7, 9, '#555'); if (cl.v) txt(c, cl.v, X + CS / 2, Y + CS / 2 + 3, Math.floor(CS * 0.62), cl.bad && flash > 0 ? '#d33' : cl.hint ? '#1a7a3a' : '#1a2a6a', 'center'); });
      kb.forEach(k => { rr(c, k.x, k.y, k.w, k.h, 6, '#c8bfa4'); txt(c, k.ch, k.x + k.w / 2, k.y + k.h / 2 + 1, 17, '#222', 'center'); });
      hud(c, 'Letters ' + [...cells.values()].filter(x => x.v).length + '/' + cells.size, 'Time ' + Math.ceil(g.t));
    };
    return g;
  } });

// ============ Word Builder (anagram) ============
register({ id: 'anagram', cat: 'word', name: 'Word Builder', icon: '🔠', tag: 'Unscramble the letters to make the word.', goal: 'unscramble as many words as you can in 75 seconds.', how: 'Tap the letters in the right order to spell the word (or type it). The clue helps. Tap ⌫ to take a letter back and Skip to try another word (costs points).', par: 280,
  make(lv) {
    const g = { score: 0, over: false, t: 75, msg: 'Time!' }; const pool = BANK.filter(b => lv === 0 ? b[0].length <= 5 && b[0].length >= 4 : lv === 1 ? b[0].length >= 5 && b[0].length <= 6 : b[0].length >= 6); let cur = null, built = [], tiles = [], ok = 0, flash = 0, msgT = 0;
    const next = () => { cur = pool[Math.floor(Math.random() * pool.length)]; let sc; do { sc = shuf(cur[0].split('')); } while (sc.join('') === cur[0]); tiles = sc.map((ch, i) => ({ ch, used: 0, i })); built = []; };
    next();
    const layout = () => { const n = tiles.length, w = Math.min(46, Math.floor(330 / n) - 4); return tiles.map((t, i) => ({ x: (W - n * (w + 4)) / 2 + i * (w + 4), y: 290, w, h: w + 8 })); };
    const pickT = t => { if (g.over || t.used) return; t.used = 1; built.push(t); sfx('tap'); fin(); };
    const fin = () => { if (built.length === cur[0].length) { if (built.map(b => b.ch).join('') === cur[0]) { g.score += cur[0].length * 10 + 10; ok++; sfx('coin'); flash = 0.3; next(); } else { sfx('bad'); flash = 0.4; built.forEach(b => { b.used = 0; }); built = []; g.t -= 2; } } };
    const back = () => { const b = built.pop(); if (b) b.used = 0; };
    const skip = { x: 250, y: 400, w: 100, h: 44 }, bk = { x: 10, y: 400, w: 100, h: 44 };
    g.update = dt => { g.t -= dt; flash -= dt; if (g.t <= 0) g.over = true; };
    g.key = (k, d) => { if (!d) return; if (/^[a-zA-Z]$/.test(k)) { const t = tiles.find(x => !x.used && x.ch === k.toUpperCase()); if (t) pickT(t); } else if (k === 'Backspace') back(); else if (k === 'Enter') { g.score = Math.max(0, g.score - 8); next(); } };
    g.ptr = (t, x, y) => { if (t !== 'down') return; if (inb(x, y, skip)) { g.score = Math.max(0, g.score - 8); next(); sfx('click'); return; } if (inb(x, y, bk)) { back(); return; } const L = layout(); tiles.forEach((tl, i) => { if (inb(x, y, L[i])) pickT(tl); }); };
    g.draw = c => {
      c.fillStyle = flash > 0 ? '#2a4a30' : '#2b2440'; c.fillRect(0, 0, W, H); rr(c, 14, 50, 332, 74, 14, 'rgba(255,255,255,.08)'); txt(c, 'Clue', 26, 66, 12, '#b9a9e0'); txt(c, cur[1], W / 2, 98, cur[1].length > 30 ? 14 : 18, '#fff', 'center');
      const n = cur[0].length, w = Math.min(46, Math.floor(330 / n) - 4); for (let i = 0; i < n; i++) { const x = (W - n * (w + 4)) / 2 + i * (w + 4); rr(c, x, 170, w, w + 8, 8, built[i] ? '#f2b441' : 'rgba(255,255,255,.12)'); if (built[i]) txt(c, built[i].ch, x + w / 2, 170 + (w + 8) / 2 + 1, w * 0.6, '#3a2400', 'center'); }
      const L = layout(); tiles.forEach((t, i) => { if (!t.used) { rr(c, L[i].x, L[i].y, L[i].w, L[i].h, 8, '#6a5ad0'); txt(c, t.ch, L[i].x + L[i].w / 2, L[i].y + L[i].h / 2 + 1, L[i].w * 0.6, '#fff', 'center'); } else rr(c, L[i].x, L[i].y, L[i].w, L[i].h, 8, 'rgba(255,255,255,.06)'); });
      rr(c, bk.x, bk.y, bk.w, bk.h, 10, '#4a4470'); txt(c, '⌫ Back', bk.x + 50, bk.y + 23, 16, '#fff', 'center'); rr(c, skip.x, skip.y, skip.w, skip.h, 10, '#8a3a4a'); txt(c, 'Skip −8', skip.x + 50, skip.y + 23, 16, '#fff', 'center');
      hud(c, 'Words ' + ok, 'Time ' + Math.ceil(g.t) + '  Score ' + g.score);
    };
    return g;
  } });

// ============ dice helpers ============
function die(c, x, y, s, v, f, ink, ring) {
  rr(c, x, y, s, s, s * 0.18, f); if (ring) { c.strokeStyle = ring; c.lineWidth = 3; c.beginPath(); c.roundRect ? c.roundRect(x, y, s, s, s * 0.18) : c.rect(x, y, s, s); c.stroke(); }
  const P = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] }[v] || [];
  c.fillStyle = ink; P.forEach(([a, b]) => { c.beginPath(); c.arc(x + s * (0.22 + a * 0.28), y + s * (0.22 + b * 0.28), s * 0.075, 0, 7); c.fill(); });
}
const cnt = d => { const n = [0, 0, 0, 0, 0, 0, 0]; d.forEach(v => n[v]++); return n; };

// ============ Yacht Dice ============
const YC = [['Ones', d => cnt(d)[1] * 1], ['Twos', d => cnt(d)[2] * 2], ['Threes', d => cnt(d)[3] * 3], ['Fours', d => cnt(d)[4] * 4], ['Fives', d => cnt(d)[5] * 5], ['Sixes', d => cnt(d)[6] * 6],
  ['Three of a kind', d => (cnt(d).some(x => x >= 3) ? d.reduce((a, b) => a + b, 0) : 0)], ['Four of a kind', d => (cnt(d).some(x => x >= 4) ? d.reduce((a, b) => a + b, 0) : 0)], ['Full house', d => { const n = cnt(d).slice(1).filter(x => x); return n.includes(3) && n.includes(2) || n.includes(5) ? 25 : 0; }],
  ['Small straight', d => { const s = new Set(d); return [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]].some(r => r.every(x => s.has(x))) ? 30 : 0; }], ['Large straight', d => { const s = [...new Set(d)].sort().join(''); return s === '12345' || s === '23456' ? 40 : 0; }], ['Yacht (five alike)', d => (cnt(d).some(x => x === 5) ? 50 : 0)], ['Chance', d => d.reduce((a, b) => a + b, 0)]];
register({ id: 'yacht', cat: 'dice', name: 'Yacht Dice', icon: '🎲', tag: 'Roll five dice and fill your score card.', goal: 'build the highest score over 9 turns.', how: 'Tap Roll. Tap dice you want to keep (they get a gold ring), then roll the rest again. You have a few rolls each turn. When you like what you have, tap a line on the score card to score it. Each line can be used once. Nine turns in total.', par: 175,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Final score' }; const maxR = LV(lv, 4, 3, 3); let d = [1, 1, 1, 1, 1], keep = [0, 0, 0, 0, 0], rolls = 0, turn = 1, used = Array(13).fill(-1), rolling = 0, last = '';
    const roll = () => { if (rolls >= maxR || rolling > 0 || g.over) return; rolling = 0.45; rolls++; sfx('clack'); };
    const take = i => { if (g.over || !rolls || used[i] >= 0 || rolling > 0) return; used[i] = YC[i][1](d); g.score += used[i]; last = YC[i][0] + ' +' + used[i]; sfx(used[i] ? 'coin' : 'bad'); turn++; rolls = 0; keep = [0, 0, 0, 0, 0]; if (turn > 9) { g.over = true; g.win = true; } };
    g.update = dt => { if (rolling > 0) { rolling -= dt; d = d.map((v, i) => (keep[i] ? v : 1 + Math.floor(Math.random() * 6))); } };
    const rb = { x: 232, y: 130, w: 118, h: 40 }, dx = i => ({ x: 14 + i * 62, y: 70, w: 54, h: 54 });
    const ci = i => ({ x: 8 + (i % 2) * 178, y: 182 + Math.floor(i / 2) * 42, w: 172, h: 38 });
    g.key = (k, dn) => { if (!dn) return; if (k === ' ' || k === 'Enter') roll(); if (/^[1-5]$/.test(k) && rolls) keep[+k - 1] ^= 1; };
    g.ptr = (t, x, y) => { if (t !== 'down') return; if (inb(x, y, rb)) { roll(); return; } if (rolls && !rolling) for (let i = 0; i < 5; i++) if (inb(x, y, dx(i))) { keep[i] ^= 1; sfx('tap'); } for (let i = 0; i < 13; i++) if (inb(x, y, ci(i))) take(i); };
    g.draw = c => {
      c.fillStyle = '#16402e'; c.fillRect(0, 0, W, H); d.forEach((v, i) => { const b = dx(i); die(c, b.x, b.y - (keep[i] ? 6 : 0) + (rolling > 0 && !keep[i] ? R(-3, 3) : 0), b.w, v, '#fffbe8', '#222', keep[i] ? '#f2b441' : null); });
      rr(c, rb.x, rb.y, rb.w, rb.h, 10, rolls >= maxR ? '#555' : '#e8a33c'); txt(c, rolls >= maxR ? 'No rolls left' : 'Roll (' + (maxR - rolls) + ' left)', rb.x + rb.w / 2, rb.y + 21, 15, '#2a1800', 'center'); txt(c, last || (rolls ? 'Pick dice to keep, then a line' : 'Tap Roll to start'), 14, 150, 13, '#cfe8d8');
      YC.forEach((y, i) => { const b = ci(i), usedv = used[i] >= 0; rr(c, b.x, b.y, b.w, b.h, 8, usedv ? 'rgba(255,255,255,.07)' : (rolls ? '#2f7a56' : '#245c42')); txt(c, y[0], b.x + 8, b.y + 20, 13, usedv ? '#7a9a88' : '#fff'); txt(c, usedv ? String(used[i]) : (rolls ? '+' + y[1](d) : ''), b.x + b.w - 8, b.y + 20, 15, usedv ? '#cfe8d8' : '#ffe27a', 'right'); });
      hud(c, 'Turn ' + Math.min(9, turn) + ' of 9', 'Score ' + g.score);
    };
    return g;
  } });

// ============ Farkle ============
function fkScore(vals) { const n = cnt(vals), len = vals.length; if (!len) return 0; if (len === 6 && n.slice(1).every(x => x === 1)) return 1500; if (len === 6 && n.slice(1).filter(x => x === 2).length === 3) return 1500; let s = 0; for (let f = 1; f <= 6; f++) { let k = n[f]; if (k >= 3) { s += (f === 1 ? 1000 : f * 100) * Math.pow(2, k - 3); k = 0; } if (f === 1) s += k * 100; else if (f === 5) s += k * 50; else if (k) return 0; } return s; }
function fkHas(vals) { const n = cnt(vals); return n[1] > 0 || n[5] > 0 || n.some(x => x >= 3) || (vals.length === 6 && (n.slice(1).every(x => x === 1) || n.slice(1).filter(x => x === 2).length === 3)); }
register({ id: 'farkle', cat: 'dice', name: 'Farkle', icon: '🎰', tag: 'Press your luck with six dice.', goal: 'bank the most points over 8 turns. Do not Farkle!', how: 'Roll six dice. Tap the scoring dice to keep them (1s, 5s, three or more alike, a straight or three pairs), then roll the rest or bank your points. If a roll has nothing that scores you Farkle and lose the points for that turn. Use all six dice for a fresh set.', par: 2300,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Final score' }; const TURNS = LV(lv, 9, 8, 8); let turn = 1, tp = 0, dice = [], ph = 'start', note = '', nt = 0;
    const newTurn = () => { turn++; tp = 0; dice = []; ph = 'start'; if (turn > TURNS) { g.over = true; g.win = true; } };
    const rollN = n => { dice = dice.map(x => x.locked ? x : null).filter(Boolean); for (let i = 0; i < n; i++) dice.push({ v: 1 + Math.floor(Math.random() * 6), locked: 0, sel: 0 }); sfx('clack'); ph = 'pick'; if (!fkHas(dice.filter(x => !x.locked).map(x => x.v))) { note = 'FARKLE! Turn points lost'; nt = 1.4; tp = 0; ph = 'farkle'; sfx('bad'); } };
    const selVals = () => dice.filter(x => x.sel && !x.locked).map(x => x.v);
    const lockSel = () => { tp += fkScore(selVals()); dice.forEach(x => { if (x.sel) { x.locked = 1; x.sel = 0; } }); if (dice.every(x => x.locked)) { dice = []; note = 'Hot dice! Roll all six'; nt = 1.2; } };
    const rollBtn = { x: 14, y: 360, w: 160, h: 54 }, bankBtn = { x: 186, y: 360, w: 160, h: 54 };
    const doRoll = () => { if (ph === 'start') { dice = []; rollN(6); } else if (ph === 'pick' && fkScore(selVals()) > 0) { lockSel(); rollN(dice.length ? 6 - dice.length : 6); } };
    const doBank = () => { if (ph !== 'pick') return; const s = fkScore(selVals()); if (s <= 0 && tp <= 0) return; if (s > 0) lockSel(); g.score += tp; note = 'Banked ' + tp; nt = 1; sfx('coin'); newTurn(); };
    g.update = dt => { if (nt > 0) { nt -= dt; if (nt <= 0 && ph === 'farkle') { newTurn(); } } };
    const dp = i => ({ x: 14 + (i % 3) * 112, y: 100 + Math.floor(i / 3) * 112, w: 100, h: 100 });
    g.key = (k, d) => { if (!d) return; if (k === ' ' || k === 'Enter') doRoll(); if (k === 'b' || k === 'B') doBank(); if (/^[1-6]$/.test(k) && ph === 'pick') { const x = dice[+k - 1]; if (x && !x.locked) x.sel ^= 1; } };
    g.ptr = (t, x, y) => { if (t !== 'down' || g.over) return; if (inb(x, y, rollBtn)) { doRoll(); return; } if (inb(x, y, bankBtn)) { doBank(); return; } if (ph === 'pick') dice.forEach((dd, i) => { if (!dd.locked && inb(x, y, dp(i))) { dd.sel ^= 1; sfx('tap'); } }); };
    g.draw = c => {
      c.fillStyle = '#3a1a24'; c.fillRect(0, 0, W, H); const sv = selVals(), sp = fkScore(sv);
      txt(c, 'Turn points ' + tp + (sp > 0 ? '  + ' + sp : ''), W / 2, 50, 18, '#ffd45a', 'center'); txt(c, note && nt > 0 ? note : (ph === 'start' ? 'Tap Roll to throw six dice' : ph === 'pick' ? (sp > 0 ? 'Keep these and roll, or bank' : 'Tap the scoring dice') : ''), W / 2, 78, 14, '#f3d0d8', 'center');
      dice.forEach((dd, i) => { const b = dp(i); die(c, b.x, b.y, b.w, dd.v, dd.locked ? '#9aa' : '#fffbe8', '#222', dd.sel ? '#f2b441' : null); if (dd.locked) txt(c, '✓', b.x + b.w - 14, b.y + 12, 16, '#2a6a2a', 'center'); });
      rr(c, rollBtn.x, rollBtn.y, rollBtn.w, rollBtn.h, 12, ph === 'start' || (ph === 'pick' && sp > 0) ? '#e8a33c' : '#555'); txt(c, ph === 'start' ? 'Roll 6 dice' : 'Keep & roll', rollBtn.x + 80, rollBtn.y + 28, 17, '#2a1800', 'center');
      rr(c, bankBtn.x, bankBtn.y, bankBtn.w, bankBtn.h, 12, ph === 'pick' && (sp > 0 || tp > 0) ? '#3aa06a' : '#555'); txt(c, 'Bank ' + (tp + sp), bankBtn.x + 80, bankBtn.y + 28, 17, '#fff', 'center');
      txt(c, '1 = 100 · 5 = 50 · three alike = face × 100', W / 2, 436, 12, '#c89aa8', 'center'); txt(c, 'three 1s = 1000 · straight or 3 pairs = 1500', W / 2, 454, 12, '#c89aa8', 'center'); hud(c, 'Turn ' + Math.min(turn, TURNS) + ' of ' + TURNS, 'Banked ' + g.score);
    };
    return g;
  } });

// ============ Stop the Clock ============
register({ id: 'stopclock', cat: 'group', name: 'Stop the Clock', icon: '⏱️', tag: 'Stop the timer exactly on the target.', goal: 'stop the clock as close to the target time as you can in 5 tries.', how: 'A timer starts counting. Tap, click or press Space to stop it on the target time. After a moment the numbers disappear, so you have to feel the time. Closer is more points.', par: 360,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Done!' }; const tgt = LV(lv, 5, 5, 7.77), hideAt = LV(lv, 99, 2, 1); let t = 0, k = 0, run = false, res = [], wait = 0.8, shown = null;
    g.update = dt => { if (wait > 0) { wait -= dt; if (wait <= 0) { run = true; t = 0; shown = null; } } else if (run) { t += dt; if (t > tgt + 4) stop(); } };
    const stop = () => { if (!run) return; run = false; const err = Math.abs(t - tgt), pts = Math.max(0, Math.round(100 - err * 100)); res.push({ t, pts }); g.score += pts; shown = { t, pts }; sfx(pts > 85 ? 'good' : 'tap'); k++; if (k >= 5) { setTimeout(() => { g.over = true; g.win = true; }, 900); wait = 0; } else wait = 1.5; };
    g.key = (kk, d) => { if (d && (kk === ' ' || kk === 'Enter')) stop(); };
    g.ptr = tp => { if (tp === 'down') stop(); };
    g.draw = c => {
      c.fillStyle = '#10243a'; c.fillRect(0, 0, W, H); txt(c, 'Target', W / 2, 90, 18, '#9fc4e8', 'center'); txt(c, tgt.toFixed(2) + ' s', W / 2, 140, 50, '#ffd45a', 'center');
      const vis = run && t < hideAt; txt(c, run ? (vis ? t.toFixed(2) : '?.??') : (shown ? shown.t.toFixed(2) : '0.00'), W / 2, 250, 76, run && !vis ? '#456' : '#fff', 'center'); txt(c, run ? 'TAP to stop' : (shown ? '+' + shown.pts + ' points' : 'Get ready…'), W / 2, 320, 22, shown ? '#7aff9a' : '#9fc4e8', 'center');
      res.forEach((r, i) => txt(c, (i + 1) + ') ' + r.t.toFixed(2) + ' s  +' + r.pts, 80, 360 + i * 20, 14, '#cfe0f0')); hud(c, 'Try ' + Math.min(5, k + (run || wait > 0 ? 1 : 0)) + ' of 5', 'Score ' + g.score);
    };
    return g;
  } });

// ============ Fast Fingers ============
register({ id: 'fastfingers', cat: 'group', name: 'Fast Fingers', icon: '👆', tag: 'Tap the glowing circles before they vanish.', goal: 'tap as many circles as you can. Faster taps score more.', how: 'A circle lights up somewhere on the screen. Tap it as fast as you can. Quicker taps score more points. If you miss, it disappears. There are 25 circles.', par: 330,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Done!' }; const life = LV(lv, 1.7, 1.25, 0.9), N = 25; let n = 0, ci = null, gap = 0.5, hits = 0, pop = [];
    const spawn = () => { ci = { x: R(40, 320), y: R(70, 440), r: LV(lv, 40, 34, 28), age: 0 }; n++; };
    g.update = dt => { pop = pop.filter(p => (p.a -= dt) > 0); if (ci) { ci.age += dt; if (ci.age >= life) { ci = null; gap = 0.35; sfx('bad'); } } else { gap -= dt; if (gap <= 0) { if (n >= N) { g.over = true; g.win = true; } else spawn(); } } };
    g.ptr = (t, x, y) => { if (t !== 'down' || !ci) return; if (Math.hypot(x - ci.x, y - ci.y) <= ci.r + 8) { const p = Math.round(8 + 12 * (1 - ci.age / life)); g.score += p; hits++; pop.push({ x: ci.x, y: ci.y, p, a: 0.6 }); ci = null; gap = R(0.15, 0.5); sfx('pop'); } };
    g.draw = c => {
      c.fillStyle = '#1b1530'; c.fillRect(0, 0, W, H); pop.forEach(p => txt(c, '+' + p.p, p.x, p.y - (0.6 - p.a) * 40, 22, '#ffe27a', 'center'));
      if (ci) { const k = 1 - ci.age / life; c.fillStyle = 'rgba(255,214,90,.25)'; c.beginPath(); c.arc(ci.x, ci.y, ci.r + 10, 0, 7); c.fill(); c.fillStyle = '#ffd45a'; c.beginPath(); c.arc(ci.x, ci.y, ci.r, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.arc(ci.x, ci.y, ci.r + 5, -Math.PI / 2, -Math.PI / 2 + 6.283 * k); c.stroke(); }
      hud(c, 'Circle ' + Math.min(n, N) + '/' + N + '  Hits ' + hits, 'Score ' + g.score);
    };
    return g;
  } });

// ============ Steady Hand ============
register({ id: 'steadyhand', cat: 'group', name: 'Steady Hand', icon: '🛡️', tag: 'Guide the ball along the twisty path.', goal: 'get from the start to the finish without touching the walls.', how: 'Put your finger or mouse on the start circle at the top and slide along the path to the finish. Touch the wall and you lose a life and go back to the start. You have 3 lives. On a keyboard hold the arrow keys.', par: 330,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Out of lives' }; const hw = LV(lv, 30, 22, 16), amp = LV(lv, 55, 75, 95), per = LV(lv, 90, 70, 55); let lives = 3, bx = 180, by = 62, track = false, best = 62, flash = 0, t = 0; const px = y => 180 + Math.sin((y - 60) / per) * amp * Math.min(1, (y - 60) / 80); let kx = 0, ky = 0;
    const hurt = () => { lives--; flash = 0.5; track = false; bx = 180; by = 62; best = Math.max(best, 62); sfx('bad'); if (lives <= 0) { g.over = true; g.score = Math.round((best - 62) * 0.55); } };
    const move = (x, y) => { if (!track) { if (Math.hypot(x - 180, y - 62) < 26) { track = true; } else return; } bx = x; by = y; if (Math.abs(bx - px(by)) > hw - 6 || by < 40) { if (by > 70 || Math.abs(bx - px(by)) > hw + 10) hurt(); return; } best = Math.max(best, by); if (by >= 440) { g.over = true; g.win = true; g.msg = 'Made it!'; g.score = Math.round((best - 62) * 0.55) + 120 + lives * 50 + Math.max(0, Math.round(60 - t)); sfx('win'); } };
    g.update = dt => { t += dt; flash -= dt; if (kx || ky) { track = true; move(bx + kx * 110 * dt, by + ky * 110 * dt); } };
    g.key = (k, d) => { if (k === 'ArrowLeft') kx = d ? -1 : (kx === -1 ? 0 : kx); if (k === 'ArrowRight') kx = d ? 1 : (kx === 1 ? 0 : kx); if (k === 'ArrowUp') ky = d ? -1 : (ky === -1 ? 0 : ky); if (k === 'ArrowDown') ky = d ? 1 : (ky === 1 ? 0 : ky); };
    g.ptr = (t2, x, y) => { if (t2 === 'up') { if (track && by < 440) { track = false; bx = 180; by = 62; } return; } move(x, y); };
    g.draw = c => {
      c.fillStyle = flash > 0 ? '#3a1414' : '#14262e'; c.fillRect(0, 0, W, H); c.strokeStyle = '#3a7a8a'; c.lineWidth = hw * 2; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); for (let y = 60; y <= 452; y += 4) c.lineTo(px(y), y); c.stroke(); c.strokeStyle = '#143038'; c.lineWidth = hw * 2 - 6; c.beginPath(); for (let y = 60; y <= 452; y += 4) c.lineTo(px(y), y); c.stroke();
      c.fillStyle = '#35b56a'; c.beginPath(); c.arc(180, 62, 18, 0, 7); c.fill(); txt(c, 'GO', 180, 63, 12, '#fff', 'center'); emo(c, '🏁', px(446), 446, 28);
      c.fillStyle = track ? '#ffd45a' : '#fff'; c.beginPath(); c.arc(bx, by, 9, 0, 7); c.fill(); hud(c, '❤'.repeat(lives), 'Progress ' + Math.round(clamp((best - 62) / 380, 0, 1) * 100) + '%'); if (!track) txt(c, 'Touch the green circle to start', W / 2, 462, 13, '#9ad', 'center');
    };
    return g;
  } });

// ============ Quick Count ============
register({ id: 'quickcount', cat: 'group', name: 'Quick Count', icon: '🔢', tag: 'Count the flashes before they vanish.', goal: 'count the target emoji correctly in 10 quick rounds.', how: 'Some emoji flash on screen for a moment. Count only the one you are asked about, then tap the right number (or press 1 to 4). Later rounds flash more emoji for less time.', par: 230,
  make(lv) {
    const g = { score: 0, over: false, msg: 'Done!' }; const ICONS = ['🍎', '⭐', '🐟', '🎈', '🍋', '🚗']; let q = 0, ph = 'show', t = 0, items = [], target = 0, ans = 0, opts = [], fb = 0, ok = false, sh = -1;
    const mk = () => { q++; const total = Math.floor(R(LV(lv, 4, 6, 8), LV(lv, 8, 11, 15)) + q * 0.4); target = ICONS[Math.floor(R(0, ICONS.length))]; const kinds = shuf(ICONS.filter(i => i !== target)).slice(0, LV(lv, 1, 2, 3)); ans = Math.max(1, Math.floor(total * R(0.3, 0.55))); items = []; for (let i = 0; i < total; i++) { let p, tries = 0; do { p = [R(30, 330), R(80, 390)]; tries++; } while (tries < 30 && items.some(o => Math.hypot(o.x - p[0], o.y - p[1]) < 36)); items.push({ x: p[0], y: p[1], e: i < ans ? target : kinds[i % kinds.length] }); } items = shuf(items); ph = 'show'; t = LV(lv, 2.2, 1.7, 1.3) + 0.1 * Math.min(q, 5); const s = new Set([ans]); while (s.size < 4) { const v = ans + Math.floor(R(-3, 4)); if (v > 0) s.add(v); } opts = shuf([...s]); sh = -1; };
    mk();
    const bx = i => ({ x: 12 + i * 85, y: 410, w: 78, h: 58 });
    const pick = i => { if (ph !== 'ask') return; sh = i; ok = opts[i] === ans; g.score += ok ? 25 : 0; sfx(ok ? 'coin' : 'bad'); ph = 'fb'; fb = 0.9; };
    g.update = dt => { if (ph === 'show') { t -= dt; if (t <= 0) ph = 'ask'; } else if (ph === 'fb') { fb -= dt; if (fb <= 0) { if (q >= 10) { g.over = true; g.win = true; } else mk(); } } };
    g.key = (k, d) => { if (d && /^[1-4]$/.test(k)) pick(+k - 1); };
    g.ptr = (tp, x, y) => { if (tp === 'down') for (let i = 0; i < 4; i++) if (inb(x, y, bx(i))) pick(i); };
    g.draw = c => {
      c.fillStyle = '#243a2a'; c.fillRect(0, 0, W, H); if (ph === 'show') { items.forEach(o => emo(c, o.e, o.x, o.y, 30)); txt(c, 'Count ' + target, W / 2, 46, 18, '#ffe27a', 'center'); c.fillStyle = '#ffd45a'; c.fillRect(0, 474, W * clamp(t / 2.5, 0, 1), 6); }
      else { emo(c, target, W / 2, 190, 90); txt(c, 'How many ' + target + ' were there?', W / 2, 270, 18, '#fff', 'center'); if (ph === 'fb') txt(c, ok ? 'Correct!' : 'It was ' + ans, W / 2, 330, 26, ok ? '#7aff9a' : '#ff8a8a', 'center'); opts.forEach((o, i) => { const b = bx(i); rr(c, b.x, b.y, b.w, b.h, 12, ph === 'fb' ? (o === ans ? '#2f9a55' : i === sh ? '#c4403a' : '#3a4a58') : '#3b5a7a'); txt(c, o, b.x + b.w / 2, b.y + b.h / 2 + 2, 28, '#fff', 'center'); }); }
      hud(c, 'Round ' + q + '/10', 'Score ' + g.score);
    };
    return g;
  } });

// ============ Bubble Pop ============
register({ id: 'bubbles', cat: 'arcade', name: 'Bubble Pop', icon: '🫧', tag: 'Aim, shoot and match three or more bubbles.', goal: 'pop as many bubbles as you can before they reach the bottom.', how: 'Move the mouse or your finger to aim, then click or lift to shoot. Match three or more of the same colour to pop them. Bubbles left hanging fall too. Every few shots a new row drops down. Arrow keys aim and Space shoots.', par: 420,
  make(lv) {
    const g = { score: 0, over: false, msg: 'They got you!' }; const K = LV(lv, 4, 5, 5), every = LV(lv, 9, 7, 5), RW = 35; let rows = [], shots = 0, ang = -Math.PI / 2, cur = Math.floor(R(0, K)), nxt = Math.floor(R(0, K)), b = null, pops = [];
    const mkRow = off => ({ off, c: Array.from({ length: off ? 8 : 9 }, () => Math.floor(R(0, K))) });
    for (let i = 0; i < LV(lv, 4, 5, 6); i++) rows.push(mkRow(i % 2));
    const xOf = (row, c) => (row.off ? 40 : 20) + c * 40, yOf = r => 40 + r * RW;
    const nbrs = (r, c) => { const o = rows[r].off, out = [[r, c - 1], [r, c + 1]]; const up = o ? [c, c + 1] : [c - 1, c]; up.forEach(cc => out.push([r - 1, cc])); up.forEach(cc => out.push([r + 1, cc])); return out.filter(([rr2, cc]) => rows[rr2] && cc >= 0 && cc < rows[rr2].c.length); };
    const at = (r, c) => (rows[r] ? rows[r].c[c] : null);
    const popMatch = (r, c) => { const col = at(r, c), seen = new Set([r + ',' + c]), st = [[r, c]]; while (st.length) { const [a, bq] = st.pop(); nbrs(a, bq).forEach(([x, y]) => { if (at(x, y) === col && !seen.has(x + ',' + y)) { seen.add(x + ',' + y); st.push([x, y]); } }); }
      if (seen.size >= 3) { seen.forEach(k => { const [x, y] = k.split(',').map(Number); pops.push({ x: xOf(rows[x], y), y: yOf(x), col, a: 0.4 }); rows[x].c[y] = null; }); g.score += seen.size * 10; sfx('pop');
        const anch = new Set(), st2 = []; rows[0] && rows[0].c.forEach((v, i) => { if (v != null) { anch.add('0,' + i); st2.push([0, i]); } }); while (st2.length) { const [a, bq] = st2.pop(); nbrs(a, bq).forEach(([x, y]) => { if (at(x, y) != null && !anch.has(x + ',' + y)) { anch.add(x + ',' + y); st2.push([x, y]); } }); }
        let fell = 0; rows.forEach((row, x) => row.c.forEach((v, y) => { if (v != null && !anch.has(x + ',' + y)) { pops.push({ x: xOf(row, y), y: yOf(x), col: v, a: 0.5 }); row.c[y] = null; fell++; } })); g.score += fell * 20; if (fell) sfx('good'); } };
    const land = () => {
      const last = rows[rows.length - 1]; rows.push({ off: last.off ? 0 : 1, c: Array(last.off ? 9 : 8).fill(null) });
      let best = null, bd = 1e9;
      for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].c.length; c++) { if (rows[r].c[c] != null) continue; const d = Math.hypot(xOf(rows[r], c) - b.x, yOf(r) - b.y); if (d < bd && (r === 0 || nbrs(r, c).some(([a, q]) => at(a, q) != null))) { bd = d; best = [r, c]; } }
      const trim = () => { while (rows.length && !rows[rows.length - 1].c.some(v => v != null)) rows.pop(); };
      if (!best) { b = null; trim(); return; }
      const [r, c] = best; rows[r].c[c] = b.col; b = null; popMatch(r, c); trim();
      if (!rows.length) { g.win = true; g.over = true; g.msg = 'Board cleared!'; g.score += 200; return; }
      shots++; if (shots % every === 0) rows.unshift(mkRow(rows[0].off ? 0 : 1));
      if (rows.some((row, i) => yOf(i) > 392 && row.c.some(v => v != null))) g.over = true;
    };
    const shoot = () => { if (b || g.over) return; b = { x: 180, y: 440, vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620, col: cur }; cur = nxt; nxt = Math.floor(R(0, K)); sfx('tap'); };
    g.update = dt => { pops = pops.filter(p => (p.a -= dt) > 0); if (!b) return; const steps = 3; for (let s = 0; s < steps && b; s++) { b.x += b.vx * dt / steps; b.y += b.vy * dt / steps; if (b.x < 20) { b.x = 20; b.vx = Math.abs(b.vx); } if (b.x > 340) { b.x = 340; b.vx = -Math.abs(b.vx); } let hit = b.y <= 40; if (!hit) rows.forEach((row, r) => row.c.forEach((v, c) => { if (v != null && Math.hypot(xOf(row, c) - b.x, yOf(r) - b.y) < 36) hit = true; })); if (hit) { land(); } } };
    const aimAt = (x, y) => { ang = clamp(Math.atan2(y - 440, x - 180), -Math.PI + 0.15, -0.15); };
    g.key = (k, d) => { if (!d) return; if (k === 'ArrowLeft') ang = clamp(ang - 0.09, -Math.PI + 0.15, -0.15); if (k === 'ArrowRight') ang = clamp(ang + 0.09, -Math.PI + 0.15, -0.15); if (k === ' ' || k === 'ArrowUp') shoot(); };
    g.ptr = (t, x, y) => { if (t === 'down' || t === 'move') aimAt(x, y); if (t === 'up') shoot(); };
    g.draw = c => {
      c.fillStyle = '#16264a'; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(255,90,90,.25)'; c.fillRect(0, 394, W, 2);
      const bub = (x, y, col, r) => { c.fillStyle = COL[col]; c.beginPath(); c.arc(x, y, r || 18, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(x - 5, y - 6, 5, 0, 7); c.fill(); };
      rows.forEach((row, r) => row.c.forEach((v, cc) => { if (v != null) bub(xOf(row, cc), yOf(r), v); })); pops.forEach(p => { c.globalAlpha = p.a * 2; bub(p.x, p.y - (0.5 - p.a) * 60, p.col, 18 * (1 + (0.4 - Math.min(0.4, p.a)))); c.globalAlpha = 1; });
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.setLineDash([5, 7]); c.lineWidth = 2; c.beginPath(); c.moveTo(180, 440); c.lineTo(180 + Math.cos(ang) * 120, 440 + Math.sin(ang) * 120); c.stroke(); c.setLineDash([]);
      if (b) bub(b.x, b.y, b.col); else bub(180, 440, cur); bub(60, 452, nxt, 12); txt(c, 'Next', 60, 474, 11, '#9ab', 'center'); hud(c, 'Shots ' + shots, 'Score ' + g.score);
    };
    return g;
  } });
})();
