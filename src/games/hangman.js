/* ---------- Hangman: players take turns guessing letters of one shared word ---------- */
(function () {
const ANTE = 20, MAX_WRONG = 6;
const ABC = 'abcdefghijklmnopqrstuvwxyz';
const FREQ = 'etaoinshrdlcumwfgypbvkjxqz';

function pattern(H) { return H.word.split('').map(ch => (H.guessed.includes(ch) ? ch : '')); }
function candidates(H) {
  const pat = pattern(H), wrong = H.guessed.filter(ch => !H.word.includes(ch));
  return WORDS.filter(w => w.length === H.word.length && !wrong.some(ch => w.includes(ch)) &&
    pat.every((ch, i) => (ch ? w[i] === ch : !H.guessed.includes(w[i]))));
}
function botGuess(H) {
  const cands = candidates(H);
  if (cands.length === 1 && Math.random() < 0.6) return { t: 'word', text: cands[0] };
  const score = {};
  for (const w of cands) for (const ch of new Set(w)) if (!H.guessed.includes(ch)) score[ch] = (score[ch] || 0) + 1;
  let order = Object.keys(score).sort((a, b) => score[b] - score[a]);
  if (!order.length) order = FREQ.split('').filter(ch => !H.guessed.includes(ch));
  return { t: 'letter', ch: order[Math.random() < 0.18 ? Math.min(order.length - 1, 1 + rnd(2)) : 0] };
}

async function round(G, io) {
  const P = G.players, n = P.length;
  const lv = G.level == null ? 1 : G.level, pool = WORDS.filter(w => lv === 0 ? w.length <= 6 : lv === 2 ? w.length >= 7 : true), word = pool[rnd(pool.length)];
  const H = G.h = { word, hint: lv === 0 ? 1 : 0, lv, guessed: [], wrong: 0, turn: (G.round - 1) % n, over: false, winner: -1, lost: false };
  io.render();
  await io.sleep(600);
  while (!H.over) {
    const i = H.turn, p = P[i];
    io.render();
    const auto = { t: 'letter', ch: FREQ.split('').find(ch => !H.guessed.includes(ch)) };
    const a = await io.turn(p, {}, {
      auto,
      validate: x => {
        if (x && x.t === 'hint' && H.hint < 2) return { t: 'hint' };
        if (x && x.t === 'letter' && typeof x.ch === 'string' && x.ch.length === 1 && ABC.includes(x.ch) && !H.guessed.includes(x.ch)) return { t: 'letter', ch: x.ch };
        if (x && x.t === 'word' && typeof x.text === 'string' && /^[a-z]{2,12}$/.test(x.text.toLowerCase())) return { t: 'word', text: x.text.toLowerCase() };
        return null;
      },
      bot: () => botGuess(H), think: 900 + Math.random() * 600,
    });
    let again = false;
    if (a.t === 'hint') {
      if (H.hint === 0) { H.hint = 1; io.ev(p, 'asks for a clue', 'ask for a clue'); }
      else { const hid = H.word.split('').filter(ch => !H.guessed.includes(ch)); const ch = hid[rnd(hid.length)]; H.guessed.push(ch); H.hint = 2; H.wrong++; io.ev(p, `buys a hint: letter “${ch.toUpperCase()}” (costs a wrong guess)`, `buy a hint: letter “${ch.toUpperCase()}” (costs a wrong guess)`); if (pattern(H).every(c => c)) { H.over = true; H.winner = i; } }
      again = true;
    } else if (a.t === 'letter') {
      H.guessed.push(a.ch);
      if (H.word.includes(a.ch)) {
        const k = H.word.split('').filter(ch => ch === a.ch).length;
        io.ev(p, `finds ${k === 1 ? 'one' : k} “${a.ch.toUpperCase()}”`, `find ${k === 1 ? 'one' : k} “${a.ch.toUpperCase()}”`);
        if (pattern(H).every(ch => ch)) { H.over = true; H.winner = i; }
        else again = true;                       // a good guess keeps the turn
      } else { H.wrong++; io.ev(p, `guesses “${a.ch.toUpperCase()}”. No luck`, `guess “${a.ch.toUpperCase()}”. No luck`); }
    } else if (a.text === H.word) {
      H.guessed = [...new Set([...H.guessed, ...H.word.split('')])]; H.over = true; H.winner = i;
      io.ev(p, 'guesses the whole word', 'guess the whole word');
    } else { H.wrong++; io.ev(p, `tries “${a.text.toUpperCase()}”. Wrong`, `try “${a.text.toUpperCase()}”. Wrong`); }
    if (!H.over && H.wrong >= MAX_WRONG) { H.over = true; H.lost = true; }
    if (!H.over && !again) H.turn = (H.turn + 1) % n;
    io.render();
    if (!H.over) await io.sleep(300);
  }
  settlePot(G, ANTE, H.winner >= 0 ? [H.winner] : []);
  potSummary(G);
  io.line(`The word was ${H.word.toUpperCase()}.`, true);
  io.render();
}

function view(G) {
  const H = G.h;
  if (!H) return { pat: [], clue: '', hint: 0, guessed: [], wrong: 0, max: MAX_WRONG, turn: -1, over: false, word: null, winner: -1, delta: [] };
  return { pat: pattern(H), clue: H.hint >= 1 ? (CLUES[H.word] || 'A word with ' + H.word.length + ' letters') : '', hint: H.hint, guessed: H.guessed, hits: H.guessed.filter(ch => H.word.includes(ch)), wrong: H.wrong, max: MAX_WRONG, turn: H.over ? -1 : H.turn,
    over: H.over, word: H.over ? H.word : null, winner: H.winner, delta: G.players.map(p => (H.over ? p.delta || 0 : 0)) };
}

/* ----- screen ----- */
let S0 = null, seqShown = 0;
const PARTS = [
  '<circle cx="110" cy="52" r="14" />', '<line x1="110" y1="66" x2="110" y2="112" />', '<line x1="110" y1="78" x2="92" y2="98" />',
  '<line x1="110" y1="78" x2="128" y2="98" />', '<line x1="110" y1="112" x2="94" y2="140" />', '<line x1="110" y1="112" x2="126" y2="140" />',
];
const gallows = wrong => `<svg viewBox="0 0 160 170" class="hm-svg" role="img" aria-label="${wrong} of ${MAX_WRONG} wrong guesses">
  <g class="hm-frame"><line x1="20" y1="160" x2="100" y2="160"/><line x1="40" y1="160" x2="40" y2="14"/><line x1="40" y1="14" x2="110" y2="14"/><line x1="110" y1="14" x2="110" y2="38"/></g>
  <g class="hm-man">${PARTS.slice(0, wrong).join('')}</g></svg>`;
const ui = {
  mount(stage, ctl, S) {
    seqShown = 0;
    stage.innerHTML = `<section class="table hm"><div class="hm-top"><div id="hmDraw"></div><div class="hm-word-wrap"><div class="hm-word" id="hmWord" aria-live="polite"></div><div class="hm-clue" id="hmClue"></div><div class="hint" id="hmCount"></div></div></div>
      <div class="bt-opps" id="hmSeats"></div><div class="banner" id="hmBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<div class="act" id="hmAct" hidden><div class="hm-keys" id="hmKeys"></div>
      <form class="pz-form" id="hmForm" autocomplete="off"><input id="hmInput" aria-label="Guess the whole word" placeholder="Or guess the whole word" maxlength="12">
      <button type="submit" class="b gold small">Guess</button><button type="button" class="ghost" id="hmHintBtn">Hint</button></form><p class="hint bt-hint" id="hmHint"></p></div>`;
    $('hmKeys').innerHTML = ABC.split('').map(ch => `<button type="button" class="hm-key" data-ch="${ch}">${ch.toUpperCase()}</button>`).join('');
    $('hmKeys').onclick = e => { const b = e.target.closest('[data-ch]'); if (b && !b.disabled) S0.send({ t: 'letter', ch: b.dataset.ch }); };
    $('hmHintBtn').onclick = () => S0.send({ t: 'hint' });
    $('hmForm').onsubmit = e => { e.preventDefault(); const v = $('hmInput').value.trim().toLowerCase(); if (v) { $('hmInput').value = ''; S0.send({ t: 'word', text: v }); } };
  },
  update(S) {
    S0 = S;
    const V = S.V, g = V.g;
    $('hmDraw').innerHTML = gallows(g.wrong);
    $('hmClue').textContent = g.clue ? 'Clue: ' + g.clue : '';
    $('hmHintBtn').disabled = g.hint >= 2; $('hmHintBtn').textContent = g.hint === 0 ? 'Show clue' : g.hint === 1 ? 'Reveal a letter (costs 1 miss)' : 'No more hints';
    const letters = g.over && g.word ? g.word.split('') : g.pat;
    $('hmWord').innerHTML = letters.map((ch, i) => `<span class="hm-l${g.over && !g.pat[i] ? ' miss' : ''}">${esc((ch || '').toUpperCase())}</span>`).join('');
    $('hmCount').textContent = `${g.max - g.wrong} wrong ${g.max - g.wrong === 1 ? 'guess' : 'guesses'} left`;
    $('hmSeats').innerHTML = V.seats.map((s, i) => {
      const d = (g.delta || [])[i] || 0;
      const tag = V.done ? (d > 0 ? `<div class="tag win">+${fmt(d)}</div>` : d < 0 ? `<div class="tag lose">${fmt(d)}</div>` : '<div class="tag dim">Even</div>')
        : g.turn === i ? '<div class="tag hot">Guessing…</div>' : '<div class="tag"></div>';
      return `<div class="seat${g.turn === i ? ' active' : ''}"><div class="plate"><span class="name"><span>${esc(S.nameOf(i))}</span></span>
        <span class="style">${esc(S.tag(i))}</span><span class="stack">${fmt(s.stack)}</span></div>${tag}</div>`;
    }).join('');
    $('hmBanner').innerHTML = g.over && V.summary.length ? `<span>${g.winner >= 0 ? S.text(V.summary.find(e => e.p === g.winner) || V.summary[0]) : 'Out of guesses. The word was ' + esc((g.word || '').toUpperCase())}</span>` : '';
    $('hmAct').hidden = !S.turn;
    document.querySelectorAll('#hmKeys .hm-key').forEach(b => {
      const ch = b.dataset.ch, used = g.guessed.includes(ch);
      b.disabled = used || !S.turn;
      b.className = 'hm-key' + (used ? (g.hits.includes(ch) ? ' hit' : ' bad') : '');
    });
    if (!S.turn) return '';
    if (seqShown !== S.turn.seq) { seqShown = S.turn.seq; }
    $('hmHint').textContent = 'Tap a letter. A right letter lets you guess again. Stuck? Use the hint button.';
    return '';
  },
};

Club.register({
  id: 'hangman', cat: 'word', name: 'Hangman', tag: 'Guess the hidden word, one letter at a time.', min: 1, max: 6, soloBots: 2, roundWord: 'Round', levels: true,
  art: () => ['H', '_', 'N'].map(l => `<div class="ltile">${l}</div>`).join(''),
  rules: `<p><b>Goal:</b> be the player who finishes the hidden word. All players share one word and one set of ${MAX_WRONG} wrong guesses.</p>
    <ol><li>The word appears as blank spaces. Each wrong guess adds a part to the drawing.</li>
    <li>On your turn, tap a letter. If it is in the word, it fills in and <b>you guess again</b>. If not, the turn passes on.</li>
    <li>Press <b>Hint</b> for a clue about the word. Press it again to reveal one letter, which costs you a wrong guess. Easy level shows the clue from the start; hard level uses longer words.</li>
    <li>You can also type the whole word. A wrong whole-word guess counts as a wrong guess.</li>
    <li>Whoever completes the word wins the pot (everyone put in ${ANTE} chips). If the drawing is finished first, everyone gets their chips back.</li></ol>`,
  round, view, ui,
  _test: { candidates, botGuess },
});
})();
