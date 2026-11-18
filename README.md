# Game Hub

**Play it now: https://fatinfaziana.github.io/felt-club/**

A free collection of card, board, dice, puzzle and casino-style games with a 3D table for each one. Everything uses **play chips only — no real money, no accounts, no ads.**

Works on laptops, tablets and phones, in any modern browser.

## How to play

- **Laptop / desktop:** pick a game, then press **Enter** to start against the computer.
- **Tablet / phone:** pick a game and tap **Play vs computer**. Tap or drag on the 3D table to play.
- Use the **Seat / Top / Side** buttons to change the camera, or **Switch to 2D** for a flat view.
- Your chip count and name are kept in your browser only.

## Games

- **Cards:** Texas Hold'em, Dai Di (Big Two), Uno, Crazy Eights, Go Fish, Old Maid, Cheat, Blackjack, Higher or Lower and more
- **Board:** Chess, Checkers, Reversi, Gomoku, Connect Four, Tic-Tac-Toe, Mancala, Dots and Boxes, Snakes and Ladders, Property Tycoon (Monopoly-style)
- **Dice:** Pig, Shut the Box, Liar's Dice, Craps, Sic Bo
- **Casino-style (chips only):** Roulette, Baccarat, Video Poker, Slot Machine, Keno, Let It Ride and others
- **Aim:** Eight-Ball Pool, Carrom, Mini Golf, Archery, Darts
- **Word:** Scrabble, Hangman, Word Scramble
- **Maths:** 2048, Make 24, Quick Sums, Number Patterns
- **Mind:** Sudoku, Mastermind, Memory, Simon, Nim, Trivia Quiz
- **Arcade:** Hit the Mice, Zombie Hunt, Street Racer, Moto Rider, Dance Floor, Space Ships, Pac-Man, Minesweeper, Sea Battle, Brick Breaker, Snake, Flappy Chick, Fruit Catch, Block Stack, Table Tennis, Asteroids, Road Crossing, Quick Draw, Sliding Puzzle, Lights Out, Tower Stack (keyboard, mouse and touch)
- Most games have **Easy, Medium and Hard** levels.

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
