/* ---------- Property Tycoon (a Monopoly-style board game) ---------- */
(function () {
const ANTE = 20, START = 1500, GO_PAY = 200, JAIL_FEE = 50, ROUNDS = 20;
const GRP = { brown: '#8b5a2b', lb: '#8fd3f0', pink: '#e279b6', orange: '#f29443', red: '#d83a2f', yellow: '#f0cf3a', green: '#2f9d4f', blue: '#2b52c0' };
const RAW = [
  ['go', 'GO'], ['p', 'Mill Lane', 'brown', 60, 2], ['luck', 'Luck'], ['p', 'Cobble Street', 'brown', 60, 4], ['tax', 'Income Tax', 200], ['rail', 'Northern Railway'],
  ['p', 'Harbour Road', 'lb', 100, 6], ['chance', 'Chance'], ['p', 'Pier Avenue', 'lb', 100, 6], ['p', 'Lighthouse Way', 'lb', 120, 8],
  ['jail', 'Jail'], ['p', 'Maple Court', 'pink', 140, 10], ['util', 'Power Company'], ['p', 'Orchard Street', 'pink', 140, 10], ['p', 'Cherry Row', 'pink', 160, 12], ['rail', 'Eastern Railway'],
  ['p', 'Market Square', 'orange', 180, 14], ['luck', 'Luck'], ['p', 'Guild Street', 'orange', 180, 14], ['p', 'Bell Tower Road', 'orange', 200, 16],
  ['free', 'Free Parking'], ['p', 'Rosewood Avenue', 'red', 220, 18], ['chance', 'Chance'], ['p', 'Garden Terrace', 'red', 220, 18], ['p', 'Fountain Plaza', 'red', 240, 20], ['rail', 'Southern Railway'],
  ['p', 'Castle Gate', 'yellow', 260, 22], ['p', 'Palace Road', 'yellow', 260, 22], ['util', 'Water Works'], ['p', 'Crown Street', 'yellow', 280, 24],
  ['gojail', 'Go to Jail'], ['p', 'Lakeside Drive', 'green', 300, 26], ['p', 'Emerald Avenue', 'green', 300, 26], ['luck', 'Luck'], ['p', 'Hilltop Boulevard', 'green', 320, 28], ['rail', 'Western Railway'],
  ['chance', 'Chance'], ['p', 'Skyline Tower', 'blue', 350, 35], ['tax', 'Luxury Tax', 100], ['p', 'Royal Avenue', 'blue', 400, 50],
];
const SQ = RAW.map((r, i) => {
  const o = { i, k: r[0], name: r[1] };
  if (r[0] === 'p') { o.g = r[2]; o.price = r[3]; o.rent = r[4]; o.cost = (Math.floor(i / 10) + 1) * 50; const m = o.price <= 150 ? [5, 15, 45, 80, 125] : o.price <= 300 ? [5, 15, 40, 50, 60] : [4, 11, 28, 34, 40]; o.rents = [o.rent, ...m.map(x => Math.round(o.rent * x / 5) * 5)]; }
  else if (r[0] === 'rail') o.price = 200; else if (r[0] === 'util') o.price = 150; else if (r[0] === 'tax') o.amt = r[2];
  return o;
});
const GROUPS = {}; SQ.forEach(q => { if (q.g) (GROUPS[q.g] = GROUPS[q.g] || []).push(q.i); });
const RAILS = SQ.filter(q => q.k === 'rail').map(q => q.i), UTILS = SQ.filter(q => q.k === 'util').map(q => q.i);
const ownable = q => q.k === 'p' || q.k === 'rail' || q.k === 'util';
const CHANCE = [
  ['Advance to GO and collect 200.', 'goto', 0], ['Take a trip to Royal Avenue.', 'goto', 39], ['Advance to Rosewood Avenue.', 'goto', 21], ['Advance to Maple Court.', 'goto', 11],
  ['Go to the nearest railway. If it is owned, pay double rent.', 'rail'], ['The bank pays you a dividend of 50.', 'cash', 50], ['Go back three spaces.', 'back', 3], ['Go directly to Jail. Do not pass GO.', 'jail'],
  ['Repairs: pay 25 per house and 100 per hotel.', 'repair', 25, 100], ['Speeding fine. Pay 15.', 'cash', -15], ['You win a crossword competition. Collect 100.', 'cash', 100], ['Your building loan matures. Collect 150.', 'cash', 150],
];
const LUCK = [
  ['Bank error in your favour. Collect 200.', 'cash', 200], ['Doctor’s fee. Pay 50.', 'cash', -50], ['Sale of stock. Collect 50.', 'cash', 50], ['Go directly to Jail. Do not pass GO.', 'jail'],
  ['It is your birthday. Collect 10 from every player.', 'each', 10], ['Tax refund. Collect 20.', 'cash', 20], ['Hospital fees. Pay 100.', 'cash', -100], ['School fees. Pay 50.', 'cash', -50],
  ['You inherit 100.', 'cash', 100], ['Advance to GO and collect 200.', 'goto', 0], ['Street repairs: pay 40 per house and 115 per hotel.', 'repair', 40, 115], ['Charity dinner. Pay 25 to each player.', 'each', -25],
];

// ---------- pure rule helpers (work on a plain state object so the UI can reuse them) ----------
const groupOf = q => GROUPS[SQ[q].g] || [];
const hasSet = (s, i, q) => groupOf(q).every(x => s.own[x] === i);
const unCost = q => Math.ceil(SQ[q].price / 2 * 1.1);
function canBuild(s, i, q) {
  const c = SQ[q]; if (c.k !== 'p' || s.own[q] !== i || !hasSet(s, i, q) || s.hs[q] >= 5 || s.cash[i] < c.cost) return false;
  const gr = groupOf(q); return !gr.some(x => s.mort[x]) && s.hs[q] <= Math.min(...gr.map(x => s.hs[x]));
}
const canSell = (s, i, q) => SQ[q].k === 'p' && s.own[q] === i && s.hs[q] > 0 && s.hs[q] >= Math.max(...groupOf(q).map(x => s.hs[x]));
const canMort = (s, i, q) => ownable(SQ[q]) && s.own[q] === i && !s.mort[q] && (SQ[q].k !== 'p' || groupOf(q).every(x => !s.hs[x]));
const canUnmort = (s, i, q) => ownable(SQ[q]) && s.own[q] === i && !!s.mort[q] && s.cash[i] >= unCost(q);
function rentOf(s, q, dice) {
  const c = SQ[q], o = s.own[q]; if (o < 0 || s.mort[q]) return 0;
  if (c.k === 'rail') return 25 * Math.pow(2, RAILS.filter(x => s.own[x] === o).length - 1);
  if (c.k === 'util') return (UTILS.every(x => s.own[x] === o) ? 10 : 4) * dice;
  if (s.hs[q]) return c.rents[s.hs[q]];
  return c.rents[0] * (hasSet(s, o, q) && !groupOf(q).some(x => s.mort[x]) ? 2 : 1);
}
function worth(s, i) {
  let w = s.cash[i];
  for (let q = 0; q < 40; q++) if (s.own[q] === i) { w += s.mort[q] ? SQ[q].price / 2 : SQ[q].price; w += (s.hs[q] || 0) * (SQ[q].cost || 0); }
  return w;
}
const nearest = (from, list) => { for (let d = 1; d <= 40; d++) { const q = (from + d) % 40; if (list.includes(q)) return q; } return list[0]; };

// ---------- game loop ----------
async function round(G, io) {
  const P = G.players, n = P.length;
  const T = G.mo = { pos: P.map(() => 0), cash: P.map(() => START), own: Array(40).fill(-1), hs: Array(40).fill(0), mort: Array(40).fill(0), jail: P.map(() => 0), out: P.map(() => false),
    turn: (G.round - 1) % n, phase: 'roll', dice: [0, 0], rollN: 0, mv: { k: 0, i: -1, tp: false, back: false }, note: '', card: null, owe: 0, buy: -1, over: false, winner: -1, turns: 0, rd: 1 };
  const alive = () => P.map((_, i) => i).filter(i => !T.out[i]);
  const say = (i, a, b) => io.ev(P[i], a, b || a);
  const move = (i, to, o) => { o = o || {}; const from = T.pos[i]; T.pos[i] = to; T.mv = { k: T.mv.k + 1, i, tp: !!o.tp, back: !!o.back }; return from; };
  const passGo = i => { T.cash[i] += GO_PAY; say(i, `collects ${GO_PAY} for passing GO`, `collect ${GO_PAY} for passing GO`); };
  io.render(); await io.sleep(600);

  async function raise(i, to) {            // player owes money (cash < 0): sell/mortgage or go bankrupt
    while (T.cash[i] < 0 && !T.out[i]) {
      T.phase = 'debt'; T.owe = -T.cash[i]; io.render();
      const a = await io.turn(P[i], {}, { auto: debtBot(i), validate: v => vAct(i, 'debt', v), bot: () => debtBot(i), think: 500 + Math.random() * 400, timeout: 60000 });
      if (a.t === 'bankrupt') { bankrupt(i, to); break; }
      manage(i, a);
    }
    T.owe = 0;
  }
  function bankrupt(i, to) {
    say(i, 'is bankrupt!', 'go bankrupt');
    if (to >= 0 && T.cash[i] < 0) T.cash[to] += T.cash[i];
    for (let q = 0; q < 40; q++) if (T.own[q] === i) {
      if (to >= 0) { T.own[q] = to; T.hs[q] = 0; } else { T.own[q] = -1; T.hs[q] = 0; T.mort[q] = 0; }
    }
    T.cash[i] = 0; T.out[i] = true; T.note = `${P[i].name} is bankrupt.`;
    if (to >= 0) T.cash[to] += 0;
  }
  async function charge(i, amt, to, why) {
    T.cash[i] -= amt; if (to >= 0) T.cash[to] += amt;
    if (why) T.note = why;
    io.render(); await io.sleep(650);
    if (T.cash[i] < 0) await raise(i, to);
  }
  function manage(i, a) {
    const q = a.q;
    if (a.t === 'build' && canBuild(T, i, q)) { T.hs[q]++; T.cash[i] -= SQ[q].cost; T.note = `${P[i].name} builds on ${SQ[q].name}.`; say(i, `builds ${T.hs[q] === 5 ? 'a hotel' : 'a house'} on ${SQ[q].name}`, `build on ${SQ[q].name}`); }
    else if (a.t === 'sell' && canSell(T, i, q)) { T.hs[q]--; T.cash[i] += SQ[q].cost / 2; T.note = `${P[i].name} sells a house on ${SQ[q].name}.`; }
    else if (a.t === 'mort' && canMort(T, i, q)) { T.mort[q] = 1; T.cash[i] += SQ[q].price / 2; T.note = `${P[i].name} mortgages ${SQ[q].name}.`; }
    else if (a.t === 'unmort' && canUnmort(T, i, q)) { T.mort[q] = 0; T.cash[i] -= unCost(q); T.note = `${P[i].name} pays off the mortgage on ${SQ[q].name}.`; }
  }
  const mine = i => SQ.filter(c => T.own[c.i] === i).map(c => c.i);
  function debtBot(i) {
    const ms = mine(i), h = ms.filter(q => canSell(T, i, q)).sort((a, b) => SQ[b].cost - SQ[a].cost)[0];
    if (h != null) return { t: 'sell', q: h };
    const m = ms.filter(q => canMort(T, i, q)).sort((a, b) => SQ[a].price - SQ[b].price)[0];
    return m != null ? { t: 'mort', q: m } : { t: 'bankrupt' };
  }
  function vAct(i, phase, x) {
    if (!x || typeof x.t !== 'string') return null;
    const q = x.q;
    if (['build', 'sell', 'mort', 'unmort'].includes(x.t)) {
      if (phase === 'buy' || !Number.isInteger(q) || q < 0 || q > 39) return null;
      if (phase === 'debt' && (x.t === 'build' || x.t === 'unmort')) return null;
      return { t: x.t, q };
    }
    if (phase === 'roll') return x.t === 'roll' || (x.t === 'pay' && T.jail[i] > 0 && T.cash[i] >= JAIL_FEE) ? { t: x.t } : null;
    if (phase === 'buy') return x.t === 'buy' || x.t === 'pass' ? { t: x.t } : null;
    if (phase === 'after') return x.t === 'end' ? { t: 'end' } : null;
    if (phase === 'debt') return x.t === 'bankrupt' ? { t: 'bankrupt' } : null;
    return null;
  }
  function botAct(i, phase) {
    const c = SQ[T.buy];
    if (phase === 'buy') return T.cash[i] - c.price >= 120 || (T.cash[i] - c.price >= 20 && c.k !== 'util') ? { t: 'buy' } : { t: 'pass' };
    if (phase === 'roll' && T.jail[i] > 0 && T.cash[i] > 450 && T.turns < n * 14) return { t: 'pay' };
    const reserve = 220;
    const b = mine(i).filter(q => canBuild(T, i, q) && T.cash[i] - SQ[q].cost >= reserve).sort((a, z) => SQ[a].cost - SQ[z].cost || T.hs[a] - T.hs[z])[0];
    if (b != null) return { t: 'build', q: b };
    const u = mine(i).filter(q => canUnmort(T, i, q) && T.cash[i] - unCost(q) >= reserve + 200)[0];
    if (u != null) return { t: 'unmort', q: u };
    return { t: phase === 'roll' ? 'roll' : 'end' };
  }
  async function menu(i, phase) {
    for (;;) {
      T.phase = phase; io.render();
      const auto = phase === 'roll' ? { t: 'roll' } : phase === 'buy' ? { t: 'pass' } : { t: 'end' };
      const a = await io.turn(P[i], {}, { auto, validate: v => vAct(i, phase, v), bot: () => botAct(i, phase), think: 650 + Math.random() * 500, timeout: 60000 });
      if (a.t === 'pay') { T.cash[i] -= JAIL_FEE; T.jail[i] = 0; T.note = `${P[i].name} pays ${JAIL_FEE} to leave Jail.`; say(i, 'pays to leave Jail', 'pay to leave Jail'); continue; }
      if (a.t === 'roll' || a.t === 'end' || a.t === 'buy' || a.t === 'pass') return a;
      manage(i, a);
      if (T.cash[i] < 0) await raise(i, -1);
    }
  }
  async function walk(i, steps) {
    for (let k = 0; k < steps; k++) { const nx = (T.pos[i] + 1) % 40; move(i, nx); if (nx === 0) { passGo(i); } io.render(); await io.sleep(230); }
  }
  async function land(i, depth) {
    const q = T.pos[i], c = SQ[q]; T.buy = -1;
    if (ownable(c)) {
      const o = T.own[q];
      if (o < 0) { if (T.cash[i] >= c.price) T.buy = q; else T.note = `${P[i].name} cannot afford ${c.name}.`; }
      else if (o !== i && !T.mort[q]) { const r = rentOf(T, q, T.dice[0] + T.dice[1]); say(i, `pays ${r} rent to ${P[o].name}`, `pay ${r} rent to ${P[o].name}`); await charge(i, r, o, `${P[i].name} pays ${r} rent to ${P[o].name} for ${c.name}.`); }
    } else if (c.k === 'tax') { say(i, `pays ${c.amt} ${c.name.toLowerCase()}`, `pay ${c.amt} ${c.name.toLowerCase()}`); await charge(i, c.amt, -1, `${P[i].name} pays ${c.amt} ${c.name.toLowerCase()}.`); }
    else if (c.k === 'gojail') { await sendJail(i); }
    else if (c.k === 'chance' || c.k === 'luck') await draw(i, c.k, depth);
    else if (c.k === 'go') { T.cash[i] += 0; }
  }
  async function sendJail(i) { move(i, 10, { tp: true }); T.jail[i] = 1; T.doubles = 0; T.note = `${P[i].name} goes to Jail.`; say(i, 'goes to Jail', 'go to Jail'); io.render(); await io.sleep(1100); }
  async function draw(i, kind, depth) {
    const deck = kind === 'chance' ? CHANCE : LUCK, cd = deck[rnd(deck.length)];
    T.card = { k: (T.card ? T.card.k : 0) + 1, kind: kind === 'chance' ? 'Chance' : 'Luck', text: cd[0] }; T.note = '';
    say(i, `draws a ${T.card.kind} card`, `draw a ${T.card.kind} card`); io.render(); await io.sleep(1700);
    const t = cd[1];
    if (t === 'cash') { if (cd[2] >= 0) { T.cash[i] += cd[2]; io.render(); await io.sleep(500); } else await charge(i, -cd[2], -1, ''); }
    else if (t === 'each') {
      for (const j of alive()) if (j !== i) { if (cd[2] > 0) { T.cash[j] -= cd[2]; T.cash[i] += cd[2]; } else { T.cash[j] += -cd[2]; T.cash[i] -= -cd[2]; } }
      io.render(); await io.sleep(600);
      for (const j of alive()) if (T.cash[j] < 0) await raise(j, i);
      if (T.cash[i] < 0 && !T.out[i]) await raise(i, -1);
    }
    else if (t === 'repair') { let h = 0, ho = 0; for (let q = 0; q < 40; q++) if (T.own[q] === i) { if (T.hs[q] === 5) ho++; else h += T.hs[q]; } const amt = h * cd[2] + ho * cd[3]; if (amt) await charge(i, amt, -1, `${P[i].name} pays ${amt} for repairs.`); }
    else if (t === 'jail') await sendJail(i);
    else if (t === 'back') { for (let k = 0; k < cd[2]; k++) { move(i, (T.pos[i] + 39) % 40, { back: true }); io.render(); await io.sleep(230); } if (depth < 2) await land(i, depth + 1); }
    else if (t === 'goto') { const from = T.pos[i], to = cd[2]; if (to < from || to === 0) passGo(i); move(i, to, { tp: true }); io.render(); await io.sleep(1000); if (depth < 2) await land(i, depth + 1); }
    else if (t === 'rail') { const to = nearest(T.pos[i], RAILS); if (to < T.pos[i]) passGo(i); move(i, to, { tp: true }); io.render(); await io.sleep(1000);
      const o = T.own[to]; if (o >= 0 && o !== i && !T.mort[to]) { const r = rentOf(T, to, 0) * 2; await charge(i, r, o, `${P[i].name} pays double rent: ${r}.`); } else if (o < 0 && T.cash[i] >= SQ[to].price) T.buy = to; }
  }

  while (!T.over) {
    const i = T.turn;
    if (T.out[i]) { T.turn = (i + 1) % n; continue; }
    T.doubles = 0; T.card = null; T.note = ''; T.dice = [0, 0]; T.buy = -1;
    for (;;) {                                                   // one roll (doubles give another)
      await menu(i, 'roll'); if (T.out[i]) break;
      const a = 1 + rnd(6), b = 1 + rnd(6), dbl = a === b; T.dice = [a, b]; T.rollN++; T.card = null; T.note = '';
      say(i, `rolls ${a + b}${dbl ? ' (doubles)' : ''}`, `roll ${a + b}${dbl ? ' (doubles)' : ''}`);
      io.render(); await io.sleep(1000);
      if (T.jail[i] > 0) {
        if (dbl) { T.jail[i] = 0; T.note = `${P[i].name} rolls doubles and leaves Jail.`; await walk(i, a + b); await land(i, 0); }
        else if (T.jail[i] >= 3) { T.jail[i] = 0; T.cash[i] -= JAIL_FEE; T.note = `${P[i].name} pays ${JAIL_FEE} and leaves Jail.`; io.render(); await io.sleep(600); await walk(i, a + b); await land(i, 0); }
        else { T.jail[i]++; T.note = `${P[i].name} stays in Jail.`; }
        if (T.cash[i] < 0 && !T.out[i]) await raise(i, -1);
        if (!T.out[i] && T.buy >= 0) { const r = await menu(i, 'buy'); if (r.t === 'buy') { buyIt(i); } T.buy = -1; }
        break;
      }
      if (dbl) T.doubles++;
      if (T.doubles >= 3) { T.note = `${P[i].name} rolled doubles three times.`; await sendJail(i); break; }
      await walk(i, a + b);
      await land(i, 0);
      if (T.out[i]) break;
      if (T.buy >= 0) { io.render(); const r = await menu(i, 'buy'); if (r.t === 'buy' && T.buy >= 0) buyIt(i); T.buy = -1; if (T.out[i]) break; }
      if (T.jail[i] > 0) break;
      if (T.cash[i] < 0) await raise(i, -1);
      if (T.out[i]) break;
      if (!(dbl && T.doubles < 3)) break;
      T.note = `${P[i].name} rolled doubles and goes again.`;
    }
    if (!T.out[i]) { await menu(i, 'after'); }
    const al = alive();
    T.turns++; T.rd = Math.min(ROUNDS, Math.floor(T.turns / Math.max(1, n)) + 1);
    if (al.length <= 1) { T.over = true; T.winner = al[0]; }
    else if (T.turns >= ROUNDS * n) {
      T.over = true; let best = -1, bw = -1; for (const j of al) { const w = worth(T, j); if (w > bw) { bw = w; best = j; } } T.winner = best;
    }
    if (!T.over) { let nx = (i + 1) % n; while (T.out[nx]) nx = (nx + 1) % n; T.turn = nx; }
    io.render();
  }
  function buyIt(i) { const q = T.buy, c = SQ[q]; if (q < 0 || T.cash[i] < c.price || T.own[q] >= 0) return; T.cash[i] -= c.price; T.own[q] = i; T.note = `${P[i].name} buys ${c.name} for ${c.price}.`; say(i, `buys ${c.name} for ${c.price}`, `buy ${c.name} for ${c.price}`); }
  T.phase = 'over';
  settlePot(G, ANTE, T.winner >= 0 ? [T.winner] : []); potSummary(G);
  io.line(T.turns >= ROUNDS * n ? `Time is up after ${ROUNDS} rounds: the richest player wins.` : 'Everyone else went bankrupt.', true);
  io.render();
}
function view(G) {
  const T = G.mo, n = G.players.length;
  if (!T || T.pos.length !== n) return { pos: G.players.map(() => 0), cash: G.players.map(() => START), own: Array(40).fill(-1), hs: Array(40).fill(0), mort: Array(40).fill(0), jail: G.players.map(() => 0), out: G.players.map(() => false), turn: -1, phase: 'roll', dice: [0, 0], rollN: 0, mv: { k: 0, i: -1 }, note: '', card: null, owe: 0, buy: -1, over: false, winner: -1, rd: 1, delta: [] };
  return { pos: T.pos, cash: T.cash, own: T.own, hs: T.hs, mort: T.mort, jail: T.jail, out: T.out, turn: T.over ? -1 : T.turn, phase: T.phase, dice: T.dice, rollN: T.rollN, mv: T.mv, note: T.note, card: T.card, owe: T.owe, buy: T.buy, over: T.over, winner: T.winner, rd: T.rd, delta: G.players.map(p => (T.over ? p.delta || 0 : 0)) };
}

// ---------- board UI ----------
const TOKC = ['#f2b441', '#f7f0e1', '#5cc8b0', '#e8708a'], PIECE = ['🚗', '🎩', '🐕', '🚢'];
const ICON = { go: '➜', luck: '🎁', chance: '❓', tax: '💰', jail: '🚔', free: '🅿️', gojail: '👮', rail: '🚂', util: '💡' };
const FR = [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5], FSUM = 12;
const rc = i => (i <= 10 ? [10, 10 - i] : i <= 20 ? [20 - i, 0] : i <= 30 ? [0, i - 20] : [i - 30, 10]);
const centre = c => { let s = 0; for (let k = 0; k < c; k++) s += FR[k]; return (s + FR[c] / 2) / FSUM * 100; };
const spot = (q, i) => { const [r, c] = rc(q), ox = ((i % 2) - 0.5) * 2.6, oy = ((i >> 1) - 0.5) * 2.6; return [centre(c) + ox, centre(r) + oy]; };
const side = i => (i > 0 && i < 10 ? 'b' : i > 10 && i < 20 ? 'l' : i > 20 && i < 30 ? 't' : i > 30 ? 'r' : 'c');
const PIPS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
const dieHTML = (v, roll) => `<span class="dieface${roll ? ' roll' : ''}">${Array.from({ length: 9 }, (_, k) => `<i${PIPS[v].includes(k) ? ' class="on"' : ''}></i>`).join('')}</span>`;
const money = v => '$' + Math.round(v).toLocaleString('en-US');
let S0 = null, TK = [], rollKey = -1, sel = -1, mng = false, lastCash = null, lastMv = 0, cardK = 0;
const tween = ms => new Promise(r => setTimeout(r, ms));
function setTok(t, x, y, ms) { t.el.style.transitionDuration = ms + 'ms'; t.el.style.left = x + '%'; t.el.style.top = y + '%'; }
async function hop(i, from, to, mv) {
  const t = TK[i]; if (!t || !t.el.isConnected) return;
  const fwd = (to - from + 40) % 40, back = (from - to + 40) % 40;
  if (!mv.tp && !mv.back && fwd > 0 && fwd <= 12) {
    for (let k = 1; k <= fwd; k++) { const q = (from + k) % 40, [x, y] = spot(q, i); t.el.classList.add('hop'); setTok(t, x, y, 200); Snd.p('pop'); await tween(230); t.el.classList.remove('hop'); }
  } else if (mv.back && back > 0 && back <= 6) {
    for (let k = 1; k <= back; k++) { const q = (from - k + 40) % 40, [x, y] = spot(q, i); setTok(t, x, y, 200); Snd.p('pop'); await tween(230); }
  } else { const [x, y] = spot(to, i); t.el.classList.add('fly'); setTok(t, x, y, 700); Snd.p(to === 10 ? 'bad' : 'good'); await tween(760); t.el.classList.remove('fly'); }
}
function floatTxt(i, text, good) {
  const t = TK[i], b = $('moTk'); if (!t || !b) return;
  const e = document.createElement('span'); e.className = 'mofx ' + (good ? 'up' : 'dn'); e.textContent = text; e.style.left = t.el.style.left; e.style.top = t.el.style.top; b.appendChild(e); setTimeout(() => e.remove(), 1500);
}
function sqHTML(q, g) {
  const c = SQ[q.i], o = g ? g.own[q.i] : -1, sd = side(q.i), hs = g ? g.hs[q.i] : 0;
  const bar = c.k === 'p' ? `<i class="mo-bar" style="background:${GRP[c.g]}"></i>` : '';
  const houses = hs ? `<span class="mo-hs">${hs === 5 ? '🏨' : '🏠'.repeat(hs)}</span>` : '';
  const pr = c.price ? money(c.price) : c.amt ? money(c.amt) : '';
  return `${bar}<span class="mo-ic">${ICON[c.k] && c.k !== 'p' ? ICON[c.k] : ''}</span><span class="mo-nm">${esc(c.name)}</span><span class="mo-pr">${pr}</span>${houses}${o >= 0 ? `<i class="mo-own" style="background:${TOKC[o % 4]}"></i>` : ''}${g && g.mort[q.i] ? '<i class="mo-mort">M</i>' : ''}`;
}
function deedHTML(q, g) {
  const c = SQ[q]; let body = '';
  if (c.k === 'p') body = `<div class="dd-bar" style="background:${GRP[c.g]}">${esc(c.name)}</div><div class="dd-rows"><span>Rent</span><b>${money(c.rents[0])}</b><span>With 1 house</span><b>${money(c.rents[1])}</b><span>2 houses</span><b>${money(c.rents[2])}</b><span>3 houses</span><b>${money(c.rents[3])}</b><span>4 houses</span><b>${money(c.rents[4])}</b><span>Hotel</span><b>${money(c.rents[5])}</b><span>House cost</span><b>${money(c.cost)}</b></div>`;
  else if (c.k === 'rail') body = `<div class="dd-bar rail">🚂 ${esc(c.name)}</div><div class="dd-rows"><span>1 railway</span><b>$25</b><span>2 railways</span><b>$50</b><span>3 railways</span><b>$100</b><span>4 railways</span><b>$200</b></div>`;
  else if (c.k === 'util') body = `<div class="dd-bar rail">💡 ${esc(c.name)}</div><div class="dd-rows"><span>One utility</span><b>4× dice</b><span>Both utilities</span><b>10× dice</b></div>`;
  else return `<div class="dd-bar rail">${ICON[c.k] || ''} ${esc(c.name)}</div><p class="dd-p">${c.k === 'tax' ? 'Pay ' + money(c.amt) + ' to the bank.' : c.k === 'go' ? 'Collect $200 every time you pass.' : c.k === 'jail' ? 'Just visiting, unless you were sent here.' : c.k === 'gojail' ? 'Go directly to Jail.' : c.k === 'free' ? 'A free rest. Nothing happens.' : 'Draw a card and follow it.'}</p>`;
  const o = g.own[q];
  return body + `<p class="dd-p">${c.price ? 'Price ' + money(c.price) + ' · ' : ''}${o >= 0 ? 'Owner: ' + esc(S0.nameOf(o)) + (g.mort[q] ? ' (mortgaged)' : '') : 'Unowned'}</p>`;
}
function mountBoard() {
  const cells = SQ.map(q => { const [r, c] = rc(q.i); return `<div class="msq k-${q.k} s-${side(q.i)}" data-q="${q.i}" style="grid-row:${r + 1};grid-column:${c + 1}" role="button" tabindex="0" aria-label="${esc(q.name)}"></div>`; }).join('');
  const tpl = `grid-template-columns:${FR.map(f => f + 'fr').join(' ')};grid-template-rows:${FR.map(f => f + 'fr').join(' ')}`;
  return `<div class="mob"><div class="mobd" style="${tpl}">${cells}<div class="mo-c" id="moC"><div class="mo-title">PROPERTY<br>TYCOON</div><div class="mo-dice" id="moDice"></div><div class="mo-card" id="moCard"></div><div class="mo-note" id="moNote" aria-live="polite"></div></div><div class="mo-tk" id="moTk"></div></div></div>`;
}
function manageHTML(g, me) {
  const s = { own: g.own, hs: g.hs, mort: g.mort, cash: g.cash };
  const my = SQ.filter(c => g.own[c.i] === me).sort((a, b) => (a.g || 'z').localeCompare(b.g || 'z') || a.i - b.i);
  if (!my.length) return '<p class="mo-empty">You do not own any property yet. Land on a street and press Buy.</p>';
  return my.map(c => {
    const b = c.k === 'p' && canBuild(s, me, c.i), sl = canSell(s, me, c.i), m = canMort(s, me, c.i), u = canUnmort(s, me, c.i);
    const bt = (t, ok, txt) => `<button type="button" class="mo-b" data-a="${t}" data-q="${c.i}" ${ok ? '' : 'disabled'}>${txt}</button>`;
    return `<div class="mo-row"><i class="mo-sw" style="background:${c.k === 'p' ? GRP[c.g] : '#777'}"></i><span class="mo-rn">${esc(c.name)}${g.mort[c.i] ? ' <em>(mortgaged)</em>' : ''}${g.hs[c.i] ? ' ' + (g.hs[c.i] === 5 ? '🏨' : '🏠'.repeat(g.hs[c.i])) : ''}</span>${c.k === 'p' ? bt('build', b, 'Build ' + money(c.cost)) + bt('sell', sl, 'Sell +' + money(c.cost / 2)) : ''}${g.mort[c.i] ? bt('unmort', u, 'Pay off ' + money(unCost(c.i))) : bt('mort', m, 'Mortgage +' + money(c.price / 2))}</div>`;
  }).join('');
}
const ui = {
  mount(stage, ctl, S) {
    TK = []; rollKey = -1; sel = -1; mng = false; lastCash = null; lastMv = 0; cardK = 0;
    stage.innerHTML = `<section class="table mowrap"><div class="bt-opps" id="moSeats"></div>${mountBoard()}<div class="banner" id="moBanner" aria-live="polite"></div><div class="mo-mng" id="moMng" hidden></div></section>`;
    ctl.innerHTML = `<div class="act" id="moAct" hidden></div>`;
    stage.querySelector('.mobd').addEventListener('click', e => { const q = e.target.closest('[data-q]'); if (q && !e.target.closest('.mo-mng')) { sel = sel === +q.dataset.q ? -1 : +q.dataset.q; paintCenter(); } });
    $('moMng').onclick = e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled) S0.send({ t: b.dataset.a, q: +b.dataset.q }); if (e.target.id === 'moClose') { mng = false; $('moMng').hidden = true; } };
    $('moAct').onclick = e => {
      const b = e.target.closest('[data-do]'); if (!b) return;
      if (b.dataset.do === 'manage') { mng = !mng; paintMng(); } else { S0.send({ t: b.dataset.do }); mng = false; paintMng(); }
    };
    const tks = S.V.seats.map((_, i) => `<div class="mo-t" id="mt${i}" style="--tc:${TOKC[i % 4]}"><span>${PIECE[i % 4]}</span></div>`).join('');
    $('moTk').innerHTML = tks;
    const sy = S.V.seats.length;
    for (let k = 0; k < sy; k++) { const el = $('mt' + k); TK[k] = { el, want: 0, chain: Promise.resolve() }; const [x, y] = spot(0, k); setTok(TK[k], x, y, 0); }
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    $('moSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: g.phase === 'debt' ? 'Raising cash…' : g.phase === 'buy' ? 'Deciding…' : 'Playing…', extra: i => g.out[i] ? 'Bankrupt' : money(g.cash[i]) + (g.jail[i] ? ' · Jail' : '') });
    SQ.forEach(q => {
      const el = document.querySelector(`.mobd [data-q="${q.i}"]`); if (!el) return;
      el.innerHTML = sqHTML(q, g); const o = g.own[q.i];
      el.style.boxShadow = o >= 0 ? `inset 0 0 0 3px ${TOKC[o % 4]}` : ''; el.classList.toggle('mort', !!(g.mort[q.i])); el.classList.toggle('sel', sel === q.i);
    });
    // tokens
    g.pos.forEach((p, i) => {
      const t = TK[i]; if (!t) return; t.el.classList.toggle('out', !!g.out[i]);
      if (t.want !== p) { const prev = t.want; t.want = p; const mv = g.mv && g.mv.i === i ? g.mv : {}; t.chain = t.chain.then(() => hop(i, prev, p, mv)); }
    });
    if (lastCash) g.cash.forEach((c, i) => { const d = c - (lastCash[i] || 0); if (d && !g.out[i] && Math.abs(d) >= 5) { floatTxt(i, (d > 0 ? '+' : '−') + money(Math.abs(d)), d > 0); if (S.me === i || d > 0) Snd.p(d > 0 ? 'coin' : 'chip'); } });
    lastCash = g.cash.slice();
    if (g.rollN !== rollKey) { const first = rollKey === -1; rollKey = g.rollN; if (!first && g.rollN) Snd.p('dice'); $('moDice').innerHTML = g.rollN ? dieHTML(g.dice[0], !first) + dieHTML(g.dice[1], !first) : ''; }
    if (g.card && g.card.k !== cardK) { cardK = g.card.k; Snd.p('card'); sel = -1; }
    paintCenter(); paintMng();
    const act = $('moAct'), me = S.me, canAct = S.turn;
    act.hidden = !canAct;
    if (canAct) {
      const B = (d, txt, cls) => `<button type="button" class="b ${cls || ''}" data-do="${d}">${txt}</button>`;
      let h = '';
      if (g.phase === 'roll') h = B('roll', 'Roll the dice', 'gold') + (g.jail[me] && g.cash[me] >= JAIL_FEE ? B('pay', 'Pay $50 to leave Jail') : '') + B('manage', mng ? 'Close' : 'Manage');
      else if (g.phase === 'buy') h = B('buy', `Buy ${esc(SQ[g.buy] ? SQ[g.buy].name : '')} for ${money(SQ[g.buy] ? SQ[g.buy].price : 0)}`, 'gold') + B('pass', 'Pass');
      else if (g.phase === 'after') h = B('end', 'End turn', 'gold') + B('manage', mng ? 'Close' : 'Manage');
      else if (g.phase === 'debt') h = `<span class="mo-owe">You owe ${money(g.owe)}. Sell or mortgage to pay.</span>` + B('manage', mng ? 'Close' : 'Manage', 'gold') + B('bankrupt', 'Give up');
      act.innerHTML = h + `<p class="hint bt-hint">${g.phase === 'roll' ? (g.jail[me] ? 'You are in Jail: roll for doubles or pay $50.' : 'Roll to move. Build on a full colour set to raise the rent.') : g.phase === 'buy' ? 'Nobody owns this yet.' : g.phase === 'after' ? 'Build, sell or mortgage if you wish, then end your turn.' : ''}</p>`;
      if (g.phase === 'debt') mng = true;
    } else mng = false;
    $('moBanner').innerHTML = g.over && V.summary.length ? `<span>${g.winner >= 0 ? S.text(V.summary.find(e => e.p === g.winner) || V.summary[0]) : 'No winner.'}</span>` : `<span class="mo-rd">Round ${g.rd} of ${ROUNDS}</span>`;
    return '';
  },
};
function paintCenter() {
  const S = S0; if (!S) return; const g = S.V.g, c = $('moCard'); if (!c) return;
  if (sel >= 0) c.innerHTML = `<div class="deed">${deedHTML(sel, g)}</div>`;
  else if (g.card) c.innerHTML = `<div class="cardx ${g.card.kind === 'Chance' ? 'ch' : 'lk'}"><b>${g.card.kind === 'Chance' ? '❓ Chance' : '🎁 Luck'}</b><span>${esc(g.card.text)}</span></div>`;
  else c.innerHTML = '';
  $('moNote').textContent = sel >= 0 ? '' : g.note || '';
}
function paintMng() {
  const S = S0, el = $('moMng'); if (!S || !el) return; const g = S.V.g;
  const show = mng && S.turn;
  el.hidden = !show; if (!show) return;
  el.innerHTML = `<div class="mo-sheet"><div class="mo-sh-h"><b>Your properties</b><span>${money(g.cash[S.me])}</span><button type="button" id="moClose" class="b">Close</button></div><div class="mo-list">${manageHTML(g, S.me)}</div></div>`;
}

Club.register({
  id: 'monopoly', cat: 'board', name: 'Property Tycoon', tag: 'A Monopoly-style game: roll, buy streets, build, collect rent.', min: 2, max: 4, soloBots: 2, roundWord: 'Game',
  art: () => ['🎲', '🏠', '🚗'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> be the richest player after ${ROUNDS} rounds, or the last one who has not gone bankrupt.</p>
    <ol><li>Everyone starts with $${START} of game cash and a token at <b>GO</b>. Whenever you pass or land on GO, collect $${GO_PAY}.</li>
    <li>On your turn, press <b>Roll the dice</b>. Your token hops that many squares round the board. Roll doubles and you roll again, but three doubles in a row sends you to Jail.</li>
    <li>Land on an <b>unowned street, railway or utility</b> and you may <b>Buy</b> it. Land on one that another player owns and you pay them <b>rent</b>.</li>
    <li>Own every street of one colour and the rent doubles. Press <b>Manage</b> to <b>build houses</b> (up to four, then a hotel) to raise the rent a lot. Build evenly across the set.</li>
    <li>Short of cash? In <b>Manage</b> you can sell houses or <b>mortgage</b> a street to the bank for half its price. Pay the mortgage off, plus a little interest, to get it back.</li>
    <li><b>Chance</b> and <b>Luck</b> squares draw a card that can pay you, fine you, move you, or send you to Jail. <b>Tax</b> squares cost money.</li>
    <li><b>Jail:</b> pay $${JAIL_FEE}, or roll doubles to get out. After three failed tries you pay $${JAIL_FEE} and move. While in Jail you still collect rent.</li>
    <li>If you cannot pay what you owe, you go bankrupt and your streets go to the player you owed.</li>
    <li>Tap any square to read its price and rent. Each player puts in ${ANTE} chips and the winner takes the pot.</li></ol>`,
  round, view, ui, _test: { SQ, canBuild, rentOf, worth },
});
})();
