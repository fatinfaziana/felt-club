/* ---------- shared helpers ---------- */
const START = 1000;
const fmt = n => Math.round(n).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const delay = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const BOTS = [['Mira', 'Careful', 0.35, 0.05], ['Dax', 'Wild', 0.85, -0.05], ['Juno', 'Steady', 0.55, 0.01],
              ['Otis', 'Tricky', 0.7, 0.03], ['Rue', 'Patient', 0.4, 0.04]];

const Club = {
  games: {}, order: [],
  register(g) { this.games[g.id] = g; this.order.push(g.id); },
};

const faceHTML = (label, suit, red, cls) =>
  `<div class="card${red ? ' red' : ''}${cls ? ' ' + cls : ''}"><span>${label}</span><i>${suit}</i></div>`;
const backHTML = cls => `<div class="card back${cls ? ' ' + cls : ''}"></div>`;

function mkPlayer(o) {
  return Object.assign({ uid: null, human: false, name: '', style: '', agg: 0.5, tight: 0, stack: START,
    startStack: START, left: false, misses: 0, wins: 0 }, o);
}
function mkBot(G, name) {
  const used = new Set(G.players.filter(p => !p.human).map(p => p.name));
  const b = name ? BOTS.find(x => x[0] === name) : BOTS.find(x => !used.has(x[0]));
  return b ? mkPlayer({ name: b[0], style: b[1], agg: b[2], tight: b[3] }) : null;
}
// Bring the seats in line with who has asked to play. Only call between rounds. Returns ids removed for inactivity.
function syncSeats(G) {
  const kicked = [], dealerP = G.dealer === undefined ? null : G.players[G.dealer];
  G.players = G.players.filter(p => {
    if (!p.human || p.uid === G.hostId) return true;
    if (!G.joinSet.has(p.uid)) return false;
    if (p.misses >= 2) { kicked.push(p.uid); return false; }
    return true;
  });
  const seated = new Set(G.players.map(p => p.uid));
  for (const uid of G.joinSet) {
    if (seated.has(uid) || kicked.includes(uid)) continue;
    if (G.players.length >= G.max) {
      let bi = -1;
      for (let i = G.players.length - 1; i >= 0; i--) if (!G.players[i].human) { bi = i; break; }
      if (bi < 0) continue;
      G.players.splice(bi, 1);
    }
    G.players.push(mkPlayer({ uid, human: true }));
    seated.add(uid);
  }
  if (dealerP) {
    const di = G.players.indexOf(dealerP);
    G.dealer = di >= 0 ? di : Math.min(G.dealer, Math.max(0, G.players.length - 1));
  }
  return kicked;
}

/* ---------- word list and pot settling for the board, word and maths games ---------- */
const WORDS = ('garden planet window pencil rabbit bridge castle dragon forest guitar island jungle kitten ladder magnet orange pirate rocket school tunnel violin wizard yellow zebra anchor basket candle desert engine flower hammer jacket kettle lemon mirror needle ocean pepper quilt river saddle table umbrella valley whistle button cotton dinner family garlic honey insect jelly kernel lizard muffin napkin office parcel puzzle ribbon candy shadow spider summer sunset thunder turtle winter wonder animal banana butter camera carpet circle cookie doctor dolphin eagle farmer finger glasses harbor helmet iceberg jigsaw kitchen lantern marble monkey mountain nature orchid palace penguin pillow pocket pumpkin rainbow sailor season silver sponge stream sweater theater ticket tomato travel trophy unicorn volcano walnut weather yogurt zipper blanket compass diamond feather giraffe hamster lemonade orchard pancake rainbow squirrel teapot').split(' ');

// Everyone puts in the same stake; the winners split the pot. No winners: everyone gets their stake back.
function settlePot(G, ante, winners) {
  const P = G.players, paid = P.map(p => { const a = Math.min(ante, p.stack); p.stack -= a; return a; });
  const pot = paid.reduce((s, a) => s + a, 0), gain = P.map(() => 0);
  if (!winners.length) P.forEach((p, i) => { p.stack += paid[i]; });
  else {
    const share = Math.floor(pot / winners.length); let rem = pot - share * winners.length;
    winners.forEach(i => { gain[i] = share + (rem-- > 0 ? 1 : 0); P[i].stack += gain[i]; });
  }
  P.forEach((p, i) => { p.delta = winners.length ? gain[i] - paid[i] : 0; });
  return pot;
}
function potSummary(G) {
  G.summary = [];
  G.players.forEach((p, i) => {
    if (p.delta > 0) G.summary.push({ p: i, t: `wins ${fmt(p.delta)}.`, y: `win ${fmt(p.delta)}.` });
    else if (p.delta < 0) G.summary.push({ p: i, t: `loses ${fmt(-p.delta)}.`, y: `lose ${fmt(-p.delta)}.` });
  });
  if (!G.summary.length) G.summary = [{ p: -1, s: 'Nobody wins this round. Everyone keeps their chips.' }];
  for (const s of G.summary) G.log.push(Object.assign({ st: true }, s));
}

// Games without chips: the winners of a round get a win on their tally.
function winRound(G, winners) {
  G.players.forEach((p, i) => { p.delta = 0; if (winners.includes(i)) p.wins = (p.wins || 0) + 1; });
  G.summary = winners.length ? winners.map(i => ({ p: i, t: winners.length > 1 ? 'shares the win.' : 'wins this round!', y: winners.length > 1 ? 'share the win.' : 'win this round!' })) : [{ p: -1, s: 'A draw. Nobody wins this round.' }];
  for (const e of G.summary) G.log.push(Object.assign({ st: true }, e));
}

// Seat plates for the board, word and maths screens. Chips games show chips and the round result;
// games without chips show a tally of wins. o.won lists the winning seats when the round is over.
function plates(S, o) {
  const V = S.V;
  return V.seats.map((s, i) => {
    const d = (o.delta || [])[i] || 0, nc = V.nc, won = (o.won || []).includes(i);
    const tag = V.done ? (nc ? (won ? '<div class="tag win">Winner</div>' : '<div class="tag dim">&nbsp;</div>')
        : d > 0 ? `<div class="tag win">+${fmt(d)}</div>` : d < 0 ? `<div class="tag lose">${fmt(d)}</div>` : '<div class="tag dim">Even</div>')
      : o.turn === i ? `<div class="tag hot">${o.doing || 'Thinking…'}</div>` : `<div class="tag dim">${o.extra ? o.extra(i) : ''}</div>`;
    return `<div class="seat${o.turn === i ? ' active' : ''}"><div class="plate"><span class="name">${o.dot ? `<i class="dot p${i}"></i>` : ''}<span>${esc(S.nameOf(i))}</span></span>
      <span class="style">${esc(S.tag(i))}</span><span class="stack">${nc ? (s.w || 0) + ' win' + ((s.w || 0) === 1 ? '' : 's') : fmt(s.stack)}</span></div>${tag}</div>`;
  }).join('');
}
