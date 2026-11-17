/* ---------- Casino 2: Keno, Let It Ride, Caribbean Stud, Red Dog. Free chips only, no cash value ---------- */
(function () {
const LAB = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], SUI = ['♠', '♥', '♦', '♣'];
const card = c => (c < 0 ? backHTML() : faceHTML(LAB[c >> 2], SUI[c & 3], (c & 3) === 1 || (c & 3) === 2));
const BETS = [10, 25, 50, 100];
const delta = (p, d) => { d = Math.max(d, -p.stack); p.delta = d; p.stack += d; };
const cv = c => { const r = c >> 2; return r === 0 ? 14 : r + 1; };
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
const cardsRow = cs => `<div class="cards">${cs.map(card).join('')}</div>`;
// largest stake so that `mult` stakes can still be covered
const limits = (p, mult) => { const mx = Math.max(1, Math.min(Math.floor(p.stack / mult), 150)); return { min: Math.min(10, mx), max: mx }; };

/* five-card hand evaluator: cat 0 high card .. 9 royal flush, key compares hands */
const HN = ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush', 'Royal flush'];
function ev5(cs) {
  const v = cs.map(cv).sort((a, b) => b - a), flush = cs.every(c => (c & 3) === (cs[0] & 3)), cnt = {};
  v.forEach(x => { cnt[x] = (cnt[x] || 0) + 1; });
  const g = Object.entries(cnt).map(([k, c]) => [+k, c]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  let st = g.length === 5 && (v[0] - v[4] === 4 || v.join() === '14,5,4,3,2'), hi = v[0]; if (st && v[0] === 14 && v[1] === 5) hi = 5;
  const c0 = g[0][1], c1 = g[1] ? g[1][1] : 0; let cat;
  if (st && flush) cat = hi === 14 ? 9 : 8; else if (c0 === 4) cat = 7; else if (c0 === 3 && c1 === 2) cat = 6; else if (flush) cat = 5; else if (st) cat = 4;
  else if (c0 === 3) cat = 3; else if (c0 === 2 && c1 === 2) cat = 2; else if (c0 === 2) cat = 1; else cat = 0;
  const ks = st ? [hi] : g.map(x => x[0]); let key = cat; for (let i = 0; i < 5; i++) key = key * 15 + (ks[i] || 0);
  return { cat, key, pair: cat === 1 ? g[0][0] : 0, v };
}

/* ===================== Keno ===================== */
const KENO = { 1: { 1: 3.6 }, 2: { 2: 15 }, 3: { 2: 2, 3: 45 }, 4: { 2: 1, 3: 8, 4: 110 }, 5: { 3: 3, 4: 25, 5: 500 }, 6: { 3: 2, 4: 7, 5: 65, 6: 1800 }, 7: { 3: 1, 4: 5, 5: 35, 6: 110, 7: 3500 }, 8: { 4: 3, 5: 15, 6: 80, 7: 900, 8: 10000 } };
const kenoRet = (k, h) => (KENO[k] && KENO[k][h]) || 0;
const blankKn = P => P.map(() => ({ bet: 0, picks: [], hits: 0, res: '', delta: 0 }));
const okPicks = a => Array.isArray(a) && a.length >= 1 && a.length <= 8 && new Set(a).size === a.length && a.every(x => Number.isInteger(x) && x >= 1 && x <= 80);
async function kenoRound(G, io) {
  const P = G.players, n = P.length, K = G.kn = { ps: blankKn(P), turn: -1, drawn: [], phase: 'bet' };
  io.render(); await io.sleep(300);
  for (let i = 0; i < n; i++) {
    const p = P[i], mn = Math.min(10, p.stack), mx = Math.max(mn, Math.min(p.stack, 200)); K.turn = i; io.render();
    const quick = () => shuffle([...Array(80).keys()].map(x => x + 1)).slice(0, 5);
    const a = await io.turn(p, { min: mn, max: mx }, { auto: { t: 'play', picks: quick(), amt: mn },
      validate: x => (x && x.t === 'play' && okPicks(x.picks) && Number.isInteger(x.amt) && x.amt >= mn && x.amt <= mx ? { t: 'play', picks: x.picks.slice().sort((a, b) => a - b), amt: x.amt } : null),
      bot: () => ({ t: 'play', picks: shuffle([...Array(80).keys()].map(x => x + 1)).slice(0, 3 + rnd(5)).sort((a, b) => a - b), amt: Math.min(mx, [10, 10, 20, 25][rnd(4)]) }), think: 600 });
    K.ps[i].bet = a.amt; K.ps[i].picks = a.picks; io.ev(p, `plays ${a.picks.length} spot${a.picks.length === 1 ? '' : 's'} for ${fmt(a.amt)}`, `play ${a.picks.length} spot${a.picks.length === 1 ? '' : 's'} for ${fmt(a.amt)}`);
  }
  K.turn = -1; K.phase = 'draw'; io.render(); await io.sleep(500);
  const balls = shuffle([...Array(80).keys()].map(x => x + 1)).slice(0, 20);
  for (let k = 0; k < 20; k += 4) { K.drawn.push(...balls.slice(k, k + 4)); io.render(); await io.sleep(550); }
  K.phase = 'done';
  P.forEach((p, i) => {
    const s = K.ps[i]; s.hits = s.picks.filter(x => K.drawn.includes(x)).length; const r = kenoRet(s.picks.length, s.hits), d = r ? Math.round((r - 1) * s.bet) : -s.bet;
    delta(p, d); s.delta = p.delta; s.res = `${s.hits} of ${s.picks.length}`;
  });
  potSummary(G); io.render();
}
function kenoView(G) {
  const K = G.kn;
  if (!K || K.ps.length !== G.players.length) return { ps: blankKn(G.players), turn: -1, drawn: [], phase: 'bet' };
  return { ps: K.ps, turn: K.turn, drawn: K.drawn, phase: K.phase };
}
let SK = null, kAmt = 10, kPick = [], kSeq = -1;
const kenoUI = {
  mount(stage, ctl) {
    kPick = []; kSeq = -1;
    stage.innerHTML = `<section class="table pz"><div class="kn-grid" id="knGrid">${Array.from({ length: 80 }, (_, i) => `<button type="button" class="kn-n" data-n="${i + 1}">${i + 1}</button>`).join('')}</div><div class="pz-label sl-pay" id="knInfo"></div><div class="tc-seats" id="knSeats"></div><div class="banner" id="knBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="knAct" hidden><div class="betrow"><button type="button" class="pill" id="knQuick">Quick pick 5</button><button type="button" class="ghost" id="knClear">Clear</button></div><div class="betrow" id="knAmt"></div><p class="hint bt-hint" id="knHint"></p></div>`;
    $('knGrid').onclick = e => { const b = e.target.closest('[data-n]'); if (!b || !SK.turn) return; const n = +b.dataset.n, k = kPick.indexOf(n); if (k >= 0) kPick.splice(k, 1); else if (kPick.length < 8) kPick.push(n); kenoUI.update(SK); };
    $('knQuick').onclick = () => { if (SK.turn) { kPick = shuffle([...Array(80).keys()].map(x => x + 1)).slice(0, 5); kenoUI.update(SK); } };
    $('knClear').onclick = () => { kPick = []; if (SK.turn) kenoUI.update(SK); };
    $('knAmt').onclick = e => { const b = e.target.closest('[data-amt]'); if (!b || !SK.turn) return; kAmt = +b.dataset.amt; if (kPick.length < 1) { $('knHint').textContent = 'Pick at least one number first.'; return; } SK.send({ t: 'play', picks: kPick.slice().sort((a, c) => a - c), amt: kAmt }); };
  },
  update(S) {
    SK = S; const V = S.V, g = V.g, mine = S.turn ? kPick : (g.ps[S.me] ? g.ps[S.me].picks : []);
    if (S.turn && kSeq !== S.turn.seq) { kSeq = S.turn.seq; kPick = []; }
    if (!S.turn) kSeq = -1;
    document.querySelectorAll('#knGrid .kn-n').forEach(b => { const n = +b.dataset.n, d = g.drawn.includes(n), m = mine.includes(n);
      b.className = 'kn-n' + (d ? ' drawn' : '') + (m ? (d ? ' hit' : ' pick') : ''); b.setAttribute('aria-pressed', m); });
    const sp = (S.turn ? kPick : mine).length; const k = sp;
    $('knInfo').textContent = S.turn ? `${sp} of 8 numbers chosen. ${k && KENO[k] ? 'Best prize: ' + fmt(Math.max(...Object.values(KENO[k])) - 1) + ' to 1.' : ''}` : g.drawn.length ? `${g.drawn.length} of 20 numbers drawn.` : '';
    $('knSeats').innerHTML = rows(S, g, () => '', (i, p) => `<div class="tag${p.bet ? ' hot' : ' dim'}">${p.bet ? `${p.picks.length} spots · ${fmt(p.bet)}` : g.turn === i ? 'Picking…' : ''}</div>`);
    $('knBanner').innerHTML = bannerOf(S);
    $('knAct').hidden = !S.turn;
    if (S.turn) { const d = S.turn.data; kAmt = curAmt(kAmt, d); presetRow($('knAmt'), d, kAmt, 'Play'); if (!$('knHint').textContent.startsWith('Pick at least')) $('knHint').textContent = 'Choose 1 to 8 numbers, then tap a stake to play. 20 of the 80 numbers are drawn.'; if (sp) $('knHint').textContent = 'Choose 1 to 8 numbers, then tap a stake to play. 20 of the 80 numbers are drawn.'; }
    return '';
  },
};
Club.register({
  id: 'keno', cat: 'casino', name: 'Keno', tag: 'Pick up to 8 numbers and match the draw.', min: 1, max: 8, soloBots: 2, roundWord: 'Draw',
  art: () => ['7', '23', '64'].map(c => `<div class="ltile num">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> pick numbers that are drawn. The more you match, the more you win. It is luck, for free chips only.</p>
    <ol><li>On your turn, tap <b>1 to 8 numbers</b> from the board of 1 to 80 (or use Quick pick).</li>
    <li>Tap a stake to play. When everyone has chosen, <b>20 numbers</b> are drawn.</li>
    <li>You win according to how many of your numbers were drawn. Picking fewer numbers wins more often, but picking more numbers has bigger top prizes. For example, 5 numbers with all 5 matched pays 499 to 1.</li>
    <li>Your numbers that are drawn light up gold. Numbers that were drawn but not picked light up blue.</li>
    <li>If you run out of chips, you get a fresh stack. For fun only.</li></ol>`,
  round: kenoRound, view: kenoView, ui: kenoUI, _test: { kenoRet, KENO },
});

/* ===================== Let It Ride ===================== */
const LIR_PAY = [0, 1, 2, 3, 5, 8, 11, 50, 200, 1000];
const lirWin = e => e.cat >= 2 || (e.cat === 1 && e.pair >= 10);
function lirStrong(cs, stage) {
  const rk = cs.map(cv), cnt = x => rk.filter(y => y === x).length;
  if (rk.some(x => cnt(x) >= 3)) return true;
  if (rk.some(x => x >= 10 && cnt(x) >= 2)) return true;
  const suited = s => cs.filter(c => (c & 3) === s).length;
  if (stage === 1) { const u = [...rk].sort((a, b) => a - b); return [0, 1, 2, 3].some(s => suited(s) === 3) && (u[2] - u[0] === 2 || u[0] >= 10); }
  if ([0, 1, 2, 3].some(s => suited(s) === 4)) return true;
  const u = [...new Set(rk)].sort((a, b) => a - b); return u.length === 4 && u[3] - u[0] === 3;
}
const blankLir = P => P.map(() => ({ bet: 0, cards: [], units: 3, res: '', delta: 0 }));
async function lirRound(G, io) {
  const P = G.players, n = P.length, deck = shuffle([...Array(52).keys()]);
  const L = G.lr = { ps: blankLir(P), turn: -1, comm: [deck.pop(), deck.pop()], shown: 0, phase: 'bet', kind: '' };
  io.render(); await io.sleep(300);
  for (let i = 0; i < n; i++) {
    const p = P[i], lim = limits(p, 3); L.turn = i; io.render();
    const a = await io.turn(p, { kind: 'bet', min: lim.min, max: lim.max }, { auto: { t: 'bet', amt: lim.min },
      validate: x => (x && x.t === 'bet' && Number.isInteger(x.amt) && x.amt >= lim.min && x.amt <= lim.max ? { t: 'bet', amt: x.amt } : null),
      bot: () => ({ t: 'bet', amt: Math.min(lim.max, [10, 10, 20, 25][rnd(4)]) }), think: 400 });
    L.ps[i].bet = a.amt; io.ev(p, `bets ${fmt(a.amt)} on three spots`, `bet ${fmt(a.amt)} on three spots`);
  }
  L.phase = 'deal'; L.turn = -1;
  for (let r = 0; r < 3; r++) { L.ps.forEach(s => s.cards.push(deck.pop())); io.render(); await io.sleep(300); }
  for (const stage of [1, 2]) {
    L.phase = 'decide'; L.kind = 'd' + stage;
    if (stage === 2) { L.shown = 1; io.render(); await io.sleep(600); }
    for (let i = 0; i < n; i++) {
      const p = P[i], s = L.ps[i]; L.turn = i; io.render();
      const cs = stage === 1 ? s.cards : s.cards.concat(L.comm[0]);
      const a = await io.turn(p, { kind: 'decide', stage, bet: s.bet, units: s.units }, { auto: { t: 'ride' },
        validate: x => (x && (x.t === 'ride' || x.t === 'pull') ? { t: x.t } : null),
        bot: () => ({ t: lirStrong(cs, stage) || Math.random() < 0.05 ? 'ride' : 'pull' }), think: 700 });
      if (a.t === 'pull') { s.units--; io.ev(p, `pulls back bet ${stage}`, `pull back bet ${stage}`); } else io.ev(p, 'lets it ride', 'let it ride');
    }
  }
  L.turn = -1; L.shown = 2; L.phase = 'done'; io.render(); await io.sleep(900);
  P.forEach((p, i) => {
    const s = L.ps[i], e = ev5(s.cards.concat(L.comm)); s.cat = HN[e.cat];
    const d = lirWin(e) ? s.units * s.bet * LIR_PAY[e.cat] : -s.units * s.bet;
    delta(p, d); s.delta = p.delta; s.res = lirWin(e) ? HN[e.cat] : 'No pay';
  });
  potSummary(G); io.render();
}
function lirView(G) {
  const L = G.lr;
  if (!L || L.ps.length !== G.players.length) return { ps: blankLir(G.players), turn: -1, comm: [-1, -1], phase: 'bet', kind: '' };
  return { ps: L.ps, turn: L.turn, comm: L.comm.map((c, k) => (k < L.shown ? c : -1)), phase: L.phase, kind: L.kind };
}
let SLR = null, lAmt = 10;
const lirUI = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table pz"><div class="bac-h"><b>Community cards</b><div class="cards" id="lrComm"></div></div><div class="tc-seats" id="lrSeats"></div><div class="banner" id="lrBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="lrAct" hidden><div class="betrow" id="lrAmt"></div><div class="betrow" id="lrDec"><button type="button" class="b gold" data-t="ride">Let it ride</button><button type="button" class="b" data-t="pull">Pull back a bet</button></div><p class="hint bt-hint" id="lrHint"></p></div>`;
    $('lrAmt').onclick = e => { const b = e.target.closest('[data-amt]'); if (b && SLR.turn && SLR.turn.data.kind === 'bet') SLR.send({ t: 'bet', amt: +b.dataset.amt }); };
    $('lrDec').onclick = e => { const b = e.target.closest('[data-t]'); if (b && SLR.turn && SLR.turn.data.kind === 'decide') SLR.send({ t: b.dataset.t }); };
  },
  update(S) {
    SLR = S; const V = S.V, g = V.g;
    $('lrComm').innerHTML = g.comm.map(card).join('');
    $('lrSeats').innerHTML = rows(S, g, (i, p) => (p.cards.length ? cardsRow(p.cards) : ''), (i, p) => `<div class="tag${p.bet ? ' hot' : ' dim'}">${p.res ? p.res : p.bet ? `${p.units} bet${p.units === 1 ? '' : 's'} × ${fmt(p.bet)}` : g.turn === i ? 'Betting…' : ''}</div>`);
    $('lrBanner').innerHTML = bannerOf(S);
    $('lrAct').hidden = !S.turn;
    if (S.turn) { const d = S.turn.data, bet = d.kind === 'bet'; $('lrAmt').hidden = !bet; $('lrDec').hidden = bet;
      if (bet) { lAmt = curAmt(lAmt, d); presetRow($('lrAmt'), d, lAmt, 'Bet'); $('lrHint').textContent = 'Your stake is placed on three equal spots, so you risk three times this amount.'; }
      else $('lrHint').textContent = d.stage === 1 ? 'Look at your three cards. Pull back one bet, or let it ride.' : 'One community card is shown. Pull back a second bet, or let it ride. The last bet always stays.'; }
    return '';
  },
};
Club.register({
  id: 'letitride', cat: 'casino', name: 'Let It Ride', tag: 'Three bets. Pull them back or let them ride.', min: 1, max: 6, soloBots: 2, roundWord: 'Hand',
  art: () => ['10', 'J', 'Q'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> make a five-card poker hand of a pair of tens or better, using your three cards and two community cards. You play against the pay table. Chips have no cash value.</p>
    <ol><li>Tap a stake. It is placed as <b>three equal bets</b>.</li>
    <li>You get three cards. Look at them, then choose to <b>pull back</b> your first bet or <b>let it ride</b>.</li>
    <li>One community card is shown. Pull back your second bet or let it ride. Your third bet always stays.</li>
    <li>The second community card is shown. Your five-card hand is paid on every bet still riding: pair of tens or better 1 to 1, two pair 2, three of a kind 3, straight 5, flush 8, full house 11, four of a kind 50, straight flush 200, royal flush 1000.</li>
    <li>A hand worse than a pair of tens loses every bet still riding.</li>
    <li>If you run out of chips, you get a fresh stack. For fun only.</li></ol>`,
  round: lirRound, view: lirView, ui: lirUI, _test: { ev5, lirStrong },
});

/* ===================== Caribbean Stud ===================== */
const CS_PAY = [0, 1, 2, 3, 4, 5, 7, 20, 50, 100];
const csQual = e => e.cat >= 1 || (e.v.includes(14) && e.v.includes(13));
function csRaise(e, up) { return e.cat >= 1 || (e.v.includes(14) && e.v.includes(13)) || (e.v[0] >= 12 && e.v[0] > cv(up)); }
const blankCs = P => P.map(() => ({ ante: 0, cards: [], state: 'wait', res: '', delta: 0 }));
async function csRound(G, io) {
  const P = G.players, n = P.length, deck = shuffle([...Array(52).keys()]);
  const T = G.cs = { ps: blankCs(P), dealer: [], turn: -1, reveal: false, phase: 'ante' };
  io.render(); await io.sleep(300);
  for (let i = 0; i < n; i++) {
    const p = P[i], lim = limits(p, 3); T.turn = i; io.render();
    const a = await io.turn(p, { kind: 'ante', min: lim.min, max: lim.max }, { auto: { t: 'ante', amt: lim.min },
      validate: x => (x && x.t === 'ante' && Number.isInteger(x.amt) && x.amt >= lim.min && x.amt <= lim.max ? { t: 'ante', amt: x.amt } : null),
      bot: () => ({ t: 'ante', amt: Math.min(lim.max, [10, 10, 20, 25][rnd(4)]) }), think: 400 });
    T.ps[i].ante = a.amt; io.ev(p, `antes ${fmt(a.amt)}`, `ante ${fmt(a.amt)}`);
  }
  T.turn = -1; T.phase = 'deal';
  for (let r = 0; r < 5; r++) { T.ps.forEach(s => s.cards.push(deck.pop())); T.dealer.push(deck.pop()); io.render(); await io.sleep(250); }
  T.phase = 'play';
  for (let i = 0; i < n; i++) {
    const p = P[i], s = T.ps[i]; T.turn = i; io.render();
    const e = ev5(s.cards);
    const a = await io.turn(p, { kind: 'play', ante: s.ante, up: T.dealer[0] }, { auto: { t: 'raise' }, validate: x => (x && (x.t === 'raise' || x.t === 'fold') ? { t: x.t } : null),
      bot: () => ({ t: csRaise(e, T.dealer[0]) ? 'raise' : 'fold' }), think: 800 });
    s.state = a.t === 'raise' ? 'raised' : 'folded'; io.ev(p, a.t === 'raise' ? `raises ${fmt(s.ante * 2)}` : 'folds', a.t === 'raise' ? `raise ${fmt(s.ante * 2)}` : 'fold');
  }
  T.turn = -1; T.phase = 'show'; T.reveal = true; io.render(); await io.sleep(1200);
  const de = ev5(T.dealer), qual = csQual(de); T.dcat = HN[de.cat];
  io.line(`Dealer shows ${HN[de.cat]}${qual ? '' : ' and does not qualify'}.`);
  P.forEach((p, i) => {
    const s = T.ps[i], e = ev5(s.cards); s.cat = HN[e.cat]; let d;
    if (s.state === 'folded') { d = -s.ante; s.res = 'Folded'; }
    else if (!qual) { d = s.ante; s.res = 'Dealer does not qualify'; }
    else if (e.key > de.key) { d = s.ante + s.ante * 2 * CS_PAY[e.cat]; s.res = 'Win'; }
    else if (e.key < de.key) { d = -s.ante * 3; s.res = 'Lose'; } else { d = 0; s.res = 'Push'; }
    delta(p, d); s.delta = p.delta;
  });
  potSummary(G); io.render();
}
function csView(G) {
  const T = G.cs;
  if (!T || T.ps.length !== G.players.length) return { ps: blankCs(G.players), dealer: [], turn: -1, phase: 'ante', dcat: '' };
  return { ps: T.ps, dealer: T.reveal ? T.dealer : T.dealer.map((c, k) => (k === 0 ? c : -1)), turn: T.turn, phase: T.phase, dcat: T.reveal ? T.dcat : '' };
}
let SCS = null, csAmt = 10;
const csUI = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table pz"><div class="bac-h"><b>Dealer</b><div class="cards" id="csDealer"></div><span class="bac-t" id="csDc"></span></div><div class="tc-seats" id="csSeats"></div><div class="banner" id="csBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="csAct" hidden><div class="betrow" id="csAmt"></div><div class="betrow" id="csPlay"><button type="button" class="b gold" data-t="raise">Raise (double ante ×2)</button><button type="button" class="b" data-t="fold">Fold</button></div><p class="hint bt-hint" id="csHint"></p></div>`;
    $('csAmt').onclick = e => { const b = e.target.closest('[data-amt]'); if (b && SCS.turn && SCS.turn.data.kind === 'ante') SCS.send({ t: 'ante', amt: +b.dataset.amt }); };
    $('csPlay').onclick = e => { const b = e.target.closest('[data-t]'); if (b && SCS.turn && SCS.turn.data.kind === 'play') SCS.send({ t: b.dataset.t }); };
  },
  update(S) {
    SCS = S; const V = S.V, g = V.g;
    $('csDealer').innerHTML = g.dealer.map(card).join(''); $('csDc').textContent = g.dcat || '';
    $('csSeats').innerHTML = rows(S, g, (i, p) => (p.cards.length ? cardsRow(p.cards) : ''), (i, p) => `<div class="tag${p.state === 'raised' ? ' hot' : ' dim'}">${p.res ? p.res : p.state === 'raised' ? 'Raised' : p.state === 'folded' ? 'Folded' : p.ante ? 'Ante ' + fmt(p.ante) : g.turn === i ? 'Thinking…' : ''}</div>`);
    $('csBanner').innerHTML = bannerOf(S);
    $('csAct').hidden = !S.turn;
    if (S.turn) { const d = S.turn.data, ante = d.kind === 'ante'; $('csAmt').hidden = !ante; $('csPlay').hidden = ante;
      if (ante) { csAmt = curAmt(csAmt, d); presetRow($('csAmt'), d, csAmt, 'Ante'); $('csHint').textContent = 'Place your ante. A raise later costs double the ante.'; }
      else $('csHint').textContent = `Raise adds ${fmt(d.ante * 2)}. The dealer needs Ace-King or better to qualify. Fold loses your ante.`; }
    return '';
  },
};
Club.register({
  id: 'caribbean', cat: 'casino', name: 'Caribbean Stud', tag: 'Five-card poker against the dealer. Raise or fold.', min: 1, max: 6, soloBots: 2, roundWord: 'Hand',
  art: () => ['A', 'K', '♦'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> beat the dealer’s five-card poker hand. Chips have no cash value.</p>
    <ol><li>Place an <b>ante</b>. You and the dealer each get five cards. You see yours and one of the dealer’s.</li>
    <li>Choose <b>Raise</b> (a bet of twice your ante) or <b>Fold</b> (lose your ante).</li>
    <li>The dealer qualifies with <b>Ace-King high or better</b>. If the dealer does not qualify, your ante wins 1 to 1 and your raise is returned.</li>
    <li>If the dealer qualifies, the better hand wins. When you win, your ante pays 1 to 1 and your raise pays by hand: pair 1, two pair 2, three of a kind 3, straight 4, flush 5, full house 7, four of a kind 20, straight flush 50, royal flush 100 (to 1).</li>
    <li>If the dealer’s hand is better, you lose both bets. A tie returns both.</li>
    <li>If you run out of chips, you get a fresh stack. For fun only.</li></ol>`,
  round: csRound, view: csView, ui: csUI, _test: { ev5 },
});

/* ===================== Red Dog ===================== */
const RD_PAY = s => (s === 1 ? 5 : s === 2 ? 4 : s === 3 ? 2 : 1);
const blankRd = P => P.map(() => ({ bet: 0, raised: false, res: '', delta: 0 }));
async function rdRound(G, io) {
  const P = G.players, n = P.length, deck = shuffle([...Array(52).keys()]);
  const R = G.rd = { ps: blankRd(P), turn: -1, cards: [], spread: 0, kind: '', phase: 'bet' };
  io.render(); await io.sleep(300);
  for (let i = 0; i < n; i++) {
    const p = P[i], lim = limits(p, 2); R.turn = i; io.render();
    const a = await io.turn(p, { kind: 'bet', min: lim.min, max: lim.max }, { auto: { t: 'bet', amt: lim.min },
      validate: x => (x && x.t === 'bet' && Number.isInteger(x.amt) && x.amt >= lim.min && x.amt <= lim.max ? { t: 'bet', amt: x.amt } : null),
      bot: () => ({ t: 'bet', amt: Math.min(lim.max, [10, 10, 20, 25][rnd(4)]) }), think: 400 });
    R.ps[i].bet = a.amt; io.ev(p, `bets ${fmt(a.amt)}`, `bet ${fmt(a.amt)}`);
  }
  R.turn = -1; R.phase = 'deal'; R.cards = [deck.pop(), deck.pop()]; io.render(); await io.sleep(700);
  const a = cv(R.cards[0]), b = cv(R.cards[1]), spread = Math.abs(a - b) - 1;
  R.spread = spread; R.kind = a === b ? 'pair' : spread === 0 ? 'consec' : 'spread'; R.phase = 'decide'; io.line(R.kind === 'pair' ? 'A pair: no spread.' : R.kind === 'consec' ? 'Consecutive cards: no spread.' : `The spread is ${spread}.`);
  if (R.kind === 'spread') {
    for (let i = 0; i < n; i++) {
      const p = P[i], s = R.ps[i], mx = Math.min(s.bet, Math.max(0, p.stack - s.bet)); R.turn = i; io.render();
      if (mx < 1) continue;
      const r = await io.turn(p, { kind: 'raise', spread, bet: s.bet, raise: s.bet }, { auto: { t: 'hold' },
        validate: x => (x && (x.t === 'raise' || x.t === 'hold') ? { t: x.t } : null), bot: () => ({ t: spread >= 7 ? 'raise' : 'hold' }), think: 700 });
      if (r.t === 'raise') { s.raised = true; io.ev(p, 'doubles the bet', 'double the bet'); }
    }
  }
  R.turn = -1; R.phase = 'third'; R.cards.push(deck.pop()); io.render(); await io.sleep(1000);
  const t = cv(R.cards[2]), lo = Math.min(a, b), hi = Math.max(a, b);
  R.phase = 'done'; io.line(`The third card is ${LAB[R.cards[2] >> 2]}.`);
  P.forEach((p, i) => {
    const s = R.ps[i], stake = s.bet * (s.raised ? 2 : 1); let d = 0;
    if (R.kind === 'pair') d = t === a ? s.bet * 11 : 0;
    else if (R.kind === 'spread') d = t > lo && t < hi ? stake * RD_PAY(spread) : -stake;
    delta(p, d); s.delta = p.delta; s.res = d > 0 ? 'Win' : d < 0 ? 'Lose' : 'Push';
  });
  potSummary(G); io.render();
}
function rdView(G) {
  const R = G.rd;
  if (!R || R.ps.length !== G.players.length) return { ps: blankRd(G.players), turn: -1, cards: [], spread: 0, kind: '', phase: 'bet' };
  return { ps: R.ps, turn: R.turn, cards: R.cards, spread: R.spread, kind: R.kind, phase: R.phase };
}
let SRD = null, rdAmt = 10;
const rdUI = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table pz"><div class="cards" id="rdCards"></div><div class="pz-label" id="rdInfo"></div><div class="tc-seats" id="rdSeats"></div><div class="banner" id="rdBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="rdAct" hidden><div class="betrow" id="rdAmt"></div><div class="betrow" id="rdDec"><button type="button" class="b gold" data-t="raise">Double your bet</button><button type="button" class="b" data-t="hold">Keep your bet</button></div><p class="hint bt-hint" id="rdHint"></p></div>`;
    $('rdAmt').onclick = e => { const b = e.target.closest('[data-amt]'); if (b && SRD.turn && SRD.turn.data.kind === 'bet') SRD.send({ t: 'bet', amt: +b.dataset.amt }); };
    $('rdDec').onclick = e => { const b = e.target.closest('[data-t]'); if (b && SRD.turn && SRD.turn.data.kind === 'raise') SRD.send({ t: b.dataset.t }); };
  },
  update(S) {
    SRD = S; const V = S.V, g = V.g;
    $('rdCards').innerHTML = g.cards.map((c, k) => (k === 2 ? `<span class="rd-third">${card(c)}</span>` : card(c))).join('');
    $('rdInfo').textContent = g.cards.length >= 2 ? (g.kind === 'pair' ? 'A pair. Only a third matching card wins (11 to 1).' : g.kind === 'consec' ? 'Consecutive cards. No spread, so bets are returned.' : `Spread of ${g.spread}. The third card must land between them. Pays ${RD_PAY(g.spread)} to 1.`) : '';
    $('rdSeats').innerHTML = rows(S, g, () => '', (i, p) => `<div class="tag${p.bet ? ' hot' : ' dim'}">${p.res ? p.res : p.bet ? `${fmt(p.bet)}${p.raised ? ' ×2' : ''}` : g.turn === i ? 'Betting…' : ''}</div>`);
    $('rdBanner').innerHTML = bannerOf(S);
    $('rdAct').hidden = !S.turn;
    if (S.turn) { const d = S.turn.data, bet = d.kind === 'bet'; $('rdAmt').hidden = !bet; $('rdDec').hidden = bet;
      if (bet) { rdAmt = curAmt(rdAmt, d); presetRow($('rdAmt'), d, rdAmt, 'Bet'); $('rdHint').textContent = 'Place a bet. Two cards are dealt, then a third. You win if the third lands between the first two.'; }
      else $('rdHint').textContent = `Spread of ${d.spread}, paying ${RD_PAY(d.spread)} to 1. Double your bet? A wide spread is more likely to win.`; }
    return '';
  },
};
Club.register({
  id: 'reddog', cat: 'casino', name: 'Red Dog', tag: 'Will the third card land between the first two?', min: 1, max: 8, soloBots: 2, roundWord: 'Deal',
  art: () => ['3', '?', '10'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> guess that a third card lands between two cards. Chips have no cash value.</p>
    <ol><li>Place a bet. Two cards are dealt face up. Aces are high.</li>
    <li>The <b>spread</b> is the number of ranks between them. A 4 and a 9 have a spread of 4 (5, 6, 7, 8).</li>
    <li>If the cards are <b>consecutive</b>, nobody wins or loses. If they are a <b>pair</b>, only a third card of the same rank wins (11 to 1).</li>
    <li>Otherwise you may <b>double</b> your bet. Then a third card is dealt. If it lands between the first two, you win. Otherwise you lose.</li>
    <li>Payouts: spread 1 pays 5 to 1, spread 2 pays 4 to 1, spread 3 pays 2 to 1, spread 4 or more pays 1 to 1. Doubling doubles the win and the loss.</li>
    <li>If you run out of chips, you get a fresh stack. For fun only.</li></ol>`,
  round: rdRound, view: rdView, ui: rdUI,
});
})();
