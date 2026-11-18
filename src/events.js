/* ---------- Events: run a game night or tournament in person ----------
   Keep a live leaderboard across many games, show it on a big screen, and share a QR code
   so everyone can open Game Hub on their own phone. Saved on this device only. */
(function () {
const KEY = 'gamehub.events.v1';
const load = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.events)) return d; } catch {} return { events: [], cur: null }; };
let D = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch {} };
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ev = () => D.events.find(e => e.id === D.cur) || null;
const PTS = [5, 3, 2];
const ptsFor = (i) => (i < PTS.length ? PTS[i] : 1);
let order = [], tab = 'board';

function standings(e) {
  const t = new Map(e.players.map(p => [p.id, { p, pts: 0, wins: 0, played: 0 }]));
  e.rounds.forEach(r => {
    r.order.forEach((id, i) => { const s = t.get(id); if (s) { s.pts += ptsFor(i); s.played++; if (i === 0) s.wins++; } });
    e.players.forEach(p => { if (!r.order.includes(p.id)) { const s = t.get(p.id); s.pts += 0; } });
  });
  return [...t.values()].sort((a, b) => b.pts - a.pts || b.wins - a.wins || a.p.name.localeCompare(b.p.name));
}
const gname = id => (Club.games[id] && Club.games[id].name) || id;
const siteUrl = () => location.href.split('#')[0];

function resultsText(e) {
  const s = standings(e);
  return `${e.name}\n` + s.map((x, i) => `${i + 1}. ${x.p.name}: ${x.pts} pts (${x.wins} win${x.wins === 1 ? '' : 's'})`).join('\n') + `\n\nPlay at ${siteUrl()}`;
}

function qr(el, text, size) {
  el.innerHTML = '';
  const make = () => { try { new QRCode(el, { text, width: size, height: size, correctLevel: QRCode.CorrectLevel.M }); } catch { el.textContent = text; } };
  if (window.QRCode) return make();
  const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  s.onload = make; s.onerror = () => { el.textContent = text; }; document.head.appendChild(s);
}

function render() {
  const box = document.getElementById('evBody'); if (!box) return;
  const e = ev();
  if (!e) {
    box.innerHTML = `<p class="gd-text">Run a game night or tournament with friends, family or a club. Keep one leaderboard across many games, show it on a big screen, and share a QR code so everyone can open Game Hub on their own phone.</p>
      <form id="evNew" class="evrow" autocomplete="off"><div class="field"><label for="evName">Event name</label><input id="evName" maxlength="40" placeholder="Friday game night"></div><button class="b gold small" type="submit">Create event</button></form>
      ${D.events.length ? '<h3 class="evh">Your events</h3>' + D.events.map(x => `<div class="trow"><div class="tinfo"><b>${esc(x.name)}</b><span>${x.players.length} players · ${x.rounds.length} rounds</span></div><div class="tbtns"><button type="button" class="b small gold" data-open="${x.id}">Open</button></div></div>`).join('') : ''}`;
    box.querySelector('#evNew').onsubmit = a => { a.preventDefault(); const n = box.querySelector('#evName').value.trim() || 'Game night'; const x = { id: uid(), name: n.slice(0, 40), players: [], rounds: [] }; D.events.unshift(x); D.cur = x.id; save(); order = []; tab = 'board'; render(); };
    box.querySelectorAll('[data-open]').forEach(b => { b.onclick = () => { D.cur = b.dataset.open; save(); order = []; render(); }; });
    return;
  }
  const st = standings(e), me = e.players;
  const games = Club.order.filter(id => Club.games[id]).map(id => [id, gname(id)]).sort((a, b) => a[1].localeCompare(b[1]));
  box.innerHTML = `
    <div class="evtop"><div><h3 class="evh" style="margin:0">${esc(e.name)}</h3><span class="hint">${e.players.length} players · ${e.rounds.length} rounds</span></div>
      <div class="rb-btns"><button type="button" class="b gold small" id="evBig">Big screen</button><button type="button" class="ghost" id="evShare">QR / share</button><button type="button" class="ghost" id="evBack">All events</button></div></div>
    <div id="evShareBox" class="evshare" hidden><div id="evQr"></div><div><p class="gd-text">Scan to open Game Hub on a phone.</p><input id="evUrl" readonly value="${esc(siteUrl())}"><div class="rb-btns" style="margin-top:8px"><button type="button" class="ghost" id="evCopyUrl">Copy link</button><button type="button" class="ghost" id="evCopyRes">Copy results</button></div></div></div>
    <h3 class="evh">Players</h3>
    <form id="evAdd" class="evrow" autocomplete="off"><div class="field"><label for="evPn" class="sr">Player name</label><input id="evPn" maxlength="20" placeholder="Add a player"></div><button class="b small gold" type="submit">Add</button></form>
    <div class="chips-pick">${me.length ? me.map(p => `<span class="frchip"><span class="cp on" style="cursor:default">${esc(p.name)}</span><button type="button" class="frx" data-rm="${p.id}" aria-label="Remove ${esc(p.name)}">&times;</button></span>`).join('') : '<p class="empty">Add the people who are playing tonight.</p>'}</div>
    <h3 class="evh">Leaderboard</h3>
    ${st.length ? `<div class="evtable">${st.map((x, i) => `<div class="evr${i === 0 && x.pts > 0 ? ' lead' : ''}"><span class="evn">${i + 1}</span><b>${esc(x.p.name)}</b><span>${x.wins} win${x.wins === 1 ? '' : 's'}</span><em>${x.pts}</em></div>`).join('')}</div>` : '<p class="empty">No players yet.</p>'}
    <h3 class="evh">Record a round</h3>
    <div class="evrow"><div class="field"><label for="evGame">Game played</label><select id="evGame">${games.map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join('')}</select></div><button type="button" class="ghost" id="evPlay">Open this game</button></div>
    <p class="hint">Tap players in the order they finished, first place first. 1st gets 5 points, 2nd 3, 3rd 2, everyone else who played 1. Tap a name again to undo it.</p>
    <div class="chips-pick" id="evOrder">${me.map(p => { const k = order.indexOf(p.id); return `<button type="button" class="cp${k >= 0 ? ' on' : ''}" data-pk="${p.id}" aria-pressed="${k >= 0}">${k >= 0 ? (k + 1) + '. ' : ''}${esc(p.name)}</button>`; }).join('')}</div>
    <div class="goRow"><button type="button" class="b gold" id="evSave" ${order.length < 1 ? 'disabled' : ''}>Save round</button></div>
    ${e.rounds.length ? '<h3 class="evh">Rounds so far</h3>' + e.rounds.slice().reverse().map(r => `<div class="trow"><div class="tinfo"><b>${esc(gname(r.game))}</b><span>${r.order.map((id, i) => (i + 1) + '. ' + esc((me.find(p => p.id === id) || { name: '?' }).name)).join(' · ')}</span></div><div class="tbtns"><button type="button" class="ghost" data-dr="${r.id}">Delete</button></div></div>`).join('') : ''}
    <div class="goRow" style="margin-top:14px"><button type="button" class="ghost" id="evDel">Delete this event</button></div>`;
  const $ = s => box.querySelector(s);
  $('#evBack').onclick = () => { D.cur = null; save(); render(); };
  $('#evAdd').onsubmit = a => { a.preventDefault(); const n = $('#evPn').value.trim().slice(0, 20); if (!n) return; if (!e.players.some(p => p.name.toLowerCase() === n.toLowerCase())) e.players.push({ id: uid(), name: n }); save(); render(); document.getElementById('evPn').focus(); };
  box.querySelectorAll('[data-rm]').forEach(b => { b.onclick = () => { e.players = e.players.filter(p => p.id !== b.dataset.rm); e.rounds.forEach(r => { r.order = r.order.filter(id => id !== b.dataset.rm); }); order = order.filter(id => id !== b.dataset.rm); save(); render(); }; });
  box.querySelectorAll('[data-pk]').forEach(b => { b.onclick = () => { const id = b.dataset.pk, k = order.indexOf(id); if (k >= 0) order.splice(k, 1); else order.push(id); render(); }; });
  $('#evSave').onclick = () => { if (!order.length) return; e.rounds.push({ id: uid(), game: $('#evGame').value, order: order.slice() }); order = []; save(); render(); };
  box.querySelectorAll('[data-dr]').forEach(b => { b.onclick = () => { e.rounds = e.rounds.filter(r => r.id !== b.dataset.dr); save(); render(); }; });
  $('#evDel').onclick = () => { if (!confirm('Delete this event and its results? This cannot be undone.')) return; D.events = D.events.filter(x => x.id !== e.id); D.cur = null; save(); render(); };
  $('#evPlay').onclick = () => { const g = $('#evGame').value; close(); if (typeof cur !== 'undefined' && cur) { try { leaveRoom(); } catch {} } selectGame(g); };
  $('#evBig').onclick = big;
  $('#evShare').onclick = () => { const sb = $('#evShareBox'); sb.hidden = !sb.hidden; if (!sb.hidden) qr($('#evQr'), siteUrl(), 132); };
  $('#evCopyUrl').onclick = () => copy($('#evUrl').value, $('#evCopyUrl'));
  $('#evCopyRes').onclick = () => copy(resultsText(e), $('#evCopyRes'));
}
async function copy(t, btn) { const o = btn.textContent; try { await navigator.clipboard.writeText(t); btn.textContent = 'Copied'; } catch { btn.textContent = 'Copy failed'; } setTimeout(() => { btn.textContent = o; }, 1500); }

function big() {
  const e = ev(); if (!e) return;
  const b = document.getElementById('evBigScr'); b.hidden = false;
  const draw = () => { const st = standings(e); b.innerHTML = `<div class="evbig-in"><h2>${esc(e.name)}</h2><div class="evbig-main"><div class="evbig-list">${st.slice(0, 12).map((x, i) => `<div class="evbr${i === 0 && x.pts > 0 ? ' lead' : ''}"><span>${i + 1}</span><b>${esc(x.p.name)}</b><em>${x.pts}</em></div>`).join('') || '<p>Add players to start.</p>'}</div><div class="evbig-qr"><div id="evBigQr"></div><p>Scan to play</p><small>${esc(siteUrl())}</small></div></div><p class="evbig-x">Press Esc or tap anywhere to close</p></div>`; qr(document.getElementById('evBigQr'), siteUrl(), 180); };
  draw();
  try { b.requestFullscreen && b.requestFullscreen(); } catch {}
  b.onclick = () => closeBig();
}
function closeBig() { const b = document.getElementById('evBigScr'); b.hidden = true; try { if (document.fullscreenElement) document.exitFullscreen(); } catch {} }
function open() { document.getElementById('evDlg').hidden = false; render(); }
function close() { document.getElementById('evDlg').hidden = true; }
document.getElementById('evBtn').onclick = open;
document.getElementById('evClose').onclick = close;
document.getElementById('evDlg').onclick = e => { if (e.target.id === 'evDlg') close(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!document.getElementById('evBigScr').hidden) closeBig(); else if (!document.getElementById('evDlg').hidden) close(); } });
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.getElementById('evBigScr').hidden = true; });
})();
