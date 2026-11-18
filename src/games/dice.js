/* ---------- Dice games: Pig, Shut the Box, Bankroll. Free chips only ---------- */
(function () {
const ANTE = 20, FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const rollD = () => 1 + rnd(6);
const dieHTML = (v, cls) => `<span class="die${cls ? ' ' + cls : ''}">${FACE[v] || ''}</span>`;
const done = (G, w) => { settlePot(G, ANTE, w); potSummary(G); };

/* ================= Pig ================= */
const GOAL = 50;
async function pigRound(G, io) {
  const P = G.players, n = P.length;
  const Z = G.pg = { score: P.map(() => 0), turn: (G.round - 1) % n, tt: 0, die: 0, over: false, winner: -1, busted: false };
  io.render(); await io.sleep(400);
  while (!Z.over) {
    const i = Z.turn, p = P[i]; Z.tt = 0; Z.busted = false; Z.die = 0;
    for (;;) {
      io.render();
      const a = await io.turn(p, {}, { auto: { t: Z.tt >= 15 ? 'hold' : 'roll' },
        validate: x => (x && (x.t === 'roll' || (x.t === 'hold' && Z.tt > 0)) ? { t: x.t } : null),
        bot: () => ({ t: Z.tt > 0 && (Z.tt >= 18 || Z.score[i] + Z.tt >= GOAL) ? 'hold' : 'roll' }), think: 900 + Math.random() * 500 });
      if (a.t === 'hold') { Z.score[i] += Z.tt; io.ev(p, `holds and banks ${Z.tt}`, `hold and bank ${Z.tt}`); Z.tt = 0; break; }
      const d = rollD(); Z.die = d;
      if (d === 1) { Z.busted = true; io.ev(p, `rolls a 1 and loses ${Z.tt}`, `roll a 1 and lose ${Z.tt}`); Z.tt = 0; io.render(); await io.sleep(1000); break; }
      Z.tt += d;
      if (Z.score[i] + Z.tt >= GOAL) { Z.score[i] += Z.tt; Z.tt = 0; break; }
    }
    if (Z.score[i] >= GOAL) { Z.over = true; Z.winner = i; } else Z.turn = (i + 1) % n;
    io.render();
  }
  done(G, [Z.winner]); io.render();
}
function pigView(G) {
  const Z = G.pg;
  if (!Z || Z.score.length !== G.players.length) return { score: G.players.map(() => 0), turn: -1, tt: 0, die: 0, over: false, winner: -1, busted: false, delta: [] };
  return { score: Z.score, turn: Z.over ? -1 : Z.turn, tt: Z.tt, die: Z.die, over: Z.over, winner: Z.winner, busted: Z.busted, delta: G.players.map(p => (Z.over ? p.delta || 0 : 0)) };
}
let S1 = null;
const pigUI = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table pz"><div class="bt-opps" id="pgSeats"></div><div class="pg-die" id="pgDie"></div><div class="pz-label" id="pgMsg"></div><div class="banner" id="pgBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="pgAct" hidden><div class="betrow"><button type="button" class="b gold" data-t="roll">Roll the die</button><button type="button" class="b" data-t="hold" id="pgHold">Hold and bank</button></div><p class="hint bt-hint">Keep rolling to build your turn total. Roll a 1 and you lose it. Hold to bank it.</p></div>`;
    $('pgAct').onclick = e => { const b = e.target.closest('[data-t]'); if (b && S1.turn) S1.send({ t: b.dataset.t }); };
  },
  update(S) {
    S1 = S; const V = S.V, g = V.g;
    $('pgSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, doing: 'Rolling…', extra: i => `${g.score[i]} of ${GOAL}` });
    $('pgDie').innerHTML = g.die ? dieHTML(g.die, g.busted ? 'bust' : '') : '';
    $('pgMsg').textContent = g.over ? '' : g.busted ? 'Rolled a 1! Turn total lost.' : g.turn >= 0 ? `Turn total: ${g.tt}` : '';
    $('pgBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('pgAct').hidden = !S.turn; if (S.turn) $('pgHold').disabled = g.tt === 0;
    return '';
  },
};
Club.register({
  id: 'pig', cat: 'dice', name: 'Pig', tag: 'Roll to build a score, but a 1 loses it all. First to 50.', min: 2, max: 6, soloBots: 2, roundWord: 'Game',
  art: () => [3, 6, 1].map(c => `<div class="ltile">${FACE[c]}</div>`).join(''),
  rules: `<p><b>Goal:</b> be the first player to reach ${GOAL} points.</p>
    <ol><li>On your turn, press <b>Roll the die</b>. The number you roll is added to your <b>turn total</b>.</li>
    <li>Roll again to add more, or press <b>Hold and bank</b> to add your turn total to your score and pass the turn.</li>
    <li>But if you roll a <b>1</b>, you lose your whole turn total and the turn passes.</li>
    <li>The more you roll, the more you can lose. Decide when to stop.</li>
    <li>First to ${GOAL} wins the pot. Each player puts in ${ANTE} free chips. Chips have no cash value.</li></ol>`,
  round: pigRound, view: pigView, ui: pigUI, _test: {},
});

/* ================= Shut the Box ================= */
function subsets(open, target) {
  const out = [];
  const rec = (k, left, cur) => { if (left === 0) { out.push(cur.slice()); return; } for (let i = k; i < open.length; i++) if (open[i] <= left) { cur.push(open[i]); rec(i + 1, left - open[i], cur); cur.pop(); } };
  rec(0, target, []); return out;
}
async function boxRound(G, io) {
  const P = G.players, n = P.length;
  const Z = G.sb = { tiles: P.map(() => Array(9).fill(true)), turn: (G.round - 1) % n, dice: [], over: false, winners: [], finished: P.map(() => false), note: '' };
  io.render(); await io.sleep(400);
  for (let k = 0; k < n; k++) {
    const i = (Z.turn + k) % n, p = P[i], t = Z.tiles[i]; Z.turn = i;
    for (;;) {
      const open = t.map((o, x) => (o ? x + 1 : 0)).filter(Boolean);
      if (!open.length) break;
      const one = !t[6] && !t[7] && !t[8];            // tiles 7, 8 and 9 shut: roll a single die
      Z.dice = one ? [rollD()] : [rollD(), rollD()]; Z.note = '';
      const sum = Z.dice.reduce((a, b) => a + b, 0), opts = subsets(open, sum);
      io.render(); await io.sleep(900);
      if (!opts.length) { Z.note = 'No tiles add up to that. Turn over.'; io.ev(p, `rolls ${sum} and cannot shut any tiles`, `roll ${sum} and cannot shut any tiles`); io.render(); await io.sleep(1100); break; }
      const best = opts.slice().sort((a, b) => b.reduce((s, v) => s + v * v, 0) - a.reduce((s, v) => s + v * v, 0))[0];
      const a = await io.turn(p, { sum }, { auto: { t: 'shut', tiles: best },
        validate: x => (x && x.t === 'shut' && Array.isArray(x.tiles) && x.tiles.length <= 9 && new Set(x.tiles).size === x.tiles.length && x.tiles.every(v => Number.isInteger(v) && v >= 1 && v <= 9 && t[v - 1]) && x.tiles.reduce((s, v) => s + v, 0) === sum ? { t: 'shut', tiles: x.tiles.slice().sort((a, b) => a - b) } : null),
        bot: () => ({ t: 'shut', tiles: best }), think: 1000 + Math.random() * 500 });
      a.tiles.forEach(v => { t[v - 1] = false; });
      io.ev(p, `rolls ${sum} and shuts ${a.tiles.join(' + ')}`, `roll ${sum} and shut ${a.tiles.join(' + ')}`);
    }
    Z.finished[i] = true; Z.dice = []; io.render();
  }
  const sc = Z.tiles.map(t => t.reduce((s, o, x) => s + (o ? x + 1 : 0), 0)), low = Math.min(...sc);
  Z.winners = sc.map((s, i) => (s === low ? i : -1)).filter(i => i >= 0); Z.over = true; Z.turn = -1;
  done(G, Z.winners);
  io.line(`Open tiles add up to: ${P.map((p, i) => `${p.human ? 'player ' + (i + 1) : p.name} ${sc[i]}`).join(', ')}.`, true); io.render();
}
function boxView(G) {
  const Z = G.sb;
  if (!Z || Z.tiles.length !== G.players.length) return { tiles: G.players.map(() => Array(9).fill(true)), turn: -1, dice: [], over: false, winners: [], finished: G.players.map(() => false), note: '', delta: [] };
  return { tiles: Z.tiles, turn: Z.over ? -1 : Z.turn, dice: Z.dice, over: Z.over, winners: Z.winners, finished: Z.finished, note: Z.note, delta: G.players.map(p => (Z.over ? p.delta || 0 : 0)) };
}
let S2 = null, picked = [];
const tilesHTML = (t, can) => t.map((o, x) => `<button type="button" class="sb-t${o ? '' : ' shut'}${picked.includes(x + 1) ? ' pick' : ''}" data-v="${x + 1}" ${o && can ? '' : 'disabled'} aria-label="Tile ${x + 1}${o ? '' : ', shut'}">${x + 1}</button>`).join('');
function boxDraw() {
  const S = S2, g = S.V.g, me = S.me >= 0 ? S.me : 0, cur = g.turn >= 0 ? g.turn : me;
  $('sbTiles').innerHTML = tilesHTML(g.tiles[cur] || Array(9).fill(true), !!S.turn && cur === S.me);
  const sum = S.turn ? S.turn.data.sum : 0, ps = picked.reduce((a, b) => a + b, 0);
  $('sbGo').disabled = !(S.turn && sum && ps === sum);
  $('sbHint').textContent = S.turn ? `You rolled ${sum}. Pick open tiles that add up to ${sum}. Picked so far: ${ps}.` : '';
}
const boxUI = {
  mount(stage, ctl) {
    picked = [];
    stage.innerHTML = `<section class="table pz"><div class="bt-opps" id="sbSeats"></div><div class="pz-label" id="sbWho"></div><div class="sb-tiles" id="sbTiles"></div><div class="bd-dice" id="sbDice"></div><div class="pz-label" id="sbNote"></div><div class="banner" id="sbBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="sbAct" hidden><div class="betrow"><button type="button" class="ghost" id="sbClear">Clear</button><button type="button" class="b gold small" id="sbGo" disabled>Shut these tiles</button></div><p class="hint bt-hint" id="sbHint"></p></div>`;
    $('sbTiles').onclick = e => { const b = e.target.closest('[data-v]'); if (!b || !S2.turn) return; const v = +b.dataset.v; picked = picked.includes(v) ? picked.filter(x => x !== v) : [...picked, v]; boxDraw(); };
    $('sbClear').onclick = () => { picked = []; boxDraw(); };
    $('sbGo').onclick = () => { if (S2.turn) { const tiles = picked; picked = []; S2.send({ t: 'shut', tiles }); } };
  },
  update(S) {
    S2 = S; const V = S.V, g = V.g;
    if (!S.turn) picked = [];
    const open = i => g.tiles[i].reduce((s, o, x) => s + (o ? x + 1 : 0), 0);
    $('sbSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, doing: 'Rolling…', extra: i => (g.finished[i] || g.over ? `Open: ${open(i)}` : '') });
    $('sbWho').textContent = g.over ? '' : g.turn >= 0 ? `${S.nameOf(g.turn)}${g.turn === S.me ? ' (your tiles)' : ''}` : '';
    $('sbDice').innerHTML = g.dice.map(d => dieHTML(d)).join('');
    $('sbNote').textContent = g.note;
    $('sbBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('sbAct').hidden = !S.turn; boxDraw(); return '';
  },
};
Club.register({
  id: 'shutbox', cat: 'dice', name: 'Shut the Box', tag: 'Roll the dice and shut tiles that add up. Lowest score wins.', min: 1, max: 4, soloBots: 1, roundWord: 'Game',
  art: () => ['1', '2', '3'].map(c => `<div class="ltile num">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> finish with the lowest total on your open tiles. Shut them all and you score zero! One to four players.</p>
    <ol><li>You have nine tiles, numbered 1 to 9, all open.</li>
    <li>On your turn, two dice are rolled. Pick open tiles that add up exactly to the total of the dice, then press <b>Shut these tiles</b>. For example, a roll of 8 could shut 8, or 5 + 3, or 6 + 2, or 1 + 3 + 4.</li>
    <li>Keep rolling and shutting. Once tiles 7, 8 and 9 are all shut, you roll just one die.</li>
    <li>When no open tiles can add up to your roll, your turn ends. Your score is the total of the tiles still open.</li>
    <li>Then the next player takes a turn. The lowest score wins. Ties share the pot.</li>
    <li>Each player puts in ${ANTE} free chips. Chips have no cash value.</li></ol>`,
  round: boxRound, view: boxView, ui: boxUI, _test: { subsets },
});

/* ================= Bankroll ================= */
const ROUNDS = 5;
async function bankRound(G, io) {
  const P = G.players, n = P.length;
  const Z = G.bk = { score: P.map(() => 0), banked: P.map(() => false), pot: 0, rollN: 0, dice: [], roundN: 0, turn: -1, note: '', over: false, winners: [] };
  io.render(); await io.sleep(500);
  for (let r = 1; r <= ROUNDS; r++) {
    Z.roundN = r; Z.pot = 0; Z.rollN = 0; Z.banked = P.map(() => false); Z.dice = []; Z.note = `Round ${r} of ${ROUNDS}`; Z.turn = -1;
    io.render(); await io.sleep(900);
    while (Z.banked.some(b => !b) && Z.rollN < 25) {
      Z.rollN++; const d1 = rollD(), d2 = rollD(), s = d1 + d2; Z.dice = [d1, d2];
      let bust = false;
      if (Z.rollN <= 3) Z.pot += s === 7 ? 70 : s;
      else if (s === 7) bust = true; else if (d1 === d2) Z.pot *= 2; else Z.pot += s;
      Z.note = bust ? 'A 7! The pot is lost.' : Z.rollN <= 3 ? '' : d1 === d2 ? 'Doubles! The pot doubles.' : '';
      if (bust) { Z.pot = 0; io.line(`Round ${r}: a 7 busted the pot.`); io.render(); await io.sleep(1500); break; }
      io.render(); await io.sleep(800);
      for (let i = 0; i < n; i++) {
        if (Z.banked[i]) continue;
        Z.turn = i; io.render();
        const a = await io.turn(P[i], { pot: Z.pot }, { auto: { t: Z.pot >= 40 ? 'bank' : 'stay' },
          validate: x => (x && (x.t === 'bank' || x.t === 'stay') ? { t: x.t } : null),
          bot: () => ({ t: Z.pot >= 45 + (P[i].agg || 0.5) * 60 || (Z.rollN >= 6 && Z.pot >= 40) ? 'bank' : 'stay' }), think: 600 + Math.random() * 500 });
        if (a.t === 'bank') { Z.banked[i] = true; Z.score[i] += Z.pot; io.ev(P[i], `banks ${Z.pot}`, `bank ${Z.pot}`); }
      }
      Z.turn = -1;
    }
    io.render();
  }
  const top = Math.max(...Z.score); Z.winners = Z.score.map((s, i) => (s === top ? i : -1)).filter(i => i >= 0); Z.over = true; Z.turn = -1;
  done(G, Z.winners);
  io.line(`Banked totals: ${P.map((p, i) => `${p.human ? 'player ' + (i + 1) : p.name} ${Z.score[i]}`).join(', ')}.`, true); io.render();
}
function bankView(G) {
  const Z = G.bk;
  if (!Z || Z.score.length !== G.players.length) return { score: G.players.map(() => 0), banked: G.players.map(() => false), pot: 0, rollN: 0, dice: [], roundN: 0, turn: -1, note: '', over: false, winners: [], delta: [] };
  return { score: Z.score, banked: Z.banked, pot: Z.pot, rollN: Z.rollN, dice: Z.dice, roundN: Z.roundN, turn: Z.turn, note: Z.note, over: Z.over, winners: Z.winners, delta: G.players.map(p => (Z.over ? p.delta || 0 : 0)) };
}
let S3 = null;
const bankUI = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table pz"><div class="bt-opps" id="bkSeats"></div><div class="pz-label" id="bkRound"></div><div class="bd-dice" id="bkDice"></div><div class="bk-pot" id="bkPot"></div><div class="pz-label" id="bkNote"></div><div class="banner" id="bkBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="bkAct" hidden><div class="betrow"><button type="button" class="b gold" data-t="bank" id="bkBank">Bank it</button><button type="button" class="b" data-t="stay">Stay in</button></div><p class="hint bt-hint">Bank the pot to keep it for this round, or stay in for more. A 7 after the third roll wipes the pot for everyone still in.</p></div>`;
    $('bkAct').onclick = e => { const b = e.target.closest('[data-t]'); if (b && S3.turn) S3.send({ t: b.dataset.t }); };
  },
  update(S) {
    S3 = S; const V = S.V, g = V.g;
    $('bkSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, doing: 'Deciding…', extra: i => `${g.score[i]} banked${g.banked[i] && !g.over ? ' · in the bank' : ''}` });
    $('bkRound').textContent = g.roundN ? `Round ${g.roundN} of ${ROUNDS} · roll ${g.rollN}` : '';
    $('bkDice').innerHTML = g.dice.map(d => dieHTML(d)).join('');
    $('bkPot').textContent = g.over ? '' : `Pot: ${g.pot}`;
    $('bkNote').textContent = g.note;
    $('bkBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('bkAct').hidden = !S.turn; if (S.turn) $('bkBank').textContent = `Bank ${S.turn.data.pot}`;
    return '';
  },
};
Club.register({
  id: 'bankroll', cat: 'dice', name: 'Bank', tag: 'Build a shared pot and bank it before a 7 wipes it out.', min: 2, max: 8, soloBots: 3, roundWord: 'Game',
  art: () => [3, 4, 6].map(c => `<div class="ltile">${FACE[c]}</div>`).join(''),
  rules: `<p><b>Goal:</b> have the biggest banked total after ${ROUNDS} rounds. Two to eight players.</p>
    <ol><li>In each round, two dice are rolled over and over and the total is added to a shared <b>pot</b>.</li>
    <li>After every roll, each player still in decides: <b>Bank it</b> (add the current pot to your own score and sit out the rest of the round) or <b>Stay in</b>.</li>
    <li>The first three rolls are safe, and a 7 is worth 70 points. After that, a roll of <b>7 wipes out the pot</b> and ends the round for anyone who has not banked.</li>
    <li>After the first three rolls, <b>doubles</b> (the same number on both dice) <b>double the pot</b>.</li>
    <li>The round also ends when everyone has banked. After ${ROUNDS} rounds, the highest score wins the pot. Ties share it.</li>
    <li>Each player puts in ${ANTE} free chips. Only free play chips are used. They have no cash value.</li></ol>`,
  round: bankRound, view: bankView, ui: bankUI, _test: {},
});
})();
