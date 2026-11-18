/* ---------- Casino: Slots, Craps, Video Poker. Free chips only, no cash value ---------- */
(function () {
const LAB = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], SUI = ['♠', '♥', '♦', '♣'];
const card = c => faceHTML(LAB[c >> 2], SUI[c & 3], (c & 3) === 1 || (c & 3) === 2);
const FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const BETS = [10, 25, 50, 100];
const minBet = p => Math.min(10, p.stack);
const maxBet = (p, cap) => Math.max(minBet(p), Math.min(p.stack, cap || 500));
const delta = (p, d) => { p.delta = d; p.stack += d; };
function presetRow(el, d, sel, label) {
  const opts = [...new Set(BETS.filter(a => a >= d.min && a <= d.max).concat([d.max]))];
  el.innerHTML = opts.map(a => `<button type="button" class="pill${a === sel ? ' on' : ''}" data-amt="${a}">${label ? label + ' ' : ''}${fmt(a)}</button>`).join('');
}
function rows(S, g, inner, tagFn) {
  return S.V.seats.map((s, i) => {
    const p = g.ps[i] || {}, d = p.delta || 0;
    const tag = S.V.done ? (d > 0 ? `<div class="tag win">+${fmt(d)}</div>` : d < 0 ? `<div class="tag lose">${fmt(d)}</div>` : '<div class="tag dim">Even</div>') : tagFn(i, p);
    return `<div class="seat${g.turn === i ? ' active' : ''}">${inner(i, p)}<div class="plate"><span class="name"><span>${esc(S.nameOf(i))}</span></span><span class="style">${esc(S.tag(i))}</span><span class="stack">${fmt(s.stack)}</span></div>${tag}</div>`;
  }).join('');
}
const bannerOf = S => (S.V.done && S.V.summary.length ? S.V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '');
const curAmt = (cur, d) => (cur < d.min || cur > d.max ? Math.min(Math.max(10, d.min), d.max) : cur);

/* ===================== Slots ===================== */
const SYM = ['🍒', '🍋', '🔔', '⭐', '💎', '<b class="sl7">7</b>'], SYMN = ['cherry', 'lemon', 'bell', 'star', 'diamond', 'seven'];
const WT = [6, 5, 4, 3, 2, 1], PAY3 = [10, 15, 25, 50, 100, 250];
const spin1 = () => { let r = rnd(21), k = 0; while (r >= WT[k]) { r -= WT[k]; k++; } return k; };
function slotPay(r, bet) {
  if (r[0] === r[1] && r[1] === r[2]) return bet * PAY3[r[0]];
  if (r.filter(x => x === 0).length === 2) return Math.floor(bet / 2);
  return 0;
}
const blankSl = P => P.map(() => ({ bet: 0, reels: [null, null, null], res: '', delta: 0 }));
async function slotRound(G, io) {
  const P = G.players, n = P.length, L = G.sl = { ps: blankSl(P), turn: -1 };
  io.render(); await io.sleep(300);
  for (let i = 0; i < n; i++) {
    const p = P[i], s = L.ps[i], mn = minBet(p), mx = maxBet(p, 200); L.turn = i; io.render();
    const a = await io.turn(p, { min: mn, max: mx }, { auto: { t: 'spin', amt: mn },
      validate: x => (x && x.t === 'spin' && Number.isInteger(x.amt) && x.amt >= mn && x.amt <= mx ? { t: 'spin', amt: x.amt } : null),
      bot: () => ({ t: 'spin', amt: Math.min(mx, [10, 10, 20, 25][rnd(4)]) }), think: 500 });
    s.bet = a.amt; io.ev(p, `spins for ${fmt(a.amt)}`, `spin for ${fmt(a.amt)}`);
    for (let k = 0; k < 3; k++) { s.reels[k] = spin1(); io.render(); await io.sleep(450); }
    const pay = slotPay(s.reels, a.amt), d = pay > 0 ? pay : -a.amt;
    delta(p, d); s.delta = d; s.res = pay > 0 ? 'Win' : 'Lose';
    io.ev(p, pay > 0 ? `wins ${fmt(pay)}` : 'misses', pay > 0 ? `win ${fmt(pay)}` : 'miss');
    io.render(); await io.sleep(500);
  }
  L.turn = -1; potSummary(G); io.render();
}
function slotView(G) {
  const L = G.sl;
  if (!L || L.ps.length !== G.players.length) return { ps: blankSl(G.players), turn: -1 };
  return { ps: L.ps, turn: L.turn };
}
let SL = null, slAmt = 10;
const slotUI = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table pz"><div class="tc-seats" id="slSeats"></div><div class="pz-label sl-pay">3 matching pay: 🍒 10 · 🍋 15 · 🔔 25 · ⭐ 50 · 💎 100 · 7 250. Two cherries pay half.</div><div class="banner" id="slBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="slAct" hidden><div class="betrow" id="slAmt"></div><p class="hint bt-hint">Tap a stake to pull the lever. Three matching symbols win big.</p></div>`;
    $('slAmt').onclick = e => { const b = e.target.closest('[data-amt]'); if (b && SL.turn) { slAmt = +b.dataset.amt; SL.send({ t: 'spin', amt: slAmt }); } };
  },
  update(S) {
    SL = S; const V = S.V, g = V.g;
    $('slSeats').innerHTML = rows(S, g, (i, p) => `<div class="sl-reels">${p.reels.map(r => `<span class="sl-r">${r === null ? (g.turn === i && p.bet ? '…' : '') : SYM[r]}</span>`).join('')}</div>`,
      (i, p) => `<div class="tag${p.bet ? ' hot' : ' dim'}">${p.res ? `${p.res} · ${fmt(p.bet)}` : g.turn === i ? (p.bet ? 'Spinning…' : 'Betting…') : ''}</div>`);
    $('slBanner').innerHTML = bannerOf(S);
    $('slAct').hidden = !S.turn;
    if (S.turn) { const d = S.turn.data; slAmt = curAmt(slAmt, d); presetRow($('slAmt'), d, slAmt, 'Spin'); }
    return '';
  },
};
Club.register({
  id: 'slots', cat: 'casino', name: 'Slot Machine', tag: 'Pull the lever and line up the symbols.', min: 1, max: 8, soloBots: 2, roundWord: 'Spin',
  art: () => ['🍒', '<b class="sl7">7</b>', '💎'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> line up matching symbols to win free chips. It is pure luck. Chips have no cash value.</p>
    <ol><li>On your turn, tap a stake. The three reels spin and stop one after another.</li>
    <li>Three matching symbols pay: cherry 10 to 1, lemon 15, bell 25, star 50, diamond 100, lucky seven 250.</li>
    <li>Exactly two cherries pay half your stake.</li>
    <li>Anything else loses your stake. Every player spins once per round.</li>
    <li>If you run out of chips, you get a fresh stack. For fun only.</li></ol>`,
  round: slotRound, view: slotView, ui: slotUI, _test: { slotPay },
});

/* ===================== Craps ===================== */
const CR_KINDS = ['pass', 'dont', 'field'], CR_NAME = { pass: 'Pass line', dont: "Don't pass", field: 'Field' };
const blankCr = P => P.map(() => ({ bet: null, res: '', delta: 0 }));
async function crapsRound(G, io) {
  const P = G.players, n = P.length, sh = (G.round - 1) % n;
  const C = G.cr = { ps: blankCr(P), turn: -1, shooter: sh, dice: [], point: 0, phase: 'bet', hist: [] };
  io.render(); await io.sleep(300);
  for (let i = 0; i < n; i++) {
    const p = P[i], mn = minBet(p), mx = maxBet(p, 300); C.turn = i; io.render();
    const a = await io.turn(p, { kind: 'bet', min: mn, max: mx }, { auto: { t: 'bet', kind: 'pass', amt: mn },
      validate: x => (x && x.t === 'bet' && CR_KINDS.includes(x.kind) && Number.isInteger(x.amt) && x.amt >= mn && x.amt <= mx ? { t: 'bet', kind: x.kind, amt: x.amt } : null),
      bot: () => ({ t: 'bet', kind: ['pass', 'pass', 'dont', 'field'][rnd(4)], amt: Math.min(mx, [10, 20, 25][rnd(3)]) }), think: 500 });
    C.ps[i].bet = { kind: a.kind, amt: a.amt }; io.ev(p, `bets ${fmt(a.amt)} on ${CR_NAME[a.kind]}`, `bet ${fmt(a.amt)} on ${CR_NAME[a.kind]}`);
  }
  let outcome = '', first = true, rolls = 0, field = 0;
  while (!outcome && rolls < 60) {
    C.turn = sh; C.phase = first ? 'come' : 'point'; io.render();
    await io.turn(P[sh], { kind: 'roll', point: C.point }, { auto: { t: 'roll' }, validate: x => (x && x.t === 'roll' ? { t: 'roll' } : null), bot: () => ({ t: 'roll' }), think: 800 });
    const a = 1 + rnd(6), b = 1 + rnd(6), t = a + b; C.dice = [a, b]; rolls++; C.hist = [...C.hist, t].slice(-12); C.turn = -1;
    io.ev(P[sh], `rolls ${t}`, `roll ${t}`);
    if (first) {
      field = t; first = false;
      if (t === 7 || t === 11) outcome = 'pass'; else if (t === 2 || t === 3) outcome = 'dont'; else if (t === 12) outcome = 'bar'; else C.point = t;
    } else if (t === C.point) outcome = 'pass'; else if (t === 7) outcome = 'dont';
    io.render(); await io.sleep(900);
  }
  if (!outcome) outcome = 'push';
  C.phase = 'done'; io.line(`${outcome === 'pass' ? 'The shooter passes.' : outcome === 'push' ? 'No result. Bets pushed.' : outcome === 'bar' ? 'Twelve: the pass line loses, Don’t pass pushes.' : 'The shooter does not pass.'}`);
  P.forEach((p, i) => {
    const b = C.ps[i].bet; let d = 0;
    if (b.kind === 'pass') d = outcome === 'pass' ? b.amt : outcome === 'push' ? 0 : -b.amt;
    else if (b.kind === 'dont') d = outcome === 'dont' ? b.amt : outcome === 'pass' ? -b.amt : 0;
    else d = [3, 4, 9, 10, 11].includes(field) ? b.amt : [2, 12].includes(field) ? b.amt * 2 : -b.amt;
    delta(p, d); C.ps[i].delta = d; C.ps[i].res = d > 0 ? 'Win' : d < 0 ? 'Lose' : 'Push';
  });
  potSummary(G); io.render();
}
function crapsView(G) {
  const C = G.cr;
  if (!C || C.ps.length !== G.players.length) return { ps: blankCr(G.players), turn: -1, shooter: -1, dice: [], point: 0, phase: 'bet', hist: [] };
  return { ps: C.ps, turn: C.turn, shooter: C.shooter, dice: C.dice, point: C.point, phase: C.phase, hist: C.hist };
}
let SCR = null, cAmt = 10;
const crapsUI = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table pz"><div class="cr-puck" id="crPuck"></div><div class="bd-dice" id="crDice"></div><div class="pz-label" id="crTot"></div><div class="rl-hist" id="crHist"></div><div class="tc-seats" id="crSeats"></div><div class="banner" id="crBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="crAct" hidden><div id="crBetBox"><div class="betrow" id="crAmt"></div>
      <div class="betrow"><button type="button" class="b gold small" data-k="pass">Pass line (1 to 1)</button><button type="button" class="b small" data-k="dont">Don’t pass (1 to 1)</button><button type="button" class="b small" data-k="field">Field (one roll)</button></div></div>
      <div class="betrow" id="crRollBox"><button type="button" class="b gold" id="crRoll">Roll the dice</button></div><p class="hint bt-hint" id="crHint"></p></div>`;
    $('crAmt').onclick = e => { const b = e.target.closest('[data-amt]'); if (b) { cAmt = +b.dataset.amt; crapsUI.update(SCR); } };
    $('crBetBox').onclick = e => { const b = e.target.closest('[data-k]'); if (b && SCR.turn && SCR.turn.data.kind === 'bet') SCR.send({ t: 'bet', kind: b.dataset.k, amt: cAmt }); };
    $('crRoll').onclick = () => { if (SCR.turn && SCR.turn.data.kind === 'roll') SCR.send({ t: 'roll' }); };
  },
  update(S) {
    SCR = S; const V = S.V, g = V.g;
    $('crPuck').textContent = g.phase === 'bet' ? 'Place your bets' : g.point ? `Point is ${g.point}` : g.phase === 'done' ? '' : 'Come-out roll';
    $('crDice').innerHTML = g.dice.map(d => `<span class="die">${FACE[d]}</span>`).join('');
    $('crTot').textContent = g.dice.length ? `Total ${g.dice[0] + g.dice[1]}${g.shooter >= 0 ? ' · shooter: ' + S.nameOf(g.shooter) : ''}` : (g.shooter >= 0 ? `Shooter: ${S.nameOf(g.shooter)}` : '');
    $('crHist').innerHTML = g.hist.map(n => `<span class="rl-h">${n}</span>`).join('');
    $('crSeats').innerHTML = rows(S, g, () => '', (i, p) => `<div class="tag${p.bet ? ' hot' : ' dim'}">${p.bet ? `${fmt(p.bet.amt)} ${CR_NAME[p.bet.kind]}` : g.turn === i ? 'Betting…' : ''}</div>`);
    $('crBanner').innerHTML = bannerOf(S);
    $('crAct').hidden = !S.turn;
    if (S.turn) { const d = S.turn.data, bet = d.kind === 'bet';
      $('crBetBox').hidden = !bet; $('crRollBox').hidden = bet;
      if (bet) { cAmt = curAmt(cAmt, d); presetRow($('crAmt'), d, cAmt); $('crHint').textContent = 'Pick a stake, then a bet. Pass wins if the shooter passes. Field wins on the first roll only if it shows 2, 3, 4, 9, 10, 11 or 12.'; }
      else $('crHint').textContent = g.point ? `You are the shooter. Roll the point (${g.point}) before a 7.` : 'You are the shooter. Roll the come-out: 7 or 11 wins, 2, 3 or 12 loses.'; }
    return '';
  },
};
Club.register({
  id: 'craps', cat: 'casino', name: 'Craps', tag: 'Everyone bets on the shooter’s dice.', min: 1, max: 8, soloBots: 3, roundWord: 'Roll-out',
  art: () => [3, 4].map(c => `<div class="ltile">${FACE[c]}</div>`).concat(['7'].map(c => `<div class="ltile num">${c}</div>`)).join(''),
  rules: `<p><b>Goal:</b> end up with more free chips by betting on how the shooter’s two dice land. Chips have no cash value.</p>
    <ol><li>One player is the <b>shooter</b> each round, and it changes every round. Everyone bets before the dice roll.</li>
    <li><b>Pass line:</b> wins if the shooter “passes”. <b>Don’t pass:</b> wins if the shooter does not. <b>Field:</b> a bet on the first roll only. Pass and Don’t pass pay 1 to 1.</li>
    <li>The shooter rolls the <b>come-out roll</b>. A 7 or 11 passes. A 2, 3 or 12 is “craps” and the pass line loses (Don’t pass wins on 2 and 3, and pushes on 12).</li>
    <li>Any other number becomes the <b>point</b>. The shooter keeps rolling. Rolling the point again passes. Rolling a 7 first does not pass.</li>
    <li>The Field wins 1 to 1 on 3, 4, 9, 10, 11, pays 2 to 1 on 2 and 12, and loses on 5, 6, 7, 8.</li>
    <li>If you run out of chips, you get a fresh stack. For fun only.</li></ol>`,
  round: crapsRound, view: crapsView, ui: crapsUI,
});

/* ===================== Video Poker (Jacks or Better) ===================== */
const VP_NAME = ['Nothing', 'Jacks or Better', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];
const VP_PAY = [0, 0, 1, 2, 3, 5, 8, 24, 49, 249];     // profit per 1 staked; Jacks or Better is a push
function vpEval(cs) {
  const v = cs.map(c => { const r = c >> 2; return r === 0 ? 14 : r + 1; }).sort((a, b) => a - b);
  const flush = cs.every(c => (c & 3) === (cs[0] & 3)), cnt = {};
  v.forEach(x => { cnt[x] = (cnt[x] || 0) + 1; });
  const cc = Object.values(cnt).sort((a, b) => b - a), uniq = new Set(v).size === 5;
  const st = uniq && (v[4] - v[0] === 4 || v.join() === '2,3,4,5,14');
  if (st && flush) return v[0] === 10 ? 9 : 8;
  if (cc[0] === 4) return 7;
  if (cc[0] === 3 && cc[1] === 2) return 6;
  if (flush) return 5;
  if (st) return 4;
  if (cc[0] === 3) return 3;
  if (cc[0] === 2 && cc[1] === 2) return 2;
  if (cc[0] === 2 && +Object.keys(cnt).find(k => cnt[k] === 2) >= 11) return 1;
  return 0;
}
function vpBotHold(cs) {
  if (vpEval(cs) >= 4) return [true, true, true, true, true];
  const rk = cs.map(c => c >> 2), n = r => rk.filter(x => x === r).length;
  const pairs = cs.map((c, i) => n(rk[i]) >= 2);
  if (pairs.some(x => x)) return pairs;
  for (let s = 0; s < 4; s++) if (cs.filter(c => (c & 3) === s).length === 4) return cs.map(c => (c & 3) === s);
  let left = 3; return cs.map((c, i) => (rk[i] === 0 || rk[i] >= 10) && left-- > 0);
}
const blankVp = P => P.map(() => ({ bet: 0, cards: [], held: [], cat: -1, res: '', delta: 0 }));
async function vpRound(G, io) {
  const P = G.players, n = P.length, deck = shuffle([...Array(52).keys()]), V0 = G.vp = { ps: blankVp(P), turn: -1, phase: 'bet' };
  io.render(); await io.sleep(300);
  for (let i = 0; i < n; i++) {
    const p = P[i], s = V0.ps[i], mn = minBet(p), mx = maxBet(p, 200); V0.turn = i; V0.phase = 'bet'; io.render();
    const a = await io.turn(p, { kind: 'bet', min: mn, max: mx }, { auto: { t: 'bet', amt: mn },
      validate: x => (x && x.t === 'bet' && Number.isInteger(x.amt) && x.amt >= mn && x.amt <= mx ? { t: 'bet', amt: x.amt } : null),
      bot: () => ({ t: 'bet', amt: Math.min(mx, [10, 10, 20, 25][rnd(4)]) }), think: 400 });
    s.bet = a.amt; io.ev(p, `bets ${fmt(a.amt)}`, `bet ${fmt(a.amt)}`);
    for (let k = 0; k < 5; k++) { s.cards.push(deck.pop()); io.render(); await io.sleep(180); }
    V0.phase = 'hold'; io.render();
    const h = await io.turn(p, { kind: 'hold' }, { auto: { t: 'draw', hold: vpBotHold(s.cards) },
      validate: x => (x && x.t === 'draw' && Array.isArray(x.hold) && x.hold.length === 5 ? { t: 'draw', hold: x.hold.map(Boolean) } : null),
      bot: () => ({ t: 'draw', hold: vpBotHold(s.cards) }), think: 1000 });
    s.held = h.hold; io.render(); await io.sleep(400);
    s.cards = s.cards.map((c, k) => (h.hold[k] ? c : deck.pop())); V0.phase = 'show'; io.render();
    s.cat = vpEval(s.cards); const d = s.cat === 0 ? -a.amt : a.amt * VP_PAY[s.cat];
    delta(p, d); s.delta = d; s.res = VP_NAME[s.cat];
    io.ev(p, `finishes with ${s.cat ? VP_NAME[s.cat] : 'nothing'}`, `finish with ${s.cat ? VP_NAME[s.cat] : 'nothing'}`);
    await io.sleep(900);
  }
  V0.turn = -1; V0.phase = 'done'; potSummary(G); io.render();
}
function vpView(G) {
  const V0 = G.vp;
  if (!V0 || V0.ps.length !== G.players.length) return { ps: blankVp(G.players), turn: -1, phase: 'bet' };
  return { ps: V0.ps, turn: V0.turn, phase: V0.phase };
}
let SV = null, vAmt = 10, vHold = [false, false, false, false, false], vSeq = -1;
const vpUI = {
  mount(stage, ctl) {
    vHold = [false, false, false, false, false]; vSeq = -1;
    stage.innerHTML = `<section class="table pz"><div class="tc-seats" id="vpSeats"></div><div class="pz-label sl-pay">Pays: Two pair 1 · Three of a kind 2 · Straight 3 · Flush 5 · Full house 8 · Four of a kind 24 · Straight flush 49 · Royal 249 (to 1). Jacks or better returns your stake.</div><div class="banner" id="vpBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="vpAct" hidden><div class="betrow" id="vpAmt"></div><div class="betrow" id="vpDrawBox"><button type="button" class="b gold" id="vpDraw">Draw</button></div><p class="hint bt-hint" id="vpHint"></p></div>`;
    $('vpAmt').onclick = e => { const b = e.target.closest('[data-amt]'); if (b && SV.turn && SV.turn.data.kind === 'bet') { vAmt = +b.dataset.amt; SV.send({ t: 'bet', amt: vAmt }); } };
    $('vpDraw').onclick = () => { if (SV.turn && SV.turn.data.kind === 'hold') SV.send({ t: 'draw', hold: vHold.slice() }); };
    $('vpSeats').onclick = e => { const b = e.target.closest('[data-h]'); if (b && SV.turn && SV.turn.data.kind === 'hold') { vHold[+b.dataset.h] = !vHold[+b.dataset.h]; vpUI.update(SV); } };
  },
  update(S) {
    SV = S; const V = S.V, g = V.g, mineHold = !!(S.turn && S.turn.data.kind === 'hold');
    if (mineHold && vSeq !== S.turn.seq) { vSeq = S.turn.seq; vHold = [false, false, false, false, false]; }
    if (!mineHold) vSeq = -1;
    $('vpSeats').innerHTML = rows(S, g, (i, p) => {
      const mine = mineHold && i === S.me, held = mine ? vHold : p.held;
      return `<div class="cards">${p.cards.map((c, k) => mine ? `<button type="button" class="vp-card${held[k] ? ' held' : ''}" data-h="${k}" aria-pressed="${!!held[k]}" aria-label="Hold card ${k + 1}">${card(c)}</button>` : `<span class="vp-card${held[k] ? ' held' : ''}">${card(c)}</span>`).join('')}</div>` +
        `<div class="vp-held">${p.cards.map((c, k) => `<span>${held[k] ? 'HELD' : ''}</span>`).join('')}</div>`;
    }, (i, p) => `<div class="tag${p.bet ? ' hot' : ' dim'}">${p.res ? `${p.res}` : g.turn === i ? (p.bet ? 'Choosing…' : 'Betting…') : ''}</div>`);
    $('vpBanner').innerHTML = bannerOf(S);
    $('vpAct').hidden = !S.turn;
    if (S.turn) { const d = S.turn.data, bet = d.kind === 'bet';
      $('vpAmt').hidden = !bet; $('vpDrawBox').hidden = bet;
      if (bet) { vAmt = curAmt(vAmt, d); presetRow($('vpAmt'), d, vAmt, 'Deal'); $('vpHint').textContent = 'Tap a stake to be dealt five cards.'; }
      else $('vpHint').textContent = 'Tap the cards you want to keep, then press Draw. The rest are replaced. Jacks or better wins your stake back or more.'; }
    return '';
  },
};
Club.register({
  id: 'videopoker', cat: 'casino', name: 'Video Poker', tag: 'Jacks or Better. Keep the best cards and draw.', min: 1, max: 6, soloBots: 2, roundWord: 'Hand',
  art: () => ['J', 'J', 'K'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> make a poker hand of a pair of jacks or better. You play against the pay table, not the other players. Chips have no cash value.</p>
    <ol><li>Tap a stake and you are dealt <b>five cards</b>.</li>
    <li>Tap the cards you want to <b>keep</b> (they lift up and say HELD), then press <b>Draw</b>. The other cards are replaced once.</li>
    <li>Your final hand is paid from the table: jacks or better returns your stake, two pair pays 1 to 1, three of a kind 2, straight 3, flush 5, full house 8, four of a kind 24, straight flush 49, royal flush 249.</li>
    <li>Anything lower than a pair of jacks loses your stake.</li>
    <li>If you run out of chips, you get a fresh stack. For fun only.</li></ol>`,
  round: vpRound, view: vpView, ui: vpUI, _test: { vpEval, vpBotHold },
});
})();
