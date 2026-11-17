/* ---------- Tai Ti (Big Two) ---------- */
(function () {
const R = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
const SU = ['♦','♣','♥','♠'];            // low to high
const rk = c => c >> 2, su = c => c & 3;
const isRed = c => su(c) === 0 || su(c) === 2;
const PER_CARD = 10;                      // chips each loser pays per card left in hand

// A play is 1, 2, 3 or 5 cards. key is comparable between plays of the same size.
function classify(cs) {
  const n = cs.length;
  if (n < 1 || n > 5 || n === 4) return null;
  const s = [...cs].sort((a, b) => a - b);
  if (n === 1) return { size: 1, key: s[0], kind: 'single' };
  if (n === 2) return rk(s[0]) === rk(s[1]) ? { size: 2, key: s[1], kind: 'pair' } : null;
  if (n === 3) return rk(s[0]) === rk(s[2]) ? { size: 3, key: rk(s[0]), kind: 'triple' } : null;
  const ranks = s.map(rk), flush = s.every(c => su(c) === su(s[0]));
  const cnt = {};
  ranks.forEach(r => { cnt[r] = (cnt[r] || 0) + 1; });
  const groups = Object.entries(cnt).map(([r, k]) => [+r, k]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const straight = new Set(ranks).size === 5 && ranks[4] - ranks[0] === 4 && ranks[4] <= 11;   // no 2s in a straight
  if (straight && flush) return { size: 5, key: 5e7 + s[4], kind: 'straight flush' };
  if (groups[0][1] === 4) return { size: 5, key: 4e7 + groups[0][0], kind: 'four of a kind' };
  if (groups[0][1] === 3 && groups[1] && groups[1][1] === 2) return { size: 5, key: 3e7 + groups[0][0], kind: 'full house' };
  if (flush) { let v = 0; for (let i = 4; i >= 0; i--) v = v * 13 + ranks[i]; return { size: 5, key: 2e7 + v * 4 + su(s[4]), kind: 'flush' }; }
  if (straight) return { size: 5, key: 1e7 + s[4], kind: 'straight' };
  return null;
}
const beats = (a, b) => a.size === b.size && a.key > b.key;
const KIND_LABEL = k => (k === 'single' ? 'a single' : k === 'pair' ? 'a pair' : k === 'triple' ? 'three of a kind' : 'a ' + k);

function combos(hand) {
  const cs = [], by = {};
  for (const c of hand) { cs.push([c]); (by[rk(c)] = by[rk(c)] || []).push(c); }
  for (const g of Object.values(by)) {
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      cs.push([g[i], g[j]]);
      for (let k = j + 1; k < g.length; k++) cs.push([g[i], g[j], g[k]]);
    }
  }
  const n = hand.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++)
    for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) cs.push([hand[a], hand[b], hand[c], hand[d], hand[e]]);
  return cs.map(x => ({ cs: x, cl: classify(x) })).filter(x => x.cl);
}
// Is this a legal play right now? Returns the cleaned action or null.
function checkPlay(B, hand, cs) {
  if (!Array.isArray(cs) || new Set(cs).size !== cs.length || !cs.every(c => hand.includes(c))) return null;
  const cl = classify(cs);
  if (!cl) return null;
  if (B.lead && !beats(cl, B.lead.cl)) return null;
  if (!B.lead && B.first && !cs.includes(B.lowest)) return null;
  return { t: 'play', cs: [...cs].sort((a, b) => a - b) };
}

function botMove(G, i) {
  const B = G.b, hand = B.hands[i];
  let opts = combos(hand).filter(o => !B.lead ? (!B.first || o.cs.includes(B.lowest)) : beats(o.cl, B.lead.cl));
  if (!opts.length) return { t: 'pass' };
  const minOpp = Math.min(...B.hands.filter((_, k) => k !== i).map(h => h.length));
  const topRank = o => Math.max(...o.cs.map(rk));
  if (!B.lead) {
    // lead the biggest group made of low cards; hold the 2s and aces back
    if (minOpp === 1) { const multi = opts.filter(o => o.cl.size > 1); if (multi.length) opts = multi; }
    opts.sort((a, b) => (b.cl.size * 4 - topRank(b)) - (a.cl.size * 4 - topRank(a)) || a.cl.key - b.cl.key);
    return { t: 'play', cs: opts[0].cs };
  }
  opts.sort((a, b) => a.cl.key - b.cl.key);
  if (minOpp === 1 && B.lead.cl.size === 1) opts.sort((a, b) => b.cl.key - a.cl.key);   // somebody is on one card: go high
  const o = opts[0];
  if (minOpp > 2 && hand.length > 5 && topRank(o) >= 11 && Math.random() < 0.55) return { t: 'pass' };   // keep the big cards for later
  return { t: 'play', cs: o.cs };
}

async function round(G, io) {
  const P = G.players, n = P.length;
  const deck = shuffle([...Array(52).keys()]);
  const hands = P.map(() => deck.splice(0, 13).sort((a, b) => a - b));
  const lowest = Math.min(...hands.flat());
  const B = G.b = { hands, lead: null, leadBy: -1, turn: 0, passed: P.map(() => false), first: true, lowest, over: false, winner: -1 };
  let starter = hands.findIndex(h => h.includes(lowest));
  const prev = G.lastWinnerP ? P.indexOf(G.lastWinnerP) : -1;
  if (G.round > 1 && prev >= 0) { starter = prev; B.first = false; }
  B.turn = starter;
  io.ev(P[starter], `starts${B.first ? ' with the lowest card' : ''}`, `start${B.first ? ' with the lowest card' : ''}`);
  io.render();
  await io.sleep(600);
  while (true) {
    if (B.passed[B.turn]) { B.turn = (B.turn + 1) % n; continue; }
    if (B.lead && B.leadBy === B.turn) { B.lead = null; B.passed.fill(false); io.line('Everyone passed. New lead.', false); }
    const i = B.turn, p = P[i], hand = B.hands[i];
    io.render();
    const auto = B.lead ? { t: 'pass' } : { t: 'play', cs: [B.first ? B.lowest : hand[0]] };
    const a = await io.turn(p, {}, {
      auto,
      validate: x => (x && x.t === 'pass' ? (B.lead ? { t: 'pass' } : null) : x && x.t === 'play' ? checkPlay(B, hand, x.cs) : null),
      bot: () => botMove(G, i),
      think: 800 + Math.random() * 600,
    });
    if (a.t === 'pass') {
      B.passed[i] = true; p.last = 'Pass'; io.ev(p, 'passes', 'pass');
    } else {
      const cl = classify(a.cs);
      for (const c of a.cs) hand.splice(hand.indexOf(c), 1);
      B.lead = { cs: a.cs, cl }; B.leadBy = i; B.first = false;
      io.ev(p, `plays ${cl.kind === 'five' ? 'five cards' : KIND_LABEL(cl.kind)}`, `play ${KIND_LABEL(cl.kind)}`);
      if (hand.length === 1) io.ev(p, 'has one card left!', 'have one card left!');
      if (!hand.length) { B.over = true; B.winner = i; io.render(); break; }
    }
    G.fast = P.filter(q => q.human).length > 0 && B.hands.every((h, k) => !P[k].human || h.length === 0);
    B.turn = (B.turn + 1) % n;
  }
  // settle: every other player pays per card left
  const w = P[B.winner]; G.lastWinnerP = w;
  let total = 0;
  const lines = [];
  P.forEach((p, i) => {
    if (i === B.winner) return;
    const due = Math.min(p.stack, B.hands[i].length * PER_CARD);
    p.stack -= due; total += due; p.won = 0; p.delta = -due;
    lines.push({ p: i, t: `pays ${fmt(due)} with ${B.hands[i].length} card${B.hands[i].length === 1 ? '' : 's'} left.`, y: `pay ${fmt(due)} with ${B.hands[i].length} card${B.hands[i].length === 1 ? '' : 's'} left.` });
  });
  w.stack += total; w.delta = total;
  G.summary = [{ p: B.winner, t: `wins the round and collects ${fmt(total)}.`, y: `win the round and collect ${fmt(total)}.` }, ...lines];
  for (const s of G.summary) G.log.push(Object.assign({ st: true }, s));
  io.render();
}

function view(G) {
  const B = G.b;
  if (!B || B.hands.length !== G.players.length) return { counts: [], lead: null, turn: -1, passed: [], over: false, hands: null, first: false, lowest: -1, delta: [] };
  return {
    counts: B.hands.map(h => h.length), lead: B.lead ? { cs: B.lead.cs, by: B.leadBy, kind: B.lead.cl.kind } : null,
    turn: B.over ? -1 : B.turn, passed: B.passed, over: B.over, hands: B.over ? B.hands : null, first: B.first, lowest: B.lowest,
    delta: G.players.map(p => (B.over ? p.delta || 0 : 0)), winner: B.winner,
  };
}

/* ----- screen ----- */
let sel = new Set(), S0 = null;
const cardHTML = (c, cls) => faceHTML(R[rk(c)], SU[su(c)], isRed(c), cls);
const ui = {
  mount(stage, ctl, S) {
    sel = new Set();
    stage.innerHTML = `<section class="table bt">
      <div class="bt-opps" id="btOpps"></div>
      <div class="center"><div class="bt-lead" id="btLead"></div><div class="banner" id="btBanner" aria-live="polite"></div></div>
      <div class="bt-hand" id="btHand" aria-label="Your cards"></div></section>`;
    ctl.innerHTML = `<div class="act" id="btAct"><p class="hint bt-hint" id="btHint"></p>
      <div class="btns"><button type="button" class="b fold" id="btPass">Pass</button>
      <button type="button" class="b" id="btClear">Clear</button>
      <button type="button" class="b gold" id="btPlay">Play</button></div></div>`;
    $('btHand').onclick = e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      const c = +b.dataset.c;
      if (sel.has(c)) sel.delete(c); else if (sel.size < 5) sel.add(c);
      ui.update(S0);
    };
    $('btClear').onclick = () => { sel.clear(); ui.update(S0); };
    $('btPass').onclick = () => { sel.clear(); S0.send({ t: 'pass' }); };
    $('btPlay').onclick = () => { const cs = [...sel]; sel.clear(); S0.send({ t: 'play', cs }); };
  },
  update(S) {
    S0 = S;
    const V = S.V, g = V.g, n = V.seats.length, me = S.me;
    const hand = S.my && S.my.h ? S.my.h : [];
    for (const c of [...sel]) if (!hand.includes(c)) sel.delete(c);
    const order = me >= 0 ? Array.from({ length: n - 1 }, (_, k) => (me + 1 + k) % n) : [...Array(n).keys()];
    $('btOpps').innerHTML = order.map(i => {
      const s = V.seats[i], d = (g.delta || [])[i] || 0;
      const tag = V.done ? (i === g.winner ? `<div class="tag win">+${fmt(d)}</div>` : `<div class="tag lose">${fmt(d)}</div>`)
        : g.passed && g.passed[i] ? '<div class="tag dim">Passed</div>' : `<div class="tag">${g.counts[i] === 1 ? 'One card!' : ''}</div>`;
      const cards = g.hands ? `<div class="cards bt-mini">${g.hands[i].map(c => cardHTML(c)).join('')}</div>` : `<div class="bt-count">${backHTML()}<b>${g.counts[i] ?? 0}</b></div>`;
      return `<div class="seat${g.turn === i ? ' active' : ''}">${cards}<div class="plate"><span class="name"><span>${esc(S.nameOf(i))}</span></span>
        <span class="style">${esc(S.tag(i))}</span><span class="stack">${fmt(s.stack)}</span></div>${tag}</div>`;
    }).join('');
    const lead = g.lead;
    $('btLead').innerHTML = lead
      ? `<div class="bt-leadcards">${lead.cs.map(c => cardHTML(c)).join('')}</div><div class="hint">${esc(S.nameOf(lead.by))} played ${esc(KIND_LABEL(lead.kind))}</div>`
      : `<div class="bt-leadcards">${'<div class="slot"></div>'}</div><div class="hint">${V.done ? '' : g.turn >= 0 ? (g.first ? 'The lowest card (3♦ if dealt) must be in the first play' : 'Open lead: play any set') : ''}</div>`;
    $('btBanner').innerHTML = V.summary.slice(0, 1).map(e => `<span>${S.text(e)}</span>`).join('');
    if (me >= 0) {
      $('btHand').hidden = false;
      $('btHand').innerHTML = hand.map(c => `<button type="button" class="bt-card${sel.has(c) ? ' sel' : ''}" data-c="${c}" aria-pressed="${sel.has(c)}">${cardHTML(c, 'noanim')}</button>`).join('');
    } else $('btHand').hidden = true;
    const act = $('btAct');
    act.hidden = !S.turn;
    if (!S.turn) return '';
    const B = { lead: g.lead ? { cl: classify(g.lead.cs) } : null, first: g.first, lowest: g.lowest };
    const pick = [...sel], cl = pick.length ? classify(pick) : null;
    const ok = pick.length && checkPlay(B, hand, pick);
    $('btPlay').disabled = !ok;
    $('btPass').disabled = !g.lead;
    $('btClear').disabled = !pick.length;
    $('btHint').textContent = !pick.length ? (g.lead ? `Beat ${KIND_LABEL(g.lead.kind)} with the same number of cards, or pass.` : 'You have the lead. Pick any single, pair, three of a kind, or five cards.')
      : !cl ? 'Those cards are not a play. Try one, two or three of a rank, or a five-card hand.'
      : !ok ? (g.lead && !beats(cl, B.lead.cl) ? 'That does not beat the cards on the table.' : 'The first play must include the lowest card.')
      : `Ready: ${KIND_LABEL(cl.kind)}.`;
    return '';
  },
};

Club.register({
  id: 'bigtwo', cat: 'card', name: 'Tai Ti', tag: 'Big Two. Empty your hand first, 2s are the highest.', min: 2, max: 4, soloBots: 3, roundWord: 'Round',
  art: () => faceHTML('2', '♠', false) + faceHTML('A', '♥', true) + faceHTML('K', '♣', false),
  rules: `<p><b>Goal:</b> be the first to play all 13 of your cards. Everyone else pays you ${PER_CARD} chips for each card they still hold.</p>
    <ul><li>Card order, low to high: 3 4 5 6 7 8 9 10 J Q K A 2. Suits, low to high: ♦ ♣ ♥ ♠.</li>
    <li>Play a single, a pair, three of a kind, or a five-card hand. Whoever is next must play the <b>same number of cards</b> and beat it, or pass.</li>
    <li>Five-card hands, low to high: straight (no 2s), flush, full house, four of a kind plus any card, straight flush.</li>
    <li>If you pass you are out of that trick. When everyone else has passed, the last player leads anything.</li>
    <li>The first play of the first round must include the lowest card. After that, the last winner leads.</li></ul>`,
  round, view,
  priv: (G, i) => ({ h: G.b && G.b.hands[i] ? G.b.hands[i] : [] }),
  ui,
  _test: { classify, combos, checkPlay, beats },
});
})();
