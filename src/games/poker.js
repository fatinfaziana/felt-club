/* ---------- Texas Hold'em ---------- */
(function () {
const SB = 10, BB = 20;
const RANK_CH = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RANK_NAME = ['Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Jack','Queen','King','Ace'];
const SUIT_CH = ['♠','♥','♦','♣'];
const plural = r => RANK_NAME[r] + (r === 4 ? 'es' : 's');

function enc(cat, ks) { let v = cat; for (let i = 0; i < 5; i++) v = v * 13 + (ks[i] ?? 0); return v; }
function straightHigh(mask) {
  for (let h = 12; h >= 4; h--) if (((mask >> (h - 4)) & 31) === 31) return h;
  return (mask & 0x100F) === 0x100F ? 3 : -1;
}
// Best hand from 2 to 7 cards. Higher number wins.
function evaluate(cards) {
  const rc = new Array(13).fill(0), sc = [0, 0, 0, 0];
  let mask = 0;
  for (const c of cards) { rc[c >> 2]++; sc[c & 3]++; mask |= 1 << (c >> 2); }
  const fs = sc.findIndex(n => n >= 5);
  let fr = null;
  if (fs >= 0) {
    fr = []; let m = 0;
    for (const c of cards) if ((c & 3) === fs) { fr.push(c >> 2); m |= 1 << (c >> 2); }
    const sh = straightHigh(m);
    if (sh >= 0) return enc(8, [sh]);
  }
  const quads = [], trips = [], pairs = [], singles = [];
  for (let r = 12; r >= 0; r--) {
    if (rc[r] === 4) quads.push(r); else if (rc[r] === 3) trips.push(r);
    else if (rc[r] === 2) pairs.push(r); else if (rc[r] === 1) singles.push(r);
  }
  const rest = ex => { const o = []; for (let r = 12; r >= 0; r--) if (rc[r] && !ex.includes(r)) o.push(r); return o; };
  if (quads.length) return enc(7, [quads[0], rest([quads[0]])[0]]);
  if (trips.length && (trips.length > 1 || pairs.length))
    return enc(6, [trips[0], Math.max(trips[1] ?? -1, pairs[0] ?? -1)]);
  if (fr) return enc(5, fr.sort((a, b) => b - a).slice(0, 5));
  const sh = straightHigh(mask);
  if (sh >= 0) return enc(4, [sh]);
  if (trips.length) return enc(3, [trips[0], ...rest([trips[0]]).slice(0, 2)]);
  if (pairs.length >= 2) return enc(2, [pairs[0], pairs[1], rest([pairs[0], pairs[1]])[0]]);
  if (pairs.length) return enc(1, [pairs[0], ...singles.slice(0, 3)]);
  return enc(0, singles.slice(0, 5));
}
function describe(score) {
  const k = []; let v = score;
  for (let i = 0; i < 5; i++) { k.unshift(v % 13); v = Math.floor(v / 13); }
  switch (v) {
    case 8: return k[0] === 12 ? 'a royal flush' : `a straight flush, ${RANK_NAME[k[0]]} high`;
    case 7: return `four ${plural(k[0])}`;
    case 6: return `a full house, ${plural(k[0])} over ${plural(k[1])}`;
    case 5: return `a flush, ${RANK_NAME[k[0]]} high`;
    case 4: return `a straight, ${RANK_NAME[k[0]]} high`;
    case 3: return `three ${plural(k[0])}`;
    case 2: return `two pair, ${plural(k[0])} and ${plural(k[1])}`;
    case 1: return `a pair of ${plural(k[0])}`;
    default: return `${RANK_NAME[k[0]]} high`;
  }
}
// Chance of winning against nOpp random hands, by dealing out the rest many times.
function equity(hole, board, nOpp, iters) {
  const used = new Set([...hole, ...board]), deck = [];
  for (let c = 0; c < 52; c++) if (!used.has(c)) deck.push(c);
  const need = 5 - board.length + 2 * nOpp;
  let win = 0;
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(Math.random() * (deck.length - i));
      const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    const b = board.concat(deck.slice(0, 5 - board.length));
    const mine = evaluate(hole.concat(b));
    let best = -1, o = 5 - board.length;
    for (let k = 0; k < nOpp; k++, o += 2) best = Math.max(best, evaluate([deck[o], deck[o + 1]].concat(b)));
    win += mine > best ? 1 : mine === best ? 0.5 : 0;
  }
  return win / iters;
}

const potTotal = G => G.players.reduce((s, p) => s + (p.total || 0), 0);
const canAct = p => !p.folded && !p.allIn;

function pay(p, amt) {
  amt = Math.min(amt, p.stack);
  p.stack -= amt; p.bet += amt; p.total += amt;
  if (p.stack === 0) p.allIn = true;
  return amt;
}

function botDecide(G, p) {
  const toCall = Math.min(G.currentBet - p.bet, p.stack);
  const pot = potTotal(G);
  const others = G.players.filter(q => q !== p && !q.folded).length;
  const preflop = G.board.length === 0;
  const nOpp = Math.max(1, Math.min(others, preflop ? 2 : 3));
  const eq = equity(p.cards, G.board, nOpp, G.iters || 160);
  const r = eq * (nOpp + 1);
  const maxTo = p.bet + p.stack;
  const minTo = Math.min(G.currentBet + G.minRaise, maxTo);
  const canRaise = maxTo > G.currentBet && G.raises < 3 && G.players.some(q => q !== p && canAct(q));
  const sizeTo = f => {
    let to = G.currentBet + Math.round((pot + toCall) * f / 10) * 10;
    to = Math.max(to, minTo);
    return to >= maxTo * 0.8 ? maxTo : to;
  };
  const rnd = Math.random();
  if (toCall <= 0) {
    if (canRaise && r > 1.45 && rnd < p.agg + 0.25) return { type: 'raise', to: sizeTo(0.5 + Math.random() * 0.35) };
    if (canRaise && rnd < p.agg * 0.1) return { type: 'raise', to: sizeTo(0.5) };
    return { type: 'call' };
  }
  const need = toCall / (pot + toCall) * (preflop ? 0.85 : 1) + (toCall / p.stack) * 0.2 + p.tight + 0.03;
  if (eq < need) {
    if (canRaise && rnd < p.agg * 0.05 && toCall < p.stack * 0.2) return { type: 'raise', to: sizeTo(0.7) };
    return { type: 'fold' };
  }
  if (canRaise && r > 1.75 && rnd < p.agg + 0.1) return { type: 'raise', to: sizeTo(0.55 + Math.random() * 0.45) };
  return { type: 'call' };
}
function sanitize(G, p, a) {
  if (!a) return null;
  if (a.type === 'fold') return { type: 'fold' };
  if (a.type === 'raise') {
    const max = p.bet + p.stack, min = Math.min(G.currentBet + G.minRaise, max);
    const to = Math.round(Number(a.to));
    if (!isFinite(to)) return { type: 'call' };
    return { type: 'raise', to: Math.max(min, Math.min(max, to)) };
  }
  return { type: 'call' };
}

function applyAction(G, io, p, a, acted) {
  if (a.type === 'fold') {
    p.folded = true; p.last = 'Fold'; io.ev(p, 'folds', 'fold');
  } else if (a.type === 'raise' && Math.min(a.to, p.bet + p.stack) > G.currentBet) {
    const to = Math.min(a.to, p.bet + p.stack), opening = G.currentBet === 0;
    const size = to - G.currentBet;
    if (size >= G.minRaise) G.minRaise = size;
    pay(p, to - p.bet); G.currentBet = to; G.raises++; acted.clear();
    p.last = p.allIn ? `All in ${fmt(to)}` : `${opening ? 'Bet' : 'Raise to'} ${fmt(to)}`;
    if (p.allIn) io.ev(p, `goes all in for ${fmt(to)}`, `go all in for ${fmt(to)}`);
    else io.ev(p, `${opening ? 'bets' : 'raises to'} ${fmt(to)}`, `${opening ? 'bet' : 'raise to'} ${fmt(to)}`);
  } else {
    const amt = pay(p, G.currentBet - p.bet);
    p.last = amt === 0 ? 'Check' : p.allIn ? `All in ${fmt(p.bet)}` : `Call ${fmt(amt)}`;
    if (amt === 0) io.ev(p, 'checks', 'check');
    else io.ev(p, `calls ${fmt(amt)}${p.allIn ? ' and is all in' : ''}`, `call ${fmt(amt)}${p.allIn ? ' and are all in' : ''}`);
  }
  acted.add(p);
}

async function bettingRound(G, io, start) {
  const P = G.players, n = P.length, acted = new Set();
  let i = start;
  while (true) {
    if (P.filter(p => !p.folded).length <= 1) break;
    const actors = P.filter(canAct);
    if (actors.every(p => acted.has(p) && p.bet === G.currentBet)) break;
    if (actors.length === 1 && actors[0].bet >= G.currentBet) break;
    const p = P[i % n];
    if (canAct(p) && !(acted.has(p) && p.bet === G.currentBet)) {
      G.active = i % n; io.render();
      const toCall = Math.max(0, G.currentBet - p.bet);
      const a = await io.turn(p, {}, {
        auto: { type: toCall <= 0 ? 'call' : 'fold' },
        validate: x => sanitize(G, p, x),
        bot: () => botDecide(G, p),
        think: 550 + Math.random() * 500,
      });
      applyAction(G, io, p, a, acted);
      G.fast = P.filter(q => q.human).every(q => q.folded);
      io.render();
    }
    i++;
  }
  G.active = -1;
  await io.sleep(450);
  for (const p of P) { p.bet = 0; if (canAct(p)) p.last = ''; }
  G.currentBet = 0; G.minRaise = BB; G.raises = 0;
  if (P.filter(p => !p.folded).length > 1 && P.filter(canAct).length < 2) G.reveal = true;
}

function showdown(G, io) {
  const P = G.players, n = P.length, live = P.filter(p => !p.folded);
  const top = [...P].sort((a, b) => b.total - a.total);
  if (top[0].total > top[1].total) {           // hand back the part of a bet nobody called
    const d = top[0].total - top[1].total;
    top[0].total -= d; top[0].stack += d;
  }
  G.lastPot = potTotal(G); G.settled = true;
  G.summary = [];
  if (live.length === 1) {
    live[0].won = G.lastPot; live[0].stack += G.lastPot;
    G.summary.push({ p: P.indexOf(live[0]), t: `wins ${fmt(G.lastPot)}. Everyone else folded.`, y: `win ${fmt(G.lastPot)}. Everyone else folded.` });
  } else {
    G.reveal = true;
    for (const p of live) { p.score = evaluate(p.cards.concat(G.board)); p.handName = describe(p.score); }
    const levels = [...new Set(P.map(p => p.total).filter(t => t > 0))].sort((a, b) => a - b);
    let prev = 0, carry = 0;
    for (const L of levels) {                   // main pot, then each side pot
      let amt = carry;
      for (const p of P) amt += Math.min(p.total, L) - Math.min(p.total, prev);
      prev = L;
      const elig = live.filter(p => p.total >= L);
      if (!elig.length) { carry = amt; continue; }
      carry = 0;
      const best = Math.max(...elig.map(p => p.score));
      const winners = elig.filter(p => p.score === best);
      const seat = p => (P.indexOf(p) - G.dealer - 1 + n) % n;
      winners.sort((a, b) => seat(a) - seat(b));
      const share = Math.floor(amt / winners.length);
      let rem = amt - share * winners.length;
      for (const w of winners) { const x = share + (rem > 0 ? 1 : 0); if (rem > 0) rem--; w.stack += x; w.won += x; }
    }
    if (carry) { live[0].stack += carry; live[0].won += carry; }
    for (const p of P) if (p.won > 0)
      G.summary.push({ p: P.indexOf(p), t: `wins ${fmt(p.won)} with ${p.handName}.`, y: `win ${fmt(p.won)} with ${p.handName}.` });
  }
  for (const s of G.summary) G.log.push(Object.assign({ st: true }, s));
  for (const p of P) { p.total = 0; p.bet = 0; }
  G.active = -1;
}

async function round(G, io) {
  const P = G.players, n = P.length;
  G.board = []; G.street = 'preflop'; G.reveal = false; G.settled = false; G.lastPot = 0;
  G.currentBet = 0; G.minRaise = BB; G.raises = 0; G.active = -1; G.iters = 160;
  for (const p of P) Object.assign(p, { cards: [], folded: false, allIn: false, bet: 0, total: 0, last: '', won: 0, handName: '' });
  const deck = shuffle([...Array(52).keys()]);
  G.dealer = ((G.dealer || 0) + 1) % n;
  const sbI = n === 2 ? G.dealer : (G.dealer + 1) % n, bbI = (sbI + 1) % n;   // heads-up: the dealer posts the small blind
  const sb = P[sbI], bb = P[bbI];
  pay(sb, SB); sb.last = `Small blind ${fmt(sb.bet)}`;
  pay(bb, BB); bb.last = `Big blind ${fmt(bb.bet)}`;
  G.currentBet = BB;
  io.ev(sb, `posts ${fmt(sb.bet)}`, `post ${fmt(sb.bet)}`);
  io.ev(bb, `posts ${fmt(bb.bet)}`, `post ${fmt(bb.bet)}`);
  for (const p of P) p.cards = [deck.pop(), deck.pop()];
  io.render();
  await io.sleep(500);
  await bettingRound(G, io, (bbI + 1) % n);
  for (const [name, count] of [['Flop', 3], ['Turn', 1], ['River', 1]]) {
    if (P.filter(p => !p.folded).length < 2) break;
    G.street = name;
    for (let i = 0; i < count; i++) G.board.push(deck.pop());
    io.line(`${name}: ${G.board.slice(-count).map(c => RANK_CH[c >> 2] + SUIT_CH[c & 3]).join(' ')}`, true);
    io.render();
    await io.sleep(750);
    await bettingRound(G, io, (G.dealer + 1) % n);
  }
  showdown(G, io);
  io.render();
}

function view(G) {
  return {
    street: G.street || '', board: G.board || [], pot: G.settled ? G.lastPot : potTotal(G), cur: G.currentBet || 0,
    minRaise: G.minRaise || BB, active: G.active === undefined ? -1 : G.active, dealer: G.dealer || 0, reveal: !!G.reveal,
    ps: G.players.map(p => ({
      bet: p.bet || 0, f: !!p.folded, a: !!p.allIn, last: p.last || '', won: p.won || 0,
      hn: (G.reveal || G.settled) && !p.folded ? (p.handName || '') : '',
      sh: G.reveal && !p.folded && p.cards ? p.cards : null,
    })),
  };
}

/* ----- screen ----- */
let ctx = null, layoutKey = '', S0 = null;
const cardHTML = c => (c < 0 ? backHTML() : faceHTML(RANK_CH[c >> 2], SUIT_CH[c & 3], (c & 3) === 1 || (c & 3) === 2));
function setCards(el, arr) {
  const key = arr.join('.');
  if (el.dataset.k === key) return;
  el.dataset.k = key;
  el.innerHTML = arr.map(cardHTML).join('');
}
function setRaise(v) {
  v = Math.max(ctx.minTo, Math.min(ctx.maxTo, Math.round(v)));
  if (ctx.maxTo - v < 10) v = ctx.maxTo;
  ctx.raiseTo = v;
  $('pkRaiseAmt').value = v;
  $('pkRaiseBtn').textContent = v >= ctx.maxTo ? `All in ${fmt(v)}` : `${ctx.cur === 0 ? 'Bet' : 'Raise to'} ${fmt(v)}`;
}
function tagFor(V, s, i, me) {
  const g = V.g, p = g.ps[i];
  if (V.done && p.won > 0) return ['+' + fmt(p.won), 'tag win'];
  if (V.done && p.sh && !p.f && i !== me) return [p.hn, 'tag dim'];
  return [p.last, 'tag' + (p.last === 'Fold' ? ' dim' : /^(Bet|Raise|All)/.test(p.last) ? ' hot' : '')];
}
const ui = {
  mount(stage, ctl, S) {
    layoutKey = ''; ctx = null;
    stage.innerHTML = `<section class="table" aria-label="Poker table">
      <div class="bots" id="pkBots"></div>
      <div class="center">
        <div class="pot">Pot<b id="pkPot">0</b></div>
        <div class="board" id="pkBoard" aria-label="Community cards"></div>
        <div class="banner" id="pkBanner" aria-live="polite"></div>
      </div>
      <div class="seat hero" id="pkHero" hidden>
        <div class="cards" id="pkHcards" aria-label="Your cards"></div>
        <div class="side">
          <div class="plate"><span class="name"><span>You</span> <i class="dealer" id="pkHdealer" title="Dealer button" hidden>D</i></span><span class="stack" id="pkHstack"></span></div>
          <div class="made" id="pkMade"></div>
          <div class="tag" id="pkHtag"></div>
        </div>
      </div></section>`;
    ctl.innerHTML = `<div class="act" id="pkAct" hidden>
      <div class="raise-row" id="pkRaiseRow">
        <div class="presets">
          <button type="button" data-p="min">Min</button><button type="button" data-p="half">½ pot</button>
          <button type="button" data-p="pot">Pot</button><button type="button" data-p="max">All in</button>
        </div>
        <input type="range" id="pkRaiseAmt" step="10" aria-label="Raise amount">
      </div>
      <div class="btns">
        <button type="button" class="b fold" id="pkFold">Fold</button>
        <button type="button" class="b" id="pkCall">Check</button>
        <button type="button" class="b gold" id="pkRaiseBtn">Raise</button>
      </div></div>`;
    $('pkFold').onclick = () => S0.send({ type: 'fold' });
    $('pkCall').onclick = () => S0.send({ type: 'call' });
    $('pkRaiseBtn').onclick = () => S0.send({ type: 'raise', to: ctx.raiseTo });
    $('pkRaiseAmt').oninput = e => setRaise(+e.target.value);
    ctl.querySelectorAll('.presets button').forEach(b => b.onclick = () => {
      const k = b.dataset.p, base = ctx.pot + ctx.toCall;
      setRaise(k === 'min' ? ctx.minTo : k === 'max' ? ctx.maxTo : ctx.cur + Math.round(base * (k === 'half' ? 0.5 : 1) / 10) * 10);
    });
  },
  update(S) {
    S0 = S;
    const V = S.V, g = V.g, n = V.seats.length, me = S.me, myS = me >= 0 ? V.seats[me] : null;
    const order = me >= 0 ? Array.from({ length: n - 1 }, (_, k) => (me + 1 + k) % n) : [...Array(n).keys()];
    const key = me + '|' + V.seats.map(s => s.u || s.n).join(',');
    if (key !== layoutKey) {
      layoutKey = key;
      $('pkBots').style.setProperty('--cols', Math.max(1, order.length));
      $('pkBots').innerHTML = order.map(i => `<div class="seat" id="pkSeat${i}"><div class="cards" id="pkCards${i}"></div>
        <div class="plate"><span class="name"><span id="pkNm${i}"></span> <i class="dealer" id="pkD${i}" hidden>D</i></span>
        <span class="style" id="pkSty${i}"></span><span class="stack" id="pkSt${i}"></span></div><div class="tag" id="pkTag${i}"></div></div>`).join('');
    }
    for (const i of order) {
      const s = V.seats[i], p = g.ps[i];
      $('pkSeat' + i).className = 'seat' + (g.active === i && !V.done ? ' active' : '') + (p.f ? ' folded' : '') + (V.done && p.won > 0 ? ' winner' : '');
      $('pkNm' + i).textContent = S.nameOf(i);
      $('pkSty' + i).textContent = S.tag(i);
      $('pkSt' + i).textContent = fmt(s.stack);
      $('pkD' + i).hidden = g.dealer !== i;
      const [t, cls] = tagFor(V, s, i, me);
      $('pkTag' + i).textContent = t; $('pkTag' + i).className = cls;
      setCards($('pkCards' + i), p.sh ? p.sh : [-1, -1]);
    }
    $('pkHero').hidden = me < 0;
    if (me >= 0) {
      const mine = S.my && S.my.c && S.my.c.length ? S.my.c : null, p = g.ps[me];
      $('pkHero').className = 'seat hero' + (p.f ? ' folded' : '');
      $('pkHstack').textContent = fmt(myS.stack);
      $('pkHdealer').hidden = g.dealer !== me;
      const [t, cls] = tagFor(V, myS, me, me);
      $('pkHtag').textContent = t; $('pkHtag').className = cls;
      setCards($('pkHcards'), mine || [-1, -1]);
      $('pkMade').textContent = mine && !p.f ? 'You have ' + describe(evaluate(mine.concat(g.board))) : p.f ? 'You folded' : '';
    }
    $('pkPot').textContent = fmt(g.pot);
    const board = $('pkBoard'), bk = g.board.join('.');
    if (board.dataset.k !== bk) {
      const have = board.querySelectorAll('.card').length;
      board.dataset.k = bk;
      let html = '';
      for (let i = 0; i < 5; i++) html += i < g.board.length ? cardHTML(g.board[i]) : '<div class="slot"></div>';
      board.innerHTML = html;
      board.querySelectorAll('.card').forEach((el, i) => { if (i < have) el.style.animation = 'none'; });
    }
    $('pkBanner').innerHTML = V.summary.map(e => `<span>${S.text(e)}</span>`).join('');

    const myTurn = !!S.turn;
    $('pkAct').hidden = !myTurn;
    if (!myTurn) { ctx = null; return ''; }
    if (!ctx || ctx.seq !== S.turn.seq) {
      const toCall = Math.min(g.cur - g.ps[me].bet, myS.stack), maxTo = g.ps[me].bet + myS.stack, minTo = Math.min(g.cur + g.minRaise, maxTo);
      const canRaise = maxTo > g.cur && g.ps.some((p, i) => i !== me && !p.f && !p.a);
      ctx = { seq: S.turn.seq, toCall, maxTo, minTo, pot: g.pot, cur: g.cur, canRaise };
      $('pkFold').disabled = toCall <= 0;
      $('pkCall').textContent = toCall <= 0 ? 'Check' : toCall >= myS.stack ? `Call all in ${fmt(toCall)}` : `Call ${fmt(toCall)}`;
      $('pkRaiseRow').hidden = !canRaise; $('pkRaiseBtn').hidden = !canRaise;
      if (canRaise) {
        const sl = $('pkRaiseAmt');
        sl.min = minTo; sl.max = maxTo; sl.value = minTo;
        setRaise(Math.max(minTo, Math.min(maxTo, g.cur + Math.round((g.pot + toCall) * 0.5 / 10) * 10)));
      }
    }
    return ctx.toCall > 0 ? `<b>${fmt(ctx.toCall)}</b> to call.` : 'Nobody has bet yet.';
  },
};


/* ----- 3D casino table ----- */
function poker3d(box, S) {
  const TH = THREE, s = T3.stage(box, { fov: 44 }), sc = s.scene, TY = 2.5, AT = 7.0, BT = 4.2;
  T3.lounge(s, { w: 34, d: 28, lamps: [], ambient: 0.55, wall: '#1d2a38', bg: 0x0c1118 });
  const key = new TH.SpotLight(0xfff0d0, 1.5, 44, 0.9, 0.6, 1.1); key.position.set(0, 13, 2); key.target.position.set(0, TY, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; sc.add(key, key.target);
  T3.mk(sc, new TH.CircleGeometry(12, 56), T3.mat('#4a1620', { roughness: 1 }), 0, 0.012, 0, { noCast: true }).rotation.x = -Math.PI / 2;
  const felt = T3.canvasTex(512, 512, T3.speckle('#1f7a4a', 40, 7000));
  const top = T3.mk(sc, new TH.CylinderGeometry(1, 1, 0.3, 72), T3.mat('#fff', { map: felt, roughness: 1 }), 0, TY - 0.15, 0); top.scale.set(AT, 1, BT);
  const pts = []; for (let k = 0; k < 96; k++) { const a = k / 96 * Math.PI * 2; pts.push(new TH.Vector3(Math.cos(a) * (AT + 0.1), TY, Math.sin(a) * (BT + 0.1))); }
  T3.mk(sc, new TH.TubeGeometry(new TH.CatmullRomCurve3(pts, true), 120, 0.26, 12, true), T3.mat('#3b1d12', { roughness: 0.35 }), 0, 0, 0);
  T3.mk(sc, T3.CYL(1.4, 2.2, TY - 0.3, 24), T3.mat('#2a1810'), 0, (TY - 0.3) / 2, 0);
  const people = [], tags = [], seatsG = [], hole = [], betG = [], betL = [], slots = [], diam = [], chairs = [];
  let layoutKey = '', boardCards = [], boardKey = '', potG = null, potL = null, dealerBtn = null, firstSync = true, SS = S, built = false;
  const potLab = T3.label('', { scale: 2.2 }); potLab.sprite.position.set(0, TY + 1.0, -1.7); sc.add(potLab.sprite);
  dealerBtn = new TH.Group(); T3.mk(dealerBtn, T3.CYL(0.22, 0.22, 0.05, 20), T3.mat('#f7f0e1', { roughness: 0.4 }), 0, 0.025, 0); const dl = T3.label('D', { scale: 0.7, bg: 'rgba(0,0,0,0)', color: '#222' }); dl.sprite.position.y = 0.2; dealerBtn.add(dl.sprite); sc.add(dealerBtn);
  const dealCard = (c, sz) => { const m = T3.card3(c, sz); return m; };
  function slotPos(i, f) { const a = slots[i].a; return new TH.Vector3(AT * f * Math.cos(a), TY + 0.02, BT * f * Math.sin(a)); }
  function setHole(i, faces, instant) {
    const k = faces.join('.'); if (hole[i].key === k) return; hole[i].key = k; hole[i].meshes.forEach(m => seatsG[i].remove(m)); hole[i].meshes = [];
    const me = i === SS.me, sz = me ? 1.0 : 0.82;
    faces.forEach((c, j) => {
      const m = dealCard(c, sz); seatsG[i].add(m); hole[i].meshes.push(m);
      const tgt = new TH.Vector3((j - 0.5) * (sz * 0.78), me ? 0.06 : 0.02, 0); const lift = me ? -0.25 : 0; m.rotation.x = lift; m.rotation.y = 0;
      if (instant) { m.position.copy(tgt); return; }
      const from = tgt.clone().sub(seatsG[i].position).setY(0); from.set(-seatsG[i].position.x, 2.6, -seatsG[i].position.z).applyAxisAngle(new TH.Vector3(0, 1, 0), -seatsG[i].rotation.y);
      m.position.copy(from); m.scale.setScalar(0.4);
      s.tween(520 + j * 140, (kk, e) => { m.position.lerpVectors(from, tgt, e); m.position.y += Math.sin(Math.PI * e) * 0.5; m.scale.setScalar(0.4 + 0.6 * e); });
    });
  }
  function setBoard(g, instant) {
    const k = g.board.join('.'); if (k === boardKey) return;
    const old = boardKey ? boardKey.split('.').length : 0, prev = boardCards.length; if (g.board.length < prev) { boardCards.forEach(m => sc.remove(m)); boardCards = []; }
    for (let j = boardCards.length; j < g.board.length; j++) {
      const m = dealCard(g.board[j], 0.95), tgt = new TH.Vector3((j - 2) * 1.12, TY + 0.02, 0.1); sc.add(m); boardCards.push(m);
      if (instant) { m.position.copy(tgt); continue; }
      const from = new TH.Vector3(0, TY + 2.6, -1); m.position.copy(from); m.scale.setScalar(0.4);
      s.tween(560 + (j % 3) * 150, (kk, e) => { m.position.lerpVectors(from, tgt, e); m.position.y += Math.sin(Math.PI * e) * 0.5; m.scale.setScalar(0.4 + 0.6 * e); m.rotation.y = (1 - e) * 1.2; });
    }
    boardKey = k;
  }
  function chipsAt(parent, old, amt, x, y, z) { if (old.g) parent.remove(old.g); old.g = null; if (amt > 0) { const c = T3.chips(amt, 0.22); c.position.set(x, y, z); parent.add(c); old.g = c; } }
  function layout(S2) {
    const V = S2.V, n = V.seats.length, me = S2.me;
    people.forEach(p => sc.remove(p)); chairs.forEach(c => sc.remove(c)); chairs.length = 0; seatsG.forEach(g => sc.remove(g)); betG.forEach(b => b.g && sc.remove(b.g)); betL.forEach(l => sc.remove(l.sprite)); diam.forEach(d => sc.remove(d));
    people.length = tags.length = seatsG.length = hole.length = betG.length = betL.length = slots.length = diam.length = 0;
    const order = me >= 0 ? Array.from({ length: n }, (_, k) => (me + k) % n) : [...Array(n).keys()];
    const info = []; order.forEach((si, k) => { info[si] = k; });
    for (let i = 0; i < n; i++) {
      const k = info[i], a = Math.PI / 2 + k * 2 * Math.PI / n, ox = 8.7 * Math.cos(a), oz = 6.0 * Math.sin(a), ry = Math.atan2(-ox, -oz);
      slots[i] = { a, k };
      const seatBox = T3.mk(sc, T3.BOX(2.0, 0.3, 2.0), T3.mat('#2a1a3a', { roughness: 0.8 }), ox, 1.28, oz); seatBox.rotation.y = ry; chairs.push(seatBox);
      const L = Math.hypot(ox, oz), ux = ox / L, uz = oz / L, back = T3.mk(sc, T3.BOX(2.0, 2.4, 0.26), T3.mat('#2a1a3a', { roughness: 0.8 }), ox + ux * 1.0, 2.5, oz + uz * 1.0); back.rotation.y = ry; back.userData.back = i; chairs.push(back);
      const pp = T3.person(['#3f8be8', '#e0443c', '#5cc8b0', '#e8a23a', '#a063d8', '#e8708a', '#8ab4ff', '#9ac24a'][i % 8], { seated: true, idx: i }); pp.scale.setScalar(2.2); pp.position.set(ox, 0, oz); pp.rotation.y = ry; sc.add(pp); s.addPerson(pp); people.push(pp);
      const lb = T3.label('', { scale: 3.4 }); lb.sprite.position.y = 2.1; lb.sprite.scale.multiplyScalar(1 / 2.2); pp.add(lb.sprite); tags.push(lb);
      const dm = T3.mk(pp, new TH.OctahedronGeometry(0.1), new TH.MeshBasicMaterial({ color: 0xf2b441 }), 0, 2.42, 0, { noCast: true }); dm.visible = false; diam.push(dm);
      const g = new TH.Group(), cp = slotPos(i, 0.56); g.position.set(cp.x, cp.y, cp.z); g.rotation.y = Math.atan2(ox, oz); sc.add(g); seatsG.push(g); hole.push({ key: '', meshes: [] });
      betG.push({ g: null, amt: -1 }); const bl = T3.label('', { scale: 1.5 }); const bp = slotPos(i, 0.3); bl.sprite.position.set(bp.x, TY + 0.7, bp.z); sc.add(bl.sprite); betL.push(bl);
    }
    built = true; layoutKey = me + '|' + V.seats.map(q => q.u || q.n).join(',');
  }
  s.setViews({
    seat: { label: 'Seat', pos: [0, 7.4, 10.6], look: [0, 2.2, 0.3], fov: 44, sway: 0.012 },
    table: { label: 'Table', pos: [0, 11.5, 11.8], look: [0, 2.3, 0.4], fov: 42 },
    top: { label: 'Top', pos: [0, 17, 0.01], look: [0, 2.5, 0], up: [0, 0, -1], fov: 42 },
  }, 'seat', true);
  s.on((dt, t) => {
    const g = SS.V.g, done = SS.V.done;
    people.forEach((pp, i) => {
      const act = g.active === i && !done, win = done && g.ps[i] && g.ps[i].won > 0, ar = pp.userData.arms;
      ar[0].rotation.x += ((win ? -2.7 : -1.0) - ar[0].rotation.x) * Math.min(1, dt * 4); ar[1].rotation.x += ((win ? -2.7 : act ? -1.3 : -1.0) - ar[1].rotation.x) * Math.min(1, dt * 4);
      if (diam[i]) { diam[i].visible = act; diam[i].position.y = 2.42 + Math.sin(t * 3) * 0.05; diam[i].rotation.y = t * 2; }
    });
  });
  s.onView = n => { people.forEach((pp, i) => { pp.visible = !(n === 'seat' && i === SS.me); }); chairs.forEach(c => { c.visible = !(n === 'seat' && c.userData.back === SS.me && SS.me >= 0); }); };
  s.sync = S2 => {
    SS = S2; const V = S2.V, g = V.g, me = S2.me;
    if (!built || layoutKey !== me + '|' + V.seats.map(q => q.u || q.n).join(',')) { layout(S2); boardKey = ''; boardCards.forEach(m => sc.remove(m)); boardCards = []; }
    const inst = firstSync;
    V.seats.forEach((st, i) => {
      const p = g.ps[i]; if (!p) return;
      const faces = p.f ? [] : (i === me && S2.my && S2.my.c && S2.my.c.length ? S2.my.c : (p.sh ? p.sh : [-1, -1]));
      setHole(i, faces, inst);
      if (betG[i].amt !== p.bet) { betG[i].amt = p.bet; const bp = slotPos(i, 0.3); chipsAt(sc, betG[i], p.bet, bp.x, bp.y, bp.z); betL[i].set(p.bet ? fmt(p.bet) : ''); }
      const win = V.done && p.won > 0;
      tags[i].set(`${S2.nameOf(i)} · ${fmt(st.stack)}${win ? ' +' + fmt(p.won) : ''}`, win ? '#6ee09a' : (g.active === i && !V.done ? '#f2b441' : (p.f ? '#9a90a8' : '#f7f0e1')));
    });
    setBoard(g, inst);
    if (g.pot !== (potG || {}).amt) { if (potG) sc.remove(potG.g); const c = T3.chips(g.pot, 0.26); c.position.set(0, TY, -1.7); sc.add(c); potG = { g: c, amt: g.pot }; potLab.set(g.pot ? 'Pot ' + fmt(g.pot) : ''); }
    const di = slots[g.dealer]; if (di) { const bp = slotPos(g.dealer, 0.44); const tx = bp.x + Math.cos(di.a + Math.PI / 2) * 1.2, tz = bp.z + Math.sin(di.a + Math.PI / 2) * 0.8; const from = dealerBtn.position.clone(); if (inst) dealerBtn.position.set(tx, TY + 0.02, tz); else s.tween(500, (k, e) => dealerBtn.position.set(from.x + (tx - from.x) * e, TY + 0.02 + Math.sin(Math.PI * e) * 0.3, from.z + (tz - from.z) * e)); }
    s.onView(s.view); firstSync = false;
    s.hint(S2.turn ? 'Your turn: use the buttons below to fold, call or raise.' : '');
  };
  return s;
}

Club.register({
  id: 'poker', cat: 'casino', name: "Texas Hold'em", tag: 'Bluff, bet and read the table.', min: 2, max: 6, soloBots: 4, roundWord: 'Hand',
  art: () => faceHTML('A', '♠', false) + faceHTML('K', '♥', true) + faceHTML('Q', '♠', false),
  rules: `<p><b>Goal:</b> win chips by making the best five-card hand from your two private cards and five shared cards, or by getting everyone else to fold.</p>
    <ul><li>Everyone gets two private cards. Blinds are 10 and 20.</li>
    <li>Betting rounds follow the deal, the flop (three cards), the turn and the river. Check, call, raise or fold.</li>
    <li>Best hand, high to low: royal flush, straight flush, four of a kind, full house, flush, straight, three of a kind, two pair, pair, high card.</li>
    <li>All-ins and side pots are handled for you. Out of chips? You get a fresh 1,000.</li></ul>`,
  init(G) { G.dealer = rnd(6); G.board = []; },
  round, view,
  priv: (G, i) => ({ c: G.players[i].cards || [] }),
  ui,
  ui3d: T3.wrapUi(ui, { slot: st => ({ before: st.querySelector('.table'), hide: [st.querySelector('#pkBots'), st.querySelector('#pkBoard'), st.querySelector('.pot'), st.querySelector('#pkHcards')] }), make: poker3d }),
  _test: { evaluate, describe, botDecide },
});
})();
