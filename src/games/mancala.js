/* ---------- Mancala (Kalah) ---------- */
(function () {
const ANTE = 20;
// pits: seat s owns indices s*7 .. s*7+5, store at s*7+6
const store = s => s * 7 + 6;
function sow(b, s, p) {        // returns { again, extra }
  let seeds = b[s * 7 + p]; b[s * 7 + p] = 0; let i = s * 7 + p;
  const skip = store(1 - s);
  while (seeds > 0) { i = (i + 1) % 14; if (i === skip) continue; b[i]++; seeds--; }
  if (i === store(s)) return { again: true, cap: 0 };
  let cap = 0;
  if (i >= s * 7 && i <= s * 7 + 5 && b[i] === 1) {
    const opp = (1 - s) * 7 + (5 - (i - s * 7));
    if (b[opp] > 0) { cap = b[opp] + 1; b[store(s)] += cap; b[opp] = 0; b[i] = 0; }
  }
  return { again: false, cap };
}
const legal = (b, s) => [0, 1, 2, 3, 4, 5].filter(p => b[s * 7 + p] > 0);
function finish(b) {
  for (const s of [0, 1]) if (legal(b, s).length === 0) { for (const t of [0, 1]) { for (let p = 0; p < 6; p++) { b[store(t)] += b[t * 7 + p]; b[t * 7 + p] = 0; } } return true; }
  return false;
}
function search(b, s, me, d) {
  if (d === 0 || (legal(b, 0).length === 0 || legal(b, 1).length === 0)) { const c = b.slice(); finish(c); return c[store(me)] - c[store(1 - me)]; }
  let best = s === me ? -1e9 : 1e9;
  for (const p of legal(b, s)) { const nb = b.slice(), r = sow(nb, s, p); const v = search(nb, r.again ? s : 1 - s, me, d - 1); best = s === me ? Math.max(best, v) : Math.min(best, v); }
  return best;
}
function botMove(b, s, lv = 1) {
  const mv = legal(b, s); if (Math.random() < [0.4, 0.1, 0][lv]) return mv[rnd(mv.length)];
  let best = mv[0], bs = -1e9;
  for (const p of mv) { const nb = b.slice(), r = sow(nb, s, p); const v = search(nb, r.again ? s : 1 - s, s, [2, 5, 7][lv]) + Math.random() * 0.8; if (v > bs) { bs = v; best = p; } }
  return best;
}
async function round(G, io) {
  const P = G.players, b = Array(14).fill(4); b[6] = 0; b[13] = 0;
  const M = G.mc = { b, turn: (G.round - 1) % 2, over: false, winner: -1, last: -1 };
  io.render(); await io.sleep(400);
  while (!M.over) {
    const s = M.turn; io.render();
    const mv = legal(M.b, s);
    const a = await io.turn(P[s], {}, { auto: { t: 'sow', p: mv[0] },
      validate: x => (x && x.t === 'sow' && Number.isInteger(x.p) && mv.includes(x.p) ? { t: 'sow', p: x.p } : null),
      bot: () => ({ t: 'sow', p: botMove(M.b.slice(), s, G.level) }), think: 1300 + Math.random() * 600 });
    M.sown = M.b[s * 7 + a.p]; const r = sow(M.b, s, a.p); M.last = s * 7 + a.p;
    io.ev(P[s], r.again ? 'lands in their store and goes again' : r.cap ? `captures ${r.cap}` : 'sows seeds', r.again ? 'land in your store and go again' : r.cap ? `capture ${r.cap}` : 'sow seeds');
    if (finish(M.b)) M.over = true; else M.turn = r.again ? s : 1 - s;
    io.render(); await io.sleep(Math.min(6500, 700 + 540 * (M.sown || 0)));
  }
  const a = M.b[6], c = M.b[13]; M.winner = a === c ? -1 : a > c ? 0 : 1;
  settlePot(G, ANTE, M.winner >= 0 ? [M.winner] : []); potSummary(G);
  io.line(`Final stores: ${a} to ${c}.`, true); io.render();
}
function view(G) {
  const M = G.mc;
  if (!M) return { b: [4,4,4,4,4,4,0,4,4,4,4,4,4,0], turn: -1, over: false, winner: -1, last: -1, delta: [] };
  return { b: M.b, turn: M.over ? -1 : M.turn, over: M.over, winner: M.winner, last: M.last, delta: G.players.map(p => (M.over ? p.delta || 0 : 0)) };
}
let S0 = null;
// real pebbles: glossy stones scattered in each pit (deterministic, so they do not jump about between redraws)
const STONE = ['#f3ead8', '#c9c2b4', '#8fb8a8', '#d9b38c', '#a8a29a', '#e8d2a6', '#7f9bb0'];
function stones(n, seed, wide) {
  const d = Math.max(10, Math.min(30, 72 / Math.sqrt(n + 1))), out = [];
  for (let k = 0; k < n; k++) {
    const a = k * 2.399963 + seed * 1.7, r = Math.sqrt((k + 0.5) / n) * (wide ? 40 : 34), x = 50 + Math.cos(a) * r * (wide ? 0.62 : 1), y = 50 + Math.sin(a) * r * (wide ? 1.15 : 1);
    const c = STONE[(seed * 3 + k * 5) % STONE.length], rot = (k * 47 + seed * 31) % 180;
    out.push(`<i class="stone" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${d}%;height:${(d * (wide ? 0.62 : 0.82)).toFixed(1)}%;--sc:${c};transform:translate(-50%,-50%) rotate(${rot}deg)"></i>`);
  }
  return out.join('');
}
let prevB = null, animating = false, animTok = 0;
function draw(bd) {
  const S = S0, g = S.V.g, b = bd || g.b, me = S.me === 1 ? 1 : 0, opp = 1 - me, can = S.turn && !animating ? legal(b, me) : [];
  // mirrored layout: my store on the LEFT, my pits run right to left, so seeds travel right to left along my row
  const top = [0, 1, 2, 3, 4, 5].map(p => `<div class="mc-p opp" data-i="${opp * 7 + p}">${stones(b[opp * 7 + p], opp * 7 + p)}<b>${b[opp * 7 + p]}</b></div>`).join('');
  const bot = [5, 4, 3, 2, 1, 0].map(p => `<button type="button" class="mc-p${can.includes(p) ? ' ok' : ''}${!bd && g.last === me * 7 + p ? ' last' : ''}" data-i="${me * 7 + p}" data-p="${p}" ${can.includes(p) ? '' : 'disabled'} aria-label="Your pit ${p + 1}, ${b[me * 7 + p]} seeds">${stones(b[me * 7 + p], me * 7 + p)}<b>${b[me * 7 + p]}</b></button>`).join('');
  $('mc').innerHTML = `<div class="mc-s me" data-i="${store(me)}" aria-label="Your store">${stones(b[store(me)], store(me), true)}<b>${b[store(me)]}</b></div><div class="mc-rows"><div class="mc-r">${top}</div><div class="mc-r">${bot}</div></div><div class="mc-s opp" data-i="${store(opp)}" aria-label="Opponent store">${stones(b[store(opp)], store(opp), true)}<b>${b[store(opp)]}</b></div>`;
}
function flyStone(from, to, ms) {
  const m = $('mc'), a = m.querySelector(`[data-i="${from}"]`), z = m.querySelector(`[data-i="${to}"]`); if (!a || !z) return;
  const mr = m.getBoundingClientRect(), ar = a.getBoundingClientRect(), zr = z.getBoundingClientRect();
  const el = document.createElement('i'); el.className = 'stone fly';
  const sz = Math.max(12, Math.min(26, ar.width * 0.3));
  el.style.cssText = `left:${ar.left - mr.left + ar.width / 2}px;top:${ar.top - mr.top + ar.height / 2}px;width:${sz}px;height:${sz * 0.82}px;--sc:${STONE[(from * 3 + to) % STONE.length]}`;
  m.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transitionDuration = ms + 'ms'; el.style.left = zr.left - mr.left + zr.width / 2 + 'px'; el.style.top = zr.top - mr.top + zr.height / 2 + 'px'; }));
  setTimeout(() => el.remove(), ms + 60);
}
async function animateSow(pb, last, tok) {
  const s = (last / 7) | 0, skip = store(1 - s), b = pb.slice();
  let seeds = b[last]; b[last] = 0; let i = last;
  animating = true; draw(b); Snd.p('pop');
  await delay(500);
  while (seeds > 0 && tok === animTok) {
    const from = i; i = (i + 1) % 14; if (i === skip) continue;
    flyStone(from, i, 380); await delay(390);
    if (tok !== animTok) return;
    b[i]++; seeds--; draw(b); Snd.p('pebble');
    await delay(130);
  }
  animating = false;
}
const ui = {
  mount(stage) {
    prevB = null; animating = false; animTok++;
    stage.innerHTML = `<section class="table c4wrap"><div class="bt-opps" id="mcSeats"></div><div class="mc" id="mc"></div><div class="banner" id="mcBanner" aria-live="polite"></div><p class="hint bt-hint" id="mcHint"></p></section>`;
    $('mc').onclick = e => { const b = e.target.closest('[data-p]'); if (b && S0.turn && !animating) S0.send({ t: 'sow', p: +b.dataset.p }); };
  },
  update(S) {
    const V = S.V, g = V.g; S0 = S;
    const moved = prevB && g.last >= 0 && prevB.some((v, k) => v !== g.b[k]) && prevB[g.last] > 0;
    const pb = prevB; prevB = g.b.slice();
    $('mcSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, dot: true, doing: 'Sowing…', extra: i => `Store ${g.b[store(i)]}` });
    if (moved && !animating) {
      const tok = ++animTok, fin = g.b.slice();
      animateSow(pb, g.last, tok).then(() => { if (tok === animTok && S0) { animating = false; draw(); } });
    } else if (!animating) draw();
    $('mcBanner').innerHTML = g.over && V.summary.length ? `<span>${g.winner >= 0 ? S.text(V.summary.find(e => e.p === g.winner) || V.summary[0]) : 'A draw. Everyone keeps their chips.'}</span>` : '';
    $('mcHint').textContent = S.turn ? 'Your turn. Tap one of your pits (bottom row).' : '';
    return '';
  },
};
Club.register({
  id: 'mancala', cat: 'board', name: 'Mancala', tag: 'Sow seeds around the board and capture your opponent’s.', min: 2, max: 2, soloBots: 1, roundWord: 'Game', levels: true,
  art: () => ['4', '4', '4'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> collect more seeds in your store (the big pit on your left) than your opponent.</p>
    <ol><li>Each player has six pits, shown on their side, with four seeds in each. Yours are the bottom row.</li>
    <li>On your turn, tap one of your pits. Its seeds are picked up and dropped one by one into the next pits, going to the left along your row, into your store (on your left), then along your opponent’s row. You skip your opponent’s store.</li>
    <li>If your last seed lands in <b>your store</b>, you take another turn.</li>
    <li>If your last seed lands in an <b>empty pit on your side</b> and the pit opposite has seeds, you capture them and your last seed into your store.</li>
    <li>When one side has no seeds left, the other player puts their remaining seeds in their store. Most seeds wins.</li>
    <li>Each player puts in ${ANTE} chips and the winner takes both stakes. A draw returns the chips.</li></ol>`,
  round, view, ui, _test: { sow, legal, botMove, finish },
});
})();
