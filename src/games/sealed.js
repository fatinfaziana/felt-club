/* ---------- Sealed-pick group games: everyone secretly picks a number, then all are revealed ---------- */
(function () {
const ANTE = 20;
const DEFS = {
  lowunique: {
    cat: 'group', name: 'Lowest Unique Number', tag: 'Pick a number. The lowest one nobody else picked wins.', lo: 1, hi: 10, min: 3, max: 10, soloBots: 3,
    art: ['1', '2', '3'],
    rules: `<p><b>Goal:</b> pick the <b>lowest number that nobody else picks</b>. Great for a crowd of 3 to 10.</p>
      <ol><li>Everyone secretly picks a whole number from 1 to 10. Nobody sees anyone else’s pick until all are in.</li>
      <li>Then all picks are shown. Numbers that two or more players picked are cancelled.</li>
      <li>Of the numbers left, the <b>lowest</b> wins. Picking 1 is tempting, but so many people will too.</li>
      <li>If every number is cancelled, nobody wins and everyone gets their chips back.</li>
      <li>Each player puts in ${ANTE} chips and the winner takes the pot.</li></ol>`,
    resolve(picks) { const c = {}; picks.forEach(v => { c[v] = (c[v] || 0) + 1; }); const u = Object.keys(c).filter(k => c[k] === 1).map(Number).sort((a, b) => a - b); return u.length ? [picks.indexOf(u[0])] : []; },
    note(picks, w) { return w.length ? `The lowest number nobody else picked was ${picks[w[0]]}.` : 'Every number was picked more than once.'; },
    bot: () => 1 + Math.floor(Math.pow(Math.random(), 1.7) * 10),
  },
  twothirds: {
    cat: 'math', name: 'Two-Thirds Game', tag: 'Guess two thirds of the group’s average.', lo: 0, hi: 100, min: 3, max: 10, soloBots: 3,
    art: ['⅔', 'x̄', '?'],
    rules: `<p><b>Goal:</b> pick the number closest to <b>two thirds of the average</b> of everyone’s picks. Best with 3 to 10 players.</p>
      <ol><li>Everyone secretly picks a whole number from 0 to 100.</li>
      <li>All picks are shown and averaged. Two thirds of that average is the target.</li>
      <li>The player closest to the target wins. Ties share the pot.</li>
      <li>Think: if everyone picks around 50, the target is about 33. But others may think the same, and then it is lower still. How far do you go?</li>
      <li>Each player puts in ${ANTE} chips and the winner takes the pot.</li></ol>`,
    resolve(picks) { const t = picks.reduce((a, b) => a + b, 0) / picks.length * 2 / 3, d = picks.map(v => Math.abs(v - t)), m = Math.min(...d); return d.map((x, i) => (Math.abs(x - m) < 1e-9 ? i : -1)).filter(i => i >= 0); },
    note(picks) { const t = picks.reduce((a, b) => a + b, 0) / picks.length * 2 / 3; return `The average was ${(picks.reduce((a, b) => a + b, 0) / picks.length).toFixed(1)}. Two thirds of it is ${t.toFixed(1)}.`; },
    bot: () => Math.max(0, Math.min(100, Math.round(12 + Math.random() * 28))),
  },
};
function makeRound(def) {
  return async function round(G, io) {
    const P = G.players, n = P.length;
    const Z = G.s = { picks: P.map(() => null), turn: -1, over: false, winners: [], note: '', game: G.game };
    io.render(); await io.sleep(400);
    for (let i = 0; i < n; i++) {
      Z.turn = i; io.render();
      const a = await io.turn(P[i], {}, { auto: { t: 'pick', n: def.lo + rnd(def.hi - def.lo + 1) },
        validate: x => (x && x.t === 'pick' && Number.isInteger(x.n) && x.n >= def.lo && x.n <= def.hi ? { t: 'pick', n: x.n } : null),
        bot: () => ({ t: 'pick', n: def.bot() }), think: 700 + Math.random() * 700 });
      Z.picks[i] = a.n; io.ev(P[i], 'has chosen', 'have chosen');
    }
    Z.turn = -1; Z.over = true;
    Z.winners = def.resolve(Z.picks); Z.note = def.note(Z.picks, Z.winners);
    settlePot(G, ANTE, Z.winners); potSummary(G);
    io.line(`Picks: ${P.map((p, i) => `${p.human ? 'player ' + (i + 1) : p.name} ${Z.picks[i]}`).join(', ')}.`, true);
    io.render();
  };
}
function makeView(G) {
  const Z = G.s;
  if (!Z || Z.picks.length !== G.players.length || Z.game !== G.game) return { chosen: G.players.map(() => false), picks: null, turn: -1, over: false, winners: [], note: '', delta: [] };
  return { chosen: Z.picks.map(v => v !== null), picks: Z.over ? Z.picks : null, turn: Z.over ? -1 : Z.turn, over: Z.over, winners: Z.winners, note: Z.note, delta: G.players.map(p => (Z.over ? p.delta || 0 : 0)) };
}
function makeUI(def) {
  let S0 = null, seq = 0;
  return {
    mount(stage, ctl) {
      seq = 0;
      stage.innerHTML = `<section class="table pz"><div class="pz-label">${def.lo} to ${def.hi}. Picks stay hidden until everyone has chosen.</div><div class="bt-opps" id="slSeats"></div><div class="banner" id="slBanner" aria-live="polite"></div></section>`;
      ctl.innerHTML = `<div class="act" id="slAct" hidden><form class="pz-form" id="slForm" autocomplete="off"><input id="slIn" inputmode="numeric" aria-label="Your number" placeholder="${def.lo} to ${def.hi}"><button type="submit" class="b gold small">Lock it in</button></form><p class="hint bt-hint" id="slHint"></p></div>`;
      $('slForm').onsubmit = e => { e.preventDefault(); const v = parseInt($('slIn').value, 10);
        if (Number.isInteger(v) && v >= def.lo && v <= def.hi && S0.turn) { $('slIn').value = ''; S0.send({ t: 'pick', n: v }); } else $('slHint').textContent = `Type a whole number from ${def.lo} to ${def.hi}.`; };
    },
    update(S) {
      S0 = S; const V = S.V, g = V.g;
      $('slSeats').innerHTML = V.seats.map((s, i) => {
        const d = (g.delta || [])[i] || 0, won = g.winners.includes(i);
        const tag = V.done ? `<div class="tag ${won ? 'win' : 'dim'}">${g.picks ? 'Picked ' + g.picks[i] : ''}${d ? ' · ' + (d > 0 ? '+' : '') + fmt(d) : ''}</div>` : g.turn === i ? '<div class="tag hot">Choosing…</div>' : `<div class="tag dim">${g.chosen[i] ? 'Chosen' : 'Waiting'}</div>`;
        return `<div class="seat${g.turn === i ? ' active' : ''}"><div class="plate"><span class="name"><span>${esc(S.nameOf(i))}</span></span><span class="style">${esc(S.tag(i))}</span><span class="stack">${fmt(s.stack)}</span></div>${tag}</div>`;
      }).join('');
      $('slBanner').innerHTML = g.over && V.summary.length ? `<span>${esc(g.note)}</span>` + V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
      $('slAct').hidden = !S.turn;
      if (S.turn) { if (seq !== S.turn.seq) { seq = S.turn.seq; $('slIn').focus(); } $('slHint').textContent = `Pick a whole number from ${def.lo} to ${def.hi}.`; }
      return '';
    },
  };
}
for (const [id, def] of Object.entries(DEFS)) Club.register({
  id, cat: def.cat, name: def.name, tag: def.tag, min: def.min, max: def.max, soloBots: def.soloBots, roundWord: 'Round',
  art: () => def.art.map(c => `<div class="ltile num">${c}</div>`).join(''), rules: def.rules,
  round: makeRound(def), view: makeView, ui: makeUI(def), _test: { resolve: def.resolve },
});
})();
