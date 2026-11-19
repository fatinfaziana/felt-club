# Game Hub

**Play it now: https://fatinfaziana.github.io/game-hub/**

A free collection of 115+ card, board, dice, puzzle, sports, arcade, trivia and casino-style games in one place. Everything uses **play chips only — no real money, no accounts, no ads.**

Works on laptops, tablets and phones, in any modern browser.

## Share this link

**https://fatinfaziana.github.io/game-hub/**

- **Free:** 115+ games, play chips only, no real money, no sign-up, no ads.
- **Any device:** laptop, tablet or phone, in any modern browser. Nothing to install.
- **Solo:** pick a game and play against the computer (Easy, Medium or Hard on skill games).
- **With friends:** pick a game, choose *Create a table*, type how many players, then send the link you get. Friends open it and take a seat. Keep the host's page open.
- **Game nights:** the 🎉 *Events* button keeps a leaderboard across games, shows it on a big screen and gives a QR code for people to scan.
- **Privacy:** your name and chips stay in your own browser.

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
- **Arcade:** Hit the Mice, Zombie Hunt, Street Racer, Moto Rider, Dance Floor, Space Ships, Pac-Man, Minesweeper, Sea Battle, Brick Breaker, Snake, Flappy Chick, Fruit Catch, Block Stack, Table Tennis, Asteroids, Road Crossing, Quick Draw, Sliding Puzzle, Lights Out, Tower Stack Sky Hopper, Desert Runner, Basket Catch (keyboard, mouse and touch)
- **Sports:** Basketball Shots, Penalty Kicks, Bowling, Gone Fishing, 100m Sprint, Keepie Uppie
- **Puzzle:** Maze Runner, Colour Flood, Gem Swap, Tower of Hanoi
- **Word, math and mind:** Crossword, Word Builder, Word Search, Math Dash, Colour Clash, Odd Tile Out
- **Dice and party:** Yacht Dice, Farkle, Stop the Clock, Fast Fingers, Steady Hand, Quick Count
- **More arcade:** Bubble Pop, Tap Tiles, Gold Miner, Balloon Cannon
- **Also:** Solitaire (cards), Dominoes (board), Air Hockey (sports), Backgammon, Nine Men's Morris (board), Peg Solitaire, Sokoban (puzzle)
- **Events:** the 🎉 Events button runs a game night or tournament in person: add players, record each game's finishing order, keep one leaderboard, show it on a big screen and share a QR code so everyone can open the site on their phone. Saved on that device only.
- **Play with friends:** pick a game, choose *Create a table*, type how many players, and send the link to everyone. Rooms connect browser to browser, so keep the host's page open.
- **Trivia:** Capital Cities, Name the Animal, Famous Places, Chemical Elements
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
