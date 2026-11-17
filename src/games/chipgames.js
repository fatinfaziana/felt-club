/* ---------- Chip games: Roulette, Baccarat, Sic Bo, Three Card Poker. Free chips only, no cash value ---------- */
(function () {
const LAB = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], SUI = ['♠', '♥', '♦', '♣'];
const card = c => faceHTML(LAB[c >> 2], SUI[c & 3], (c & 3) === 1 || (c & 3) === 2);
const FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const BETS = [10, 25, 50, 100];
const minBet = p => Math.min(10, p.stack);
const maxBet = (p, cap) => Math.max(minBet(p), Math.min(p.stack, cap || 500));
const delta = (p, d) => { p.delta = d; p.stack += d; };
const sumUp = G => potSummary(G);
function presetRow(el, d, sel, onPick) {
  const opts = [...new Set(BETS.filter(a => a >= d.min && a <= d.max).concat([d.max]))];
  el.innerHTML = opts.map(a => `<button type="button" class="pill${a === sel ? ' on' : ''}" data-amt="${a}">${a === d.max && d.max > 100 ? 'Max ' + fmt(a) : fmt(a)}</button>`).join('');
}
function seatHTML(S, g, tagFn) {
  return S.V.seats.map((s, i) => {
    const d = (g.ps[i] || {}).delta || 0, t = tagFn(i, g.ps[i] || {});
    const tag = S.V.done ? (d > 0 ? `<div class="tag win">+${fmt(d)}</div>` : d < 0 ? `<div class="tag lose">${fmt(d)}</div>` : '<div class="tag dim">Even</div>') : t;
    return `<div class="seat${g.turn === i ? ' active' : ''}"><div class="plate"><span class="name"><span>${esc(S.nameOf(i))}</span></span><span class="style">${esc(S.tag(i))}</span><span class="stack">${fmt(s.stack)}</span></div>${tag}</div>`;
  }).join('');
}
const bannerOf = (S, g) => (S.V.done && S.V.summary.length ? S.V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '');
const blank = P => P.map(() => ({ bet: null, res: '', delta: 0 }));

/* ===================== Roulette ===================== */
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const colour = n => (n === 0 ? 'green' : RED.has(n) ? 'red' : 'black');
function rouWins(b, n) {
  switch (b.kind) {
    case 'num': return n === b.n ? 35 : 0;
    case 'red': return n && RED.has(n) ? 1 : 0; case 'black': return n && !RED.has(n) ? 1 : 0;
    case 'odd': return n && n % 2 ? 1 : 0; case 'even': return n && n % 2 === 0 ? 1 : 0;
    case 'low': return n >= 1 && n <= 18 ? 1 : 0; case 'high': return n >= 19 ? 1 : 0;
    case 'dz1': return n >= 1 && n <= 12 ? 2 : 0; case 'dz2': return n >= 13 && n <= 24 ? 2 : 0; case 'dz3': return n >= 25 ? 2 : 0;
  }
  return 0;
}
const ROU_KINDS = ['num', 'red', 'black', 'odd', 'even', 'low', 'high', 'dz1', 'dz2', 'dz3'];
const ROU_NAME = { red: 'Red', black: 'Black', odd: 'Odd', even: 'Even', low: '1 to 18', high: '19 to 36', dz1: '1st dozen', dz2: '2nd dozen', dz3: '3rd dozen' };
const bName = b => (b.kind === 'num' ? `number ${b.n}` : ROU_NAME[b.kind]);
async function rouRound(G, io) {
  const P = G.players, n = P.length, R = G.rl = { ps: blank(P), turn: -1, result: null, phase: 'bet', hist: (G.rl && G.rl.hist) || [] };
  io.render(); await io.sleep(400);
  for (let i = 0; i < n; i++) {
    const p = P[i], mn = minBet(p), mx = maxBet(p); R.turn = i; io.render();
    const a = await io.turn(p, { min: mn, max: mx }, { auto: { t: 'pass' },
      validate: x => { if (x && x.t === 'pass') return { t: 'pass' };
        if (x && x.t === 'bet' && ROU_KINDS.includes(x.kind) && Number.isInteger(x.amt) && x.amt >= mn && x.amt <= mx && (x.kind !== 'num' || (Number.isInteger(x.n) && x.n >= 0 && x.n <= 36))) return { t: 'bet', kind: x.kind, n: x.kind === 'num' ? x.n : 0, amt: x.amt };
        return null; },
      bot: () => { const k = ROU_KINDS[rnd(ROU_KINDS.length)]; return Math.random() < 0.1 ? { t: 'pass' } : { t: 'bet', kind: k, n: rnd(37), amt: Math.min(mx, [10, 10, 20, 25][rnd(4)]) }; }, think: 500 });
    if (a.t === 'bet') { R.ps[i].bet = { kind: a.kind, n: a.n, amt: a.amt }; io.ev(p, `bets ${fmt(a.amt)} on ${bName(a)}`, `bet ${fmt(a.amt)} on ${bName(a)}`); }
    else io.ev(p, 'sits this spin out', 'sit this spin out');
  }
  R.turn = -1; R.phase = 'spin'; io.render(); await io.sleep(1200);
  const num = rnd(37); R.result = num; R.hist = [...R.hist, num].slice(-12); R.phase = 'done';
  io.line(`The ball lands on ${num} (${colour(num)}).`);
  P.forEach((p, i) => { const b = R.ps[i].bet; if (!b) { p.delta = 0; R.ps[i].res = 'Sat out'; return; } const w = rouWins(b, num); delta(p, w ? b.amt * w : -b.amt); R.ps[i].res = w ? 'Win' : 'Lose'; R.ps[i].delta = p.delta; });
  sumUp(G); io.render();
}
function rouView(G) {
  const R = G.rl;
  if (!R || R.ps.length !== G.players.length) return { ps: blank(G.players), turn: -1, result: null, phase: 'bet', hist: [] };
  return { ps: R.ps, turn: R.turn, result: R.result, phase: R.phase, hist: R.hist };
}
let SR = null, rAmt = 10, rNum = 7;
const rouUI = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table pz"><div class="bt-opps" id="rlSeats"></div><div class="rl-ball" id="rlBall"></div><div class="rl-hist" id="rlHist"></div><div class="banner" id="rlBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="rlAct" hidden><div class="betrow" id="rlAmt"></div>
      <div class="betrow" id="rlKinds">${Object.entries(ROU_NAME).map(([k, v]) => `<button type="button" class="pill" data-k="${k}">${v}</button>`).join('')}</div>
      <div class="betrow"><label class="hint" for="rlN">Single number (pays 35 to 1)</label><select id="rlN">${Array.from({ length: 37 }, (_, i) => `<option>${i}</option>`).join('')}</select><button type="button" class="pill" data-k="num">Bet on this number</button><button type="button" class="ghost" data-k="pass">Sit out</button></div>
      <p class="hint bt-hint" id="rlHint"></p></div>`;
    $('rlAmt').onclick = e => { const b = e.target.closest('[data-amt]'); if (b) { rAmt = +b.dataset.amt; rouUI.update(SR); } };
    $('rlN').onchange = () => { rNum = +$('rlN').value; };
    $('rlAct').onclick = e => { const b = e.target.closest('[data-k]'); if (!b || !SR.turn) return; const k = b.dataset.k; if (k === 'pass') SR.send({ t: 'pass' }); else SR.send({ t: 'bet', kind: k, n: k === 'num' ? +$('rlN').value : 0, amt: rAmt }); };
  },
  update(S) {
    SR = S; const V = S.V, g = V.g;
    $('rlSeats').innerHTML = seatHTML(S, g, (i, p) => `<div class="tag${p.bet ? ' hot' : ' dim'}">${p.bet ? `${fmt(p.bet.amt)} on ${bName(p.bet)}` : g.turn === i ? 'Betting…' : p.res || ''}</div>`);
    $('rlBall').innerHTML = g.result === null ? (g.phase === 'spin' ? '<span class="rl-n spin">…</span>' : '') : `<span class="rl-n ${colour(g.result)}">${g.result}</span>`;
    $('rlHist').innerHTML = g.hist.map(n => `<span class="rl-h ${colour(n)}">${n}</span>`).join('');
    $('rlBanner').innerHTML = bannerOf(S, g);
    $('rlAct').hidden = !S.turn;
    if (S.turn) { const d = S.turn.data; if (rAmt < d.min || rAmt > d.max) rAmt = Math.min(Math.max(10, d.min), d.max); presetRow($('rlAmt'), d, rAmt); $('rlHint').textContent = `Choose your stake, then tap a bet. Outside bets pay 1 to 1 (dozens 2 to 1). Zero beats them all.`; }
    return '';
  },
};
Club.register({
  id: 'roulette', cat: 'casino', name: 'Roulette', tag: 'Spin the wheel and back a colour, a number or a dozen.', min: 1, max: 8, soloBots: 2, roundWord: 'Spin',
  art: () => ['7', '0', '23'].map(c => `<div class="ltile num">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> end up with more free chips by guessing where the ball will land. Chips are free to play with and have no cash value.</p>
    <ol><li>The wheel has the numbers 0 to 36. Each number is red, black, or (for 0) green.</li>
    <li>On your turn, pick a stake, then tap one bet: a <b>colour</b> (red or black), <b>odd or even</b>, <b>low</b> (1 to 18) or <b>high</b> (19 to 36), a <b>dozen</b>, or a single <b>number</b>.</li>
    <li>After everyone has bet, the ball is spun and the number is shown.</li>
    <li>Colour, odd/even and low/high bets pay 1 to 1. Dozens pay 2 to 1. A single number pays 35 to 1.</li>
    <li>If the ball lands on 0, every bet except a bet on 0 loses. You can also sit a spin out.</li>
    <li>If you run out of chips, you get a fresh stack. This is a game of luck, for fun only.</li></ol>`,
  round: rouRound, view: rouView, ui: rouUI, _test: { rouWins },
});

/* ===================== Baccarat ===================== */
const bv = c => { const r = c >> 2; return r >= 9 ? 0 : r + 1; };
const bt = cs => cs.reduce((s, c) => s + bv(c), 0) % 10;
async function bacRound(G, io) {
  const P = G.players, n = P.length, shoe = shuffle([...Array(52).keys()]);
  const B = G.bc = { ps: blank(P), turn: -1, player: [], banker: [], phase: 'bet', win: '' };
  io.render(); await io.sleep(400);
  for (let i = 0; i < n; i++) {
    const p = P[i], mn = minBet(p), mx = maxBet(p); B.turn = i; io.render();
    const a = await io.turn(p, { min: mn, max: mx }, { auto: { t: 'bet', kind: 'banker', amt: mn },
      validate: x => (x && x.t === 'bet' && ['player', 'banker', 'tie'].includes(x.kind) && Number.isInteger(x.amt) && x.amt >= mn && x.amt <= mx ? { t: 'bet', kind: x.kind, amt: x.amt } : null),
      bot: () => ({ t: 'bet', kind: ['player', 'banker', 'banker', 'tie'][rnd(4)], amt: Math.min(mx, [10, 20, 25][rnd(3)]) }), think: 500 });
    B.ps[i].bet = { kind: a.kind, amt: a.amt }; io.ev(p, `bets ${fmt(a.amt)} on the ${a.kind}`, `bet ${fmt(a.amt)} on the ${a.kind}`);
  }
  B.turn = -1; B.phase = 'deal'; io.render();
  for (const [h, who] of [[B.player, 'player'], [B.banker, 'banker'], [B.player, 'player'], [B.banker, 'banker']]) { h.push(shoe.pop()); io.render(); await io.sleep(550); }
  let pt = bt(B.player), bk = bt(B.banker), p3 = null;
  if (pt < 8 && bk < 8) {
    if (pt <= 5) { p3 = shoe.pop(); B.player.push(p3); io.render(); await io.sleep(650); }
    const v3 = p3 === null ? null : bv(p3);
    let draw = false;
    if (p3 === null) draw = bk <= 5;
    else if (bk <= 2) draw = true; else if (bk === 3) draw = v3 !== 8; else if (bk === 4) draw = v3 >= 2 && v3 <= 7;
    else if (bk === 5) draw = v3 >= 4 && v3 <= 7; else if (bk === 6) draw = v3 === 6 || v3 === 7;
    if (draw) { B.banker.push(shoe.pop()); io.render(); await io.sleep(650); }
  }
  pt = bt(B.player); bk = bt(B.banker);
  const out = pt > bk ? 'player' : bk > pt ? 'banker' : 'tie'; B.win = out; B.phase = 'done';
  io.line(`Player ${pt}, Banker ${bk}. ${out === 'tie' ? 'A tie.' : (out === 'player' ? 'Player' : 'Banker') + ' wins.'}`);
  P.forEach((p, i) => {
    const b = B.ps[i].bet; let d = 0;
    if (b.kind === out) d = out === 'banker' ? Math.floor(b.amt * 0.95) : out === 'tie' ? b.amt * 8 : b.amt;
    else if (out === 'tie') d = 0; else d = -b.amt;
    delta(p, d); B.ps[i].delta = d; B.ps[i].res = d > 0 ? 'Win' : d < 0 ? 'Lose' : 'Push';
  });
  sumUp(G); io.render();
}
function bacView(G) {
  const B = G.bc;
  if (!B || B.ps.length !== G.players.length) return { ps: blank(G.players), turn: -1, player: [], banker: [], pt: 0, bk: 0, phase: 'bet', win: '' };
  return { ps: B.ps, turn: B.turn, player: B.player, banker: B.banker, pt: bt(B.player), bk: bt(B.banker), phase: B.phase, win: B.win };
}
let SB = null, bAmt = 10;
const bacUI = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table pz"><div class="bac" id="bacHands"></div><div class="bt-opps" id="bcSeats"></div><div class="banner" id="bcBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="bcAct" hidden><div class="betrow" id="bcAmt"></div><div class="betrow" id="bcKinds"><button type="button" class="b gold small" data-k="player">Player (pays 1 to 1)</button><button type="button" class="b gold small" data-k="banker">Banker (1 to 1, 5% off)</button><button type="button" class="b small" data-k="tie">Tie (pays 8 to 1)</button></div><p class="hint bt-hint">Choose your stake, then back the Player hand, the Banker hand, or a Tie. Closest to 9 wins.</p></div>`;
    $('bcAmt').onclick = e => { const b = e.target.closest('[data-amt]'); if (b) { bAmt = +b.dataset.amt; bacUI.update(SB); } };
    $('bcKinds').onclick = e => { const b = e.target.closest('[data-k]'); if (b && SB.turn) SB.send({ t: 'bet', kind: b.dataset.k, amt: bAmt }); };
  },
  update(S) {
    SB = S; const V = S.V, g = V.g;
    $('bacHands').innerHTML = ['player', 'banker'].map(w => `<div class="bac-h${g.win === w ? ' win' : ''}"><b>${w === 'player' ? 'Player' : 'Banker'}</b><div class="cards">${g[w].map(card).join('')}</div><span class="bac-t">${g[w].length ? g[w === 'player' ? 'pt' : 'bk'] : ''}</span></div>`).join('');
    $('bcSeats').innerHTML = seatHTML(S, g, (i, p) => `<div class="tag${p.bet ? ' hot' : ' dim'}">${p.bet ? `${fmt(p.bet.amt)} on ${p.bet.kind}` : g.turn === i ? 'Betting…' : ''}</div>`);
    $('bcBanner').innerHTML = g.phase === 'done' ? `<span>${g.win === 'tie' ? 'A tie.' : (g.win === 'player' ? 'Player' : 'Banker') + ' wins.'}</span>` + bannerOf(S, g) : '';
    $('bcAct').hidden = !S.turn;
    if (S.turn) { const d = S.turn.data; if (bAmt < d.min || bAmt > d.max) bAmt = Math.min(Math.max(10, d.min), d.max); presetRow($('bcAmt'), d, bAmt); }
    return '';
  },
};
Club.register({
  id: 'baccarat', cat: 'casino', name: 'Baccarat', tag: 'Back the Player, the Banker or a Tie. Closest to 9 wins.', min: 1, max: 8, soloBots: 2, roundWord: 'Hand',
  art: () => ['9', 'A', '♠'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> back the hand that finishes closest to 9. You do not play the cards: you bet on how they land. Chips are free and have no cash value.</p>
    <ol><li>Two hands are dealt: <b>Player</b> and <b>Banker</b>. Aces count 1, cards 2 to 9 count their number, and 10s and face cards count 0. A hand’s value is the last digit of its total (a total of 15 is worth 5).</li>
    <li>Pick a stake, then back <b>Player</b> (pays 1 to 1), <b>Banker</b> (pays 1 to 1 minus 5%) or <b>Tie</b> (pays 8 to 1).</li>
    <li>If either hand has 8 or 9 on two cards, nobody draws. Otherwise, a third card may be drawn by fixed rules shown by the table.</li>
    <li>The hand closest to 9 wins. If it is a tie, Player and Banker bets are returned.</li>
    <li>You can lose chips, but if you run out you get a fresh stack. A game of luck, for fun only.</li></ol>`,
  round: bacRound, view: bacView, ui: bacUI, _test: { bt },
});

/* ===================== Sic Bo ===================== */
const SUM_PAY = { 4: 60, 5: 30, 6: 18, 7: 12, 8: 8, 9: 6, 10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 18, 16: 30, 17: 60 };
function sicWin(b, d) {
  const s = d[0] + d[1] + d[2], trip = d[0] === d[1] && d[1] === d[2];
  switch (b.kind) {
    case 'big': return !trip && s >= 11 ? 1 : 0; case 'small': return !trip && s <= 10 ? 1 : 0;
    case 'triple': return trip ? 30 : 0;
    case 'num': return d.filter(x => x === b.n).length;
    case 'sum': return s === b.n ? SUM_PAY[b.n] : 0;
  }
  return 0;
}
async function sicRound(G, io) {
  const P = G.players, n = P.length, S0 = G.sb = { ps: blank(P), turn: -1, dice: [], phase: 'bet' };
  io.render(); await io.sleep(400);
  for (let i = 0; i < n; i++) {
    const p = P[i], mn = minBet(p), mx = maxBet(p); S0.turn = i; io.render();
    const a = await io.turn(p, { min: mn, max: mx }, { auto: { t: 'bet', kind: 'big', n: 0, amt: mn },
      validate: x => { if (!(x && x.t === 'bet' && Number.isInteger(x.amt) && x.amt >= mn && x.amt <= mx)) return null;
        if (['big', 'small', 'triple'].includes(x.kind)) return { t: 'bet', kind: x.kind, n: 0, amt: x.amt };
        if (x.kind === 'num' && Number.isInteger(x.n) && x.n >= 1 && x.n <= 6) return { t: 'bet', kind: 'num', n: x.n, amt: x.amt };
        if (x.kind === 'sum' && Number.isInteger(x.n) && x.n >= 4 && x.n <= 17) return { t: 'bet', kind: 'sum', n: x.n, amt: x.amt };
        return null; },
      bot: () => { const k = ['big', 'small', 'num', 'num', 'sum', 'triple'][rnd(6)]; return { t: 'bet', kind: k, n: k === 'num' ? 1 + rnd(6) : k === 'sum' ? 4 + rnd(14) : 0, amt: Math.min(mx, [10, 20, 25][rnd(3)]) }; }, think: 500 });
    S0.ps[i].bet = { kind: a.kind, n: a.n, amt: a.amt };
    const nm = a.kind === 'num' ? `the number ${a.n}` : a.kind === 'sum' ? `a total of ${a.n}` : a.kind === 'triple' ? 'any triple' : a.kind;
    io.ev(p, `bets ${fmt(a.amt)} on ${nm}`, `bet ${fmt(a.amt)} on ${nm}`);
  }
  S0.turn = -1; S0.phase = 'roll';
  for (let k = 0; k < 3; k++) { S0.dice.push(1 + rnd(6)); io.render(); await io.sleep(650); }
  S0.phase = 'done'; io.line(`Dice: ${S0.dice.join(', ')} (total ${S0.dice[0] + S0.dice[1] + S0.dice[2]}).`);
  P.forEach((p, i) => { const b = S0.ps[i].bet, w = sicWin(b, S0.dice); delta(p, w ? b.amt * w : -b.amt); S0.ps[i].delta = p.delta; S0.ps[i].res = w ? 'Win' : 'Lose'; });
  sumUp(G); io.render();
}
function sicView(G) {
  const S0 = G.sb;
  if (!S0 || S0.ps.length !== G.players.length) return { ps: blank(G.players), turn: -1, dice: [], phase: 'bet' };
  return { ps: S0.ps, turn: S0.turn, dice: S0.dice, phase: S0.phase };
}
let SS = null, sAmt = 10;
const sicName = b => (b.kind === 'num' ? `number ${b.n}` : b.kind === 'sum' ? `total ${b.n}` : b.kind === 'triple' ? 'any triple' : b.kind);
const sicUI = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table pz"><div class="bd-dice sic" id="sicDice"></div><div class="pz-label" id="sicTot"></div><div class="bt-opps" id="scSeats"></div><div class="banner" id="scBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="scAct" hidden><div class="betrow" id="scAmt"></div>
      <div class="betrow"><button type="button" class="b gold small" data-k="big">Big 11–17 (1 to 1)</button><button type="button" class="b gold small" data-k="small">Small 4–10 (1 to 1)</button><button type="button" class="b small" data-k="triple">Any triple (30 to 1)</button></div>
      <div class="betrow"><label class="hint" for="scN">Number</label><select id="scN">${[1,2,3,4,5,6].map(i => `<option>${i}</option>`).join('')}</select><button type="button" class="pill" data-k="num">Bet on the number (1 to 3 times)</button></div>
      <div class="betrow"><label class="hint" for="scS">Total</label><select id="scS">${Array.from({ length: 14 }, (_, i) => `<option>${i + 4}</option>`).join('')}</select><button type="button" class="pill" data-k="sum">Bet on the total</button></div>
      <p class="hint bt-hint">Three dice are rolled. Number bets pay once for each die that shows your number. Triples make Big and Small lose.</p></div>`;
    $('scAmt').onclick = e => { const b = e.target.closest('[data-amt]'); if (b) { sAmt = +b.dataset.amt; sicUI.update(SS); } };
    $('scAct').onclick = e => { const b = e.target.closest('[data-k]'); if (!b || !SS.turn) return; const k = b.dataset.k; SS.send({ t: 'bet', kind: k, n: k === 'num' ? +$('scN').value : k === 'sum' ? +$('scS').value : 0, amt: sAmt }); };
  },
  update(S) {
    SS = S; const V = S.V, g = V.g;
    $('sicDice').innerHTML = g.dice.map(d => `<span class="die">${FACE[d]}</span>`).join('');
    $('sicTot').textContent = g.dice.length === 3 ? `Total ${g.dice[0] + g.dice[1] + g.dice[2]}${g.dice[0] === g.dice[1] && g.dice[1] === g.dice[2] ? ' · Triple!' : ''}` : '';
    $('scSeats').innerHTML = seatHTML(S, g, (i, p) => `<div class="tag${p.bet ? ' hot' : ' dim'}">${p.bet ? `${fmt(p.bet.amt)} on ${sicName(p.bet)}` : g.turn === i ? 'Betting…' : ''}</div>`);
    $('scBanner').innerHTML = bannerOf(S, g);
    $('scAct').hidden = !S.turn;
    if (S.turn) { const d = S.turn.data; if (sAmt < d.min || sAmt > d.max) sAmt = Math.min(Math.max(10, d.min), d.max); presetRow($('scAmt'), d, sAmt); }
    return '';
  },
};
Club.register({
  id: 'sicbo', cat: 'casino', name: 'Sic Bo', tag: 'Three dice. Bet Big, Small, a number or a triple.', min: 1, max: 8, soloBots: 2, roundWord: 'Roll',
  art: () => [2, 5, 5].map(c => `<div class="ltile">${FACE[c]}</div>`).join(''),
  rules: `<p><b>Goal:</b> end up with more free chips by guessing what three dice will show. Chips are free and have no cash value.</p>
    <ol><li>Pick a stake, then tap one bet.</li>
    <li><b>Big</b>: the total is 11 to 17. <b>Small</b>: the total is 4 to 10. Both pay 1 to 1, but lose if all three dice match.</li>
    <li><b>A number</b> (1 to 6): pays 1 to 1 if one die shows it, 2 to 1 if two do, 3 to 1 if all three do.</li>
    <li><b>Any triple</b> (all three dice match) pays 30 to 1.</li>
    <li><b>A total</b> (4 to 17): pays up to 60 to 1 for the rare totals, 6 to 1 for 9 to 12.</li>
    <li>When everyone has bet, the three dice roll and bets are paid. If you run out of chips, you get a fresh stack. For fun only.</li></ol>`,
  round: sicRound, view: sicView, ui: sicUI, _test: { sicWin },
});

/* ===================== Three Card Poker ===================== */
const pv = c => { const r = c >> 2; return r === 0 ? 14 : r + 1; };
function tcpRank(cs) {                       // returns a comparable number
  const v = cs.map(pv).sort((a, b) => b - a), flush = cs.every(c => (c & 3) === (cs[0] & 3));
  let st = v[0] - v[1] === 1 && v[1] - v[2] === 1, hi = v[0];
  if (!st && v[0] === 14 && v[1] === 3 && v[2] === 2) { st = true; hi = 3; }
  const trips = v[0] === v[1] && v[1] === v[2], pair = v[0] === v[1] || v[1] === v[2];
  const cat = st && flush ? 5 : trips ? 4 : st ? 3 : flush ? 2 : pair ? 1 : 0;
  const k = pair && !trips ? (v[0] === v[1] ? [v[0], v[2]] : [v[1], v[0]]) : (st ? [hi, 0] : v.slice(0, 2));
  return cat * 1e6 + (cat === 4 ? v[0] : 0) * 1e4 + (cat === 4 ? 0 : k[0] * 100 + k[1]) + (cat === 0 || cat === 2 ? v[2] * 0.01 : 0);
}
const TCP_NAME = ['High card', 'Pair', 'Flush', 'Straight', 'Three of a kind', 'Straight flush'];
const tcpCat = cs => Math.floor(tcpRank(cs) / 1e6);
async function tcpRound(G, io) {
  const P = G.players, n = P.length, shoe = shuffle([...Array(52).keys()]);
  const T = G.tc = { ps: P.map(() => ({ ante: 0, cards: [], state: 'wait', res: '', delta: 0 })), dealer: [], turn: -1, phase: 'ante', reveal: false };
  io.render(); await io.sleep(400);
  for (let i = 0; i < n; i++) {
    const p = P[i], mn = minBet(p), mx = Math.max(mn, Math.min(Math.floor(p.stack / 2), 250)); T.turn = i; io.render();
    const a = await io.turn(p, { kind: 'ante', min: mn, max: mx }, { auto: { t: 'ante', amt: mn },
      validate: x => (x && x.t === 'ante' && Number.isInteger(x.amt) && x.amt >= mn && x.amt <= mx ? { t: 'ante', amt: x.amt } : null),
      bot: () => ({ t: 'ante', amt: Math.min(mx, [10, 20, 25][rnd(3)]) }), think: 400 });
    T.ps[i].ante = a.amt; io.ev(p, `antes ${fmt(a.amt)}`, `ante ${fmt(a.amt)}`);
  }
  T.turn = -1; T.phase = 'deal';
  for (let r = 0; r < 3; r++) { for (const s of T.ps) s.cards.push(shoe.pop()); T.dealer.push(shoe.pop()); }
  io.render(); await io.sleep(700);
  T.phase = 'play';
  for (let i = 0; i < n; i++) {
    const p = P[i], s = T.ps[i]; T.turn = i; io.render();
    const rk = tcpRank(s.cards), good = rk >= 1e6 || Math.max(...s.cards.map(pv)) >= 12 && (rk % 1e6) >= 12 * 100 + 6 * 1;
    const a = await io.turn(p, { kind: 'play', ante: s.ante }, { auto: { t: 'play' },
      validate: x => (x && (x.t === 'play' || x.t === 'fold') ? { t: x.t } : null),
      bot: () => ({ t: good || Math.random() < 0.05 ? 'play' : 'fold' }), think: 800 });
    s.state = a.t === 'play' ? 'played' : 'folded'; io.ev(p, a.t === 'play' ? `plays and adds ${fmt(s.ante)}` : 'folds', a.t === 'play' ? `play and add ${fmt(s.ante)}` : 'fold');
  }
  T.turn = -1; T.phase = 'show'; T.reveal = true; io.render(); await io.sleep(1200);
  const dr = tcpRank(T.dealer), qual = Math.max(...T.dealer.map(pv)) >= 12 || dr >= 1e6;
  io.line(`Dealer shows ${TCP_NAME[tcpCat(T.dealer)]}${qual ? '' : ' and does not qualify'}.`);
  P.forEach((p, i) => {
    const s = T.ps[i]; let d;
    if (s.state === 'folded') { d = -s.ante; s.res = 'Folded'; }
    else if (!qual) { d = s.ante; s.res = 'Dealer does not qualify'; }
    else { const pr = tcpRank(s.cards); if (pr > dr) { d = s.ante * 2; s.res = 'Win'; } else if (pr < dr) { d = -s.ante * 2; s.res = 'Lose'; } else { d = 0; s.res = 'Push'; } }
    delta(p, d); s.delta = d;
  });
  sumUp(G); io.render();
}
function tcpView(G) {
  const T = G.tc;
  if (!T || T.ps.length !== G.players.length) return { ps: G.players.map(() => ({ ante: 0, cards: [], state: 'wait', res: '', delta: 0 })), dealer: [], turn: -1, phase: 'ante' };
  return { ps: T.ps.map(s => ({ ante: s.ante, cards: T.reveal ? s.cards : s.cards.map(() => -1), state: s.state, res: s.res, delta: s.delta, cat: T.reveal ? TCP_NAME[tcpCat(s.cards)] : '' })),
    dealer: T.reveal ? T.dealer : T.dealer.map(() => -1), dcat: T.reveal ? TCP_NAME[tcpCat(T.dealer)] : '', turn: T.turn, phase: T.phase };
}
const tcpPriv = (G, i) => (G.tc && G.tc.ps[i] ? { c: G.tc.ps[i].cards } : null);
let ST = null, tAmt = 10;
const hand = (cs, own) => cs.map((c, k) => (c < 0 ? (own ? card(own[k]) : backHTML()) : card(c))).join('');
const tcpUI = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table pz"><div class="bac-h"><b>Dealer</b><div class="cards" id="tcDealer"></div><span class="bac-t" id="tcDc"></span></div><div class="tc-seats" id="tcSeats"></div><div class="banner" id="tcBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="tcAct" hidden><div class="betrow" id="tcAmt"></div><div class="betrow" id="tcPlay"><button type="button" class="b gold" data-t="play">Play (add a second bet)</button><button type="button" class="b" data-t="fold">Fold</button></div><p class="hint bt-hint" id="tcHint"></p></div>`;
    $('tcAmt').onclick = e => { const b = e.target.closest('[data-amt]'); if (b && ST.turn && ST.turn.data.kind === 'ante') ST.send({ t: 'ante', amt: +b.dataset.amt }); };
    $('tcPlay').onclick = e => { const b = e.target.closest('[data-t]'); if (b && ST.turn && ST.turn.data.kind === 'play') ST.send({ t: b.dataset.t }); };
  },
  update(S) {
    ST = S; const V = S.V, g = V.g, own = S.my && S.my.c;
    $('tcDealer').innerHTML = hand(g.dealer, null); $('tcDc').textContent = g.dcat || '';
    $('tcSeats').innerHTML = V.seats.map((s, i) => { const p = g.ps[i], d = p.delta || 0;
      const tag = V.done ? (d > 0 ? `<div class="tag win">+${fmt(d)}</div>` : d < 0 ? `<div class="tag lose">${fmt(d)}</div>` : '<div class="tag dim">Even</div>') : `<div class="tag${p.state === 'played' ? ' hot' : ' dim'}">${p.state === 'played' ? 'Playing' : p.state === 'folded' ? 'Folded' : p.ante ? 'Ante ' + fmt(p.ante) : g.turn === i ? 'Thinking…' : ''}</div>`;
      return `<div class="seat${g.turn === i ? ' active' : ''}"><div class="cards">${p.cards.length ? hand(p.cards, i === S.me ? own : null) : ''}</div><div class="plate"><span class="name"><span>${esc(S.nameOf(i))}</span></span><span class="style">${esc(p.cat || S.tag(i))}</span><span class="stack">${fmt(s.stack)}</span></div>${tag}</div>`; }).join('');
    $('tcBanner').innerHTML = bannerOf(S, g);
    $('tcAct').hidden = !S.turn;
    if (S.turn) { const d = S.turn.data; $('tcAmt').hidden = d.kind !== 'ante'; $('tcPlay').hidden = d.kind !== 'play';
      if (d.kind === 'ante') { presetRow($('tcAmt'), d, 0); $('tcHint').textContent = 'Place your ante.'; }
      else $('tcHint').textContent = `Play adds a second bet of ${fmt(d.ante)}. The dealer needs Queen high or better to qualify. Fold loses your ante.`; }
    return '';
  },
};
Club.register({
  id: 'threecard', cat: 'casino', name: 'Three Card Poker', tag: 'A quick poker hand against the dealer.', min: 1, max: 6, soloBots: 2, roundWord: 'Hand',
  art: () => ['Q', 'K', 'A'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> hold a better three-card poker hand than the dealer. Chips are free and have no cash value.</p>
    <ol><li>Place an <b>ante</b> (your starting bet). Everyone, including the dealer, gets three cards.</li>
    <li>Look at your cards. Choose <b>Play</b> to add a second bet equal to your ante, or <b>Fold</b> and lose your ante.</li>
    <li>Hands, best to worst: straight flush, three of a kind, straight, flush, pair, high card.</li>
    <li>The dealer needs <b>Queen high or better</b> to qualify. If the dealer does not qualify, your ante wins 1 to 1 and your second bet is returned.</li>
    <li>If the dealer qualifies, a better hand wins both bets 1 to 1, a worse hand loses both, and a tie returns both.</li>
    <li>If you run out of chips, you get a fresh stack. For fun only.</li></ol>`,
  round: tcpRound, view: tcpView, priv: tcpPriv, ui: tcpUI, _test: { tcpRank },
});
})();
