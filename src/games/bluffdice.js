/* ---------- Bluff Dice (liar's dice): a group game of nerve ---------- */
(function () {
const STAKE = 30, DICE = 3;
const FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const higher = (b, q, f) => !b || q > b.q || (q === b.q && f > b.f);
async function round(G, io) {
  const P = G.players, n = P.length, total = n * DICE;
  const D = G.b = { dice: P.map(() => Array.from({ length: DICE }, () => 1 + rnd(6))), bid: null, by: -1, turn: (G.round - 1) % n, over: false, reveal: false, count: 0, winner: -1, loser: -1, total };
  io.render(); await io.sleep(600);
  while (!D.over) {
    const i = D.turn, p = P[i]; io.render();
    const mine = D.dice[i];
    const a = await io.turn(p, { bid: D.bid, total }, {
      auto: D.bid ? { t: 'call' } : { t: 'bid', q: 1, f: 1 },
      validate: x => {
        if (x && x.t === 'call' && D.bid) return { t: 'call' };
        if (x && x.t === 'bid' && Number.isInteger(x.q) && Number.isInteger(x.f) && x.q >= 1 && x.q <= total && x.f >= 1 && x.f <= 6 && higher(D.bid, x.q, x.f)) return { t: 'bid', q: x.q, f: x.f };
        return null;
      },
      bot: () => {
        const own = f => mine.filter(d => d === f).length, exp = f => own(f) + (total - DICE) / 6;
        if (D.bid && D.bid.q > exp(D.bid.f) + 0.6 + (p.agg || 0.5) * 0.8 + Math.random() * 0.6) return { t: 'call' };
        let best = null;
        for (let q = (D.bid ? D.bid.q : 1); q <= total && !best; q++) for (let f = 1; f <= 6; f++) if (higher(D.bid, q, f) && q <= exp(f) + 0.7) { if (!best || own(f) > own(best.f)) best = { t: 'bid', q, f }; }
        if (best) return best;
        return D.bid ? { t: 'call' } : { t: 'bid', q: 1, f: 1 };
      }, think: 1300 + Math.random() * 700 });
    if (a.t === 'bid') { D.bid = { q: a.q, f: a.f }; D.by = i; D.turn = (i + 1) % n; io.ev(p, `bids ${a.q} × ${a.f}s`, `bid ${a.q} × ${a.f}s`); }
    else {
      D.reveal = true; D.count = D.dice.flat().filter(d => d === D.bid.f).length;
      const ok = D.count >= D.bid.q; D.winner = ok ? D.by : i; D.loser = ok ? i : D.by; D.over = true;
      io.ev(p, `calls “liar!”`, `call “liar!”`); io.render(); await io.sleep(1800);
    }
    io.render();
  }
  const L = P[D.loser], W = P[D.winner], amt = Math.min(STAKE, L.stack);
  L.stack -= amt; W.stack += amt; P.forEach((p, i) => { p.delta = i === D.winner ? amt : i === D.loser ? -amt : 0; });
  potSummary(G);
  io.line(`There ${D.count === 1 ? 'was' : 'were'} ${D.count} × ${D.bid.f}s on the table. The bid was ${D.bid.q}.`, true);
  io.render();
}
function view(G) {
  const D = G.b;
  if (!D || D.dice.length !== G.players.length) return { total: 0, bid: null, by: -1, turn: -1, over: false, dice: null, n: 0, count: 0, winner: -1, delta: [] };
  return { total: D.total, bid: D.bid, by: D.by, turn: D.over ? -1 : D.turn, over: D.over, dice: D.reveal ? D.dice : null, count: D.count, winner: D.winner, delta: G.players.map(p => (D.over ? p.delta || 0 : 0)) };
}
const priv = (G, i) => (G.b && G.b.dice[i] ? { d: G.b.dice[i] } : null);
let S0 = null, selQ = 1, selF = 1, seq = 0;
const ui = {
  mount(stage, ctl) {
    seq = 0;
    stage.innerHTML = `<section class="table pz"><div class="bt-opps" id="bdSeats"></div><div class="pz-label" id="bdBid"></div><div class="bd-dice" id="bdDice"></div><div class="bd-all" id="bdAll"></div><div class="banner" id="bdBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="bdAct" hidden><div class="bd-pick"><div class="field"><label for="bdQ">How many</label><select id="bdQ"></select></div>
      <div class="betrow" id="bdF">${[1, 2, 3, 4, 5, 6].map(f => `<button type="button" class="pill" data-f="${f}" aria-label="${f}s">${FACE[f]} ${f}</button>`).join('')}</div></div>
      <div class="betrow"><button type="button" class="b gold small" id="bdBidBtn">Bid</button><button type="button" class="ghost" id="bdCall">Call “liar!”</button></div><p class="hint bt-hint" id="bdHint"></p></div>`;
    $('bdQ').onchange = () => { selQ = +$('bdQ').value; draw(); };
    $('bdF').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { selF = +b.dataset.f; draw(); } };
    $('bdBidBtn').onclick = () => { if (S0 && S0.turn) S0.send({ t: 'bid', q: selQ, f: selF }); };
    $('bdCall').onclick = () => { if (S0 && S0.turn) S0.send({ t: 'call' }); };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    $('bdSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, doing: 'Deciding…', extra: i => (g.bid && g.by === i ? `Bid ${g.bid.q} × ${g.bid.f}s` : '') });
    $('bdBid').textContent = g.bid ? `Current bid: ${g.bid.q} × ${g.bid.f}s (by ${S.nameOf(g.by)})` : 'No bid yet. Make the first bid.';
    const mine = S.my && S.my.d;
    $('bdDice').innerHTML = mine ? `<span class="bd-l">Your dice</span>` + mine.map(d => `<span class="die">${FACE[d]}</span>`).join('') : '';
    $('bdAll').innerHTML = g.dice ? g.dice.map((ds, i) => `<div class="bd-h"><b>${esc(S.nameOf(i))}</b> ${ds.map(d => `<span class="die s${d === g.bid.f ? ' hit' : ''}">${FACE[d]}</span>`).join('')}</div>`).join('') : '';
    $('bdBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') + `<span>${g.count} × ${g.bid.f}s were on the table</span>` : '';
    $('bdAct').hidden = !S.turn;
    if (S.turn) {
      if (seq !== S.turn.seq) { seq = S.turn.seq; const b = S.turn.data.bid; selQ = b ? b.q : 1; selF = b ? Math.min(6, b.f + (b.f < 6 ? 1 : 0)) : 1; if (b && b.f === 6) selQ = b.q + 1; }
      const tot = S.turn.data.total; $('bdQ').innerHTML = Array.from({ length: tot }, (_, k) => `<option value="${k + 1}"${k + 1 === selQ ? ' selected' : ''}>${k + 1}</option>`).join('');
      draw();
      $('bdCall').disabled = !S.turn.data.bid;
    }
    return '';
  },
};
function draw() {
  if (!S0 || !S0.turn) return;
  const b = S0.turn.data.bid;
  document.querySelectorAll('#bdF .pill').forEach(x => { x.style.borderColor = +x.dataset.f === selF ? 'var(--gold)' : ''; x.style.color = +x.dataset.f === selF ? 'var(--gold)' : ''; });
  $('bdQ').value = selQ; $('bdBidBtn').disabled = !higher(b, selQ, selF);
  $('bdHint').textContent = b ? 'Raise the number or the face, or call liar if you think the bid is too high.' : 'Say how many dice of one face you think are on the whole table.';
}
Club.register({
  id: 'bluffdice', cat: 'dice', name: 'Bluff Dice', tag: 'Bid, bluff and catch the liar. Great for a crowd.', min: 2, max: 8, soloBots: 3, roundWord: 'Round',
  art: () => [2, 5, 6].map(c => `<div class="ltile">${FACE[c]}</div>`).join(''),
  rules: `<p><b>Goal:</b> win the round by making a bid that is true, or by catching someone whose bid is not. Up to 8 players.</p>
    <ol><li>Everyone rolls ${DICE} dice in secret. Only you can see yours.</li>
    <li>Players take turns. A <b>bid</b> says “there are at least this many dice showing this face, counting everyone’s dice”. For example, 4 × 5s.</li>
    <li>Each new bid must be higher: more dice, or the same number of dice with a higher face.</li>
    <li>Instead of bidding, you can call <b>“liar!”</b>. Everyone shows their dice and they are counted.</li>
    <li>If there are at least as many as the bid, the bidder wins. If not, the caller wins.</li>
    <li>The loser pays ${STAKE} free chips to the winner. Everyone else keeps their chips. Chips have no cash value.</li></ol>`,
  round, view, priv, ui, _test: { higher },
});
})();
