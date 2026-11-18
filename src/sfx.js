/* ---------- Sound: synthesized effects and arcade music (WebAudio, no files) ---------- */
const Snd = (() => {
  const KEY = 'feltclub.snd';
  const st = Object.assign({ sfx: true, sv: 0.7, mus: true, mv: 0.35 }, (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
  let ctx = null, sfxG, musG, nbuf, timer = 0, playing = false, nextT = 0, step = 0, started = false;
  const AC = window.AudioContext || window.webkitAudioContext;
  function init() {
    if (ctx || !AC) return !!ctx;
    try {
      ctx = new AC(); const comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
      sfxG = ctx.createGain(); musG = ctx.createGain(); sfxG.connect(comp); musG.connect(comp);
      nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      vols();
    } catch { ctx = null; }
    return !!ctx;
  }
  function vols() { if (!ctx) return; sfxG.gain.value = st.sfx ? st.sv * 0.9 : 0; musG.gain.value = st.mus ? st.mv * 0.35 : 0; }
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  function tone(f, t, d, o) {
    o = o || {}; const os = ctx.createOscillator(), g = ctx.createGain(); os.type = o.type || 'square'; os.frequency.setValueAtTime(f, t); if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + d);
    const v = o.vol == null ? 0.25 : o.vol; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.a || 0.006)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    os.connect(g); g.connect(o.dest || sfxG); os.start(t); os.stop(t + d + 0.03);
  }
  function noise(t, d, o) {
    o = o || {}; const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nbuf; s.loop = true;
    f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 2000, t); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + d); f.Q.value = o.q || 1;
    const v = o.vol == null ? 0.25 : o.vol; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(o.dest || sfxG); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.03);
  }
  const R = (a, b) => a + Math.random() * (b - a);
  const FX = {
    click: t => { tone(900, t, 0.04, { type: 'square', vol: 0.08 }); },
    tap: t => { tone(520, t, 0.05, { type: 'triangle', vol: 0.12 }); },
    card: t => { noise(t, 0.07, { f: R(2600, 3600), q: 0.8, vol: 0.3 }); noise(t + 0.03, 0.05, { f: 1800, vol: 0.15 }); },
    flip: t => { noise(t, 0.1, { f: 3200, to: 1200, q: 0.7, vol: 0.3 }); },
    chip: t => { for (let i = 0; i < 3; i++) { tone(R(2200, 2700), t + i * 0.045, 0.06, { type: 'sine', vol: 0.18 }); noise(t + i * 0.045, 0.03, { f: 4200, vol: 0.1 }); } },
    dice: t => { for (let i = 0; i < 6; i++) { noise(t + i * 0.055 + R(0, 0.02), 0.04, { f: R(900, 1800), q: 2, vol: 0.28 - i * 0.02 }); tone(R(300, 520), t + i * 0.055, 0.04, { type: 'triangle', vol: 0.1 }); } },
    clack: t => { tone(R(640, 760), t, 0.07, { type: 'sine', vol: 0.3, to: 380 }); noise(t, 0.03, { f: 3500, vol: 0.2 }); },
    drop: t => { tone(700, t, 0.12, { type: 'sine', vol: 0.25, to: 260 }); noise(t + 0.1, 0.03, { f: 2500, vol: 0.18 }); },
    pop: t => { tone(480, t, 0.09, { type: 'sine', vol: 0.28, to: 900 }); },
    pebble: t => { for (let i = 0; i < 5; i++) { const u = t + i * 0.12; tone(R(1100, 1700), u, 0.035, { type: 'sine', vol: 0.18, to: 700 }); noise(u, 0.03, { f: 3000, q: 3, vol: 0.12 }); } },
    thud: t => { tone(150, t, 0.12, { type: 'sine', vol: 0.5, to: 60 }); noise(t, 0.05, { f: 900, type: 'lowpass', vol: 0.3 }); },
    twang: t => { tone(330, t, 0.35, { type: 'sawtooth', vol: 0.1, to: 200 }); noise(t + 0.05, 0.25, { f: 2000, to: 6000, q: 0.5, vol: 0.12 }); },
    putt: t => { tone(240, t, 0.08, { type: 'triangle', vol: 0.4, to: 120 }); noise(t, 0.03, { f: 2800, vol: 0.22 }); },
    sink: t => { tone(880, t, 0.1, { type: 'sine', vol: 0.25, to: 440 }); tone(520, t + 0.12, 0.1, { type: 'sine', vol: 0.22, to: 260 }); tone(1046, t + 0.28, 0.25, { type: 'triangle', vol: 0.25 }); },
    pocket: t => { tone(180, t, 0.18, { type: 'sine', vol: 0.4, to: 70 }); noise(t + 0.05, 0.2, { f: 700, type: 'lowpass', vol: 0.2 }); },
    ding: t => { tone(988, t, 0.25, { type: 'sine', vol: 0.18 }); tone(1318, t + 0.08, 0.3, { type: 'sine', vol: 0.15 }); },
    good: t => { tone(660, t, 0.09, { type: 'square', vol: 0.12 }); tone(880, t + 0.08, 0.14, { type: 'square', vol: 0.12 }); },
    bad: t => { tone(300, t, 0.14, { type: 'sawtooth', vol: 0.14, to: 200 }); tone(220, t + 0.1, 0.2, { type: 'sawtooth', vol: 0.14, to: 130 }); },
    fold: t => { noise(t, 0.12, { f: 1400, to: 500, q: 0.6, vol: 0.2 }); },
    win: t => { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.09, i === 6 ? 0.5 : 0.12, { type: 'square', vol: 0.14 })); },
    end: t => { [523, 440, 392].forEach((f, i) => tone(f, t + i * 0.14, 0.2, { type: 'triangle', vol: 0.2 })); },
    coin: t => { tone(988, t, 0.07, { type: 'square', vol: 0.12 }); tone(1318, t + 0.07, 0.25, { type: 'square', vol: 0.12 }); },
  };
  function p(name, delay) {
    if (!st.sfx || !FX[name] || !init()) return; if (ctx.state === 'suspended') ctx.resume();
    try { FX[name](ctx.currentTime + 0.01 + (delay || 0)); } catch {}
  }

  /* ----- arcade music: a bouncy minor-key loop with chiptune voices ----- */
  const CH = [[45, [0, 3, 7]], [41, [0, 4, 7]], [48, [0, 4, 7]], [43, [0, 4, 7]]];
  const PENT = [0, 3, 5, 7, 10, 12, 15];
  let motifs = null;
  const makeMotifs = () => [0, 1].map(() => Array.from({ length: 16 }, (_, i) => (i % 2 === 0 && Math.random() < 0.75) || Math.random() < 0.12 ? PENT[Math.floor(Math.random() * PENT.length)] : -1));
  const SD = 60 / 150 / 4;   // sixteenth note
  function sched(s, t) {
    const bar = Math.floor(s / 16) % 4, i = s % 16, ch = CH[bar], phrase = Math.floor(s / 64);
    if (!motifs || (s % 128 === 0)) motifs = makeMotifs();
    if (i === 0 || i === 8 || (i === 10 && bar % 2)) { tone(150, t, 0.14, { type: 'sine', vol: 0.9, to: 45, dest: musG }); }
    if (i === 4 || i === 12) noise(t, 0.1, { f: 2200, q: 0.6, vol: 0.3, dest: musG });
    if (i % 2 === 0) noise(t, 0.03, { f: 7000, type: 'highpass', vol: i % 4 === 2 ? 0.16 : 0.08, dest: musG });
    if ([0, 3, 6, 8, 11, 14].includes(i)) tone(midi(ch[0] + (i === 8 || i === 14 ? 12 : 0)), t, SD * 2.2, { type: 'triangle', vol: 0.55, dest: musG });
    tone(midi(ch[0] + 24 + ch[1][i % 3]), t, SD * 0.9, { type: 'square', vol: 0.07, dest: musG });
    const m = motifs[(bar + (phrase % 2)) % 2][i];
    if (m >= 0) tone(midi(69 + m + (bar === 1 ? -4 : bar === 3 ? -2 : 0)), t, SD * 1.8, { type: 'square', vol: 0.15, dest: musG });
  }
  function pump() { if (!playing) return; while (nextT < ctx.currentTime + 0.25) { sched(step++, nextT); nextT += SD; } }
  function musicOn() {
    if (playing || !st.mus || !init()) return; if (ctx.state === 'suspended') ctx.resume();
    playing = true; nextT = ctx.currentTime + 0.08; vols(); timer = setInterval(pump, 60); pump();
  }
  function musicOff() { playing = false; clearInterval(timer); }
  function sync() { if (st.mus && started && !document.hidden) musicOn(); else musicOff(); vols(); }
  document.addEventListener('visibilitychange', sync);
  const gesture = () => { started = true; init(); sync(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(e => document.addEventListener(e, gesture, { once: false, passive: true }));

  /* ----- settings panel ----- */
  function panel() {
    if (document.getElementById('sndPanel')) return;
    const d = document.createElement('div'); d.id = 'sndPanel'; d.className = 'sndpanel'; d.hidden = true; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Sound settings');
    d.innerHTML = `<div class="snd-row"><b>Music</b><button type="button" class="ghost" id="musTog"></button></div><input type="range" id="musVol" min="0" max="100" aria-label="Music volume">
      <div class="snd-row"><b>Sound effects</b><button type="button" class="ghost" id="sfxTog"></button></div><input type="range" id="sfxVol" min="0" max="100" aria-label="Sound effects volume">
      <button type="button" class="ghost snd-close" id="sndClose">Close</button>`;
    document.body.appendChild(d); paintPanel();
    d.querySelector('#musTog').onclick = () => { st.mus = !st.mus; save(); sync(); paintPanel(); };
    d.querySelector('#sfxTog').onclick = () => { st.sfx = !st.sfx; save(); vols(); paintPanel(); p('ding'); };
    d.querySelector('#musVol').oninput = e => { st.mv = e.target.value / 100; if (st.mv > 0 && !st.mus) st.mus = true; save(); sync(); paintPanel(true); };
    d.querySelector('#sfxVol').oninput = e => { st.sv = e.target.value / 100; save(); vols(); };
    d.querySelector('#sfxVol').onchange = () => p('chip');
    d.querySelector('#sndClose').onclick = () => { d.hidden = true; };
  }
  function paintPanel(keep) {
    const d = document.getElementById('sndPanel'); if (!d) return;
    d.querySelector('#musTog').textContent = st.mus ? 'Pause music' : 'Play music'; d.querySelector('#sfxTog').textContent = st.sfx ? 'Turn off' : 'Turn on';
    if (!keep) d.querySelector('#musVol').value = Math.round(st.mv * 100); d.querySelector('#sfxVol').value = Math.round(st.sv * 100);
    document.querySelectorAll('.sndbtn').forEach(b => { b.textContent = st.mus || st.sfx ? '♪ Sound' : '♪ Muted'; b.setAttribute('aria-pressed', String(!!(st.mus || st.sfx))); });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.sndbtn');
    if (b) { panel(); const d = document.getElementById('sndPanel'); d.hidden = !d.hidden; paintPanel(); return; }
    const pn = document.getElementById('sndPanel'); if (pn && !pn.hidden && !e.target.closest('#sndPanel')) pn.hidden = true;
    const t = e.target.closest && e.target.closest('button, .gtile, .catbtn, [data-cat], [data-g]');
    if (t && !t.closest('#sndPanel') && !t.classList.contains('sndbtn')) { if (t.closest('#stage')) p('tap'); else p('click'); }
    else if (!t && e.target.closest && e.target.closest('#stage')) p('tap');
  }, true);
  document.addEventListener('DOMContentLoaded', () => { panel(); paintPanel(); });
  if (document.readyState !== 'loading') { panel(); paintPanel(); }

  /* ----- generic game hooks: react to the table log, turns and round end ----- */
  const BYCAT = { card: 'card', casino: 'chip', dice: 'dice', board: 'clack', mind: 'pop', word: 'pop', math: 'pop', group: 'pop' };
  const BYGAME = { mancala: 'pebble', fourinrow: 'drop', chess: 'clack', checkers: 'clack', reversi: 'clack', gomoku: 'clack', tictactoe: 'pop', dotsboxes: 'pop', bluffdice: 'dice', dice: 'dice', poker: 'chip', blackjack: 'card', sudoku: 'pop', hangman: 'pop' };
  const SPECIFIC = new Set(['darts', 'archery', 'minigolf', 'pool', 'carrom']);
  let memo = { id: '', logN: 0, lastTxt: '', seq: 0, done: false, round: 0 };
  function observe(c, V, me, turn, D) {
    if (!st.sfx) { memo = { id: c.id + '|' + c.game, logN: V.log.length, lastTxt: '', seq: V.prompt ? V.prompt.seq : 0, done: !!V.done, round: V.round }; return; }
    const key = c.id + '|' + c.game, first = memo.id !== key; if (first) memo = { id: key, logN: V.log.length, lastTxt: JSON.stringify(V.log[V.log.length - 1] || ''), seq: V.prompt ? V.prompt.seq : 0, done: !!V.done, round: V.round };
    const last = JSON.stringify(V.log[V.log.length - 1] || '');
    if (!first && (V.log.length !== memo.logN || last !== memo.lastTxt)) {
      const k = Math.max(0, Math.min(V.log.length, V.log.length - memo.logN || 1, 3)), news = V.log.slice(-Math.max(1, k));
      news.forEach((e, i) => {
        const txt = (e.t || e.y || e.s || '').toLowerCase(); let n = null;
        if (/\b(win|wins|won|sinks|pots|potted|scores|solved|correct|bingo|bullseye|triple|double|jackpot)\b/.test(txt)) n = 'good';
        else if (/\b(bust|busts|lose|loses|lost|foul|fouls|miss|misses|wrong|out|scratch)\b/.test(txt)) n = 'bad';
        else if (/\bfold/.test(txt)) n = 'fold';
        else if (SPECIFIC.has(c.game)) n = null;
        else n = BYGAME[c.game] || BYCAT[D.cat] || 'tick';
        if (n && FX[n]) p(n, i * 0.12);
      });
    }
    if (!first && V.prompt && V.prompt.seq !== memo.seq && turn) p('ding', 0.05);
    if (!first && V.done && !memo.done) {
      const mine = (V.summary || []).some(e => e.p === me && /\b(win|wins|won|take|takes|collect|collects|scoop)/i.test((e.t || e.y || e.s || '')));
      p(mine ? 'win' : 'end', 0.2);
    }
    memo.logN = V.log.length; memo.lastTxt = last; memo.seq = V.prompt ? V.prompt.seq : 0; memo.done = !!V.done; memo.round = V.round;
  }
  return { p, observe, st, FX };
})();
