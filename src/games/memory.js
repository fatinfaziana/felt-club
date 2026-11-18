/* ---------- Memory Match ---------- */
(function () {
const ANTE = 20, SYMS = ['🍎', '🍋', '🍇', '🍒', '⭐', '🌙', '🔥', '🍀'];
async function round(G, io) {
  const P = G.players, n = P.length;
  const M = G.m = { cards: shuffle([...SYMS, ...SYMS]), st: Array(16).fill(0), turn: (G.round - 1) % n, score: P.map(() => 0), over: false, known: {}, pick: [] };
  const down = () => M.st.map((s, i) => (s === 0 ? i : -1)).filter(i => i >= 0);
  const botPick = (first) => {
    const d = down(), mem = Object.entries(M.known).filter(([i]) => M.st[i] === 0 && Math.random() > 0.15).map(([i, s]) => [+i, s]);
    if (first) {
      for (const [i, s] of mem) if (mem.some(([j, t]) => j !== i && t === s)) return i;
      const unk = d.filter(i => !(i in M.known)); return (unk.length ? unk : d)[rnd((unk.length ? unk : d).length)];
    }
    const f = M.pick[0], fs = M.cards[f], hit = mem.find(([j, t]) => j !== f && t === fs);
    if (hit) return hit[0];
    const unk = d.filter(i => i !== f && !(i in M.known)); const pool = unk.length ? unk : d.filter(i => i !== f);
    return pool[rnd(pool.length)];
  };
  io.render(); await io.sleep(500);
  while (!M.over) {
    const i = M.turn, p = P[i]; M.pick = [];
    for (let k = 0; k < 2; k++) {
      io.render();
      const a = await io.turn(p, { kind: k ? 'second' : 'first' }, { auto: { t: 'flip', i: down().filter(x => !M.pick.includes(x))[0] },
        validate: x => (x && x.t === 'flip' && Number.isInteger(x.i) && x.i >= 0 && x.i < 16 && M.st[x.i] === 0 && !M.pick.includes(x.i) ? { t: 'flip', i: x.i } : null),
        bot: () => ({ t: 'flip', i: botPick(!k) }), think: 800 + Math.random() * 400 });
      M.pick.push(a.i); M.known[a.i] = M.cards[a.i]; M.st[a.i] = 1;
    }
    io.render(); await io.sleep(1300);
    const [x, y] = M.pick;
    if (M.cards[x] === M.cards[y]) {
      M.st[x] = M.st[y] = 2; M.score[i]++; io.ev(p, `finds a pair of ${M.cards[x]}`, `find a pair of ${M.cards[x]}`);
      if (M.st.every(s => s === 2)) M.over = true;
    } else { M.st[x] = M.st[y] = 0; M.turn = (i + 1) % n; io.ev(p, 'does not find a match', 'do not find a match'); }
    M.pick = []; io.render();
  }
  const top = Math.max(...M.score), winners = M.score.map((s, i) => (s === top ? i : -1)).filter(i => i >= 0);
  settlePot(G, ANTE, winners); potSummary(G);
  io.line(`Final pairs: ${P.map((p, i) => `${p.human ? 'player ' + (i + 1) : p.name} ${M.score[i]}`).join(', ')}`, true);
  io.render();
}
function view(G) {
  const M = G.m;
  if (!M || M.score.length !== G.players.length) return { cards: Array(16).fill(null), st: Array(16).fill(0), turn: -1, score: G.players.map(() => 0), over: false, delta: [] };
  return { cards: M.cards.map((c, i) => (M.st[i] ? c : null)), st: M.st, turn: M.over ? -1 : M.turn, score: M.score, over: M.over, delta: G.players.map(p => (M.over ? p.delta || 0 : 0)) };
}
let S0 = null;
const ui = {
  mount(stage) {
    stage.innerHTML = `<section class="table c4wrap"><div class="bt-opps" id="mmSeats"></div><div class="mm" id="mm">${Array.from({ length: 16 }, (_, i) => `<button type="button" class="mm-c" data-i="${i}" aria-label="Card ${i + 1}"></button>`).join('')}</div><div class="banner" id="mmBanner" aria-live="polite"></div><p class="hint bt-hint" id="mmHint"></p></section>`;
    $('mm').onclick = e => { const b = e.target.closest('[data-i]'); if (b && S0 && S0.turn) S0.send({ t: 'flip', i: +b.dataset.i }); };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    $('mmSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, doing: 'Flipping…', extra: i => `${g.score[i] || 0} pair${g.score[i] === 1 ? '' : 's'}` });
    document.querySelectorAll('#mm .mm-c').forEach(el => {
      const i = +el.dataset.i, st = g.st[i];
      el.className = 'mm-c' + (st === 1 ? ' up' : st === 2 ? ' gone' : ''); el.textContent = st ? g.cards[i] : ''; el.disabled = st !== 0 || !S.turn;
    });
    $('mmBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('mmHint').textContent = S.turn ? (S.turn.data.kind === 'second' ? 'Now flip a second card.' : 'Your turn. Flip a card.') : '';
    return '';
  },
};
Club.register({
  id: 'memory', cat: 'mind', name: 'Memory', tag: 'Flip cards and remember where the pairs are.', min: 2, max: 6, soloBots: 1, roundWord: 'Game',
  art: () => ['🍎', '⭐', '🍎'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> collect the most pairs. Sixteen cards lie face down: eight pairs of pictures.</p>
    <ol><li>On your turn, flip one card, then flip a second card.</li>
    <li>If the two pictures match, you keep the pair and <b>go again</b>.</li>
    <li>If they do not match, both flip back and the turn passes on. Remember what you saw.</li>
    <li>When all pairs are found, the player with the most pairs wins. Ties share the pot.</li>
    <li>Each player puts in ${ANTE} chips and the winner takes the pot.</li></ol>`,
  round, view, ui, _test: {},
});
})();
