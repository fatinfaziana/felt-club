/* ---------- Snakes and Ladders ---------- */
(function () {
const ANTE = 20;
const LADDERS = { 4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91 };
const SLIDES = { 17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78 };
const JUMP = Object.assign({}, LADDERS, SLIDES);
const cellXY = n => { const k = n - 1, r = Math.floor(k / 10), c = r % 2 === 0 ? k % 10 : 9 - (k % 10); return [c * 10 + 5, (9 - r) * 10 + 5]; };

function step(pos, roll) {
  let to = pos + roll; if (to > 100) return { to: pos, land: pos };
  const land = to; if (JUMP[to]) to = JUMP[to];
  return { to, land };
}
async function round(G, io) {
  const P = G.players, n = P.length;
  const L = G.l = { pos: P.map(() => 0), turn: (G.round - 1) % n, die: 0, note: '', over: false, winner: -1, moves: 0 };
  io.render();
  await io.sleep(500);
  while (!L.over) {
    const i = L.turn, p = P[i];
    L.note = ''; io.render();
    await io.turn(p, {}, { auto: { t: 'roll' }, validate: x => (x && x.t === 'roll' ? { t: 'roll' } : null), bot: () => ({ t: 'roll' }), think: 800 + Math.random() * 500 });
    const d = 1 + rnd(6); L.die = d; L.moves++;
    const { to, land } = step(L.pos[i], d);
    L.pos[i] = land; io.ev(p, `rolls a ${d}`, `roll a ${d}`);
    io.render(); await io.sleep(900);
    if (to !== land) {
      L.pos[i] = to;
      L.note = to > land ? `Climbed a ladder` : `Slid down a slide`;
      io.ev(p, to > land ? `climbs a ladder to ${to}` : `slides down to ${to}`, to > land ? `climb a ladder to ${to}` : `slide down to ${to}`);
      io.render(); await io.sleep(1500);
    }
    if (L.pos[i] === 100) { L.over = true; L.winner = i; }
    else if (L.moves >= 400) L.over = true;
    else if (d !== 6) L.turn = (i + 1) % n;
    else io.ev(p, 'rolled a six and goes again', 'rolled a six and go again');
    io.render();
  }
  settlePot(G, ANTE, L.winner >= 0 ? [L.winner] : []);
  potSummary(G);
  io.render();
}
function view(G) {
  const L = G.l;
  if (!L || L.pos.length !== G.players.length) return { pos: G.players.map(() => 0), turn: -1, die: 0, note: '', over: false, winner: -1, delta: [] };
  return { pos: L.pos, turn: L.over ? -1 : L.turn, die: L.die, note: L.note, over: L.over, winner: L.winner, delta: G.players.map(p => (L.over ? p.delta || 0 : 0)) };
}

const TOKC = ['#f2b441', '#f7f0e1', '#5cc8b0', '#e8708a'];
const CELLC = ['#f6d6a8', '#bfe3c0', '#f3b6b0', '#b8d4f0', '#f5e6a0'];
const SNK = [['#2e9b4a', '#b6f08a'], ['#d6772b', '#ffd9a0'], ['#7a3fb8', '#e0c0ff'], ['#c4372e', '#ffc0b8'], ['#2b7fd6', '#b8dcff'], ['#b8a21f', '#fff3a0'], ['#1f8a8a', '#a8f0f0'], ['#8a2a5a', '#ffc0e0']];
const PIPS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
const snakePts = (a, b, k) => {
  const [x0, y0] = cellXY(a), [x1, y1] = cellXY(b), dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, N = 30, pts = [];
  const waves = Math.max(2, Math.round(L / 16)), amp = 3.4 + (k % 3) * 0.5;
  for (let i = 0; i <= N; i++) { const t = i / N, off = Math.sin(t * Math.PI * waves + k) * amp * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.5); pts.push([x0 + dx * t + nx * off, y0 + dy * t + ny * off]); }
  return pts;
};
const f1 = v => v.toFixed(2);
function snakeSVG(pts, k, a) {
  const [c1, c2] = SNK[k % SNK.length], N = pts.length - 1; let s = '';
  for (let i = N - 1; i >= 0; i--) { const w = 0.9 + 2.9 * Math.pow(1 - i / N, 0.8); s += `<path d="M${f1(pts[i][0])},${f1(pts[i][1])} L${f1(pts[i + 1][0])},${f1(pts[i + 1][1])}" stroke="#000" stroke-opacity=".28" stroke-width="${f1(w + 0.5)}" stroke-linecap="round" transform="translate(.5 .7)"/>`; }
  for (let i = N - 1; i >= 0; i--) { const w = 0.9 + 2.9 * Math.pow(1 - i / N, 0.8); s += `<path d="M${f1(pts[i][0])},${f1(pts[i][1])} L${f1(pts[i + 1][0])},${f1(pts[i + 1][1])}" stroke="${c1}" stroke-width="${f1(w)}" stroke-linecap="round"/>`; }
  for (let i = 3; i < N; i += 3) { const w = 0.9 + 2.9 * Math.pow(1 - i / N, 0.8); s += `<circle cx="${f1(pts[i][0])}" cy="${f1(pts[i][1])}" r="${f1(w * 0.28)}" fill="${c2}" opacity=".85"/>`; }
  const [hx, hy] = pts[0], [px, py] = pts[1], d = Math.atan2(hy - py, hx - px), cs = Math.cos(d), sn = Math.sin(d), ex = -sn, ey = cs;
  const tx = hx + cs * 2.6, ty = hy + sn * 2.6;
  s += `<path d="M${f1(hx + cs * 2)},${f1(hy + sn * 2)} L${f1(tx + cs * 1.6)},${f1(ty + sn * 1.6)} M${f1(tx + cs * 1.6)},${f1(ty + sn * 1.6)} l${f1(cs * 1 + ex * 0.8)},${f1(sn * 1 + ey * 0.8)} M${f1(tx + cs * 1.6)},${f1(ty + sn * 1.6)} l${f1(cs * 1 - ex * 0.8)},${f1(sn * 1 - ey * 0.8)}" stroke="#e0302a" stroke-width=".35" fill="none" stroke-linecap="round"/>`;
  s += `<ellipse cx="${f1(hx)}" cy="${f1(hy)}" rx="3" ry="2.5" transform="rotate(${f1(d * 180 / Math.PI)} ${f1(hx)} ${f1(hy)})" fill="${c1}" stroke="#000" stroke-opacity=".35" stroke-width=".25"/>`;
  for (const sg of [1, -1]) { const ox = hx + cs * 0.9 + ex * 1.2 * sg, oy = hy + sn * 0.9 + ey * 1.2 * sg; s += `<circle cx="${f1(ox)}" cy="${f1(oy)}" r=".85" fill="#fff"/><circle cx="${f1(ox + cs * 0.25)}" cy="${f1(oy + sn * 0.25)}" r=".42" fill="#111"/>`; }
  return `<g class="snk" id="sn${a}">${s}</g>`;
}
function ladderSVG(a, b) {
  const [x0, y0] = cellXY(a), [x1, y1] = cellXY(b), dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy * 1.5, ny = ux * 1.5;
  const lx0 = x0 + ux * 2, ly0 = y0 + uy * 2, lx1 = x1 - ux * 2, ly1 = y1 - uy * 2, len = L - 4, rungs = Math.max(3, Math.floor(len / 3.4));
  let s = `<g transform="translate(.6 .8)" stroke="#000" stroke-opacity=".28" stroke-linecap="round"><line x1="${f1(lx0 + nx)}" y1="${f1(ly0 + ny)}" x2="${f1(lx1 + nx)}" y2="${f1(ly1 + ny)}" stroke-width="1.3"/><line x1="${f1(lx0 - nx)}" y1="${f1(ly0 - ny)}" x2="${f1(lx1 - nx)}" y2="${f1(ly1 - ny)}" stroke-width="1.3"/></g>`;
  for (let i = 0; i <= rungs; i++) { const t = i / rungs, cx = lx0 + (lx1 - lx0) * t, cy = ly0 + (ly1 - ly0) * t; s += `<line x1="${f1(cx + nx)}" y1="${f1(cy + ny)}" x2="${f1(cx - nx)}" y2="${f1(cy - ny)}" stroke="#6b4220" stroke-width="1.05" stroke-linecap="round"/><line x1="${f1(cx + nx)}" y1="${f1(cy + ny)}" x2="${f1(cx - nx)}" y2="${f1(cy - ny)}" stroke="#e0aa62" stroke-width=".6" stroke-linecap="round"/>`; }
  for (const sg of [1, -1]) s += `<line x1="${f1(lx0 + nx * sg)}" y1="${f1(ly0 + ny * sg)}" x2="${f1(lx1 + nx * sg)}" y2="${f1(ly1 + ny * sg)}" stroke="#6b4220" stroke-width="1.35" stroke-linecap="round"/><line x1="${f1(lx0 + nx * sg)}" y1="${f1(ly0 + ny * sg)}" x2="${f1(lx1 + nx * sg)}" y2="${f1(ly1 + ny * sg)}" stroke="#c98a45" stroke-width=".85" stroke-linecap="round"/>`;
  return `<g class="lad" id="ld${a}">${s}</g>`;
}
const tween = (ms, fn) => new Promise(res => { const t0 = performance.now(); const f = t => { const k = Math.min(1, (t - t0) / ms); fn(k); if (k < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
const SNAKE_PTS = {}; Object.keys(SLIDES).forEach((a, k) => { SNAKE_PTS[a] = snakePts(+a, SLIDES[a], k); });
let S0 = null, TK = [], dieKey = '';
const SPOT = [5, 104.5];
const spotOf = (n, i) => { const [x, y] = n > 0 ? cellXY(n) : SPOT; return [x + (i % 2 - 0.5) * 3.2 + (n > 0 ? 0 : i * 2.5), y + (i > 1 ? 1.6 : -0.2) + 1.8]; };
function place(t, x, y, lift, rot, sc) { t.x = x; t.y = y; t.el.setAttribute('transform', `translate(${f1(x)} ${f1(y - (lift || 0))}) rotate(${f1(rot || 0)}) scale(${f1(sc || 1)})`); }
function fx(text, x, y, col) { const g = $('ldFx'); if (!g) return; const t = document.createElementNS('http://www.w3.org/2000/svg', 'text'); t.setAttribute('x', f1(x)); t.setAttribute('y', f1(y)); t.setAttribute('class', 'fxt'); t.setAttribute('fill', col || '#fff'); t.textContent = text; g.appendChild(t); setTimeout(() => t.remove(), 1500); }
function sparkle(x, y, col) { const g = $('ldFx'); if (!g) return; for (let k = 0; k < 6; k++) { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', f1(x + (Math.random() - 0.5) * 6)); c.setAttribute('cy', f1(y + (Math.random() - 0.5) * 6)); c.setAttribute('r', '0.9'); c.setAttribute('fill', col); c.setAttribute('class', 'spk'); g.appendChild(c); setTimeout(() => c.remove(), 1000); } }
async function moveAnim(i, prev, to) {
  const t = TK[i]; if (!t || !t.el.isConnected) return;
  if (to === 0 || to < prev) { const [x, y] = spotOf(to, i); place(t, x, y); return; }
  if (prev > 0 && JUMP[prev] === to) {
    const up = to > prev, [x0, y0] = spotOf(prev, i), [x1, y1] = spotOf(to, i), el = document.getElementById((up ? 'ld' : 'sn') + prev);
    if (el) { el.classList.add(up ? 'glow' : 'hiss'); setTimeout(() => el.classList.remove('glow', 'hiss'), 1700); }
    Snd.p(up ? 'good' : 'bad'); fx(up ? 'Climb! ▲' : 'Ssss… ▼', x0, y0 - 5, up ? '#9af0a0' : '#ff9a90');
    if (up) { await tween(1100, k => { const e = k * k * (3 - 2 * k); place(t, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, Math.abs(Math.sin(k * Math.PI * 7)) * 1.1, Math.sin(k * 40) * 4, 1.08); if (Math.random() < 0.12) sparkle(t.x, t.y, '#ffe27a'); }); sparkle(x1, y1, '#ffe27a'); }
    else { const pts = SNAKE_PTS[prev]; await tween(1050, k => { const e = k * k; const idx = Math.min(pts.length - 1, e * (pts.length - 1)), i0 = Math.floor(idx), a = idx - i0, p0 = pts[i0], p1 = pts[Math.min(pts.length - 1, i0 + 1)]; place(t, p0[0] + (p1[0] - p0[0]) * a + (spotOf(to, i)[0] - cellXY(to)[0]) * k, p0[1] + (p1[1] - p0[1]) * a + 1.8 * k, 0, k * 540, 1 - 0.25 * Math.sin(k * Math.PI)); }); place(t, x1, y1); }
    place(t, x1, y1); fx((up ? '+' : '−') + Math.abs(to - prev), x1, y1 - 5, up ? '#9af0a0' : '#ff9a90'); return;
  }
  for (let sq = prev + 1; sq <= to; sq++) { const [ax, ay] = prev === 0 && sq === 1 ? spotOf(0, i) : spotOf(sq - 1, i), [bx, by] = spotOf(sq, i); Snd.p('pop'); await tween(110, k => place(t, ax + (bx - ax) * k, ay + (by - ay) * k, Math.sin(Math.PI * k) * 2.4, 0, 1)); }
  if (to === 100) { sparkle(t.x, t.y, '#ffe27a'); fx('🏆 Home!', t.x, t.y - 5, '#ffe27a'); }
}
const ui = {
  mount(stage, ctl, S) {
    TK = []; dieKey = '';
    let cells = '';
    for (let n = 1; n <= 100; n++) { const [x, y] = cellXY(n), r = Math.floor((n - 1) / 10), c = (n - 1) % 10;
      cells += `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="${n === 100 ? '#f2c94c' : CELLC[(r * 2 + c) % 5]}" stroke="rgba(0,0,0,.22)" stroke-width=".25"/><text x="${x - 4.2}" y="${y - 3}" font-size="2.7" font-weight="700" fill="rgba(40,25,10,.6)">${n}</text>`; }
    const snakes = Object.keys(SLIDES).map((a, k) => snakeSVG(SNAKE_PTS[a], k, a)).join(''), ladders = Object.entries(LADDERS).map(([a, b]) => ladderSVG(+a, b)).join('');
    const toks = S.V.seats.map((_, i) => `<g class="tk" id="tk${i}"><ellipse cx="0" cy="0" rx="2.1" ry=".8" fill="rgba(0,0,0,.35)"/><path d="M-2.1,0 Q-2.1,-2.2 -.8,-3.4 L.8,-3.4 Q2.1,-2.2 2.1,0 Z" fill="${TOKC[i % 4]}" stroke="rgba(0,0,0,.55)" stroke-width=".3"/><circle cx="0" cy="-4.6" r="1.7" fill="${TOKC[i % 4]}" stroke="rgba(0,0,0,.55)" stroke-width=".3"/><circle cx="-.6" cy="-5.2" r=".5" fill="rgba(255,255,255,.7)"/></g>`).join('');
    stage.innerHTML = `<section class="table ldwrap"><div class="bt-opps" id="ldSeats"></div>
      <div class="ldb"><svg class="ldsvg" viewBox="-1 -1 102 111" role="img" aria-label="Snakes and ladders board"><rect x="-1" y="-1" width="102" height="111" rx="3" fill="#6b4220"/>${cells}<rect x="0" y="100" width="100" height="9" fill="#2c6b50"/><text x="12" y="106.2" font-size="3" font-weight="700" fill="#cfe9d8">◀ START: tokens wait here</text><text x="95" y="3" text-anchor="end" font-size="2.2" fill="#7a5a10" font-weight="700"></text>${ladders}${snakes}<g id="ldToks">${toks}</g><g id="ldFx"></g></svg></div>
      <div class="ld-die" id="ldDie" aria-live="polite"></div><div class="banner" id="ldBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="ldAct" hidden><button type="button" class="b gold" id="ldRoll">Roll the die</button><p class="hint bt-hint">Ladders lift you up. Snakes slide you down. Roll a six to go again.</p></div>`;
    $('ldRoll').onclick = () => S0.send({ t: 'roll' });
  },
  update(S) {
    S0 = S;
    const V = S.V, g = V.g;
    $('ldSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Rolling…', extra: i => (g.pos[i] ? 'Square ' + g.pos[i] : 'At the start') });
    g.pos.forEach((p, i) => {
      if (!TK[i]) { const el = document.getElementById('tk' + i); if (!el) return; TK[i] = { el, want: p, chain: Promise.resolve(), x: 0, y: 0 }; const [x, y] = spotOf(p, i); place(TK[i], x, y); }
      else if (TK[i].want !== p) { const prev = TK[i].want; TK[i].want = p; TK[i].chain = TK[i].chain.then(() => moveAnim(i, prev, p)); }
    });
    const key = g.die + '|' + g.turn + '|' + g.pos.join(',');
    if (g.die && key !== dieKey) { const first = dieKey === ''; dieKey = key; if (!first) Snd.p('dice'); const roll = !first;
      $('ldDie').innerHTML = `<span class="dieface${roll ? ' roll' : ''}">${Array.from({ length: 9 }, (_, k) => `<i${PIPS[g.die].includes(k) ? ' class="on"' : ''}></i>`).join('')}</span><span class="ldnote">${esc(g.note || '')}</span>`; }
    else if (!g.die) $('ldDie').innerHTML = '';
    $('ldBanner').innerHTML = g.over && V.summary.length ? `<span>${g.winner >= 0 ? S.text(V.summary.find(e => e.p === g.winner) || V.summary[0]) : 'Nobody reached 100. Everyone keeps their chips.'}</span>` : '';
    $('ldAct').hidden = !S.turn;
    return '';
  },
};

Club.register({
  id: 'ladders', cat: 'board', name: 'Snakes and Ladders', tag: 'Race to square 100. Climb ladders, dodge snakes.', min: 2, max: 4, soloBots: 2, roundWord: 'Game',
  art: () => ['p0', 'p1', 'p2'].map(c => `<div class="disc ${c}"></div>`).join(''),
  rules: `<p><b>Goal:</b> be the first to land exactly on square 100.</p>
    <ol><li>Everyone starts off the board. Players take turns; your token colour is shown beside your name.</li>
    <li>On your turn, press <b>Roll the die</b>. Your token moves that many squares.</li>
    <li>If you land at the bottom of a <b>ladder</b>, climb to the top. If you land on a <b>snake's head</b>, slide down to its tail.</li>
    <li>Roll a six and you roll again.</li>
    <li>You need the exact number to finish. If your roll would take you past 100, you stay where you are.</li>
    <li>Each player puts in ${ANTE} chips and the first to 100 takes the pot.</li></ol>`,
  round, view, ui,
  _test: { step, LADDERS, SLIDES },
});
})();
