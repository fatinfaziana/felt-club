/* ---------- core: tables, hosting, lobby ---------- */
const $ = id => document.getElementById(id);
const use = n => (window.claude && window.claude.use ? window.claude.use(n).catch(() => null) : Promise.resolve(null));
const store = {
  load() { try { return JSON.parse(localStorage.getItem('feltclub.v2')) || {}; } catch { return {}; } },
  save(d) { try { localStorage.setItem('feltclub.v2', JSON.stringify(d)); } catch {} },
};

let DB = null, USER = null, myUid = 'local', canWrite = true, online = false;
const names = {};
let cur = null, tables = [], homeUnsub = null, selGame = null;
let pubBusy = false, pubDirty = false, lastPubAt = 0;
const nameOf = u => names[u] || 'Player';
const NICK_A = ['Quiet', 'Brave', 'Sunny', 'Lucky', 'Gentle', 'Swift', 'Cosy', 'Bright', 'Calm', 'Merry', 'Clever', 'Witty'];
const NICK_B = ['Otter', 'Panda', 'Falcon', 'Koala', 'Fox', 'Heron', 'Lynx', 'Robin', 'Gecko', 'Badger', 'Owl', 'Hare'];
const cleanNick = t => String(t || '').replace(/[^A-Za-z0-9 _-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
const randomNick = () => `${NICK_A[rnd(NICK_A.length)]} ${NICK_B[rnd(NICK_B.length)]} ${10 + rnd(90)}`;
let myNick = (() => { const n = cleanNick(store.load().nick); return n.length >= 2 ? n : randomNick(); })();
const ART_URL = 'https://claude.ai/artifact/EaRJWhzwZYkgtYboEXHiHB';
const codeOf = id => String(id).slice(1, 6).toUpperCase();
const inviteLink = id => `${ART_URL}#join=${codeOf(id)}`;
let pendingCode = '', pendingTimer = 0;
const seatName = s => s.nm || nameOf(s.u);
const hostName = V => { const s = V.seats.find(x => x.u === V.hostId); return (s && s.nm) || nameOf(V.hostId); };
const gameOf = G => Club.games[G.game];

function ensureNames() {}
const paint = () => { if (cur) renderRoom(); else renderHome(); };

/* ----- the live game, and what everyone at the table sees of it ----- */
function makeGame(o) {
  const D = Club.games[o.game];
  const G = { id: o.id, name: o.name, game: o.game, hostId: o.hostId, mode: '', max: o.max || D.max, minP: o.min || D.min, status: o.status, players: [],
    round: 0, done: false, summary: [], log: [], seq: Date.now(), prompt: null, waitHuman: false, pendingHuman: null,
    dl: 0, nextAt: 0, fast: false, closed: false, joinSet: new Set(), startResolve: null, nextResolve: null,
    privKey: {}, privQ: {}, nicks: {}, inv: o.inv || [], level: o.level == null ? 1 : o.level };
  G.nicks[o.hostId] = myNick;
  G.players.push(mkPlayer({ uid: o.hostId, human: true }));
  for (let i = 0; i < (o.bots || 0); i++) { const b = mkBot(G); if (b) G.players.push(b); }
  G.joinReady = new Promise(r => { G.joinOk = r; });
  G.io = mkIO(G);
  if (D.init) D.init(G);
  return G;
}
function buildView(G) {
  const hold = G.done || G.status === 'waiting' || G.round === 0;
  return {
    game: G.game, id: G.id, name: G.name, hostId: G.hostId, status: G.status, round: G.round, max: G.max, min: G.minP, nc: !!gameOf(G).noChips, inv: G.inv || [], lv: G.level,
    seats: G.players.map(p => ({ u: p.human ? p.uid : null, nm: p.human ? (G.nicks[p.uid] || '') : '', w: p.wins || 0, n: p.human ? '' : p.name, st: p.human ? '' : p.style, stack: p.stack })),
    g: G.players.length ? gameOf(G).view(G) : {},
    prompt: G.prompt, dl: G.dl, wait: G.waitHuman, done: G.done, summary: G.summary,
    log: G.log.slice(-40), updated: Date.now(), nextAt: G.nextAt,
    start: G.players.map(p => (hold ? p.stack : p.startStack)),
  };
}
// Each seated guest gets their own private cards in their own document.
function pushPrivate(G) {
  if (!DB || G.mode !== 'host') return;
  const D = gameOf(G);
  if (!D.priv) return;
  G.players.forEach((p, i) => {
    if (!p.human || p.uid === G.hostId) return;
    const d = D.priv(G, i) || {}, key = G.round + '|' + JSON.stringify(d);
    if (G.privKey[p.uid] === key) return;
    G.privKey[p.uid] = key;
    G.privQ[p.uid] = (G.privQ[p.uid] || Promise.resolve())
      .then(() => DB.doc(`tables/${G.id}/hands/${p.uid}`).set({ h: G.round, d })).catch(() => {});
  });
}
function renderG(G) {
  if (!cur || cur.G !== G || G.closed) return;
  cur.V = buildView(G);
  if (cur.mode === 'host') { pushPrivate(G); schedulePub(); }
  renderRoom();
}
function schedulePub() {
  if (!cur || cur.mode !== 'host') return;
  pubDirty = true;
  if (!pubBusy) flushPub(cur.G, cur.ref);
}
async function flushPub(G, ref) {
  pubBusy = true;
  try {
    while (pubDirty && !G.closed) {
      pubDirty = false;
      await ref.set(buildView(G));
      lastPubAt = Date.now();
      await delay(250);
    }
  } catch (e) { console.warn('publish failed', e); }
  pubBusy = false;
}

/* ----- what a game's round function can do ----- */
function mkIO(G) {
  const io = {
    G,
    render() { renderG(G); },
    async sleep(ms) {
      await delay(ms * (G.fast ? 0.4 : 1));
      while (G.paused && !G.closed) await delay(200);
      if (G.closed) throw new Error('closed');
    },
    ev(p, t, y) { G.log.push({ p: G.players.indexOf(p), t, y }); },
    line(s, st) { G.log.push({ p: -1, s, st: !!st }); },
    // Wait for a person. validate(a) returns a cleaned action or null; auto is used on timeout.
    ask(p, data, o) {
      o = o || {};
      return new Promise(res => {
        const seat = G.players.indexOf(p), auto = o.auto, ms = o.timeout || 40000;
        G.seq++;
        const pend = { uid: p.uid, seq: G.seq, p, t: 0, validate: o.validate,
          finish(a) {
            if (G.pendingHuman !== pend) return;
            clearTimeout(pend.t); G.pendingHuman = null; G.waitHuman = false; G.prompt = null; G.dl = 0; res(a);
          },
          submit(a) { const v = pend.validate ? pend.validate(a) : a; if (!v) return false; pend.finish(v); return true; } };
        G.pendingHuman = pend; G.waitHuman = true; G.prompt = { seat, seq: G.seq, data: data || {} };
        if (p.left || G.closed) { pend.finish(auto); return; }
        if (p.uid !== G.hostId) {
          G.dl = Date.now() + ms;
          pend.t = setTimeout(() => { p.misses = (p.misses || 0) + 1; pend.finish(auto); }, ms);
        }
        io.render();
      });
    },
    // One decision: a person is asked, a computer player just decides.
    async turn(p, data, o) {
      if (!p.human || G.demo) { await io.sleep(G.demo ? Math.max(o.think || 700, 1700) : (o.think || 700)); return o.bot(); }
      return io.ask(p, data, o);
    },
  };
  return io;
}

/* ----- host side: players joining and acting ----- */
function onJoins(snap) {
  const G = cur && cur.G;
  if (!G) return;
  G.joinSet = new Set(snap.docs.map(d => d.id));
  for (const d of snap.docs) { const n = cleanNick((d.data() || {}).nm); if (n) G.nicks[d.id] = n; }
  for (const p of G.players) if (p.human && p.uid !== G.hostId) p.left = !G.joinSet.has(p.uid);
  G.joinOk();
  if (G.status === 'waiting') { syncSeats(G); renderG(G); }
}
function onActs(snap) {
  const G = cur && cur.G, pd = G && G.pendingHuman;
  if (!pd) return;
  for (const d of snap.docs) {
    if (d.id !== pd.uid) continue;
    const a = d.data();
    if (a && a.seq === pd.seq && pd.submit(a.a)) { pd.p.misses = 0; return; }
  }
}
function saveSolo(G) {
  const s = store.load();
  s[G.game] = { stack: G.players[0].stack, rounds: G.round };
  store.save(s);
}
async function hostLoop(G) {
  const D = gameOf(G), io = G.io;
  try {
    await Promise.race([G.joinReady, delay(3000)]);
    while (!G.closed) {
      while (G.status === 'waiting' && !G.closed) {
        syncSeats(G); G.summary = []; renderG(G);
        await new Promise(r => { G.startResolve = r; });
      }
      if (G.closed) break;
      const kicked = syncSeats(G);
      if (cur && cur.ref) for (const u of kicked) DB.doc(`tables/${G.id}/join/${u}`).delete().catch(() => {});
      if (G.players.length < G.minP) { G.status = 'waiting'; continue; }
      G.round++; G.done = false; G.summary = []; G.log = []; G.prompt = null; G.fast = false;
      for (const p of G.players) {
        if (p.stack <= 0) { p.stack = START; io.ev(p, `takes a fresh stack of ${fmt(START)}`, `take a fresh stack of ${fmt(START)}`); }
        else if (!p.human && p.stack > START * 5) p.stack = START;
        p.startStack = p.stack;
      }
      await D.round(G, io);
      G.done = true; G.fast = false;
      if (G.mode === 'solo' && !G.demo) saveSolo(G);
      G.nextAt = Date.now() + 8000; renderG(G);
      await new Promise(r => { const t = setTimeout(r, 8000); G.nextResolve = () => { clearTimeout(t); r(); }; });
      G.nextAt = 0;
    }
  } catch (e) { if (!G.closed) console.error(e); }
}
function attachHost(c) {
  c.subs.push(DB.collection(`tables/${c.id}/join`).onSnapshot(onJoins, () => {}));
  c.subs.push(DB.collection(`tables/${c.id}/act`).onSnapshot(onActs, () => {}));
  c.hb = setInterval(() => {
    if (!c.G.closed && !pubBusy && Date.now() - lastPubAt > 50000) {
      c.ref.update({ updated: Date.now() }).then(() => { lastPubAt = Date.now(); }).catch(() => {});
    }
  }, 30000);
  hostLoop(c.G);
}

/* ----- entering and leaving ----- */
function show(which) {
  $('home').hidden = which !== 'home'; $('room').hidden = which !== 'room'; $('roundNo').textContent = '';
  const rb = $('resumeBar'); if (rb) { rb.hidden = !(cur && which === 'home'); if (cur) $('resumeName').textContent = Club.games[cur.game].name; }
}
function stopHome() { if (homeUnsub) { try { homeUnsub(); } catch {} homeUnsub = null; } }
function enterRoom(c) {
  if (cur && cur !== c) leaveRoom();
  cur = c;
  $('stage').innerHTML = ''; $('gameCtl').innerHTML = ''; c.mounted = false;
  stopHome(); show('room');
  $('rulesBody').innerHTML = Club.games[c.game].rules;
  const inv = c.mode === 'host';
  $('invite').hidden = !inv;
  if (inv) { $('invCode').textContent = codeOf(c.id); $('invLink').value = inviteLink(c.id); $('invCopy').textContent = 'Copy link'; }
}
function goHome() {
  endDemo();
  cur = null; show('home'); startHome(); renderHome();
}
function startSolo(gid, count) {
  const D = Club.games[gid];
  const n = Math.max(D.min, Math.min(D.max, count || D.soloBots + 1));
  const G = makeGame({ id: 'solo', name: D.name, game: gid, hostId: myUid, bots: n - 1, status: 'playing', level: gpLevel });
  G.mode = 'solo'; G.joinOk();
  const sv = (store.load()[gid]) || {};
  if (sv.stack > 0) G.players[0].stack = sv.stack;
  G.round = sv.rounds || 0;
  enterRoom({ mode: 'solo', game: gid, id: 'solo', uid: myUid, G, V: null, subs: [], sentSeq: 0 });
  renderG(G); hostLoop(G);
}
async function createTable(gid, opt) {
  opt = opt || {};
  const name = (opt.name || $('tName').value.trim() || 'Card night').slice(0, 28);
  const id = 't' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const mx = opt.max || +$('hMax').value || Club.games[gid].max, mn = Math.min(mx, opt.min || +$('hMin').value || Club.games[gid].min);
  const G = makeGame({ id, name, game: gid, hostId: myUid, bots: 0, status: 'waiting', min: mn, max: mx, inv: opt.inv || [], level: gpLevel });
  G.mode = 'host';
  const ref = DB.doc('tables/' + id);
  $('createBtn').disabled = true;
  try { await ref.set(buildView(G)); }
  catch (e) { $('createNote').textContent = 'Could not create the table. Check that you have access to play online, then try again.'; $('createBtn').disabled = false; return; }
  $('createBtn').disabled = false;
  lastPubAt = Date.now();
  enterRoom({ mode: 'host', game: gid, id, uid: myUid, G, ref, V: null, subs: [], sentSeq: 0 });
  renderG(G); attachHost(cur);
}
async function resumeTable(id) {
  let V;
  try { const s = await DB.doc('tables/' + id).get(); if (!s.exists) return; V = s.data(); } catch { return; }
  if (!Club.games[V.game]) return;
  const G = makeGame({ id, name: V.name, game: V.game, hostId: V.hostId, bots: 0, status: V.status === 'waiting' ? 'waiting' : 'playing', min: V.min, max: V.max, inv: V.inv || [], level: V.lv });
  G.mode = 'host';
  G.players = V.seats.map((s, i) => {
    const p = s.u ? mkPlayer({ uid: s.u, human: true }) : (mkBot(G, s.n) || mkPlayer({ name: s.n, style: s.st }));
    p.stack = V.start && V.start[i] > 0 ? V.start[i] : START; p.wins = s.w || 0; return p;
  });
  V.seats.forEach(x => { if (x.u && x.nm && x.u !== myUid) G.nicks[x.u] = x.nm; });
  G.round = V.round; G.done = true;
  if (V.g && V.g.dealer !== undefined) G.dealer = V.g.dealer;
  lastPubAt = Date.now();
  enterRoom({ mode: 'host', game: V.game, id, uid: myUid, G, ref: DB.doc('tables/' + id), V: null, subs: [], sentSeq: 0 });
  renderG(G); attachHost(cur);
}
function openTable(id, gid, join) {
  const c = { mode: 'guest', game: gid, id, uid: myUid, G: null, V: null, subs: [], sentSeq: 0, hand: null, joined: false,
    lastSeen: Date.now(), seqSeen: 0, dlAt: 0, gone: false, err: false, ref: DB.doc('tables/' + id) };
  enterRoom(c);
  c.subs.push(c.ref.onSnapshot(snap => {
    c.err = false;
    if (!snap.exists) { c.gone = true; renderRoom(); return; }
    const V = snap.data();
    if (!c.V || V.updated !== c.V.updated) c.lastSeen = Date.now();
    const sq = V.prompt ? V.prompt.seq : 0;
    if (sq !== c.seqSeen) { c.seqSeen = sq; c.dlAt = V.dl ? Date.now() + 39000 : 0; }
    c.V = V;
    ensureNames(V.seats.map(s => s.u).concat(V.hostId));
    renderRoom();
  }, () => { c.err = true; renderRoom(); }));
  c.subs.push(DB.doc(`tables/${id}/hands/${myUid}`).onSnapshot(s => { c.hand = s.exists ? s.data() : null; renderRoom(); }, () => {}));
  c.subs.push(DB.doc(`tables/${id}/join/${myUid}`).onSnapshot(s => { c.joined = s.exists; renderRoom(); }, () => {}));
  if (join) sit();
  renderRoom();
}
function sit() {
  if (!cur || cur.mode !== 'guest') return;
  DB.doc(`tables/${cur.id}/join/${myUid}`).set({ at: Date.now(), nm: myNick }).catch(() => {
    cur.notice = 'Could not take a seat. You need Contributor access to this page to play online.'; renderRoom();
  });
}
async function leaveRoom() {
  const c = cur;
  if (!c) return;
  clearInterval(c.hb);
  if (c.G) { c.G.closed = true; if (c.G.pendingHuman) c.G.pendingHuman.finish(null); if (c.G.nextResolve) c.G.nextResolve(); if (c.G.startResolve) c.G.startResolve(); }
  c.subs.forEach(u => { try { u(); } catch {} });
  goHome();
  try {
    if (c.mode === 'host') {
      while (pubBusy) await delay(50);
      const uids = new Set([...c.G.joinSet, ...c.G.players.filter(p => p.human).map(p => p.uid)]);
      for (const u of uids) {
        await DB.doc(`tables/${c.id}/act/${u}`).delete().catch(() => {});
        await DB.doc(`tables/${c.id}/join/${u}`).delete().catch(() => {});
        await DB.doc(`tables/${c.id}/hands/${u}`).delete().catch(() => {});
      }
      await c.ref.delete();
    } else if (c.mode === 'guest' && c.joined) {
      await DB.doc(`tables/${c.id}/join/${myUid}`).delete();
    }
  } catch {}
}

/* ----- lobby ----- */
function startHome() {
  stopHome();
  if (!online) return;
  try {
    homeUnsub = DB.collection('tables').onSnapshot(snap => {
      tables = snap.docs.map(d => ({ id: d.id, V: d.data() })).filter(t => t.V && t.V.seats && Club.games[t.V.game]);
      ensureNames(tables.flatMap(t => t.V.seats.map(s => s.u).concat(t.V.hostId)));
      if (!cur) renderHome();
      tryPending();
    }, () => {});
  } catch {}
}
function selectGame(gid) {
  selGame = gid && Club.games[gid] ? gid : null;
  if (selGame) { const c = CATS.find(([k]) => inCat(selGame, k)); if (c) openCat = c[0]; }
  try { if (location.hash.slice(1) !== (selGame || '')) location.hash = selGame || ''; } catch {}
  renderHome();
}
const CATS = [['card', 'Card games'], ['board', 'Board games'], ['mind', 'Mind games'], ['word', 'Word games'], ['math', 'Math games'], ['dice', 'Dice games'], ['group', 'Group games'], ['casino', 'Casino games'], ['aim', 'Aiming games'], ['sports', 'Sports games'], ['arcade', 'Arcade'], ['puzzle', 'Puzzle games'], ['trivia', 'Trivia']];
let openCat = (CATS.find(([c]) => Object.keys(Club.games).some(id => inCatEarly(id, c))) || [null])[0];
function inCatEarly(id, c) { const D = Club.games[id]; return D.cat === c || (D.cats || []).includes(c); }
const inCat = inCatEarly;
let gpMode = 'solo', frN = 0, soloC = -1, gpLevel = 1;
const LEVELS = ['Easy', 'Medium', 'Hard'];
const lc = t => cleanNick(t).toLowerCase();
const getFriends = () => { const f = store.load().friends; return Array.isArray(f) ? f.map(cleanNick).filter(x => x.length >= 2).slice(0, 40) : []; };
const setFriends = f => { const s = store.load(); s.friends = f; store.save(s); };
let frPick = new Set();
const invitedMe = V => Array.isArray(V.inv) && V.inv.length && V.inv.includes(lc(myNick));
const playersTxt = D => (D.min === D.max ? D.min : D.min + ' to ' + D.max) + ' players';
function chipsHTML(vals, sel, label) { return vals.map(v => `<button type="button" class="cp${v === sel ? ' on' : ''}" data-v="${v}" aria-pressed="${v === sel}">${label(v)}</button>`).join(''); }
function renderHome() {
  const tile = id => {
    const D = Club.games[id];
    return `<button type="button" class="gtile" data-g="${id}">${coverHTML(id)}<div class="gt-body"><b>${esc(D.name)}</b><span class="pl">${playersTxt(D)}</span></div></button>`;
  };
  const cats = CATS.filter(([c]) => Club.order.some(id => inCat(id, c)));
  $('gameGrid').innerHTML = `<div class="catbar" role="group" aria-label="Game categories">${cats.map(([c, label]) => {
    const n = Club.order.filter(id => inCat(id, c)).length;
    return `<button type="button" class="catbtn${openCat === c ? ' open' : ''}" data-cat="${c}" aria-expanded="${openCat === c}" aria-controls="catMenu">${label}<small>${n}</small><i aria-hidden="true">${openCat === c ? '&#9652;' : '&#9662;'}</i></button>`;
  }).join('')}</div>` + (openCat ? `<div class="catmenu" id="catMenu"><div class="tiles">${Club.order.filter(id => inCat(id, openCat)).map(tile).join('')}</div></div>` : '');
  const D = selGame && Club.games[selGame];
  $('browse').hidden = !!D; $('gamePanel').hidden = !D;
  const jw = $('joinWrap');
  if (D) {
    const lo = Math.max(D.min, 1), totals = Array.from({ length: D.max - lo + 1 }, (_, k) => lo + k);
    const sel = $('soloN');
    if (sel.dataset.g !== selGame) { sel.dataset.g = selGame; soloC = D.soloBots; frN = Math.min(Math.max(D.min - 1, 1), D.max - 1) === 0 ? 1 : Math.min(3, D.max - 1); gpMode = 'solo'; }
    if (!totals.includes(soloC + 1)) soloC = Math.max(0, lo - 1);
    sel.innerHTML = totals.map(k => `<option value="${k}"${k === soloC + 1 ? ' selected' : ''}>${k}</option>`).join('');
    $('soloChips').innerHTML = chipsHTML(totals.map(k => k - 1), soloC, c => (c === 0 ? 'None (just me)' : c + (c === 1 ? ' computer' : ' computers')));
    const fl = getFriends(); frPick = new Set([...frPick].filter(x => fl.includes(x)));
    $('frList').innerHTML = fl.length ? fl.map(f => `<span class="frchip${frPick.has(f) ? ' on' : ''}"><button type="button" class="cp${frPick.has(f) ? ' on' : ''}" data-fr="${esc(f)}" aria-pressed="${frPick.has(f)}">${esc(f)}</button><button type="button" class="frx" data-frx="${esc(f)}" aria-label="Remove ${esc(f)}">&times;</button></span>`).join('') : '<p class="empty">No friends added yet. Type a friend’s username above (they can see it in the top corner of their screen).</p>';
    const room = D.max - 1, ns = Math.min(frPick.size, room);
    const hm = $('hMax');
    if (hm.dataset.g !== selGame) {
      hm.dataset.g = selGame;
      const opts = (a, b, sl) => Array.from({ length: b - a + 1 }, (_, k) => a + k).map(k => `<option value="${k}"${k === sl ? ' selected' : ''}>${k}</option>`).join('');
      $('hMin').innerHTML = opts(D.min, D.max, D.min); hm.innerHTML = opts(D.min, D.max, D.max);
    }
    $('lvlRow').hidden = !D.levels; $('lvlChips').innerHTML = chipsHTML([0, 1, 2], gpLevel, v => LEVELS[v]);
    $('gpCover').outerHTML = coverHTML(selGame).replace('class="cover"', 'class="cover big" id="gpCover" aria-hidden="true"');
    $('gpName').textContent = D.name; $('gpTag').textContent = D.tag; $('gpPl').textContent = playersTxt(D); $('gpRules').innerHTML = D.rules;
    document.querySelectorAll('#modes .mode').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === gpMode));
    $('mSolo').hidden = gpMode !== 'solo'; $('mFriends').hidden = gpMode !== 'friends'; $('mCreate').hidden = gpMode !== 'create';
    $('createBtn').disabled = !online || !canWrite; $('friendBtn').disabled = !online || !canWrite || !frPick.size;
    $('friendBtn').textContent = frPick.size ? `Invite ${frPick.size} friend${frPick.size === 1 ? '' : 's'} to ${D.name}` : 'Tick a friend to invite';
    const offline = !online ? 'Playing with friends needs the shared-data feature, which is not available here. You can still play solo with computers.' : !canWrite ? 'You can watch tables here. To host or join one, ask the page owner for Contributor access.' : '';
    $('createNote').textContent = offline || 'Friends find your table in the list and join from their own screen.';
    $('friendNote').textContent = offline || (frPick.size > room ? `${D.name} seats ${D.max}, so only the first ${room} ticked friend${room === 1 ? '' : 's'} will be invited.` : 'Only the friends you invite can see this table in their list. You also get a code and link to send.');
    (gpMode === 'friends' ? $('joinSlot') : $('browse')).appendChild(jw);
  } else { $('browse').appendChild(jw); }
  $('listTitle').textContent = D ? `Open ${D.name} tables` : 'Open tables';
  const el = $('tableList');
  if (!online) { el.innerHTML = '<p class="empty">Open tables appear here when this page is opened from claude.ai with access to its shared data.</p>'; return; }
  const fresh = t => Date.now() - t.V.updated < 30 * 60000;
  const vis = t => !(t.V.inv && t.V.inv.length) || t.V.hostId === myUid || invitedMe(t.V) || t.V.seats.some(s => s.u === myUid);
  const inv = tables.filter(t => fresh(t) && t.V.hostId !== myUid && invitedMe(t.V) && !t.V.seats.some(s => s.u === myUid));
  $('invitesBox').innerHTML = D && inv.length ? '<h3>Invitations for you</h3>' + inv.map(t => `<div class="trow"><div class="tinfo"><b>${esc(t.V.name)}</b><span><em>${esc(Club.games[t.V.game].name)}</em> · ${esc(hostName(t.V))} invited you</span></div><div class="tbtns"><button type="button" class="b small gold" data-a="join" data-id="${esc(t.id)}" data-g="${esc(t.V.game)}">Join</button></div></div>`).join('') : '';
  $('invitesBox').onclick = $('tableList').onclick;
  const live = tables.filter(t => fresh(t) && vis(t) && (!D || t.V.game === selGame)).sort((a, b) => b.V.updated - a.V.updated);
  if (!live.length) { el.innerHTML = `<p class="empty">No tables are open right now. ${D ? 'Host one and send friends the link to this page.' : 'Pick a game above to host one.'}</p>`; return; }
  el.innerHTML = live.map(t => {
    const V = t.V, G = Club.games[V.game], n = V.seats.length, bots = V.seats.filter(s => !s.u).length;
    const mine = V.hostId === myUid, seated = V.seats.some(s => s.u === myUid);
    const open = n < V.max || bots > 0;
    const host = mine ? 'you' : hostName(V);
    const main = mine ? ['resume', 'Resume as host'] : seated ? ['rejoin', 'Rejoin'] : open && canWrite ? ['join', 'Join'] : null;
    return `<div class="trow"><div class="tinfo"><b>${esc(V.name)}</b><span><em>${esc(G.name)}</em> · Host ${esc(host)} · ${n}/${V.max} seated${bots ? ` · ${bots} computer${bots > 1 ? 's' : ''}` : ''} · ${V.status === 'waiting' ? 'Waiting to start' : 'Playing'}</span></div>
      <div class="tbtns">${main ? `<button type="button" class="b small gold" data-a="${main[0]}" data-id="${esc(t.id)}" data-g="${esc(V.game)}">${main[1]}</button>` : ''}${mine ? '' : `<button type="button" class="ghost" data-a="watch" data-id="${esc(t.id)}" data-g="${esc(V.game)}">Watch</button>`}</div></div>`;
  }).join('');
}

/* ----- the room ----- */
function entryText(e, V, me) {
  if (e.p < 0) return esc(e.s || '');
  const s = V.seats[e.p];
  if (!s) return '';
  const you = e.p === me;
  return esc(`${you ? 'You' : s.u ? seatName(s) : s.n} ${you ? e.y : e.t}`);
}
function renderRoom() {
  const c = cur;
  if (!c || $('room').hidden) return;
  const V = c.V, D = Club.games[c.game];
  $('roomName').textContent = c.mode === 'solo' ? D.name : V ? V.name : 'Table';
  $('roomSub').textContent = c.mode === 'solo' ? (c.demo ? 'demo' : 'vs computer' + (D.levels ? ' · ' + LEVELS[c.G && c.G.level != null ? c.G.level : 1] : '')) : V ? D.name + ' · Host: ' + (V.hostId === c.uid ? 'you' : hostName(V)) : D.name;
  const warn = [];
  if (c.gone) warn.push('This table has closed.');
  else if (c.err) warn.push('Lost the connection to the table. Trying again.');
  else if (c.mode === 'guest' && V && V.status === 'playing' && Date.now() - c.lastSeen > 150000) warn.push('The host seems to be away. The game continues when they return.');
  if (c.notice) warn.push(c.notice);
  $('notice').hidden = !warn.length;
  $('notice').textContent = warn.join(' ');
  if (!V) {
    $('status').textContent = 'Connecting to the table…';
    ['waitPanel', 'watchPanel', 'next'].forEach(k => { $(k).hidden = true; });
    $('stage').hidden = true;
    return;
  }
  const n = V.seats.length;
  const me = V.seats.findIndex(s => s.u === c.uid);
  const waiting = V.status === 'waiting';
  ensureNames(V.seats.map(s => s.u));
  $('roundNo').textContent = !waiting && V.round > 0 ? `${D.roundWord} ${fmt(V.round)}` : '';
  $('stage').hidden = waiting || c.gone;

  const my = c.mode === 'guest' ? (c.hand && c.hand.h === V.round ? c.hand.d : null) : (me >= 0 && D.priv ? D.priv(c.G, me) : null);
  const turn = !waiting && !c.gone && me >= 0 && V.prompt && V.prompt.seat === me && !V.done && c.sentSeq !== V.prompt.seq ? V.prompt : null;
  const S = { V, me, my, turn, send: answer, host: c.mode !== 'guest', game: c.game,
    tag: i => (V.seats[i] ? (V.seats[i].u ? (V.seats[i].u === V.hostId && c.mode !== 'solo' ? 'Host' : '') : V.seats[i].st) : ''),
    nameOf: i => (i === me ? 'You' : V.seats[i] ? (V.seats[i].u ? seatName(V.seats[i]) : V.seats[i].n) : ''),
    text: e => entryText(e, V, me), dlLeft: () => (c.mode === 'guest' && c.dlAt ? Math.max(0, Math.ceil((c.dlAt - Date.now()) / 1000)) : 0) };
  c.S = S;
  if (!waiting && !c.gone) {
    const U = T3.on() && D.ui3d ? D.ui3d : D.ui;
    if (!c.mounted || c.mountedUi !== U) { U.mount($('stage'), $('gameCtl'), S); c.mounted = true; c.mountedUi = U; }
    c.extra = U.update(S) || '';
    $('viewBtn').hidden = true;
    $('viewBtn').textContent = T3.on() ? 'Switch to 2D' : 'Switch to 3D';
  }
  $('log').innerHTML = V.log.map(e => `<li${e.st ? ' class="street"' : ''}>${entryText(e, V, me)}</li>`).join('');
  $('log').scrollTop = $('log').scrollHeight;

  $('waitPanel').hidden = !waiting || c.gone;
  if (waiting) {
    $('seatList').innerHTML = V.seats.map(s => `<span class="chip${s.u ? '' : ' bot'}">${esc(s.u ? (s.u === c.uid ? 'You' : seatName(s)) : s.n + ' (computer)')}</span>`).join('');
    const host = c.mode === 'host';
    $('hostBtns').hidden = !host;
    const mn = V.min || D.min, rng = mn === V.max ? `${mn} players` : `${mn} to ${V.max} players`;
    $('waitHint').textContent = (host ? 'Friends can join with the table code or from the table list. Start when everyone is seated. ' : 'Waiting for the host to start the game. ') + `This table takes ${rng}.`;
    $('startBtn').disabled = n < (V.min || D.min); $('addBot').disabled = n >= V.max; $('delBot').disabled = !V.seats.some(s => !s.u);
  }
  const canTake = n < V.max || V.seats.some(s => !s.u);
  $('watchPanel').hidden = me >= 0 || c.gone;
  if (me < 0) {
    $('watchText').textContent = c.joined ? 'You are in the queue. You will be dealt in at the start of the next round.'
      : !canWrite ? 'You are watching. Playing needs Contributor access to this page.'
      : canTake ? 'You are watching this table.' : 'The table is full. You are watching.';
    $('sitBtn').hidden = c.joined || !canWrite || !canTake;
  }
  $('next').hidden = !(c.mode !== 'guest' && V.done && !waiting);
  if (!waiting && !c.gone) Snd.observe(c, V, me, turn, D);
  renderStatus();
}
function renderStatus() {
  const c = cur, V = c && c.V;
  if (!V) return;
  const me = V.seats.findIndex(s => s.u === c.uid), myS = me >= 0 ? V.seats[me] : null;
  const S = c.S;
  let t = '';
  if (c.gone) t = 'This table has closed. Leave to go back to the lobby.';
  else if (V.status === 'waiting') t = '';
  else if (S && S.turn) {
    const left = S.dlLeft();
    t = 'Your move. ' + (c.extra && typeof c.extra === 'string' ? c.extra + ' ' : '') + (left ? `${left}s left.` : '');
  } else if (V.done) t = myS && myS.stack <= 0 ? 'You are out of chips. They are free, so you get a fresh stack next round.' : 'Round over. The next one starts in a moment.';
  else if (V.prompt && V.seats[V.prompt.seat]) {
    const a = V.seats[V.prompt.seat];
    t = a.u ? (a.u === c.uid ? 'Sending your move…' : `Waiting for <b>${esc(seatName(a))}</b>`) : `<b>${esc(a.n)}</b> is thinking…`;
  }
  $('status').innerHTML = t;
}
setInterval(() => { if (cur && cur.V && cur.dlAt > Date.now()) renderStatus(); }, 1000);

async function answer(a) {
  const c = cur, V = c && c.V;
  if (!V || !V.prompt) return;
  if (c.mode === 'guest') {
    c.sentSeq = V.prompt.seq; renderRoom();
    try { await DB.doc(`tables/${c.id}/act/${c.uid}`).set({ seq: V.prompt.seq, a, at: Date.now() }); }
    catch { c.sentSeq = 0; renderRoom(); }
    return;
  }
  const pd = c.G.pendingHuman;
  if (pd && pd.uid === c.uid && pd.seq === V.prompt.seq && pd.submit(a)) c.sentSeq = V.prompt.seq;
}

/* ----- wiring ----- */
$('nextBtn').onclick = () => { if (cur && cur.G && cur.G.nextResolve) cur.G.nextResolve(); };
$('leaveBtn').onclick = leaveRoom;
$('roomBackBtn').onclick = () => { if (!cur) return; selGame = cur.game; show('home'); renderHome(); try { location.hash = selGame; } catch {} window.scrollTo(0, 0); };
$('resumeBtn').onclick = () => { if (!cur) return; show('room'); renderRoom(); setTimeout(() => window.dispatchEvent(new Event('resize')), 50); };
$('resumeLeave').onclick = leaveRoom;
$('viewBtn').onclick = () => { T3.setPref(!T3.on()); if (cur) { cur.mounted = false; renderRoom(); } };
$('sitBtn').onclick = sit;
$('addBot').onclick = () => {
  const G = cur && cur.G;
  if (!G || G.status !== 'waiting' || G.players.length >= G.max) return;
  const b = mkBot(G);
  if (b) { G.players.push(b); renderG(G); }
};
$('delBot').onclick = () => {
  const G = cur && cur.G;
  if (!G || G.status !== 'waiting') return;
  for (let i = G.players.length - 1; i >= 0; i--) if (!G.players[i].human) { G.players.splice(i, 1); renderG(G); return; }
};
$('startBtn').onclick = () => {
  const G = cur && cur.G;
  if (!G || G.status !== 'waiting' || G.players.length < G.minP) return;
  G.status = 'playing';
  if (G.startResolve) G.startResolve();
};
$('soloBtn').onclick = () => { if (selGame) startSolo(selGame, +$('soloN').value); };
$('backBtn').onclick = () => selectGame(null);
$('modes').onclick = e => { const b = e.target.closest('[data-mode]'); if (b) { gpMode = b.dataset.mode; renderHome(); } };
$('lvlChips').onclick = e => { const b = e.target.closest('[data-v]'); if (b) { gpLevel = +b.dataset.v; renderHome(); } };
$('soloChips').onclick = e => { const b = e.target.closest('[data-v]'); if (b) { soloC = +b.dataset.v; renderHome(); } };
$('frList').onclick = e => {
  const x = e.target.closest('[data-frx]'); if (x) { setFriends(getFriends().filter(f => f !== x.dataset.frx)); renderHome(); return; }
  const b = e.target.closest('[data-fr]'); if (b) { const f = b.dataset.fr; frPick.has(f) ? frPick.delete(f) : frPick.add(f); renderHome(); }
};
$('addFrForm').onsubmit = e => {
  e.preventDefault(); const n = cleanNick($('frIn').value), fl = getFriends();
  if (n.length < 2) { $('frNote').textContent = 'A username needs at least 2 letters or numbers.'; return; }
  if (lc(n) === lc(myNick)) { $('frNote').textContent = 'That is your own username.'; return; }
  if (fl.some(f => lc(f) === lc(n))) { $('frNote').textContent = `${n} is already in your list.`; return; }
  setFriends(fl.concat(n)); frPick.add(n); $('frIn').value = ''; $('frNote').textContent = `${n} added. They see invitations when they open this page with that username.`; renderHome();
};
$('friendBtn').onclick = () => {
  if (!(online && canWrite && selGame && frPick.size)) return;
  const D = Club.games[selGame], ids = [...frPick].slice(0, D.max - 1), mx = ids.length + 1;
  createTable(selGame, { name: `${myNick}'s table`, max: mx, min: Math.max(2, Math.min(D.min, mx)), inv: ids.map(lc) });
};
$('createForm').onsubmit = e => { e.preventDefault(); if (online && canWrite && selGame) createTable(selGame); };
$('gameGrid').onclick = e => {
  const c = e.target.closest('button[data-cat]');
  if (c) { openCat = openCat === c.dataset.cat ? null : c.dataset.cat; renderHome(); return; }
  const b = e.target.closest('button[data-g]');
  if (b) selectGame(b.dataset.g);
};
$('brandLink').onclick = e => { e.preventDefault(); if (cur) leaveRoom(); else selectGame(null); };
$('tableList').onclick = e => {
  const b = e.target.closest('button[data-a]');
  if (!b || !online) return;
  const id = b.dataset.id, a = b.dataset.a, g = b.dataset.g;
  if (a === 'resume') resumeTable(id);
  else if (a === 'watch') openTable(id, g, false);
  else openTable(id, g, true);
};
function joinByCode(raw, quiet) {
  const code = String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 3) { if (!quiet) $('codeNote').textContent = 'Type the code your friend sent.'; return; }
  pendingCode = code; clearTimeout(pendingTimer);
  if (!online) { $('codeNote').textContent = 'Joining a friend needs the shared-data feature, which is not available in this view.'; pendingCode = ''; return; }
  $('codeNote').textContent = 'Looking for the table…';
  pendingTimer = setTimeout(() => { if (pendingCode) { pendingCode = ''; $('codeNote').textContent = 'No open table has that code. Check it with your friend, and make sure they are still online.'; } }, 12000);
  tryPending();
}
function tryPending() {
  if (!pendingCode || cur) return;
  const t = tables.find(x => codeOf(x.id) === pendingCode || codeOf(x.id).startsWith(pendingCode));
  if (!t) return;
  pendingCode = ''; clearTimeout(pendingTimer); $('codeNote').textContent = '';
  if (t.V.hostId === myUid) resumeTable(t.id);
  else openTable(t.id, t.V.game, canWrite && (t.V.seats.length < t.V.max || t.V.seats.some(s => !s.u)));
}
function hashJoin() { const m = /^join=([A-Za-z0-9]+)/.exec(location.hash.slice(1)); if (m) { $('codeIn').value = m[1].toUpperCase(); joinByCode(m[1], true); return true; } return false; }
$('codeForm').onsubmit = e => { e.preventDefault(); joinByCode($('codeIn').value); };
$('invCopy').onclick = async () => {
  const v = $('invLink').value;
  try { await navigator.clipboard.writeText(v); $('invCopy').textContent = 'Copied'; }
  catch { $('invLink').select(); try { document.execCommand('copy'); $('invCopy').textContent = 'Copied'; } catch { $('invCopy').textContent = 'Press Ctrl+C'; } }
};
window.addEventListener('hashchange', () => { if (hashJoin()) return; if (!cur || !$('room').hidden === false) { const h = location.hash.slice(1); selGame = Club.games[h] ? h : null; if (selGame) { const c = CATS.find(([k]) => inCat(selGame, k)); if (c) openCat = c[0]; } renderHome(); } });

(async function init() {
  const h = location.hash.slice(1);
  if (Club.games[h]) { selGame = h; const c = CATS.find(([k]) => inCat(h, k)); if (c) openCat = c[0]; }
  renderHome();
  USER = await use('user');
  DB = await use('db');
  if (USER) {
    const id = await USER.id();
    if (id) myUid = id;
    try { canWrite = (await USER.can('data.write')) !== false; } catch {}
  }
  online = !!DB && myUid !== 'local';
  if (!cur) { startHome(); renderHome(); }
  hashJoin();
})();


/* ----- step-by-step guide: built from each game's rules ----- */
let gd = null;
function guideSteps(D) {
  const box = document.createElement('div'); box.innerHTML = D.rules;
  const goal = box.querySelector('p'), steps = [];
  if (goal) steps.push({ t: 'The goal', h: goal.innerHTML });
  box.querySelectorAll('ol > li, ul > li').forEach((li, k) => steps.push({ t: 'Step ' + (k + 1), h: li.innerHTML }));
  steps.push({ t: 'Ready to play?', h: 'Start a game against the computer to try it. The first game or two are practice; chips are only for fun.', end: true });
  return steps;
}
function openGuide(gid) {
  const D = Club.games[gid]; if (!D) return;
  gd = { gid, i: 0, steps: guideSteps(D), from: document.activeElement };
  $('gdGame').textContent = D.name;
  $('gdDots').innerHTML = gd.steps.map(() => '<i></i>').join('');
  $('guide').hidden = false; drawGuide(); $('gdNext').focus();
}
function drawGuide() {
  const st = gd.steps[gd.i];
  $('gdTitle').textContent = st.t; $('gdText').innerHTML = st.h;
  [...$('gdDots').children].forEach((d, k) => { d.className = k === gd.i ? 'on' : k < gd.i ? 'done' : ''; });
  $('gdBack').disabled = gd.i === 0;
  $('gdNext').textContent = st.end ? (cur ? 'Got it' : 'Play vs computer') : 'Next';
}
function closeGuide() { $('guide').hidden = true; if (gd && gd.from && gd.from.focus) { try { gd.from.focus(); } catch {} } gd = null; }
$('guideBtn').onclick = () => { if (selGame) openGuide(selGame); };
$('guideBtn2').onclick = () => { if (cur) openGuide(cur.game); };
$('gdClose').onclick = closeGuide;
$('guide').onclick = e => { if (e.target === $('guide')) closeGuide(); };
$('gdBack').onclick = () => { if (gd && gd.i > 0) { gd.i--; drawGuide(); } };
$('gdNext').onclick = () => {
  if (!gd) return;
  if (!gd.steps[gd.i].end) { gd.i++; drawGuide(); return; }
  const g = gd.gid, wasHome = !cur; closeGuide();
  if (wasHome) startSolo(g, +$('soloN').value || undefined);
};
document.addEventListener('keydown', e => { if (gd && e.key === 'Escape') closeGuide(); });
// Laptop / desktop: press Enter to start the selected game against the computer.
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing || e.repeat || e.ctrlKey || e.metaKey || e.altKey || gd || cur || !selGame) return;
  const t = e.target, tag = t && t.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
  if ((tag === 'BUTTON' || tag === 'A') && !(t.classList && t.classList.contains('gtile') && t.dataset.g === selGame)) return;
  const b = $('soloBtn'); if (b && !b.disabled && !$('gamePanel').hidden && gpMode === 'solo') { e.preventDefault(); b.click(); }
});


/* ----- your name: random, kept on this device, changeable ----- */
function saveNick(n) {
  myNick = n;
  const d = store.load(); d.nick = n; store.save(d);
  $('nickName').textContent = n;
  if (cur && cur.G) { cur.G.nicks[myUid] = n; if (cur.mode === 'host') renderG(cur.G); }
  if (cur && cur.mode === 'guest' && cur.joined && DB) DB.doc(`tables/${cur.id}/join/${myUid}`).set({ at: Date.now(), nm: n }).catch(() => {});
}
function openNick() { $('nickIn').value = myNick; $('nickDlg').hidden = false; $('nickIn').focus(); $('nickIn').select(); }
$('nickName').textContent = myNick;
$('nickBtn').onclick = openNick;
$('nickDice').onclick = () => { $('nickIn').value = randomNick(); $('nickIn').focus(); };
$('nickClose').onclick = () => { $('nickDlg').hidden = true; $('nickBtn').focus(); };
$('nickDlg').onclick = e => { if (e.target === $('nickDlg')) $('nickClose').click(); };
$('nickForm').onsubmit = e => {
  e.preventDefault();
  const n = cleanNick($('nickIn').value);
  if (n.length < 2) { $('nickNote').textContent = 'Use at least 2 letters or numbers.'; return; }
  $('nickNote').textContent = ''; saveNick(n); $('nickClose').click();
};
if (!store.load().nick) saveNick(myNick);


/* ----- demo: the real game, played by the computer in your seat, with captions ----- */
let demo = null;
function startDemo(gid) {
  const D = Club.games[gid]; if (!D) return;
  const G = makeGame({ id: 'demo', name: D.name, game: gid, hostId: myUid, bots: Math.min(D.max, Math.max(D.min, D.soloBots + 1)) - 1, status: 'playing' });
  G.mode = 'solo'; G.demo = true; G.joinOk();
  enterRoom({ mode: 'solo', game: gid, id: 'demo', uid: myUid, G, V: null, subs: [], sentSeq: 0, demo: true });
  demo = { gid, i: 0, steps: guideSteps(D), timer: 0, paused: false };
  $('demoBar').hidden = false; drawDemo();
  demo.timer = setInterval(() => { if (demo && !demo.paused && demo.i < demo.steps.length - 1) { demo.i++; drawDemo(); } }, 9000);
  renderG(G); hostLoop(G);
}
function drawDemo() {
  const st = demo.steps[demo.i];
  $('dmStep').textContent = st.end ? 'Your turn next' : `${st.t} of ${demo.steps.length - 1}`;
  $('dmText').innerHTML = st.end ? 'That is the idea. Press <b>Play for real</b> to try it yourself.' : st.h;
  $('dmPause').textContent = demo.paused ? 'Play' : 'Pause';
  $('dmPrev').disabled = demo.i === 0; $('dmNext').disabled = demo.i >= demo.steps.length - 1;
}
function endDemo() { if (demo) { clearInterval(demo.timer); demo = null; } $('demoBar').hidden = true; }
$('demoBtn').onclick = () => { if (selGame) startDemo(selGame); };
$('dmPause').onclick = () => { if (!demo || !cur) return; demo.paused = !demo.paused; cur.G.paused = demo.paused; drawDemo(); };
$('dmPrev').onclick = () => { if (demo && demo.i > 0) { demo.i--; drawDemo(); } };
$('dmNext').onclick = () => { if (demo && demo.i < demo.steps.length - 1) { demo.i++; drawDemo(); } };
$('dmPlay').onclick = () => { if (!demo) return; const g = demo.gid; leaveRoom(); startSolo(g, +$('soloN').value || undefined); };
$('hMin').onchange = () => { if (+$('hMin').value > +$('hMax').value) $('hMax').value = $('hMin').value; };
$('hMax').onchange = () => { if (+$('hMax').value < +$('hMin').value) $('hMin').value = $('hMax').value; };

// Info panel (round log + rules): beside the table on wide screens, a pop-over on small ones.
$('infoBtn').onclick = () => $('room').classList.add('showinfo');
$('infoClose').onclick = () => $('room').classList.remove('showinfo');
