/* Picture covers for the game tiles: a big symbol on a colour wash. */
const COVERS = {
  poker: ['A♠', '#1f7a4a', '#0b3a24'], bigtwo: ['2♠', '#7a3fa0', '#2d1245'], rush: ['🌈', '#2f6fd6', '#13265e'], blackjack: ['21', '#1b8a55', '#0a3a26'],
  puzzle: ['🔤', '#d98a2b', '#5a3010'], scramble: ['🔤', '#d98a2b', '#5a3010'], make24: ['24', '#c4372e', '#4a1411'], pattern: ['🧩', '#3f8be8', '#16305e'], sums: ['➕', '#2aa58a', '#0d3b33'],
  hangman: ['🪢', '#9a6b3a', '#3a2412'], fourinrow: ['🔴🟡', '#2f55c4', '#142560'], checkers: ['⚫🔴', '#8d5a2f', '#3a220f'], ladders: ['🪜', '#3a9a4a', '#143d1b'], tictactoe: ['❌⭕', '#6a5acd', '#262060'],
  memory: ['🧠', '#e0709a', '#5a1a38'], codebreaker: ['🔐', '#6b7a8a', '#222c38'], numberhunt: ['🔢', '#3aa0c8', '#123a4f'], bluffdice: ['🎲', '#b04a5a', '#4a1822'], nim: ['🥢', '#c89a3a', '#4a3410'],
  rps: ['✊✋✌️', '#d8703a', '#5a2410'], patternmem: ['🎹', '#8a5ad8', '#321a66'], sealed: ['🤫', '#5a6ad8', '#1a2060'], lowunique: ['🤫', '#5a6ad8', '#1a2060'], twothirds: ['⅔', '#4a8ad8', '#14305e'],
  hilo: ['↕️', '#c8503a', '#4a1a10'], quiz: ['❓', '#e0a02a', '#5a3a08'], reversi: ['⚪⚫', '#2f8a5a', '#0e3a24'], gomoku: ['⭕', '#9a7a3a', '#3a2c10'], mancala: ['🪨', '#a8683a', '#3f2210'],
  whack: ['🐭', '#5aa84a', '#1d3a18'], zombies: ['🧟', '#3d5a3a', '#101c10'], racing: ['🏎️', '#3a3a42', '#111116'], bike: ['🏍️', '#d8352a', '#2a0a0a'], dance: ['💃', '#8a2aa0', '#2a1245'], invaders: ['🚀', '#2a2a6a', '#080a1c'], pacman: ['🟡', '#1f3fbf', '#000'], mines: ['💣', '#4a5d70', '#1a232e'], seabattle: ['🚢', '#1b6aa8', '#0a2a4a'], breakout: ['🧱', '#9a5ad8', '#10142a'], snake: ['🐍', '#2f8a3a', '#10281a'], flappy: ['🐤', '#6ec6f2', '#2a6a9a'], fruit: ['🍉', '#f29443', '#7a3a10'],
  dotsboxes: ['▦', '#4a7ad8', '#142a5e'], chess: ['♞', '#8d5a2f', '#2e1c0e'], sudoku: ['9', '#5a8a9a', '#1a3a46'], pig: ['🐷', '#e08aa0', '#5a2234'], shutbox: ['📦', '#a07a4a', '#3a2a14'], monopoly: ['🎲🏠', '#2f9d4f', '#0f3a1c'],
  threecard: ['3♥', '#1f6a52', '#0b3326'], caribbean: ['🏝️', '#2aa5c8', '#0d3f4f'], letitride: ['🏇', '#3a8a4a', '#123d1b'], reddog: ['🐕', '#c4503a', '#4a1a10'], baccarat: ['9♦', '#8a1f2a', '#380a10'], videopoker: ['📟', '#3a5ad8', '#101e5e'],
  roulette: ['🎡', '#1a6b3a', '#0a2c18'], sicbo: ['🎲', '#8a1f2a', '#380a10'], craps: ['🎲', '#1f6a52', '#0b3326'], slots: ['🎰', '#7a2fd8', '#2a1060'], keno: ['🎱', '#2b3a6a', '#0f1630'],
  crazy8: ['8♠', '#2a6fb8', '#102a50'], gofish: ['🐟', '#2aa5c8', '#0d3f4f'], oldmaid: ['👵', '#a8508a', '#3f1634'], cheat: ['🤥', '#b8452a', '#4a1a10'], scrabble: ['Aa', '#2a7a4a', '#0e3a22'], g2048: ['2048', '#edc22e', '#6b4a10'], darts: ['🎯', '#c4372e', '#3a1210'], archery: ['🏹', '#3a8a3a', '#10381a'], minigolf: ['⛳', '#3aa04a', '#10401a'], pool: ['🎱', '#1f7a4a', '#0a3220'], carrom: ['🟤', '#d6b05a', '#5a3f10'],
};
const coverHTML = id => { const c = COVERS[id] || ['🎮', '#4a3a6a', '#1a1230']; return `<div class="cover" style="--c1:${c[1]};--c2:${c[2]}"><span>${c[0]}</span></div>`; };
