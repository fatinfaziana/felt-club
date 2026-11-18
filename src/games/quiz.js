/* ---------- Quick Quiz: general knowledge for the whole group ---------- */
(function () {
const ANTE = 20, PER = 5;
// [question, [options], index of the right answer]
const QS = [
['Which planet is closest to the Sun?', ['Venus', 'Mercury', 'Mars', 'Earth'], 1],
['How many continents are there?', ['5', '6', '7', '8'], 2],
['What is the largest ocean on Earth?', ['Atlantic', 'Indian', 'Arctic', 'Pacific'], 3],
['Which gas do plants take in from the air?', ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Helium'], 1],
['How many sides does a hexagon have?', ['5', '6', '7', '8'], 1],
['What is the capital of Japan?', ['Kyoto', 'Osaka', 'Tokyo', 'Nagoya'], 2],
['What is the capital of France?', ['Lyon', 'Paris', 'Nice', 'Marseille'], 1],
['Which animal is the largest on Earth?', ['African elephant', 'Blue whale', 'Giraffe', 'Great white shark'], 1],
['How many days are there in a leap year?', ['364', '365', '366', '367'], 2],
['What is H2O more commonly called?', ['Salt', 'Water', 'Sugar', 'Air'], 1],
['Which is the longest river in Africa?', ['Congo', 'Niger', 'Nile', 'Zambezi'], 2],
['How many players are on a football (soccer) team on the pitch?', ['9', '10', '11', '12'], 2],
['What colour do you get by mixing blue and yellow?', ['Green', 'Purple', 'Orange', 'Brown'], 0],
['Which is the smallest prime number?', ['0', '1', '2', '3'], 2],
['How many minutes are in two hours?', ['100', '120', '90', '150'], 1],
['Which country has the city of Cairo as its capital?', ['Morocco', 'Egypt', 'Jordan', 'Kenya'], 1],
['What do bees make?', ['Silk', 'Honey', 'Milk', 'Wax paper'], 1],
['Which is the tallest mountain above sea level?', ['K2', 'Mount Everest', 'Kilimanjaro', 'Mont Blanc'], 1],
['How many legs does a spider have?', ['6', '8', '10', '12'], 1],
['Which instrument has black and white keys?', ['Violin', 'Drum', 'Piano', 'Flute'], 2],
['What is 12 times 12?', ['124', '132', '144', '154'], 2],
['Which planet is known as the Red Planet?', ['Jupiter', 'Mars', 'Saturn', 'Mercury'], 1],
['What is the freezing point of water in degrees Celsius?', ['0', '10', '32', '100'], 0],
['Which sea creature has eight arms?', ['Starfish', 'Octopus', 'Jellyfish', 'Crab'], 1],
['Which country is home to the kangaroo?', ['New Zealand', 'South Africa', 'Australia', 'Brazil'], 2],
['What is the largest planet in our solar system?', ['Saturn', 'Neptune', 'Jupiter', 'Earth'], 2],
['How many strings does a standard guitar have?', ['4', '5', '6', '8'], 2],
['Which language is mostly spoken in Brazil?', ['Spanish', 'Portuguese', 'French', 'English'], 1],
['What do we call a baby dog?', ['Kitten', 'Cub', 'Puppy', 'Calf'], 2],
['How many hours are in a day?', ['12', '20', '24', '48'], 2],
['What is the hardest natural material?', ['Gold', 'Iron', 'Diamond', 'Quartz'], 2],
['Which direction does the Sun rise from?', ['North', 'South', 'East', 'West'], 2],
['Which shape has three sides?', ['Square', 'Triangle', 'Circle', 'Pentagon'], 1],
['What is the capital of Australia?', ['Sydney', 'Melbourne', 'Canberra', 'Perth'], 2],
['Which part of the body pumps blood?', ['Lungs', 'Liver', 'Heart', 'Kidney'], 2],
['How many colours are in a rainbow?', ['5', '6', '7', '8'], 2],
['What is the main language of Egypt?', ['Arabic', 'Persian', 'Turkish', 'Hebrew'], 0],
['Which metal is liquid at room temperature?', ['Iron', 'Mercury', 'Copper', 'Silver'], 1],
['What is 15 percent of 200?', ['20', '25', '30', '35'], 2],
['In which direction does a compass needle point?', ['East', 'South', 'North', 'West'], 2],
['Which is the largest country by area?', ['Canada', 'China', 'Russia', 'USA'], 2],
['How many months have 31 days?', ['5', '6', '7', '8'], 2],
['What do caterpillars turn into?', ['Beetles', 'Butterflies or moths', 'Bees', 'Flies'], 1],
];
async function round(G, io) {
  const P = G.players, n = P.length, picks = shuffle([...Array(QS.length).keys()]).slice(0, PER);
  const Z = G.q = { qi: -1, q: '', opts: [], score: P.map(() => 0), answered: P.map(() => false), turn: -1, reveal: null, n: 0, over: false, winners: [] };
  for (let k = 0; k < picks.length; k++) {
    const [q, opts, c] = QS[picks[k]];
    // shuffle options but keep track of the right one
    const order = shuffle(opts.map((_, i) => i)), shown = order.map(i => opts[i]), right = order.indexOf(c);
    Z.qi = k; Z.q = q; Z.opts = shown; Z.answered = P.map(() => false); Z.reveal = null; Z.n = k + 1; Z.picks = P.map(() => -1);
    io.render(); await io.sleep(700);
    for (let i = 0; i < n; i++) {
      Z.turn = i; io.render();
      const a = await io.turn(P[i], { q: k + 1 }, { auto: { t: 'ans', i: 0 },
        validate: x => (x && x.t === 'ans' && Number.isInteger(x.i) && x.i >= 0 && x.i < 4 ? { t: 'ans', i: x.i } : null),
        bot: () => ({ t: 'ans', i: Math.random() < 0.62 ? right : rnd(4) }), think: 1100 + Math.random() * 900 });
      Z.answered[i] = true; Z.picks[i] = a.i; if (a.i === right) Z.score[i]++;
    }
    Z.turn = -1; Z.reveal = right;
    io.line(`Question ${k + 1}: ${q} Answer: ${shown[right]}.`);
    io.render(); await io.sleep(2200);
  }
  const top = Math.max(...Z.score), winners = Z.score.map((s, i) => (s === top ? i : -1)).filter(i => i >= 0);
  Z.over = true; Z.winners = winners; Z.reveal = null;
  settlePot(G, ANTE, winners); potSummary(G);
  io.line(`Scores: ${P.map((p, i) => `${p.human ? 'player ' + (i + 1) : p.name} ${Z.score[i]}`).join(', ')}.`, true);
  io.render();
}
function view(G) {
  const Z = G.q;
  if (!Z || Z.score.length !== G.players.length) return { q: '', opts: [], n: 0, per: PER, score: G.players.map(() => 0), answered: G.players.map(() => false), turn: -1, reveal: null, over: false, winners: [], delta: [] };
  return { q: Z.q, opts: Z.opts, n: Z.n, per: PER, score: Z.score, answered: Z.answered, turn: Z.over ? -1 : Z.turn, reveal: Z.reveal, mine: Z.reveal !== null ? Z.picks : null, over: Z.over, winners: Z.winners, delta: G.players.map(p => (Z.over ? p.delta || 0 : 0)) };
}
let S0 = null;
const ui = {
  mount(stage, ctl) {
    stage.innerHTML = `<section class="table pz"><div class="bt-opps" id="qzSeats"></div><div class="pz-label" id="qzQ"></div><div class="qz-opts" id="qzOpts"></div><div class="banner" id="qzBanner" aria-live="polite"></div></section>`;
    ctl.innerHTML = `<p class="hint bt-hint" id="qzHint"></p>`;
    $('qzOpts').onclick = e => { const b = e.target.closest('[data-i]'); if (b && S0.turn) S0.send({ t: 'ans', i: +b.dataset.i }); };
  },
  update(S) {
    S0 = S; const V = S.V, g = V.g;
    $('qzSeats').innerHTML = plates(S, { turn: g.turn, delta: g.delta, doing: 'Answering…', extra: i => `${g.score[i]} point${g.score[i] === 1 ? '' : 's'}${g.answered[i] && g.turn !== i && g.reveal === null ? ' · answered' : ''}` });
    $('qzQ').textContent = g.n ? `Question ${g.n} of ${g.per}: ${g.q}` : 'Get ready…';
    $('qzOpts').innerHTML = g.opts.map((o, i) => `<button type="button" class="qz-o${g.reveal === i ? ' right' : ''}" data-i="${i}" ${S.turn ? '' : 'disabled'}>${esc(o)}</button>`).join('');
    $('qzBanner').innerHTML = g.over && V.summary.length ? V.summary.map(e => `<span>${S.text(e)}</span>`).join('') : '';
    $('qzHint').textContent = S.turn ? 'Pick your answer. Others cannot see it until everyone has answered.' : '';
    return '';
  },
};
Club.register({
  id: 'quiz', cat: 'group', name: 'Trivia Quiz', tag: 'General knowledge for the whole group.', min: 2, max: 10, soloBots: 3, roundWord: 'Quiz',
  art: () => ['?', 'A', '✓'].map(c => `<div class="ltile">${c}</div>`).join(''),
  rules: `<p><b>Goal:</b> answer the most questions correctly. Fits 2 to 10 players.</p>
    <ol><li>Each quiz has ${PER} questions, each with four answers.</li>
    <li>For each question, everyone answers in turn. Your answer stays hidden from the others until the question closes.</li>
    <li>When everyone has answered, the right answer is shown. One point for each right answer.</li>
    <li>After ${PER} questions, the player with the most points wins the pot. Ties share it.</li>
    <li>Each player puts in ${ANTE} chips.</li></ol>`,
  round, view, ui, _test: { QS },
});
})();
