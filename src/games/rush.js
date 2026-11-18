/* ---------- Colour Rush: an original colour-matching, empty-your-hand game ---------- */
(function () {
const COLORS = ['Coral', 'Amber', 'Mint', 'Sky'];
// A card is colour * 16 + value. Colour 4 is wild. Values: 0-9 numbers, 10 Skip, 11 Flip, 12 Draw 2, 13 Wild, 14 Wild Draw 4.
const col = id => id >> 4, val = id => id & 15;
const SKIP = 10, FLIP = 11, D2 = 12, WILD = 13, W4 = 14;
const points = id => (val(id) <= 9 ? val(id) : val(id) <= D2 ? 20 : 50);
const label = id => { const v = val(id); return v <= 9 ? String(v) : v === SKIP ? '⊘' : v === FLIP ? '⇄' : v === D2 ? '+2' : v === WILD ? '★' : '+4'; };
const word = id => { const v = val(id); return v <= 9 ? String(v) : v === SKIP ? 'Skip' : v === FLIP ? 'Flip' : v === D2 ? 'Draw 2' : v === WILD ? 'Wild' : 'Wild Draw 4'; };

function newDeck() {
  const d = [];
  for (let c = 0; c < 4; c++) {
    d.push(c * 16);
    for (let v = 1; v <= 12; v++) { d.push(c * 16 + v); d.push(c * 16 + v); }
  }
  for (let k = 0; k < 4; k++) { d.push(64 + WILD); d.push(64 + W4); }
  return shuffle(d);
}
const canPlay = (id, top, color) => col(id) === 4 || col(id) === color || (col(top) !== 4 && val(id) === val(top));

function draw(R, k) {
  const out = [];
  for (let i = 0; i < k; i++) {
    if (!R.draw.length) {                       // reshuffle the discards, keep the top card showing
      const keep = R.discard.pop();
      R.draw = shuffle(R.discard); R.discard = [keep];
    }
    if (R.draw.length) out.push(R.draw.pop());
  }
  return out;
}
function bestColor(hand) {
  const n = [0, 0, 0, 0];
  for (const c of hand) if (col(c) < 4) n[col(c)]++;
  const m = Math.max(...n);
  return m > 0 ? n.indexOf(m) : rnd(4);
}
function botMove(G, i, forced) {
  const R = G.r, hand = R.hands[i];
  let ok = hand.filter(c => canPlay(c, R.top, R.color));
  if (forced !== undefined) return ok.includes(forced) ? { t: 'play', id: forced, color: bestColor(hand.filter(c => c !== forced)) } : { t: 'keep' };
  if (!ok.length) return { t: 'draw' };
  const nextI = (i + R.dir + G.players.length) % G.players.length;
  const nextLow = R.hands[nextI].length <= 2;
  const plain = ok.filter(c => col(c) < 4), actions = plain.filter(c => val(c) > 9);
  let pick;
  if (nextLow && actions.length) pick = actions[0];
  else if (plain.length) {
    const mine = [0, 0, 0, 0]; hand.forEach(c => { if (col(c) < 4) mine[col(c)]++; });
    pick = plain.slice().sort((a, b) => (mine[col(b)] - mine[col(a)]) || (points(b) - points(a)))[0];
  } else pick = ok.slice().sort((a, b) => val(a) - val(b))[0];     // wilds last, plain Wild before Draw 4
  return { t: 'play', id: pick, color: bestColor(hand.filter(c => c !== pick)) };
}
function cleanPlay(R, hand, a) {
  if (!a) return null;
  if (a.t === 'draw') return { t: 'draw' };
  if (a.t === 'keep') return { t: 'keep' };
  if (a.t !== 'play' || !hand.includes(a.id) || !canPlay(a.id, R.top, R.color)) return null;
  const color = col(a.id) === 4 ? (a.color >= 0 && a.color <= 3 ? a.color | 0 : bestColor(hand.filter(c => c !== a.id))) : col(a.id);
  return { t: 'play', id: a.id, color };
}

async function round(G, io) {
  const P = G.players, n = P.length;
  const R = G.r = { draw: newDeck(), discard: [], hands: P.map(() => []), top: 0, color: 0, dir: 1, turn: 0, over: false, winner: -1 };
  for (let i = 0; i < n; i++) R.hands[i] = draw(R, 7);
  while (true) { const c = R.draw.pop(); if (col(c) < 4 && val(c) <= 9) { R.top = c; R.color = col(c); R.discard.push(c); break; } R.draw.unshift(c); }
  R.turn = rnd(n);
  io.render();
  await io.sleep(700);
  const advance = (skips) => { R.turn = (((R.turn + R.dir * (1 + skips)) % n) + n) % n; };
  const sortHand = h => h.sort((a, b) => a - b);
  while (!R.over) {
    const i = R.turn, p = P[i], hand = R.hands[i];
    io.render();
    const a = await io.turn(p, { kind: 'turn' }, {
      auto: { t: 'draw' }, validate: x => cleanPlay(R, hand, x), bot: () => botMove(G, i), think: 800 + Math.random() * 500,
    });
    let play = null;
    if (a.t === 'draw') {
      const got = draw(R, 1)[0];
      if (got !== undefined) {
        hand.push(got); sortHand(hand);
        io.ev(p, 'draws a card', 'draw a card');
        if (canPlay(got, R.top, R.color)) {
          io.render();
          const b = await io.turn(p, { kind: 'drew', id: got }, {
            auto: { t: 'keep' },
            validate: x => (x && x.t === 'keep' ? { t: 'keep' } : x && x.t === 'play' && x.id === got ? cleanPlay(R, hand, x) : null),
            bot: () => botMove(G, i, got), think: 600,
          });
          if (b.t === 'play') play = b;
        }
      }
    } else if (a.t === 'play') play = a;
    if (!play) { p.last = 'Draw'; advance(0); continue; }
    // play the card
    hand.splice(hand.indexOf(play.id), 1);
    R.color = col(play.id) === 4 ? (play.color >= 0 && play.color <= 3 ? play.color : bestColor(hand)) : col(play.id);
    R.discard.push(play.id); R.top = play.id; p.last = '';
    const v = val(play.id);
    io.ev(p, `plays ${col(play.id) === 4 ? word(play.id) + ', colour ' + COLORS[R.color] : COLORS[col(play.id)] + ' ' + word(play.id)}`,
      `play ${col(play.id) === 4 ? word(play.id) + ', colour ' + COLORS[R.color] : COLORS[col(play.id)] + ' ' + word(play.id)}`);
    if (hand.length === 1) io.ev(p, 'has one card left!', 'have one card left!');
    if (!hand.length) { R.over = true; R.winner = i; break; }
    let skips = 0;
    const victim = () => (((R.turn + R.dir) % n) + n) % n;
    if (v === SKIP) skips = 1;
    else if (v === FLIP) { R.dir = -R.dir; if (n === 2) skips = 1; }
    else if (v === D2 || v === W4) {
      const k = v === D2 ? 2 : 4, t = victim();
      R.hands[t].push(...draw(R, k)); sortHand(R.hands[t]);
      io.ev(P[t], `draws ${k} cards`, `draw ${k} cards`); skips = 1;
    }
    advance(skips);
  }
  // settle: everyone else pays the winner the points left in their hands
  const w = P[R.winner];
  let total = 0; const lines = [];
  P.forEach((p, i) => {
    if (i === R.winner) return;
    const pts = R.hands[i].reduce((s, c) => s + points(c), 0), due = Math.min(p.stack, pts);
    p.stack -= due; total += due; p.delta = -due;
    lines.push({ p: i, t: `pays ${fmt(due)} for ${R.hands[i].length} card${R.hands[i].length === 1 ? '' : 's'} left.`, y: `pay ${fmt(due)} for ${R.hands[i].length} card${R.hands[i].length === 1 ? '' : 's'} left.` });
  });
  w.stack += total; w.delta = total;
  G.summary = [{ p: R.winner, t: `wins the round and collects ${fmt(total)}.`, y: `win the round and collect ${fmt(total)}.` }, ...lines];
  for (const s of G.summary) G.log.push(Object.assign({ st: true }, s));
  io.render();
}

function view(G) {
  const R = G.r;
  if (!R || R.hands.length !== G.players.length) return { top: -1, color: 0, dir: 1, turn: -1, counts: [], left: 0, over: false, hands: null, delta: [], winner: -1 };
  return {
    top: R.top, color: R.color, dir: R.dir, turn: R.over ? -1 : R.turn, counts: R.hands.map(h => h.length), left: R.draw.length,
    over: R.over, hands: R.over ? R.hands : null, delta: G.players.map(p => (R.over ? p.delta || 0 : 0)), winner: R.winner,
  };
}

/* ----- screen ----- */
let S0 = null, wildPick = null;
const COL_CLASS = ['rc0', 'rc1', 'rc2', 'rc3', 'rc4'];
const rcard = (id, cls) => `<div class="rcard ${COL_CLASS[col(id)]}${cls ? ' ' + cls : ''}"><em>${label(id)}</em><b>${label(id)}</b><em class="b2">${label(id)}</em></div>`;
const ui = {
  mount(stage, ctl, S) {
    wildPick = null;
    stage.innerHTML = `<section class="table rs">
      <div class="bt-opps" id="rsOpps"></div>
      <div class="rs-mid">
        <button type="button" class="rs-pile" id="rsDraw" aria-label="Draw a card"><div class="card back"></div><span id="rsLeft"></span></button>
        <div class="rs-disc" id="rsDisc"></div>
        <div class="rs-info"><div class="rs-colour" id="rsColour"></div><div class="hint" id="rsDir"></div></div>
      </div>
      <div class="banner" id="rsBanner" aria-live="polite"></div>
      <div class="bt-hand rs-hand" id="rsHand" aria-label="Your cards"></div></section>`;
    ctl.innerHTML = `<div class="act" id="rsAct"><p class="hint bt-hint" id="rsHint"></p>
      <div class="betrow" id="rsColors" hidden>${COLORS.map((c, k) => `<button type="button" class="pill rcpick rc${k}" data-k="${k}">${c}</button>`).join('')}<button type="button" class="pill" id="rsCancel">Cancel</button></div>
      <div class="btns two"><button type="button" class="b" id="rsDrawBtn">Draw a card</button><button type="button" class="b fold" id="rsKeep" hidden>Keep it</button></div></div>`;
    const draw = () => { wildPick = null; S0.send({ t: 'draw' }); };
    $('rsDraw').onclick = () => { if (S0.turn && S0.turn.data.kind === 'turn') draw(); };
    $('rsDrawBtn').onclick = draw;
    $('rsKeep').onclick = () => { wildPick = null; S0.send({ t: 'keep' }); };
    $('rsCancel').onclick = () => { wildPick = null; ui.update(S0); };
    $('rsColors').onclick = e => {
      const b = e.target.closest('.rcpick'); if (!b || wildPick === null) return;
      const id = wildPick; wildPick = null; S0.send({ t: 'play', id, color: +b.dataset.k });
    };
    $('rsHand').onclick = e => {
      const b = e.target.closest('[data-c]'); if (!b || !S0.turn) return;
      const id = +b.dataset.c, g = S0.V.g;
      if (!canPlay(id, g.top, g.color)) return;
      if (S0.turn.data.kind === 'drew' && S0.turn.data.id !== id) return;
      if (col(id) === 4) { wildPick = id; ui.update(S0); return; }
      S0.send({ t: 'play', id, color: col(id) });
    };
  },
  update(S) {
    S0 = S;
    const V = S.V, g = V.g, n = V.seats.length, me = S.me;
    const hand = S.my && S.my.h ? S.my.h : [];
    const order = me >= 0 ? Array.from({ length: n - 1 }, (_, k) => (me + 1 + k) % n) : [...Array(n).keys()];
    $('rsOpps').innerHTML = order.map(i => {
      const s = V.seats[i], d = (g.delta || [])[i] || 0;
      const tag = V.done ? (i === g.winner ? `<div class="tag win">+${fmt(d)}</div>` : `<div class="tag lose">${fmt(d)}</div>`) : `<div class="tag${g.counts[i] === 1 ? ' hot' : ''}">${g.counts[i] === 1 ? 'One card!' : ''}</div>`;
      const cards = g.hands ? `<div class="cards bt-mini rs-mini">${g.hands[i].map(c => rcard(c)).join('')}</div>` : `<div class="bt-count">${backHTML()}<b>${g.counts[i] ?? 0}</b></div>`;
      return `<div class="seat${g.turn === i ? ' active' : ''}">${cards}<div class="plate"><span class="name"><span>${esc(S.nameOf(i))}</span></span>
        <span class="style">${esc(S.tag(i))}</span><span class="stack">${fmt(s.stack)}</span></div>${tag}</div>`;
    }).join('');
    $('rsLeft').textContent = g.left ? g.left + ' left' : '';
    $('rsDisc').innerHTML = g.top >= 0 ? rcard(g.top, 'big') : '';
    $('rsColour').className = 'rs-colour rc' + g.color;
    $('rsColour').textContent = COLORS[g.color] || '';
    $('rsDir').textContent = g.dir === 1 ? 'Play goes clockwise' : 'Play goes anticlockwise';
    $('rsBanner').innerHTML = V.summary.slice(0, 1).map(e => `<span>${S.text(e)}</span>`).join('');
    const myTurn = !!S.turn, drew = myTurn && S.turn.data.kind === 'drew';
    if (me >= 0) {
      $('rsHand').hidden = false;
      $('rsHand').classList.toggle('turn', myTurn);
      $('rsHand').innerHTML = hand.map(c => {
        const ok = myTurn && canPlay(c, g.top, g.color) && (!drew || S.turn.data.id === c);
        return `<button type="button" class="bt-card${ok ? ' ok' : ''}${wildPick === c ? ' sel' : ''}" data-c="${c}" ${ok ? '' : 'aria-disabled="true"'}>${rcard(c)}</button>`;
      }).join('');
    } else $('rsHand').hidden = true;
    $('rsAct').hidden = !myTurn;
    if (!myTurn) { wildPick = null; return ''; }
    $('rsColors').hidden = wildPick === null;
    $('rsDrawBtn').hidden = drew || wildPick !== null; $('rsKeep').hidden = !drew || wildPick !== null;
    $('rsKeep').parentElement.hidden = wildPick !== null;
    const any = hand.some(c => canPlay(c, g.top, g.color));
    $('rsHint').textContent = wildPick !== null ? 'Pick the colour for the wild card.'
      : drew ? `You drew ${word(S.turn.data.id)}. Play it, or keep it and pass.`
      : any ? `Match the ${COLORS[g.color]} colour or the symbol. Tap a glowing card.` : 'Nothing to play. Draw a card.';
    return '';
  },
};

Club.register({
  id: 'rush', cat: 'card', name: 'Uno', tag: 'Match colours and numbers. First empty hand wins.', min: 2, max: 6, soloBots: 3, roundWord: 'Round',
  art: () => `<div class="rcard rc0 art"><b>7</b></div><div class="rcard rc4 art"><b>★</b></div><div class="rcard rc3 art"><b>⇄</b></div>`,
  rules: `<p><b>Goal:</b> be the first to play every card. Everyone else pays you the points left in their hand.</p>
    <ul><li>Everyone starts with 7 cards. On your turn, play a card that matches the top card by <b>colour</b> or by <b>number or symbol</b>.</li>
    <li>Can't play? Draw a card. If it fits you may play it right away, or keep it and pass.</li>
    <li><b>⊘ Skip</b>: the next player loses a turn. <b>⇄ Flip</b>: play reverses direction (with two players it acts as a skip). <b>+2</b>: the next player draws 2 and loses a turn.</li>
    <li><b>★ Wild</b>: play any time and choose the colour. <b>+4 Wild</b>: choose the colour; the next player draws 4 and loses a turn.</li>
    <li>Points left in hand: numbers count their face value, action cards 20, wilds 50.</li></ul>`,
  round, view,
  priv: (G, i) => ({ h: G.r && G.r.hands[i] ? G.r.hands[i] : [] }),
  ui,
  _test: { canPlay, newDeck, botMove },
});
})();
