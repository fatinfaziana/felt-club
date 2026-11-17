/* ---------- Blackjack ---------- */
(function () {
const LAB = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'], SUI = ['♠','♥','♦','♣'];
const rank = c => c >> 2;
const val = c => { const r = rank(c); return r === 0 ? 11 : r >= 9 ? 10 : r + 1; };
function total(cs) {
  let t = 0, a = 0;
  for (const c of cs) { t += val(c); if (rank(c) === 0) a++; }
  while (t > 21 && a > 0) { t -= 10; a--; }
  return { t, soft: a > 0 };
}
function bjBot(B, s, canD) {
  const { t, soft } = total(s.cards), up = val(B.dealer[0]);
  if (canD && !soft && (t === 11 || (t === 10 && up <= 9))) return { t: 'double' };
  if (soft) return { t: t <= 17 || (t === 18 && up >= 9) ? 'hit' : 'stand' };
  if (t >= 17) return { t: 'stand' };
  if (t >= 13 && up <= 6) return { t: 'stand' };
  if (t === 12 && up >= 4 && up <= 6) return { t: 'stand' };
  return { t: 'hit' };
}

async function round(G, io) {
  const P = G.players, n = P.length;
  const shoe = shuffle([...Array(52).keys()]);
  const B = G.bj = { phase: 'bet', dealer: [], hole: true, turn: -1,
    ps: P.map(() => ({ bet: 0, cards: [], state: 'wait', res: '', delta: 0 })) };
  io.render();
  // bets, one seat at a time
  for (let i = 0; i < n; i++) {
    const p = P[i], mx = p.stack, mn = Math.min(10, mx);
    B.turn = i; io.render();
    const a = await io.turn(p, { kind: 'bet', min: mn, max: mx }, {
      auto: { t: 'bet', amt: mn },
      validate: x => (x && x.t === 'bet' && Number.isInteger(x.amt) && x.amt >= mn && x.amt <= mx ? { t: 'bet', amt: x.amt } : null),
      bot: () => ({ t: 'bet', amt: Math.min(mx, [10, 20, 25, 50][rnd(4)]) }), think: 350,
    });
    B.ps[i].bet = a.amt; io.ev(p, `bets ${fmt(a.amt)}`, `bet ${fmt(a.amt)}`);
  }
  B.phase = 'play'; B.turn = -1;
  for (let r = 0; r < 2; r++) { for (const s of B.ps) s.cards.push(shoe.pop()); B.dealer.push(shoe.pop()); io.render(); await io.sleep(350); }
  const dBJ = total(B.dealer).t === 21;
  B.ps.forEach(s => { if (total(s.cards).t === 21) s.state = 'bj'; });
  if (dBJ) { io.line('Dealer has blackjack.', true); }
  else {
    for (let i = 0; i < n; i++) {
      const p = P[i], s = B.ps[i];
      while (s.state === 'wait') {
        B.turn = i; io.render();
        const canD = s.cards.length === 2 && p.stack >= s.bet * 2;
        const a = await io.turn(p, { kind: 'play', canDouble: canD }, {
          auto: { t: 'stand' },
          validate: x => (x && (x.t === 'hit' || x.t === 'stand' || (x.t === 'double' && canD)) ? { t: x.t } : null),
          bot: () => bjBot(B, s, canD), think: 650,
        });
        if (a.t === 'stand') { s.state = 'stand'; io.ev(p, `stands on ${total(s.cards).t}`, `stand on ${total(s.cards).t}`); }
        else {
          if (a.t === 'double') s.bet *= 2;
          s.cards.push(shoe.pop());
          const t = total(s.cards).t;
          io.ev(p, a.t === 'double' ? `doubles and gets ${t}` : `hits and gets ${t}`, a.t === 'double' ? `double and get ${t}` : `hit and get ${t}`);
          if (t > 21) s.state = 'bust'; else if (t === 21 || a.t === 'double') s.state = 'stand';
        }
        io.render(); await io.sleep(450);
      }
    }
  }
  B.turn = -1; B.phase = 'dealer'; B.hole = false; io.render(); await io.sleep(700);
  if (!dBJ && B.ps.some(s => s.state === 'stand')) {
    while (total(B.dealer).t < 17) { B.dealer.push(shoe.pop()); io.render(); await io.sleep(750); }
  }
  const dT = total(B.dealer).t;
  io.line(`Dealer ${dBJ ? 'has blackjack' : dT > 21 ? 'busts with ' + dT : 'stands on ' + dT}.`, true);
  B.phase = 'settle';
  G.summary = [];
  B.ps.forEach((s, i) => {
    const p = P[i], t = total(s.cards).t;
    let d;
    if (s.state === 'bust') { d = -s.bet; s.res = 'Bust'; }
    else if (s.state === 'bj') { if (dBJ) { d = 0; s.res = 'Push'; } else { d = Math.floor(s.bet * 1.5); s.res = 'Blackjack'; } }
    else if (dBJ) { d = -s.bet; s.res = 'Lose'; }
    else if (dT > 21 || t > dT) { d = s.bet; s.res = 'Win'; }
    else if (t === dT) { d = 0; s.res = 'Push'; }
    else { d = -s.bet; s.res = 'Lose'; }
    d = Math.max(d, -p.stack);
    p.stack += d; s.delta = d;
    G.summary.push(d > 0 ? { p: i, t: `wins ${fmt(d)}${s.state === 'bj' ? ' with blackjack' : ''}.`, y: `win ${fmt(d)}${s.state === 'bj' ? ' with blackjack' : ''}.` }
      : d < 0 ? { p: i, t: `loses ${fmt(-d)}.`, y: `lose ${fmt(-d)}.` } : { p: i, t: 'pushes. The bet is returned.', y: 'push. Your bet is returned.' });
  });
  for (const s of G.summary) G.log.push(Object.assign({ st: true }, s));
  io.render();
}

function view(G) {
  const B = G.bj;
  if (!B || B.ps.length !== G.players.length) return { phase: 'bet', dealer: [], dt: 0, turn: -1, ps: G.players.map(() => ({ bet: 0, cards: [], t: 0, state: 'wait', res: '', delta: 0 })) };
  const dealer = B.hole && B.dealer.length > 1 ? [B.dealer[0], -1] : B.dealer;
  return {
    phase: B.phase, dealer, dt: B.hole ? (B.dealer.length ? val(B.dealer[0]) : 0) : total(B.dealer).t, turn: B.turn,
    ps: B.ps.map(s => ({ bet: s.bet, cards: s.cards, t: total(s.cards).t, soft: total(s.cards).soft, state: s.state, res: s.res, delta: s.delta })),
  };
}

/* ----- screen ----- */
let S0 = null;
const cardHTML = c => (c < 0 ? backHTML() : faceHTML(LAB[rank(c)], SUI[c & 3], (c & 3) === 1 || (c & 3) === 2));
const STATE = { bust: 'Bust', bj: 'Blackjack', stand: 'Stand' };
const ui = {
  mount(stage, ctl, S) {
    stage.innerHTML = `<section class="table bj">
      <div class="bj-dealer"><div class="plate"><span class="name"><span>Dealer</span></span><span class="stack" id="bjDt"></span></div><div class="cards" id="bjDcards"></div></div>
      <div class="banner" id="bjBanner" aria-live="polite"></div>
      <div class="bj-seats" id="bjSeats"></div></section>`;
    ctl.innerHTML = `<div class="act" id="bjAct" hidden>
      <div class="betrow" id="bjBetRow"></div>
      <div class="btns" id="bjPlayRow"><button type="button" class="b fold" id="bjStand">Stand</button>
        <button type="button" class="b" id="bjDouble">Double</button><button type="button" class="b gold" id="bjHit">Hit</button></div></div>`;
    $('bjStand').onclick = () => S0.send({ t: 'stand' });
    $('bjHit').onclick = () => S0.send({ t: 'hit' });
    $('bjDouble').onclick = () => S0.send({ t: 'double' });
    $('bjBetRow').onclick = e => { const b = e.target.closest('[data-amt]'); if (b) S0.send({ t: 'bet', amt: +b.dataset.amt }); };
  },
  update(S) {
    S0 = S;
    const V = S.V, g = V.g, me = S.me;
    $('bjDcards').innerHTML = (g.dealer || []).map(cardHTML).join('');
    $('bjDt').textContent = g.dealer && g.dealer.length ? String(g.dt) + (g.dealer.includes(-1) ? ' + ?' : '') : '';
    $('bjBanner').innerHTML = V.done ? V.summary.filter(e => e.p === me).map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('bjSeats').innerHTML = V.seats.map((s, i) => {
      const p = g.ps[i];
      const tag = V.done ? (p.delta > 0 ? `<div class="tag win">+${fmt(p.delta)}</div>` : p.delta < 0 ? `<div class="tag lose">${fmt(p.delta)}</div>` : `<div class="tag dim">Push</div>`)
        : p.state !== 'wait' ? `<div class="tag ${p.state === 'bust' ? 'dim' : 'hot'}">${STATE[p.state] || ''}</div>` : `<div class="tag">${p.bet ? 'Bet ' + fmt(p.bet) : g.phase === 'bet' && g.turn === i ? 'Betting…' : ''}</div>`;
      return `<div class="seat${g.turn === i ? ' active' : ''}${i === me ? ' me' : ''}"><div class="cards">${p.cards.map(cardHTML).join('')}</div>
        <div class="bj-total">${p.cards.length ? (p.soft && p.t < 21 ? 'Soft ' : '') + p.t : ''}</div>
        <div class="plate"><span class="name"><span>${esc(S.nameOf(i))}</span></span><span class="style">${esc(S.tag(i))}</span><span class="stack">${fmt(s.stack)}</span></div>${tag}</div>`;
    }).join('');
    $('bjAct').hidden = !S.turn;
    if (!S.turn) return '';
    const d = S.turn.data;
    $('bjBetRow').hidden = d.kind !== 'bet'; $('bjPlayRow').hidden = d.kind !== 'play';
    if (d.kind === 'bet') {
      const opts = [10, 25, 50, 100, 250, 500].filter(a => a >= d.min && a < d.max);
      $('bjBetRow').innerHTML = opts.map(a => `<button type="button" class="pill" data-amt="${a}">${a}</button>`).join('') + `<button type="button" class="pill" data-amt="${d.max}">${d.max === d.min ? 'Bet ' + fmt(d.max) : 'All in ' + fmt(d.max)}</button>`;
      return 'Place your bet.';
    }
    $('bjDouble').disabled = !d.canDouble;
    return '';
  },
};

Club.register({
  id: 'blackjack', cat: 'casino', name: 'Blackjack', tag: 'Beat the dealer to 21 without going over.', min: 1, max: 5, soloBots: 2, roundWord: 'Round',
  art: () => faceHTML('A', '♠', false) + faceHTML('K', '♥', true),
  rules: `<p><b>Goal:</b> get closer to 21 than the dealer without going over.</p>
    <ul><li>Place a bet, then everyone gets two cards. The dealer shows one.</li>
    <li>Number cards count their number, J Q K count 10, an ace counts 11 or 1.</li>
    <li><b>Hit</b> to take a card, <b>Stand</b> to stop, <b>Double</b> to double your bet and take exactly one more card (on your first two cards).</li>
    <li>Beat the dealer and you win your bet. A blackjack (ace plus a ten-card) pays 3 to 2. A tie returns your bet.</li>
    <li>The dealer draws until 17 or more. There is no splitting or insurance here.</li></ul>`,
  round, view,
  ui,
  _test: { total, bjBot },
});
})();
