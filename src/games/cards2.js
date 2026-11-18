/* ---------- More card games: Crazy Eights, Go Fish, Old Maid, Cheat. Free chips ---------- */
(function () {
const ANTE = 20;
const LAB = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], SUI = ['♠', '♥', '♦', '♣'], SUIN = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
const RN = ['Aces', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings'];
const rank = c => c >> 2, suit = c => c & 3, red = c => suit(c) === 1 || suit(c) === 2;
const cardH = (c, cls) => faceHTML(LAB[rank(c)], SUI[suit(c)], red(c), cls);
const sortH = h => h.sort((a, b) => rank(a) - rank(b) || suit(a) - suit(b));
const deck52 = () => shuffle([...Array(52).keys()]);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const oppOrder = (S, n) => (S.me >= 0 ? Array.from({ length: n - 1 }, (_, k) => (S.me + 1 + k) % n) : [...Array(n).keys()]);
function oppsHTML(S, g, extra) {
  const V = S.V;
  return oppOrder(S, V.seats.length).map(i => {
    const s = V.seats[i], d = (g.delta || [])[i] || 0;
    const tag = V.done ? (d > 0 ? `<div class="tag win">+${fmt(d)}</div>` : d < 0 ? `<div class="tag lose">${fmt(d)}</div>` : '<div class="tag dim">Even</div>') : `<div class="tag${g.turn === i ? ' hot' : ' dim'}">${g.turn === i ? 'Their turn' : (extra ? extra(i) : '')}</div>`;
    return `<div class="seat${g.turn === i ? ' active' : ''}" data-i="${i}"><div class="bt-count">${backHTML()}<b>${g.counts[i] ?? 0}</b></div><div class="plate"><span class="name"><span>${esc(S.nameOf(i))}</span></span><span class="style">${esc(S.tag(i))}</span><span class="stack">${fmt(s.stack)}</span></div>${tag}</div>`;
  }).join('');
}
const handHTML = (hand, ok, sel) => hand.map(c => `<button type="button" class="bt-card${ok(c) ? ' ok' : ''}${sel && sel(c) ? ' sel' : ''}" data-c="${c}">${cardH(c)}</button>`).join('');
const mkView = (key, extra) => G => {
  const R = G[key];
  if (!R || R.hands.length !== G.players.length) return Object.assign({ counts: G.players.map(() => 0), turn: -1, over: false, winners: [], delta: [] }, extra ? extra(null) : {});
  return Object.assign({ counts: R.hands.map(h => h.length), turn: R.over ? -1 : R.turn, over: R.over, winners: R.winners || [], delta: G.players.map(p => (R.over ? p.delta || 0 : 0)) }, extra ? extra(R) : {});
};
const priv = key => (G, i) => ({ h: G[key] && G[key].hands[i] ? G[key].hands[i] : [] });
const banner = (V, S) => (V.done && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '');
const shell = (id, mid, hint) => ({
  stage: `<section class="table rs"><div class="bt-opps" id="${id}Opps"></div>${mid}<div class="banner" id="${id}Ban" aria-live="polite"></div><div class="bt-hand rs-hand" id="${id}Hand" aria-label="Your cards"></div></section>`,
  ctl: `<div class="act" id="${id}Act"><p class="hint bt-hint" id="${id}Hint"></p><div class="betrow" id="${id}Btns"></div></div>`,
});

/* ======================= Crazy Eights ======================= */
const E_PTS = c => (rank(c) === 7 ? 50 : rank(c) >= 10 ? 10 : rank(c) + 1);
const e8ok = (R, c) => rank(c) === 7 || suit(c) === R.suit || rank(c) === rank(R.top);
function e8draw(R) { if (!R.draw.length) { const keep = R.disc.pop(); R.draw = shuffle(R.disc); R.disc = [keep]; } return R.draw.length ? R.draw.pop() : undefined; }
function bestSuit(hand) { const n = [0, 0, 0, 0]; hand.forEach(c => { if (rank(c) !== 7) n[suit(c)]++; }); const m = Math.max(...n); return m > 0 ? n.indexOf(m) : rnd(4); }
async function round8(G, io) {
  const P = G.players, n = P.length;
  const R = G.e8 = { draw: deck52(), disc: [], hands: P.map(() => []), top: -1, suit: 0, turn: (G.round - 1) % n, over: false, winner: -1, winners: [], passes: 0 };
  for (let i = 0; i < n; i++) { for (let k = 0; k < (n === 2 ? 7 : 5); k++) R.hands[i].push(R.draw.pop()); sortH(R.hands[i]); }
  for (;;) { const c = R.draw.pop(); if (rank(c) === 7) { R.draw.unshift(c); continue; } R.top = c; R.suit = suit(c); R.disc.push(c); break; }
  io.render(); await io.sleep(600);
  while (!R.over) {
    const i = R.turn, p = P[i], hand = R.hands[i], ok = hand.filter(c => e8ok(R, c));
    io.render();
    const a = await io.turn(p, {}, {
      auto: ok.length ? { t: 'play', id: ok[0], s: rank(ok[0]) === 7 ? bestSuit(hand) : suit(ok[0]) } : { t: 'draw' },
      validate: x => { if (!x) return null; if (x.t === 'draw') return ok.length ? null : { t: 'draw' }; if (x.t !== 'play' || !hand.includes(x.id) || !e8ok(R, x.id)) return null; return { t: 'play', id: x.id, s: rank(x.id) === 7 ? (x.s >= 0 && x.s <= 3 ? x.s | 0 : bestSuit(hand)) : suit(x.id) }; },
      bot: () => { if (!ok.length) return { t: 'draw' }; const plain = ok.filter(c => rank(c) !== 7); const pick = (plain.length ? plain.slice().sort((x, y) => E_PTS(y) - E_PTS(x))[0] : ok[0]); return { t: 'play', id: pick, s: rank(pick) === 7 ? bestSuit(hand.filter(c => c !== pick)) : suit(pick) }; }, think: 700 + Math.random() * 500 });
    if (a.t === 'draw') {
      let k = 0, got = false; while (k < 6) { const c = e8draw(R); if (c === undefined) break; hand.push(c); k++; if (e8ok(R, c)) { got = true; break; } }
      sortH(hand); io.ev(p, k ? `draws ${plural(k, 'card')}` : 'cannot draw and passes', k ? `draw ${plural(k, 'card')}` : 'cannot draw and pass');
      if (!got) { R.passes++; R.turn = (i + 1) % n; if (R.passes >= n) { R.over = true; } } else R.passes = 0;
      io.render(); await io.sleep(500); continue;
    }
    hand.splice(hand.indexOf(a.id), 1); R.top = a.id; R.suit = a.s; R.disc.push(a.id); R.passes = 0;
    io.ev(p, rank(a.id) === 7 ? `plays an eight and picks ${SUIN[a.s]}` : `plays ${LAB[rank(a.id)]}${SUI[suit(a.id)]}`, rank(a.id) === 7 ? `play an eight and pick ${SUIN[a.s]}` : `play ${LAB[rank(a.id)]}${SUI[suit(a.id)]}`);
    if (hand.length === 1) io.ev(p, 'has one card left!', 'have one card left!');
    if (!hand.length) { R.over = true; R.winner = i; break; }
    R.turn = (i + 1) % n; io.render(); await io.sleep(450);
  }
  if (R.winner < 0) { const pts = R.hands.map(h => h.reduce((s, c) => s + E_PTS(c), 0)); R.winner = pts.indexOf(Math.min(...pts)); }
  R.winners = [R.winner]; let total = 0; const lines = [];
  P.forEach((p, i) => { if (i === R.winner) return; const pts = R.hands[i].reduce((s, c) => s + E_PTS(c), 0), due = Math.min(p.stack, pts); p.stack -= due; total += due; p.delta = -due; lines.push({ p: i, t: `pays ${fmt(due)} for ${plural(R.hands[i].length, 'card')} left.`, y: `pay ${fmt(due)} for ${plural(R.hands[i].length, 'card')} left.` }); });
  P[R.winner].stack += total; P[R.winner].delta = total;
  G.summary = [{ p: R.winner, t: `wins the round and collects ${fmt(total)}.`, y: `win the round and collect ${fmt(total)}.` }, ...lines]; for (const s of G.summary) G.log.push(Object.assign({ st: true }, s));
  io.render();
}
let E0 = null, ePick = null;
const e8ui = {
  mount(stage, ctl) {
    ePick = null; const h = shell('e8', `<div class="rs-mid"><button type="button" class="rs-pile" id="e8Draw" aria-label="Draw"><div class="card back"></div><span id="e8Left"></span></button><div class="rs-disc" id="e8Disc"></div><div class="rs-info"><div class="hint" id="e8Suit"></div></div></div>`);
    stage.innerHTML = h.stage; ctl.innerHTML = h.ctl.replace('<div class="betrow" id="e8Btns">', '<div class="betrow" id="e8Btns"><button type="button" class="b" id="e8DrawBtn">Draw cards</button></div><div class="betrow" id="e8Suits" hidden>' + SUIN.map((s, k) => `<button type="button" class="pill" data-s="${k}">${SUI[k]} ${s}</button>`).join('') + '<button type="button" class="pill" id="e8Cancel">Cancel</button>').replace(/<div class="betrow" id="e8Suits" hidden>(.*)$/, '<div class="betrow" id="e8Suits" hidden>$1</div>');
    const draw = () => { ePick = null; if (E0 && E0.turn) E0.send({ t: 'draw' }); };
    $('e8Draw').onclick = draw; $('e8DrawBtn').onclick = draw; $('e8Cancel').onclick = () => { ePick = null; e8ui.update(E0); };
    $('e8Suits').onclick = e => { const b = e.target.closest('[data-s]'); if (b && ePick !== null) { const id = ePick; ePick = null; E0.send({ t: 'play', id, s: +b.dataset.s }); } };
    $('e8Hand').onclick = e => { const b = e.target.closest('[data-c]'); if (!b || !E0 || !E0.turn) return; const id = +b.dataset.c, g = E0.V.g; if (!(rank(id) === 7 || suit(id) === g.suit || rank(id) === rank(g.top))) return; if (rank(id) === 7) { ePick = id; e8ui.update(E0); return; } E0.send({ t: 'play', id, s: suit(id) }); };
  },
  update(S) {
    E0 = S; const V = S.V, g = V.g, hand = S.my && S.my.h ? S.my.h : [], my = !!S.turn;
    $('e8Opps').innerHTML = oppsHTML(S, g);
    $('e8Left').textContent = g.left ? g.left + ' left' : ''; $('e8Disc').innerHTML = g.top >= 0 ? cardH(g.top, 'big') : '';
    $('e8Suit').innerHTML = g.top >= 0 ? `Play a <b>${SUIN[g.suit]}</b> ${SUI[g.suit]} or a <b>${LAB[rank(g.top)]}</b>. Eights are wild.` : '';
    $('e8Ban').innerHTML = banner(V, S);
    const can = c => my && (rank(c) === 7 || suit(c) === g.suit || rank(c) === rank(g.top));
    $('e8Hand').hidden = S.me < 0; $('e8Hand').classList.toggle('turn', my); $('e8Hand').innerHTML = handHTML(hand, can, c => ePick === c);
    $('e8Act').hidden = !my; if (!my) { ePick = null; return ''; }
    const any = hand.some(can); $('e8Suits').hidden = ePick === null; $('e8Btns').hidden = ePick !== null; $('e8DrawBtn').disabled = any;
    $('e8Hint').textContent = ePick !== null ? 'Pick the new suit for your eight.' : any ? 'Tap a glowing card to play it.' : 'Nothing to play. Draw cards until one fits.'; return '';
  },
};
Club.register({
  id: 'crazy8', cat: 'card', name: 'Crazy Eights', tag: 'Match suit or rank. Eights are wild. Empty your hand first.', min: 2, max: 6, soloBots: 3, roundWord: 'Round',
  art: () => ['8♠', '8♥', '8♦'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> be the first to play all your cards. Everyone else pays you points for what is left in their hand.</p>
    <ol><li>You get 7 cards (5 with three or more players). One card starts the discard pile.</li>
    <li>On your turn play a card that matches the top card's <b>suit</b> or its <b>number</b>.</li>
    <li><b>Eights are wild</b>: play one any time and name the next suit.</li>
    <li>No card to play? Press <b>Draw</b>. You keep drawing until a card fits (up to six).</li>
    <li>Points left in hand: eights 50, J Q K 10, aces 1, other cards their number.</li></ol>`,
  round: round8, view: mkView('e8', R => ({ top: R ? R.top : -1, suit: R ? R.suit : 0, left: R ? R.draw.length : 0 })), priv: priv('e8'), ui: e8ui, _test: {},
});

/* ======================= Go Fish ======================= */
async function roundFish(G, io) {
  const P = G.players, n = P.length, deck = deck52();
  const R = G.gf = { hands: P.map(() => []), books: P.map(() => []), turn: (G.round - 1) % n, over: false, winners: [], last: '' };
  for (let i = 0; i < n; i++) { for (let k = 0; k < (n > 3 ? 5 : 7); k++) R.hands[i].push(deck.pop()); sortH(R.hands[i]); }
  R.draw = deck;
  const books = i => { const h = R.hands[i]; for (let r = 0; r < 13; r++) if (h.filter(c => rank(c) === r).length === 4) { R.hands[i] = R.hands[i].filter(c => rank(c) !== r); R.books[i].push(r); io.ev(P[i], `makes a book of ${RN[r]}`, `make a book of ${RN[r]}`); } };
  for (let i = 0; i < n; i++) books(i);
  const total = () => R.books.reduce((s, b) => s + b.length, 0);
  io.render(); await io.sleep(600);
  while (!R.over) {
    if (total() >= 13) break;
    const i = R.turn, p = P[i];
    if (!R.hands[i].length) { for (let k = 0; k < 5 && R.draw.length; k++) R.hands[i].push(R.draw.pop()); sortH(R.hands[i]); books(i); }
    const targets = P.map((_, j) => j).filter(j => j !== i && R.hands[j].length);
    if (!R.hands[i].length || !targets.length) { if (!R.hands.some((h, j) => j !== i && h.length) && !R.hands[i].length) break; R.turn = (i + 1) % n; if (P.every((_, j) => !R.hands[j].length)) break; continue; }
    io.render();
    const hand = R.hands[i], ranks = [...new Set(hand.map(rank))];
    const a = await io.turn(p, {}, { auto: { t: 'ask', to: targets[0], r: ranks[0] }, validate: x => (x && x.t === 'ask' && targets.includes(x.to) && ranks.includes(x.r) ? { t: 'ask', to: x.to | 0, r: x.r | 0 } : null),
      bot: () => { const cnt = r => hand.filter(c => rank(c) === r).length; const r = ranks.slice().sort((x, y) => cnt(y) - cnt(x) + (Math.random() - 0.5))[0]; return { t: 'ask', to: targets[rnd(targets.length)], r }; }, think: 900 + Math.random() * 500 });
    const have = R.hands[a.to].filter(c => rank(c) === a.r);
    if (have.length) {
      R.hands[a.to] = R.hands[a.to].filter(c => rank(c) !== a.r); R.hands[i].push(...have); sortH(R.hands[i]);
      R.last = `${S_(P, i)} took ${plural(have.length, RN[a.r].slice(0, -1))} from ${S_(P, a.to)}`;
      io.ev(p, `asks ${nm(P[a.to])} for ${RN[a.r]} and gets ${have.length}`, `ask ${nm(P[a.to])} for ${RN[a.r]} and get ${have.length}`); books(i);
    } else {
      const c = R.draw.length ? R.draw.pop() : undefined; io.ev(p, `asks ${nm(P[a.to])} for ${RN[a.r]}. Go Fish!`, `ask ${nm(P[a.to])} for ${RN[a.r]}. Go Fish!`);
      R.last = `${S_(P, i)} asked ${S_(P, a.to)} for ${RN[a.r]}: Go Fish!`;
      if (c !== undefined) { R.hands[i].push(c); sortH(R.hands[i]); books(i); if (rank(c) === a.r) { io.ev(p, 'fishes the card they wanted and goes again', 'fish the card you wanted and go again'); io.render(); await io.sleep(800); continue; } }
      R.turn = (i + 1) % n;
    }
    io.render(); await io.sleep(800);
  }
  R.over = true; const top = Math.max(...R.books.map(b => b.length)); R.winners = R.books.map((b, i) => (b.length === top ? i : -1)).filter(i => i >= 0);
  settlePot(G, ANTE, R.winners); potSummary(G); io.render();
}
const nm = p => (p.human ? 'a player' : p.name), S_ = (P, i) => (P[i].human ? 'Player ' + (i + 1) : P[i].name);
let F0 = null, fSel = null;
const fishUI = {
  mount(stage, ctl) {
    fSel = null; const h = shell('gf', `<div class="pz-label" id="gfMsg"></div>`); stage.innerHTML = h.stage; ctl.innerHTML = h.ctl;
    $('gfHand').onclick = e => { const b = e.target.closest('[data-c]'); if (!b || !F0 || !F0.turn) return; fSel = rank(+b.dataset.c); fishUI.update(F0); };
    $('gfBtns').onclick = e => { const b = e.target.closest('[data-to]'); if (b && fSel !== null && F0.turn) { const r = fSel; fSel = null; F0.send({ t: 'ask', to: +b.dataset.to, r }); } };
  },
  update(S) {
    F0 = S; const V = S.V, g = V.g, hand = S.my && S.my.h ? S.my.h : [], my = !!S.turn;
    $('gfOpps').innerHTML = oppsHTML(S, g, i => `Books: ${g.books[i].length}`);
    $('gfMsg').innerHTML = `${esc(g.last || 'Ask a player for a card rank you hold.')}<br><small>Cards left to fish: ${g.left}. Your books: ${S.me >= 0 ? g.books[S.me].map(r => LAB[r]).join(' ') || 'none' : ''}</small>`;
    $('gfBan').innerHTML = banner(V, S);
    $('gfHand').hidden = S.me < 0; $('gfHand').classList.toggle('turn', my); $('gfHand').innerHTML = handHTML(hand, () => my, c => fSel === rank(c));
    $('gfAct').hidden = !my; if (!my) { fSel = null; return ''; }
    const targets = V.seats.map((_, j) => j).filter(j => j !== S.me && g.counts[j] > 0);
    $('gfBtns').innerHTML = targets.map(j => `<button type="button" class="b" data-to="${j}" ${fSel === null ? 'disabled' : ''}>Ask ${esc(S.nameOf(j))}${fSel !== null ? ' for ' + RN[fSel] : ''}</button>`).join('');
    $('gfHint').textContent = fSel === null ? 'Tap a card to choose the rank you want to ask for.' : 'Now choose who to ask.'; return '';
  },
};
Club.register({
  id: 'gofish', cat: 'card', name: 'Go Fish', tag: 'Ask for cards and collect sets of four.', min: 2, max: 5, soloBots: 2, roundWord: 'Game',
  art: () => ['🐟', 'K', 'K'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> collect the most <b>books</b> (four cards of the same rank).</p>
    <ol><li>You get 7 cards (5 with four or more players).</li>
    <li>On your turn tap one of your cards to pick a rank, then choose a player to <b>ask</b> for that rank. You must hold the rank you ask for.</li>
    <li>If they have it, they hand over all their cards of that rank and you ask again.</li>
    <li>If not, they say <b>Go Fish!</b> and you draw a card. If you draw the rank you asked for, you go again; otherwise your turn ends.</li>
    <li>Four of a kind is laid down as a book. When every book is made, most books wins the pot (${ANTE} chips each).</li></ol>`,
  round: roundFish, view: mkView('gf', R => ({ books: R ? R.books : [], left: R ? R.draw.length : 0, last: R ? R.last : '' })), priv: priv('gf'), ui: fishUI, _test: {},
});

/* ======================= Old Maid ======================= */
function pairOff(h, io, p, who) {   // remove pairs, return the number of pairs removed
  let removed = 0; const by = {}; h.forEach(c => { (by[rank(c)] = by[rank(c)] || []).push(c); });
  const keep = []; for (const r in by) { const a = by[r]; if (a.length % 2) keep.push(a[0]); removed += Math.floor(a.length / 2); }
  return { keep, removed };
}
async function roundMaid(G, io) {
  const P = G.players, n = P.length, deck = deck52().filter(c => c !== 44);   // the queen of spades is removed
  const R = G.om = { hands: P.map(() => []), pairs: P.map(() => 0), turn: 0, target: -1, over: false, winners: [], last: '', loser: -1 };
  deck.forEach((c, k) => R.hands[k % n].push(c));
  for (let i = 0; i < n; i++) { const r = pairOff(R.hands[i]); R.hands[i] = shuffle(r.keep); R.pairs[i] += r.removed; }
  R.turn = (G.round - 1) % n;
  const active = () => R.hands.map((h, i) => (h.length ? i : -1)).filter(i => i >= 0);
  const nextWith = i => { for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (R.hands[j].length) return j; } return -1; };
  io.render(); await io.sleep(700);
  while (active().length > 1) {
    let i = R.turn; if (!R.hands[i].length) i = nextWith(i); R.turn = i;
    const t = nextWith(i); R.target = t; io.render();
    const a = await io.turn(P[i], { target: t, size: R.hands[t].length }, { auto: { t: 'pick', k: 0 }, validate: x => (x && x.t === 'pick' && x.k >= 0 && x.k < R.hands[t].length ? { t: 'pick', k: x.k | 0 } : null), bot: () => ({ t: 'pick', k: rnd(R.hands[t].length) }), think: 900 + Math.random() * 500 });
    const c = R.hands[t].splice(a.k, 1)[0]; R.hands[i].push(c);
    const r = pairOff(R.hands[i]); R.hands[i] = shuffle(r.keep); R.pairs[i] += r.removed;
    R.last = `${S_(P, i)} drew from ${S_(P, t)}${r.removed && R.hands[i].length + 2 * r.removed >= 0 ? ' and made a pair' : ''}`;
    io.ev(P[i], `draws from ${nm(P[t])}${r.removed ? ' and makes a pair' : ''}`, `draw from ${nm(P[t])}${r.removed ? ' and make a pair' : ''}`);
    R.turn = nextWith(i) >= 0 ? nextWith(i) : i; if (!R.hands[t].length) io.ev(P[t], 'is out of cards and safe', 'are out of cards and safe');
    io.render(); await io.sleep(800);
  }
  R.over = true; R.loser = active()[0] ?? -1; R.winners = P.map((_, i) => i).filter(i => i !== R.loser);
  if (R.loser >= 0) io.ev(P[R.loser], 'is stuck with the Old Maid!', 'are stuck with the Old Maid!');
  settlePot(G, ANTE, R.winners); potSummary(G); io.render();
}
let M0 = null;
const maidUI = {
  mount(stage, ctl) {
    const h = shell('om', `<div class="pz-label" id="omMsg"></div>`); stage.innerHTML = h.stage; ctl.innerHTML = h.ctl;
    $('omOpps').onclick = e => { const b = e.target.closest('[data-k]'); if (b && M0 && M0.turn) { Snd.p('card'); M0.send({ t: 'pick', k: +b.dataset.k }); } };
  },
  update(S) {
    M0 = S; const V = S.V, g = V.g, hand = S.my && S.my.h ? S.my.h : [], my = !!S.turn, tgt = my ? S.turn.data.target : -1;
    $('omOpps').innerHTML = oppOrder(S, V.seats.length).map(i => {
      const s = V.seats[i], d = (g.delta || [])[i] || 0, out = g.counts[i] === 0 && !V.done;
      const tag = V.done ? (i === g.loser ? '<div class="tag lose">Old Maid</div>' : d > 0 ? `<div class="tag win">+${fmt(d)}</div>` : '<div class="tag dim">Safe</div>') : `<div class="tag${g.turn === i ? ' hot' : ' dim'}">${out ? 'Safe' : g.turn === i ? 'Their turn' : 'Pairs: ' + g.pairs[i]}</div>`;
      const cards = i === tgt ? `<div class="cards bt-mini">${Array.from({ length: g.counts[i] }, (_, k) => `<button type="button" class="bt-card ok" data-k="${k}" aria-label="Take card ${k + 1}">${backHTML()}</button>`).join('')}</div>` : `<div class="bt-count">${backHTML()}<b>${g.counts[i]}</b></div>`;
      return `<div class="seat${g.turn === i ? ' active' : ''}">${cards}<div class="plate"><span class="name"><span>${esc(S.nameOf(i))}</span></span><span class="style">${esc(S.tag(i))}</span><span class="stack">${fmt(s.stack)}</span></div>${tag}</div>`;
    }).join('');
    $('omMsg').textContent = g.over ? '' : g.last || 'Draw a card from the player next to you. Pairs are thrown away. Do not get stuck with the Queen!';
    $('omBan').innerHTML = banner(V, S);
    $('omHand').hidden = S.me < 0; $('omHand').classList.toggle('turn', my); $('omHand').innerHTML = handHTML(hand, () => false);
    $('omAct').hidden = !my; $('omHint').textContent = my ? `Tap one of ${esc(S.nameOf(tgt))}'s face-down cards to take it.` : ''; return '';
  },
};
Club.register({
  id: 'oldmaid', cat: 'card', name: 'Old Maid', tag: 'Draw, pair up and dodge the lonely Queen.', min: 2, max: 6, soloBots: 3, roundWord: 'Game',
  art: () => ['Q♥', 'Q♦', 'Q♣'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> do not be the last player holding a card.</p>
    <ol><li>One queen (the Queen of Spades) is removed, so one queen has no partner: that is the <b>Old Maid</b>. All cards are dealt and pairs are thrown away automatically.</li>
    <li>On your turn, take one card from the player on your left. You pick which of their face-down cards to take.</li>
    <li>If it makes a pair with a card in your hand, the pair is thrown away.</li>
    <li>When you have no cards left you are safe. The player left holding the Old Maid loses.</li>
    <li>Each player puts in ${ANTE} chips; the loser's stake is shared by everyone who got safely out.</li></ol>`,
  round: roundMaid, view: mkView('om', R => ({ pairs: R ? R.pairs : [], last: R ? R.last : '', loser: R ? R.loser : -1 })), priv: priv('om'), ui: maidUI, _test: {},
});

/* ======================= Cheat (I Doubt It) ======================= */
async function roundCheat(G, io) {
  const P = G.players, n = P.length, deck = deck52();
  const R = G.ch = { hands: P.map(() => []), pile: [], rank: 0, turn: (G.round - 1) % n, over: false, winner: -1, winners: [], play: null, reveal: null };
  deck.forEach((c, k) => R.hands[k % n].push(c)); R.hands.forEach(sortH);
  io.render(); await io.sleep(600);
  while (!R.over) {
    const i = R.turn, p = P[i], hand = R.hands[i], cur = R.rank; R.reveal = null; io.render();
    const a = await io.turn(p, { kind: 'play', rank: cur }, {
      auto: { t: 'play', ids: [hand[0]] }, validate: x => (x && x.t === 'play' && Array.isArray(x.ids) && x.ids.length >= 1 && x.ids.length <= 4 && new Set(x.ids).size === x.ids.length && x.ids.every(c => hand.includes(c)) ? { t: 'play', ids: x.ids.map(Number) } : null),
      bot: () => { const mine = hand.filter(c => rank(c) === cur); if (mine.length && (Math.random() < 0.85 || mine.length === hand.length)) return { t: 'play', ids: mine.slice(0, 1 + rnd(mine.length)) }; const k = Math.random() < 0.3 && hand.length > 2 ? 2 : 1; return { t: 'play', ids: shuffle(hand.filter(c => rank(c) !== cur)).slice(0, k).concat(!hand.some(c => rank(c) !== cur) ? mine.slice(0, 1) : []).slice(0, Math.max(1, k)) }; }, think: 900 + Math.random() * 500 });
    a.ids.forEach(c => hand.splice(hand.indexOf(c), 1)); R.pile.push(...a.ids); R.play = { p: i, n: a.ids.length, rank: cur, ids: a.ids }; R.rank = (cur + 1) % 13;
    io.ev(p, `puts down ${plural(a.ids.length, RN[cur].slice(0, -1))}`, `put down ${plural(a.ids.length, RN[cur].slice(0, -1))}`);
    const j = (i + 1) % n; io.render();
    const mineOfRank = R.hands[j].filter(c => rank(c) === cur).length;
    const b = await io.turn(P[j], { kind: 'call', p: i, n: a.ids.length, rank: cur }, { auto: { t: 'pass' }, validate: x => (x && (x.t === 'call' || x.t === 'pass') ? { t: x.t } : null),
      bot: () => { const sure = a.ids.length + mineOfRank > 4; const few = R.hands[i].length <= 1; return { t: sure || (few && Math.random() < 0.7) || Math.random() < 0.1 + a.ids.length * 0.06 ? 'call' : 'pass' }; }, think: 900 + Math.random() * 400 });
    let called = false;
    if (b.t === 'call') {
      called = true; const honest = a.ids.every(c => rank(c) === cur); R.reveal = { ids: a.ids, honest, p: i, caller: j };
      const loser = honest ? j : i; R.hands[loser].push(...R.pile); sortH(R.hands[loser]); const k = R.pile.length; R.pile = [];
      io.ev(P[j], honest ? `calls cheat but ${nm(p)} was honest! Picks up ${k} cards` : `calls cheat and catches ${nm(p)}! They pick up ${k} cards`, honest ? `call cheat but ${nm(p)} was honest! You pick up ${k} cards` : `call cheat and catch ${nm(p)}! They pick up ${k} cards`);
      io.render(); await io.sleep(2200);
    }
    if (!R.hands[i].length) { R.over = true; R.winner = i; break; }
    R.turn = j; io.render(); await io.sleep(called ? 100 : 500);
  }
  R.winners = [R.winner]; settlePot(G, ANTE, R.winners); potSummary(G); io.render();
}
let C0 = null, cSel = new Set();
const cheatUI = {
  mount(stage, ctl) {
    cSel = new Set(); const h = shell('ch', `<div class="rs-mid"><div class="rs-pile"><div class="card back"></div><span id="chPile"></span></div><div class="rs-disc" id="chRev"></div><div class="rs-info"><div class="hint" id="chNote"></div></div></div>`); stage.innerHTML = h.stage; ctl.innerHTML = h.ctl;
    $('chHand').onclick = e => { const b = e.target.closest('[data-c]'); if (!b || !C0 || !C0.turn || C0.turn.data.kind !== 'play') return; const id = +b.dataset.c; if (cSel.has(id)) cSel.delete(id); else if (cSel.size < 4) cSel.add(id); cheatUI.update(C0); };
    $('chBtns').onclick = e => { const b = e.target.closest('[data-a]'); if (!b || !C0.turn) return; const a = b.dataset.a; if (a === 'play') { if (!cSel.size) return; const ids = [...cSel]; cSel = new Set(); C0.send({ t: 'play', ids }); } else C0.send({ t: a }); };
  },
  update(S) {
    C0 = S; const V = S.V, g = V.g, hand = S.my && S.my.h ? S.my.h : [], my = !!S.turn, kind = my ? S.turn.data.kind : '';
    $('chOpps').innerHTML = oppsHTML(S, g);
    $('chPile').textContent = g.pile ? g.pile + ' in pile' : 'Pile empty';
    $('chRev').innerHTML = g.reveal ? g.reveal.ids.map(c => cardH(c)).join('') : '';
    $('chNote').innerHTML = g.over ? '' : g.reveal ? (g.reveal.honest ? `<b>${esc(S.nameOf(g.reveal.p))}</b> was honest!` : `<b>${esc(S.nameOf(g.reveal.p))}</b> was bluffing!`) : g.play ? `${esc(S.nameOf(g.play.p))} said ${plural(g.play.n, RN[g.play.rank].slice(0, -1))}. Next up: <b>${RN[g.rank]}</b>` : `First up: <b>${RN[g.rank]}</b>`;
    $('chBan').innerHTML = banner(V, S);
    $('chHand').hidden = S.me < 0; $('chHand').classList.toggle('turn', my && kind === 'play'); $('chHand').innerHTML = handHTML(hand, () => my && kind === 'play', c => cSel.has(c));
    $('chAct').hidden = !my; if (!my) { cSel = new Set(); return ''; }
    if (kind === 'play') { $('chBtns').innerHTML = `<button type="button" class="b gold" data-a="play" ${cSel.size ? '' : 'disabled'}>Put down ${cSel.size || ''} as ${RN[S.turn.data.rank]}</button>`; $('chHint').textContent = `Select 1 to 4 cards and say they are ${RN[S.turn.data.rank]}. You may bluff!`; }
    else { const d = S.turn.data; $('chBtns').innerHTML = `<button type="button" class="b gold" data-a="call">Cheat! 🤥</button><button type="button" class="b" data-a="pass">Let it go</button>`; $('chHint').textContent = `${S.nameOf(d.p)} says they put down ${plural(d.n, RN[d.rank].slice(0, -1))}. Do you believe them?`; }
    return '';
  },
};
Club.register({
  id: 'cheat', cat: 'card', name: 'Cheat (I Doubt It)', tag: 'Bluff your cards down, and catch the liars.', min: 2, max: 6, soloBots: 3, roundWord: 'Game',
  art: () => ['🤥', 'A', '2'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> be the first to get rid of all your cards.</p>
    <ol><li>All cards are dealt. The required rank goes up each turn: Aces, Twos, Threes … Kings, then Aces again.</li>
    <li>On your turn, put 1 to 4 cards <b>face down</b> and say they are the required rank. You may <b>lie</b>.</li>
    <li>The next player can <b>call Cheat</b>. The cards are turned over. If you lied, you pick up the whole pile. If you told the truth, the caller picks it up.</li>
    <li>If they let it go, the pile stays and play continues.</li>
    <li>First to empty their hand (and survive the next call) wins the pot. Each player puts in ${ANTE} chips.</li></ol>`,
  round: roundCheat, view: mkView('ch', R => ({ pile: R ? R.pile.length : 0, rank: R ? R.rank : 0, play: R && R.play ? { p: R.play.p, n: R.play.n, rank: R.play.rank } : null, reveal: R ? R.reveal : null })), priv: priv('ch'), ui: cheatUI, _test: {},
});
})();
