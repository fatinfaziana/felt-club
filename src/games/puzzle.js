/* ---------- Word Scramble, Make 24 and Quick Sums: one puzzle, everyone takes a turn at it ---------- */
(function () {
const ANTE = 20;

// A tiny calculator: numbers, + - * / and brackets. No eval.
function parseExpr(text) {
  const s = String(text).replace(/[×xX]/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
  if (!s || /[^0-9+\-*/()]/.test(s)) return null;
  let i = 0; const nums = [];
  const peek = () => s[i];
  const num = () => { const j = i; while (i < s.length && s[i] >= '0' && s[i] <= '9') i++; if (j === i) throw 0; const v = +s.slice(j, i); nums.push(v); return v; };
  const factor = () => { if (peek() === '(') { i++; const v = expr(); if (peek() !== ')') throw 0; i++; return v; } return num(); };
  const term = () => { let v = factor(); while (peek() === '*' || peek() === '/') { const o = s[i++], r = factor(); v = o === '*' ? v * r : v / r; } return v; };
  const expr = () => { let v = term(); while (peek() === '+' || peek() === '-') { const o = s[i++], r = term(); v = o === '+' ? v + r : v - r; } return v; };
  try { const v = expr(); return i === s.length && isFinite(v) ? { value: v, nums } : null; } catch { return null; }
}
function solve24(nums) {
  const rec = items => {
    if (items.length === 1) return Math.abs(items[0].v - 24) < 1e-6 ? items[0].s : null;
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j], rest = items.filter((_, k) => k !== i && k !== j);
      const c = [[a.v + b.v, `(${a.s}+${b.s})`], [a.v * b.v, `(${a.s}*${b.s})`], [a.v - b.v, `(${a.s}-${b.s})`], [b.v - a.v, `(${b.s}-${a.s})`]];
      if (b.v !== 0) c.push([a.v / b.v, `(${a.s}/${b.s})`]);
      if (a.v !== 0) c.push([b.v / a.v, `(${b.s}/${a.s})`]);
      for (const [v, s] of c) { const r = rec([...rest, { v, s }]); if (r) return r; }
    }
    return null;
  };
  return rec(nums.map(n => ({ v: n, s: String(n) })));
}

const GAMES = {
  scramble: {
    name: 'Word Scramble', cat: 'word', tag: 'Unscramble the letters before anyone else does.', botSkill: 0.8,
    placeholder: 'Type the word', keys: [], numeric: false,
    art: () => ['T', 'A', 'C'].map(l => `<div class="ltile">${l}</div>`).join(''),
    rules: `<p><b>Goal:</b> unscramble the letters to make a real word. Everyone gets the same word, one turn each.</p>
      <ol><li>The scrambled letters appear on the table.</li><li>When it is your turn, type the word and press <b>Submit</b>. You get two tries.</li><li>Stuck? Press <b>Skip</b>.</li><li>Everyone puts in ${ANTE} chips. People who solve it split the pot. If nobody solves it, everyone gets their chips back.</li></ol>`,
    make() {
      const word = WORDS[rnd(WORDS.length)]; let letters;
      do { letters = shuffle(word.split('')); } while (letters.join('') === word);
      return { pub: { label: 'Unscramble this word', tiles: letters.map(l => l.toUpperCase()), note: `${word.length} letters` }, word };
    },
    check: (z, text) => String(text).trim().toLowerCase() === z.word,
    solve: z => z.word, reveal: z => z.word.toUpperCase(),
  },
  make24: {
    name: 'Make 24', cat: 'math', tag: 'Use four numbers and + − × ÷ to reach exactly 24.', botSkill: 0.85,
    placeholder: 'For example (8-2)*(1+3)', keys: ['+', '−', '×', '÷', '(', ')'], numeric: false,
    art: () => ['3', '8', '24'].map(l => `<div class="ltile num">${l}</div>`).join(''),
    rules: `<p><b>Goal:</b> make exactly 24 from the four numbers shown. Everyone gets the same numbers, one turn each.</p>
      <ol><li>Four numbers appear on the table.</li><li>On your turn, type a sum that uses <b>each number exactly once</b>, with + − × ÷ and brackets. Example: with 3, 3, 8, 8 you can type 8/(3-8/3).</li><li>Press <b>Submit</b>. You get two tries. Stuck? Press <b>Skip</b>.</li><li>Everyone puts in ${ANTE} chips. People who solve it split the pot. If nobody solves it, everyone gets their chips back.</li></ol>`,
    make() {
      let nums, sol;
      do { nums = [0, 0, 0, 0].map(() => 1 + rnd(9)); sol = solve24(nums); } while (!sol);
      return { pub: { label: 'Make 24 using all four numbers', tiles: nums.map(String), note: 'Use each number once. + − × ÷ and brackets.' }, nums, sol };
    },
    check(z, text) {
      const p = parseExpr(text);
      return !!p && Math.abs(p.value - 24) < 1e-6 && [...p.nums].sort((a, b) => a - b).join() === [...z.nums].sort((a, b) => a - b).join();
    },
    solve: z => z.sol, reveal: z => z.sol.replace(/\*/g, '×').replace(/\//g, '÷'),
  },
  pattern: {
    name: 'Number Pattern', cat: 'math', tag: 'Spot the rule and find the next number.', botSkill: 0.8,
    placeholder: 'Type the next number', keys: [], numeric: true,
    art: () => ['2', '4', '?'].map(l => `<div class="ltile num">${l}</div>`).join(''),
    rules: `<p><b>Goal:</b> work out the rule behind a row of numbers and give the next one. Everyone gets the same row, one turn each.</p>
      <ol><li>A row of numbers appears with the last one missing.</li><li>Look for the rule: adding, multiplying, squares, or two rules taking turns.</li><li>On your turn, type the next number and press <b>Submit</b>. You get two tries. Stuck? Press <b>Skip</b>.</li><li>Everyone puts in ${ANTE} chips. People who get it right split the pot. If nobody does, everyone gets their chips back.</li></ol>`,
    make() {
      const k = rnd(6), a = 1 + rnd(9), d = 2 + rnd(7); let seq;
      if (k === 0) seq = Array.from({ length: 6 }, (_, i) => a + d * i);
      else if (k === 1) seq = Array.from({ length: 6 }, (_, i) => a * Math.pow(2, i));
      else if (k === 2) seq = Array.from({ length: 6 }, (_, i) => (i + a) * (i + a));
      else if (k === 3) { seq = [a, d]; while (seq.length < 6) seq.push(seq[seq.length - 1] + seq[seq.length - 2]); }
      else if (k === 4) seq = Array.from({ length: 6 }, (_, i) => (i % 2 ? a + d * ((i - 1) / 2) : 100 - d * (i / 2)));
      else seq = Array.from({ length: 6 }, (_, i) => a + (i * (i + 1)) / 2 * 2 - i * 0);
      const ans = seq[5];
      return { pub: { label: 'What comes next?', tiles: [...seq.slice(0, 5).map(String), '?'], note: '' }, ans };
    },
    check: (z, text) => /^\s*-?\d+\s*$/.test(String(text)) && parseInt(text, 10) === z.ans,
    solve: z => String(z.ans), reveal: z => String(z.ans),
  },
  sums: {
    name: 'Quick Sums', cat: 'math', tag: 'Work out the answer in your head.', botSkill: 0.85,
    placeholder: 'Type the answer', keys: [], numeric: true,
    art: () => ['7', '×', '8'].map(l => `<div class="ltile num">${l}</div>`).join(''),
    rules: `<p><b>Goal:</b> answer the sum correctly. Everyone gets the same sum, one turn each. Sums get harder in later rounds.</p>
      <ol><li>A sum appears on the table.</li><li>On your turn, type the answer and press <b>Submit</b>. You get two tries.</li><li>Stuck? Press <b>Skip</b>.</li><li>Everyone puts in ${ANTE} chips. People who answer correctly split the pot. If nobody does, everyone gets their chips back.</li></ol>`,
    make(G) {
      const lvl = Math.min(4, 1 + Math.floor(((G && G.round) || 1) / 3)), big = 6 + lvl * 6;
      const a = 2 + rnd(big), b = 2 + rnd(big), c = 2 + rnd(big + 8);
      const pick = rnd(3); let text, ans;
      if (pick === 0) { text = `${a} × ${b} + ${c}`; ans = a * b + c; }
      else if (pick === 1) { text = `${a + b + c} − ${a} − ${b}`; ans = c; }
      else { const m = 2 + rnd(Math.min(9, 4 + lvl)); text = `(${a} + ${b}) × ${m}`; ans = (a + b) * m; }
      return { pub: { label: 'What is the answer?', tiles: [text], note: '' }, ans };
    },
    check: (z, text) => /^\s*-?\d+\s*$/.test(String(text)) && parseInt(text, 10) === z.ans,
    solve: z => String(z.ans), reveal: z => String(z.ans),
  },
};

function makeRound(def) {
  return async function round(G, io) {
    const P = G.players, n = P.length;
    const z = def.make(G);
    const Z = G.z = { pub: z.pub, results: P.map(() => ''), turn: -1, over: false, answer: null, hint: '', game: G.game };
    io.render();
    await io.sleep(600);
    const start = (G.round - 1) % n;
    for (let k = 0; k < n; k++) {
      const i = (start + k) % n, p = P[i];
      let solved = false, skipped = false;
      for (let t = 0; t < 2 && !solved && !skipped; t++) {
        Z.turn = i; io.render();
        const a = await io.turn(p, { kind: 'solve', tries: 2 - t }, {
          auto: { t: 'skip' },
          validate: x => (x && x.t === 'skip' ? { t: 'skip' } : x && x.t === 'answer' && typeof x.text === 'string' ? { t: 'answer', text: x.text.slice(0, 60) } : null),
          bot: () => (Math.random() < def.botSkill ? { t: 'answer', text: def.solve(z) } : { t: 'skip' }),
          think: 1800 + Math.random() * 2200, timeout: 60000,
        });
        if (a.t === 'skip') skipped = true;
        else if (def.check(z, a.text)) solved = true;
        else { Z.hint = t === 0 ? 'Not quite. One more try.' : ''; io.ev(p, 'tries an answer that is not right', 'try an answer that is not right'); }
      }
      Z.hint = '';
      Z.results[i] = solved ? 'solved' : 'missed';
      io.ev(p, solved ? 'solves it' : skipped ? 'skips' : 'runs out of tries', solved ? 'solve it' : skipped ? 'skip' : 'run out of tries');
      io.render();
    }
    Z.turn = -1; Z.over = true; Z.answer = def.reveal(z);
    settlePot(G, ANTE, Z.results.map((r, i) => (r === 'solved' ? i : -1)).filter(i => i >= 0));
    potSummary(G);
    io.line(`The answer: ${Z.answer}`, true);
    io.render();
  };
}
function makeView(G) {
  const Z = G.z;
  if (!Z || Z.results.length !== G.players.length || Z.game !== G.game) return { pub: { label: '', tiles: [], note: '' }, results: G.players.map(() => ''), turn: -1, over: false, answer: null, hint: '', delta: [] };
  return { pub: Z.pub, results: Z.results, turn: Z.turn, over: Z.over, answer: Z.answer, hint: Z.hint, delta: G.players.map(p => (Z.over ? p.delta || 0 : 0)) };
}

/* ----- screen ----- */
function makeUI(def) {
  let S0 = null, seqShown = 0;
  const submit = () => {
    const v = $('pzInput').value.trim();
    if (v) { S0.send({ t: 'answer', text: v }); $('pzInput').value = ''; }
  };
  return {
    mount(stage, ctl, S) {
      seqShown = 0;
      stage.innerHTML = `<section class="table pz"><div class="pz-label" id="pzLabel"></div><div class="pz-tiles" id="pzTiles"></div>
        <div class="hint pz-note" id="pzNote"></div><div class="bt-opps" id="pzSeats"></div><div class="banner" id="pzBanner" aria-live="polite"></div></section>`;
      ctl.innerHTML = `<div class="act" id="pzAct" hidden>
        <div class="betrow" id="pzKeys">${def.keys.map(k => `<button type="button" class="pill" data-k="${k}">${k}</button>`).join('')}</div>
        <form class="pz-form" id="pzForm" autocomplete="off"><input id="pzInput" aria-label="Your answer" placeholder="${esc(def.placeholder)}" ${def.numeric ? 'inputmode="numeric"' : ''} maxlength="60">
        <button type="submit" class="b gold small">Submit</button><button type="button" class="ghost" id="pzSkip">Skip</button></form>
        <p class="hint bt-hint" id="pzHint"></p></div>`;
      $('pzForm').onsubmit = e => { e.preventDefault(); submit(); };
      $('pzSkip').onclick = () => S0.send({ t: 'skip' });
      $('pzKeys').onclick = e => { const b = e.target.closest('[data-k]'); if (b) { const i = $('pzInput'); i.value += b.dataset.k; i.focus(); } };
    },
    update(S) {
      S0 = S;
      const V = S.V, g = V.g, n = V.seats.length;
      $('pzLabel').textContent = g.pub.label;
      $('pzTiles').innerHTML = g.pub.tiles.map(t => `<div class="ltile big${def.numeric || def.keys.length ? ' num' : ''}">${esc(t)}</div>`).join('');
      $('pzNote').textContent = g.pub.note || '';
      $('pzSeats').innerHTML = V.seats.map((s, i) => {
        const r = g.results[i], d = (g.delta || [])[i] || 0;
        const tag = V.done ? (d > 0 ? `<div class="tag win">+${fmt(d)}</div>` : d < 0 ? `<div class="tag lose">${fmt(d)}</div>` : `<div class="tag dim">${r === 'solved' ? 'Solved' : 'Even'}</div>`)
          : r === 'solved' ? '<div class="tag hot">Solved</div>' : r === 'missed' ? '<div class="tag dim">Missed</div>'
          : g.turn === i ? '<div class="tag">Thinking…</div>' : '<div class="tag dim">Waiting</div>';
        return `<div class="seat${g.turn === i ? ' active' : ''}"><div class="plate"><span class="name"><span>${esc(S.nameOf(i))}</span></span>
          <span class="style">${esc(S.tag(i))}</span><span class="stack">${fmt(s.stack)}</span></div>${tag}</div>`;
      }).join('');
      $('pzBanner').innerHTML = g.over ? `<span>The answer: ${esc(g.answer)}</span>` + V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
      $('pzAct').hidden = !S.turn;
      if (!S.turn) return '';
      if (seqShown !== S.turn.seq) { seqShown = S.turn.seq; $('pzInput').focus(); }
      $('pzHint').textContent = g.hint || `${S.turn.data.tries} ${S.turn.data.tries === 1 ? 'try' : 'tries'} left.`;
      return '';
    },
  };
}

for (const [id, def] of Object.entries(GAMES)) {
  Club.register({
    id, cat: def.cat, cats: def.cats, name: def.name, tag: def.tag, min: 1, max: 6, soloBots: 2, roundWord: 'Round',
    art: def.art, rules: def.rules,
    round: makeRound(def), view: makeView, ui: makeUI(def),
    _test: id === 'make24' ? { parseExpr, solve24, check: def.check } : {},
  });
}
})();
