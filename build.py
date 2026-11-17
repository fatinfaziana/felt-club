#!/usr/bin/env python3
"""Bundle the card room sources into one self-contained page: felt-club.html"""
import pathlib

root = pathlib.Path(__file__).parent
src = root / "src"
rd = lambda p: (src / p).read_text()

css = rd("css/club.css") + "\n" + rd("css/games.css")
games = ["poker", "bigtwo", "rush", "blackjack", "puzzle", "hangman", "fourinrow", "checkers", "ladders", "tictactoe", "memory", "codebreaker", "numberhunt", "bluffdice", "nim", "rps", "patternmem", "sealed", "hilo", "quiz", "reversi", "gomoku", "mancala", "dotsboxes", "chess", "sudoku", "dice", "chipgames", "aim", "casino", "casino2", "golf", "cue", "cueui", "casino3d", "board3d", "board3d2", "cards3d", "dice3d", "play3d","play3d2"]
js = rd("lib.js") + "\n" + rd("three3d.js") + "\n" + "\n".join(rd(f"games/{g}.js") for g in games) + "\n" + rd("core.js")

page = f"""<title>Felt Club</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap">
<style>
{css}
</style>
{rd("shell.html")}
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
{js}
</script>
"""
out = root / "felt-club.html"  # artifact bundle (not tracked)
out.write_text(page)
print(f"wrote {out} ({len(page)//1024} KB)")

# Standalone page for any browser / device (GitHub Pages): a full document with the viewport set.
standalone = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#14241d">
<meta name="description" content="Felt Club: free card, board, dice and casino-style games with play chips only. Play against the computer on any device.">
<title>Felt Club</title>
</head>
<body>
""" + page.replace('<title>Felt Club</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n', "") + """
</body>
</html>
"""
(root / "index.html").write_text(standalone)
print("wrote index.html")
