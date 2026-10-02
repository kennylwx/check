# check

Chess in your terminal: a Node.js CLI with a full Unicode board, TypeSafe JEV
natural-language move input, FEN positions, and a configurable Stockfish opponent.

## Install

Requirements: Node.js 18+ and a `stockfish` executable on your `PATH`.

```sh
npm install -g .
export TYPESAFE_API_KEY="your-key"
check --elo 1500
```

If Stockfish lives elsewhere, use `check --stockfish /path/to/stockfish` or set
`STOCKFISH_PATH`. Stockfish exposes calibrated strength from 1320–3190 ELO.

## Play

```text
check --elo 1800 --color black
check --fen "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"
```

Enter moves as **SAN** (`Nf3`, `O-O`), **UCI** (`g1f3`), or ordinary phrases
such as `move the queen up by 1`. Free text is sent to TypeSafe's `jev` model
with the current FEN and every legal move. JEV returns a typed move and resulting
FEN; both are independently checked by the local chess engine before the game
progresses. Exact SAN/UCI and commands remain local. Set `TYPESAFE_BASE_URL` and
`TYPESAFE_MODEL` to override the default API endpoint or model. Type `fen` to print the current position,
`fen <position>` to load one, `undo`, `help`, or `quit`.

Run `npm test` to test move generation, checkmate, input modeling, and rendering.

## Development

The application source is strict TypeScript in `src/`. Compiled JavaScript and
declaration files are generated in `dist/` rather than checked into Git.

```sh
npm install
npm run typecheck
npm test
```
