# Check

Play chess against Stockfish from a terminal or browser. Both clients use the
same FastAPI cloud service for TypeSafe JEV natural-language resolution and
engine moves, so API credentials and Stockfish never reach an end user.

## Monorepo

This is a pnpm workspace orchestrated by Turborepo:

- `apps/cli` — the installable `check` TypeScript CLI.
- `apps/web` — responsive Vite/TypeScript chess application.
- `apps/server` — FastAPI service hosting JEV and Stockfish.
- `packages/chess` — shared, strictly typed chess rules and FEN package.

## Requirements

- Node.js 20+ and pnpm 10
- Python 3.11+
- Stockfish on the server's `PATH`
- A TypeSafe API key for the JEV model

```sh
pnpm install
python -m venv .venv
. .venv/bin/activate
pip install -e 'apps/server[dev]'
export TYPESAFE_API_KEY='your-key'
pnpm dev
```

Turborepo starts the API at `http://localhost:8000` and the website at
`http://localhost:5173`. Run the CLI in another terminal:

```sh
pnpm --filter @check/cli build
node apps/cli/bin/check.js --server http://localhost:8000 --elo 1500
```

Set `CHECK_SERVER_URL` for the CLI or `VITE_CHECK_SERVER_URL` when building the
website for a deployed API. Server configuration supports `TYPESAFE_BASE_URL`,
`TYPESAFE_MODEL`, `STOCKFISH_PATH`, and comma-separated `CHECK_ORIGINS`.

## Cloud API

`POST /api/resolve` accepts `{ instruction, fen }`. The server sends the current
FEN and legal moves to JEV, verifies its response with `python-chess`, and returns
`{ move, fen, explanation }`. `POST /api/engine` accepts `{ fen, elo, depth }`
and returns a verified Stockfish move in the same shape. `GET /health` is suitable
for container probes.

The server deliberately owns both integrations: neither browser nor CLI receives
the JEV key or direct access to the engine process.

## Quality checks

```sh
pnpm typecheck
pnpm test
pnpm build
```
