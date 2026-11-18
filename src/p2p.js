/* ---------- p2p: rooms for the public site (no account, no server of ours) ----------
   The host's browser is the table's database. Friends open the shared link and connect
   straight to the host through a free public broker (PeerJS). Same API shape as the
   claude.ai shared database so the rest of the code is unchanged. */
const P2P = (() => {
  const PREFIX = 'gamehub-room-';
  const docs = new Map();              // path -> data (host only)
  const subs = new Map();              // sid -> { p, col, cb, err }
  const peers = new Map();             // sid -> { conn, p, col }  (host side: guest subscriptions)
  let sidN = 0, peer = null, hostReady = null, remote = null, myUid = 'local';
  const parent = p => p.slice(0, p.lastIndexOf('/'));
  const colList = p => [...docs.keys()].filter(k => k.startsWith(p + '/') && k.indexOf('/', p.length + 1) < 0).map(k => ({ id: k.slice(p.length + 1), d: docs.get(k) }));
  const docSnap = (d) => ({ exists: d !== undefined, data: () => d });
  const colSnap = (list) => ({ docs: list.map(x => ({ id: x.id, data: () => x.d })) });

  function loadLib() {
    if (window.Peer) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = () => res(); s.onerror = () => rej(new Error('lib'));
      document.head.appendChild(s);
    });
  }

  /* ----- host side ----- */
  function pushTo(p) {
    for (const [sid, s] of subs) if (!remote && s.local !== false) fire(sid, s, p);
    for (const [sid, g] of peers) {
      if (g.col ? parent(p) === g.p : p === g.p) {
        try { g.conn.send(g.col ? { t: 'snap', sid, docs: colList(g.p) } : { t: 'snap', sid, exists: docs.has(g.p), d: docs.get(g.p) }); } catch {}
      }
    }
  }
  function fire(sid, s, p) {
    if (s.col ? parent(p) === s.p : p === s.p) {
      try { s.cb(s.col ? colSnap(colList(s.p)) : docSnap(docs.get(s.p))); } catch (e) { console.error(e); }
    }
  }
  function put(p, d) { docs.set(p, d); pushTo(p); }
  function del(p) { if (docs.delete(p)) pushTo(p); else pushTo(p); }
  const okGuest = (p, uid) => p === 'tables' || /^tables\/[^/]+$/.test(p) || new RegExp('^tables/[^/]+/(hands|join|act)/' + uid.replace(/[^A-Za-z0-9_-]/g, '') + '$').test(p);

  function serve(conn) {
    const uid = String((conn.metadata && conn.metadata.uid) || '');
    conn.on('data', m => {
      if (!m || typeof m !== 'object') return;
      if (m.t === 'sub' && typeof m.p === 'string' && okGuest(m.p, uid)) {
        peers.set(m.sid, { conn, p: m.p, col: !!m.col });
        conn.send(m.col ? { t: 'snap', sid: m.sid, docs: colList(m.p) } : { t: 'snap', sid: m.sid, exists: docs.has(m.p), d: docs.get(m.p) });
      } else if (m.t === 'unsub') peers.delete(m.sid);
      else if ((m.t === 'set' || m.t === 'del') && typeof m.p === 'string' && /^tables\/[^/]+\/(join|act)\/[^/]+$/.test(m.p) && m.p.endsWith('/' + uid)) {
        if (m.t === 'set') put(m.p, m.d); else del(m.p);
      }
    });
    conn.on('close', () => {
      for (const [sid, g] of peers) if (g.conn === conn) peers.delete(sid);
      for (const k of [...docs.keys()]) if (/^tables\/[^/]+\/join\/[^/]+$/.test(k) && k.endsWith('/' + uid)) del(k);
    });
  }
  function host(code) {
    if (hostReady) return hostReady;
    hostReady = loadLib().then(() => new Promise((res, rej) => {
      const pr = new Peer(PREFIX + code.toLowerCase());
      const to = setTimeout(() => { rej(new Error('timeout')); }, 12000);
      pr.on('open', () => { clearTimeout(to); peer = pr; res(); });
      pr.on('error', e => { clearTimeout(to); rej(e); });
      pr.on('connection', serve);
      pr.on('disconnected', () => { try { pr.reconnect(); } catch {} });
    })).catch(e => { hostReady = null; throw e; });
    return hostReady;
  }
  function stopHost() {
    try { if (peer) peer.destroy(); } catch {}
    peer = null; hostReady = null; docs.clear(); peers.clear();
  }

  /* ----- guest side ----- */
  function connect(code) {
    if (remote) return Promise.resolve();
    return loadLib().then(() => new Promise((res, rej) => {
      const pr = new Peer();
      const to = setTimeout(() => { try { pr.destroy(); } catch {} rej(new Error('timeout')); }, 12000);
      pr.on('error', e => { clearTimeout(to); rej(e); });
      pr.on('open', () => {
        const conn = pr.connect(PREFIX + code.toLowerCase(), { reliable: true, metadata: { uid: myUid } });
        conn.on('open', () => {
          clearTimeout(to);
          remote = { pr, conn };
          for (const [sid, s] of subs) conn.send({ t: 'sub', sid, p: s.p, col: s.col });
          res();
        });
        conn.on('data', m => {
          if (!m || m.t !== 'snap') return;
          const s = subs.get(m.sid); if (!s) return;
          try { s.cb(m.docs ? colSnap(m.docs) : docSnap(m.exists ? m.d : undefined)); } catch (e) { console.error(e); }
        });
        conn.on('close', () => {
          remote = null; try { pr.destroy(); } catch {}
          for (const s of subs.values()) { try { s.err && s.err(new Error('closed')); } catch {} }
        });
      });
    }));
  }
  function disconnect() { if (remote) { const r = remote; remote = null; try { r.conn.close(); r.pr.destroy(); } catch {} } }

  /* ----- the DB-shaped API ----- */
  function sub(p, col, cb, err) {
    const sid = 's' + (++sidN);
    subs.set(sid, { p, col, cb, err });
    if (remote) remote.conn.send({ t: 'sub', sid, p, col });
    else cb(col ? colSnap(colList(p)) : docSnap(docs.get(p)));
    return () => { subs.delete(sid); if (remote) try { remote.conn.send({ t: 'unsub', sid }); } catch {} };
  }
  const db = {
    collection: p => ({ onSnapshot: (cb, err) => sub(p, true, cb, err) }),
    doc: p => ({
      onSnapshot: (cb, err) => sub(p, false, cb, err),
      get: async () => docSnap(docs.get(p)),
      async set(d) {
        d = JSON.parse(JSON.stringify(d));
        if (remote) { remote.conn.send({ t: 'set', p, d }); return; }
        const m = /^tables\/([^/]+)$/.exec(p);
        if (m && !peer) await host(String(m[1]).slice(1, 6));
        put(p, d);
      },
      async update(d) { if (remote) return; put(p, Object.assign({}, docs.get(p) || {}, JSON.parse(JSON.stringify(d)))); },
      async delete() { if (remote) { remote.conn.send({ t: 'del', p }); return; } del(p); if (/^tables\/[^/]+$/.test(p)) setTimeout(stopHost, 800); },
    }),
  };
  return { db, connect, disconnect, setUid: u => { myUid = u; } };
})();
