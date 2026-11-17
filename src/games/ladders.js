/* ---------- Ladders & Slides ---------- */
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
    io.render(); await io.sleep(650);
    if (to !== land) {
      L.pos[i] = to;
      L.note = to > land ? `Climbed a ladder` : `Slid down a slide`;
      io.ev(p, to > land ? `climbs a ladder to ${to}` : `slides down to ${to}`, to > land ? `climb a ladder to ${to}` : `slide down to ${to}`);
      io.render(); await io.sleep(650);
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

const DIE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
let S0 = null;
const ui = {
  mount(stage, ctl, S) {
    let cells = '';
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) { const base = (9 - r) * 10, n = (9 - r) % 2 === 0 ? base + c + 1 : base + 10 - c; cells += `<div class="ld-c${(r + c) % 2 ? ' alt' : ''}" data-n="${n}"><i>${n}</i><span class="ld-toks" data-n="${n}"></span></div>`; }
    const lines = Object.entries(LADDERS).map(([a, b]) => { const [x1, y1] = cellXY(+a), [x2, y2] = cellXY(b); return `<line class="lad" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; })
      .concat(Object.entries(SLIDES).map(([a, b]) => { const [x1, y1] = cellXY(+a), [x2, y2] = cellXY(b); return `<line class="sld" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; })).join('');
    stage.innerHTML = `<section class="table ldwrap"><div class="bt-opps" id="ldSeats"></div>
      <div class="ld"><div class="ld-grid">${cells}</div><svg class="ld-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg></div>
      <div class="ld-die" id="ldDie" aria-live="polite"></div><div class="banner" id="ldBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="ldAct" hidden><button type="button" class="b gold" id="ldRoll">Roll the die</button><p class="hint bt-hint">Green lines are ladders (go up). Red lines are slides (go down).</p></div>`;
    $('ldRoll').onclick = () => S0.send({ t: 'roll' });
  },
  update(S) {
    S0 = S;
    const V = S.V, g = V.g;
    $('ldSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Rolling…', extra: i => (g.pos[i] ? 'Square ' + g.pos[i] : 'At the start') });
    document.querySelectorAll('#ld .ld-toks').forEach(el => { el.innerHTML = ''; });
    g.pos.forEach((p, i) => { if (p > 0) { const el = document.querySelector(`#ld .ld-toks[data-n="${p}"]`); if (el) el.insertAdjacentHTML('beforeend', `<b class="tok p${i}" title="${esc(S.nameOf(i))}"></b>`); } });
    $('ldDie').textContent = g.die ? `${DIE[g.die]}  ${g.note || ''}` : '';
    $('ldBanner').innerHTML = g.over && V.summary.length ? `<span>${g.winner >= 0 ? S.text(V.summary.find(e => e.p === g.winner) || V.summary[0]) : 'Nobody reached 100. Everyone keeps their chips.'}</span>` : '';
    $('ldAct').hidden = !S.turn;
    return '';
  },
};

Club.register({
  id: 'ladders', cat: 'board', name: 'Ladders & Slides', tag: 'Race to square 100. Climb ladders, dodge slides.', min: 2, max: 4, soloBots: 2, roundWord: 'Game',
  art: () => ['p0', 'p1', 'p2'].map(c => `<div class="disc ${c}"></div>`).join(''),
  rules: `<p><b>Goal:</b> be the first to land exactly on square 100.</p>
    <ol><li>Everyone starts off the board. Players take turns; your token colour is shown beside your name.</li>
    <li>On your turn, press <b>Roll the die</b>. Your token moves that many squares.</li>
    <li>If you land at the bottom of a <b>ladder</b> (green line), climb to the top. If you land at the top of a <b>slide</b> (red line), slide down to the bottom.</li>
    <li>Roll a six and you roll again.</li>
    <li>You need the exact number to finish. If your roll would take you past 100, you stay where you are.</li>
    <li>Each player puts in ${ANTE} chips and the first to 100 takes the pot.</li></ol>`,
  round, view, ui,
  _test: { step, LADDERS, SLIDES },
});
})();
