# Felt Club

**Play it now: https://fatinfaziana.github.io/felt-club/**

A free collection of card, board, dice, puzzle and casino-style games with a 3D table for each one. Everything uses **play chips only — no real money, no accounts, no ads.**

Works on laptops, tablets and phones, in any modern browser.

## How to play

- **Laptop / desktop:** pick a game, then press **Enter** to start against the computer.
- **Tablet / phone:** pick a game and tap **Play vs computer**. Tap or drag on the 3D table to play.
- Use the **Seat / Top / Side** buttons to change the camera, or **Switch to 2D** for a flat view.
- Your chip count and name are kept in your browser only.

## Games

- **Cards:** Texas Hold'em, Big Two, Colour Rush, Blackjack, Hi-Lo and more
- **Board:** Chess, Checkers, Reversi, Gomoku, Four in a Row, Tic-Tac-Toe, Mancala, Dots & Boxes, Snakes & Ladders
- **Dice:** Pig, Bankroll, Shut the Box, Bluff Dice, Craps, Sic Bo
- **Casino-style (chips only):** Roulette, Baccarat, Video Poker, Slots, Keno, Let It Ride and others
- **Aim:** Pool, Carrom, Mini Golf, Archery, Darts
- **Mind & word:** Sudoku, Quiz, Code Breaker, Hangman, Memory, Number Hunt, puzzles

## Run locally

It is a static page, so any web server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Build from source

`index.html` is generated from the files in `src/`:

```bash
python3 build.py
```

3D uses [three.js](https://threejs.org/) (loaded from a CDN).
